/**
 * @file validate-fk/route.ts
 * FK 정합성 종합 검증 API — FMEA/CP/PFD 모듈 전체 FK 무결성 확인
 *
 * GET /api/fmea/validate-fk?fmeaId=pfm26-m066
 *
 * 8가지 FK 검증:
 * 1. orphanFailureLinks — FM/FC/FE 미존재 참조
 * 2. orphanRiskAnalyses — FailureLink 미존재 참조
 * 3. orphanProductChars — FM.productCharId → 미존재 ProcessProductChar
 * 4. orphanProcessChars — FC.l3FuncId → 미존재 L3Function
 * 5. crossProcessFk — 공정 간 교차 참조 오염
 * 6. duplicateUuids — 동일 UUID 중복 레코드
 * 7. missingUuids — null/빈 id 레코드
 * 8. flTripleCheck — FailureLink에 fmId/fcId/feId 누락
 */
import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';

export const runtime = 'nodejs';

// ─── Types ───────────────────────────────────────────────────

export interface CheckResult {
  name: string;
  status: 'OK' | 'ERROR';
  count: number;
  details: string[];
}

export interface ValidateFkResponse {
  success: boolean;
  fmeaId: string;
  allGreen: boolean;
  checks: CheckResult[];
  summary: { total: number; passed: number; failed: number };
}

// ─── Check helpers ───────────────────────────────────────────

function makeCheck(name: string, count: number, details: string[]): CheckResult {
  return { name, status: count === 0 ? 'OK' : 'ERROR', count, details };
}

// ─── 8 FK validation checks ─────────────────────────────────

async function checkOrphanFailureLinks(prisma: any): Promise<CheckResult> {
  const links = await prisma.failureLink.findMany({
    select: { id: true, fmId: true, fcId: true, feId: true },
  });

  const fmIds = new Set((await prisma.failureMode.findMany({ select: { id: true } })).map((r: { id: string }) => r.id));
  const fcIds = new Set((await prisma.failureCause.findMany({ select: { id: true } })).map((r: { id: string }) => r.id));
  const feIds = new Set((await prisma.failureEffect.findMany({ select: { id: true } })).map((r: { id: string }) => r.id));

  const orphans: string[] = [];
  for (const link of links) {
    const missing: string[] = [];
    if (link.fmId && !fmIds.has(link.fmId)) missing.push(`fmId=${link.fmId}`);
    if (link.fcId && !fcIds.has(link.fcId)) missing.push(`fcId=${link.fcId}`);
    if (link.feId && !feIds.has(link.feId)) missing.push(`feId=${link.feId}`);
    if (missing.length > 0) {
      orphans.push(`FL ${link.id}: ${missing.join(', ')}`);
    }
  }

  return makeCheck('orphanFailureLinks', orphans.length, orphans.slice(0, 20));
}

async function checkOrphanRiskAnalyses(prisma: any): Promise<CheckResult> {
  const risks = await prisma.riskAnalysis.findMany({
    select: { id: true, linkId: true },
  });

  const flIds = new Set((await prisma.failureLink.findMany({ select: { id: true } })).map((r: { id: string }) => r.id));

  const orphans: string[] = [];
  for (const ra of risks) {
    if (ra.linkId && !flIds.has(ra.linkId)) {
      orphans.push(`RA ${ra.id}: linkId=${ra.linkId}`);
    }
  }

  return makeCheck('orphanRiskAnalyses', orphans.length, orphans.slice(0, 20));
}

async function checkOrphanProductChars(prisma: any): Promise<CheckResult> {
  const fms = await prisma.failureMode.findMany({
    select: { id: true, productCharId: true },
  });

  const pcIds = new Set(
    (await prisma.processProductChar.findMany({ select: { id: true } })).map((r: { id: string }) => r.id)
  );

  const orphans: string[] = [];
  for (const fm of fms) {
    if (fm.productCharId && !pcIds.has(fm.productCharId)) {
      orphans.push(`FM ${fm.id}: productCharId=${fm.productCharId}`);
    }
  }

  return makeCheck('orphanProductChars', orphans.length, orphans.slice(0, 20));
}

