// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

type SnapshotCandidate = {
  label: string;
  data: AnyRecord;
  score: number;
};

export const scoreLegacySnapshot = (cand: AnyRecord | null | undefined): number => {
  if (!cand) return 0;
  let score = 0;
  const l1Name = String(cand.l1?.name || '').trim();
  if (l1Name) score += 50;
  const l2 = Array.isArray(cand.l2) ? cand.l2 : [];
  const meaningfulProcs = l2.filter((p: AnyRecord) => String(p?.name || p?.no || '').trim());
  score += meaningfulProcs.length * 20;
  const l3Count = l2.reduce((acc: number, p: AnyRecord) => acc + (Array.isArray(p?.l3) ? p.l3.length : 0), 0);
  score += l3Count * 5;
  const fmCount = l2.reduce((acc: number, p: AnyRecord) => acc + (Array.isArray(p?.failureModes) ? p.failureModes.length : 0), 0);
  const fcCount = l2.reduce((acc: number, p: AnyRecord) => acc + (Array.isArray(p?.failureCauses) ? p.failureCauses.length : 0), 0);
  score += (fmCount + fcCount) * 2;
  const feCount = Array.isArray(cand?.l1?.failureScopes) ? cand.l1.failureScopes.length : 0;
  score += feCount * 2;
  return score;
};

export const pickBestSnapshot = ({
  dbLegacyCandidate,
  atomicAsLegacy,
  localStorageLegacy,
  hasDbResponse,
}: {
  dbLegacyCandidate: AnyRecord | null | undefined;
  atomicAsLegacy: AnyRecord | null | undefined;
  localStorageLegacy: AnyRecord | null | undefined;
  hasDbResponse: boolean;
}): {
  candidates: SnapshotCandidate[];
  best: SnapshotCandidate;
  scores: { dbScore: number; localScore: number; atomicScore: number };
} => {
  const dbScore = scoreLegacySnapshot(dbLegacyCandidate);
  const localScore = scoreLegacySnapshot(localStorageLegacy);
  const atomicScore = scoreLegacySnapshot(atomicAsLegacy);

  const baseCandidates: SnapshotCandidate[] = [
    { label: 'dbLegacy', data: dbLegacyCandidate || {}, score: dbScore },
    { label: 'atomicAsLegacy', data: atomicAsLegacy || {}, score: atomicScore },
  ];

  let candidates: SnapshotCandidate[] = (hasDbResponse
    ? baseCandidates
    : [
        ...baseCandidates,
        { label: 'localStorageLegacy', data: localStorageLegacy || {}, score: localScore },
      ]).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const rank = (label: string) => (label === 'dbLegacy' ? 3 : label === 'atomicAsLegacy' ? 2 : 1);
    return rank(b.label) - rank(a.label);
  });

  if (dbLegacyCandidate) {
    candidates = [{ label: 'dbLegacy', data: dbLegacyCandidate, score: dbScore }];
  }

  return {
    candidates,
    best: candidates[0],
    scores: { dbScore, localScore, atomicScore },
  };
};

