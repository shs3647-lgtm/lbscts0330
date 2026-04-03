/**
 * @file pfd-column-ids.ts
 * @description PFD(공정흐름도) 전용 itemCode 상수 — PFMEA A1~C4와 별개 체계
 *
 * ⚠️ PFD의 A3~A5, B1~B4는 PFMEA와 완전히 다른 의미!
 *   - PFD A3 = 공정설명(ProcessDesc) vs PFMEA A3 = 공정기능
 *   - PFD A4 = 작업요소(WorkElem)    vs PFMEA A4 = 제품특성
 *   - PFD A5 = 설비(Equipment)       vs PFMEA A5 = 고장형태(FM)
 *   - PFD B1 = 제품특별특성           vs PFMEA B1 = 작업요소(WE)
 *
 * DB 저장값은 'A3', 'B1' 등 기존 문자열 그대로 유지 (마이그레이션 없음).
 * 이 상수는 코드 내 가독성·검색·충돌 방지 목적.
 *
 * @see docs/CODE_NAMESPACE_MAP.md
 */

export const PFD_ITEM_CODES = {
  // ── 공정정보 (processInfo) ──
  A1: 'A1',     // 공정번호 (processNo) — PFMEA와 동일
  A2: 'A2',     // 공정명 (processName) — PFMEA와 동일
  A3: 'A3',     // 공정설명 (processDesc) — ⚠️ PFMEA: 공정기능
  A4: 'A4',     // 작업요소 (workElement) — ⚠️ PFMEA: 제품특성
  A5: 'A5',     // 설비/금형/지그 (equipment) — ⚠️ PFMEA: 고장형태

  // ── 특성정보 (characteristic) ──
  B1: 'B1',     // 제품특별특성 (productSC) — ⚠️ PFMEA: 작업요소
  B2: 'B2',     // 제품특성 (productChar) — ⚠️ PFMEA: 요소기능
  B3: 'B3',     // 공정특별특성 (processSC) — ⚠️ PFMEA: 공정특성
  B4: 'B4',     // 공정특성 (processChar) — ⚠️ PFMEA: 고장원인
} as const;

export type PfdItemCode = typeof PFD_ITEM_CODES[keyof typeof PFD_ITEM_CODES];

/**
 * PFD 필드 key → itemCode 매핑
 * useEditHandlers.ts, PreviewTable.tsx, constants.ts에서 중복되던 맵을 통합
 */
export const PFD_KEY_TO_ITEM_CODE: Record<string, string> = {
  processNo: PFD_ITEM_CODES.A1,
  processName: PFD_ITEM_CODES.A2,
  processDesc: PFD_ITEM_CODES.A3,
  workElement: PFD_ITEM_CODES.A4,
  equipment: PFD_ITEM_CODES.A5,
  productSpecialChar: PFD_ITEM_CODES.B1,
  productChar: PFD_ITEM_CODES.B2,
  processSpecialChar: PFD_ITEM_CODES.B3,
  processChar: PFD_ITEM_CODES.B4,
};

/**
 * PFD itemCode별 한글 라벨
 */
export const PFD_ITEM_LABELS: Record<string, string> = {
  [PFD_ITEM_CODES.A1]: '공정번호',
  [PFD_ITEM_CODES.A2]: '공정명',
  [PFD_ITEM_CODES.A3]: '공정설명',
  [PFD_ITEM_CODES.A4]: '작업요소',
  [PFD_ITEM_CODES.A5]: '설비/금형/지그',
  [PFD_ITEM_CODES.B1]: '제품특별특성',
  [PFD_ITEM_CODES.B2]: '제품특성',
  [PFD_ITEM_CODES.B3]: '공정특별특성',
  [PFD_ITEM_CODES.B4]: '공정특성',
};
