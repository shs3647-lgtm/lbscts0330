import { beforeEach, describe, expect, it, vi } from 'vitest';

const captured: { chains: any[] | null; flatData: any[] | null } = { chains: null, flatData: null };

const tx = {
  riskAnalysis: { deleteMany: vi.fn(async () => ({ count: 0 })), createMany: vi.fn(async () => ({ count: 1 })) },
  failureLink: { deleteMany: vi.fn(async () => ({ count: 0 })), createMany: vi.fn(async () => ({ count: 1 })) },
  failureAnalysis: { deleteMany: vi.fn(async () => ({ count: 0 })) },
  failureEffect: { deleteMany: vi.fn(async () => ({ count: 0 })), createMany: vi.fn(async () => ({ count: 1 })) },
  failureMode: { deleteMany: vi.fn(async () => ({ count: 0 })), createMany: vi.fn(async () => ({ count: 1 })) },
  failureCause: { deleteMany: vi.fn(async () => ({ count: 0 })), createMany: vi.fn(async () => ({ count: 1 })) },
  l1Requirement: { deleteMany: vi.fn(async () => ({ count: 0 })) },
  l1Function: { deleteMany: vi.fn(async () => ({ count: 0 })), createMany: vi.fn(async () => ({ count: 1 })) },
  processProductChar: { deleteMany: vi.fn(async () => ({ count: 0 })), createMany: vi.fn(async () => ({ count: 1 })) },
  l2Function: { deleteMany: vi.fn(async () => ({ count: 0 })), createMany: vi.fn(async () => ({ count: 1 })) },
  l3Function: { deleteMany: vi.fn(async () => ({ count: 0 })), createMany: vi.fn(async () => ({ count: 1 })) },
  l1Structure: { deleteMany: vi.fn(async () => ({ count: 0 })), create: vi.fn(async () => ({ id: 'l1-1' })) },
  l2Structure: { deleteMany: vi.fn(), createMany: vi.fn(() => ({ count: 1 })) },
  l3Structure: { deleteMany: vi.fn(), createMany: vi.fn(() => ({ count: 1 })) },
};

const prisma = {
  $transaction: vi.fn(async (callback: (mockTx: typeof tx) => Promise<void>) => callback(tx)),
  l1Function: { count: vi.fn(async () => 1) },
  l2Structure: { count: vi.fn(async () => 1) },
  l3Structure: { count: vi.fn(async () => 1) },
  failureMode: { count: vi.fn(async () => 1) },
  failureCause: { count: vi.fn(async () => 1) },
  failureEffect: { count: vi.fn(async () => 1) },
  failureLink: { count: vi.fn(async () => 1) },
  riskAnalysis: { count: vi.fn(async () => 1) },
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
  buildAtomicFromFlat: vi.fn((args: { chains: any[]; flatData: any[] }) => {
    captured.chains = args.chains;
    captured.flatData = args.flatData;
    return {
      l1Structure: { id: 'l1-1', name: '완제품' },
      l1Functions: [{ id: 'c2-1', l1StructId: 'l1-1', category: 'YP', functionName: '기능', requirement: '요구사항' }],
      l2Structures: [{ id: 'l2-1', l1Id: 'l1-1', no: '10', name: '공정', order: 1 }],
      l3Structures: [{ id: 'l3-1', l1Id: 'l1-1', l2Id: 'l2-1', m4: 'MC', name: '설비', order: 1 }],
      l2Functions: [{ id: 'a3-1', l2StructId: 'l2-1', functionName: '공정기능', productChar: '제품특성', specialChar: null }],
      l3Functions: [{ id: 'b3-1', l3StructId: 'l3-1', l2StructId: 'l2-1', functionName: '요소기능', processChar: '공정특성', specialChar: null }],
      failureModes: [{ id: 'fm-1', l2FuncId: 'a3-1', l2StructId: 'l2-1', productCharId: 'pc-1', mode: '고장형태', specialChar: false }],
      failureCauses: [{ id: 'fc-1', l3FuncId: 'b3-1', l3StructId: 'l3-1', l2StructId: 'l2-1', processCharId: 'b3-1', cause: '고장원인', occurrence: 4 }],
      failureEffects: [{ id: 'fe-1', l1FuncId: 'c2-1', category: 'YP', effect: '고장영향', severity: 8 }],
      failureLinks: [{ id: 'fl-1', fmId: 'fm-1', fcId: 'fc-1', feId: 'fe-1' }],
      riskAnalyses: [{ id: 'ra-1', linkId: 'fl-1', severity: 8, occurrence: 4, detection: 6, ap: 'M', preventionControl: '예방관리', detectionControl: '검출관리' }],
    };
  }),
}));