async function checkOrphanProcessChars(prisma: any): Promise<CheckResult> {
  const fcs = await prisma.failureCause.findMany({
    select: { id: true, l3FuncId: true },
  });

  const l3fIds = new Set(
    (await prisma.l3Function.findMany({ select: { id: true } })).map((r: { id: string }) => r.id)
  );

  const orphans: string[] = [];
  for (const fc of fcs) {
    if (fc.l3FuncId && !l3fIds.has(fc.l3FuncId)) {
      orphans.push(`FC ${fc.id}: l3FuncId=${fc.l3FuncId}`);
    }
  }

  return makeCheck('orphanProcessChars', orphans.length, orphans.slice(0, 20));
}

async function checkCrossProcessFk(prisma: any): Promise<CheckResult> {
  // FC (FailureCause) should reference L3Function that belongs to the same L2Structure (process)
  // as the FM (FailureMode) it is linked to via FailureLink
  const links = await prisma.failureLink.findMany({
    select: { id: true, fmId: true, fcId: true },
  });

  // Build FM → L2 mapping via FailureMode.l2StructId
  const fms = await prisma.failureMode.findMany({
    select: { id: true, l2StructId: true },
  });
  const fmToL2 = new Map<string, string>();
  for (const fm of fms) {
    if (fm.l2StructId) fmToL2.set(fm.id, fm.l2StructId);
  }

  // Build FC → L2 mapping via FailureCause → L3Function → L3Structure.l2Id
  const fcs = await prisma.failureCause.findMany({
    select: { id: true, l3FuncId: true },
  });
  const l3Funcs = await prisma.l3Function.findMany({
    select: { id: true, l3StructId: true },
  });
  const l3Structs = await prisma.l3Structure.findMany({
    select: { id: true, l2Id: true },
  });

  const l3FuncToL3Struct = new Map<string, string>();
  for (const f of l3Funcs) {
    if (f.l3StructId) l3FuncToL3Struct.set(f.id, f.l3StructId);
  }
  const l3StructToL2 = new Map<string, string>();
  for (const s of l3Structs) {
    if (s.l2Id) l3StructToL2.set(s.id, s.l2Id);
  }

  const fcToL2 = new Map<string, string>();
  for (const fc of fcs) {
    if (fc.l3FuncId) {
      const l3sId = l3FuncToL3Struct.get(fc.l3FuncId);
      if (l3sId) {
        const l2Id = l3StructToL2.get(l3sId);
        if (l2Id) fcToL2.set(fc.id, l2Id);
      }
    }
  }

  const crossProcess: string[] = [];
  for (const link of links) {
    if (!link.fmId || !link.fcId) continue;
    const fmL2 = fmToL2.get(link.fmId);
    const fcL2 = fcToL2.get(link.fcId);
    if (fmL2 && fcL2 && fmL2 !== fcL2) {
      crossProcess.push(`FL ${link.id}: FM→L2=${fmL2}, FC→L2=${fcL2}`);
    }
  }

  return makeCheck('crossProcessFk', crossProcess.length, crossProcess.slice(0, 20));
}

async function checkDuplicateUuids(prisma: any): Promise<CheckResult> {
  const tables: Array<{ name: string; model: string }> = [
    { name: 'FailureMode', model: 'failureMode' },
    { name: 'FailureCause', model: 'failureCause' },
    { name: 'FailureEffect', model: 'failureEffect' },
    { name: 'FailureLink', model: 'failureLink' },
    { name: 'RiskAnalysis', model: 'riskAnalysis' },
    { name: 'L2Structure', model: 'l2Structure' },
    { name: 'L3Structure', model: 'l3Structure' },
    { name: 'L3Function', model: 'l3Function' },
  ];

  const duplicates: string[] = [];

  for (const table of tables) {
    try {
      const records = await (prisma as any)[table.model].findMany({ select: { id: true } });
      const seen = new Map<string, number>();
      for (const r of records) {
        seen.set(r.id, (seen.get(r.id) || 0) + 1);
      }
      for (const [id, count] of seen) {
        if (count > 1) {
          duplicates.push(`${table.name}: id=${id} appears ${count} times`);
        }
      }
    } catch (err) {
      console.error(`[validate-fk] duplicateUuids check failed for ${table.name}:`, err);
    }
  }

  return makeCheck('duplicateUuids', duplicates.length, duplicates.slice(0, 20));
}

