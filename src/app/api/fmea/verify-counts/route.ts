/**
 * @file verify-counts/route.ts
 * DB 엔티티 카운트 검증 API — 프로젝트 스키마 기준
 *
 * GET /api/fmea/verify-counts?fmeaId=xxx
 * Returns: { success: true, counts: { A1: 21, A2: 21, ... C4: 20 } }
 */
import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const fmeaId = request.nextUrl.searchParams.get('fmeaId') || '';

    if (!isValidFmeaId(fmeaId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid fmeaId' },
        { status: 400 },
      );
    }

    // ★★★ 프로젝트 스키마 전용 — public 폴백 없음
    // Atomic DB는 프로젝트 스키마에만 존재. 없으면 "Import 먼저" 안내.
    const schemaName = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: getBaseDatabaseUrl(), schema: schemaName });
    const prisma = getPrismaForSchema(schemaName);

    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Import 먼저 실행해주세요 (프로젝트 스키마 없음)', schema: schemaName },
        { status: 404 },
      );
    }

    // --- A1, A2: L2Structure — distinct processNo ---
    const l2Rows = await prisma.l2Structure.findMany({
      where: { fmeaId },
      select: { no: true },
    });
    const a1 = new Set(l2Rows.map(r => (r.no ?? '').trim()).filter(Boolean)).size;

    // --- A3: distinct L2Function.functionName ---
    const a3Rows = await prisma.l2Function.findMany({
      where: { fmeaId },
      select: { functionName: true },
    });
    const a3 = new Set(a3Rows.map(r => (r.functionName ?? '').trim()).filter(Boolean)).size;

    // --- A4: distinct ProcessProductChar ---
    let a4 = 0;
    try {
      const a4Rows = await prisma.processProductChar.findMany({
        where: { fmeaId },
        select: { name: true },
      });
      a4 = new Set(a4Rows.map((r: any) => ((r.name ?? r.characteristic ?? '') as string).trim()).filter(Boolean)).size;
    } catch {
      a4 = 0;
    }

    // --- A5: distinct FailureMode.mode ---
    const a5Rows = await prisma.failureMode.findMany({
      where: { fmeaId },
      select: { mode: true },
    });
    const a5 = new Set(a5Rows.map(r => (r.mode ?? '').trim()).filter(Boolean)).size;

    // --- A6: distinct detectionControl ---
    const a6Rows = await prisma.riskAnalysis.findMany({
      where: {
        fmeaId,
        AND: [
          { detectionControl: { not: null } },
          { detectionControl: { not: '' } },
        ],
      },
      select: { detectionControl: true },
    });
    const a6 = new Set(a6Rows.map(r => (r.detectionControl ?? '').trim()).filter(Boolean)).size;

    // --- B1: distinct L3Structure.name ---
    const b1Rows = await prisma.l3Structure.findMany({
      where: { fmeaId },
      select: { name: true },
    });
    const b1 = new Set(b1Rows.map(r => (r.name ?? '').trim()).filter(Boolean)).size;

    // --- B2: distinct L3Function.functionName ---
    const b2Rows = await prisma.l3Function.findMany({
      where: { fmeaId, AND: [{ functionName: { not: '' } }] },
      select: { functionName: true },
    });
    const b2 = new Set(b2Rows.map(r => (r.functionName ?? '').trim()).filter(Boolean)).size;

    // --- B3: distinct L3Function.processChar ---
    const b3Rows = await prisma.l3Function.findMany({
      where: { fmeaId },
      select: { processChar: true },
    });
    const b3 = new Set(b3Rows.map((r: any) => ((r.processChar ?? '') as string).trim()).filter(Boolean)).size;

    // --- B4: distinct FailureCause cause text ---
    const b4Rows = await prisma.failureCause.findMany({
      where: { fmeaId },
      select: { cause: true },
    });
    const b4 = new Set(b4Rows.map((r: any) => ((r.cause ?? '') as string).trim()).filter(Boolean)).size;

    // --- B5: distinct preventionControl ---
    const b5Rows = await prisma.riskAnalysis.findMany({
      where: {
        fmeaId,
        AND: [
          { preventionControl: { not: null } },
          { preventionControl: { not: '' } },
        ],
      },
      select: { preventionControl: true },
    });
    const b5 = new Set(b5Rows.map(r => (r.preventionControl ?? '').trim()).filter(Boolean)).size;

    // --- C1: distinct L1Function.category ---
    const c1Rows = await prisma.l1Function.findMany({
      where: { fmeaId },
      select: { category: true },
    });
    const c1 = new Set(c1Rows.map(r => (r.category ?? '').trim()).filter(Boolean)).size;

    // --- C2: distinct L1Function.functionName ---
    const c2Rows = await prisma.l1Function.findMany({
      where: { fmeaId },
      select: { functionName: true },
    });
    const c2 = new Set(c2Rows.map(r => (r.functionName ?? '').trim()).filter(Boolean)).size;

    // --- C3: distinct L1Function.requirement ---
    const c3Rows = await prisma.l1Function.findMany({
      where: { fmeaId, AND: [{ requirement: { not: '' } }] },
      select: { requirement: true },
    });
    const c3 = new Set(c3Rows.map(r => (r.requirement ?? '').trim()).filter(Boolean)).size;

    // --- C4: distinct FailureEffect.effect ---
    const c4Rows = await prisma.failureEffect.findMany({
      where: { fmeaId },
      select: { effect: true },
    });
    const c4 = new Set(c4Rows.map(r => (r.effect ?? '').trim()).filter(Boolean)).size;

    const counts = {
      A1: a1,
      A2: a1,  // A2(공정명)는 A1(공정번호)와 1:1
      A3: a3,
      A4: a4,
      A5: a5,
      A6: a6,
      B1: b1,
      B2: b2,
      B3: b3,
      B4: b4,
      B5: b5,
      C1: c1,
      C2: c2,
      C3: c3,
      C4: c4,
    };

    return NextResponse.json({ success: true, fmeaId, schema: schemaName, counts });
  } catch (error) {
    console.error('[verify-counts] Error:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 },
    );
  }
}
