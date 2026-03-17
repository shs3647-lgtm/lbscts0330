/**
 * @file reverse-import/route.ts
 * @description 리버스 Import API — 완벽한 DB 데이터를 기준으로
 * flatData + chains를 역생성하고 라운드트립 검증까지 수행.
 *
 * POST /api/fmea/reverse-import?fmeaId=xxx
 *
 * @created 2026-03-17
 */
import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const fmeaId = request.nextUrl.searchParams.get('fmeaId');

    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json(
        { success: false, error: 'fmeaId가 없거나 유효하지 않습니다' },
        { status: 400 }
      );
    }

    const normalizedFmeaId = fmeaId.toLowerCase();

    // 1. 프로젝트 스키마 준비
    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) {
      return NextResponse.json(
        { success: false, error: 'DATABASE_URL not configured' },
        { status: 500 }
      );
    }

    const schema = getProjectSchemaName(normalizedFmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const prisma = getPrismaForSchema(schema);

    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Prisma client 생성 실패' },
        { status: 500 }
      );
    }

    // 2. Atomic DB 로드
    const [
      l1Structure,
      l2Structures,
      l3Structures,
      l1Functions,
      l2Functions,
      l3Functions,
      failureEffects,
      failureModes,
      failureCauses,
      failureLinks,
      failureAnalyses,
      riskAnalyses,
      optimizations,
    ] = await Promise.all([
      prisma.l1Structure.findFirst({ where: { fmeaId: normalizedFmeaId } }),
      prisma.l2Structure.findMany({ where: { fmeaId: normalizedFmeaId }, orderBy: { order: 'asc' } }),
      prisma.l3Structure.findMany({ where: { fmeaId: normalizedFmeaId }, orderBy: { order: 'asc' } }),
      prisma.l1Function.findMany({ where: { fmeaId: normalizedFmeaId } }),
      prisma.l2Function.findMany({ where: { fmeaId: normalizedFmeaId } }),
      prisma.l3Function.findMany({ where: { fmeaId: normalizedFmeaId } }),
      prisma.failureEffect.findMany({ where: { fmeaId: normalizedFmeaId } }),
      prisma.failureMode.findMany({ where: { fmeaId: normalizedFmeaId } }),
      prisma.failureCause.findMany({ where: { fmeaId: normalizedFmeaId } }),
      prisma.failureLink.findMany({ where: { fmeaId: normalizedFmeaId } }),
      prisma.failureAnalysis.findMany({ where: { fmeaId: normalizedFmeaId } }).catch(() => []),
      prisma.riskAnalysis.findMany({ where: { fmeaId: normalizedFmeaId } }),
      prisma.optimization.findMany({ where: { fmeaId: normalizedFmeaId } }).catch(() => []),
    ]);

    if (l2Structures.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Atomic DB에 데이터가 없습니다',
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = {
      fmeaId: normalizedFmeaId,
      savedAt: new Date().toISOString(),
      l1Structure,
      l2Structures,
      l3Structures,
      l1Functions,
      l2Functions,
      l3Functions,
      failureEffects,
      failureModes,
      failureCauses,
      failureLinks,
      failureAnalyses,
      riskAnalyses,
      optimizations,
      confirmed: {
        structure: true,
        l1Function: true,
        l2Function: true,
        l3Function: true,
        l1Failure: true,
        l2Failure: true,
        l3Failure: true,
        failureLink: true,
        risk: true,
        optimization: true,
      },
    };

    // 3. 역변환: DB → flatData + chains
    const { atomicToFlatData } = await import(
      '@/app/(fmea-core)/pfmea/import/utils/atomicToFlatData'
    );
    const { atomicToChains } = await import(
      '@/app/(fmea-core)/pfmea/import/utils/atomicToChains'
    );

    const { flatData, idRemap } = atomicToFlatData(db, { fmeaId: normalizedFmeaId });
    const chains = atomicToChains(db, idRemap);

    console.info(
      `[reverse-import] 역변환 완료: flatData=${flatData.length}건, chains=${chains.length}건`
    );

    // 4. buildWorksheetState로 재구성
    const { buildWorksheetState } = await import(
      '@/app/(fmea-core)/pfmea/import/utils/buildWorksheetState'
    );

    const buildResult = buildWorksheetState(flatData, {
      fmeaId: normalizedFmeaId,
      l1Name: l1Structure?.name || '',
      chains,
    });

    // 5. 라운드트립 검증
    const { verifyRoundTrip } = await import(
      '@/app/(fmea-core)/pfmea/import/utils/verifyRoundTrip'
    );

    const roundTripResult = verifyRoundTrip(db, buildResult.state, idRemap);

    console.info(
      `[reverse-import] 라운드트립 검증: ${roundTripResult.success ? '✅ PASS' : '❌ FAIL'} — ${roundTripResult.summary}`
    );

    // 6. 성공 시 legacyData 재저장 (선택)
    const body = await request.json().catch(() => ({}));
    const shouldResave = (body as { resave?: boolean }).resave === true;

    if (shouldResave && roundTripResult.success) {
      const injectedLinks = (buildResult.state as { failureLinks?: unknown[] }).failureLinks || [];
      const injectedRisk = (buildResult.state as { riskData?: Record<string, number | string> }).riskData || {};

      const legacyData = {
        fmeaId: normalizedFmeaId,
        l1: buildResult.state.l1,
        l2: buildResult.state.l2,
        failureLinks: injectedLinks,
        riskData: injectedRisk,
        forceOverwrite: true,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).$transaction(async (tx: any) => {
        await tx.fmeaLegacyData.upsert({
          where: { fmeaId: normalizedFmeaId },
          create: { fmeaId: normalizedFmeaId, data: legacyData as any, version: '1.0.0' },
          update: { data: legacyData as any },
        });
      }, { timeout: 30000 });

      // rebuild-atomic
      const origin = request.nextUrl.origin;
      await fetch(
        `${origin}/api/fmea/rebuild-atomic?fmeaId=${encodeURIComponent(normalizedFmeaId)}`,
        { method: 'POST' }
      );

      console.info('[reverse-import] legacyData 재저장 + rebuild-atomic 완료');
    }

    return NextResponse.json({
      success: true,
      fmeaId: normalizedFmeaId,
      flatDataCount: flatData.length,
      chainsCount: chains.length,
      buildDiagnostics: buildResult.diagnostics,
      roundTrip: roundTripResult,
      resaved: shouldResave && roundTripResult.success,
    });
  } catch (e: unknown) {
    console.error('[reverse-import] error:', e instanceof Error ? e.message : String(e));
    return NextResponse.json(
      { success: false, error: safeErrorMessage(e) },
      { status: 500 }
    );
  }
}
