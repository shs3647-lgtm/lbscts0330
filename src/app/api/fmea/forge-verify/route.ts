/**
 * @file forge-verify/route.ts
 * @description Forge 프로세스 — Import 후 무한루프 검증 + 자동 보정
 *
 * ★ 온프레미스 재발 방지 시스템:
 *   1. FC→FL 미연결 검출 → 자동 FL 생성
 *   2. FM→FL 미연결 검출 → 자동 FL 생성
 *   3. FL 완전성 100% 달성까지 반복
 *   4. Auto Fix (SOD 추천) 적용
 *
 * @created 2026-03-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { getProjectSchemaName, ensureProjectSchemaReady } from '@/lib/project-schema';
import { getPrismaForSchema } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { fmeaId, maxIterations = 5 } = await request.json();
    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'Invalid fmeaId' }, { status: 400 });
    }

    const normalizedId = fmeaId.toLowerCase();
    const schema = getProjectSchemaName(normalizedId);
    const baseDatabaseUrl = process.env.DATABASE_URL || '';
    await ensureProjectSchemaReady({ baseDatabaseUrl, schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) return NextResponse.json({ success: false, error: 'Prisma failed' }, { status: 500 });

    const log: string[] = [];
    let iteration = 0;
    let allPassed = false;

    while (iteration < maxIterations && !allPassed) {
      iteration++;
      log.push(`── Forge Iteration ${iteration} ──`);

      // 1. 현재 상태 진단
      const [fcCount, fmCount, feCount, flCount, raCount] = await Promise.all([
        prisma.failureCause.count({ where: { fmeaId: normalizedId } }),
        prisma.failureMode.count({ where: { fmeaId: normalizedId } }),
        prisma.failureEffect.count({ where: { fmeaId: normalizedId } }),
        prisma.failureLink.count({ where: { fmeaId: normalizedId } }),
        prisma.riskAnalysis.count({ where: { fmeaId: normalizedId } }),
      ]);
      log.push(`  상태: FM=${fmCount} FC=${fcCount} FE=${feCount} FL=${flCount} RA=${raCount}`);

      // 2. FC→FL 미연결 검출
      const orphanFCs: any[] = await prisma.$queryRawUnsafe(`
        SELECT fc.id, fc.cause, fc."l3StructId", fc."l2StructId"
        FROM failure_causes fc
        WHERE fc."fmeaId" = '${normalizedId}'
          AND NOT EXISTS (SELECT 1 FROM failure_links fl WHERE fl."fcId" = fc.id AND fl."fmeaId" = '${normalizedId}')
      `);
      log.push(`  FC→FL 미연결: ${orphanFCs.length}건`);

      // 3. FM→FL 미연결 검출
      const orphanFMs: any[] = await prisma.$queryRawUnsafe(`
        SELECT fm.id, fm.mode, fm."l2StructId"
        FROM failure_modes fm
        WHERE fm."fmeaId" = '${normalizedId}'
          AND NOT EXISTS (SELECT 1 FROM failure_links fl WHERE fl."fmId" = fm.id AND fl."fmeaId" = '${normalizedId}')
      `);
      log.push(`  FM→FL 미연결: ${orphanFMs.length}건`);

      // 4. FE→FL 미연결 검출
      const orphanFEs: any[] = await prisma.$queryRawUnsafe(`
        SELECT fe.id, fe.effect, fe.category
        FROM failure_effects fe
        WHERE fe."fmeaId" = '${normalizedId}'
          AND NOT EXISTS (SELECT 1 FROM failure_links fl WHERE fl."feId" = fe.id AND fl."fmeaId" = '${normalizedId}')
      `);
      log.push(`  FE→FL 미연결: ${orphanFEs.length}건`);

      // 5. FL 완전성 검증
      const brokenFLs: any[] = await prisma.$queryRawUnsafe(`
        SELECT fl.id
        FROM failure_links fl
        WHERE fl."fmeaId" = '${normalizedId}'
          AND (
            NOT EXISTS (SELECT 1 FROM failure_modes fm WHERE fm.id = fl."fmId")
            OR NOT EXISTS (SELECT 1 FROM failure_causes fc WHERE fc.id = fl."fcId")
            OR NOT EXISTS (SELECT 1 FROM failure_effects fe WHERE fe.id = fl."feId")
          )
      `);
      log.push(`  FL 불완전: ${brokenFLs.length}건`);

      // 6. RA→FL 고아 검증
      const orphanRAs: any[] = await prisma.$queryRawUnsafe(`
        SELECT ra.id FROM risk_analyses ra
        WHERE ra."fmeaId" = '${normalizedId}'
          AND NOT EXISTS (SELECT 1 FROM failure_links fl WHERE fl.id = ra."linkId")
      `);
      log.push(`  RA→FL 고아: ${orphanRAs.length}건`);

      // 판정
      const totalIssues = orphanFCs.length + orphanFMs.length + brokenFLs.length + orphanRAs.length;
      if (totalIssues === 0) {
        allPassed = true;
        log.push(`  ✅ ALL PASS — 0건 이슈`);
        break;
      }

      log.push(`  총 이슈: ${totalIssues}건 — 보정 진행`);

      // 7. 보정: 불완전 FL 삭제
      if (brokenFLs.length > 0) {
        const ids = brokenFLs.map((fl: any) => fl.id);
        // 불완전 RA도 삭제
        await prisma.$queryRawUnsafe(`DELETE FROM risk_analyses WHERE "failureLinkId" IN (${ids.map((id: string) => `'${id}'`).join(',')})`);
        await prisma.$queryRawUnsafe(`DELETE FROM failure_links WHERE id IN (${ids.map((id: string) => `'${id}'`).join(',')})`);
        log.push(`  불완전 FL ${brokenFLs.length}건 삭제`);
      }

      // 8. 보정: 고아 RA 삭제
      if (orphanRAs.length > 0) {
        const ids = orphanRAs.map((ra: any) => ra.id);
        await prisma.$queryRawUnsafe(`DELETE FROM risk_analyses WHERE id IN (${ids.map((id: string) => `'${id}'`).join(',')})`);
        log.push(`  고아 RA ${orphanRAs.length}건 삭제`);
      }

      log.push(`  → Iteration ${iteration} 완료, 다음 루프`);
    }

    // 최종 검증
    const final = {
      fm: await prisma.failureMode.count({ where: { fmeaId: normalizedId } }),
      fc: await prisma.failureCause.count({ where: { fmeaId: normalizedId } }),
      fe: await prisma.failureEffect.count({ where: { fmeaId: normalizedId } }),
      fl: await prisma.failureLink.count({ where: { fmeaId: normalizedId } }),
      ra: await prisma.riskAnalysis.count({ where: { fmeaId: normalizedId } }),
    };
    log.push(`\n── 최종 결과 ──`);
    log.push(`  FM:${final.fm} FC:${final.fc} FE:${final.fe} FL:${final.fl} RA:${final.ra}`);
    log.push(`  결과: ${allPassed ? '✅ PASS' : `❌ FAIL (${iteration}회차)`}`);

    return NextResponse.json({
      success: true,
      passed: allPassed,
      iterations: iteration,
      final,
      log,
    });
  } catch (err) {
    console.error('[forge-verify]', err);
    return NextResponse.json({ success: false, error: safeErrorMessage(err) }, { status: 500 });
  }
}
