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
import { assignParentsByRowSpan } from '../utils/parentItemId-mapper';
import { v4 as uuidv4 } from 'uuid';

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

      // ★★★ 2026-02-22: FC_고장사슬 시트 파싱 결과 저장 ★★★
      if (result.failureChains && result.failureChains.length > 0) {
        setMasterChains?.(result.failureChains);

        // ★★★ 2026-03-10: FC 파싱 즉시 DB 저장 — SA확정 전 페이지 이탈 시 pcValue/dcValue 유실 방지 ★★★
        if (fmeaId) {
          fetch(`/api/pfmea/master?fmeaId=${encodeURIComponent(fmeaId)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ failureChains: result.failureChains }),
          }).catch(err => console.error('[FC파싱] chains DB 즉시 저장 실패:', err));
        }
      }

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

      // ★★★ 2026-02-03: 객체 → 문자열 변환 헬퍼 ★★★
      const ensureString = (val: unknown): string => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'string') return val;
        if (typeof val === 'object') {
          if ('name' in (val as Record<string, unknown>)) return String((val as Record<string, unknown>).name || '');
          if (Array.isArray(val)) return val.map(v => ensureString(v)).filter(Boolean).join(', ');
          return '';
        }
        return String(val);
      };

      const flat: ImportedFlatData[] = [];
      // ★★★ UUID 기반 parentItemId 매칭 인프라 (import-builder.ts 패턴 차용) ★★★
      const globalB1IdMap = new Map<string, string>(); // `pNo|m4|weName` → B1 UUID
      /** B1 UUID 조회 — WE명+m4 정확 매칭 → m4 무시 → 공정 첫 번째 B1 폴백 */
      const findB1Uuid = (pNo: string, weName: string | undefined, m4: string): string | undefined => {
        if (weName) {
          const exactKey = `${pNo}|${m4}|${weName}`;
          const exact = globalB1IdMap.get(exactKey);
          if (exact) return exact;
          for (const [k, v] of globalB1IdMap) {
            if (k.startsWith(`${pNo}|`) && k.endsWith(`|${weName}`)) return v;
          }
        }
        for (const [k, v] of globalB1IdMap) {
          if (k.startsWith(`${pNo}|`)) return v;
        }
        return undefined;
      };
      /** 해당 공정의 첫 번째 B1 UUID 조회 */
      const firstB1Uuid = (pNo: string): string | undefined => {
        for (const [k, v] of globalB1IdMap) {
          if (k.startsWith(`${pNo}|`)) return v;
        }
        return undefined;
      };

      result.processes.forEach((p) => {
        const pNo = ensureString(p.processNo);
        if (pNo === '공통') {
          const has = (arr: string[]) => arr.some(v => v.trim() !== '');
          const hasReal = (p.processName?.trim()) || has(p.processDesc) || has(p.productChars)
            || has(p.failureModes) || has(p.workElements)
            || has(p.elementFuncs) || has(p.processChars) || has(p.failureCauses);
          if (!hasReal) return;
        }
        const meta = (code: string, idx: number) => p.itemMeta?.[`${code}-${idx}`];
        const withMeta = (base: ImportedFlatData, code: string, idx: number): ImportedFlatData => {
          const m = meta(code, idx);
          if (!m) return { ...base, orderIndex: idx };
          return { ...base, orderIndex: idx, excelRow: m.excelRow, excelCol: m.excelCol, mergeGroupId: m.mergeGroupId, rowSpan: m.rowSpan };
        };
        flat.push({ id: `${pNo}-A1`, processNo: pNo, category: 'A', itemCode: 'A1', value: pNo, createdAt: new Date() });
        if (p.processName) {
          flat.push({ id: `${pNo}-A2`, processNo: pNo, category: 'A', itemCode: 'A2', value: ensureString(p.processName), createdAt: new Date() });
        }
        p.processDesc.forEach((v, i) => flat.push(withMeta({ id: `${pNo}-A3-${i}`, processNo: pNo, category: 'A', itemCode: 'A3', value: ensureString(v), parentItemId: `${pNo}-A1`, createdAt: new Date() }, 'A3', i)));
        p.productChars.forEach((v, i) => flat.push(withMeta({ id: `${pNo}-A4-${i}`, processNo: pNo, category: 'A', itemCode: 'A4', value: ensureString(v), specialChar: p.productCharsSpecialChar?.[i] || undefined, parentItemId: `${pNo}-A3-0`, createdAt: new Date() }, 'A4', i)));
        p.failureModes.forEach((v, i) => flat.push(withMeta({ id: `${pNo}-A5-${i}`, processNo: pNo, category: 'A', itemCode: 'A5', value: ensureString(v), parentItemId: `${pNo}-A4-0`, createdAt: new Date() }, 'A5', i)));
        // ★★★ 2026-03-16: B1 UUID 기반 — import-builder.ts 패턴 통일 ★★★
        p.workElements.forEach((v, i) => {
          const b1Uuid = uuidv4();
          const weKey = `${pNo}|${p.workElements4M?.[i] || ''}|${ensureString(v)}`;
          globalB1IdMap.set(weKey, b1Uuid);
          flat.push(withMeta({ id: b1Uuid, processNo: pNo, category: 'B', itemCode: 'B1', value: ensureString(v), m4: p.workElements4M?.[i] || '', parentItemId: `${pNo}-A1`, createdAt: new Date() }, 'B1', i));
        });
        // ★★★ 2026-03-16: B2/B3/B4 parentItemId를 B1 UUID로 직접 참조 ★★★
        p.elementFuncs.forEach((v, i) => flat.push(withMeta({ id: `${pNo}-B2-${i}`, processNo: pNo, category: 'B', itemCode: 'B2', value: ensureString(v), m4: p.elementFuncs4M?.[i] || '', belongsTo: p.elementFuncsWE?.[i] || undefined, parentItemId: findB1Uuid(pNo, p.elementFuncsWE?.[i], p.elementFuncs4M?.[i] || ''), createdAt: new Date() }, 'B2', i)));
        p.processChars.forEach((v, i) => flat.push(withMeta({ id: `${pNo}-B3-${i}`, processNo: pNo, category: 'B', itemCode: 'B3', value: ensureString(v), m4: p.processChars4M?.[i] || '', specialChar: p.processCharsSpecialChar?.[i] || undefined, belongsTo: p.processCharsWE?.[i] || undefined, parentItemId: findB1Uuid(pNo, p.processCharsWE?.[i], p.processChars4M?.[i] || ''), createdAt: new Date() }, 'B3', i)));
        p.failureCauses.forEach((v, i) => flat.push(withMeta({ id: `${pNo}-B4-${i}`, processNo: pNo, category: 'B', itemCode: 'B4', value: ensureString(v), m4: p.failureCauses4M?.[i] || '', belongsTo: p.failureCausesWE?.[i] || undefined, parentItemId: findB1Uuid(pNo, p.failureCausesWE?.[i], p.failureCauses4M?.[i] || ''), createdAt: new Date() }, 'B4', i)));
        // ★★★ 2026-03-14 SRP: B5/A6 템플릿 데이터는 FC 체인이 없을 때만 사용 (아래에서 처리) ★★★
        // p.preventionCtrls / p.detectionCtrls → FC 체인 우선, 템플릿은 폴백
      });

      // ★★★ 2026-03-14 v5.4: A6(검출관리) + B5(예방관리) — 소스 우선순위 재설계 ★★★
      // 우선순위: ① 전용시트 L2-6/L3-5 (최우선) → ② FC시트 dcValue/pcValue (폴백) → ③ 추론(inferDC/inferPC)
      // 사유: FC 시트 carry-forward 병합셀 처리가 불안정 → 전용시트가 확실한 소스
      const chains = result.failureChains;

      // ── ① 전용시트 L2-6(A6)/L3-5(B5)에서 추출 (최우선) ──
      const tplB5Processes = new Set<string>();
      const tplA6Processes = new Set<string>();
      {
        let tplB5 = 0;
        result.processes.forEach((p) => {
          const pNo = p.processNo;
          p.preventionCtrls?.forEach((v, i) => {
            if (!ensureString(v).trim()) return;
            const b5m4 = p.preventionCtrls4M?.[i] || '';
            const b5we = p.preventionCtrlsWE?.[i] || '';
            const b1Uuid = findB1Uuid(pNo, b5we, b5m4);
            flat.push({ id: `${pNo}-B5-tpl-${i}`, processNo: pNo, category: 'B', itemCode: 'B5', value: ensureString(v), m4: b5m4, belongsTo: b5we || undefined, parentItemId: b1Uuid || `${pNo}-B4-0`, createdAt: new Date() });
            tplB5++;
            tplB5Processes.add(pNo);
          });
        });
        if (tplB5 > 0) console.log(`[A6/B5 소스] ① 전용시트 B5=${tplB5}건 (최우선)`);
      }
      {
        let tplA6 = 0;
        result.processes.forEach((p) => {
          const pNo = p.processNo;
          p.detectionCtrls?.forEach((v, i) => {
            if (!ensureString(v).trim()) return;
            flat.push({ id: `${pNo}-A6-tpl-${i}`, processNo: pNo, category: 'A', itemCode: 'A6', value: ensureString(v), parentItemId: `${pNo}-A5-0`, createdAt: new Date() });
            tplA6++;
            tplA6Processes.add(pNo);
          });
        });
        if (tplA6 > 0) console.log(`[A6/B5 소스] ① 전용시트 A6=${tplA6}건 (최우선)`);
      }

      // ── ② FC 체인에서 A6/B5 추출 (전용시트 미커버 공정만 보충) ──
      let fcA6Count = 0;
      let fcB5Count = 0;
      if (chains && chains.length > 0) {
        const b5Seen = new Set<string>();
        let b5Idx = 0;
        for (const ch of chains) {
          if (!ch.pcValue?.trim() || !ch.processNo) continue;
          if (tplB5Processes.has(ch.processNo)) continue;  // 전용시트 우선
          const key = `${ch.processNo}|${ch.m4 || ''}|${ch.pcValue.trim()}`;
          if (b5Seen.has(key)) continue;
          b5Seen.add(key);
          flat.push({ id: `${ch.processNo}-B5-fc-${b5Idx}`, processNo: ch.processNo, category: 'B', itemCode: 'B5', value: ch.pcValue.trim(), m4: ch.m4 || '', parentItemId: `${ch.processNo}-B4-0`, createdAt: new Date() });
          b5Idx++;
        }
        fcB5Count = b5Idx;

        const a6Seen = new Set<string>();
        let a6Idx = 0;
        for (const ch of chains) {
          if (!ch.dcValue?.trim() || !ch.processNo) continue;
          if (tplA6Processes.has(ch.processNo)) continue;  // 전용시트 우선
          const a6Key = `${ch.processNo}|${ch.dcValue.trim()}`;
          if (a6Seen.has(a6Key)) continue;
          a6Seen.add(a6Key);
          flat.push({ id: `${ch.processNo}-A6-fc-${a6Idx}`, processNo: ch.processNo, category: 'A', itemCode: 'A6', value: ch.dcValue.trim(), parentItemId: `${ch.processNo}-A5-0`, createdAt: new Date() });
          a6Idx++;
        }
        fcA6Count = a6Idx;
        if (fcA6Count > 0 || fcB5Count > 0) console.log(`[A6/B5 소스] ② FC체인 폴백: A6=${fcA6Count}건, B5=${fcB5Count}건`);
      }

      if (chains && chains.length > 0) {
        // ★★★ 2026-03-02 FIX: B2(요소기능) — B2 시트 데이터 없으면 FC시트 l3Function에서 추출 ★★★
        const existingB2Count = flat.filter(d => d.itemCode === 'B2').length;
        if (existingB2Count === 0) {
          const b2Seen = new Set<string>();
          let b2Idx = 0;
          for (const ch of chains) {
            if (!ch.l3Function?.trim() || !ch.processNo) continue;
            const key = `${ch.processNo}|${ch.m4 || ''}|${ch.l3Function.trim()}`;
            if (b2Seen.has(key)) continue;
            b2Seen.add(key);
            flat.push({ id: `${ch.processNo}-B2-fc-${b2Idx}`, processNo: ch.processNo, category: 'B', itemCode: 'B2', value: ch.l3Function.trim(), m4: ch.m4 || '', belongsTo: ch.workElement || undefined, parentItemId: findB1Uuid(ch.processNo, ch.workElement, ch.m4 || '') || firstB1Uuid(ch.processNo), createdAt: new Date() });
            b2Idx++;
          }
        }

        // ★★★ 2026-03-02 FIX: A3(공정기능) — A3 시트 데이터 없으면 FC시트 l2Function에서 추출 ★★★
        const existingA3Count = flat.filter(d => d.itemCode === 'A3').length;
        if (existingA3Count === 0) {
          const a3Seen = new Set<string>();
          let a3Idx = 0;
          for (const ch of chains) {
            if (!ch.l2Function?.trim() || !ch.processNo) continue;
            const key = `${ch.processNo}|${ch.l2Function.trim()}`;
            if (a3Seen.has(key)) continue;
            a3Seen.add(key);
            flat.push({ id: `${ch.processNo}-A3-fc-${a3Idx}`, processNo: ch.processNo, category: 'A', itemCode: 'A3', value: ch.l2Function.trim(), parentItemId: `${ch.processNo}-A1`, createdAt: new Date() });
            a3Idx++;
          }
        }

        // ★★★ 2026-03-02 FIX: B3(공정특성) — B3 시트 데이터 없으면 FC시트 processChar에서 추출 ★★★
        const existingB3Count = flat.filter(d => d.itemCode === 'B3').length;
        if (existingB3Count === 0) {
          const b3Seen = new Set<string>();
          let b3Idx = 0;
          for (const ch of chains) {
            if (!ch.processChar?.trim() || !ch.processNo) continue;
            const key = `${ch.processNo}|${ch.m4 || ''}|${ch.processChar.trim()}`;
            if (b3Seen.has(key)) continue;
            b3Seen.add(key);
            flat.push({ id: `${ch.processNo}-B3-fc-${b3Idx}`, processNo: ch.processNo, category: 'B', itemCode: 'B3', value: ch.processChar.trim(), m4: ch.m4 || '', parentItemId: findB1Uuid(ch.processNo, ch.workElement, ch.m4 || '') || firstB1Uuid(ch.processNo), createdAt: new Date() });
            b3Idx++;
          }
        }

        // ★★★ 2026-03-15 FIX: A4(제품특성) — 공정별 A4 갭 보충 (전역→공정별 조건) ★★★
        // 이전: existingA4Count === 0 전역 조건 → 일부 공정에 A4 있으면 나머지 보충 안 됨
        // 수정: 공정별로 A4 유무 확인 → 없는 공정만 체인에서 추출
        {
          const a4ProcSet = new Set(
            flat.filter(d => d.itemCode === 'A4' && d.processNo).map(d => d.processNo),
          );
          const a4Seen = new Set<string>();
          let a4Idx = 0;
          for (const ch of chains) {
            if (!ch.productChar?.trim() || !ch.processNo) continue;
            if (a4ProcSet.has(ch.processNo)) continue;
            const key = `${ch.processNo}|${ch.productChar.trim()}`;
            if (a4Seen.has(key)) continue;
            a4Seen.add(key);
            flat.push({ id: `${ch.processNo}-A4-fc-${a4Idx}`, processNo: ch.processNo, category: 'A', itemCode: 'A4', value: ch.productChar.trim(), parentItemId: `${ch.processNo}-A3-0`, createdAt: new Date() });
            a4Idx++;
          }
        }

      }

      // ★★★ 2026-03-17 FIX: B3 중복 제거 — processNo+m4+WE+value 기준 ★★★
      // 이전 키: processNo|m4|value → Ti Target과 Cu Target이 같은 값이면 하나 삭제됨
      // 수정 키: processNo|m4|parentItemId(WE)|value → 다른 WE의 같은 값 보존
      {
        const b3Seen = new Set<string>();
        const toRemove: string[] = [];
        for (const item of flat) {
          if (item.itemCode !== 'B3') continue;
          const we = item.parentItemId || '';
          const key = `${item.processNo}|${item.m4 || ''}|${we}|${(item.value || '').trim()}`;
          if (b3Seen.has(key)) {
            toRemove.push(item.id);
          } else {
            b3Seen.add(key);
          }
        }
        if (toRemove.length > 0) {
          const removeSet = new Set(toRemove);
          const before = flat.length;
          for (let i = flat.length - 1; i >= 0; i--) {
            if (removeSet.has(flat[i].id)) flat.splice(i, 1);
          }
          console.log(`[B3 dedup] ${before - flat.length}건 중복 제거`);
        }
      }

      // ★★★ 2026-03-14 FIX: A6(검출관리) 자동 추론 — 공정별 A6 미존재 시 inferDC(A5) ★★★
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

      // ★★★ 2026-03-14 FIX: B5(예방관리) 자동 추론 — 공정별 B5 미존재 시 inferPC(B4+m4) ★★★
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

      const C1_CATEGORY_MAP: Record<string, string> = {
        'your plant': 'YP', 'ship to plant': 'SP', 'user': 'USER',
        'end user': 'USER', '자사공장': 'YP', '고객사': 'SP', '최종사용자': 'USER',
      };
      function normalizeC1(name: string): string {
        return C1_CATEGORY_MAP[name.toLowerCase()] || name;
      }

      result.products.forEach((p) => {
        const categoryValue = normalizeC1(ensureString(p.productProcessName)) || 'YP';
        const pMeta = (code: string, idx: number) => p.itemMeta?.[`${code}-${idx}`];
        const withPMeta = (base: ImportedFlatData, code: string, idx: number): ImportedFlatData => {
          const m = pMeta(code, idx);
          if (!m) return { ...base, orderIndex: idx };
          // ★ parentItemId: 직접 꽂기 (single-sheet 파서가 기록한 C3→C2 UUID 그대로 사용)
          return { ...base, orderIndex: idx, excelRow: m.excelRow, excelCol: m.excelCol, mergeGroupId: m.mergeGroupId, rowSpan: m.rowSpan, ...(m.parentItemId ? { parentItemId: m.parentItemId } : {}) };
        };
        flat.push({ id: `C1-${categoryValue}`, processNo: categoryValue, category: 'C', itemCode: 'C1', value: categoryValue, createdAt: new Date() });
        p.productFuncs.forEach((v, i) => flat.push(withPMeta({ id: `C2-${categoryValue}-${i}`, processNo: categoryValue, category: 'C', itemCode: 'C2', value: ensureString(v), parentItemId: `C1-${categoryValue}`, createdAt: new Date() }, 'C2', i)));
        // C3/C4 → assignParentsByRowSpan 후처리에서 정확 매핑
        // L1 통합(C1-C4) 파싱결과를 그대로 사용 — 하위갯수 기반 rowSpan 매핑
        // ★★★ 2026-03-16 FIX: 하드코딩 제거 → assignParentsByRowSpan이 rowSpan 기반으로 정확 매핑
        p.requirements.forEach((v, i) => flat.push(withPMeta({ id: `C3-${categoryValue}-${i}`, processNo: categoryValue, category: 'C', itemCode: 'C3', value: ensureString(v), createdAt: new Date() }, 'C3', i)));
        p.failureEffects.forEach((v, i) => flat.push(withPMeta({ id: `C4-${categoryValue}-${i}`, processNo: categoryValue, category: 'C', itemCode: 'C4', value: ensureString(v), createdAt: new Date() }, 'C4', i)));
      });

      // ★★★ 2026-03-16: rowSpan 기반 parentItemId 정확 매핑 ★★★
      // 하드코딩 `-0` 패턴 → excelRow+rowSpan 범위 기반 매핑으로 교체
      // B2/B3/B4→B1은 이미 UUID 기반 (findB1Uuid) — 변경 불필요
      {
        const mapAndApply = (parentCode: string, childCode: string) => {
          const parentItems = flat
            .filter(it => it.itemCode === parentCode)
            .map(it => ({ id: it.id, excelRow: it.excelRow, rowSpan: it.rowSpan, processNo: it.processNo }));
          const childItems = flat
            .filter(it => it.itemCode === childCode)
            .map(it => ({ id: it.id, excelRow: it.excelRow, processNo: it.processNo }));
          if (parentItems.length === 0 || childItems.length === 0) return;
          const mapping = assignParentsByRowSpan(parentItems, childItems);
          if (mapping.size === 0) return;
          for (const item of flat) {
            if (item.itemCode === childCode && mapping.has(item.id)) {
              // C3→C2: 통합시트 텍스트 매핑으로 이미 설정된 parentItemId는 보존
              if (childCode === 'C3' && item.parentItemId) continue;
              item.parentItemId = mapping.get(item.id)!;
            }
          }
        };

        // A-level: A4→A3, A5→A4, A6→A5
        mapAndApply('A3', 'A4');
        mapAndApply('A4', 'A5');
        mapAndApply('A5', 'A6');

        // B-level: B5→B4
        mapAndApply('B4', 'B5');

        // C-level: C3→C2, C4→C3
        mapAndApply('C2', 'C3');
        mapAndApply('C3', 'C4');
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
