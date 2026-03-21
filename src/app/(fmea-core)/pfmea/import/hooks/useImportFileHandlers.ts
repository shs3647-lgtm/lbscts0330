/**
 * @file useImportFileHandlers.ts
 * @description 파일 선택 및 Import 핸들러
 */

// CODEFREEZE: DB Only 정책 적용 완료 (2026-02-16) - localStorage pfmea_master_data 폴백 제거
import { useRef } from 'react';
import { ParseResult } from '../excel-parser';
import { ImportedFlatData } from '../types';
import type { MasterFailureChain } from '../types/masterFailureChain';
import { saveMasterDataset } from '../utils/master-api';
import { validateExcelFileWithAlert } from '@/lib/excel-validation';
import { validateImportData } from '../utils/import-validation';
import { validateHierarchy } from '../utils/hierarchy-validation';
import { detectRedCells, applyRevisedFlags, applyRevisedFlagsToChains } from '../utils/excel-color-detector';
import { inferDC, inferPC, getDefaultRuleSet } from '../stepb-parser/pc-dc-inference';
import { runParsingCriteriaValidation } from '../utils/parsing-criteria-validator';
import { convertParseResultToStepBBuildData, convertStepBChainsToMasterChains } from '../utils/parseResultToStepBData';
import { convertToImportFormat } from '../stepb-parser/import-builder';
import { WarningCollector } from '../stepb-parser/types';

interface UseImportFileHandlersProps {
  setFileName: (name: string) => void;
  setIsParsing: (parsing: boolean) => void;
  setImportSuccess: (success: boolean) => void;
  setParseResult: (result: ParseResult | null) => void;
  setPendingData: React.Dispatch<React.SetStateAction<ImportedFlatData[]>>;
  setFlatData: React.Dispatch<React.SetStateAction<ImportedFlatData[]>>;
  setIsImporting: (importing: boolean) => void;
  setMasterDatasetId?: (id: string | null) => void;
  setMasterChains?: (chains: MasterFailureChain[]) => void;  // ★ FC 고장사슬 저장
  setIsSaved?: React.Dispatch<React.SetStateAction<boolean>>; // ✅ 저장 상태 표시
  setDirty?: React.Dispatch<React.SetStateAction<boolean>>; // ✅ 변경 상태 표시
  setValidationMessage?: (msg: string | null) => void; // ✅ 2026-02-07: 컬럼별 검증 메시지
  flatData: ImportedFlatData[];
  pendingData: ImportedFlatData[];
  masterChains?: MasterFailureChain[];  // ★ Import 시 DB 전송용
  parseMultiSheetExcel: (file: File) => Promise<ParseResult>;
  saveToMaster?: boolean; // Master FMEA에 자동 저장 여부
  masterDatasetId?: string | null; // ★ 2026-02-08: 기존 Dataset ID (전체 교체용)
  fmeaId?: string; // ★ FMEA ID (1 FMEA = 1 Dataset)
  fmeaType?: string; // ★ FMEA 타입 (P/D)
}

