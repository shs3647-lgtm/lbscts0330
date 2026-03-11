import type { WorksheetState } from '../constants';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

/** FailureLink 타입 */
interface FailureLinkRecord {
  fmId?: string;
  fmText?: string;
  fmProcess?: string;
  feId?: string;
  feText?: string;
  feScope?: string;
  fcId?: string;
  fcText?: string;
  fcProcess?: string;
  cache?: AnyRecord;
}

export const buildLegacySaveData = ({
  stateSnapshot,
  fmeaId,
  normalizeFailureLinks,
  l1Override,
}: {
  stateSnapshot: WorksheetState;
  fmeaId: string;
  normalizeFailureLinks: (links: FailureLinkRecord[], snapshot: WorksheetState) => FailureLinkRecord[];
  l1Override?: WorksheetState['l1'];
}): AnyRecord => {
  const snapshotAny = stateSnapshot as AnyRecord;
  const normalizedFailureLinks = normalizeFailureLinks(snapshotAny.failureLinks || [], stateSnapshot);
  return {
    fmeaId,
    l1: l1Override ?? stateSnapshot.l1,
    l2: stateSnapshot.l2,
    failureLinks: normalizedFailureLinks,
    structureConfirmed: snapshotAny.structureConfirmed || false,
    l1Confirmed: snapshotAny.l1Confirmed || false,
    l2Confirmed: snapshotAny.l2Confirmed || false,
    l3Confirmed: snapshotAny.l3Confirmed || false,
    failureL1Confirmed: snapshotAny.failureL1Confirmed || false,
    failureL2Confirmed: snapshotAny.failureL2Confirmed || false,
    failureL3Confirmed: snapshotAny.failureL3Confirmed || false,
    failureLinkConfirmed: snapshotAny.failureLinkConfirmed || false,
    riskData: stateSnapshot.riskData || {},
  };
};

