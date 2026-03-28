/**
 * @file supplementChainsFromFlatData.ts
 * @description 과거: 메인시트 대비 FC시트 체인 건수를 multiset으로 보충 (FM/FC/FE 조합 양산).
 * @updated 2026-03-28 — **비활성화**: 고장사슬은 FC 시트(사실)에서만 생성. flat 대비 건수 맞추기용 합성 체인 금지 (Rule 0.5·1.6).
 */
import type { MasterFailureChain } from '../types/masterFailureChain';
import type { ImportedFlatData } from '../types';

export function supplementChainsFromFlatData(
  chains: MasterFailureChain[],
  _flatData: ImportedFlatData[],
): MasterFailureChain[] {
  return chains.slice();
}
