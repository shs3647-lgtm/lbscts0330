// 2026-03-17: CODEFREEZE 해제 — C3 parentItemId 파이프라인 수정 완료
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
 *   3. 꽂기: parentItemId FK 기반 직접 배치
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
  flatMap?: FlatToEntityMap;
}

/** ★★★ 2026-03-17: flatData.id → entity.id 결정론적 매핑 (텍스트 매칭 제거) ★★★ */
export interface FlatToEntityMap {
  fm: Map<string, string>;  // A5 flatData.id → L2FailureMode.id
  fc: Map<string, string>;  // B4 flatData.id → L3FailureCauseExtended.id
  fe: Map<string, string>;  // C4 flatData.id → L1FailureScope.id
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

// ★★★ 2026-03-17: distribute/nameMatchDistribute 전면 제거 ★★★
// 균등배분(distribute)과 퍼지매칭(nameMatchDistribute)은 레거시 개별시트 시절 코드.
// 통합시트에서는 모든 B2/B3가 parentItemId로 소속 WE가 확정되어 있으므로
// parentItemId 기반 직접 꽂기(insertion)만 사용.

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
    const weId = b1.id?.startsWith('PF-') ? b1.id : genB1('PF', pnoNum, m4, b1seq);
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
 * L1 데이터 채움: C2(기능)+C3(요구사항) parentItemId FK 기반, C4(고장영향) = reqId 연결
 *
 * C3 → parentItemId로 C2에 직접 매칭. orphan인 경우만 위치 기반 fallback.
 *
 * ★ C4 = reqId FK — 각 고장영향이 특정 요구사항에 연결
 *   배분: 순차 블록 (앞쪽 R-extra 요구사항: baseShare개, 나머지: baseShare+1개)
 */
function fillL1Data(l1: L1Data, cItems: ImportedFlatData[], flatMap?: FlatToEntityMap): void {
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
          id: c4.id?.startsWith('PF-') ? c4.id : genC4('PF', div, c2seq, 1, c4seq),
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
        requirements: c3Items.map(c3 => { c3seq++; return { id: c3.id?.startsWith('PF-') ? c3.id : genC3('PF', div, c2seq, c3seq), name: c3.value, ...rev(c3) }; }),
      }];
    } else {
      // C2 기능 생성
      const funcs: L1Function[] = c2Items.map(c2 => {
        c2seq++;
        return {
          id: c2.id?.startsWith('PF-') ? c2.id : genC2('PF', div, c2seq),
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
          func.requirements = myC3.map(c3 => { c3seq++; return { id: c3.id?.startsWith('PF-') ? c3.id : genC3('PF', div, i + 1, c3seq), name: c3.value, ...rev(c3) }; });
        });
        // parentItemId 미설정 C3 → orphan 처리 (마지막 func에 추가)
        const allParents = new Set([
          ...c2Items.map(c2 => c2.id),                       // UUID 포맷
          ...funcs.map((_, i) => `C2-${type.name}-${i}`),   // 레거시 키 포맷
        ]);
        const orphanC3 = c3Items.filter(c3 => !c3.parentItemId || !allParents.has(c3.parentItemId));
        if (orphanC3.length > 0 && funcs.length > 0) {
          console.warn(`[buildWorksheetState] 고아 C3 ${orphanC3.length}건 (div="${div}") — 처리 중`);
          orphanC3.forEach(c3 => console.warn(`  C3 orphan: "${c3.value?.substring(0,40)}" parentItemId="${c3.parentItemId || 'null'}"`));
          const isAllOrphan = orphanC3.length === c3Items.length;
          if (isAllOrphan && funcs.length > 1) {
            // 모든 C3가 orphan(parentItemId=NULL) → C2에 균등 배분
            const M = funcs.length, N = orphanC3.length;
            const base = Math.floor(N / M), extra = N % M;
            let cIdx = 0;
            for (let fi = 0; fi < M; fi++) {
              const share = fi < extra ? base + 1 : base;
              c3seq = 0;
              for (let si = 0; si < share; si++) {
                c3seq++;
                const c3 = orphanC3[cIdx++];
                funcs[fi].requirements.push({ id: c3.id?.startsWith('PF-') ? c3.id : genC3('PF', div, fi + 1, c3seq), name: c3.value, ...rev(c3) });
              }
            }
          } else {
            // 일부 orphan → 마지막 C2에 배정
            const lastFunc = funcs[funcs.length - 1];
            orphanC3.forEach(c3 => { c3seq++; lastFunc.requirements.push({ id: c3.id?.startsWith('PF-') ? c3.id : genC3('PF', div, c2seq, c3seq), name: c3.value, ...rev(c3) }); });
          }
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
          id: c4Items[ri].id?.startsWith('PF-') ? c4Items[ri].id : genC4('PF', div, c2seq, c3seq > 0 ? ri + 1 : 1, c4seq),
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
            id: c4Items[ei].id?.startsWith('PF-') ? c4Items[ei].id : genC4('PF', div, c2seq, c3seq > 0 ? R : 1, c4seq),
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
          id: c4.id?.startsWith('PF-') ? c4.id : genC4('PF', div, c2seq || 1, 1, c4seq),
          name: c4.value,
          ...rev(c4),
          scope: type.name,
          effect: c4.value,
        });
      }
    }
  }

  // ★ flatId→entityId 매핑: C4 flatData.id → FE entity.id
  if (flatMap) {
    const allC4 = cItems.filter(d => d.itemCode === 'C4');
    const allFE = l1.failureScopes || [];
    for (let fi = 0; fi < allC4.length && fi < allFE.length; fi++) {
      if (allC4[fi].id) flatMap.fe.set(allC4[fi].id, allFE[fi].id);
    }
  }
}

