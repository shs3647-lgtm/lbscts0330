// CODEFREEZE 2026-02-25 — 고장연결 완성 (누락 해결: C4/A4/B3 상위 데이터 재사용)
/**
 * buildWorksheetState.ts
 *
 * 구조드리븐 Import: ImportedFlatData[] → WorksheetState 변환
 *
 * ── 데이터 생성 목적 ──
 * CP 전처리 Import = "완전한 데이터" 생성이 목표.
 * 부족한 B3(공정특성)를 WE명 기반으로 자동 보충하여,
 * 엔지니어가 사실에 근거한 완벽한 FMEA를 작성할 수 있는 기초자료를 제공한다.
 * ↔ 기존 자료(STEP A)는 원본 사실 데이터 그대로 보존 (보충 없음)
 *
 * 3축 잠금 원리:
 *   processNo → L2 행 (어떤 공정)
 *   m4        → L3 행 (어떤 작업요소)
 *   itemCode  → 열   (어떤 데이터 컬럼)
 *
 * Phase 1 (구조): A1/A2→Process, B1+4M→WorkElement, C1→L1Type
 * Phase 2 (데이터): A3/A4→L2Function, A5→FM, B2/B3→L3Function, B4→FC, C2/C3/C4→L1
 *
 * ★★★ 2026-02-18: 매칭원칙 적용 ★★★
 *   1. 키 매칭: L1=구분, L2=공정번호, L3=공정번호+m4
 *   2. 순서 매칭: 같은 키 그룹 내 인덱스 기반
 *   3. 배분: M/N 균등, 나머지 마지막 슬롯
 *   4. rowSpan: max(기능, 특성, 원인, 예방, 1)
 *   5. L2/L3 독립: 건수 불일치 허용
 *   6. 공통공정(00/0/공통) → 01 공통공정으로 강제 매핑 (제외하지 않음)
 */

import type { ImportedFlatData } from '../types';
import {
  uid,
  sortWorkElementsByM4,
  createInitialState,
} from '@/app/(fmea-core)/pfmea/worksheet/constants';
import type {
  WorksheetState,
  L1Data,
  L1Type,
  L1Function,
  L1FailureScope,
  Process,
  WorkElement,
  L2Function,
  L2FailureMode,
  L3Function,
  L3FailureCauseExtended,
} from '@/app/(fmea-core)/pfmea/worksheet/constants';

// ════════════════════════════════════════════
// Types
// ════════════════════════════════════════════

export interface BuildConfig {
  fmeaId: string;
  l1Name?: string;
}

export interface BuildDiagnostics {
  l2Count: number;
  l3Count: number;
  l1TypeCount: number;
  l2FuncCount: number;
  l3FuncCount: number;
  processCharCount: number;
  productCharCount: number;
  fmCount: number;
  fcCount: number;
  feCount: number;
  warnings: string[];
}

export interface BuildResult {
  success: boolean;
  state: WorksheetState;
  diagnostics: BuildDiagnostics;
}

// ════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════

/** 공통공정 processNo 판별 (0, 00, 공통공정, 공통 등) */
function isCommonProcessNo(pNo: string): boolean {
  const normalized = pNo.trim().toLowerCase();
  return normalized === '0' || normalized === '00' ||
    normalized === '공통공정' || normalized === '공통';
}

