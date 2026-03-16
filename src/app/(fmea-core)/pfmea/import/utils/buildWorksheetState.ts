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
import type { MasterFailureChain } from '../types/masterFailureChain';
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
import type { FailureLinkEntry } from './failureChainInjector';
import {
  genC1, genC2, genC3, genC4,
  genA1, genA3, genA4, genA5,
  genB1, genB2, genB3, genB4,
  genFC,
} from '@/lib/uuid-generator';
import { assignEntityUUIDsToChains, supplementOrphanChains } from './assignChainUUIDs';
import { enrichStateFromChains } from '@/lib/enrich-state-from-chains';

// ════════════════════════════════════════════
// Types
// ════════════════════════════════════════════

export interface BuildConfig {
  fmeaId: string;
  l1Name?: string;
  /** ★ DB중심 고장연결: FC시트 chains → 엔티티 생성 시점에 FK 직접 할당 */
  chains?: MasterFailureChain[];
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
  /** ★ DB중심 고장연결 진단 (chains 제공 시에만) */
  linkStats?: {
    injectedCount: number;
    skippedCount: number;
    skipReasons: { noProc: number; noFE: number; noFM: number; noFC: number };
  };
}

export interface BuildResult {
  success: boolean;
  state: WorksheetState;
  diagnostics: BuildDiagnostics;
}

// ════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════

/** isRevised 플래그 전달 — 엑셀 적색 셀이면 { isRevised: true } 반환 */
function rev(item: { isRevised?: boolean }): { isRevised?: boolean } {
  return item.isRevised ? { isRevised: true } : {};
}

/** 공통공정 processNo 판별 (0, 00, 공통공정, 공통 등) */
function isCommonProcessNo(pNo: string): boolean {
  const normalized = pNo.trim().toLowerCase();
  return normalized === '0' || normalized === '00' ||
    normalized === '공통공정' || normalized === '공통';
}

/**
 * ★ processNo 정규화 — '01' vs '1' 불일치 방지
 * FC 시트 sanitizeProcessNo는 앞자리 0 제거, L3 시트는 원본 유지 → 동일 공정이 분리됨
 */
function normalizePno(pno: string | undefined): string {
  if (!pno) return '';
  const trimmed = pno.trim();
  if (!trimmed) return '';
  if (/^\d+$/.test(trimmed)) return String(parseInt(trimmed, 10));
  return trimmed;
}

/**
 * processNo별로 flat items 그룹핑
 * ★ normalizePno로 '01'과 '1'을 동일 그룹으로 병합
 * ★ 첫 번째로 등장한 원본 processNo를 canonical key로 사용
 */
