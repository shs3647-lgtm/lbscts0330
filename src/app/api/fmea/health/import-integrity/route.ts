/**
 * GET /api/fmea/health/import-integrity?fmeaId=xxx
 * 경량 FK 검증 — cron/모니터링용 (validate-fk runValidation 래핑)
 */
import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';
import { runValidation } from '@/app/api/fmea/validate-fk/route';

export const runtime = 'nodejs';

type CheckStatus = 'ok' | 'warn' | 'error';

function subStatus(count: number): CheckStatus {
  if (count === 0) return 'ok';
  return 'error';
}

export async function GET(request: NextRequest) {
  try {
    const fmeaId = request.nextUrl.searchParams.get('fmeaId');
    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json(
        { success: false, error: 'fmeaId required (valid id)', code: 'IMPORT_INVALID_FMEA_ID' },
        { status: 400 },
      );
    }

    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) {
      return NextResponse.json({ success: false, error: 'DATABASE_URL missing' }, { status: 500 });
    }

    const schema = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Prisma init failed' }, { status: 500 });
    }

    const v = await runValidation(prisma, fmeaId);

    const orphanNames = new Set([
      'orphanFailureLinks',
      'orphanRiskAnalyses',
      'orphanProductChars',
      'orphanProcessChars',
      'crossProcessFk',
    ]);
    let fkOrphans = 0;
    for (const c of v.checks) {
      if (orphanNames.has(c.name)) fkOrphans += c.count;
    }

    const flTriple = v.checks.find((c) => c.name === 'flTripleCheck');
    const nullTriple = flTriple?.count ?? 0;

    const checks = {
      fk_orphans: { count: fkOrphans, status: subStatus(fkOrphans) },
      null_parentId: { count: nullTriple, status: subStatus(nullTriple) },
      cartesian_suspect: { count: 0, status: 'ok' as CheckStatus, note: 'use scripts/check-cartesian.sh / pipeline-verify' },
      dedupKey_collision: { count: 0, status: 'ok' as CheckStatus, note: 'staging flat dedup is separate from atomic FK' },
    };

    const failed = v.checks.filter((c) => c.status === 'ERROR').length;
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (!v.allGreen && failed > 0) {
      status = fkOrphans + nullTriple >= 10 ? 'critical' : 'degraded';
    }

    return NextResponse.json({
      status,
      checks,
      validateFk: { allGreen: v.allGreen, summary: v.summary },
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[import-integrity]', e);
    return NextResponse.json({ success: false, error: safeErrorMessage(e) }, { status: 500 });
  }
}