async function checkMissingUuids(prisma: any): Promise<CheckResult> {
  const tables: Array<{ name: string; model: string }> = [
    { name: 'FailureMode', model: 'failureMode' },
    { name: 'FailureCause', model: 'failureCause' },
    { name: 'FailureEffect', model: 'failureEffect' },
    { name: 'FailureLink', model: 'failureLink' },
    { name: 'RiskAnalysis', model: 'riskAnalysis' },
    { name: 'L2Structure', model: 'l2Structure' },
    { name: 'L3Structure', model: 'l3Structure' },
  ];

  const missing: string[] = [];

  for (const table of tables) {
    try {
      const records = await (prisma as any)[table.model].findMany({ select: { id: true } });
      let nullCount = 0;
      let emptyCount = 0;
      for (const r of records) {
        if (r.id === null || r.id === undefined) nullCount++;
        else if (typeof r.id === 'string' && r.id.trim() === '') emptyCount++;
      }
      if (nullCount > 0) missing.push(`${table.name}: ${nullCount} records with null id`);
      if (emptyCount > 0) missing.push(`${table.name}: ${emptyCount} records with empty id`);
    } catch (err) {
      console.error(`[validate-fk] missingUuids check failed for ${table.name}:`, err);
    }
  }

  return makeCheck('missingUuids', missing.length, missing.slice(0, 20));
}

async function checkFlTriple(prisma: any): Promise<CheckResult> {
  const links = await prisma.failureLink.findMany({
    select: { id: true, fmId: true, fcId: true, feId: true },
  });

  const incomplete: string[] = [];
  for (const link of links) {
    const missing: string[] = [];
    if (!link.fmId) missing.push('fmId');
    if (!link.fcId) missing.push('fcId');
    if (!link.feId) missing.push('feId');
    if (missing.length > 0) {
      incomplete.push(`FL ${link.id}: missing ${missing.join(', ')}`);
    }
  }

  return makeCheck('flTripleCheck', incomplete.length, incomplete.slice(0, 20));
}

// ─── Main validation runner ─────────────────────────────────

/** 프로젝트 스키마 Prisma로 FK 8종 검증 — repair-fk·테스트에서 재사용 */
export async function runValidation(prisma: any, fmeaId: string): Promise<ValidateFkResponse> {
  const checks: CheckResult[] = [
    await checkOrphanFailureLinks(prisma),
    await checkOrphanRiskAnalyses(prisma),
    await checkOrphanProductChars(prisma),
    await checkOrphanProcessChars(prisma),
    await checkCrossProcessFk(prisma),
    await checkDuplicateUuids(prisma),
    await checkMissingUuids(prisma),
    await checkFlTriple(prisma),
  ];

  const passed = checks.filter(c => c.status === 'OK').length;
  const failed = checks.filter(c => c.status === 'ERROR').length;

  return {
    success: true,
    fmeaId,
    allGreen: failed === 0,
    checks,
    summary: { total: checks.length, passed, failed },
  };
}

// ─── HTTP handler ────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const fmeaId = request.nextUrl.searchParams.get('fmeaId');
    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'fmeaId 필요 (예: pfm26-m066)' }, { status: 400 });
    }

    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) {
      return NextResponse.json({ success: false, error: 'DATABASE_URL 미설정' }, { status: 500 });
    }

    const schema = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Prisma 클라이언트 초기화 실패' }, { status: 500 });
    }

    const result = await runValidation(prisma, fmeaId);
    return NextResponse.json(result);
  } catch (e) {
    console.error('[validate-fk] GET error:', e);
    return NextResponse.json({ success: false, error: safeErrorMessage(e) }, { status: 500 });
  }
}
