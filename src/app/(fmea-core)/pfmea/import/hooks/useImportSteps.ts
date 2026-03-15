/**
 * @file useImportSteps.ts
 * @description Import 3단계 확정 프로세스 React 훅
 * - SA(구조분석) → FC(고장사슬) → FA(통합분석) 순차 확정
 * - flatData/isSaved 변경 시 자동 리셋
 * @created 2026-02-21
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { ImportedFlatData } from '../types';
import type { MasterFailureChain } from '../types/masterFailureChain';
import { buildFailureChainsFromFlat } from '../types/masterFailureChain';
import type { CrossTab } from '../utils/template-delete-logic';
import type { BuildResult } from '../utils/buildWorksheetState';
import type { ParseStatistics } from '../excel-parser';
import type { TemplateMode } from './useTemplateGenerator';
import { validateFADataConsistency } from '../utils/faValidation';
import {
  type ImportStepState,
  getInitialStepState,
  canConfirmSA,
  canConfirmFC,
  canConfirmFA,
  advanceToFC,
  advanceToFA,
  markFAConfirmed,
  resetAllSteps,
  resetAfterSA,
} from '../utils/stepConfirmation';
import { compareFCChains, type FCComparisonResult } from '../utils/fcComparison';
import {
  validateStage,
  formatValidationResult,
  logValidationResult,
  type ValidationContext,
  type ValidationResult,
} from '../utils/importValidationFramework';
import { quickWorksheetSave } from '../utils/quickWorksheetSave';
import { supplementMissingItems } from '../utils/supplementMissingItems';
// 규칙 등록 (import만으로 자동 등록)
import '../utils/importValidationRules';

// ─── 타입 ───

interface FmeaInfoForProject {
  subject?: string;
  companyName?: string;
  customerName?: string;
  modelYear?: string;
  fmeaType?: string;
  engineeringLocation?: string;
  designResponsibility?: string;
  fmeaResponsibleName?: string;
  partName?: string;
  partNo?: string;
}

interface UseImportStepsParams {
  flatData: ImportedFlatData[];
  failureChains: MasterFailureChain[];    // 표시용 (fallback 포함)
  externalChains?: MasterFailureChain[]; // ★ FA 확정 전용: FC 시트에서 파싱한 실제 데이터만
  crossTab: CrossTab;
  isSaved: boolean;
  missingTotal: number;
  fmeaId: string;
  l1Name: string;
  fmeaInfo?: FmeaInfoForProject; // ★ 등록정보 전달 (프로젝트 자동 생성용)
  parseStatistics?: ParseStatistics; // ★ 파싱 통계(100% 검증 게이트)
  onWorksheetSaved?: () => void; // FA 확정 후 콜백 (라우터 이동 등)
  templateMode?: TemplateMode; // ★ 수동모드: FC 스킵 (고장영향까지만 검증)
}

export interface UseImportStepsReturn {
  stepState: ImportStepState;
  setActiveStep: (step: 'SA' | 'FC' | 'FA') => void;
  // 확정 가능 여부
  canSA: boolean;
  canFC: boolean;
  canFA: boolean;
  // 확정 액션
  confirmSA: () => BuildResult | null;
  confirmFC: (force?: boolean) => void;
  confirmFA: () => Promise<void>;
  // ★ 원클릭 워크시트 생성 (SA+FC+FA 검증 없이 바로 저장)
  quickCreateWorksheet: () => Promise<void>;
  // 되돌리기 (확정 리셋 + 탭 이동)
  resetToSA: () => void;
  resetToFC: () => void;
  // FC 비교 결과
  fcComparison: FCComparisonResult | null;
  // FA 진행 상태
  isAnalysisImporting: boolean;
  isAnalysisComplete: boolean;
}

// ─── 훅 ───

export function useImportSteps(params: UseImportStepsParams): UseImportStepsReturn {
  const {
    flatData,
    failureChains,
    externalChains,
    crossTab,
    isSaved,
    missingTotal,
    fmeaId,
    l1Name,
    fmeaInfo,
    parseStatistics,
    onWorksheetSaved,
    templateMode,
  } = params;

  const [stepState, setStepState] = useState<ImportStepState>(getInitialStepState);
  const [fcCompResult, setFcCompResult] = useState<FCComparisonResult | null>(null);
  const [isAnalysisImporting, setIsAnalysisImporting] = useState(false);
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);

  // flatData 변경 감지 → 모든 단계 리셋
  // ★ 2026-02-22: length만 비교 → 데이터 참조+길이 비교로 변경
  // 이유: 재Import 시 같은 길이의 데이터로 교체되면 SA 확정이 리셋 안됨
  const prevDataRef = useRef(flatData);
  useEffect(() => {
    if (flatData !== prevDataRef.current) {
      const lengthChanged = flatData.length !== prevDataRef.current.length;
      // 첫 아이템 ID 비교 — 같은 데이터 재로드 vs 새 Import 구분
      const firstIdChanged = flatData.length > 0 && prevDataRef.current.length > 0
        && flatData[0].id !== prevDataRef.current[0].id;
      prevDataRef.current = flatData;
      if (lengthChanged || firstIdChanged) {
        setStepState(resetAllSteps);
        setFcCompResult(null);
        setIsAnalysisComplete(false);
      }
    }
  }, [flatData]);

  // ★ isSaved 변경으로 FC/FA 리셋하지 않음 (2026-02-21 버그 수정)
  // 이유: isSaved=false는 셀 편집할 때마다 발생 → SA→FC→FA 진행 중 리셋됨
  // flatData 길이 변경(위 useEffect)으로만 전체 리셋 처리

  // 확정 가능 여부 (isSaved 조건 제거 — 데이터만 있으면 SA 가능)
  const isManualMode = templateMode === 'manual';
  const canSA = canConfirmSA({ flatData, missingTotal });
  const canFC = canConfirmFC(stepState);
  // ★ 수동모드: FC 스킵 — SA 확정만으로 FA 가능
  const canFA = isManualMode ? stepState.saConfirmed : canConfirmFA(stepState);

  const expectedByStats = useMemo(() => {
    const stats = parseStatistics?.itemStats || [];
    const byCode = (code: string) => stats.find(s => s.itemCode === code)?.uniqueCount ?? 0;
    return {
      chainCount: parseStatistics?.chainCount ?? 0,
      fmCount: byCode('A5'),
      fcCount: byCode('B4'),
      feCount: byCode('C4'),
      hasVerification: !!parseStatistics?.verification,
      verificationPass: parseStatistics?.verification?.pass ?? true,
      // ★★★ 2026-02-24: 엑셀 수식 기반 검증값 (진정한 독립 기준) ★★★
      excelFormulas: parseStatistics?.excelFormulas,
    };
  }, [parseStatistics]);

  // ── SA 확정 ──
  // ★ 2026-02-23: try-catch 추가 — 런타임 에러 시 사용자 피드백 제공
  const confirmSA = useCallback((): BuildResult | null => {
    if (!canConfirmSA({ flatData, missingTotal })) return null;

    try {
      // ★ 누락 항목 보충 — buildWorksheetState 전에 B1 등 자동 보충
      const chainsForSupplement = externalChains && externalChains.length > 0
        ? externalChains
        : failureChains;
      const saSupplements = supplementMissingItems(flatData, chainsForSupplement);
      const enrichedFlatData = saSupplements.length > 0 ? [...flatData, ...saSupplements] : flatData;
      if (saSupplements.length > 0) {
        console.info(`[SA 확정] 누락 보충: ${saSupplements.length}건 자동 생성`);
      }

      // ★★★ 2026-03-15: 검증 레이어 — buildWorksheetState 전에 데이터 품질 검사 ★★★
      const { validateAndLogFlatData } = require('../utils/validateAndLogFlatData');
      const { report: validationReport } = validateAndLogFlatData(enrichedFlatData);
      if (validationReport.errorCount > 0) {
        console.warn(`[SA 확정] 검증 오류 ${validationReport.errorCount}건 발견 — 데이터 통과 (관대한 정책)`);
      }

      // buildWorksheetState는 동기 함수 (CODEFREEZE → dynamic import 불필요)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { buildWorksheetState } = require('../utils/buildWorksheetState');
      const result: BuildResult = buildWorksheetState(enrichedFlatData, { fmeaId, l1Name });

      // ★★★ 2026-03-02: IMPORT 계층 체인 검증 ★★★
      // 규칙: 상위 ≤ 하위 (하위가 크거나 같아야 정상)
      //   A chain: A2 ≤ A3 ≤ A4 ≤ A5
      //   B chain: B1 ≤ B2 ≤ B3 ≤ B4
      //   C chain: C1 ≤ C2 ≤ C3 ≤ C4
      // 하위=0건(시트 없음)이면 경고 스킵 → 워크시트에서 수동 배정 가능
      {
        const countOf = (code: string) => flatData.filter(d => d.itemCode === code).length;

        // ── 1) A/B 체인: 총합 기준 검증 ──
        const HIERARCHY_CHAINS: { upper: string; lower: string; uLabel: string; lLabel: string }[] = [
          { upper: 'A2', lower: 'A3', uLabel: '공정명', lLabel: '공정기능' },
          { upper: 'A3', lower: 'A4', uLabel: '공정기능', lLabel: '제품특성' },
          { upper: 'A4', lower: 'A5', uLabel: '제품특성', lLabel: '고장형태' },
          { upper: 'B1', lower: 'B2', uLabel: '작업요소명', lLabel: '작업요소기능' },
          { upper: 'B2', lower: 'B3', uLabel: '작업요소기능', lLabel: '공정특성' },
          { upper: 'B3', lower: 'B4', uLabel: '공정특성', lLabel: '고장원인' },
        ];

        const warnings: string[] = [];

        for (const h of HIERARCHY_CHAINS) {
          const uCnt = countOf(h.upper);
          const lCnt = countOf(h.lower);
          if (uCnt > 0 && lCnt === 0) continue; // 하위=0(시트 없음) → 스킵
          if (uCnt > 0 && lCnt < uCnt) {
            warnings.push(
              `  ${h.upper}(${h.uLabel})=${uCnt}건 > ${h.lower}(${h.lLabel})=${lCnt}건 → ${uCnt - lCnt}건 부족`,
            );
          }
        }

        // ── 2) C 체인: scope별(YP/SP/USER) 검증 ──
        const cItems = flatData.filter(d => d.category === 'C');
        const scopeNames = [...new Set(cItems.filter(d => d.itemCode === 'C1').map(d => d.processNo).filter(Boolean))];
        const C_PAIRS = [
          { upper: 'C1', lower: 'C2', uLabel: '구분', lLabel: '완제품기능' },
          { upper: 'C2', lower: 'C3', uLabel: '완제품기능', lLabel: '요구사항' },
          { upper: 'C3', lower: 'C4', uLabel: '요구사항', lLabel: '고장영향' },
        ];

        for (const scope of scopeNames) {
          for (const cp of C_PAIRS) {
            const uCnt = cItems.filter(d => d.itemCode === cp.upper && d.processNo === scope).length;
            const lCnt = cItems.filter(d => d.itemCode === cp.lower && d.processNo === scope).length;
            if (uCnt > 0 && lCnt === 0) continue; // 하위=0(시트 없음) → 스킵
            if (uCnt > 0 && lCnt < uCnt) {
              warnings.push(
                `  [${scope}] ${cp.upper}(${cp.uLabel})=${uCnt}건 > ${cp.lower}(${cp.lLabel})=${lCnt}건 → ${uCnt - lCnt}건 부족`,
              );
            }
          }
        }

        if (warnings.length > 0) {
          const msg =
            `⚠️ IMPORT 최소 데이터 기준 위반:\n` +
            `(상위 항목 수 ≤ 하위 항목 수 필수)\n\n` +
            warnings.join('\n') +
            `\n\n엑셀에 부족한 하위 데이터를 추가하거나,\n워크시트에서 수동 배정하세요.\n\n` +
            `그래도 계속 진행하시겠습니까?`;
          const proceed = window.confirm(msg);
          if (!proceed) return null;
        }
      }

      // ★★★ 2026-02-24: SA 단계 검증 실행 ★★★
      const saValidationCtx: ValidationContext = {
        buildResult: {
          l2Count: result.diagnostics.l2Count,
          l3Count: result.diagnostics.l3Count,
          fmCount: result.diagnostics.fmCount,
          fcCount: result.diagnostics.fcCount,
          feCount: result.diagnostics.feCount,
        },
        excelFormulas: expectedByStats.excelFormulas ? {
          fmCount: expectedByStats.excelFormulas.fmCount,
          fcCount: expectedByStats.excelFormulas.fcCount,
          feCount: expectedByStats.excelFormulas.feCount,
        } : undefined,
      };
      const saValidation = validateStage('SA', saValidationCtx);
      logValidationResult('SA', saValidation);

      // 오류 있으면 경고 표시 (차단하지 않고 경고만)
      if (!saValidation.pass) {
        const proceed = window.confirm(
          `SA 검증에서 오류가 발견되었습니다.\n\n` +
          formatValidationResult(saValidation) +
          `\n\n그래도 계속 진행하시겠습니까?`
        );
        if (!proceed) return null;
      } else if (saValidation.summary.warnings > 0) {
      }

      if (isManualMode) {
        // ★ 수동모드: FC 스킵 — SA 확정 후 바로 FA 단계로
        setStepState(prev => ({
          ...prev,
          saConfirmed: true,
          fcConfirmed: true,  // FC 자동확정 (수동모드에는 FC 시트 없음)
          faConfirmed: false,
          activeStep: 'FA',
          fcComparison: null,
          buildResult: {
            success: result.success,
            diagnostics: result.diagnostics,
          },
        }));
      } else {
        setStepState(prev => ({
          ...advanceToFC(prev),
          // ★ SA 재확정 시 하위 단계 초기화 (FC/FA 리셋)
          fcConfirmed: false,
          faConfirmed: false,
          fcComparison: null,
          buildResult: {
            success: result.success,
            diagnostics: result.diagnostics,
          },
        }));
      }

      // ★ SA 재확정 시 FC 비교 결과 리셋 + FA 상태 리셋
      setFcCompResult(null);
      setIsAnalysisComplete(false);

      // FC 자동 비교 실행: FC시트(589) 기준으로 메인시트 자동도출에서 찾기
      if (result.success) {
        const derived = buildFailureChainsFromFlat(flatData, crossTab);
        // ★ 파라미터 순서 수정: compareFCChains(derived, existing)
        const comparison = compareFCChains(derived, failureChains);
        setFcCompResult(comparison);
        setStepState(prev => ({ ...prev, fcComparison: comparison }));
      }

      // ★★★ 2026-03-12: SA 확정 시 failureChains만 PATCH (flatData 중복저장 방지) ★★★
      // Import 단계에서 이미 saveMasterDataset(replace=true)로 flatData 저장 완료
      // SA에서 다시 saveMasterDataset 호출하면 DB에 2배 레코드 발생 가능 → PATCH로 chains만 업데이트
      if (fmeaId && flatData.length > 0) {
        const chainsToSave = externalChains && externalChains.length > 0
          ? externalChains
          : failureChains.length > 0 ? failureChains : undefined;
        (async () => {
          try {
            // 1) failureChains가 있으면 PATCH로 chains만 업데이트
            if (chainsToSave && chainsToSave.length > 0) {
              await fetch(
                '/api/pfmea/master?fmeaId=' + encodeURIComponent(fmeaId),
                { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ failureChains: chainsToSave }) },
              );
            }
            // 2) verify-counts 재조회 → DBINPUT 즉시 반영
            const vcRes = await fetch(`/api/fmea/verify-counts?fmeaId=${encodeURIComponent(fmeaId)}`);
            if (vcRes.ok) {
              const vcJson = await vcRes.json();
              if (vcJson.success) {
                setStepState(prev => ({
                  ...prev,
                  dbVerifyCounts: { import: vcJson.import, db: vcJson.db },
                }));
              }
            }
          } catch (err) {
            console.error('[SA 확정] failureChains PATCH/검증 실패:', err);
          }
        })();
      }

      return result;
    } catch (err) {
      console.error('[SA 확정] buildWorksheetState 오류:', err);
      alert('SA 확정 중 오류가 발생했습니다: ' + (err instanceof Error ? err.message : String(err)));
      return null;
    }
  }, [flatData, missingTotal, fmeaId, l1Name, crossTab, failureChains, externalChains, expectedByStats, fmeaInfo, isManualMode]);

  // ── FC 확정 ──
  const confirmFC = useCallback((force = false): void => {
    if (!canConfirmFC(stepState) && !force) return;

    // ★★★ 2026-02-24: FC 단계 검증 실행 ★★★
    const chains = externalChains && externalChains.length > 0 ? externalChains : failureChains;
    const uniqueProcesses = new Set(chains.map(c => c.processNo).filter(Boolean));
    const uniqueFMs = new Set(chains.map(c => c.fmValue).filter(Boolean));
    const uniqueFEs = new Set(chains.map(c => c.feValue).filter(Boolean));

    // 공정번호 이상값 탐지 (4자리 이상 숫자)
    const processNoAnomalies = Array.from(uniqueProcesses).filter(p => {
      const num = parseInt(p || '', 10);
      return !isNaN(num) && num > 999;
    });

    const fcValidationCtx: ValidationContext = {
      parseStats: {
        chainCount: chains.length,
        uniqueFM: uniqueFMs.size,
        uniqueFC: chains.length,
        uniqueFE: uniqueFEs.size,
        uniqueProcess: uniqueProcesses.size,
      },
      excelFormulas: expectedByStats.excelFormulas ? {
        chainCount: expectedByStats.excelFormulas.chainCount,
        fmCount: expectedByStats.excelFormulas.fmCount,
        fcCount: expectedByStats.excelFormulas.fcCount,
        feCount: expectedByStats.excelFormulas.feCount,
      } : undefined,
      extra: {
        processNoAnomalies,
      },
    };
    const fcValidation = validateStage('FC', fcValidationCtx);
    logValidationResult('FC', fcValidation);

    // 오류 있으면 경고 표시 (차단하지 않고 경고만)
    if (!fcValidation.pass && !force) {
      const proceed = window.confirm(
        `FC 검증에서 오류가 발견되었습니다.\n\n` +
        formatValidationResult(fcValidation) +
        `\n\n그래도 계속 진행하시겠습니까?`
      );
      if (!proceed) return;
    } else if (fcValidation.summary.warnings > 0) {
    }

    // ★ FC 재확정 시 FA 초기화
    setStepState(prev => ({
      ...advanceToFA(prev),
      faConfirmed: false,
    }));
    setIsAnalysisComplete(false);
  }, [stepState, externalChains, failureChains, expectedByStats]);

  // ── FA 확정 ──
  const confirmFA = useCallback(async (): Promise<void> => {
    // ★ 수동모드: SA 확정만으로 FA 진행 가능 (FC 불필요)
    if (!isManualMode && !canConfirmFA(stepState)) {
      alert('FA 확정 불가: FC 단계를 먼저 확정해주세요.');
      return;
    }
    if (isManualMode && !stepState.saConfirmed) {
      alert('FA 확정 불가: SA 단계를 먼저 확정해주세요.');
      return;
    }
    if (!fmeaId) {
      alert('FA 확정 불가: FMEA 프로젝트가 선택되지 않았습니다.');
      return;
    }

    // ★★★ 2026-02-24: externalChains + failureChains + fallback 순서로 체인 확보 ★★★
    const parsedChains = externalChains && externalChains.length > 0
      ? externalChains
      : failureChains && failureChains.length > 0
        ? failureChains
        : buildFailureChainsFromFlat(flatData, crossTab);


    // 체인 데이터 없으면 차단 (수동모드 제외 — FC 시트 없음)
    if (parsedChains.length === 0 && !isManualMode) {
      alert(
        `FA 확정 불가: 고장사슬 데이터가 없습니다.\n\n` +
        `엑셀 파일에 FC 고장사슬 시트가 있는지 확인하세요.\n` +
        `또는 SA 탭에서 A5(고장형태), B4(고장원인), C4(고장영향) 데이터가 있는지 확인하세요.`
      );
      return;
    }

    // FA 검증 (경고만, 차단하지 않음)
    const validation = validateFADataConsistency(parsedChains, flatData, expectedByStats);
    if (!validation.pass) {
      const itemRef = validation.failedItems?.length ? ` [${validation.failedItems.join(', ')}]` : '';
    }

    setIsAnalysisImporting(true);

    try {
      // ★★★ 2026-03-01 수정: 프로젝트 존재 확인 + 자동 생성 (필수 — 실패 시 FA 차단) ★★★
      const normalizedId = fmeaId.toLowerCase();
      try {
        const projRes = await fetch(`/api/fmea/projects?id=${encodeURIComponent(normalizedId)}`);
        const projData = await projRes.json();
        const projectExists = projData.success && projData.projects?.length > 0
          && projData.projects.some((p: { id?: string }) => p.id?.toLowerCase() === normalizedId);

        if (!projectExists) {
          const createPayload = {
            fmeaId: normalizedId,
            fmeaType: fmeaInfo?.fmeaType || 'P',
            project: { projectName: fmeaInfo?.subject || l1Name || '' },
            fmeaInfo: {
              subject: fmeaInfo?.subject || l1Name || '',
              companyName: fmeaInfo?.companyName || '',
              customerName: fmeaInfo?.customerName || '',
              modelYear: fmeaInfo?.modelYear || '',
              fmeaType: fmeaInfo?.fmeaType || 'P',
              engineeringLocation: fmeaInfo?.engineeringLocation || '',
              designResponsibility: fmeaInfo?.designResponsibility || '',
              fmeaResponsibleName: fmeaInfo?.fmeaResponsibleName || '',
              partName: fmeaInfo?.partName || '',
              partNo: fmeaInfo?.partNo || '',
            },
          };
          const createRes = await fetch('/api/fmea/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(createPayload),
          });
          const createResult = await createRes.json();
          if (createResult.success || createResult.dbSaved) {
          } else {
            console.error('[FA 확정] FmeaProject 자동 생성 실패:', createResult);
            alert(
              '프로젝트 등록에 실패했습니다.\n\n' +
              '등록 화면 상단의 "저장" 버튼을 먼저 눌러주세요.\n' +
              '(프로젝트 등록 → 저장 → FA 확정 순서)',
            );
            setIsAnalysisImporting(false);
            return;
          }
        }
      } catch (projCheckErr) {
        // ★★★ 2026-03-01 수정: 프로젝트 확인/생성 실패 시 FA 차단 (묵살 금지) ★★★
        console.error('[FA 확정] 프로젝트 확인/생성 실패:', projCheckErr);
        alert(
          '프로젝트 등록 확인에 실패했습니다.\n\n' +
          'DB 연결 상태를 확인하고,\n' +
          '등록 화면에서 "저장" 버튼을 먼저 눌러주세요.',
        );
        setIsAnalysisImporting(false);
        return;
      }

      const { saveWorksheetFromImport } = await import('../utils/saveWorksheetFromImport');

      // ★ externalChains = FC 시트에서 파싱한 실제 데이터 (fallback 아님)
      let fcSheetChains = externalChains && externalChains.length > 0 ? externalChains : null;

      // ★★★ 2026-02-06: state에 없으면 Master DB에서 한 번 더 시도 ★★★
      if (!fcSheetChains && fmeaId) {
        try {
          const dbRes = await fetch(`/api/pfmea/master?fmeaId=${encodeURIComponent(fmeaId)}&includeItems=true`);
          if (dbRes.ok) {
            const dbJson = await dbRes.json();
            const dbChains = dbJson?.dataset?.failureChains;
            if (Array.isArray(dbChains) && dbChains.length > 0) {
              fcSheetChains = dbChains as MasterFailureChain[];
            }
          }
        } catch (e) {
          console.error('[FA 확정] DB 조회 실패:', e);
        }
      }

      const displayChains = failureChains.length > 0 ? failureChains : null;
      const usedChains = fcSheetChains ?? displayChains ?? buildFailureChainsFromFlat(flatData, crossTab);

      const chainSource = fcSheetChains
        ? `FC시트(${fcSheetChains.length}건)`
        : displayChains
          ? `표시용체인(${displayChains.length}건, FC시트없음)`
          : `flatData fallback(${usedChains.length}건)`;


      // ★ 2026-02-24: FC 시트 없어도 fallback 데이터 있으면 바로 진행
      // ★ 수동모드: 체인 없이도 진행 가능 (워크시트에서 수동 연결)
      if (usedChains.length === 0 && !isManualMode) {
        alert('FA 확정 불가: 고장사슬 데이터가 없습니다.');
        setIsAnalysisImporting(false);
        return;
      }

      const wsResult = await saveWorksheetFromImport({
        fmeaId,
        flatData,
        l1Name,
        failureChains: usedChains,
      });

      // ★ FM 갭 피드백: wsState에서 추가 생성된 항목을 flatData에 병합
      const feedbackItems = wsResult.feedback?.additionalItems || [];
      const mergedFlatData = feedbackItems.length > 0
        ? [...flatData, ...feedbackItems]
        : flatData;
      if (feedbackItems.length > 0) {
        console.info(`[FM-Feedback] ${wsResult.feedback?.summary}`);
      }

      // ★ master DB에 failureChains + flatData(피드백 포함) 저장
      if (fmeaId) {
        try {
          // 1) failureChains PATCH
          if (usedChains.length > 0) {
            const patchResp = await fetch(
              '/api/pfmea/master?fmeaId=' + encodeURIComponent(fmeaId),
              { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ failureChains: usedChains }) }
            );
          }
          // 2) flatData(BD 기초정보) 저장 — 피드백 항목 포함하여 기초정보 일치성 유지
          // ★★★ 2026-03-10: failureChains 포함 — PATCH와 POST 사이 timing 이슈로 chains 유실 방지 ★★★
          if (mergedFlatData.length > 0) {
            const { saveMasterDataset } = await import('../utils/master-api');
            const saveRes = await saveMasterDataset({
              fmeaId,
              fmeaType: fmeaInfo?.fmeaType || 'P',
              parentFmeaId: null,
              replace: true,
              flatData: mergedFlatData,
              failureChains: usedChains.length > 0 ? usedChains : undefined,
            });
          }
        } catch (masterErr) {
          console.error('[FA 확정] Master DB 저장 실패:', masterErr);
          alert('⚠️ Master DB 저장 실패: ' + (masterErr instanceof Error ? masterErr.message : String(masterErr)));
        }
      }

      if (wsResult.success) {
        const dd = wsResult.buildResult.diagnostics;

        // ★★★ 2026-03-10: verify-counts 100% 일치 루프 (최대 3회 재시도) ★★★
        const VERIFY_CODES = ['A2', 'B1', 'C1', 'C2', 'C3', 'A3', 'A4', 'B2', 'B3', 'C4', 'A5', 'B4'];
        const TOLERANCE = 2;
        const MAX_RETRIES = 3;

        let verifyCounts: { import: Record<string, number>; db: Record<string, number> } | null = null;
        let mismatchItems: string[] = [];

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            // ★ 재시도 시 약간의 딜레이 (DB 커밋 완료 대기)
            if (attempt > 1) {
              await new Promise(r => setTimeout(r, 1000 * attempt));
              console.info(`[FA 확정] verify-counts 재시도 ${attempt}/${MAX_RETRIES}...`);
            }

            const vcRes = await fetch(`/api/fmea/verify-counts?fmeaId=${encodeURIComponent(fmeaId)}`);
            if (vcRes.ok) {
              const vcJson = await vcRes.json();
              if (vcJson.success) {
                verifyCounts = { import: vcJson.import, db: vcJson.db };
              }
            }
          } catch (vcErr) {
            console.error(`[FA 확정] verify-counts 조회 실패 (attempt ${attempt}):`, vcErr);
          }

          // 불일치 체크
          mismatchItems = [];
          if (verifyCounts) {
            for (const code of VERIFY_CODES) {
              const imp = verifyCounts.import[code] ?? 0;
              const db = verifyCounts.db[code] ?? 0;
              if (imp > 0 && db < imp - TOLERANCE) {
                mismatchItems.push(`${code}: Import=${imp}, DB=${db} (${imp - db}건 손실)`);
              }
            }
          }

          // ★ DB 전부 0인 경우 명확한 경고 (워크시트 저장 자체 실패)
          if (verifyCounts) {
            const dbTotal = Object.values(verifyCounts.db).reduce((s, v) => s + (v || 0), 0);
            if (dbTotal === 0) {
              console.error(`[FA 확정] DB 카운트 전부 0 — 워크시트 저장이 실패했을 가능성 (attempt ${attempt})`);
            }
          }

          // 100% 일치 → 루프 탈출
          if (mismatchItems.length === 0) {
            if (attempt > 1) {
              console.info(`[FA 확정] verify-counts 100% 일치 (${attempt}차 시도)`);
            }
            break;
          }

          // 마지막 시도가 아니면 재저장 시도
          if (attempt < MAX_RETRIES) {
            console.warn(`[FA 확정] I→D 불일치 ${mismatchItems.length}건 — 재저장 시도 ${attempt + 1}/${MAX_RETRIES}`);
            try {
              const { saveWorksheetFromImport: retrySave } = await import('../utils/saveWorksheetFromImport');
              await retrySave({ fmeaId, flatData, l1Name, failureChains: usedChains });
            } catch (retryErr) {
              console.error(`[FA 확정] 재저장 실패 (attempt ${attempt}):`, retryErr);
            }
          }
        }

        setIsAnalysisComplete(true);

        setStepState(prev => ({
          ...markFAConfirmed(prev),
          dbVerifyCounts: verifyCounts,
        }));

        const missingParts: string[] = [];
        if (dd.fmCount === 0) missingParts.push('고장형태(FM)');
        if (dd.fcCount === 0) missingParts.push('고장원인(FC)');
        if (dd.feCount === 0) missingParts.push('고장영향(FE)');

        const missingWarning = missingParts.length > 0
          ? `\n\n⚠️ 주의: ${missingParts.join(', ')} 데이터가 0건입니다!\n엑셀 A5/B4/C4 시트를 확인하고 다시 Import 하세요.`
          : '';

        const dbMismatchWarning = mismatchItems.length > 0
          ? `\n\n⚠️ Import→DB 데이터 손실 감지 (${MAX_RETRIES}회 시도 후):\n${mismatchItems.join('\n')}`
          : '\n\n✓ Import→DB 100% 일치 확인';

        // ★ FM 갭 피드백 알림
        const feedbackInfo = wsResult.feedback && wsResult.feedback.totalAdded > 0
          ? `\n\n🔄 피드백: ${wsResult.feedback.summary}`
          : '';

        alert(
          `워크시트 생성 완료!\n\n` +
          `공정(L2): ${dd.l2Count}개\n` +
          `작업요소(L3): ${dd.l3Count}개\n` +
          `L2기능: ${dd.l2FuncCount}개, L3기능: ${dd.l3FuncCount}개\n` +
          `고장형태: ${dd.fmCount}개, 고장원인: ${dd.fcCount}개, 고장영향: ${dd.feCount}개` +
          feedbackInfo +
          missingWarning +
          dbMismatchWarning
        );

        // ★ 2026-03-10: FA 완료 후 자동 이동 제거 — "FMEA 작성 →" 버튼으로 수동 이동
        // onWorksheetSaved?.();  // ← 삭제: FA 후 자동 이동하지 않음
      } else {
        alert('워크시트 생성 실패: ' + (wsResult.error || '알 수 없는 오류'));
      }
    } catch (err) {
      console.error('[FA 확정] 오류:', err);
      alert('워크시트 생성 중 오류: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsAnalysisImporting(false);
    }
  }, [
    stepState,
    fmeaId,
    flatData,
    l1Name,
    fmeaInfo,
    failureChains,
    externalChains,
    crossTab,
    expectedByStats,
    onWorksheetSaved,
    isManualMode,
  ]);

  // ── 탭 수동 전환 ──
  // ★ 2026-02-22: 탭 전환은 자유 허용 (뒤로 가기 포함)
  // 확정 액션(confirmSA/FC/FA)만 순서 가드 적용
  const setActiveStep = useCallback((step: 'SA' | 'FC' | 'FA') => {
    setStepState(prev => ({ ...prev, activeStep: step }));
  }, []);

  // ── 되돌리기 (확정 리셋 + 탭 이동) ──
  // ★ 2026-02-27: 확정 후 되돌아가서 데이터 확인 가능
  const resetToSA = useCallback(() => {
    setStepState(getInitialStepState());
    setFcCompResult(null);
    setIsAnalysisComplete(false);
  }, []);

  const resetToFC = useCallback(() => {
    setStepState(prev => ({
      ...prev,
      fcConfirmed: false,
      faConfirmed: false,
      activeStep: 'FC',
      fcComparison: null,
    }));
    setIsAnalysisComplete(false);
  }, []);

  // ── 원클릭 워크시트 생성 (SA+FC+FA 검증 없이 바로 저장) ──
  // ★ 2026-03-10: "FMEA 작성 →" 버튼 전용 — 4개 탭 공통
  const quickCreateWorksheet = useCallback(async (): Promise<void> => {
    // 이미 완료 → 바로 이동
    if (isAnalysisComplete) {
      onWorksheetSaved?.();
      return;
    }
    if (!fmeaId) {
      alert('FMEA 프로젝트를 먼저 선택하세요.');
      return;
    }
    if (flatData.length === 0) {
      alert('기초정보 데이터가 없습니다. 먼저 데이터를 생성하세요.');
      return;
    }

    setIsAnalysisImporting(true);
    try {
      const result = await quickWorksheetSave({
        fmeaId,
        flatData,
        l1Name,
        failureChains,
        externalChains,
        crossTab,
        fmeaInfo,
      });

      if (result.success) {
        setIsAnalysisComplete(true);
        // SA+FC+FA 모두 확정 상태로 전환
        setStepState(prev => ({
          ...markFAConfirmed(prev),
          saConfirmed: true,
          fcConfirmed: true,
        }));

        const dd = result.diagnostics;
        if (dd) {
          console.info(
            `[quickCreate] 워크시트 생성 완료: L2=${dd.l2Count}, L3=${dd.l3Count}, FM=${dd.fmCount}, FC=${dd.fcCount}, FE=${dd.feCount}`,
          );
        }

        onWorksheetSaved?.();
      } else {
        alert(result.error || '워크시트 생성 실패');
      }
    } catch (err) {
      console.error('[quickCreate] 오류:', err);
      alert('워크시트 생성 중 오류: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsAnalysisImporting(false);
    }
  }, [
    isAnalysisComplete, fmeaId, flatData, l1Name,
    failureChains, externalChains, crossTab, fmeaInfo,
    onWorksheetSaved,
  ]);

  return {
    stepState,
    setActiveStep,
    canSA,
    canFC,
    canFA,
    confirmSA,
    confirmFC,
    confirmFA,
    quickCreateWorksheet,
    resetToSA,
    resetToFC,
    fcComparison: fcCompResult,
    isAnalysisImporting,
    isAnalysisComplete,
  };
}