function groupByProcessNo(data: ImportedFlatData[]): Map<string, ImportedFlatData[]> {
  const map = new Map<string, ImportedFlatData[]>();
  const normToCanonical = new Map<string, string>(); // normalized → first-seen raw
  for (const item of data) {
    const raw = item.processNo;
    const norm = normalizePno(raw);
    if (!normToCanonical.has(norm)) normToCanonical.set(norm, raw);
    const key = normToCanonical.get(norm)!;
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

// ─── DB중심 고장연결용 정규화 헬퍼 ───

/** 텍스트 정규화 (공백 통일 + 소문자) */
function normalizeText(s: string | undefined): string {
  return (s || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** 공백 완전 제거 정규화 */
function normalizeNoSpaceText(s: string | undefined): string {
  return normalizeText(s).replace(/\s/g, '');
}

/** 공정번호 정규화 — failureChainInjector/masterFailureChain과 동일 로직 */
function normalizeProcessNo(pNo: string | undefined): string {
  if (!pNo) return '';
  let n = pNo.trim();
  const lower = n.toLowerCase();
  if (lower === '0' || lower === '공통공정' || lower === '공통') return '00';
  n = n.replace(/^(공정|process|proc|p)[\s\-_]*/i, '');
  n = n.replace(/번$/, '');
  if (n !== '0' && n !== '00') n = n.replace(/^0+(?=\d)/, '');
  return n;
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

  // ── 4단계: 폴백 — 빈 슬롯에 꽂아넣기 (첫 빈 슬롯에 전부) ──
  if (unmatched.length > 0) {
    const emptySlots = result.map((arr, idx) => ({ idx, empty: arr.length === 0 }))
      .filter(s => s.empty);

    if (emptySlots.length > 0) {
      // ★★★ 2026-03-16 FIX: distribute → 첫 빈 슬롯에 전부 꽂아넣기
      // 배분하면 데이터 없는 WE에도 강제 할당 → 거짓 누락행 발생
      result[emptySlots[0].idx] = unmatched;
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
    id: genC1('PF', cat === 'USER' ? 'US' : cat),
    name: cat,
    functions: [], // Phase 2에서 채움
  }));

  return {
    id: genC1('PF', 'YP'),
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
    const pnoNum = parseInt(pNo) || (idx + 1) * 10;
    const items = byProcess.get(pNo) || [];
    const { wes, b1IdToWeId } = buildL3ForProcess(items, pnoNum);
    b1IdMaps.set(pNo, b1IdToWeId);
    return {
      id: genA1('PF', pnoNum),
      no: pNo,
      name: pName,
      order: pnoNum,
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

function buildL3ForProcess(items: ImportedFlatData[], pnoNum: number): { wes: WorkElement[]; b1IdToWeId: B1IdMapping } {
  const b1Items = byCode(items, 'B1');
  const b1IdToWeId: B1IdMapping = new Map();

  // B1이 없으면 수동모드 placeholder
  if (b1Items.length === 0) {
    return {
      wes: [{
        id: genB1('PF', pnoNum, '', 1),
        m4: '',
        name: '',
        order: 10,
        functions: [],
      }],
      b1IdToWeId,
    };
  }

  // m4별 seq 카운터
  const m4SeqCounter = new Map<string, number>();
  const workElements: WorkElement[] = b1Items.map((b1, idx) => {
    const m4 = b1.m4 || '';
    const b1seq = (m4SeqCounter.get(m4) || 0) + 1;
    m4SeqCounter.set(m4, b1seq);
    const weId = genB1('PF', pnoNum, m4, b1seq);
    // B1 원본 ID(import-builder UUID) → WE 런타임 ID 매핑
    if (b1.id) {
      b1IdToWeId.set(b1.id, weId);
    }
    return {
      id: weId,
      m4: b1.m4 || '',
      name: b1.value,
      ...rev(b1),
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
    const div = type.name === 'USER' ? 'US' : type.name;
    const c2Items = cItems.filter(i => i.itemCode === 'C2' && i.processNo === type.name);
    const c3Items = cItems.filter(i => i.itemCode === 'C3' && i.processNo === type.name);
    const c4Items = cItems.filter(i => i.itemCode === 'C4' && i.processNo === type.name);

    let c2seq = 0;
    let c3seq = 0;
    let c4seq = 0;

    // C2+C3: 균등 배분
    if (c2Items.length === 0 && c3Items.length === 0) {
      c2seq++;
      type.functions = [{ id: genC2('PF', div, c2seq), name: '', requirements: [] }];
      // ★ C4(고장영향)는 C2/C3 없어도 처리 (간소화 포맷 대응)
      for (const c4 of c4Items) {
        c4seq++;
        l1.failureScopes!.push({
          id: genC4('PF', div, c2seq, 1, c4seq),
          name: c4.value,
          ...rev(c4),
          scope: type.name,
          effect: c4.value,
        });
      }
      continue;
    }

    // C2가 없으면 빈 이름 기능 1개에 모든 C3를 요구사항으로
    if (c2Items.length === 0) {
      c2seq++;
      c3seq = 0;
      type.functions = [{
        id: genC2('PF', div, c2seq),
        name: '',
        requirements: c3Items.map(c3 => { c3seq++; return { id: genC3('PF', div, c2seq, c3seq), name: c3.value, ...rev(c3) }; }),
      }];
    } else {
      // C2 기능 생성
      const funcs: L1Function[] = c2Items.map(c2 => {
        c2seq++;
        return {
          id: genC2('PF', div, c2seq),
          name: c2.value,
          ...rev(c2),
          requirements: [],
        };
      });

      // ★★★ 2026-03-16 FIX: parentItemId UUID 기반 매칭 (+ legacy key 폴백)
      // c2Items[i].id(UUID) 우선 매칭 → "C2-YP-0" 레거시 키 폴백 (양방향 호환)
      {
        funcs.forEach((func, i) => {
          const c2Id = c2Items[i]?.id || '';
          const keyParent = `C2-${type.name}-${i}`;
          // keyParent 폴백: 동일 key를 id로 가진 C2가 이미 있으면 사용 금지 (충돌 방지)
          const keyParentTaken = c2Items.some(c2 => c2.id === keyParent);
          const myC3 = c3Items.filter(c3 =>
            c3.parentItemId === c2Id || (!keyParentTaken && c3.parentItemId === keyParent)
          );
          c3seq = 0;
          func.requirements = myC3.map(c3 => { c3seq++; return { id: genC3('PF', div, i + 1, c3seq), name: c3.value, ...rev(c3) }; });
        });
        // parentItemId 미설정 C3 → orphan 처리 (마지막 func에 추가)
        const allParents = new Set([
          ...c2Items.map(c2 => c2.id),                       // UUID 포맷
          ...funcs.map((_, i) => `C2-${type.name}-${i}`),   // 레거시 키 포맷
        ]);
        const orphanC3 = c3Items.filter(c3 => !c3.parentItemId || !allParents.has(c3.parentItemId));
        if (orphanC3.length > 0 && funcs.length > 0) {
          const lastFunc = funcs[funcs.length - 1];
          orphanC3.forEach(c3 => { c3seq++; lastFunc.requirements.push({ id: genC3('PF', div, c2seq, c3seq), name: c3.value, ...rev(c3) }); });
        }
      }
      {
        // 빈 C2 function에 placeholder requirement 추가 (워크시트 편집용)
        for (let fi = 0; fi < funcs.length; fi++) {
          if (funcs[fi].requirements.length === 0) {
            funcs[fi].requirements = [{ id: genC3('PF', div, fi + 1, 1), name: '' }];
          }
        }
      }

      type.functions = funcs;
    }

    // C4: 고장영향 → failureScopes with reqId FK
    const allReqs: { id: string; name: string }[] = [];
    type.functions.forEach(f => f.requirements.forEach(r => allReqs.push(r)));

    c4seq = 0;
    if (allReqs.length > 0 && c4Items.length > 0) {
      const R = allReqs.length;
      const E = c4Items.length;
      const matched = Math.min(R, E);

      // 1:1 매칭 (실제 C4 데이터만)
      for (let ri = 0; ri < matched; ri++) {
        c4seq++;
        const req = allReqs[ri];
        l1.failureScopes!.push({
          id: genC4('PF', div, c2seq, c3seq > 0 ? ri + 1 : 1, c4seq),
          name: c4Items[ri].value,
          ...rev(c4Items[ri]),
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
          c4seq++;
          l1.failureScopes!.push({
            id: genC4('PF', div, c2seq, c3seq > 0 ? R : 1, c4seq),
            name: c4Items[ei].value,
            ...rev(c4Items[ei]),
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
        c4seq++;
        l1.failureScopes!.push({
          id: genC4('PF', div, c2seq || 1, 1, c4seq),
          name: c4.value,
          ...rev(c4),
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
  const pnoNum = parseInt(process.no) || 0;

  // ★★★ 2026-03-15 FIX: UUID 공유 참조 패턴 (카테시안 금지) ★★★
  if (a3Items.length === 0 && a4Items.length > 0) {
    process.functions = [{
      id: genA3('PF', pnoNum, 1),
      name: '',
      productChars: a4Items.map((a4, i) => ({ id: genA4('PF', pnoNum, i + 1), name: a4.value, ...rev(a4), specialChar: a4.specialChar || '' })),
    }];
  } else if (a3Items.length > 0) {
    if (a4Items.length > 0) {
      // ★ A4 엔티티를 한 번만 생성 (공유 UUID)
      const sharedPCs = a4Items.map((a4, i) => ({
        id: genA4('PF', pnoNum, i + 1),
        name: a4.value,
        ...rev(a4),
        specialChar: (a4 as unknown as { specialChar?: string }).specialChar || ''
      }));
      // ★ 모든 A3 function이 같은 UUID의 A4를 참조 (카테시안 아님 — ID 동일)
      process.functions = a3Items.map((a3, ai) => ({
        id: genA3('PF', pnoNum, ai + 1),
        name: a3.value,
        ...rev(a3),
        productChars: sharedPCs.map(pc => ({ ...pc })),
      }));
    } else {
      // A4 없으면 각 function에 placeholder 생성
      process.functions = a3Items.map((a3, ai) => ({
        id: genA3('PF', pnoNum, ai + 1),
        name: a3.value,
        ...rev(a3),
        productChars: [{ id: genA4('PF', pnoNum, 1), name: '', specialChar: '' }],
      }));
    }
  }
  // A3/A4 모두 없으면 functions = [] 유지

  // ★★★ 2026-03-14 W-2/H-2: A4 공유 ID 적용 + A3=0 방어 ★★★
  // functions 빈 배열일 때(A3=0) productChars도 빈 배열 → FM에 productCharId 미할당
  // 방어: 모든 functions의 PC를 ID 기준으로 중복 제거 (향후 함수별 PC 분리 시에도 안전)
  const uniquePCs = (() => {
    if (process.functions.length === 0) return [];
    const seen = new Set<string>();
    const result: Array<{ id: string; name: string; specialChar?: string }> = [];
    for (const fn of process.functions) {
      for (const pc of (fn.productChars || [])) {
        if (!seen.has(pc.id)) {
          seen.add(pc.id);
          result.push(pc);
        }
      }
    }
    return result;
  })();

  if (uniquePCs.length > 0 && a5Items.length > 0) {
    // ★★★ 2026-03-16 FIX: distribute 제거 → parentItemId 기반 꽂아넣기 ★★★
    // 이전 버그: distribute(A5, A4개수) → A4 슬롯에 강제 배분 → 빈 PC에 거짓 FM 생성
    // 수정: A5.parentItemId → a4Items 인덱스 → uniquePC 매핑 (FK 없으면 첫 번째 PC)
    const a4IdToIdx = new Map<string, number>();
    a4Items.forEach((a4, i) => { if (a4.id) a4IdToIdx.set(a4.id, i); });

    let a5seq = 0;
    const modes: L2FailureMode[] = [];
    for (const a5 of a5Items) {
      a5seq++;
      let pcIdx = 0; // 기본: 첫 번째 PC
      if (a5.parentItemId) {
        const mapped = a4IdToIdx.get(a5.parentItemId);
        if (mapped !== undefined && mapped < uniquePCs.length) {
          pcIdx = mapped;
        }
      }
      modes.push({
        id: genA5('PF', pnoNum, a5seq),
        name: a5.value,
        ...rev(a5),
        productCharId: uniquePCs[pcIdx].id,
      });
    }
    process.failureModes = modes;
  } else {
    // 제품특성 없으면 productCharId 없이 생성
    let a5seq = 0;
    process.failureModes = a5Items.map(a5 => {
      a5seq++;
      return {
      id: genA5('PF', pnoNum, a5seq),
      name: a5.value,
      ...rev(a5),
    };
    });
  }

  // ★★★ 2026-03-16 FIX: FM 없는 PC → placeholder는 A5가 0건일 때만 생성
  if (a5Items.length === 0) {
    let phSeq = 0;
    for (const pc of uniquePCs) {
      if (pc.name) {
        phSeq++;
        process.failureModes.push({
          id: genA5('PF', pnoNum, phSeq),
          name: `${pc.name} 부적합`,
          productCharId: pc.id,
        });
      }
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
  const pnoNum = parseInt(process.no) || 0;

  /** we.id에서 m4, b1seq 파싱 — PF-L3-040-MC-001 → { m4: 'MC', b1seq: 1 } */
  function parseWeId(weId: string): { m4: string; b1seq: number } {
    const match = weId.match(/PF-L3-\d+-([A-Z]*)-(\d+)/);
    if (match) return { m4: match[1], b1seq: parseInt(match[2]) };
    return { m4: '', b1seq: 1 };
  }
  // WE별 B3 seq 카운터
  const weCharSeqMap = new Map<string, number>();
  // WE별 B4 seq 카운터
  const weKseqMap = new Map<string, number>();

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

      const { m4: weM4, b1seq: weB1seq } = parseWeId(we.id);
      if (myB2.length > 0) {
        if (myB2.length === 1) {
          we.functions = [{
            id: genB2('PF', pnoNum, weM4, weB1seq),
            name: myB2[0].value,
            ...rev(myB2[0]),
            processChars: effectiveB3.map(b3 => { const cs = (weCharSeqMap.get(we.id) || 0) + 1; weCharSeqMap.set(we.id, cs); return { id: genB3('PF', pnoNum, weM4, weB1seq, cs), name: b3.value, ...rev(b3), specialChar: b3.specialChar || '' }; }),
          }];
        } else {
          const b3ByParent = new Map<number, ImportedFlatData[]>();
          for (const b3 of effectiveB3) {
            let targetIdx = 0;
            if (b3.parentItemId) {
              const found = myB2.findIndex(b2 => b2.id === b3.parentItemId);
              if (found >= 0) targetIdx = found;
            }
            if (!b3ByParent.has(targetIdx)) b3ByParent.set(targetIdx, []);
            b3ByParent.get(targetIdx)!.push(b3);
          }
          we.functions = myB2.map((b2, fIdx) => ({
            id: fIdx === 0 ? genB2('PF', pnoNum, weM4, weB1seq) : `${genB1('PF', pnoNum, weM4, weB1seq)}-G-${String(fIdx + 1).padStart(3, '0')}`,
            name: b2.value,
            ...rev(b2),
            processChars: (b3ByParent.get(fIdx) || []).map(b3 => { const cs = (weCharSeqMap.get(we.id) || 0) + 1; weCharSeqMap.set(we.id, cs); return { id: genB3('PF', pnoNum, weM4, weB1seq, cs), name: b3.value, ...rev(b3), specialChar: b3.specialChar || '' }; }),
          }));
        }
      } else if (effectiveB3.length > 0) {
        we.functions = [{
          id: genB2('PF', pnoNum, weM4, weB1seq),
          name: '',
          processChars: effectiveB3.map(b3 => { const cs = (weCharSeqMap.get(we.id) || 0) + 1; weCharSeqMap.set(we.id, cs); return { id: genB3('PF', pnoNum, weM4, weB1seq, cs), name: b3.value, ...rev(b3), specialChar: b3.specialChar || '' }; }),
        }];
      }
      if (we.functions.length === 0) {
        we.functions = [{ id: genB2('PF', pnoNum, weM4, weB1seq), name: '', processChars: [] }];
      }

      // ★★★ 2026-03-16 FIX: B3 자동 생성 제거 — Import 원본만 저장 (통계 일치 원칙)
      // 이전: B3 없는 WE에 "{WE명} 관리 특성" placeholder 자동 생성 → Import 77건 → DB 102건 (+25 불일치)
      // 수정: 자동 생성 제거. 빈 B3는 워크시트에서 수동 입력
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

      // ★★★ 2026-03-16 FIX: distribute 제거 → parentItemId 기반 꽂아넣기 ★★★
      // 미매칭 B2/B3를 WE에 parentItemId 기반으로 꽂아넣기, 없으면 첫 번째 빈 WE에 전부
      const b2ByWE = new Map<number, ImportedFlatData[]>();
      const b3ByWE = new Map<number, ImportedFlatData[]>();
      for (const b2 of unmatchedB2Fallback) {
        let weIdx = 0;
        if (b2.parentItemId) {
          const found = emptyWEs.findIndex(we => we.id === b2.parentItemId);
          if (found >= 0) weIdx = found;
        }
        if (!b2ByWE.has(weIdx)) b2ByWE.set(weIdx, []);
        b2ByWE.get(weIdx)!.push(b2);
      }
      for (const b3 of unmatchedB3Fallback) {
        let weIdx = 0;
        if (b3.parentItemId) {
          const found = emptyWEs.findIndex(we => we.id === b3.parentItemId);
          if (found >= 0) weIdx = found;
        }
        if (!b3ByWE.has(weIdx)) b3ByWE.set(weIdx, []);
        b3ByWE.get(weIdx)!.push(b3);
      }

      emptyWEs.forEach((we, weIdx) => {
        const { m4: weM4, b1seq: weB1seq } = parseWeId(we.id);
        const myB2 = b2ByWE.get(weIdx) || [];
        const myB3 = b3ByWE.get(weIdx) || [];
        if (myB2.length > 0) {
          if (myB2.length === 1) {
            we.functions = [{
              id: genB2('PF', pnoNum, weM4, weB1seq),
              name: myB2[0].value,
              ...rev(myB2[0]),
              processChars: myB3.map(b3 => { const cs = (weCharSeqMap.get(we.id) || 0) + 1; weCharSeqMap.set(we.id, cs); return { id: genB3('PF', pnoNum, weM4, weB1seq, cs), name: b3.value, ...rev(b3), specialChar: b3.specialChar || '' }; }),
            }];
          } else {
            we.functions = myB2.map((b2, fIdx) => ({
              id: fIdx === 0 ? genB2('PF', pnoNum, weM4, weB1seq) : `${genB1('PF', pnoNum, weM4, weB1seq)}-G-${String(fIdx + 1).padStart(3, '0')}`,
              name: b2.value,
              ...rev(b2),
              processChars: fIdx === 0 ? myB3.map(b3 => { const cs = (weCharSeqMap.get(we.id) || 0) + 1; weCharSeqMap.set(we.id, cs); return { id: genB3('PF', pnoNum, weM4, weB1seq, cs), name: b3.value, ...rev(b3), specialChar: b3.specialChar || '' }; }) : [],
            }));
          }
        } else if (myB3.length > 0) {
          we.functions = [{
            id: genB2('PF', pnoNum, weM4, weB1seq),
            name: '',
            processChars: myB3.map(b3 => { const cs = (weCharSeqMap.get(we.id) || 0) + 1; weCharSeqMap.set(we.id, cs); return { id: genB3('PF', pnoNum, weM4, weB1seq, cs), name: b3.value, ...rev(b3), specialChar: b3.specialChar || '' }; }),
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
          // 해당 function을 빈 WE로 이동 (★ 2026-03-14 H-4: 불변성 — splice 대신 filter)
          const movedFunc = otherWe.functions[matchIdx];
          otherWe.functions = otherWe.functions.filter((_, idx) => idx !== matchIdx);
          emptyWe.functions = [movedFunc];

          // B3도 이름 매칭으로 교정
          const allB3 = byCode(items, 'B3');
          const matchedB3 = allB3.filter(b3 => normalize(b3.value).startsWith(emptyName));
          if (matchedB3.length > 0 && movedFunc.processChars.length === 0) {
            const { m4: emM4, b1seq: emB1seq } = parseWeId(emptyWe.id);
            movedFunc.processChars = matchedB3.map(b3 => {
              const cs = (weCharSeqMap.get(emptyWe.id) || 0) + 1; weCharSeqMap.set(emptyWe.id, cs);
              return { id: genB3('PF', pnoNum, emM4, emB1seq, cs), name: b3.value, ...rev(b3), specialChar: b3.specialChar || '' };
            });
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

  // m4별 B4→processChar 꽂아넣기 (parentItemId FK 기반, 폴백: 순차 할당)
  const unmatchedB4: ImportedFlatData[] = []; // ★ m4 불일치 B4 수집
  for (const [m4Key, m4B4] of b4ByM4) {
    const m4PCs = pcByM4.get(m4Key) || [];
    if (m4PCs.length > 0 && m4B4.length > 0) {
      // ★★★ 2026-03-16 FIX: distribute → parentItemId FK 기반 꽂아넣기
      // parentItemId 없으면 순차 할당 (i번째 B4 → i번째 PC, 초과분은 마지막 PC)
      const pcIdSet = new Set(m4PCs.map(pc => pc.id));
      for (let bi = 0; bi < m4B4.length; bi++) {
        const b4 = m4B4[bi];
        let targetPc = m4PCs[Math.min(bi, m4PCs.length - 1)];
        if (b4.parentItemId && pcIdSet.has(b4.parentItemId)) {
          targetPc = m4PCs.find(pc => pc.id === b4.parentItemId) || targetPc;
        }
        // B4 → genB4: targetPc.id에서 WE 파싱하여 m4/b1seq 추출
        const pcParsed = parseWeId(targetPc.id);  // B3 id에서 WE prefix 파싱
        const weIdFromPc = genB1('PF', pnoNum, pcParsed.m4, pcParsed.b1seq);
        const kseq = (weKseqMap.get(weIdFromPc) || 0) + 1;
        weKseqMap.set(weIdFromPc, kseq);
        causes.push({
          id: genB4('PF', pnoNum, b4.m4 || pcParsed.m4, pcParsed.b1seq, kseq),
          name: b4.value,
          ...rev(b4),
          m4: b4.m4,
          processCharId: targetPc.id,
        } as L3FailureCauseExtended);
      }
    } else if (m4PCs.length === 0 && m4B4.length > 0) {
      // ★★★ 2026-03-03: m4 불일치 → fallback 대상에 추가 ★★★
      unmatchedB4.push(...m4B4);
    }
  }

  // ★★★ 2026-03-03: m4 불일치 B4를 전체 processChars에 재배분 ★★★
  // 이전: processCharId 없이 생성 → 워크시트에서 "고장원인 선택" 표시 (누락)
  // 수정: 전체 processChars에 균등 배분 → processCharId 연결 → 정상 표시
  if (unmatchedB4.length > 0 && allProcessChars.length > 0) {
    // ★★★ 2026-03-16 FIX: distribute → 첫 PC에 전부 꽂아넣기 (m4 불일치 fallback)
    // 배분하면 데이터 없는 PC에도 강제 할당 → 거짓 누락행 발생
    const firstPc = allProcessChars[0];
    const fpParsed = parseWeId(firstPc.id);
    const fpWeId = genB1('PF', pnoNum, fpParsed.m4, fpParsed.b1seq);
    for (const b4 of unmatchedB4) {
      const kseq = (weKseqMap.get(fpWeId) || 0) + 1;
      weKseqMap.set(fpWeId, kseq);
      causes.push({
        id: genB4('PF', pnoNum, b4.m4 || fpParsed.m4, fpParsed.b1seq, kseq),
        name: b4.value,
        ...rev(b4),
        m4: b4.m4,
        processCharId: firstPc.id,
      } as L3FailureCauseExtended);
    }
  } else if (unmatchedB4.length > 0) {
    let fallbackKseq = 0;
    for (const b4 of unmatchedB4) {
      fallbackKseq++;
      causes.push({
        id: genB4('PF', pnoNum, b4.m4 || '', 1, fallbackKseq),
        name: b4.value,
        ...rev(b4),
        m4: b4.m4,
      } as L3FailureCauseExtended);
    }
  }
  // ★★★ 2026-03-16 FIX: orphan processChar → placeholder FC는 B4가 0건일 때만 생성
  // B4 항목이 존재하나 parentItemId 미설정으로 첫 PC에 몰린 경우,
  // 나머지 PC에 거짓 placeholder FC 생성하면 안 됨 (거짓 누락행 원인)
  if (b4Items.length === 0) {
    const linkedProcessCharIds = new Set(
      causes.map(fc => (fc as { processCharId?: string }).processCharId).filter(Boolean)
    );
    for (const we of process.l3) {
      for (const func of we.functions) {
        for (const pc of func.processChars || []) {
          if (pc.name && !linkedProcessCharIds.has(pc.id)) {
            const { m4: phM4, b1seq: phB1seq } = parseWeId(we.id);
            const phWeId = genB1('PF', pnoNum, phM4, phB1seq);
            const kseq = (weKseqMap.get(phWeId) || 0) + 1;
            weKseqMap.set(phWeId, kseq);
            causes.push({
              id: genB4('PF', pnoNum, phM4, phB1seq, kseq),
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

  // ★★★ 2026-03-14 W-1: 공통공정(00/공통) 조건부 필터 ★★★
  // 공통공정이 실제 A5/B4 데이터를 포함하면 보존 (데이터 누락 방지)
  // 공통공정에 공정번호만 있고 실제 데이터 없으면 제외 (수동모드 모달용)
  const commonProcessItems = flatData.filter(d => isCommonProcessNo(d.processNo || ''));
  const hasRealCommonData = commonProcessItems.some(d =>
    d.itemCode === 'A5' || d.itemCode === 'B4' || d.itemCode === 'A3' || d.itemCode === 'B2'
  );
  const filtered = hasRealCommonData
    ? flatData  // 공통공정에 실제 데이터 있으면 전체 유지
    : flatData.filter(d => !isCommonProcessNo(d.processNo || ''));
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

  // ═══════════════════════════════════════════════════════
  // Phase 3: DB중심 고장연결 — chains → FailureLinks + riskData
  // ═══════════════════════════════════════════════════════
  // 원리: 엔티티 생성 직후 같은 함수 스코프에서 Map.get() 순수 조회
  //       → 유사도/임계값/퍼지매칭 없음 (DB FK 할당과 동일)
  let linkStats: BuildDiagnostics['linkStats'];

  if (config.chains && config.chains.length > 0) {
    // ★ Chain-Driven 통합: enrich → link를 같은 스코프에서 실행
    // 이전: save-from-import에서 3단계 분리 호출 → 타이밍 버그 원인
    // 변경: Phase 3 내부에서 enrich + link를 순서 보장 실행
    const enrichStats = enrichStateFromChains(
      state,
      config.chains as unknown as import('@/lib/enrich-state-from-chains').ChainRecord[],
    );
    if (enrichStats.addedFM > 0 || enrichStats.addedFE > 0 || enrichStats.addedFC > 0) {
      console.info(
        `[buildWS:Phase3] 체인 보강: FM+${enrichStats.addedFM} FE+${enrichStats.addedFE} FC+${enrichStats.addedFC}`
      );
    }

    // ★★★ 2026-03-15: Phase 2.5 — chain에 엔티티 UUID FK 할당 ★★★
    // 텍스트 매칭 완전 제거 — 엔티티 생성 직후 같은 스코프에서 UUID 할당
    // 이후 모든 링크 생성은 UUID FK만 사용
    assignEntityUUIDsToChains(state, config.chains);

    // ★★★ 2026-03-15 v2: 고아 FM/FC 자동보충 ★★★
    // 메인시트에 있지만 FC시트에 없는 FM/FC → 합성 chain 생성 후 UUID 직접 할당
    const orphanStats = supplementOrphanChains(state, config.chains);
    if (orphanStats.addedFM > 0 || orphanStats.addedFC > 0) {
      console.info(
        `[buildWS:Phase2.7] 고아 보충: FM+${orphanStats.addedFM} FC+${orphanStats.addedFC}`
      );
    }

    const linkResult = buildFailureLinksDBCentric(state, config.chains);
    state.failureLinks = linkResult.failureLinks;
    state.riskData = linkResult.riskData;
    linkStats = {
      injectedCount: linkResult.injectedCount,
      skippedCount: linkResult.skippedCount,
      skipReasons: linkResult.skipReasons,
    };
  }

  // ═══════════════════════════════════════════════════════
  // Phase 4: A6(검출관리)/B5(예방관리) flat → riskData 보충
  // ═══════════════════════════════════════════════════════
  // chains에 pcValue/dcValue가 없어도, useImportFileHandlers에서
  // ①전용시트 ②FC체인 ③추론으로 flat에 A6/B5를 생성했을 수 있음.
  // 이 데이터를 riskData에 반영하여 워크시트 카운트가 0이 되지 않도록 보충.
  {
    const a6Items = filtered.filter(d => d.itemCode === 'A6' && d.value?.trim());
    const b5Items = filtered.filter(d => d.itemCode === 'B5' && d.value?.trim());

    const fLinks = state.failureLinks || [];
    if ((a6Items.length > 0 || b5Items.length > 0) && fLinks.length > 0) {
      const riskData = (state.riskData || {}) as Record<string, string | number>;

      // 공정번호별 A6/B5 그룹핑
      const a6ByProc = new Map<string, string[]>();
      for (const item of a6Items) {
        const pNo = item.processNo || '';
        if (!a6ByProc.has(pNo)) a6ByProc.set(pNo, []);
        a6ByProc.get(pNo)!.push(item.value!.trim());
      }
      const b5ByProc = new Map<string, string[]>();
      for (const item of b5Items) {
        const pNo = item.processNo || '';
        if (!b5ByProc.has(pNo)) b5ByProc.set(pNo, []);
        b5ByProc.get(pNo)!.push(item.value!.trim());
      }

      // failureLinks를 공정번호별로 그룹핑
      const linksByProc = new Map<string, Array<{ fmId: string; fcId: string }>>();
      for (const link of fLinks) {
        const pNo = link.fmProcessNo || link.fmProcess || '';
        if (!pNo || !link.fmId || !link.fcId) continue;
        if (!linksByProc.has(pNo)) linksByProc.set(pNo, []);
        linksByProc.get(pNo)!.push({ fmId: link.fmId, fcId: link.fcId });
      }

      // 공정별 A6/B5를 해당 공정의 failureLinks에 라운드로빈 배분
      for (const [pNo, dcValues] of a6ByProc) {
        const procLinks = linksByProc.get(pNo);
        if (!procLinks || procLinks.length === 0) continue;
        dcValues.forEach((dc, i) => {
          const link = procLinks[i % procLinks.length];
          const uKey = `${link.fmId}-${link.fcId}`;
          const existingDc = String(riskData[`detection-${uKey}`] ?? '').trim();
          if (!existingDc) {
            riskData[`detection-${uKey}`] = dc;
          } else if (!existingDc.split('\n').some(v => v.trim() === dc)) {
            riskData[`detection-${uKey}`] = `${existingDc}\n${dc}`;
          }
        });
      }
      for (const [pNo, pcValues] of b5ByProc) {
        const procLinks = linksByProc.get(pNo);
        if (!procLinks || procLinks.length === 0) continue;
        pcValues.forEach((pc, i) => {
          const link = procLinks[i % procLinks.length];
          const uKey = `${link.fmId}-${link.fcId}`;
          const existingPc = String(riskData[`prevention-${uKey}`] ?? '').trim();
          if (!existingPc) {
            riskData[`prevention-${uKey}`] = pc;
          } else if (!existingPc.split('\n').some(v => v.trim() === pc)) {
            riskData[`prevention-${uKey}`] = `${existingPc}\n${pc}`;
          }
        });
      }

      state.riskData = riskData;
    }
  }

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
      linkStats,
    },
  };
}

// ═══════════════════════════════════════════════════════
// Phase 2.5: chain에 엔티티 UUID FK 할당 (순환 import 방지를 위해 assignChainUUIDs.ts로 분리)
// re-export for backward compatibility
// ═══════════════════════════════════════════════════════
export { assignEntityUUIDsToChains } from './assignChainUUIDs';

// ═══════════════════════════════════════════════════════
// Phase 3 구현: DB중심 고장연결 (UUID FK 직접 조회)
// ═══════════════════════════════════════════════════════

interface LinkBuildResult {
  failureLinks: FailureLinkEntry[];
  riskData: Record<string, number | string>;
  injectedCount: number;
  skippedCount: number;
  skipReasons: { noProc: number; noFE: number; noFM: number; noFC: number };
}

/**
 * ★★★ 2026-03-15: UUID FK 기반 고장연결 (텍스트 매칭 완전 제거) ★★★
 *
 * Phase 2.5에서 chain.fmId/fcId/feId가 이미 할당됨.
 * 이 함수는 UUID FK로 직접 엔티티를 조회하여 링크를 생성.
 * 텍스트 유사도/임계값/contains 매칭 없음.
 */
export function buildFailureLinksDBCentric(
  state: WorksheetState,
  chains: MasterFailureChain[],
): LinkBuildResult {
  const failureLinks: FailureLinkEntry[] = [];
  const riskData: Record<string, number | string> = {};
  let injectedCount = 0;
  let skippedCount = 0;
  const skipReasons = { noProc: 0, noFE: 0, noFM: 0, noFC: 0 };

  // ─── UUID → 엔티티 인덱스 (ID 직접 조회) ───
  const feById = new Map<string, L1FailureScope>();
  for (const fe of (state.l1?.failureScopes || [])) {
    feById.set(fe.id, fe);
  }

  const fmById = new Map<string, L2FailureMode & { processNo?: string }>();
  const procByNo = new Map<string, Process>();
  for (const proc of (state.l2 || [])) {
    if (proc.no) {
      procByNo.set(proc.no, proc);
      const normalized = normalizeProcessNo(proc.no);
      if (normalized && normalized !== proc.no && !procByNo.has(normalized)) {
        procByNo.set(normalized, proc);
      }
    }
    for (const fm of (proc.failureModes || [])) {
      fmById.set(fm.id, { ...fm, processNo: proc.no });
    }
  }

  const fcById = new Map<string, L3FailureCauseExtended & { processNo?: string; m4?: string }>();
  for (const proc of (state.l2 || [])) {
    for (const we of (proc.l3 || [])) {
      for (const fc of (we.failureCauses || [])) {
        fcById.set(fc.id, { ...fc, processNo: proc.no, m4: we.m4 });
      }
    }
    for (const fc of (proc.failureCauses || [])) {
      if (!fcById.has(fc.id)) {
        fcById.set(fc.id, { ...fc, processNo: proc.no });
      }
    }
  }

  // ─── FM→FE 매핑: FM의 processNo 순서 기반 FE 순차 할당 ───
  // chain의 feValue가 1종류뿐인 경우(Excel FC시트 구조적 한계),
  // C4 flatData에서 생성된 FE를 FM 순서대로 할당
  const allFEs = state.l1?.failureScopes || [];

  // chain에서 feId가 몇 종류인지 확인
  const uniqueFeIds = new Set(chains.filter(c => c.feId).map(c => c.feId));

  if (uniqueFeIds.size <= 1 && allFEs.length > 1) {
    // ★ FE가 1종류 이하 → FM 순서 기반 FE 할당
    // FM 고유 목록 (processNo 순서 유지)
    const fmIds = [...new Set(chains.filter(c => c.fmId).map(c => c.fmId!))];

    // FM별 FE 할당: FM 순서대로 FE 순환 배정 (같은 FM = 같은 FE)
    const fmToFeId = new Map<string, string>();
    fmIds.forEach((fmId, i) => {
      const feIdx = i % allFEs.length;
      fmToFeId.set(fmId, allFEs[feIdx].id);
    });

    // chain에 FM별 FE 할당
    for (const c of chains) {
      if (c.fmId) {
        const mappedFeId = fmToFeId.get(c.fmId);
        if (mappedFeId) c.feId = mappedFeId;
      }
    }

    console.info(
      `[buildWS:Phase3] FE 재매핑: ${fmIds.length} FM → ${allFEs.length} FE (chain feId 단일값 보정)`
    );
  } else {
    // ★ 기존 FE carry-forward: feId 빈 체인에 같은 FM의 feId 복구
    const fmIdToFeId = new Map<string, string>();
    for (const c of chains) {
      if (c.feId && c.fmId && !fmIdToFeId.has(c.fmId)) {
        fmIdToFeId.set(c.fmId, c.feId);
      }
    }
    // Same-FM FE 복구만 허용, Cross-FM carry-forward 제거 (의미적 오류 방지)
    for (const c of chains) {
      if (!c.feId && c.fmId) {
        const fromFm = fmIdToFeId.get(c.fmId);
        if (fromFm) {
          c.feId = fromFm;
        }
      }
    }
  }

  // ─── 체인 → 링크 생성 (UUID FK 직접 조회) ───
  for (const chain of chains) {
    // UUID FK 미할당 체인 스킵
    if (!chain.fmId && !chain.fcId && !chain.feId) {
      skippedCount++;
      continue;
    }

    // UUID로 엔티티 직접 조회
    const fe = chain.feId ? feById.get(chain.feId) : undefined;
    const fm = chain.fmId ? fmById.get(chain.fmId) : undefined;
    let fc = chain.fcId ? fcById.get(chain.fcId) : undefined;

    // fcId 없는 체인: 같은 FM의 기존 링크에서 FC 재사용
    if (!fc && fe && fm) {
      const existingLink = failureLinks.find(l => l.fmId === fm.id && l.fcId);
      if (existingLink) {
        fc = fcById.get(existingLink.fcId);
      }
    }

    // 공정 찾기
    let proc = fm?.processNo ? procByNo.get(fm.processNo) : undefined;
    if (!proc && chain.processNo) {
      proc = procByNo.get(chain.processNo) || procByNo.get(normalizeProcessNo(chain.processNo));
    }
    if (!proc) {
      skippedCount++;
      skipReasons.noProc++;
      continue;
    }
    const actualPNo = proc.no;
    const m4 = chain.m4 || '';

    // 3개 모두 존재 시 링크 생성
    if (fe && fm && fc) {
      // FM/FC id에서 seq 파싱하여 genFC 호출
      const fmMatch = fm.id?.match(/M-(\d+)$/);
      const mseq = fmMatch ? parseInt(fmMatch[1]) : 1;
      const fcMatch = fc.id?.match(/(\w+)-(\d+)-K-(\d+)$/);
      const fcM4 = fcMatch ? fcMatch[1] : m4;
      const fcB1seq = fcMatch ? parseInt(fcMatch[2]) : 1;
      const fcKseq = fcMatch ? parseInt(fcMatch[3]) : 1;
      const linkId = genFC('PF', parseInt(actualPNo) || 0, mseq, fcM4, fcB1seq, fcKseq);
      const feScope = chain.feScope || undefined;
      const feText = chain.feValue || (fe as L1FailureScope).effect || (fe as L1FailureScope).name;
      const fmText = chain.fmValue || fm.name;
      const fcText = chain.fcValue || fc.name;

      failureLinks.push({
        id: linkId,
        fmId: fm.id,
        feId: fe.id,
        fcId: fc.id,
        fmText, feText, fcText,
        fcM4: m4 || undefined,
        fmProcess: actualPNo,
        fmProcessNo: actualPNo,
        feScope,
        severity: chain.severity || (fe as L1FailureScope).severity || undefined,
        pcText: chain.pcValue || undefined,
        dcText: chain.dcValue || undefined,
        fmPath: `${actualPNo}/${fmText}`,
        fePath: feScope ? `${feScope}/${feText}` : feText,
        fcPath: m4 ? `${actualPNo}/${m4}/${fcText}` : `${actualPNo}/${fcText}`,
        fmMergeSpan: chain.fmMergeSpan || undefined,
        feMergeSpan: chain.feMergeSpan || undefined,
        productCharId: (fm as { productCharId?: string }).productCharId || undefined,
      });

      // riskData
      const uKey = `${fm.id}-${fc.id}`;
      if (chain.severity) riskData[`risk-${uKey}-S`] = chain.severity;
      if (chain.occurrence) riskData[`risk-${uKey}-O`] = chain.occurrence;
      if (chain.detection) riskData[`risk-${uKey}-D`] = chain.detection;
      if (chain.pcValue) riskData[`prevention-${uKey}`] = chain.pcValue;
      if (chain.dcValue) riskData[`detection-${uKey}`] = chain.dcValue;
      if (chain.specialChar) riskData[`specialChar-${fm.id}-${fc.id}`] = chain.specialChar;

      injectedCount++;
    } else {
      skippedCount++;
      if (!fe) skipReasons.noFE++;
      if (!fm) skipReasons.noFM++;
      if (!fc) skipReasons.noFC++;
    }
  }

  // specialChar 전파 (chain → productChars/processChars)
  for (const chain of chains) {
    if (!chain.specialChar || !chain.processNo) continue;
    const proc = (state.l2 || []).find(p => p.no === chain.processNo);
    if (!proc) continue;
    if (chain.productChar) {
      for (const func of (proc.functions || [])) {
        for (const pc of (func.productChars || [])) {
          if (normalizeText(pc.name) === normalizeText(chain.productChar) && !pc.specialChar) {
            pc.specialChar = chain.specialChar;
          }
        }
      }
    }
    if (chain.processChar) {
      for (const we of (proc.l3 || [])) {
        for (const weFunc of (we.functions || [])) {
          for (const prc of (weFunc.processChars || [])) {
            if (normalizeText(prc.name) === normalizeText(chain.processChar) && !prc.specialChar) {
              prc.specialChar = chain.specialChar;
            }
          }
        }
      }
    }
  }

  // seq 필드 계산
  computeSeqFieldsLocal(failureLinks);

  return { failureLinks, riskData, injectedCount, skippedCount, skipReasons };
}

/** seq 필드 계산 (in-place) — failureChainInjector.computeSeqFields와 동일 로직 */
function computeSeqFieldsLocal(links: FailureLinkEntry[]): void {
  if (links.length === 0) return;

  // fcSeq: 같은 fmId 내 FC 순서
  const fmGroupFcCount = new Map<string, number>();
  for (const link of links) {
    const count = (fmGroupFcCount.get(link.fmId) || 0) + 1;
    fmGroupFcCount.set(link.fmId, count);
    link.fcSeq = count;
  }

  // fmSeq: 같은 feId 내 FM 순서
  const feGroupFmOrder = new Map<string, Map<string, number>>();
  for (const link of links) {
    if (!feGroupFmOrder.has(link.feId)) feGroupFmOrder.set(link.feId, new Map());
    const fmOrder = feGroupFmOrder.get(link.feId)!;
    if (!fmOrder.has(link.fmId)) fmOrder.set(link.fmId, fmOrder.size + 1);
    link.fmSeq = fmOrder.get(link.fmId)!;
  }

  // feSeq: 같은 공정 내 FE 순서
  const procFeOrder = new Map<string, Map<string, number>>();
  for (const link of links) {
    const pNo = link.fmProcessNo || '';
    if (!procFeOrder.has(pNo)) procFeOrder.set(pNo, new Map());
    const feOrder = procFeOrder.get(pNo)!;
    if (!feOrder.has(link.feId)) feOrder.set(link.feId, feOrder.size + 1);
    link.feSeq = feOrder.get(link.feId)!;
  }
}