describe('save-from-import derived chain fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    captured.chains = null;
    captured.flatData = null;
  });

  it('failureChains가 비어도 flatData에서 유도 체인을 만들어 buildAtomicFromFlat에 전달해야 한다', async () => {
    const { POST } = await import('@/app/api/fmea/save-from-import/route');

    const response = await POST({
      json: async () => ({
        fmeaId: 'pfm26-f001',
        l1Name: '완제품',
        failureChains: [],
        flatData: [
          { id: 'a1-1', processNo: '10', category: 'A', itemCode: 'A1', value: '10', createdAt: new Date() },
          { id: 'a2-1', processNo: '10', category: 'A', itemCode: 'A2', value: '공정', createdAt: new Date() },
          { id: 'a3-1', processNo: '10', category: 'A', itemCode: 'A3', value: '공정기능', createdAt: new Date() },
          { id: 'a4-1', processNo: '10', category: 'A', itemCode: 'A4', value: '제품특성', parentItemId: 'a3-1', createdAt: new Date() },
          { id: 'a5-1', processNo: '10', category: 'A', itemCode: 'A5', value: '고장형태', createdAt: new Date() },
          { id: 'a6-1', processNo: '10', category: 'A', itemCode: 'A6', value: '검출관리', createdAt: new Date() },
          { id: 'b1-1', processNo: '10', category: 'B', itemCode: 'B1', value: '설비', m4: 'MC', createdAt: new Date() },
          { id: 'b4-1', processNo: '10', category: 'B', itemCode: 'B4', value: '고장원인', m4: 'MC', createdAt: new Date() },
          { id: 'b5-1', processNo: '10', category: 'B', itemCode: 'B5', value: '예방관리', m4: 'MC', createdAt: new Date() },
          { id: 'c4-1', processNo: 'YP', category: 'C', itemCode: 'C4', value: '고장영향', createdAt: new Date() },
        ],
      }),
    } as any);

    expect(response.status).toBe(200);
    expect(Array.isArray(captured.chains)).toBe(true);
    expect(captured.chains!.length).toBeGreaterThan(0);
    expect(captured.chains![0].fmValue).toBe('고장형태');
    expect(captured.chains![0].fcValue).toBe('고장원인');
    expect(captured.chains![0].feValue).toBe('고장영향');
    expect(captured.chains![0].dcValue).toBe('검출관리');
    expect(captured.chains![0].pcValue).toBe('예방관리');
  });

  it('failureChains가 있으면 flatData에 없는 B4/B5/A6를 체인 값으로 보강해야 한다', async () => {
    const { POST } = await import('@/app/api/fmea/save-from-import/route');

    const response = await POST({
      json: async () => ({
        fmeaId: 'pfm26-f001',
        l1Name: '완제품',
        failureChains: [
          {
            id: 'chain-1',
            processNo: '10',
            fcId: 'L3-R10-C7',
            workElement: '설비',
            fcValue: '전류 편차',
            pcValue: '표준작업',
            dcValue: '최종검사',
            fmValue: '도금 불량',
            feValue: '고장영향',
          },
        ],
        flatData: [
          { id: 'a1-1', processNo: '10', category: 'A', itemCode: 'A1', value: '10', createdAt: new Date() },
          { id: 'a2-1', processNo: '10', category: 'A', itemCode: 'A2', value: '공정', createdAt: new Date() },
          { id: 'a3-1', processNo: '10', category: 'A', itemCode: 'A3', value: '공정기능', createdAt: new Date() },
          { id: 'a4-1', processNo: '10', category: 'A', itemCode: 'A4', value: '제품특성', parentItemId: 'a3-1', createdAt: new Date() },
          { id: 'a5-1', processNo: '10', category: 'A', itemCode: 'A5', value: '도금 불량', createdAt: new Date() },
          { id: 'b1-1', processNo: '10', category: 'B', itemCode: 'B1', value: '설비', m4: 'MC', createdAt: new Date() },
          { id: 'L3-R10-C5-B3', processNo: '10', category: 'B', itemCode: 'B3', value: '전류', m4: 'MC', belongsTo: '설비', parentItemId: 'b1-1', createdAt: new Date() },
          { id: 'c4-1', processNo: 'YP', category: 'C', itemCode: 'C4', value: '고장영향', createdAt: new Date() },
        ],
      }),
    } as any);

    expect(response.status).toBe(200);
    expect(captured.flatData?.some(item => item.itemCode === 'B4' && item.id === 'L3-R10-C7' && item.value === '전류 편차')).toBe(true);
    expect(captured.flatData?.some(item => item.itemCode === 'B5' && item.value === '표준작업')).toBe(true);
    expect(captured.flatData?.some(item => item.itemCode === 'A6' && item.value === '최종검사')).toBe(true);
  });
});
