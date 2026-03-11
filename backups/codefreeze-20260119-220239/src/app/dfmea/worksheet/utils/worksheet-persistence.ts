// @ts-nocheck
import type { WorksheetState } from '../constants';

export const buildLegacySaveData = ({
  stateSnapshot,
  fmeaId,
  normalizeFailureLinks,
  l1Override,
}: {
  stateSnapshot: WorksheetState;
  fmeaId: string;
  normalizeFailureLinks: (links: any[], snapshot: WorksheetState) => any[];
  l1Override?: WorksheetState['l1'];
}) => {
  const normalizedFailureLinks = normalizeFailureLinks((stateSnapshot as any).failureLinks || [], stateSnapshot);
  return {
    fmeaId,
    l1: l1Override ?? stateSnapshot.l1,
    l2: stateSnapshot.l2,
    failureLinks: normalizedFailureLinks,
    structureConfirmed: (stateSnapshot as any).structureConfirmed || false,
    l1Confirmed: (stateSnapshot as any).l1Confirmed || false,
    l2Confirmed: (stateSnapshot as any).l2Confirmed || false,
    l3Confirmed: (stateSnapshot as any).l3Confirmed || false,
    failureL1Confirmed: (stateSnapshot as any).failureL1Confirmed || false,
    failureL2Confirmed: (stateSnapshot as any).failureL2Confirmed || false,
    failureL3Confirmed: (stateSnapshot as any).failureL3Confirmed || false,
    failureLinkConfirmed: (stateSnapshot as any).failureLinkConfirmed || false,
    riskData: stateSnapshot.riskData || {},
  };
};