/** processNo별로 flat items 그룹핑 (★ 원본 processNo 그대로 사용 — 사용자가 엑셀에서 정규화) */
function groupByProcessNo(data: ImportedFlatData[]): Map<string, ImportedFlatData[]> {
  const map = new Map<string, ImportedFlatData[]>();
  for (const item of data) {
    const key = item.processNo;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

/** itemCode로 필터 */
function byCode(items: ImportedFlatData[], code: string): ImportedFlatData[] {
  return items.filter(i => i.itemCode === code);
}

/** m4별로 그룹핑 */
function groupByM4(items: ImportedFlatData[]): Map<string, ImportedFlatData[]> {
  const map = new Map<string, ImportedFlatData[]>();
  for (const item of items) {
    const key = item.m4 || '';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

/**
 * ★ 균등 배분 유틸리티 (매칭원칙 #3) — 앞쪽 슬롯 우선
 *
 * M개 아이템을 N개 슬롯에 균등 배분
 * 앞쪽 extra개 슬롯: base+1개, 나머지: base개
 *
 * 예: distribute(4items, 2slots) → [[0,1], [2,3]]  (2:2 균등)
 * 예: distribute(5items, 2slots) → [[0,1,2], [3,4]] (3:2 나머지→처음)
 * 예: distribute(1item, 2slots)  → [[0], []]        (1:0 앞쪽 우선)
 * 예: distribute(3items, 3slots) → [[0], [1], [2]]  (1:1:1)
 */
function distribute<T>(items: T[], slots: number): T[][] {
  if (slots <= 0) return [];
  if (items.length === 0) return Array.from({ length: slots }, () => []);
  const result: T[][] = Array.from({ length: slots }, () => []);
  const base = Math.floor(items.length / slots);
  const extra = items.length % slots;
  let idx = 0;
  for (let s = 0; s < slots; s++) {
    // 앞쪽 extra개 슬롯이 1개씩 더 받음
    const count = s < extra ? base + 1 : base;
    for (let i = 0; i < count && idx < items.length; i++) {
      result[s].push(items[idx++]);
    }
  }
  return result;
}

/**
 * ★★★ 2026-02-23: 4단계 매칭 배분 (교차매핑 근본 해결) ★★★
 *
 * 교차매핑 근본 원인:
 *   파서가 B3를 공정번호별 배열로 수집 → B1↔B3 행 대응 소멸
 *   인덱스 기반 distribute() → 개수 불일치 시 전체 밀림
 *
 * 4단계 매칭 전략:
 *   1단계) belongsTo 확정 매칭 — Excel에서 파싱된 소속 WE 이름 (가장 정확)
 *   2단계) 이름 접두사 매칭 — B2/B3 값이 WE 이름으로 시작하는 경우
 *   3단계) 퍼지 매칭 — "XX번-장비명-특성" 패턴에서 장비명 추출 → WE와 부분/오타 매칭
 *   4단계) 폴백 — 빈 슬롯에 distribute() 균등 배분
 */

// ── 퍼지 매칭 유틸리티 (교차매핑 방지) ──

/** 문자열 정규화: 공백/구두점 제거 + 소문자 */
const normalizeStr = (s: string) => s.replace(/[\s,.\-_()·]/g, '').toLowerCase();

/** "XX번-장비명-특성명" 패턴에서 장비명 추출 */
function extractEquipRef(val: string): string | null {
  // "XX번-장비명-특성명" → 장비명
  const m1 = val.match(/^\d+번[-\s]?(.+?)-[^-]+$/);
  if (m1) return m1[1];
  // "XX번-장비명" (하이픈 없는 끝) → 첫 세그먼트
  const m2 = val.match(/^\d+번[-\s]?(.+?)$/);
  if (m2) {
    const parts = m2[1].split('-');
    if (parts.length >= 2) return parts[0];
  }
  return null;
}

/** "XX번-장비명" 패턴에서 장비명 추출 */
function extractEquipName(weName: string): string {
  const m1 = weName.match(/^\d+번[-\s]?(.+)$/);
  if (m1) return m1[1];
  return weName;
}

/** 알려진 오타/이표기 매핑 */
const TYPO_MAP: Record<string, string> = {
  '램핑기': '랩핑기',
  '랩핑기': '램핑기',
};

/** 두 장비명이 같은 장비를 가리키는지 퍼지 비교 */
function isSameEquip(ref: string, weName: string): boolean {
  if (!ref || !weName) return false;
  const nRef = normalizeStr(ref);
  const nWe = normalizeStr(weName);
  if (nRef === nWe) return true;
  if (nRef.includes(nWe) || nWe.includes(nRef)) return true;
  // 오타 매핑
  const refTypo = TYPO_MAP[ref] || TYPO_MAP[nRef];
  if (refTypo && (normalizeStr(refTypo) === nWe || nWe.includes(normalizeStr(refTypo)))) return true;
  const weTypo = TYPO_MAP[weName] || TYPO_MAP[nWe];
  if (weTypo && (nRef === normalizeStr(weTypo) || nRef.includes(normalizeStr(weTypo)))) return true;
  return false;
}

function nameMatchDistribute(
  items: ImportedFlatData[],
  wes: WorkElement[]
): ImportedFlatData[][] {
  const result: ImportedFlatData[][] = Array.from({ length: wes.length }, () => []);

  // ── 1단계: belongsTo 확정 매칭 (파서가 제공한 소속 WE 이름) ──
  const afterStage1: ImportedFlatData[] = [];
  for (const item of items) {
    if (item.belongsTo) {
      const normBT = normalizeStr(item.belongsTo);
      let matched = false;
      if (normBT) {
        for (let i = 0; i < wes.length; i++) {
          const normWE = normalizeStr(wes[i].name);
          if (!normWE) continue;
          if (normBT === normWE || normWE.includes(normBT) || normBT.includes(normWE)) {
            result[i].push(item);
            matched = true;
            break;
          }
        }
      }
      if (!matched) afterStage1.push(item);
    } else {
      afterStage1.push(item);
    }
  }

  // ── 2단계: 이름 접두사 매칭 ──
  const afterStage2: ImportedFlatData[] = [];
  for (const item of afterStage1) {
    const itemVal = normalizeStr(item.value);
    let matched = false;
    for (let i = 0; i < wes.length; i++) {
      const weName = normalizeStr(wes[i].name);
      if (!weName) continue;
      if (itemVal.startsWith(weName)) {
        result[i].push(item);
        matched = true;
        break;
      }
    }
    if (!matched) afterStage2.push(item);
  }

  // ── 3단계: 퍼지 매칭 (장비명 추출 → WE 이름 비교) ──
  const unmatched: ImportedFlatData[] = [];
  for (const item of afterStage2) {
    const equipRef = extractEquipRef(item.value);
    if (equipRef) {
      let matched = false;
      for (let i = 0; i < wes.length; i++) {
        const weEquipName = extractEquipName(wes[i].name);
        if (isSameEquip(equipRef, weEquipName)) {
          result[i].push(item);
          matched = true;
          break;
        }
      }
      if (!matched) unmatched.push(item);
    } else {
      unmatched.push(item);
    }
  }

  // ── 4단계: 폴백 — 빈 슬롯에 균등 배분 ──
  if (unmatched.length > 0) {
    const emptySlots = result.map((arr, idx) => ({ idx, empty: arr.length === 0 }))
      .filter(s => s.empty);

    if (emptySlots.length > 0) {
      const fallback = distribute(unmatched, emptySlots.length);
      emptySlots.forEach((slot, fi) => {
        result[slot.idx] = fallback[fi];
      });
    } else {
      // ★★★ FIX: 마지막 WE 몰아넣기 → 전체 WE에 균등 재배분 ★★★
      // 이전: result[result.length-1].push(...unmatched) → 교차매핑 근본원인!
      // 수정: 최소 항목 WE 우선 배분 (부하 균등화) + 경고 로그
      const sortedByCount = wes.map((_, idx) => idx)
        .sort((a, b) => result[a].length - result[b].length);

      for (let i = 0; i < unmatched.length; i++) {
        const targetIdx = sortedByCount[i % sortedByCount.length];
        result[targetIdx].push(unmatched[i]);
      }

      for (const um of unmatched) {
      }
    }
  }

  return result;
}

// ════════════════════════════════════════════
// Phase 1: 구조 빌드
// ════════════════════════════════════════════

/** C1 items → L1 구조 생성 (YP/SP/USER 기본 보장) */
function buildL1(cItems: ImportedFlatData[], l1Name: string): L1Data {
  const c1Values = byCode(cItems, 'C1').map(i => i.value).filter(Boolean);
  const defaults = ['YP', 'SP', 'USER'];
  const allCategories = [...new Set([...c1Values, ...defaults])];

  const types: L1Type[] = allCategories.map(cat => ({
    id: uid(),
    name: cat,
    functions: [], // Phase 2에서 채움
  }));

  return {
    id: uid(),
    name: l1Name,
    types,
    failureScopes: [],
  };
}

/**
 * A1/A2 items → L2 Process[] 생성 (processNo 숫자 정렬)
 *
 * ★★★ 2026-03-03: 공통공정 제외하지 않음 — 사용자가 엑셀에서 processNo 정규화 ★★★
 */
function buildL2Structure(
  byProcess: Map<string, ImportedFlatData[]>,
): { processes: Process[]; b1IdMaps: Map<string, B1IdMapping> } {
  const processMap = new Map<string, string>(); // processNo → processName
  const b1IdMaps = new Map<string, B1IdMapping>(); // processNo → B1IdMapping

  for (const [pNo, items] of byProcess) {
    const a1 = byCode(items, 'A1');
    const a2 = byCode(items, 'A2');
    // A1/A2 또는 B1이 있는 경우 공정으로 인정 (B1만 있고 A1/A2 없는 공통공정 누락 방지)
    const b1 = byCode(items, 'B1');
    if (a1.length > 0 || a2.length > 0 || b1.length > 0) {
      const name = a2.length > 0 ? a2[0].value : '';
      // 이미 같은 pNo가 있으면 병합 (공통공정 + 기존 01번 공정)
      if (processMap.has(pNo)) {
        const existing = processMap.get(pNo)!;
        if (!existing && name) processMap.set(pNo, name);
        // 이미 이름이 있으면 유지
      } else {
        processMap.set(pNo, name);
      }
    }
  }

  // processNo 숫자 정렬
  const sorted = [...processMap.entries()].sort((a, b) => {
    const na = parseInt(a[0]) || 0;
    const nb = parseInt(b[0]) || 0;
    return na - nb || a[0].localeCompare(b[0]);
  });

  const processes = sorted.map(([pNo, pName], idx) => {
    const items = byProcess.get(pNo) || [];
    const { wes, b1IdToWeId } = buildL3ForProcess(items);
    b1IdMaps.set(pNo, b1IdToWeId);
    return {
      id: uid(),
      no: pNo,
      name: pName,
      order: (parseInt(pNo) || (idx + 1) * 10),
      functions: [],
      failureModes: [],
      failureCauses: [],
      l3: wes,
    };
  });

  return { processes, b1IdMaps };
}

/**
 * B1 항목만으로 WorkElement[] 생성
 *
 * B1(작업요소명)에 있는 항목만 구조로 인정.
 * B2~B5에만 있고 B1에 없는 m4는 무시 (추론 금지).
 */
/** B1 원본 ID → WE 런타임 ID 매핑 (B2/B3 parentItemId 기반 매칭용) */
type B1IdMapping = Map<string, string>;

function buildL3ForProcess(items: ImportedFlatData[]): { wes: WorkElement[]; b1IdToWeId: B1IdMapping } {
  const b1Items = byCode(items, 'B1');
  const b1IdToWeId: B1IdMapping = new Map();

  // B1이 없으면 수동모드 placeholder
  if (b1Items.length === 0) {
    return {
      wes: [{
        id: uid(),
        m4: '',
        name: '',
        order: 10,
        functions: [],
      }],
      b1IdToWeId,
    };
  }

  const workElements: WorkElement[] = b1Items.map((b1, idx) => {
    const weId = uid();
    // B1 원본 ID(import-builder UUID) → WE 런타임 ID 매핑
    if (b1.id) {
      b1IdToWeId.set(b1.id, weId);
    }
    return {
      id: weId,
      m4: b1.m4 || '',
      name: b1.value,
      order: (idx + 1) * 10,
      functions: [],
    };
  });

  return { wes: sortWorkElementsByM4(workElements), b1IdToWeId };
}

// ════════════════════════════════════════════
// Phase 2: 데이터 채움
// ════════════════════════════════════════════

/**
 * L1 데이터 채움: C2(기능)+C3(요구사항) = 균등 배분, C4(고장영향) = reqId 연결
 *
 * ★ C2:C3 = 균등 배분 (매칭원칙 #3)
 *   C2=2, C3=4 → func[0]에 2개, func[1]에 2개 (2:2)
 *   C2=2, C3=5 → func[0]에 2개, func[1]에 3개 (2:3 나머지→마지막)
 *
 * ★ C4 = reqId FK — 각 고장영향이 특정 요구사항에 연결
 *   배분: 순차 블록 (앞쪽 R-extra 요구사항: baseShare개, 나머지: baseShare+1개)
 */
function fillL1Data(l1: L1Data, cItems: ImportedFlatData[]): void {
  for (const type of l1.types) {
    const c2Items = cItems.filter(i => i.itemCode === 'C2' && i.processNo === type.name);
    const c3Items = cItems.filter(i => i.itemCode === 'C3' && i.processNo === type.name);
    const c4Items = cItems.filter(i => i.itemCode === 'C4' && i.processNo === type.name);

    // C2+C3: 균등 배분
    if (c2Items.length === 0 && c3Items.length === 0) {
      type.functions = [{ id: uid(), name: '', requirements: [] }];
      // ★ C4(고장영향)는 C2/C3 없어도 처리 (간소화 포맷 대응)
      for (const c4 of c4Items) {
        l1.failureScopes!.push({
          id: uid(),
          name: c4.value,
          scope: type.name,
          effect: c4.value,
        });
      }
      continue;
    }

    // C2가 없으면 빈 이름 기능 1개에 모든 C3를 요구사항으로
    if (c2Items.length === 0) {
      type.functions = [{
        id: uid(),
        name: '',
        requirements: c3Items.map(c3 => ({ id: uid(), name: c3.value })),
      }];
    } else {
      // C2 기능 생성
      const funcs: L1Function[] = c2Items.map(c2 => ({
        id: uid(),
        name: c2.value,
        requirements: [],
      }));

      // ★ C3 균등 배분: distribute(C3, C2개수)
      const c3Dist = distribute(c3Items, funcs.length);
      funcs.forEach((func, i) => {
        func.requirements = c3Dist[i].map(c3 => ({ id: uid(), name: c3.value }));
      });

      type.functions = funcs;
    }

    // C4: 고장영향 → failureScopes with reqId FK
    const allReqs: { id: string; name: string }[] = [];
    type.functions.forEach(f => f.requirements.forEach(r => allReqs.push(r)));

    if (allReqs.length > 0 && c4Items.length > 0) {
      // ★★★ 2026-03-01 수정: C4 실제 데이터만 사용 (추론 생성 제거) ★★★
      // 이전: C4 < C3이면 마지막 C4 반복 → 추론 FE 생성 → Import/워크시트 갯수 불일치
      // 수정: C4 1:1 매칭만 + 남은 C4는 마지막 req에 추가 (반복 없음)
      const R = allReqs.length;
      const E = c4Items.length;
      const matched = Math.min(R, E);

      // 1:1 매칭 (실제 C4 데이터만)
      for (let ri = 0; ri < matched; ri++) {
        const req = allReqs[ri];
        l1.failureScopes!.push({
          id: uid(),
          name: c4Items[ri].value,
          reqId: req.id,
          requirement: req.name,
          scope: type.name,
          effect: c4Items[ri].value,
        });
      }

      // C4 > C3인 경우: 남은 C4를 마지막 req에 추가 배분
      if (E > R) {
        const lastReq = allReqs[R - 1];
        for (let ei = R; ei < E; ei++) {
          l1.failureScopes!.push({
            id: uid(),
            name: c4Items[ei].value,
            reqId: lastReq.id,
            requirement: lastReq.name,
            scope: type.name,
            effect: c4Items[ei].value,
          });
        }
      }

      // ★★★ 2026-03-01 수정: C4 < C3 → 남은 요구사항은 FE 미생성 ★★★
      // 이전: 라운드로빈 재사용 → Import(21) < DB(24), +3 불일치
      // 수정: C4 데이터가 없는 요구사항은 빈 FE scope 유지 (Import=DB 일치)
      if (E < R) {
      }
    } else if (allReqs.length > 0 && c4Items.length === 0) {
      // ★★★ 2026-03-01 수정: C4=0 → FE 미생성 (재사용 금지) ★★★
      // 이전: 기존 FE 재사용 → 추가 FE 생성 → Import≠DB 불일치
      // 수정: C4 데이터 없으면 FE 미생성 (Import=DB 일치 원칙)
    } else {
      // 요구사항 없이 C4만 → scope만 설정
      for (const c4 of c4Items) {
        l1.failureScopes!.push({
          id: uid(),
          name: c4.value,
          scope: type.name,
          effect: c4.value,
        });
      }
    }
  }
}

/**
 * L2 데이터 채움: A3+A4(1:N), A5(고장형태 = A4에 균등 배분)
 *
 * 2L 기능 화면: A3(공정기능) 병합 + A4(제품특성) N개
 * → 각 A3 function에 모든 A4를 productChars로 복사
 *
 * ★ A5 고장형태: A4 제품특성에 균등 배분 (매칭원칙 #3)
 *   A4=3, A5=3 → 1:1 인덱스 매칭 (PC[0]↔FM[0], PC[1]↔FM[1], PC[2]↔FM[2])
 *   A4=3, A5=6 → 2:2:2 균등 배분
 *   FailureL2Tab 렌더링: m.productCharId === pc.id 필터
 */
function fillL2Data(process: Process, items: ImportedFlatData[]): void {
  const a3Items = byCode(items, 'A3');
  const a4Items = byCode(items, 'A4');
  const a5Items = byCode(items, 'A5');

  // ★★★ 2026-03-14: A4 Cartesian 근본 해결 — 공유 ID 패턴 ★★★
  // 이전: 각 A3마다 새 uid() → A3×A4 Cartesian 중복 (A3=2, A4=3 → PC=6)
  // 수정: A4 productChars를 한 번만 생성(공유 ID) → 모든 A3가 같은 ID 참조
  if (a3Items.length === 0 && a4Items.length > 0) {
    // A3 없이 A4만 → 빈 이름 function 생성
    process.functions = [{
      id: uid(),
      name: '',
      productChars: a4Items.map(a4 => ({ id: uid(), name: a4.value, specialChar: a4.specialChar || '' })),
    }];
  } else if (a3Items.length > 0) {
    if (a4Items.length > 0) {
      // ★ A4 공유 ID: 한 번만 생성, 모든 A3 function이 동일 ID 참조
      const sharedPCs = a4Items.map(a4 => ({
        id: uid(),
        name: a4.value,
        specialChar: (a4 as unknown as { specialChar?: string }).specialChar || ''
      }));
      process.functions = a3Items.map(a3 => ({
        id: uid(),
        name: a3.value,
        productChars: sharedPCs.map(pc => ({ ...pc })),  // 동일 ID, 새 객체 (불변성)
      }));
    } else {
      // A4 없으면 단일 placeholder 생성 (ID 공유로 A5 연결 보장)
      const placeholderPC = { id: uid(), name: '(제품특성 미입력)', specialChar: '' };
      process.functions = a3Items.map(a3 => ({
        id: uid(),
        name: a3.value,
        productChars: [{ ...placeholderPC }],  // placeholder도 동일 ID 공유
      }));
    }
  }
  // A3/A4 모두 없으면 functions = [] 유지

  // ★★★ 2026-03-14: A4 공유 ID 적용 후 uniquePCs = 모든 function의 PC 동일 ★★★
  // 이전: 첫 번째 function만 참조 (Cartesian 우회)
  // 수정: 공유 ID이므로 어느 function이든 동일한 PC ID
  const uniquePCs = process.functions[0]?.productChars || [];

  if (uniquePCs.length > 0 && a5Items.length > 0) {
    // ★ 고유 A4에만 균등 배분: distribute(A5, 고유A4개수)
    const a5Dist = distribute(a5Items, uniquePCs.length);
    const modes: L2FailureMode[] = [];
    uniquePCs.forEach((pc, i) => {
      a5Dist[i].forEach(a5 => {
        modes.push({
          id: uid(),
          name: a5.value,
          productCharId: pc.id,
        });
      });
    });
    process.failureModes = modes;
  } else {
    // 제품특성 없으면 productCharId 없이 생성
    process.failureModes = a5Items.map(a5 => ({
      id: uid(),
      name: a5.value,
    }));
  }

  // ★★★ 근본 방어: 첫 번째 function의 PC 중 FM 없는 것만 placeholder 생성 ★★★
  // (다른 A3의 복제 PC는 동일 A4이므로 placeholder 불필요)
  const linkedPCIds = new Set(
    process.failureModes
      .map(fm => (fm as { productCharId?: string }).productCharId)
      .filter(Boolean)
  );
  for (const pc of uniquePCs) {
    if (pc.name && !linkedPCIds.has(pc.id)) {
      process.failureModes.push({
        id: uid(),
        name: `${pc.name} 부적합`,
        productCharId: pc.id,
      });
    }
  }
}

/**
 * L3 데이터 채움: B2+B3(WE별 균등 배분), B4(고장원인 with m4)
 *
 * ★ 핵심 변경: 카르테시안 → WE별 균등 배분 (매칭원칙 #3)
 *
 * 같은 processNo+m4 그룹 내에서:
 *   B2(요소기능)를 WE 수로 균등 배분 → 각 WE에 할당된 B2만 함수로
 *   B3(공정특성)를 WE 수로 균등 배분 → 각 WE에 할당된 B3만 특성으로
 *   WE 내에서 B2가 여러 개면 B3를 B2 함수별로 추가 배분
 *
 * 예: 20/MC — WE 2개(지그, 프레스), B2 2개, B3 4개
 *   지그   → B2[0] 1함수 → B3[0..1] 2특성
 *   프레스 → B2[1] 1함수 → B3[2..3] 2특성
 */
function fillL3Data(process: Process, items: ImportedFlatData[], b1IdToWeId?: B1IdMapping): void {
  const b2Items = byCode(items, 'B2');
  const b3Items = byCode(items, 'B3');
  const b4Items = byCode(items, 'B4');

  // ★★★ 2026-03-05: parentItemId 기반 원자성 매칭 (이름 매칭 → 폴백으로 강등) ★★★
  // import-builder가 B1 UUID를 B2/B3의 parentItemId에 기록 → buildL3ForProcess가 B1 UUID→WE ID 매핑
  // parentItemId가 있으면 정확한 WE에 직접 배치, 없으면 레거시 nameMatchDistribute 폴백

  // WE ID → index 룩업 (parentItemId 기반 직접 매칭용)
  const weIdToIdx = new Map<string, number>();
  process.l3.forEach((we, idx) => weIdToIdx.set(we.id, idx));

  // parentItemId 기반 B2/B3 분류: 매칭 가능한 것 vs 레거시(매칭 불가)
  function splitByParentId(dataItems: ImportedFlatData[]): { matched: Map<number, ImportedFlatData[]>; unmatched: ImportedFlatData[] } {
    const matched = new Map<number, ImportedFlatData[]>();
    const unmatched: ImportedFlatData[] = [];
    for (const item of dataItems) {
      if (item.parentItemId && b1IdToWeId) {
        const weId = b1IdToWeId.get(item.parentItemId);
        if (weId) {
          const weIdx = weIdToIdx.get(weId);
          if (weIdx !== undefined) {
            if (!matched.has(weIdx)) matched.set(weIdx, []);
            matched.get(weIdx)!.push(item);
            continue;
          }
        }
      }
      unmatched.push(item);
    }
    return { matched, unmatched };
  }

  const b2Split = splitByParentId(b2Items);
  const b3Split = splitByParentId(b3Items);

  // ★ WE를 m4별로 그룹핑 (레거시 폴백용)
  const weByM4 = new Map<string, WorkElement[]>();
  for (const we of process.l3) {
    const key = we.m4 || '';
    if (!weByM4.has(key)) weByM4.set(key, []);
    weByM4.get(key)!.push(we);
  }

  // ★★★ parentItemId 매칭된 B2/B3를 WE에 직접 배치 ★★★
  // 레거시(unmatched)는 기존 nameMatchDistribute 폴백
  const b2ByM4Unmatched = groupByM4(b2Split.unmatched);
  const b3ByM4Unmatched = groupByM4(b3Split.unmatched);

  for (const [m4Key, wes] of weByM4) {
    const m4B2Unmatched = b2ByM4Unmatched.get(m4Key) || [];
    const m4B3Unmatched = b3ByM4Unmatched.get(m4Key) || [];

    // 레거시 데이터만 nameMatchDistribute 폴백
    const b2Dist = m4B2Unmatched.length > 0 ? nameMatchDistribute(m4B2Unmatched, wes) : Array.from({ length: wes.length }, () => [] as ImportedFlatData[]);
    const b3Dist = m4B3Unmatched.length > 0 ? nameMatchDistribute(m4B3Unmatched, wes) : Array.from({ length: wes.length }, () => [] as ImportedFlatData[]);

    wes.forEach((we, weIdx) => {
      // parentItemId 매칭 + nameMatchDistribute 폴백 병합
      const globalWeIdx = process.l3.indexOf(we);
      const parentB2 = globalWeIdx >= 0 ? (b2Split.matched.get(globalWeIdx) || []) : [];
      const parentB3 = globalWeIdx >= 0 ? (b3Split.matched.get(globalWeIdx) || []) : [];
      const myB2 = [...parentB2, ...b2Dist[weIdx]];
      const myB3 = [...parentB3, ...b3Dist[weIdx]];

      // ★★★ 2026-03-01: B3 부족 시 복제 금지 → 빈 processChar 유지 ★★★
      // 이전: m4 그룹 마지막 B3 재사용 → Import(129) < DB(130), +1 불일치
      // 수정: B3 없는 WE는 빈 processChar로 유지 (Import=DB 일치)
      const effectiveB3 = myB3;

      if (myB2.length > 0) {
        if (myB2.length === 1) {
          we.functions = [{
            id: uid(),
            name: myB2[0].value,
            processChars: effectiveB3.map(b3 => ({ id: uid(), name: b3.value, specialChar: b3.specialChar || '' })),
          }];
        } else {
          const b3PerFunc = distribute(effectiveB3, myB2.length);
          we.functions = myB2.map((b2, fIdx) => ({
            id: uid(),
            name: b2.value,
            processChars: b3PerFunc[fIdx].map(b3 => ({ id: uid(), name: b3.value, specialChar: b3.specialChar || '' })),
          }));
        }
      } else if (effectiveB3.length > 0) {
        // B2 없이 B3만 → 빈 이름 function
        we.functions = [{
          id: uid(),
          name: '',
          processChars: effectiveB3.map(b3 => ({ id: uid(), name: b3.value, specialChar: b3.specialChar || '' })),
        }];
      }
      // ★★★ 2026-03-02: B2/B3 모두 없으면 placeholder 함수 생성 (렌더링 보장) ★★★
      if (we.functions.length === 0) {
        we.functions = [{ id: uid(), name: '', processChars: [] }];
      }

      // ★★★ 2026-03-05: B3 누락 방어 — B2는 있는데 processChars가 비어있으면 WE명 기반 자동생성 ★★★
      // ── 목적: CP 전처리/Import는 "완전한 데이터"를 만드는 것이 목표.
      //    엔지니어가 사실에 근거한 완벽한 FMEA를 작성하도록 돕는 기초자료이므로,
      //    빈 칸(placeholder) 대신 WE명 기반의 의미있는 공정특성을 생성한다.
      //    ↔ 기존 자료 Import는 원본 사실 데이터를 그대로 보존하는 것이 목적 (변환/보충 없음)
      if (we.name) {
        for (const func of we.functions) {
          if (func.processChars.length === 0) {
            func.processChars = [{ id: uid(), name: `${we.name} 관리 특성`, specialChar: '' }];
          }
        }
      }
    });
  }

  // ★★★ 2026-02-22: m4 불일치 B2/B3 보정 — 빈 WE에 남은 데이터 재분배 ★★★
  // 원인: 단일시트에서 func4M이 비어있으면 B2의 m4=''이 되어 WE의 m4와 불일치
  // 파서에서 fallback 처리하지만, 멀티시트/레거시 데이터 대비 빌더에서도 보정
  {
    // 전체 B2/B3를 m4별로 재그룹핑 (parentItemId 매칭 후 남은 미매칭 + 원래 미배분)
    const allB2ByM4 = groupByM4(b2Items);
    const allB3ByM4 = groupByM4(b3Items);

    // 1. WE m4 그룹에 매칭되지 않은 B2 수집
    const weM4Keys = new Set(weByM4.keys());
    const unmatchedB2Fallback: ImportedFlatData[] = [];
    for (const [key, groupItems] of allB2ByM4) {
      if (!weM4Keys.has(key)) {
        unmatchedB2Fallback.push(...groupItems);
      }
    }

    // 2. 빈 WE(functions 없는) 수집
    const emptyWEs = process.l3.filter(we => we.functions.length === 0);

    // 3. 남은 B2를 빈 WE에 균등 배분
    if (unmatchedB2Fallback.length > 0 && emptyWEs.length > 0) {
      // 미매칭 B3도 수집
      const unmatchedB3Fallback: ImportedFlatData[] = [];
      for (const [key, groupItems] of allB3ByM4) {
        if (!weM4Keys.has(key)) {
          unmatchedB3Fallback.push(...groupItems);
        }
      }

      const b2Dist = distribute(unmatchedB2Fallback, emptyWEs.length);
      const b3Dist = distribute(unmatchedB3Fallback, emptyWEs.length);

      emptyWEs.forEach((we, weIdx) => {
        const myB2 = b2Dist[weIdx];
        const myB3 = b3Dist[weIdx];
        if (myB2.length > 0) {
          if (myB2.length === 1) {
            we.functions = [{
              id: uid(),
              name: myB2[0].value,
              processChars: myB3.map(b3 => ({ id: uid(), name: b3.value, specialChar: b3.specialChar || '' })),
            }];
          } else {
            const b3PerFunc = distribute(myB3, myB2.length);
            we.functions = myB2.map((b2, fIdx) => ({
              id: uid(),
              name: b2.value,
              processChars: b3PerFunc[fIdx].map(b3 => ({ id: uid(), name: b3.value, specialChar: b3.specialChar || '' })),
            }));
          }
        } else if (myB3.length > 0) {
          we.functions = [{
            id: uid(),
            name: '',
            processChars: myB3.map(b3 => ({ id: uid(), name: b3.value, specialChar: b3.specialChar || '' })),
          }];
        }
      });
    }
  }

  // ★★★ 2026-02-23: 크로스-m4 이름 기반 보정 — 빈 WE에 다른 그룹 B2 재배치 ★★★
  // 원인: B2의 m4가 B1과 다를 때 (예: B1 "120번-EOL검사기" m4=MC, B2 m4=MN)
  //        → B2가 잘못된 m4 그룹에 배치 → 올바른 WE가 빈 채로 남음
  // 해결: 빈 WE의 이름으로 전체 WE 함수를 검색, 이름 매칭 시 교정
  {
    const normalize = (s: string) => s.replace(/[\s,.\-_()]/g, '').toLowerCase();
    const emptyAfterAll = process.l3.filter(we => {
      const meaningful = we.functions.filter(f => f.name && f.name.trim() && !f.name.includes('선택') && !f.name.includes('클릭'));
      return meaningful.length === 0;
    });

    for (const emptyWe of emptyAfterAll) {
      const emptyName = normalize(emptyWe.name);
      if (!emptyName) continue;

      // 다른 WE에서 이 빈 WE 이름으로 시작하는 B2를 찾아 이동
      // ⚠️ 단, 소스 WE에 함수가 1개뿐이면 빼앗지 않음 (소스도 비워짐 방지)
      for (const otherWe of process.l3) {
        if (otherWe === emptyWe) continue;
        if (otherWe.functions.length <= 1) continue; // ★ 1개뿐이면 스킵 (빼앗으면 소스가 빈다)

        const matchIdx = otherWe.functions.findIndex(f =>
          f.name && normalize(f.name).startsWith(emptyName)
        );

        if (matchIdx >= 0) {
          // 해당 function을 빈 WE로 이동
          const [movedFunc] = otherWe.functions.splice(matchIdx, 1);
          emptyWe.functions = [movedFunc];

          // B3도 이름 매칭으로 교정
          const allB3 = byCode(items, 'B3');
          const matchedB3 = allB3.filter(b3 => normalize(b3.value).startsWith(emptyName));
          if (matchedB3.length > 0 && movedFunc.processChars.length === 0) {
            movedFunc.processChars = matchedB3.map(b3 => ({
              id: uid(), name: b3.value, specialChar: b3.specialChar || '',
            }));
          }
          break;
        }
      }
    }
  }

  // ★ B4: 고장원인 → Process.failureCauses (processCharId 연결)
  // L2의 A5→A4 productCharId 패턴과 동일: m4별로 B4를 processChars에 균등 배분
  const b4ByM4 = groupByM4(b4Items);
  const causes: L3FailureCauseExtended[] = [];

  // m4별 processChars 수집 (B3에서 생성된 것)
  const pcByM4 = new Map<string, { id: string; name: string }[]>();
  const allProcessChars: { id: string; name: string }[] = []; // ★ 전체 PC (fallback용)
  for (const we of process.l3) {
    const m4Key = we.m4 || '';
    if (!pcByM4.has(m4Key)) pcByM4.set(m4Key, []);
    for (const func of we.functions) {
      for (const pc of (func.processChars || [])) {
        pcByM4.get(m4Key)!.push(pc);
        allProcessChars.push(pc);
      }
    }
  }

  // m4별 B4→processChar 균등 배분 (매칭원칙 #3)
  const unmatchedB4: ImportedFlatData[] = []; // ★ m4 불일치 B4 수집
  for (const [m4Key, m4B4] of b4ByM4) {
    const m4PCs = pcByM4.get(m4Key) || [];
    if (m4PCs.length > 0 && m4B4.length > 0) {
      const b4Dist = distribute(m4B4, m4PCs.length);
      m4PCs.forEach((pc, i) => {
        b4Dist[i].forEach(b4 => {
          causes.push({
            id: uid(),
            name: b4.value,
            m4: b4.m4,
            processCharId: pc.id,
          } as L3FailureCauseExtended);
        });
      });
    } else if (m4PCs.length === 0 && m4B4.length > 0) {
      // ★★★ 2026-03-03: m4 불일치 → fallback 대상에 추가 ★★★
      unmatchedB4.push(...m4B4);
    }
  }

  // ★★★ 2026-03-03: m4 불일치 B4를 전체 processChars에 재배분 ★★★
  // 이전: processCharId 없이 생성 → 워크시트에서 "고장원인 선택" 표시 (누락)
  // 수정: 전체 processChars에 균등 배분 → processCharId 연결 → 정상 표시
  if (unmatchedB4.length > 0 && allProcessChars.length > 0) {
    const b4Fallback = distribute(unmatchedB4, allProcessChars.length);
    allProcessChars.forEach((pc, i) => {
      b4Fallback[i].forEach(b4 => {
        causes.push({
          id: uid(),
          name: b4.value,
          m4: b4.m4,
          processCharId: pc.id,
        } as L3FailureCauseExtended);
      });
    });
  } else if (unmatchedB4.length > 0) {
    // processChars도 없으면 processCharId 없이 생성 (최종 fallback)
    for (const b4 of unmatchedB4) {
      causes.push({
        id: uid(),
        name: b4.value,
        m4: b4.m4,
      } as L3FailureCauseExtended);
    }
  }
  // ★★★ 근본 방어: processChar에 연결된 FC가 없으면 placeholder 자동생성 ★★★
  // 원인: B4 부분 존재 시 import-builder 폴백이 스킵되어 orphan processChar 발생
  // 증상: "고장원인 선택" (FC 누락) 반복 발생
  // ★★★ 2026-03-10: 실제 B4 기반 FC가 이미 존재하는 공정에서는 placeholder 스킵 ★★★
  // 이유: placeholder FC는 chains/B4에 대응 데이터가 없어 failureLink 생성 불가 → 영원히 "누락 FC"로 표시
  const hasRealB4Causes = causes.length > 0;
  if (!hasRealB4Causes) {
    const linkedProcessCharIds = new Set(
      causes.map(fc => (fc as { processCharId?: string }).processCharId).filter(Boolean)
    );
    for (const we of process.l3) {
      for (const func of we.functions) {
        for (const pc of func.processChars || []) {
          if (pc.name && !linkedProcessCharIds.has(pc.id)) {
            causes.push({
              id: uid(),
              name: `${pc.name} 부적합`,
              m4: we.m4 || '',
              processCharId: pc.id,
            } as L3FailureCauseExtended);
          }
        }
      }
    }
  }

  process.failureCauses = causes;
}

// ════════════════════════════════════════════
// Main
// ════════════════════════════════════════════

/**
 * ImportedFlatData[] → WorksheetState 변환 (구조드리븐)
 *
 * 열은 고정(L1/L2/4M/L3), 셀 병합(rowSpan)만 L3 개수에 따라 자동 계산
 */
export function buildWorksheetState(
  flatData: ImportedFlatData[],
  config: BuildConfig,
): BuildResult {
  const warnings: string[] = [];
  const emptyDiag: BuildDiagnostics = {
    l2Count: 0, l3Count: 0, l1TypeCount: 0,
    l2FuncCount: 0, l3FuncCount: 0,
    processCharCount: 0, productCharCount: 0,
    fmCount: 0, fcCount: 0, feCount: 0, warnings: ['데이터 없음'],
  };

  if (flatData.length === 0) {
    return { success: false, state: createInitialState(), diagnostics: emptyDiag };
  }

  // ★★★ 2026-03-01: 공통공정(00/공통) 방어 필터 ★★★
  // Import 데이터는 고객 지정 공정만 사용 — 공통공정은 수동모드 모달용 (별도 라우터)
  const filtered = flatData.filter(d => !isCommonProcessNo(d.processNo || ''));
  if (filtered.length < flatData.length) {
  }

  const byProcess = groupByProcessNo(filtered);
  const cItems = filtered.filter(i => i.category === 'C');

  // ── Phase 1: 구조 빌드 (공통공정 00/공통 제외) ──
  const l1 = buildL1(cItems, config.l1Name || '');
  const { processes: l2, b1IdMaps } = buildL2Structure(byProcess);

  if (l2.length === 0) {
    warnings.push('공정 데이터(A1/A2)가 없습니다');
  }

  // ── Phase 2: 데이터 채움 ──
  fillL1Data(l1, cItems);

  // ★ 진단: B2 아이템 존재 여부 (L3기능 0개 문제 추적)
  const allB2 = flatData.filter(d => d.itemCode === 'B2');
  const allB3 = flatData.filter(d => d.itemCode === 'B3');
  if (allB2.length > 0) {
    const b2PNos = [...new Set(allB2.map(d => d.processNo))];
  }
  const l2PNos = l2.map(p => p.no);

  for (const proc of l2) {
    const processItems = byProcess.get(proc.no) || [];
    const b2InProc = processItems.filter(d => d.itemCode === 'B2');
    if (b2InProc.length === 0 && allB2.length > 0) {
    }
    fillL2Data(proc, processItems);
    fillL3Data(proc, processItems, b1IdMaps.get(proc.no));
  }

  // ── 결과 조립 ──
  const state: WorksheetState = {
    l1,
    l2: l2.length > 0 ? l2 : createInitialState().l2,
    selected: { type: 'L2', id: null },
    tab: 'structure',
    levelView: '2',
    search: '',
    visibleSteps: [2, 3, 4, 5, 6],
    failureLinks: [],
    structureConfirmed: false,
    l1Confirmed: false,
    l2Confirmed: false,
    l3Confirmed: false,
    failureL1Confirmed: false,
    failureL2Confirmed: false,
    failureL3Confirmed: false,
    failureLinkConfirmed: false,
    riskConfirmed: false,
    optimizationConfirmed: false,
    riskData: {},
  };

  // ── 진단 통계 ──
  let l3Count = 0, l2FuncCount = 0, l3FuncCount = 0;
  let processCharCount = 0, productCharCount = 0;
  let fmCount = 0, fcCount = 0;

  for (const proc of l2) {
    l3Count += proc.l3.length;
    l2FuncCount += proc.functions.length;
    fmCount += (proc.failureModes || []).length;
    fcCount += (proc.failureCauses || []).length;

    for (const func of proc.functions) {
      productCharCount += func.productChars.length;
    }
    for (const we of proc.l3) {
      l3FuncCount += we.functions.length;
      for (const func of we.functions) {
        processCharCount += func.processChars.length;
      }
    }
  }

  const feCount = (l1.failureScopes || []).length;

  return {
    success: true,
    state,
    diagnostics: {
      l2Count: l2.length,
      l3Count,
      l1TypeCount: l1.types.length,
      l2FuncCount,
      l3FuncCount,
      processCharCount,
      productCharCount,
      fmCount,
      fcCount,
      feCount,
      warnings,
    },
  };
}
