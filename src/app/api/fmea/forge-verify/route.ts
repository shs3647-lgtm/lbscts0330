/**
 * @file forge-verify/route.ts
 * @description Forge 프로세스 — Import 후 반복 검증 + 자동 보정
 *
 * ★★★ 데이터 위치 정책 (Rule 0.8.1 강제) ★★★
 *   - 프로젝트 데이터(FM/FC/FE/FL/RA)는 반드시 프로젝트 스키마(pfmea_{id}) 전용
 *   - public 스키마에서 failure_modes/failure_causes 등 읽기 ❌ 금지
 *   - getPrismaForSchema(schema) + $transaction(SET search_path) 패턴 사용
 *   - 프로젝트 스키마에 데이터가 0건이면 "Import 미완료" 판정 (public 폴백 없음)
 *
 * ★ 핵심 설계 원칙 (2026-03-25):
 *   UUID에 엑셀 행번호+parentId만 정확히 기입하면 FK는 기계식 꽂아넣기.
 *   Forge는 Import 후 데이터 무결성만 검증하고, 깨진 참조만 정리한다.
 *
 * ★ 연결 전략:
 *   $transaction 내부에서 SET search_path + $queryRawUnsafe 사용
 *   → 동일 DB 연결 보장 (커넥션 풀 분리 문제 우회)
 *   → $1 파라미터 바인딩으로 SQL 인젝션 방지
 */

