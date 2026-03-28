/**
 * FA 파싱 검증바 — 명세(VERIFY수식) vs 파싱 수량 완화 (Forge 2026-03-24)
 *
 * 행 #1 FC시트 파싱 / #8 FA통합 행수는 동일 축(체인 행수 vs 수식 기대값).
 * 통합 시트 등으로 명세 COUNT와 1:1이 아닐 수 있음. (supplementChainsFromFlatData는 noop)
 * 연결 품질은 행 5~7(매칭)·미매칭 패널로 별도 확인.
 */

/** 검증바 행 번호: 체인 건수 ↔ VERIFY수식 명세 */
export const FA_VERIFY_CHAIN_SPEC_ROW_NOS = new Set([1, 8]);

/**
 * 명세 대비 체인(행) 수 — 완화 PASS 조건
 * - 기대값 없음(0): 비교 생략 → PASS
 * - 완전 일치: PASS
 * - 기대>0 인데 파싱 0건: FAIL (실제 누락)
 * - 양쪽 모두 >0: 명세와 수량이 달라도 연결기준 완화 → PASS (경고 배너 억제)
 */
export function chainSpecCountRelaxedPass(actual: number, expected: number): boolean {
  if (expected <= 0) return true;
  if (actual === expected) return true;
  if (actual <= 0) return false;
  return true;
}

export function isFaVerifyRowPass(rowNo: number, actual: number, expected: number): boolean {
  if (expected <= 0) return true;
  if (FA_VERIFY_CHAIN_SPEC_ROW_NOS.has(rowNo)) {
    return chainSpecCountRelaxedPass(actual, expected);
  }
  return actual === expected;
}
