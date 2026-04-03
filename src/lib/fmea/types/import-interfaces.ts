/**
 * Import → Atomic 저장 경계용 타입 정의 (점진 적용용, CODEFREEZE 보호)
 * @see docs/Import 파이프라인 방어선.md 작업 9
 */

/** DB 저장 결과 — dedupKey → 확정 UUID 매핑 (설계 스케치) */
export interface SavedEntityMap {
  st_l1_id: string;
  st_l2_map: Map<string, string>;
  st_l3_map: Map<string, string>;
  fn_l1_map: Map<string, string>;
  fn_l2_map: Map<string, string>;
  fn_l3_map: Map<string, string>;
}
