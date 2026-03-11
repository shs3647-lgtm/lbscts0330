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
        p.workElements.forEach((v, i) => flat.push(withMeta({ id: `${pNo}-B1-${i}`, processNo: pNo, category: 'B', itemCode: 'B1', value: ensureString(v), m4: p.workElements4M?.[i] || '', parentItemId: `${pNo}-A1`, createdAt: new Date() }, 'B1', i)));
        // ★★★ 2026-03-10: B2/B3 parentItemId를 올바른 B1에 연결 (WE명+m4 기반) ★★★
        // 이전: 항상 B1-0에 고정 → 모든 B2/B3가 첫 번째 WE에 몰려 나머지 WE processChars 빈 상태 → auto-supplement +1
        const findB1Idx = (weName: string | undefined, m4: string): number => {
          if (!weName) return 0;
          for (let j = 0; j < p.workElements.length; j++) {
            if (ensureString(p.workElements[j]) === weName && (p.workElements4M?.[j] || '') === m4) return j;
          }
          // m4 무시 폴백
          for (let j = 0; j < p.workElements.length; j++) {
            if (ensureString(p.workElements[j]) === weName) return j;
          }
          return 0;
        };
        p.elementFuncs.forEach((v, i) => flat.push(withMeta({ id: `${pNo}-B2-${i}`, processNo: pNo, category: 'B', itemCode: 'B2', value: ensureString(v), m4: p.elementFuncs4M?.[i] || '', belongsTo: p.elementFuncsWE?.[i] || undefined, parentItemId: `${pNo}-B1-${findB1Idx(p.elementFuncsWE?.[i], p.elementFuncs4M?.[i] || '')}`, createdAt: new Date() }, 'B2', i)));
        p.processChars.forEach((v, i) => flat.push(withMeta({ id: `${pNo}-B3-${i}`, processNo: pNo, category: 'B', itemCode: 'B3', value: ensureString(v), m4: p.processChars4M?.[i] || '', specialChar: p.processCharsSpecialChar?.[i] || undefined, belongsTo: p.processCharsWE?.[i] || undefined, parentItemId: `${pNo}-B1-${findB1Idx(p.processCharsWE?.[i], p.processChars4M?.[i] || '')}`, createdAt: new Date() }, 'B3', i)));
        p.failureCauses.forEach((v, i) => flat.push(withMeta({ id: `${pNo}-B4-${i}`, processNo: pNo, category: 'B', itemCode: 'B4', value: ensureString(v), m4: p.failureCauses4M?.[i] || '', parentItemId: `${pNo}-B3-0`, createdAt: new Date() }, 'B4', i)));
      });

      // ★★★ B5(예방관리) + A6(검출관리) — FC 시트 failureChains에서 추출 ★★★
      // ★★★ 2026-03-02 FIX: dedup 키에 값 포함 — 같은 공정에 다른 PC/DC 값 보존 ★★★
      const chains = result.failureChains;
      if (chains && chains.length > 0) {
        // B5: FC별 예방관리 (processNo + m4 + pcValue 기준 unique)
        const b5Seen = new Set<string>();
        let b5Idx = 0;
        for (const ch of chains) {
          if (!ch.pcValue?.trim() || !ch.processNo) continue;
          const key = `${ch.processNo}|${ch.m4 || ''}|${ch.pcValue.trim()}`;
          if (b5Seen.has(key)) continue;
          b5Seen.add(key);
          flat.push({ id: `${ch.processNo}-B5-${b5Idx}`, processNo: ch.processNo, category: 'B', itemCode: 'B5', value: ch.pcValue.trim(), m4: ch.m4 || '', parentItemId: `${ch.processNo}-B4-0`, createdAt: new Date() });
          b5Idx++;
        }
        // A6: 공정별 검출관리 (processNo + dcValue 기준 unique)
        const a6Seen = new Set<string>();
        let a6Idx = 0;
        for (const ch of chains) {
          if (!ch.dcValue?.trim() || !ch.processNo) continue;
          const a6Key = `${ch.processNo}|${ch.dcValue.trim()}`;
          if (a6Seen.has(a6Key)) continue;
          a6Seen.add(a6Key);
          flat.push({ id: `${ch.processNo}-A6-${a6Idx}`, processNo: ch.processNo, category: 'A', itemCode: 'A6', value: ch.dcValue.trim(), parentItemId: `${ch.processNo}-A5-0`, createdAt: new Date() });
          a6Idx++;
        }
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
            flat.push({ id: `${ch.processNo}-B2-fc-${b2Idx}`, processNo: ch.processNo, category: 'B', itemCode: 'B2', value: ch.l3Function.trim(), m4: ch.m4 || '', belongsTo: ch.workElement || undefined, parentItemId: `${ch.processNo}-B1-0`, createdAt: new Date() });
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
            flat.push({ id: `${ch.processNo}-B3-fc-${b3Idx}`, processNo: ch.processNo, category: 'B', itemCode: 'B3', value: ch.processChar.trim(), m4: ch.m4 || '', parentItemId: `${ch.processNo}-B2-0`, createdAt: new Date() });
            b3Idx++;
          }
        }

        // ★★★ 2026-03-02 FIX: A4(제품특성) — A4 시트 데이터 없으면 FC시트 productChar에서 추출 ★★★
        const existingA4Count = flat.filter(d => d.itemCode === 'A4').length;
        if (existingA4Count === 0) {
          const a4Seen = new Set<string>();
          let a4Idx = 0;
          for (const ch of chains) {
            if (!ch.productChar?.trim() || !ch.processNo) continue;
            const key = `${ch.processNo}|${ch.productChar.trim()}`;
            if (a4Seen.has(key)) continue;
            a4Seen.add(key);
            flat.push({ id: `${ch.processNo}-A4-fc-${a4Idx}`, processNo: ch.processNo, category: 'A', itemCode: 'A4', value: ch.productChar.trim(), parentItemId: `${ch.processNo}-A3-0`, createdAt: new Date() });
            a4Idx++;
          }
        }

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
          return { ...base, orderIndex: idx, excelRow: m.excelRow, excelCol: m.excelCol, mergeGroupId: m.mergeGroupId, rowSpan: m.rowSpan };
        };
        flat.push({ id: `C1-${categoryValue}`, processNo: categoryValue, category: 'C', itemCode: 'C1', value: categoryValue, createdAt: new Date() });
        p.productFuncs.forEach((v, i) => flat.push(withPMeta({ id: `C2-${categoryValue}-${i}`, processNo: categoryValue, category: 'C', itemCode: 'C2', value: ensureString(v), parentItemId: `C1-${categoryValue}`, createdAt: new Date() }, 'C2', i)));
        p.requirements.forEach((v, i) => flat.push(withPMeta({ id: `C3-${categoryValue}-${i}`, processNo: categoryValue, category: 'C', itemCode: 'C3', value: ensureString(v), parentItemId: `C2-${categoryValue}-0`, createdAt: new Date() }, 'C3', i)));
        p.failureEffects.forEach((v, i) => flat.push(withPMeta({ id: `C4-${categoryValue}-${i}`, processNo: categoryValue, category: 'C', itemCode: 'C4', value: ensureString(v), parentItemId: `C3-${categoryValue}-0`, createdAt: new Date() }, 'C4', i)));
      });

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

  /** 비즈니스 키 생성 - B1~B4 전체 m4 포함, B3는 belongsTo(작업요소) 추가 (2026-03-03) */
  const getBusinessKey = (d: ImportedFlatData): string => {
    if (['B1', 'B2', 'B4', 'B5'].includes(d.itemCode) && d.m4) {
      return `${d.processNo}|${d.itemCode}|${d.m4}|${d.value}`;
    }
    // ★★★ 2026-03-03: B3 dedup 키에 belongsTo(작업요소 참조) 추가 ★★★
    // 같은 공정/m4에서 다른 B1 작업요소가 동일한 B3 공정특성을 가질 수 있음
    // 예: 120/MC에서 "에어 압력"이 3개 다른 JIG에 적용 → 별도 항목으로 유지
    if (d.itemCode === 'B3' && d.m4) {
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
          importData.push({
            ...existing,
            m4: newItem.m4 || existing.m4,
            specialChar: newItem.specialChar || existing.specialChar || undefined,
            belongsTo: newItem.belongsTo || existing.belongsTo || undefined,
            id: existing.id,
            createdAt: new Date(),
          });
        } else {
          // 신규 항목
          importData.push({ ...newItem, createdAt: new Date() });
        }
      });

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
