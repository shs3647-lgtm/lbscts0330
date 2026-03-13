/**
 * @file syncPfmeaCP.ts
 * @description PFMEA ↔ Control Plan 쌍방향 동기화 로직
 * @modified 2026-02-23 분리배치 적용 — 서버 API(create-cp, sync-to-cp/all)와 동일 패턴
 *
 * ============================================================================
 * 연동 규칙 (FMEA ↔ CP/PFD) - 2026-02-01 CODE FREEZE
 * ============================================================================
 *
 * ★★★ 1L 기능분석 연동 규칙 ★★★
 * -----------------------------------------------------------------------------
 * | 필드           | FMEA → CP/PFD | CP/PFD → FMEA | 비고                    |
 * |----------------|---------------|---------------|-------------------------|
 * | 완제품공정명   | ✅ 연동        | ✅ 연동        | 품명 + 생산공정         |
 * | 구분(YP/SP/EU) | ❌ 연동 없음   | ❌ 연동 없음   | FMEA 자체 입력         |
 * | 완제품기능     | ❌ 연동 없음   | ❌ 연동 없음   | FMEA 자체 입력         |
 * | 요구사항       | ❌ 연동 없음   | ❌ 연동 없음   | FMEA 자체 입력         |
 * -----------------------------------------------------------------------------
 *
 * ★★★ 2L 기능분석 연동 규칙 ★★★
 * -----------------------------------------------------------------------------
 * | 필드           | FMEA → CP/PFD | CP/PFD → FMEA | 비고                    |
 * |----------------|---------------|---------------|-------------------------|
 * | 완제품공정명   | ✅ 연동        | ✅ 연동        | L2.no + L2.name         |
 * | 메인공정기능   | ✅ 연동        | ✅ 연동        | L2.functions            |
 * | 제품특성       | ✅ 연동        | ✅ 연동        | L2.functions.productChars|
 * | 특별특성       | ✅ 연동        | ✅ 연동        | specialChar             |
 * -----------------------------------------------------------------------------
 *
 * ★★★ 3L 연동 규칙 ★★★
 * -----------------------------------------------------------------------------
 * - 작업요소: PFMEA L3 [4M + 작업요소명] ↔ CP workElement ↔ 양방향
 * - 공정특성: PFMEA L3.functions.processChars ↔ CP processChar ↔ 양방향
 * - 관리방법: PFMEA prevention/detection ↔ CP controlMethod ↔ 양방향
 *
 * ⚠️ 4M 필터링 규칙:
 * - MC (Machine): CP 연동 ✅
 * - IM (Inspection/Measurement): CP 연동 ✅
 * - EN (Environment): CP 연동 ✅
 * - MN (Man): CP 연동 ❌ (제외)
 *
 * ★★★ 분리배치 원칙 (PRD v2.0 §2.3) ★★★
 * - 같은 행에 제품특성(J열) + 공정특성(K열) 동시 배치 절대 금지
 * - 제품특성 행과 공정특성 행은 별도 행으로 분리
 * - 표시 순서: 같은 공정 내에서 제품특성 행 → 공정특성 행
 * - 대응계획 기본값: 제품='재작업 또는 폐기', 공정='조건조정'
 */

// CP 연동 대상 4M 코드 (MN 제외)
const CP_SYNC_4M_CODES = ['MC', 'IM', 'EN'];

import { WorksheetState } from '../../constants';
import { CPRow, createEmptyCPRow } from '../../types/controlPlan';

// 동기화 결과
export interface SyncResult {
  success: boolean;
  cpRowsUpdated: number;
  pfmeaRowsUpdated: number;
  newCpRows: number;
  message: string;
}

/** 4M 정규화 결과 — normalized(필터링용) + original(표시용) */
interface M4Result {
  normalized: string;
  original: string;
}

/** 4M 정규화: MD/JG → MC (normalized), 원본 보존 (original) */
function normalizeM4WithOriginal(raw: string): M4Result {
  const original = (raw || '').trim().toUpperCase();
  if (!original) return { normalized: '', original: '' };
  if (original === 'MD' || original === 'JG') return { normalized: 'MC', original };
  if (['MC', 'MN', 'IM', 'EN'].includes(original)) return { normalized: original, original };
  return { normalized: '', original };
}

