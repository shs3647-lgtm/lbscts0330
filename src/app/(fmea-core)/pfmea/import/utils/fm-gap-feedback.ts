/**
 * @file fm-gap-feedback.ts
 * @description FMEA 전체 요소 갭 피드백 루프 — buildWorksheetState 후처리
 *
 * buildWorksheetState 결과(WorksheetState)와 원본 flatData를 비교하여
 * 워크시트에서 추가/변경된 모든 FMEA 요소를 감지하고 flatData에 반영한다.
 *
 * 비유: 재고 실사 — 장부(flatData)와 실물(wsState)을 비교하여
 * 차이를 발견하면 장부를 실물에 맞춰 업데이트한다.
 *
 * 대상 항목코드 (14종):
 *   A계: A2(공정명), A3(공정기능), A4(제품특성), A5(고장형태)
 *   B계: B1(작업요소), B2(요소기능), B3(공정특성), B4(고장원인)
 *   C계: C1(구분), C2(완제품기능), C3(요구사항), C4(고장영향)
 *
 * @created 2026-03-05
 */

import type { ImportedFlatData } from '../types';
import type {
  WorksheetState,
  Process,
  L1Data,
} from '@/app/(fmea-core)/pfmea/worksheet/constants';

// ── 타입 정의 ──

export interface FmGapInfo {
  processNo: string;
  processName: string;
  itemCode: string;
  /** flatData 기준 건수 */
  importCount: number;
  /** wsState 기준 건수 */
  wsCount: number;
  /** 갭 (양수=추가) */
  gap: number;
  /** 추가된 항목값 */
  addedValues: string[];
}

export interface FmGapFeedbackResult {
  /** flatData에 추가할 항목들 */
  additionalItems: ImportedFlatData[];
  /** 항목코드별 갭 상세 */
  gaps: FmGapInfo[];
  /** 총 추가 건수 */
  totalAdded: number;
  /** 요약 문자열 */
  summary: string;
}

// ── 유틸리티 ──

