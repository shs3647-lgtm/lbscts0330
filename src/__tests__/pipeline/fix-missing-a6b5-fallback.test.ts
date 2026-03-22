import { beforeEach, describe, expect, it, vi } from 'vitest';

const publicPrisma = {
  pfmeaMasterDataset: {
    findFirst: vi.fn(async () => ({ id: 'ds-1' })),
  },
  pfmeaMasterFlatItem: {
    findMany: vi.fn(async ({ where }: { where: { itemCode: string } }) => {
      if (where.itemCode === 'A6') return [{ processNo: '10', value: '공정검사' }];
      if (where.itemCode === 'B5') return [{ processNo: '10', value: '작업표준 준수' }];
      return [];
    }),
  },
};

vi.mock('@/lib/prisma', () => ({
  getPrisma: vi.fn(() => publicPrisma),
}));

describe('pipeline fixMissing A6/B5 fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('peer DC/PC가 모두 비어 있어도 public flat A6/B5로 RA를 채워야 한다', async () => {
    const updates: Array<{ id: string; data: Record<string, unknown> }> = [];
    const prisma = {
      riskAnalysis: {
        findMany: vi.fn(async () => [
          { id: 'ra-1', linkId: 'fl-1', severity: 8, occurrence: 4, detection: 6, ap: 'M', detectionControl: '', preventionControl: '' },
        ]),
        update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          updates.push({ id: where.id, data });
          return { id: where.id, ...data };
        }),
      },
      failureLink: {
        findMany: vi.fn(async () => [
          { id: 'fl-1', fmId: 'fm-1', fcId: 'fc-1', feId: 'fe-1' },
        ]),
      },
      failureMode: {
        findMany: vi.fn(async () => [
          { id: 'fm-1', l2StructId: 'l2-10' },
        ]),
      },
      l2Structure: {
        findMany: vi.fn(async () => [
          { id: 'l2-10', no: '10' },
        ]),
      },
      optimization: {
        findMany: vi.fn(async () => []),
        deleteMany: vi.fn(async () => ({ count: 0 })),
      },
    };

    const { fixMissing } = await import('@/app/api/fmea/pipeline-verify/auto-fix');
    const fixed = await fixMissing(prisma as any, 'pfm26-m001');

    expect(updates).toHaveLength(1);
    expect(updates[0].data.detectionControl).toBe('공정검사');
    expect(updates[0].data.preventionControl).toBe('작업표준 준수');
    expect(fixed.some(msg => msg.includes('DC 자동채움'))).toBe(true);
    expect(fixed.some(msg => msg.includes('PC 자동채움'))).toBe(true);
  });
});
