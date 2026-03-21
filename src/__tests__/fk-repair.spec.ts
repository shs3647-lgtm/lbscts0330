import { describe, it, expect, vi, beforeEach } from 'vitest';
import { repairFkIntegrity } from '@/lib/fmea-core/fk-repair';

const mockValidate = vi.fn();

vi.mock('@/app/api/fmea/validate-fk/route', () => ({
  runValidation: (...args: unknown[]) => mockValidate(...args),
}));

const emptyValidate = {
  success: true,
  fmeaId: 'pfm26-m100',
  allGreen: true,
  checks: [],
  summary: { total: 8, passed: 8, failed: 0 },
};

describe('repairFkIntegrity', () => {
  beforeEach(() => {
    mockValidate.mockResolvedValue(emptyValidate);
  });

  it('dryRun does not invoke $transaction', async () => {
    const prisma = {
      $transaction: vi.fn(),
      failureMode: {
        findMany: vi.fn().mockResolvedValue([{ id: 'fm1' }]),
      },
      failureCause: { findMany: vi.fn().mockResolvedValue([{ id: 'fc1' }]) },
      failureEffect: { findMany: vi.fn().mockResolvedValue([{ id: 'fe1' }]) },
      failureLink: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'fl1', fmId: 'fm1', fcId: 'fc1', feId: 'fe1' },
        ]),
      },
      riskAnalysis: { findMany: vi.fn().mockResolvedValue([]) },
      optimization: { findMany: vi.fn().mockResolvedValue([]) },
      processProductChar: { findMany: vi.fn().mockResolvedValue([{ id: 'pc1' }]) },
    };

    const r = await repairFkIntegrity(prisma as never, 'pfm26-m100', {
      dryRun: true,
      clearInvalidProductCharOnFm: false,
      deleteCrossProcessFailureLinks: false,
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(r.after).toBeNull();
    expect(mockValidate).toHaveBeenCalledTimes(1);
  });

  it('deletes broken FailureLink in transaction', async () => {
    mockValidate
      .mockResolvedValueOnce(emptyValidate)
      .mockResolvedValueOnce({ ...emptyValidate, allGreen: true });

    const prisma = {
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<void>) => {
        const tx = {
          optimization: { deleteMany: vi.fn() },
          riskAnalysis: { deleteMany: vi.fn() },
          failureLink: {
            deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          processProductChar: { findMany: vi.fn().mockResolvedValue([]) },
          failureMode: { findMany: vi.fn().mockResolvedValue([]), update: vi.fn() },
        };
        await fn(tx);
      }),
      failureMode: {
        findMany: vi.fn().mockResolvedValue([{ id: 'fm1' }]),
      },
      failureCause: { findMany: vi.fn().mockResolvedValue([{ id: 'fc1' }]) },
      failureEffect: { findMany: vi.fn().mockResolvedValue([{ id: 'fe1' }]) },
      failureLink: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'fl-bad', fmId: 'missing', fcId: 'fc1', feId: 'fe1' },
        ]),
      },
      riskAnalysis: { findMany: vi.fn().mockResolvedValue([]) },
      optimization: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const r = await repairFkIntegrity(prisma as never, 'pfm26-m100', {
      dryRun: false,
      clearInvalidProductCharOnFm: false,
      deleteCrossProcessFailureLinks: false,
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(r.deletedFailureLinkIds).toContain('fl-bad');
    expect(r.after).not.toBeNull();
    expect(mockValidate).toHaveBeenCalledTimes(2);
  });
});
