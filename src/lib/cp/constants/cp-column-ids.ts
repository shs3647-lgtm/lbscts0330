/**
 * @file cp-column-ids.ts
 * @description CP(관리계획서) 전용 itemCode 상수 — PFMEA A1~C4와 별개 체계
 *
 * ⚠️ CP의 A3~A5, B1~B5는 PFMEA와 완전히 다른 의미!
 *   - CP A3 = 레벨(Level)          vs PFMEA A3 = 공정기능
 *   - CP A5 = 설비(Equipment)      vs PFMEA A5 = 고장형태(FM)
 *   - CP B1 = 제품특성(ProductChar) vs PFMEA B1 = 작업요소(WE)
 *
 * DB 저장값은 'A3', 'B1' 등 기존 문자열 그대로 유지 (마이그레이션 없음).
 * 이 상수는 코드 내 가독성·검색·충돌 방지 목적.
 *
 * @see docs/CODE_NAMESPACE_MAP.md
 */

export const CP_ITEM_CODES = {
  // ── 공정정보 (processInfo) ──
  A1: 'A1',     // 공정번호 (processNo) — PFMEA와 동일
  A2: 'A2',     // 공정명 (processName) — PFMEA와 동일
  A3: 'A3',     // 레벨 (level) — ⚠️ PFMEA: 공정기능
  A4: 'A4',     // 공정설명 (processDesc) — ⚠️ PFMEA: 제품특성
  A5: 'A5',     // 설비/금형/지그 (equipment) — ⚠️ PFMEA: 고장형태

  // ── 검출장치 (detector) ──
  A6: 'A6',     // EP (Error Proof Y/N) — ⚠️ PFMEA: 검출관리
  A7: 'A7',     // 자동검사장치 (autoDetector) — CP 전용

  // ── 관리항목 (controlItem) ──
  B1: 'B1',     // 제품특성 (productChar) — ⚠️ PFMEA: 작업요소
  B2: 'B2',     // 공정특성 (processChar) — ⚠️ PFMEA: 요소기능
  B3: 'B3',     // 특별특성기호 (specialChar) — ⚠️ PFMEA: 공정특성
  B4: 'B4',     // 스펙/공차 (spec) — ⚠️ PFMEA: 고장원인

  // ── 관리방법 (controlMethod) ──
  B5: 'B5',     // 평가방법 (evalMethod) — ⚠️ PFMEA: 예방관리
  B6: 'B6',     // 샘플크기 (sampleSize) — CP 전용
  B7: 'B7',     // 주기 (frequency) — CP 전용
  B7_1: 'B7-1', // 관리방법 (controlMethod) — CP 전용
  B8: 'B8',     // 책임1 (owner1) — CP 전용
  B9: 'B9',     // 책임2 (owner2) — CP 전용

  // ── 대응계획 (reactionPlan) ──
  B10: 'B10',   // 대응계획 (reactionPlan) — CP 전용
} as const;

export type CpItemCode = typeof CP_ITEM_CODES[keyof typeof CP_ITEM_CODES];

/**
 * CP 필드 key → itemCode 매핑
 * useEditHandlers.ts, PreviewTable.tsx에서 중복되던 맵을 통합
 */
export const CP_KEY_TO_ITEM_CODE: Record<string, string> = {
  processNo: CP_ITEM_CODES.A1,
  processName: CP_ITEM_CODES.A2,
  level: CP_ITEM_CODES.A3,
  processDesc: CP_ITEM_CODES.A4,
  equipment: CP_ITEM_CODES.A5,
  ep: CP_ITEM_CODES.A6,
  autoDetector: CP_ITEM_CODES.A7,
  productChar: CP_ITEM_CODES.B1,
  processChar: CP_ITEM_CODES.B2,
  specialChar: CP_ITEM_CODES.B3,
  spec: CP_ITEM_CODES.B4,
  evalMethod: CP_ITEM_CODES.B5,
  sampleSize: CP_ITEM_CODES.B6,
  frequency: CP_ITEM_CODES.B7,
  controlMethod: CP_ITEM_CODES.B7_1,
  owner1: CP_ITEM_CODES.B8,
  owner2: CP_ITEM_CODES.B9,
  reactionPlan: CP_ITEM_CODES.B10,
};

/**
 * CP itemCode별 한글 라벨
 */
export const CP_ITEM_LABELS: Record<string, string> = {
  [CP_ITEM_CODES.A1]: '공정번호',
  [CP_ITEM_CODES.A2]: '공정명',
  [CP_ITEM_CODES.A3]: '레벨',
  [CP_ITEM_CODES.A4]: '공정설명',
  [CP_ITEM_CODES.A5]: '설비/금형/지그',
  [CP_ITEM_CODES.A6]: 'EP',
  [CP_ITEM_CODES.A7]: '자동검사장치',
  [CP_ITEM_CODES.B1]: '제품특성',
  [CP_ITEM_CODES.B2]: '공정특성',
  [CP_ITEM_CODES.B3]: '특별특성',
  [CP_ITEM_CODES.B4]: '스펙/공차',
  [CP_ITEM_CODES.B5]: '평가방법',
  [CP_ITEM_CODES.B6]: '샘플크기',
  [CP_ITEM_CODES.B7]: '주기',
  [CP_ITEM_CODES.B7_1]: '관리방법',
  [CP_ITEM_CODES.B8]: '책임1',
  [CP_ITEM_CODES.B9]: '책임2',
  [CP_ITEM_CODES.B10]: '대응계획',
};