let uidCounter = 0;
function simpleUid(): string {
  return `fb-${Date.now().toString(36)}-${(uidCounter++).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function norm(s: string): string {
  return (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// ── 메인 함수 ──

export function applyFmGapFeedback(
  wsState: WorksheetState,
  originalFlatData: ImportedFlatData[],
): FmGapFeedbackResult {
  const additionalItems: ImportedFlatData[] = [];
  const gaps: FmGapInfo[] = [];
  const now = new Date();

  // ── 1. 원본 flatData에서 항목코드별 값 수집 ──
  const importSets: Record<string, Map<string, Set<string>>> = {};
  const ALL_CODES = ['A2', 'A3', 'A4', 'A5', 'B1', 'B2', 'B3', 'B4', 'C1', 'C2', 'C3', 'C4'];
  for (const code of ALL_CODES) {
    importSets[code] = collectImportValues(originalFlatData, code);
  }

  // ── 2. wsState에서 실제 값 수집 ──
  const wsValues = collectAllWsValues(wsState);

  // ── 3. 갭 감지 + 추가 항목 생성 ──
  for (const code of ALL_CODES) {
    const category = code.charAt(0) as 'A' | 'B' | 'C';
    const wsMap = wsValues[code] || new Map<string, string[]>();
    const importMap = importSets[code];

    for (const [processNo, wsItems] of wsMap.entries()) {
      const importSet = importMap.get(processNo) || new Set<string>();
      const added: string[] = [];

      for (const val of wsItems) {
        if (!val) continue;
        if (!importSet.has(norm(val))) {
          added.push(val);
          additionalItems.push({
            id: simpleUid(),
            processNo,
            category,
            itemCode: code,
            value: val,
            createdAt: now,
          });
        }
      }

      if (added.length > 0) {
        gaps.push({
          processNo,
          processName: getProcessName(wsState, processNo),
          itemCode: code,
          importCount: importSet.size,
          wsCount: wsItems.length,
          gap: added.length,
          addedValues: added,
        });
      }
    }
  }

  // ── 4. 요약 ──
  const totalAdded = additionalItems.length;
  const byCode: Record<string, number> = {};
  for (const g of gaps) {
    byCode[g.itemCode] = (byCode[g.itemCode] || 0) + g.gap;
  }

  const LABELS: Record<string, string> = {
    A2: '공정명', A3: '공정기능', A4: '제품특성', A5: 'FM',
    B1: '작업요소', B2: '요소기능', B3: '공정특성', B4: 'FC',
    C1: '구분', C2: '완제품기능', C3: '요구사항', C4: 'FE',
  };

  const parts = Object.entries(byCode)
    .filter(([, count]) => count > 0)
    .map(([code, count]) => `${LABELS[code] || code}+${count}`);

  const summary = totalAdded > 0
    ? `피드백: ${parts.join(', ')} (총 ${totalAdded}건 기초정보 보강)`
    : '피드백: 갭 없음 (Import = Worksheet 일치)';

  return { additionalItems, gaps, totalAdded, summary };
}

// ── 헬퍼: 원본 flatData에서 값 수집 ──

function collectImportValues(
  flatData: ImportedFlatData[],
  itemCode: string,
): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  for (const d of flatData) {
    if (d.itemCode !== itemCode) continue;
    const key = d.processNo || '';
    const set = result.get(key) || new Set<string>();
    set.add(norm(d.value));
    result.set(key, set);
  }
  return result;
}

// ── 헬퍼: wsState에서 전체 값 수집 ──

function collectAllWsValues(
  state: WorksheetState,
): Record<string, Map<string, string[]>> {
  const result: Record<string, Map<string, string[]>> = {};

  // 초기화
  const codes = ['A2', 'A3', 'A4', 'A5', 'B1', 'B2', 'B3', 'B4', 'C1', 'C2', 'C3', 'C4'];
  for (const code of codes) {
    result[code] = new Map<string, string[]>();
  }

  // ── L2 공정별 데이터 (A계 + B계) ──
  for (const proc of (state.l2 || [])) {
    const pno = proc.no;

    // A2: 공정명
    if (proc.name) {
      pushValue(result['A2'], pno, proc.name);
    }

    // A3: 공정기능
    for (const func of (proc.functions || [])) {
      if (func.name) pushValue(result['A3'], pno, func.name);

      // A4: 제품특성
      for (const pc of (func.productChars || [])) {
        if (pc.name) pushValue(result['A4'], pno, pc.name);
      }
    }

    // A5: 고장형태
    for (const fm of (proc.failureModes || [])) {
      if (fm.name) pushValue(result['A5'], pno, fm.name);
    }

    // B1: 작업요소, B2: 요소기능, B3: 공정특성
    for (const we of (proc.l3 || [])) {
      if (we.name) pushValue(result['B1'], pno, we.name);

      for (const func of (we.functions || [])) {
        if (func.name) pushValue(result['B2'], pno, func.name);

        for (const pc of (func.processChars || [])) {
          if (pc.name) pushValue(result['B3'], pno, pc.name);
        }
      }

      // B4: 고장원인 (WE별)
      const weFCs = (we as unknown as { failureCauses?: Array<{ name: string }> }).failureCauses;
      for (const fc of (weFCs || [])) {
        if (fc.name) pushValue(result['B4'], pno, fc.name);
      }
    }

    // B4: 고장원인 (공정 레벨)
    for (const fc of (proc.failureCauses || [])) {
      if (fc.name) pushValue(result['B4'], pno, fc.name);
    }
  }

  // ── L1 완제품 데이터 (C계) ──
  const l1 = state.l1;
  if (l1) {
    // C1: 구분 (types)
    for (const t of (l1.types || [])) {
      if (t.name) pushValue(result['C1'], t.name, t.name);

      // C2: 완제품기능
      for (const func of (t.functions || [])) {
        if (func.name) pushValue(result['C2'], t.name, func.name);

        // C3: 요구사항
        for (const req of (func.requirements || [])) {
          if (req.name) pushValue(result['C3'], t.name, req.name);
        }
      }
    }

    // C4: 고장영향 (failureScopes)
    for (const fs of (l1.failureScopes || [])) {
      const scope = fs.scope || 'YP';
      const fe = fs.effect || fs.name || '';
      if (fe) pushValue(result['C4'], scope, fe);
    }
  }

  return result;
}

function pushValue(map: Map<string, string[]>, key: string, value: string): void {
  const list = map.get(key) || [];
  list.push(value);
  map.set(key, list);
}

function getProcessName(state: WorksheetState, processNo: string): string {
  const proc = (state.l2 || []).find((p: Process) => p.no === processNo);
  return proc?.name || processNo;
}
