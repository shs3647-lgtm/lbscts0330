/**
 * @file deep-verify/route.ts
 * @description GET /api/fmea/deep-verify?fmeaId=xxx
 *
 * 프로젝트 스키마에서 Atomic DB 전체 로드 → deep-verify 엔진 실행
 * public 스키마 오염 체크 포함
 *
 * @created 2026-03-22
 */
import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { getProjectSchemaName, ensureProjectSchemaReady } from '@/lib/project-schema';
import { getPrisma, getPrismaForSchema } from '@/lib/prisma';
import { runDeepVerify, type DeepVerifyInput, type PublicSchemaData } from '@/lib/fmea/deep-verify';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const fmeaId = request.nextUrl.searchParams.get('fmeaId');
    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'Invalid fmeaId' }, { status: 400 });
    }

    const normalizedId = fmeaId.toLowerCase();
    const schema = getProjectSchemaName(normalizedId);
    const baseDatabaseUrl = process.env.DATABASE_URL || '';

    // ─── 프로젝트 스키마 준비 ───
    await ensureProjectSchemaReady({ baseDatabaseUrl, schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Failed to get Prisma client' }, { status: 500 });
    }

    // ─── 프로젝트 스키마에서 Atomic DB 전체 로드 ───
    const where = { fmeaId: normalizedId };
    const [
      l1Structures, l1Functions, l2Structures, l2Functions,
      l3Structures, l3Functions, processProductChars,
      failureEffects, failureModes, failureCauses,
      failureLinks, riskAnalyses,
    ] = await Promise.all([
      prisma.l1Structure.findMany({ where }),
      prisma.l1Function.findMany({ where }),
      prisma.l2Structure.findMany({ where }),
      prisma.l2Function.findMany({ where }),
      prisma.l3Structure.findMany({ where }),
      prisma.l3Function.findMany({ where }),
      prisma.processProductChar.findMany({ where }),
      prisma.failureEffect.findMany({ where }),
      prisma.failureMode.findMany({ where }),
      prisma.failureCause.findMany({ where }),
      prisma.failureLink.findMany({ where }),
      prisma.riskAnalysis.findMany({ where }),
    ]);

    // ─── public 스키마 오염 체크 ───
    let publicSchemaData: PublicSchemaData | null = null;
    try {
      const publicPrisma = getPrisma();
      if (publicPrisma) {
        const [pubFM, pubFL, pubRA, pubL2, pubL3] = await Promise.all([
          publicPrisma.failureMode.count({ where }),
          publicPrisma.failureLink.count({ where }),
          publicPrisma.riskAnalysis.count({ where }),
          publicPrisma.l2Structure.count({ where }),
          publicPrisma.l3Structure.count({ where }),
        ]);
        publicSchemaData = {
          failureModes: pubFM,
          failureLinks: pubFL,
          riskAnalyses: pubRA,
          l2Structures: pubL2,
          l3Structures: pubL3,
        };
      }
    } catch (e) {
      console.warn('[deep-verify] public schema check failed:', e);
    }

    // ─── deep-verify 실행 ───
    const l1Structure = l1Structures[0] || { id: '', fmeaId: normalizedId, name: '' };

    const input: DeepVerifyInput = {
      fmeaId: normalizedId,
      l1Structure,
      l1Functions,
      l2Structures,
      l2Functions,
      l3Structures,
      l3Functions,
      processProductChars,
      failureEffects,
      failureModes,
      failureCauses,
      failureLinks,
      riskAnalyses,
      publicSchemaData,
    };

    const result = runDeepVerify(input);

    return NextResponse.json({
      success: true,
      schema,
      ...result,
    });

  } catch (err) {
    console.error('[deep-verify] Error:', err);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(err) },
      { status: 500 },
    );
  }
}
