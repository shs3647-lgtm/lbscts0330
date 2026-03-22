import { beforeEach, describe, expect, it, vi } from 'vitest';

const tx = {
  riskAnalysis: { deleteMany: vi.fn(), createMany: vi.fn() },
  failureLink: { deleteMany: vi.fn(), createMany: vi.fn() },
  failureAnalysis: { deleteMany: vi.fn() },
  failureEffect: { deleteMany: vi.fn(), createMany: vi.fn() },
  failureMode: { deleteMany: vi.fn(), createMany: vi.fn() },
  failureCause: { deleteMany: vi.fn(), createMany: vi.fn() },
  l1Requirement: { deleteMany: vi.fn() },
  l1Function: { deleteMany: vi.fn(), createMany: vi.fn() },
  processProductChar: { deleteMany: vi.fn(), createMany: vi.fn() },
  l2Function: { deleteMany: vi.fn(), createMany: vi.fn() },
  l3Function: { deleteMany: vi.fn(), createMany: vi.fn() },
  l1Structure: { deleteMany: vi.fn(), create: vi.fn() },
  l2Structure: { deleteMany: vi.fn(), createMany: vi.fn() },
  l3Structure: { deleteMany: vi.fn(), createMany: vi.fn() },
};

const prisma = {
  $transaction: vi.fn(async (callback: (mockTx: typeof tx) => Promise<void>) => callback(tx)),
  l1Function: { count: vi.fn(async () => 1) },
  l2Structure: { count: vi.fn(async () => 3) },
  l3Structure: { count: vi.fn(async () => 10) },
  failureMode: { count: vi.fn(async () => 5) },
  failureCause: { count: vi.fn(async () => 12) },
  failureEffect: { count: vi.fn(async () => 4) },
  failureLink: { count: vi.fn(async () => 12) },
  riskAnalysis: { count: vi.fn(async () => 12) },
};

vi.mock('@/lib/security', () => ({
  isValidFmeaId: vi.fn(() => true),
  safeErrorMessage: vi.fn((error: unknown) => (error instanceof Error ? error.message : String(error))),
}));

vi.mock('@/lib/prisma', () => ({
  getBaseDatabaseUrl: vi.fn(() => 'postgresql://test'),
  getPrismaForSchema: vi.fn(() => prisma),
}));

vi.mock('@/lib/project-schema', () => ({
  ensureProjectSchemaReady: vi.fn(async () => undefined),
  getProjectSchemaName: vi.fn(() => 'pfmea_test_schema'),
}));

vi.mock('@/lib/import/importJobManager', () => ({
  createImportJobData: vi.fn(() => ({ id: 'job-1' })),
  serializeFlatMap: vi.fn(() => []),
}));

vi.mock('@/app/(fmea-core)/pfmea/import/utils/parseValidationPipeline', () => ({
  runParseValidationPipeline: vi.fn(() => ({
    fixes: [],
    summary: { failed: 0, passed: 1, total: 1 },
    itemCodeCounts: {},
    criteria: [],
    issues: [],
  })),
  formatValidationReport: vi.fn(() => 'ok'),
}));

vi.mock('@/app/(fmea-core)/pfmea/import/utils/buildAtomicFromFlat', () => ({
  buildAtomicFromFlat: vi.fn(() => ({
    l1Structure: { id: 'l1-1', name: '완제품' },
    l1Functions: [{ id: 'c2-1', l1StructId: 'l1-1', category: 'YP', functionName: '기능', requirement: '요구사항' }],
    l2Structures: [{ id: 'l2-1', l1Id: 'l1-1', no: '10', name: '공정', order: 1 }],
    l3Structures: [{ id: 'l3-1', l1Id: 'l1-1', l2Id: 'l2-1', m4: 'MC', name: '설비', order: 1 }],
    l2Functions: [{ id: 'a3-1', l2StructId: 'l2-1', functionName: '공정기능', productChar: '제품특성', specialChar: null }],
    l3Functions: [{ id: 'b3-1', l3StructId: 'l3-1', l2StructId: 'l2-1', functionName: '요소기능', processChar: '공정특성', specialChar: null }],
    failureModes: [{ id: 'fm-1', l2FuncId: 'a3-1', l2StructId: 'l2-1', productCharId: 'pc-1', mode: '고장형태', specialChar: false }],
    failureCauses: [],
    failureEffects: [{ id: 'fe-1', l1FuncId: 'c2-1', category: 'YP', effect: '고장영향', severity: 8 }],
    failureLinks: [],
    riskAnalyses: [],
  })),
}));

describe('save-from-import destructive guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.l1Function.count.mockResolvedValue(1);
    prisma.l2Structure.count.mockResolvedValue(3);
    prisma.l3Structure.count.mockResolvedValue(10);
    prisma.failureMode.count.mockResolvedValue(5);
    prisma.failureCause.count.mockResolvedValue(12);
    prisma.failureEffect.count.mockResolvedValue(4);
    prisma.failureLink.count.mockResolvedValue(12);
    prisma.riskAnalysis.count.mockResolvedValue(12);
  });

  it('기존 FL/RA가 있는데 신규 Atomic이 FC/FL/RA 0건이면 저장을 차단해야 한다', async () => {
    const { POST } = await import('@/app/api/fmea/save-from-import/route');

    const response = await POST({
      json: async () => ({
        fmeaId: 'pfm26-m001',
        l1Name: '완제품',
        flatData: [{ id: 'a1-1', processNo: '10', category: 'A', itemCode: 'A1', value: '10', createdAt: new Date() }],
        failureChains: [],
      }),
    } as any);

    expect(response.status).toBe(409);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.failureLink.deleteMany).not.toHaveBeenCalled();

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(String(body.error)).toContain('incomplete');
  });
});
