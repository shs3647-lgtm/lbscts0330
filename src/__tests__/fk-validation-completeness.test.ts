import { describe, expect, it } from 'vitest';
import { runValidation } from '@/app/api/fmea/validate-fk/route';

type MockTable<T> = {
  findMany: (_args?: unknown) => Promise<T[]>;
};

function table<T>(rows: T[]): MockTable<T> {
  return {
    findMany: async () => rows,
  };
}

function makePrisma(overrides?: {
  failureMode?: Array<Record<string, unknown>>;
  failureLink?: Array<Record<string, unknown>>;
  riskAnalysis?: Array<Record<string, unknown>>;
  failureCause?: Array<Record<string, unknown>>;
  l3Function?: Array<Record<string, unknown>>;
  failureEffect?: Array<Record<string, unknown>>;
  l2Structure?: Array<Record<string, unknown>>;
  l3Structure?: Array<Record<string, unknown>>;
  processProductChar?: Array<Record<string, unknown>>;
}) {
  return {
    failureLink: table(overrides?.failureLink || []),
    riskAnalysis: table(overrides?.riskAnalysis || []),
    processProductChar: table(overrides?.processProductChar || []),
    failureMode: table(overrides?.failureMode || []),
    failureCause: table(overrides?.failureCause || []),
    failureEffect: table(overrides?.failureEffect || []),
    l3Function: table(overrides?.l3Function || []),
    l2Structure: table(overrides?.l2Structure || []),
    l3Structure: table(overrides?.l3Structure || []),
  };
}

describe('validate-fk completeness guards', () => {
  it('FM이 있는데 FailureLink가 0건이면 allGreen=false여야 한다', async () => {
    const result = await runValidation(
      makePrisma({
        failureMode: [{ id: 'fm-1', l2StructId: 'l2-1', productCharId: 'pc-1' }],
        processProductChar: [{ id: 'pc-1' }],
        l2Structure: [{ id: 'l2-1' }],
        failureLink: [],
      }) as any,
      'pfm26-f001',
    );

    expect(result.allGreen).toBe(false);
    expect(result.checks.some(check => check.name.includes('FailureLink'))).toBe(true);
  });

  it('FailureLink가 있는데 RiskAnalysis가 1:1로 없으면 allGreen=false여야 한다', async () => {
    const result = await runValidation(
      makePrisma({
        failureMode: [{ id: 'fm-1', l2StructId: 'l2-1', productCharId: 'pc-1' }],
        processProductChar: [{ id: 'pc-1' }],
        failureCause: [{ id: 'fc-1', l3FuncId: 'l3f-1' }],
        l3Function: [{ id: 'l3f-1', l3StructId: 'l3-1' }],
        l2Structure: [{ id: 'l2-1' }],
        l3Structure: [{ id: 'l3-1', l2Id: 'l2-1' }],
        failureEffect: [{ id: 'fe-1' }],
        failureLink: [{ id: 'fl-1', fmId: 'fm-1', feId: 'fe-1', fcId: 'fc-1' }],
        riskAnalysis: [],
      }) as any,
      'pfm26-m001',
    );

    expect(result.allGreen).toBe(false);
    expect(result.checks.some(check => check.name === 'riskAnalysisCoverage' && check.status === 'ERROR')).toBe(true);
  });
});
