/**
 * @file assignChainUUIDs.ts
 * @description 고장체인에 flatData.id → 엔티티 UUID 매핑(0단계, 결정론적).
 * 대형 텍스트 폴백 로직은 import 파이프라인 리팩터(17a4d65)에서 제거됨.
 * 워크시트·레거시 Import에서 체인이 이미 fmId/fcId/feId로 채워진 경우 조기 반환.
 */
import type { MasterFailureChain } from '../types/masterFailureChain';
import type { WorksheetState } from '@/app/(fmea-core)/pfmea/worksheet/constants';
import type { FlatToEntityMap } from '@/lib/import/importJobManager';

export function assignEntityUUIDsToChains(
  _state: WorksheetState,
  chains: MasterFailureChain[],
  flatMap?: FlatToEntityMap,
): void {
  const n = chains.length;
  if (n === 0) return;
  const pre = chains.filter((c) => c.fmId && c.fcId && c.feId).length;
  if (pre === n) return;
  if (!flatMap) return;

  for (const c of chains) {
    if (c.fmFlatId && flatMap.fm.has(c.fmFlatId)) {
      c.fmId = flatMap.fm.get(c.fmFlatId)!;
    }
    if (c.fcFlatId && flatMap.fc.has(c.fcFlatId)) {
      c.fcId = flatMap.fc.get(c.fcFlatId)!;
    }
    if (c.feFlatId && flatMap.fe.has(c.feFlatId)) {
      c.feId = flatMap.fe.get(c.feFlatId)!;
    }
  }
}