/**
 * PFMEA → CP 동기화 (분리배치 적용 — 서버 API와 동일 패턴)
 *
 * Phase A: 제품특성 행 (L2.functions[].productChars) — 공정 수준, L3 없음
 * Phase B: 공정특성 행 (L3.functions[].processChars) — L3 작업요소 수준
 * Phase C: 구조 행 (L3에 공정특성 없는 경우) — 설비/구조만
 * Fallback: 아무 행도 없으면 공정 구조만 행
 */
export function syncPfmeaToCP(state: WorksheetState): { cpRows: CPRow[]; result: SyncResult } {
  const cpRows: CPRow[] = [];
  let newRows = 0;
  const riskData = (state.riskData || {}) as Record<string, unknown>;

  // P0-2: riskData → refS/O/D/AP + prevention/detection 룩업 구축
  const riskByL2L3 = new Map<string, {
    refSeverity?: number; refOccurrence?: number; refDetection?: number; refAp?: string;
    prevention?: string; detection?: string;
  }>();
  const riskByL2 = new Map<string, { maxSeverity?: number }>();
  {
    let flatIdx = 0;
    ((state.l2 || []) as unknown as Record<string, unknown>[]).forEach((proc) => {
      let l2MaxS: number | undefined;
      const l3Items = (proc.l3 as Record<string, unknown>[]) || [];
      l3Items.forEach((l3) => {
        const s = parseInt(String(riskData[`severity-${flatIdx}`] || '')) || undefined;
        const o = parseInt(String(riskData[`occurrence-${flatIdx}`] || '')) || undefined;
        const d = parseInt(String(riskData[`detection-${flatIdx}`] || '')) || undefined;
        const ap = riskData[`ap-${flatIdx}`] ? String(riskData[`ap-${flatIdx}`]) : undefined;
        const prev = riskData[`prevention-${flatIdx}`] ? String(riskData[`prevention-${flatIdx}`]) : undefined;
        const det = riskData[`detection-${flatIdx}`] ? String(riskData[`detection-${flatIdx}`]) : undefined;
        if (s || o || d || ap || prev || det) {
          riskByL2L3.set(`${proc.id}|${l3.id}`, {
            refSeverity: s, refOccurrence: o, refDetection: d, refAp: ap,
            prevention: prev, detection: det,
          });
        }
        if (s && (!l2MaxS || s > l2MaxS)) l2MaxS = s;
        flatIdx++;
      });
      if (l2MaxS) riskByL2.set(String(proc.id), { maxSeverity: l2MaxS });
    });
  }

  // 기존 CP 행들 (복합키 맵 — rowType+processNo+char로 매칭)
  const existingCpRows = new Map<string, CPRow>();
  (((state as unknown as Record<string, unknown>).cpRows as CPRow[]) || []).forEach((row: CPRow) => {
    // 제품특성 행: processNo + productChar
    if (row.productChar) {
      existingCpRows.set(`product|${row.processNo}|${row.productChar}`, row);
    }
    // 공정특성 행: processNo + workElement + processChar
    if (row.processChar) {
      existingCpRows.set(`process|${row.processNo}|${row.workElement}|${row.processChar}`, row);
    }
    // 구조 행: processNo + workElement
    if (!row.productChar && !row.processChar && row.workElement) {
      existingCpRows.set(`structure|${row.processNo}|${row.workElement}`, row);
    }
  });

  // L2 공정 순회
  ((state.l2 || []) as unknown as Record<string, unknown>[]).forEach((proc: Record<string, unknown>) => {
    if (!proc.name || String(proc.name).includes('클릭')) return;

    const processNo = String(proc.no || '');
    const processName = String(proc.name);
    const rawFunctions = (proc.functions as Record<string, unknown>[]) || [];
    const l3Items = (proc.l3 as Record<string, unknown>[]) || [];

    // 공정설명(D열) = L2 메인공정 기능
    const filteredFuncNames = rawFunctions
      .map((f: Record<string, unknown>) => String(f.name || ''))
      .filter((n: string) => n && !n.includes('클릭') && !n.includes('자동생성') && !n.includes('추가'));
    const processDesc = filteredFuncNames.join(', ');

    const l2StartCount = cpRows.length;
    let charIndex = 0;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Phase A: 제품특성 행 (L2.functions[].productChars)
    // ★ 분리배치: 제품특성만 담은 별도 행
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const productCharDedup = new Set<string>();
    for (const func of rawFunctions) {
      const productChars = (func.productChars as Record<string, unknown>[]) || [];
      for (const pc of productChars) {
        const pcName = String(pc.name || '').trim();
        if (!pcName || pcName.includes('클릭')) continue;
        if (productCharDedup.has(pcName)) continue;
        productCharDedup.add(pcName);

        const existKey = `product|${processNo}|${pcName}`;
        const existing = existingCpRows.get(existKey);
        const cpRow: CPRow = existing ? { ...existing } : createEmptyCPRow(processNo, processName);

        cpRow.pfmeaProcessId = String(proc.id);
        cpRow.processNo = processNo;
        cpRow.processName = processName;
        cpRow.processDesc = processDesc;
        cpRow.workElement = '';             // 제품특성은 L2 수준
        cpRow.productChar = pcName;
        cpRow.processChar = '';             // ★ 분리배치: 공정특성 없음
        cpRow.specialChar = String(pc.specialChar || '').trim();
        cpRow.itemNo = String(++charIndex);
        cpRow.syncStatus = existing ? 'synced' : 'new';
        cpRow.lastSyncAt = new Date().toISOString();
        // P0-2: 제품특성 행 → L2 최대 심각도
        const l2RiskRef = riskByL2.get(String(proc.id));
        if (l2RiskRef?.maxSeverity) cpRow.refSeverity = l2RiskRef.maxSeverity;

        if (!existing) newRows++;
        cpRows.push(cpRow);
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Phase B: 공정특성 행 (L3 작업요소별)
    // ★ MN(사람) 제외, 분리배치: 공정특성만 담은 별도 행
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const validL3Elements = l3Items.filter((l3: Record<string, unknown>) => {
      const name = String(l3.name || '').trim();
      if (name.startsWith('00 ')) return false;
      if (/^\d+\s+00\s/.test(name)) return false;
      return name.length > 0;
    });

    const processCharDedup = new Set<string>();

    for (const l3 of validL3Elements) {
      const m4Result = normalizeM4WithOriginal(String(l3.m4 || l3.fourM || ''));
      if (m4Result.normalized === 'MN') continue;

      const workElementName = String(l3.name || '').trim();
      const equipment = workElementName;  // ★ 설비명만 표시 (4M 프리픽스 제거)

      // L3에서 공정특성 수집
      const l3ProcessChars: Array<{ name: string; specialChar: string }> = [];

      // 1. L3.functions[].processChars (신규 구조)
      const l3Functions = (l3.functions as Record<string, unknown>[]) || [];
      for (const l3Func of l3Functions) {
        const processCharsArr = (l3Func.processChars as Record<string, unknown>[]) || [];
        for (const pchar of processCharsArr) {
          const pcharName = String(pchar.name || '').trim();
          if (pcharName && !pcharName.includes('클릭')) {
            l3ProcessChars.push({
              name: pcharName,
              specialChar: String(pchar.specialChar || '').trim(),
            });
          }
        }
      }

      // 2. l3.processChars 폴백 (하위호환)
      if (l3ProcessChars.length === 0) {
        const fallbackChars = (l3.processChars as Record<string, unknown>[]) || [];
        for (const pchar of fallbackChars) {
          const pcharName = String(pchar.name || '').trim();
          if (pcharName && !pcharName.includes('클릭')) {
            l3ProcessChars.push({
              name: pcharName,
              specialChar: String(pchar.specialChar || '').trim(),
            });
          }
        }
      }

      if (l3ProcessChars.length > 0) {
        for (const procChar of l3ProcessChars) {
          const dedupKey = `${processNo}|${workElementName}|${procChar.name}`;
          if (processCharDedup.has(dedupKey)) continue;
          processCharDedup.add(dedupKey);

          const existKey = `process|${processNo}|${equipment}|${procChar.name}`;
          const existing = existingCpRows.get(existKey);
          const cpRow: CPRow = existing ? { ...existing } : createEmptyCPRow(processNo, processName);

          cpRow.pfmeaProcessId = String(proc.id);
          cpRow.pfmeaWorkElemId = String(l3.id);
          cpRow.processNo = processNo;
          cpRow.processName = processName;
          cpRow.processDesc = processDesc;
          cpRow.workElement = equipment;
          cpRow.equipmentM4 = m4Result.original;  // ★ 원본 4M 코드 보존
          cpRow.productChar = '';             // ★ 분리배치: 제품특성 없음
          cpRow.processChar = procChar.name;
          cpRow.specialChar = procChar.specialChar;
          cpRow.itemNo = String(++charIndex);
          cpRow.syncStatus = existing ? 'synced' : 'new';
          cpRow.lastSyncAt = new Date().toISOString();
          // P0-2: 공정특성 행 → L3 S/O/D/AP + PC/DC 직접 연동
          const l3RiskRef = riskByL2L3.get(`${proc.id}|${l3.id}`);
          if (l3RiskRef) {
            if (l3RiskRef.refSeverity) cpRow.refSeverity = l3RiskRef.refSeverity;
            if (l3RiskRef.refOccurrence) cpRow.refOccurrence = l3RiskRef.refOccurrence;
            if (l3RiskRef.refDetection) cpRow.refDetection = l3RiskRef.refDetection;
            if (l3RiskRef.refAp) cpRow.refAp = l3RiskRef.refAp;
            // ★ PFMEA→CP: B5 예방관리 → CP controlMethod, A6 검출관리 → CP measureMethod
            if (l3RiskRef.prevention && !cpRow.controlMethod) {
              cpRow.controlMethod = l3RiskRef.prevention;
            }
            if (l3RiskRef.detection && !cpRow.measureMethod) {
              cpRow.measureMethod = l3RiskRef.detection;
            }
          }

          if (!existing) newRows++;
          cpRows.push(cpRow);
        }
      } else {
        // L3에 공정특성 없음 → 설비/구조만 행 생성
        const existKey = `structure|${processNo}|${equipment}`;
        const existing = existingCpRows.get(existKey);
        const cpRow: CPRow = existing ? { ...existing } : createEmptyCPRow(processNo, processName);

        cpRow.pfmeaProcessId = String(proc.id);
        cpRow.pfmeaWorkElemId = String(l3.id);
        cpRow.processNo = processNo;
        cpRow.processName = processName;
        cpRow.processDesc = processDesc;
        cpRow.workElement = equipment;
        cpRow.equipmentM4 = m4Result.original;  // ★ 원본 4M 코드 보존
        cpRow.productChar = '';
        cpRow.processChar = '';
        cpRow.itemNo = String(++charIndex);
        cpRow.syncStatus = existing ? 'synced' : 'new';
        cpRow.lastSyncAt = new Date().toISOString();

        if (!existing) newRows++;
        cpRows.push(cpRow);
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Fallback: 이 L2에서 아무 행도 생성되지 않았으면 구조만 행
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (cpRows.length === l2StartCount) {
      const cpRow = createEmptyCPRow(processNo, processName);
      cpRow.pfmeaProcessId = String(proc.id);
      cpRow.processDesc = processDesc;
      cpRow.itemNo = String(++charIndex);
      cpRow.syncStatus = 'new';
      cpRow.lastSyncAt = new Date().toISOString();
      newRows++;
      cpRows.push(cpRow);
    }
  });

  return {
    cpRows,
    result: {
      success: true,
      cpRowsUpdated: cpRows.length - newRows,
      pfmeaRowsUpdated: 0,
      newCpRows: newRows,
      message: `PFMEA → CP 분리배치 동기화 완료: ${cpRows.length}건 (신규 ${newRows}건)`
    }
  };
}

/**
 * CP → PFMEA 동기화 (CP에서 수정된 내용을 PFMEA에 반영)
 */
export function syncCPToPfmea(
  state: WorksheetState,
  cpRows: CPRow[]
): { updatedState: Partial<WorksheetState>; result: SyncResult } {
  const riskData = { ...(state.riskData || {}) };
  let updatedCount = 0;

  // CP 행을 PFMEA 인덱스에 매핑 (MC, IM, EN만 - MN 제외)
  let rowIndex = 0;

  ((state.l2 || []) as unknown as Record<string, unknown>[]).forEach((proc: Record<string, unknown>) => {
    if (!proc.name || String(proc.name).includes('클릭')) return;

    const l3Items = (proc.l3 as Record<string, unknown>[]) || [];
    l3Items.forEach((we: Record<string, unknown>) => {
      if (!we.name || String(we.name).includes('클릭') || String(we.name).includes('추가')) return;

      const m4 = String(we.m4 || we.fourM || '');
      // MN 제외 - MC, IM, EN만 처리
      if (m4 && !CP_SYNC_4M_CODES.includes(m4)) return;

      // 해당 CP 행 찾기 (분리배치 → 같은 L3에 여러 CP 행이 있을 수 있음)
      const matchedCpRows = cpRows.filter(r =>
        r.pfmeaProcessId === proc.id && r.pfmeaWorkElemId === we.id
      );

      for (const cpRow of matchedCpRows) {
        if (cpRow.syncStatus !== 'modified') continue;

        // 특별특성 동기화
        if (cpRow.specialChar) {
          riskData[`specialChar-${rowIndex}`] = cpRow.specialChar;
        }

        // ★ EP → 예방관리(PC) 연동
        if (cpRow.ep) {
          const existingPrevention = String(riskData[`prevention-${rowIndex}`] || '');
          if (!existingPrevention.includes('Poka-Yoke') && !existingPrevention.includes('Error Proof')) {
            riskData[`prevention-${rowIndex}`] = existingPrevention
              ? `${existingPrevention}, Poka-Yoke`
              : 'Poka-Yoke';
          }
        }

        // ★ 자동검사 → 검출관리(DC) 연동
        if (cpRow.autoInspect) {
          const existingDetection = String(riskData[`detection-${rowIndex}`] || '');
          if (!existingDetection.includes('자동검사')) {
            riskData[`detection-${rowIndex}`] = existingDetection
              ? `${existingDetection}, 자동검사`
              : '자동검사';
          }
        }

        // 관리방법 → 예방관리/검출관리 분리
        if (cpRow.controlMethod) {
          const parts = cpRow.controlMethod.split('/').map(s => s.trim());
          if (parts[0]) riskData[`prevention-${rowIndex}`] = parts[0];
          if (parts[1]) riskData[`detection-${rowIndex}`] = parts[1];
        }

        updatedCount++;
      }

      rowIndex++;
    });
  });

  return {
    updatedState: { riskData },
    result: {
      success: true,
      cpRowsUpdated: 0,
      pfmeaRowsUpdated: updatedCount,
      newCpRows: 0,
      message: `CP → PFMEA 동기화 완료: ${updatedCount}건 업데이트`
    }
  };
}

/**
 * 양방향 동기화 (변경된 쪽 → 다른 쪽 반영)
 */
export function syncBidirectional(
  state: WorksheetState,
  cpRows: CPRow[]
): {
  updatedState: Partial<WorksheetState>;
  updatedCpRows: CPRow[];
  result: SyncResult
} {
  // 1. PFMEA에서 수정된 항목 → CP 반영
  const { cpRows: syncedFromPfmea, result: pfmeaResult } = syncPfmeaToCP(state);

  // 2. CP에서 수정된 항목 → PFMEA 반영
  const modifiedCpRows = cpRows.filter(r => r.syncStatus === 'modified');
  let pfmeaUpdated = 0;
  const riskData = { ...(state.riskData || {}) };

  if (modifiedCpRows.length > 0) {
    const cpResult = syncCPToPfmea(state, modifiedCpRows);
    Object.assign(riskData, cpResult.updatedState.riskData);
    pfmeaUpdated = cpResult.result.pfmeaRowsUpdated;
  }

  // 3. 모든 행의 동기화 상태를 'synced'로 변경
  const finalCpRows = syncedFromPfmea.map(row => ({
    ...row,
    syncStatus: 'synced' as const,
    lastSyncAt: new Date().toISOString()
  }));

  return {
    updatedState: { riskData },
    updatedCpRows: finalCpRows,
    result: {
      success: true,
      cpRowsUpdated: pfmeaResult.cpRowsUpdated + pfmeaResult.newCpRows,
      pfmeaRowsUpdated: pfmeaUpdated,
      newCpRows: pfmeaResult.newCpRows,
      message: `양방향 동기화 완료: CP ${syncedFromPfmea.length}건, PFMEA ${pfmeaUpdated}건 업데이트`
    }
  };
}

/**
 * 동기화 상태 확인
 * ★ 분리배치 적용: PFMEA 행 수 = 제품특성 수 + 공정특성 수 + 구조 수
 */
export function checkSyncStatus(state: WorksheetState, cpRows: CPRow[]): {
  inSync: boolean;
  pfmeaCount: number;
  cpCount: number;
  diff: number;
} {
  // PFMEA 예상 CP 행 수 계산 (분리배치 기준)
  let pfmeaCount = 0;

  ((state.l2 || []) as unknown as Record<string, unknown>[]).forEach((proc: Record<string, unknown>) => {
    if (!proc.name || String(proc.name).includes('클릭')) return;

    const rawFunctions = (proc.functions as Record<string, unknown>[]) || [];
    const l3Items = (proc.l3 as Record<string, unknown>[]) || [];
    let procRowCount = 0;

    // Phase A: 제품특성 수
    const productCharDedup = new Set<string>();
    for (const func of rawFunctions) {
      const productChars = (func.productChars as Record<string, unknown>[]) || [];
      for (const pc of productChars) {
        const pcName = String(pc.name || '').trim();
        if (pcName && !pcName.includes('클릭') && !productCharDedup.has(pcName)) {
          productCharDedup.add(pcName);
          procRowCount++;
        }
      }
    }

    // Phase B: 공정특성 수 (non-MN L3만)
    const processCharDedup = new Set<string>();
    for (const l3 of l3Items) {
      const name = String(l3.name || '').trim();
      if (!name || name.startsWith('00 ')) continue;

      const m4Check = normalizeM4WithOriginal(String(l3.m4 || l3.fourM || ''));
      if (m4Check.normalized === 'MN') continue;

      let hasProcessChar = false;
      const l3Functions = (l3.functions as Record<string, unknown>[]) || [];
      for (const l3Func of l3Functions) {
        const processCharsArr = (l3Func.processChars as Record<string, unknown>[]) || [];
        for (const pchar of processCharsArr) {
          const pcharName = String(pchar.name || '').trim();
          const dedupKey = `${proc.no}|${name}|${pcharName}`;
          if (pcharName && !pcharName.includes('클릭') && !processCharDedup.has(dedupKey)) {
            processCharDedup.add(dedupKey);
            procRowCount++;
            hasProcessChar = true;
          }
        }
      }

      // 폴백: l3.processChars
      if (!hasProcessChar) {
        const fallbackChars = (l3.processChars as Record<string, unknown>[]) || [];
        for (const pchar of fallbackChars) {
          const pcharName = String(pchar.name || '').trim();
          const dedupKey = `${proc.no}|${name}|${pcharName}`;
          if (pcharName && !pcharName.includes('클릭') && !processCharDedup.has(dedupKey)) {
            processCharDedup.add(dedupKey);
            procRowCount++;
            hasProcessChar = true;
          }
        }
      }

      // 공정특성 없으면 구조 행
      if (!hasProcessChar) {
        procRowCount++;
      }
    }

    // Fallback: 아무 행도 없으면 1행
    if (procRowCount === 0) procRowCount = 1;
    pfmeaCount += procRowCount;
  });

  const cpCount = cpRows.length;
  const diff = Math.abs(pfmeaCount - cpCount);

  return {
    inSync: diff === 0 && cpRows.every(r => r.syncStatus === 'synced'),
    pfmeaCount,
    cpCount,
    diff
  };
}