export function useImportFileHandlers({
  setFileName,
  setIsParsing,
  setImportSuccess,
  setParseResult,
  setPendingData,
  setFlatData,
  setIsImporting,
  setMasterDatasetId,
  setMasterChains,
  setIsSaved,
  setDirty,
  setValidationMessage,
  flatData,
  pendingData,
  masterChains,
  parseMultiSheetExcel,
  saveToMaster = true, // 기본값: Master FMEA에 저장
  masterDatasetId,
  fmeaId,
  fmeaType,
}: UseImportFileHandlersProps) {

  // ★ rawFingerprint 보관 (handleFileSelect → handleImport 전달용)
  const rawFingerprintRef = useRef<Record<string, unknown> | null>(null);
  // ★★★ 2026-03-16: A6/B5 캐시 (handleFileSelect → handleImport 전달용)
  const cachedA6B5Ref = useRef<{ a6: ImportedFlatData[]; b5: ImportedFlatData[] }>({ a6: [], b5: [] });

  /** 파일 선택 핸들러 (파싱 후 pendingData에 저장) */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ★★★ 2026-02-05: 엑셀 파일 형식 검증 (.xlsx만 지원) ★★★
    if (!validateExcelFileWithAlert(file)) {
      e.target.value = '';  // 파일 선택 초기화
      return;
    }

    setFileName(file.name);
    setIsParsing(true);
    setImportSuccess(false);

    try {
      const result = await parseMultiSheetExcel(file);
      setParseResult(result);

      // ★ rawFingerprint 저장 (DB 전송용 — FC검증에서 589 기준으로 활용)
      rawFingerprintRef.current = result.statistics?.rawFingerprint
        ? {
          processes: result.statistics.rawFingerprint.processes,
          totalFM: result.statistics.rawFingerprint.totalFM,
          totalFC: result.statistics.rawFingerprint.totalFC,
          totalFE: result.statistics.rawFingerprint.totalFE,
          totalChainRows: result.statistics.rawFingerprint.totalChainRows,
          excelFormulas: result.statistics.rawFingerprint.excelFormulas,
        }
        : null;

      // ★★★ chains는 convertToImportFormat 후 결정론적 flatId와 함께 설정 (아래 참조) ★★★

      // ★★★ 2026-02-17: 파싱 실패 → Import 차단 ★★★
      if (!result.success) {
        const errMsg = result.errors.length > 0
          ? result.errors.join('\n')
          : '파일 파싱에 실패했습니다.';
        alert('❌ Import 불가\n\n' + errMsg);
        setValidationMessage?.(errMsg);
        setPendingData([]);
        setFlatData([]);
        return;
      }

      // ★★★ Basic Data Import: 공정별 데이터 건수만 확인 ★★★
      // 상하관계 검증은 워크시트 빌드(FMEA Analysis Data Import)에서 자동 매칭
      const validation = validateImportData(result);

      // ★★★ 2026-03-10: P3 — 상하관계 검증 연결 ★★★
      const hierarchyResult = validateHierarchy(result);
      if (!hierarchyResult.valid) {
        const hErrors = hierarchyResult.errors.map(e => `  ❌ [${e.rule}] ${e.message}`);
        const hWarnings = hierarchyResult.warnings.map(w => `  ⚠️ [${w.rule}] ${w.message}`);
        const hMsg = `🔍 상하관계 검증 ${hierarchyResult.errors.length + hierarchyResult.warnings.length}건:\n${[...hErrors, ...hWarnings].join('\n')}`;
        validation.errors.push(...hErrors);
        validation.warnings.push(...hWarnings);
        validation.totalIssues += hierarchyResult.errors.length + hierarchyResult.warnings.length;
        result.errors.push(hMsg);
      } else if (hierarchyResult.warnings.length > 0) {
        const hWarnings = hierarchyResult.warnings.map(w => `  ⚠️ [${w.rule}] ${w.message}`);
        validation.warnings.push(...hWarnings);
        validation.totalIssues += hierarchyResult.warnings.length;
      }

      if (validation.errors.length > 0 || validation.totalIssues > 0) {
        const parts: string[] = [];
        if (validation.errors.length > 0) {
          parts.push(...validation.errors);
        }
        if (validation.warnings.length > 0) {
          parts.push(...validation.warnings);
        }
        const msg = `⚠️ 데이터 검증 ${validation.totalIssues}건 발견:\n${parts.join('\n')}`;
        setValidationMessage?.(msg);
        result.errors.push(...validation.warnings.filter(w => w.startsWith('  ')).map(w => `⚠️ ${w.trim()}`));
        result.errors.push(...validation.errors.filter(w => w.startsWith('  ')).map(w => `❌ ${w.trim()}`));
      } else if (result.processes.length > 0 || result.products.length > 0) {
        // ★ 2026-02-23: 구조 + 핵심 데이터 건수 표시
        const fmTotal = result.processes.reduce((s, p) => s + p.failureModes.filter(v => v.trim()).length, 0);
        const fcTotal = result.processes.reduce((s, p) => s + p.failureCauses.filter(v => v.trim()).length, 0);
        const feTotal = result.products.reduce((s, p) => s + p.failureEffects.filter(v => v.trim()).length, 0);
        const chainCount = result.failureChains?.length || 0;
        setValidationMessage?.(
          `✅ 입력자료가 컬럼별로 일치합니다.\n` +
          `📊 FM: ${fmTotal}건, FC: ${fcTotal}건, FE: ${feTotal}건` +
          (chainCount > 0 ? `, 고장사슬: ${chainCount}건` : '')
        );
      }

      // ★★★ 2026-03-21: convertToImportFormat 기반 결정론적 ID 생성 ★★★
      // ParseResult → StepBBuildData 변환 후 convertToImportFormat 호출
      // 결과: 결정론적 ID (PF-L3-040-IM-001 등) + chain FK (fmFlatId/fcFlatId/feFlatId)
      const stepBData = convertParseResultToStepBBuildData(result);
      const warn = new WarningCollector();
      const importResult = convertToImportFormat(stepBData, warn);

      // flat 배열에 결정론적 ID 기반 데이터 할당
      const flat: ImportedFlatData[] = [...importResult.flatData];

      // chains를 MasterFailureChain 형식으로 변환 (fmFlatId/fcFlatId/feFlatId 포함)
      const chains = result.failureChains;
      if (importResult.failureChains.length > 0) {
        const updatedChains = convertStepBChainsToMasterChains(
          importResult.failureChains,
          chains || [],
        );
        setMasterChains?.(updatedChains);

        // FC 파싱 즉시 DB 저장 (결정론적 flatId 포함)
        if (fmeaId) {
          fetch(`/api/pfmea/master?fmeaId=${encodeURIComponent(fmeaId)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ failureChains: updatedChains }),
          }).catch(err => console.error('[FC파싱] chains DB 즉시 저장 실패:', err));
        }
      }

      // WarningCollector 로그 출력
      const warnSummary = warn.summary();
      if (warnSummary.WARN > 0 || warnSummary.ERROR > 0) {
        console.log(`[import-builder] 경고: ${warnSummary.WARN}건 WARN, ${warnSummary.ERROR}건 ERROR`);
        for (const w of warn.getAll()) {
          if (w.level === 'ERROR') console.error(`  [${w.code}] ${w.message}`);
          else if (w.level === 'WARN') console.warn(`  [${w.code}] ${w.message}`);
        }
      }

      // ★★★ A6(검출관리) 자동 추론 — 공정별 A6 미존재 시 inferDC(A5) ★★★
      {
        const a6ByProc = new Set<string>();
        for (const item of flat) {
          if (item.itemCode === 'A6') a6ByProc.add(item.processNo);
        }
        const ruleSet = getDefaultRuleSet();
        const a5ByProc = new Map<string, Array<{ value: string; idx: number }>>();
        for (const item of flat) {
          if (item.itemCode === 'A5' && item.value?.trim()) {
            const list = a5ByProc.get(item.processNo) || [];
            list.push({ value: item.value.trim(), idx: list.length });
            a5ByProc.set(item.processNo, list);
          }
        }
        const a6Seen = new Set<string>();
        let a6Idx = 0;
        for (const [pNo, a5List] of a5ByProc) {
          if (a6ByProc.has(pNo)) continue;
          for (const a5 of a5List) {
            const { dc } = inferDC(a5.value, ruleSet);
            if (!dc) continue;
            const key = `${pNo}|${dc}`;
            if (a6Seen.has(key)) continue;
            a6Seen.add(key);
            flat.push({ id: `${pNo}-A6-infer-${a6Idx}`, processNo: pNo, category: 'A', itemCode: 'A6', value: dc, parentItemId: `${pNo}-A5-0`, createdAt: new Date() });
            a6Idx++;
          }
        }
        if (a6Idx > 0) console.log(`[A6 inferDC] ${a6Idx}건 자동 추론 (공정별 미커버분)`);
      }

      // ★★★ B5(예방관리) 자동 추론 — 공정별 B5 미존재 시 inferPC(B4+m4) ★★★
      {
        const b5ByProc = new Set<string>();
        for (const item of flat) {
          if (item.itemCode === 'B5') b5ByProc.add(item.processNo);
        }
        const ruleSet = getDefaultRuleSet();
        const b4Items = flat.filter(d => d.itemCode === 'B4' && d.value?.trim());
        const b5Seen = new Set<string>();
        let b5Idx = 0;
        for (const b4 of b4Items) {
          if (b5ByProc.has(b4.processNo)) continue;
          const pc = inferPC(b4.value!.trim(), b4.m4 || '', ruleSet);
          if (!pc) continue;
          const key = `${b4.processNo}|${b4.m4 || ''}|${pc}`;
          if (b5Seen.has(key)) continue;
          b5Seen.add(key);
          flat.push({ id: `${b4.processNo}-B5-infer-${b5Idx}`, processNo: b4.processNo, category: 'B', itemCode: 'B5', value: pc, m4: b4.m4 || '', parentItemId: `${b4.processNo}-B4-0`, createdAt: new Date() });
          b5Idx++;
        }
        if (b5Idx > 0) console.log(`[B5 inferPC] ${b5Idx}건 자동 추론 (공정별 미커버분)`);
      }

      // ★★★ 2026-03-19: 파싱 검증 기준표 + 자동수정 루프 (최대 3회) ★★★
      {
        const MAX_FIX_LOOPS = 3;
        for (let loop = 0; loop < MAX_FIX_LOOPS; loop++) {
          const report = runParsingCriteriaValidation(flat, chains || []);
          if (report.failCount === 0 && report.warnCount === 0) {
            console.log(`[파싱검증] Loop ${loop + 1}: ALL PASS (${report.passCount}/${report.criteriaResults.length})`);
            break;
          }
          if (report.autoFixes.length === 0) {
            console.log(`[파싱검증] Loop ${loop + 1}: ${report.failCount} FAIL, ${report.warnCount} WARN — 자동수정 불가`);
            const failMsgs = report.criteriaResults.filter(r => r.status === 'FAIL').map(r => `  ❌ [${r.ruleId}] ${r.message}`);
            const warnMsgs = report.criteriaResults.filter(r => r.status === 'WARN').map(r => `  ⚠️ [${r.ruleId}] ${r.message}`);
            if (failMsgs.length > 0 || warnMsgs.length > 0) {
              const msg = `🔍 파싱 기준표 검증 (${report.failCount} FAIL, ${report.warnCount} WARN):\n${[...failMsgs, ...warnMsgs].join('\n')}`;
              setValidationMessage?.(msg);
            }
            break;
          }
          console.log(`[파싱검증] Loop ${loop + 1}: ${report.autoFixes.length}건 자동수정 적용 → 재검증`);
          for (const fix of report.autoFixes) {
            console.log(`  ✅ [${fix.ruleId}] ${fix.description}`);
          }
        }
      }

      // ⚠️ 파싱 결과가 비어있으면 경고 (Item Import 파일 형식 안내 포함)
      if (flat.length === 0) {
        alert(
          '⚠️ 파싱된 데이터가 없습니다.\n\n' +
          '【FMEA Import】 파일 형식:\n' +
          '- L2-1 공정번호, L2-2 공정명, L2-3 공정기능 등 시트 필요\n\n' +
          '【Item Import】 파일 형식 (공정명, 공정기능 등 단일 항목):\n' +
          '- "Item Import" 영역의 "찾아보기" 버튼을 사용하세요.\n' +
          '- 항목 선택 후 해당 항목 파일을 업로드합니다.'
        );
      }

      // ★★★ 2026-03-13: 적색 표기 감지 → isRevised 플래그 적용 ★★★
      try {
        const redCellMap = await detectRedCells(file);
        if (redCellMap.size > 0) {
          applyRevisedFlags(flat, redCellMap);
          if (result.failureChains && result.failureChains.length > 0) {
            applyRevisedFlagsToChains(result.failureChains, redCellMap);
          }
          const revisedCount = flat.filter(d => d.isRevised).length;
          if (revisedCount > 0) {
            console.log(`[적색감지] ${redCellMap.size}개 적색 셀 감지 → ${revisedCount}건 isRevised 적용`);
          }
        }
      } catch (colorErr) {
        console.error('[적색감지] 색상 감지 실패 (파싱 결과에 영향 없음):', colorErr);
      }

      // ★★★ 2026-03-16: A6/B5를 ref에 캐시 (handleImport에서 복원용)
      cachedA6B5Ref.current = {
        a6: flat.filter(d => d.itemCode === 'A6'),
        b5: flat.filter(d => d.itemCode === 'B5'),
      };
      if (cachedA6B5Ref.current.a6.length > 0 || cachedA6B5Ref.current.b5.length > 0) {
        console.log(`[handleFileSelect] A6/B5 캐시: A6=${cachedA6B5Ref.current.a6.length} B5=${cachedA6B5Ref.current.b5.length}`);
      }
      setPendingData(flat);
      setFlatData(flat);

      // ✅ 파일 파싱 후 저장 필요 상태 표시
      if (flat.length > 0) {
        setIsSaved?.(false);  // 저장 필요 상태
        setDirty?.(true);     // 변경됨 상태
      }
    } catch (error) {
      console.error('❌ 파싱 오류:', error);
      alert('❌ Excel 파싱 중 오류가 발생했습니다.\n\n' + (error as Error).message);
    } finally {
      setIsParsing(false);
    }
  };

  /** 비즈니스 키 생성 - B1~B5 m4 포함, B3/B4는 belongsTo(작업요소) 추가 (2026-03-15) */
  const getBusinessKey = (d: ImportedFlatData): string => {
    if (['B1', 'B2', 'B5'].includes(d.itemCode) && d.m4) {
      return `${d.processNo}|${d.itemCode}|${d.m4}|${d.value}`;
    }
    // ★★★ 2026-03-15 FIX: B3 + B4 dedup 키에 belongsTo(작업요소 참조) 추가 ★★★
    // B3: 같은 공정/m4에서 다른 WE가 동일한 공정특성을 가질 수 있음
    // B4: 같은 공정/m4에서 다른 WE가 동일한 FC 텍스트를 가질 수 있음
    // 예: 40/IM에서 "Target 소진"이 Ti Target과 Cu Target에 각각 적용 → 별도 항목으로 유지
    if ((d.itemCode === 'B3' || d.itemCode === 'B4') && d.m4) {
      return `${d.processNo}|${d.itemCode}|${d.m4}|${d.belongsTo || ''}|${d.value}`;
    }
    return `${d.processNo}|${d.itemCode}|${d.value}`;
  };

  /** Import 버튼 클릭 핸들러 */
  const handleImport = async () => {
    if (pendingData.length === 0) {
      alert('Import할 데이터가 없습니다. 먼저 Excel 파일을 선택해주세요.');
      return;
    }

    setIsImporting(true);
    setImportSuccess(false);

    try {
      // ★★★ 2026-02-07: 비즈니스 키 기반 매칭 (UUID vs 합성ID 불일치 해결) ★★★
      // 기존 ID 매칭: d.id === newItem.id → UUID vs "30-B1-0" 절대 불일치 → 중복 발생
      // 수정: processNo + itemCode + value 기반 매칭 → 내용 동일하면 업데이트, 신규면 추가
      const existingByKey = new Map<string, ImportedFlatData>();
      flatData.forEach(d => existingByKey.set(getBusinessKey(d), d));

      const importData: ImportedFlatData[] = [];
      const seen = new Set<string>();

      pendingData.forEach(newItem => {
        const key = getBusinessKey(newItem);
        if (seen.has(key)) return; // 비즈니스 키 기반 중복 방지
        seen.add(key);

        const existing = existingByKey.get(key);
        if (existing) {
          // ✅ 매칭: 기존 UUID 보존, 새 값 적용 (specialChar는 newItem 우선)
          // ★★★ 2026-03-17: parentItemId = newItem 우선 (파서가 계산한 최신 부모 관계 반영)
          importData.push({
            ...existing,
            m4: newItem.m4 || existing.m4,
            specialChar: newItem.specialChar || existing.specialChar || undefined,
            belongsTo: newItem.belongsTo || existing.belongsTo || undefined,
            parentItemId: newItem.parentItemId || existing.parentItemId || undefined,
            id: existing.id,
            createdAt: new Date(),
          });
        } else {
          // 신규 항목
          importData.push({ ...newItem, createdAt: new Date() });
        }
      });

      // ★★★ 2026-03-16 FIX: A6/B5가 importData에 없으면 cachedA6B5Ref에서 복원 ★★★
      const hasA6 = importData.some(d => d.itemCode === 'A6');
      const hasB5 = importData.some(d => d.itemCode === 'B5');
      const pdA6 = pendingData.filter(d => d.itemCode === 'A6').length;
      const pdB5 = pendingData.filter(d => d.itemCode === 'B5').length;
      console.log(`[handleImport] pendingData A6=${pdA6} B5=${pdB5}, importData A6=${hasA6} B5=${hasB5}, cache A6=${cachedA6B5Ref.current.a6.length} B5=${cachedA6B5Ref.current.b5.length}`);
      if (!hasA6 || !hasB5) {
        const cached = cachedA6B5Ref.current;
        if (!hasA6 && cached.a6.length > 0) {
          importData.push(...cached.a6);
          console.log(`[handleImport] A6 복원: ${cached.a6.length}건`);
        }
        if (!hasB5 && cached.b5.length > 0) {
          importData.push(...cached.b5);
          console.log(`[handleImport] B5 복원: ${cached.b5.length}건`);
        }
      }
      setFlatData(importData);
      setPendingData([]);

      // ✅ Import 후 저장 필요 상태 표시 (DB 저장 전까지)
      setIsSaved?.(false);
      setDirty?.(true);

      // ✅ Master FMEA에 자동 저장
      if (saveToMaster) {
        try {
          const res = await saveMasterDataset({
            fmeaId: fmeaId || '',
            fmeaType: fmeaType || 'P',
            datasetId: masterDatasetId || undefined,
            name: 'MASTER',
            replace: true,
            failureChains: masterChains && masterChains.length > 0 ? masterChains : undefined,
            relationData: rawFingerprintRef.current ? { rawFingerprint: rawFingerprintRef.current } : undefined,
            flatData: importData,
          });

          if (res.ok) {
            if (setMasterDatasetId && res.datasetId) {
              setMasterDatasetId(res.datasetId);
            }
            // ✅ DB 저장 성공 시 저장 완료 상태로 변경
            setIsSaved?.(true);
            setDirty?.(false);
          }
        } catch (dbError) {
          console.error('DB 저장 실패:', dbError);
        }
      }

      setImportSuccess(true);

      setTimeout(() => setImportSuccess(false), 3000);
    } catch (error) {
      console.error('Import 오류:', error);
      alert('Import 중 오류가 발생했습니다.');
    } finally {
      setIsImporting(false);
    }
  };

  return {
    handleFileSelect,
    handleImport,
  };
}