/**
 * L2 데이터 채움: A3+A4(1:N), A5(고장형태 → A4 FK 기반 꽂아넣기)
 *
 * 2L 기능 화면: A3(공정기능) 병합 + A4(제품특성) N개
 * → 각 A3 function이 같은 UUID의 A4를 참조 (카테시안 아님)
 * → A5: parentItemId FK로 A4에 직접 매핑, 없으면 위치 기반 fallback
 */
function fillL2Data(process: Process, items: ImportedFlatData[], flatMap?: FlatToEntityMap): void {
  const a3Items = byCode(items, 'A3');
  const a4Items = byCode(items, 'A4');
  const a5Items = byCode(items, 'A5');
  const pnoNum = parseInt(process.no) || 0;

  // ★★★ 2026-03-15 FIX: UUID 공유 참조 패턴 (카테시안 금지) ★★★
  if (a3Items.length === 0 && a4Items.length > 0) {
    process.functions = [{
      id: genA3('PF', pnoNum, 1),
      name: '',
      productChars: a4Items.map((a4, i) => ({ id: a4.id?.startsWith('PF-') ? a4.id : genA4('PF', pnoNum, i + 1), name: a4.value, ...rev(a4), specialChar: a4.specialChar || '' })),
    }];
  } else if (a3Items.length > 0) {
    if (a4Items.length > 0) {
      // ★ A4 엔티티를 한 번만 생성 (공유 UUID)
      const sharedPCs = a4Items.map((a4, i) => ({
        id: a4.id?.startsWith('PF-') ? a4.id : genA4('PF', pnoNum, i + 1),
        name: a4.value,
        ...rev(a4),
        specialChar: (a4 as unknown as { specialChar?: string }).specialChar || ''
      }));
      // ★ 모든 A3 function이 같은 UUID의 A4를 참조 (카테시안 아님 — ID 동일)
      process.functions = a3Items.map((a3, ai) => ({
        id: a3.id?.startsWith('PF-') ? a3.id : genA3('PF', pnoNum, ai + 1),
        name: a3.value,
        ...rev(a3),
        productChars: sharedPCs.map(pc => ({ ...pc })),
      }));
    } else {
      // A4 없으면 각 function에 placeholder 생성
      process.functions = a3Items.map((a3, ai) => ({
        id: a3.id?.startsWith('PF-') ? a3.id : genA3('PF', pnoNum, ai + 1),
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
    // ★★★ 2026-03-17 FIX: parentItemId 기반 + 위치 기반 fallback ★★★
    // 1차: parentItemId → A4 인덱스 매핑
    // 2차: parentItemId 없으면 위치 기반 균등 배분 (A4=A5 → 1:1, A4<A5 → 균등)
    const a4IdToIdx = new Map<string, number>();
    a4Items.forEach((a4, i) => { if (a4.id) a4IdToIdx.set(a4.id, i); });

    // 위치 기반 배분 테이블: a5Index → pcIndex
    const positionalMap = new Map<number, number>();
    if (uniquePCs.length > 0) {
      const perPC = Math.max(1, Math.floor(a5Items.length / uniquePCs.length));
      for (let i = 0; i < a5Items.length; i++) {
        const pcIdx = Math.min(Math.floor(i / perPC), uniquePCs.length - 1);
        positionalMap.set(i, pcIdx);
      }
    }

    let a5seq = 0;
    const modes: L2FailureMode[] = [];
    for (let i = 0; i < a5Items.length; i++) {
      const a5 = a5Items[i];
      a5seq++;
      let pcIdx = 0; // 최종 fallback: 첫 번째 PC
      if (a5.parentItemId) {
        const mapped = a4IdToIdx.get(a5.parentItemId);
        if (mapped !== undefined && mapped < uniquePCs.length) {
          pcIdx = mapped;
        } else {
          // parentItemId가 있지만 매칭 실패 → 위치 기반 fallback
          pcIdx = positionalMap.get(i) ?? 0;
        }
      } else {
        // parentItemId 없음 → 위치 기반 fallback
        pcIdx = positionalMap.get(i) ?? 0;
      }
      const entityId = a5.id?.startsWith('PF-') ? a5.id : genA5('PF', pnoNum, a5seq);
      modes.push({
        id: entityId,
        name: a5.value,
        ...rev(a5),
        productCharId: uniquePCs[pcIdx].id,
      });
      // ★ flatId→entityId 매핑 기록 (결정론적 chain 연결용)
      if (flatMap && a5.id) flatMap.fm.set(a5.id, entityId);
    }
    process.failureModes = modes;
  } else {
    // 제품특성 없으면 productCharId 없이 생성
    let a5seq = 0;
    process.failureModes = a5Items.map(a5 => {
      a5seq++;
      const entityId = a5.id?.startsWith('PF-') ? a5.id : genA5('PF', pnoNum, a5seq);
      if (flatMap && a5.id) flatMap.fm.set(a5.id, entityId);
      return { id: entityId, name: a5.value, ...rev(a5) };
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
 * L3 데이터 채움: B2+B3+B4 → parentItemId FK 기반 WE 직접 꽂아넣기
 *
 * 통합시트에서 파싱된 B2/B3는 parentItemId로 소속 B1(WE)이 확정됨.
 * parentItemId → B1 UUID → WE ID 매핑으로 정확한 WE에 직접 배치.
 * B4(고장원인)는 processCharId FK로 B3에 직접 연결.
 */
function fillL3Data(process: Process, items: ImportedFlatData[], b1IdToWeId?: B1IdMapping, flatMap?: FlatToEntityMap): void {
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

  // ★★★ 2026-03-17: parentItemId 기반 직접 꽂기 (distribute/nameMatchDistribute 제거) ★★★
  // 통합시트에서 파싱된 B2/B3는 모두 parentItemId로 소속 WE가 확정되어 있음
  // parentItemId → B1 UUID → WE ID 매핑으로 정확한 WE에 직접 배치

  const weIdToIdx = new Map<string, number>();
  process.l3.forEach((we, idx) => weIdToIdx.set(we.id, idx));

  // parentItemId → WE index 매핑
  function mapToWeIdx(dataItems: ImportedFlatData[]): Map<number, ImportedFlatData[]> {
    const byWe = new Map<number, ImportedFlatData[]>();
    for (const item of dataItems) {
      let weIdx = -1;
      if (item.parentItemId && b1IdToWeId) {
        const weId = b1IdToWeId.get(item.parentItemId);
        if (weId) {
          const idx = weIdToIdx.get(weId);
          if (idx !== undefined) weIdx = idx;
        }
      }
      if (weIdx < 0) {
        // parentItemId 매칭 실패 → m4 기준으로 첫 WE에 꽂기
        const itemM4 = item.m4 || '';
        for (let i = 0; i < process.l3.length; i++) {
          if ((process.l3[i].m4 || '') === itemM4) { weIdx = i; break; }
        }
        if (weIdx < 0) weIdx = 0;
      }
      if (!byWe.has(weIdx)) byWe.set(weIdx, []);
      byWe.get(weIdx)!.push(item);
    }
    return byWe;
  }

  const b2ByWe = mapToWeIdx(b2Items);
  const b3ByWe = mapToWeIdx(b3Items);

  process.l3.forEach((we, weIdx) => {
      const myB2 = b2ByWe.get(weIdx) || [];
      const myB3 = b3ByWe.get(weIdx) || [];

      // ★★★ 2026-03-01: B3 부족 시 복제 금지 → 빈 processChar 유지 ★★★
      // 이전: m4 그룹 마지막 B3 재사용 → Import(129) < DB(130), +1 불일치
      // 수정: B3 없는 WE는 빈 processChar로 유지 (Import=DB 일치)
      const effectiveB3 = myB3;

      const { m4: weM4, b1seq: weB1seq } = parseWeId(we.id);
      if (myB2.length > 0) {
        if (myB2.length === 1) {
          we.functions = [{
            id: myB2[0].id?.startsWith('PF-') ? myB2[0].id : genB2('PF', pnoNum, weM4, weB1seq),
            name: myB2[0].value,
            ...rev(myB2[0]),
            processChars: effectiveB3.map(b3 => { const cs = (weCharSeqMap.get(we.id) || 0) + 1; weCharSeqMap.set(we.id, cs); return { id: b3.id?.startsWith('PF-') ? b3.id : genB3('PF', pnoNum, weM4, weB1seq, cs), name: b3.value, ...rev(b3), specialChar: b3.specialChar || '' }; }),
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
            id: fIdx === 0
              ? (b2.id?.startsWith('PF-') ? b2.id : genB2('PF', pnoNum, weM4, weB1seq))
              : (b2.id?.startsWith('PF-') ? b2.id : `${genB1('PF', pnoNum, weM4, weB1seq)}-G-${String(fIdx + 1).padStart(3, '0')}`),
            name: b2.value,
            ...rev(b2),
            processChars: (b3ByParent.get(fIdx) || []).map(b3 => { const cs = (weCharSeqMap.get(we.id) || 0) + 1; weCharSeqMap.set(we.id, cs); return { id: b3.id?.startsWith('PF-') ? b3.id : genB3('PF', pnoNum, weM4, weB1seq, cs), name: b3.value, ...rev(b3), specialChar: b3.specialChar || '' }; }),
          }));
        }
      } else if (effectiveB3.length > 0) {
        we.functions = [{
          id: genB2('PF', pnoNum, weM4, weB1seq),
          name: '',
          processChars: effectiveB3.map(b3 => { const cs = (weCharSeqMap.get(we.id) || 0) + 1; weCharSeqMap.set(we.id, cs); return { id: b3.id?.startsWith('PF-') ? b3.id : genB3('PF', pnoNum, weM4, weB1seq, cs), name: b3.value, ...rev(b3), specialChar: b3.specialChar || '' }; }),
        }];
      }
      if (we.functions.length === 0) {
        we.functions = [{ id: genB2('PF', pnoNum, weM4, weB1seq), name: '', processChars: [] }];
      }

    });

  // ★★★ 2026-03-17: m4 불일치 / 크로스-m4 보정 블록 제거 ★★★
  // 통합시트에서 parentItemId로 모든 B2/B3가 정확한 WE에 배치되므로
  // 기존 m4 불일치 재분배, 크로스-m4 이름 매칭 보정 코드 불필요

  // ★ B4: 고장원인 → Process.failureCauses (processCharId FK 기반 꽂아넣기)
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
        const entityId = b4.id?.startsWith('PF-') ? b4.id : genB4('PF', pnoNum, b4.m4 || pcParsed.m4, pcParsed.b1seq, kseq);
        causes.push({
          id: entityId,
          name: b4.value,
          ...rev(b4),
          m4: b4.m4,
          processCharId: targetPc.id,
        } as L3FailureCauseExtended);
        if (flatMap && b4.id) flatMap.fc.set(b4.id, entityId);
      }
    } else if (m4PCs.length === 0 && m4B4.length > 0) {
      // ★★★ 2026-03-03: m4 불일치 → fallback 대상에 추가 ★★★
      unmatchedB4.push(...m4B4);
    }
  }

  // m4 불일치 B4 → 첫 PC에 꽂아넣기 (fallback)
  if (unmatchedB4.length > 0 && allProcessChars.length > 0) {
    // ★★★ 2026-03-16 FIX: distribute → 첫 PC에 전부 꽂아넣기 (m4 불일치 fallback)
    // 배분하면 데이터 없는 PC에도 강제 할당 → 거짓 누락행 발생
    const firstPc = allProcessChars[0];
    const fpParsed = parseWeId(firstPc.id);
    const fpWeId = genB1('PF', pnoNum, fpParsed.m4, fpParsed.b1seq);
    for (const b4 of unmatchedB4) {
      const kseq = (weKseqMap.get(fpWeId) || 0) + 1;
      weKseqMap.set(fpWeId, kseq);
      const entityId = b4.id?.startsWith('PF-') ? b4.id : genB4('PF', pnoNum, b4.m4 || fpParsed.m4, fpParsed.b1seq, kseq);
      causes.push({
        id: entityId,
        name: b4.value,
        ...rev(b4),
        m4: b4.m4,
        processCharId: firstPc.id,
      } as L3FailureCauseExtended);
      if (flatMap && b4.id) flatMap.fc.set(b4.id, entityId);
    }
  } else if (unmatchedB4.length > 0) {
    const lateProcessChars: { id: string; name: string }[] = [];
    for (const we of process.l3) {
      for (const func of we.functions) {
        for (const pc of (func.processChars || [])) {
          lateProcessChars.push(pc);
        }
      }
    }

    if (lateProcessChars.length > 0) {
      const firstPc = lateProcessChars[0];
      const fpParsed = parseWeId(firstPc.id);
      const fpWeId = genB1('PF', pnoNum, fpParsed.m4, fpParsed.b1seq);
      for (const b4 of unmatchedB4) {
        const kseq = (weKseqMap.get(fpWeId) || 0) + 1;
        weKseqMap.set(fpWeId, kseq);
        const entityId = b4.id?.startsWith('PF-') ? b4.id : genB4('PF', pnoNum, b4.m4 || fpParsed.m4, fpParsed.b1seq, kseq);
        causes.push({
          id: entityId,
          name: b4.value,
          ...rev(b4),
          m4: b4.m4,
          processCharId: firstPc.id,
        } as L3FailureCauseExtended);
        if (flatMap && b4.id) flatMap.fc.set(b4.id, entityId);
      }
    } else {
      let fallbackKseq = 0;
      for (const b4 of unmatchedB4) {
        fallbackKseq++;
        const entityId = b4.id?.startsWith('PF-') ? b4.id : genB4('PF', pnoNum, b4.m4 || '', 1, fallbackKseq);
        causes.push({
          id: entityId,
          name: b4.value,
          ...rev(b4),
          m4: b4.m4,
        } as L3FailureCauseExtended);
        if (flatMap && b4.id) flatMap.fc.set(b4.id, entityId);
      }
    }
  }
  // ★★★ 2026-03-17 FIX: orphan processChar → placeholder FC 자동 생성 (B4 유무 관계없이)
  // 근본원인: 엑셀에 B4가 processChar보다 적으면 남은 PC가 FC 없이 "고장원인 선택"으로 표시됨.
  // 이전: b4Items.length === 0 일 때만 placeholder 생성 → B4가 1건이라도 있으면 나머지 PC 방치
  // 수정: B4 배분 완료 후, FC가 없는 모든 processChar에 "{PC이름} 부적합" placeholder 생성
  {
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
  // ★★★ 2026-03-17: flatId→entityId 매핑 (결정론적 chain 연결용) ★★★
  const flatMap: FlatToEntityMap = { fm: new Map(), fc: new Map(), fe: new Map() };
  fillL1Data(l1, cItems, flatMap);

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
    fillL2Data(proc, processItems, flatMap);
    fillL3Data(proc, processItems, b1IdMaps.get(proc.no), flatMap);
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

    // ★★★ 2026-03-17: Phase 2.5 — flatId 기반 결정론적 UUID FK 할당 ★★★
    // 1차: chain.fmFlatId/fcFlatId/feFlatId → flatMap → entityId (100% 결정론적)
    // 2차: 텍스트 매칭 fallback (flatId 없는 레거시 chain 대응)
    assignEntityUUIDsToChains(state, config.chains, flatMap);

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
    flatMap,
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
