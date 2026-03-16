/**
 * @file verify-integrity/diagnose/route.ts
 * @description DB 중복 패턴 진단 API
 *
 * GET /api/fmea/verify-integrity/diagnose?fmeaId=xxx
 *
 * 각 테이블의 중복 레코드를 그룹별로 분석하여 반환
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const fmeaId = request.nextUrl.searchParams.get('fmeaId')?.toLowerCase();
    if (!fmeaId) {
      return NextResponse.json({ success: false, error: 'fmeaId required' }, { status: 400 });
    }

    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) {
      return NextResponse.json({ success: false, error: 'DB not configured' }, { status: 500 });
    }

    const schema = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });

    const prisma = getPrismaForSchema(schema);
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Prisma not configured' }, { status: 500 });
    }

    // L2Structure 중복 분석 (no 기준)
    const l2All = await prisma.l2Structure.findMany({
      where: { fmeaId },
      select: { id: true, no: true, name: true, l1Id: true, createdAt: true },
      orderBy: { no: 'asc' },
    });

    const l2ByProcessNo = new Map<string, Array<{ id: string; name: string; l1Id: string; createdAt: Date }>>();
    for (const l2 of l2All) {
      const key = l2.no || '(empty)';
      const arr = l2ByProcessNo.get(key) || [];
      arr.push({ id: l2.id, name: l2.name, l1Id: l2.l1Id, createdAt: l2.createdAt });
      l2ByProcessNo.set(key, arr);
    }

    const l2Duplicates: Array<{ no: string; count: number; ids: string[]; names: string[] }> = [];
    for (const [pNo, items] of l2ByProcessNo) {
      if (items.length > 1) {
        l2Duplicates.push({
          no: pNo,
          count: items.length,
          ids: items.map(i => i.id),
          names: [...new Set(items.map(i => i.name))],
        });
      }
    }

    // L3Structure 중복 분석 (l2Id + name 기준)
    const l3All = await prisma.l3Structure.findMany({
      where: { fmeaId, name: { not: '' } },
      select: { id: true, l2Id: true, name: true },
    });

    const l3ByKey = new Map<string, number>();
    for (const l3 of l3All) {
      const key = `${l3.l2Id}|${l3.name}`;
      l3ByKey.set(key, (l3ByKey.get(key) || 0) + 1);
    }
    const l3DupCount = [...l3ByKey.values()].filter(v => v > 1).length;

    // FailureCause 중복 분석 (l3FuncId + cause 기준)
    const fcAll = await prisma.failureCause.findMany({
      where: { fmeaId },
      select: { id: true, cause: true, l3FuncId: true },
    });
    const fcByKey = new Map<string, number>();
    for (const fc of fcAll) {
      const key = `${fc.l3FuncId || ''}|${fc.cause}`;
      fcByKey.set(key, (fcByKey.get(key) || 0) + 1);
    }
    const fcDupCount = [...fcByKey.values()].filter(v => v > 1).length;

    // FailureMode 중복 분석
    const fmAll = await prisma.failureMode.findMany({
      where: { fmeaId },
      select: { id: true, mode: true, l2FuncId: true },
    });
    const fmByKey = new Map<string, number>();
    for (const fm of fmAll) {
      const key = `${fm.l2FuncId || ''}|${fm.mode}`;
      fmByKey.set(key, (fmByKey.get(key) || 0) + 1);
    }
    const fmDupCount = [...fmByKey.values()].filter(v => v > 1).length;

    // FailureEffect 중복 분석
    const feAll = await prisma.failureEffect.findMany({
      where: { fmeaId },
      select: { id: true, effect: true },
    });
    const feByKey = new Map<string, number>();
    for (const fe of feAll) {
      feByKey.set(fe.effect, (feByKey.get(fe.effect) || 0) + 1);
    }
    const feDupCount = [...feByKey.values()].filter(v => v > 1).length;

    // L1 구조 확인
    const l1All = await prisma.l1Structure.findMany({
      where: { fmeaId },
      select: { id: true, name: true },
    });

    return NextResponse.json({
      success: true,
      fmeaId,
      l1: { total: l1All.length, items: l1All },
      l2: {
        total: l2All.length,
        uniqueNos: l2ByProcessNo.size,
        duplicateGroups: l2Duplicates.length,
        duplicates: l2Duplicates.slice(0, 30),
      },
      l3: {
        total: l3All.length,
        uniqueKeys: l3ByKey.size,
        duplicateGroups: l3DupCount,
      },
      failureEffect: {
        total: feAll.length,
        uniqueEffects: feByKey.size,
        duplicateGroups: feDupCount,
      },
      failureMode: {
        total: fmAll.length,
        uniqueModes: fmByKey.size,
        duplicateGroups: fmDupCount,
      },
      failureCause: {
        total: fcAll.length,
        uniqueCauses: fcByKey.size,
        duplicateGroups: fcDupCount,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[verify-integrity/diagnose] error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