import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { getProjectSchemaName, ensureProjectSchemaReady } from '@/lib/project-schema';
import { getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { fmeaId, maxIterations = 5 } = await request.json();
    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'Invalid fmeaId' }, { status: 400 });
    }

    const normalizedId = fmeaId.toLowerCase();
    const schema = getProjectSchemaName(normalizedId);
    if (!/^[a-z][a-z0-9_]*$/.test(schema)) throw new Error(`Invalid schema: ${schema}`);

    const baseDatabaseUrl = getBaseDatabaseUrl();
    await ensureProjectSchemaReady({ baseDatabaseUrl, schema });

    // ★ 프로젝트 스키마 전용 Prisma — public 폴백 금지 (Rule 0.8.1)
    const prisma = getPrismaForSchema(schema) as any;
    if (!prisma) return NextResponse.json({ success: false, error: 'Prisma failed' }, { status: 500 });

    // ★ $transaction — 동일 DB 연결에서 search_path + 모든 쿼리 보장
    // PrismaPg({ schema }) 옵션만으로는 ORM/raw 쿼리가 올바른 스키마를 보장하지 못함
    // SET search_path와 쿼리가 다른 커넥션에서 실행되는 문제를 $transaction으로 해결
    const result = await prisma.$transaction(async (tx: any) => {
      await tx.$executeRawUnsafe(`SET search_path TO "${schema}", public`);

      const log: string[] = [];
      let iteration = 0;
      let allPassed = false;

      // 0. 데이터 존재 확인 (프로젝트 스키마에 Import 데이터가 있는지)
      const totalCheck = await tx.$queryRawUnsafe(
        `SELECT count(*)::int as c FROM failure_modes`
      ) as { c: number }[];
      const totalFM = totalCheck[0]?.c || 0;
      if (totalFM === 0) {
        log.push('⚠️ 프로젝트 스키마에 FM 데이터 0건 — Atomic Import 미완료');
        log.push(`   스키마: ${schema}`);
        log.push('   → save-position-import 실행 후 재검증 필요');
        return { passed: false, iterations: 0, final: { fm: 0, fc: 0, fe: 0, fl: 0, ra: 0 }, log };
      }

      while (iteration < maxIterations && !allPassed) {
        iteration++;
        log.push(`── Forge Iteration ${iteration} ──`);

        // 1. 현재 상태 진단 ($queryRawUnsafe — search_path 유지)
        const [fmR, fcR, feR, flR, raR] = await Promise.all([
          tx.$queryRawUnsafe(`SELECT count(*)::int as c FROM failure_modes WHERE "fmeaId" = $1`, fmeaId) as Promise<{c:number}[]>,
          tx.$queryRawUnsafe(`SELECT count(*)::int as c FROM failure_causes WHERE "fmeaId" = $1`, fmeaId) as Promise<{c:number}[]>,
          tx.$queryRawUnsafe(`SELECT count(*)::int as c FROM failure_effects WHERE "fmeaId" = $1`, fmeaId) as Promise<{c:number}[]>,
          tx.$queryRawUnsafe(`SELECT count(*)::int as c FROM failure_links WHERE "fmeaId" = $1`, fmeaId) as Promise<{c:number}[]>,
          tx.$queryRawUnsafe(`SELECT count(*)::int as c FROM risk_analyses WHERE "fmeaId" = $1`, fmeaId) as Promise<{c:number}[]>,
        ]);
        const fmCount = fmR[0]?.c||0, fcCount = fcR[0]?.c||0, feCount = feR[0]?.c||0;
        const flCount = flR[0]?.c||0, raCount = raR[0]?.c||0;
        log.push(`  상태: FM=${fmCount} FC=${fcCount} FE=${feCount} FL=${flCount} RA=${raCount}`);

        // 2. FC→FL 미연결
        const unlinkedFC = await tx.$queryRawUnsafe(
          `SELECT count(*)::int as c FROM failure_causes fc WHERE fc."fmeaId" = $1
           AND NOT EXISTS (SELECT 1 FROM failure_links fl WHERE fl."fcId" = fc.id)`, fmeaId
        ) as {c:number}[];
        log.push(`  FC→FL 미연결: ${unlinkedFC[0]?.c||0}건`);

        // 3. FM→FL 미연결
        const unlinkedFM = await tx.$queryRawUnsafe(
          `SELECT count(*)::int as c FROM failure_modes fm WHERE fm."fmeaId" = $1
           AND NOT EXISTS (SELECT 1 FROM failure_links fl WHERE fl."fmId" = fm.id)`, fmeaId
        ) as {c:number}[];
        log.push(`  FM→FL 미연결: ${unlinkedFM[0]?.c||0}건`);

        // 4. FL 불완전 (fmId/fcId/feId 참조 깨진)
        const brokenFLs = await tx.$queryRawUnsafe(
          `SELECT fl.id FROM failure_links fl WHERE fl."fmeaId" = $1 AND (
            NOT EXISTS (SELECT 1 FROM failure_modes fm WHERE fm.id = fl."fmId")
            OR NOT EXISTS (SELECT 1 FROM failure_causes fc WHERE fc.id = fl."fcId")
            OR NOT EXISTS (SELECT 1 FROM failure_effects fe WHERE fe.id = fl."feId")
          )`, fmeaId
        ) as {id:string}[];
        log.push(`  FL 불완전: ${brokenFLs.length}건`);

        // 5. RA→FL 고아
        const orphanRAs = await tx.$queryRawUnsafe(
          `SELECT ra.id FROM risk_analyses ra WHERE ra."fmeaId" = $1
           AND NOT EXISTS (SELECT 1 FROM failure_links fl WHERE fl.id = ra."linkId")`, fmeaId
        ) as {id:string}[];
        log.push(`  RA→FL 고아: ${orphanRAs.length}건`);

        // 판정
        const totalIssues = brokenFLs.length + orphanRAs.length;
        if (totalIssues === 0) {
          allPassed = true;
          log.push(`  ✅ ALL PASS — 구조 이슈 0건 (미연결 FC=${unlinkedFC[0]?.c||0} FM=${unlinkedFM[0]?.c||0}은 경고)`);
          break;
        }

        log.push(`  총 구조 이슈: ${totalIssues}건 — 보정 진행`);

        // 6. 불완전 FL 삭제
        if (brokenFLs.length > 0) {
          const ids = brokenFLs.map(fl => fl.id);
          await tx.$executeRawUnsafe(`DELETE FROM risk_analyses WHERE "linkId" = ANY($1::text[])`, ids);
          await tx.$executeRawUnsafe(`DELETE FROM failure_links WHERE id = ANY($1::text[])`, ids);
          log.push(`  불완전 FL ${brokenFLs.length}건 삭제 (종속 RA 포함)`);
        }

        // 7. 고아 RA 삭제
        if (orphanRAs.length > 0) {
          const ids = orphanRAs.map(ra => ra.id);
          await tx.$executeRawUnsafe(`DELETE FROM risk_analyses WHERE id = ANY($1::text[])`, ids);
          log.push(`  고아 RA ${orphanRAs.length}건 삭제`);
        }

        log.push(`  → Iteration ${iteration} 완료`);
      }

      // 최종 카운트
      const [fmF, fcF, feF, flF, raF] = await Promise.all([
        tx.$queryRawUnsafe(`SELECT count(*)::int as c FROM failure_modes WHERE "fmeaId" = $1`, fmeaId) as Promise<{c:number}[]>,
        tx.$queryRawUnsafe(`SELECT count(*)::int as c FROM failure_causes WHERE "fmeaId" = $1`, fmeaId) as Promise<{c:number}[]>,
        tx.$queryRawUnsafe(`SELECT count(*)::int as c FROM failure_effects WHERE "fmeaId" = $1`, fmeaId) as Promise<{c:number}[]>,
        tx.$queryRawUnsafe(`SELECT count(*)::int as c FROM failure_links WHERE "fmeaId" = $1`, fmeaId) as Promise<{c:number}[]>,
        tx.$queryRawUnsafe(`SELECT count(*)::int as c FROM risk_analyses WHERE "fmeaId" = $1`, fmeaId) as Promise<{c:number}[]>,
      ]);
      const final = { fm: fmF[0]?.c||0, fc: fcF[0]?.c||0, fe: feF[0]?.c||0, fl: flF[0]?.c||0, ra: raF[0]?.c||0 };

      log.push(`\n── 최종 결과 ──`);
      log.push(`  FM:${final.fm} FC:${final.fc} FE:${final.fe} FL:${final.fl} RA:${final.ra}`);
      log.push(`  결과: ${allPassed ? '✅ PASS' : `❌ FAIL (${iteration}회차)`}`);

      return { passed: allPassed, iterations: iteration, final, log };
    }, { timeout: 30000 });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error('[forge-verify]', err);
    return NextResponse.json({ success: false, error: safeErrorMessage(err) }, { status: 500 });
  }
}
