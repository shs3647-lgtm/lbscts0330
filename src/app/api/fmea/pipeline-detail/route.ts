/**
 * @file pipeline-detail/route.ts
 * @description 파이프라인 검증 상세 데이터 API
 *
 * GET /api/fmea/pipeline-detail?fmeaId=xxx&step=2
 * 각 STEP별 실제 DB 레코드를 반환하여 UI에서 상세 검증 가능
 *
 * 스키마 필드 매핑:
 *  L2Structure.no (공정번호), FailureMode.mode, FailureEffect.effect
 */
import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const fmeaId = request.nextUrl.searchParams.get('fmeaId');
    const stepStr = request.nextUrl.searchParams.get('step');
    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'fmeaId 필요' }, { status: 400 });
    }
    const step = parseInt(stepStr || '0', 10);

    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) return NextResponse.json({ success: false, error: 'DB 미설정' }, { status: 500 });

    const schema = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) return NextResponse.json({ success: false, error: 'Prisma 실패' }, { status: 500 });

    let data: unknown = null;

    switch (step) {
      case 1: data = await getStep1Detail(prisma, fmeaId); break;
      case 2: data = await getStep2Detail(prisma, fmeaId); break;
      case 3: data = await getStep3Detail(prisma, fmeaId); break;
      case 4: data = await getStep4Detail(prisma, fmeaId); break;
      case 5: data = await getStep5Detail(prisma, fmeaId); break;
      default: data = { message: 'STEP 0은 PipelineStep0Detail에서 처리' };
    }

    return NextResponse.json({ success: true, step, data });
  } catch (e) {
    console.error('[pipeline-detail] error:', e);
    return NextResponse.json({ success: false, error: safeErrorMessage(e) }, { status: 500 });
  }
}

// STEP 1: Import — Legacy 데이터 구조 상세
async function getStep1Detail(prisma: any, fmeaId: string) {
  const legacy = await prisma.fmeaLegacyData.findUnique({ where: { fmeaId } });
  const d = legacy?.data as any;
  if (!d) return { exists: false, processes: [] };

  const processes = (d.l2 || []).map((p: any) => ({
    processNo: p.processNo || p.no || '',
    name: p.name || '',
    funcCount: (p.functions || []).length,
    l3Count: (p.l3 || []).length,
    fmCount: (p.failureModes || []).length,
    fcCount: (p.failureCauses || []).length,
  }));

  return {
    exists: true,
    l1Name: d.l1?.name || '',
    l1FuncCount: (d.l1?.functions || []).length,
    feCount: (d.l1?.failureScopes || []).length,
    processCount: processes.length,
    processes,
  };
}

// STEP 2: 파싱 — 실제 파싱 데이터 공정별 상세
async function getStep2Detail(prisma: any, fmeaId: string) {
  const legacy = await prisma.fmeaLegacyData.findUnique({ where: { fmeaId } });
  const d = legacy?.data as any;
  if (!d?.l2) return { processes: [], l1Functions: [], failureEffects: [] };

  const processes = (d.l2 || []).map((p: any) => {
    const funcs = p.functions || [];
    const l3s = p.l3 || [];
    const pcList: { name: string; id: string }[] = [];
    for (const fn of funcs) {
      for (const pc of (fn.processChars || fn.productChars || [])) {
        pcList.push({ name: pc.name || '', id: pc.id || '' });
      }
    }
    const b1List: { name: string; m4: string; funcCount: number; pcCount: number; fcCount: number }[] = [];
    for (const we of l3s) {
      let weFuncCount = 0, wePcCount = 0;
      for (const fn of (we.functions || [])) {
        weFuncCount++;
        wePcCount += (fn.processChars || []).length;
      }
      b1List.push({
        name: we.name || '',
        m4: we.m4 || '',
        funcCount: weFuncCount,
        pcCount: wePcCount,
        fcCount: (we.failureCauses || []).length,
      });
    }
    return {
      processNo: p.processNo || p.no || '',
      name: p.name || '',
      a3: funcs.map((f: any) => f.name || f.functionName || '').filter(Boolean),
      a4: pcList,
      a5: (p.failureModes || []).map((fm: any) => ({ name: fm.name || fm.mode || '', id: fm.id || '' })),
      b1: b1List,
    };
  });

  const l1Funcs = (d.l1?.functions || []).map((fn: any) => ({
    category: fn.category || '',
    name: fn.name || '',
    requirement: fn.requirement || '',
  }));

  const fes = (d.l1?.failureScopes || []).map((fe: any) => ({
    name: fe.name || '',
    scope: fe.scope || '',
    severity: fe.severity || 0,
  }));

  return { processes, l1Functions: l1Funcs, failureEffects: fes };
}

// STEP 3: UUID — 실제 Atomic DB 엔티티 목록
async function getStep3Detail(prisma: any, fmeaId: string) {
  // 각 쿼리를 개별 try-catch로 보호 (테이블 없으면 빈 배열)
  const safeQuery = async (fn: () => Promise<any[]>) => {
    try { return await fn(); } catch { return []; }
  };

  const [l1s, l2s, l3s, l2Funcs, l3Funcs, fms, fes, fcs] = await Promise.all([
    safeQuery(() => prisma.l1Structure.findMany({ where: { fmeaId }, select: { id: true, name: true }, take: 50 })),
    safeQuery(() => prisma.l2Structure.findMany({ where: { fmeaId }, select: { id: true, no: true, name: true }, take: 50, orderBy: { order: 'asc' } })),
    safeQuery(() => prisma.l3Structure.findMany({ where: { fmeaId }, select: { id: true, name: true, m4: true, l2Id: true }, take: 200 })),
    safeQuery(() => prisma.l2Function.findMany({ where: { fmeaId }, select: { id: true, functionName: true, productChar: true, l2StructId: true }, take: 50 })),
    safeQuery(() => prisma.l3Function.findMany({ where: { fmeaId }, select: { id: true, functionName: true, processChar: true, l3StructId: true }, take: 200 })),
    safeQuery(() => prisma.failureMode.findMany({ where: { fmeaId }, select: { id: true, mode: true, l2StructId: true }, take: 100 })),
    safeQuery(() => prisma.failureEffect.findMany({ where: { fmeaId }, select: { id: true, effect: true, severity: true, category: true }, take: 50 })),
    safeQuery(() => prisma.failureCause.findMany({ where: { fmeaId }, select: { id: true, cause: true, l2StructId: true, l3StructId: true }, take: 200 })),
  ]);

  const l2Map = new Map<string, string>(l2s.map((l: any) => [l.id, l.no || '']));

  return {
    l1: l1s.map((l: any) => ({ id: l.id.substring(0, 8), name: l.name })),
    l2: l2s.map((l: any) => ({ id: l.id.substring(0, 8), processNo: l.no, name: l.name })),
    l3: l3s.map((l: any) => ({ id: l.id.substring(0, 8), name: l.name, m4: l.m4 || '', processNo: l2Map.get(l.l2Id) || '' })),
    l2Functions: l2Funcs.map((f: any) => ({ id: f.id.substring(0, 8), name: f.functionName, productChar: f.productChar || '', processNo: l2Map.get(f.l2StructId) || '' })),
    l3Functions: l3Funcs.map((f: any) => ({ id: f.id.substring(0, 8), name: f.functionName, processChar: f.processChar || '' })),
    failureModes: fms.map((f: any) => ({ id: f.id.substring(0, 8), name: f.mode, processNo: l2Map.get(f.l2StructId) || '' })),
    failureEffects: fes.map((f: any) => ({ id: f.id.substring(0, 8), name: f.effect, severity: f.severity, category: f.category || '' })),
    failureCauses: fcs.map((f: any) => ({ id: f.id.substring(0, 8), cause: f.cause, processNo: l2Map.get(f.l2StructId) || '' })),
  };
}

// STEP 4: FK — FailureLink 상세 (FM↔FE↔FC 관계)
async function getStep4Detail(prisma: any, fmeaId: string) {
  const safeQuery = async (fn: () => Promise<any[]>) => {
    try { return await fn(); } catch { return []; }
  };

  const [links, fms, fes, fcs, l2s] = await Promise.all([
    safeQuery(() => prisma.failureLink.findMany({ where: { fmeaId, deletedAt: null }, take: 300 })),
    safeQuery(() => prisma.failureMode.findMany({ where: { fmeaId }, select: { id: true, mode: true, l2StructId: true } })),
    safeQuery(() => prisma.failureEffect.findMany({ where: { fmeaId }, select: { id: true, effect: true } })),
    safeQuery(() => prisma.failureCause.findMany({ where: { fmeaId }, select: { id: true, cause: true } })),
    safeQuery(() => prisma.l2Structure.findMany({ where: { fmeaId }, select: { id: true, no: true, name: true } })),
  ]);

  const fmMap = new Map<string, any>(fms.map((f: any) => [f.id, f]));
  const feMap = new Map<string, any>(fes.map((f: any) => [f.id, f]));
  const fcMap = new Map<string, any>(fcs.map((f: any) => [f.id, f]));
  const l2Map = new Map<string, any>(l2s.map((l: any) => [l.id, l]));

  const rows = links.map((lk: any) => {
    const fm = fmMap.get(lk.fmId);
    const fe = feMap.get(lk.feId);
    const fc = fcMap.get(lk.fcId);
    const l2 = fm ? l2Map.get(fm.l2StructId) : null;
    return {
      id: lk.id.substring(0, 8),
      processNo: l2?.no || '',
      processName: l2?.name || '',
      fmId: lk.fmId.substring(0, 8),
      fmName: fm?.mode || '❌ BROKEN',
      feId: lk.feId.substring(0, 8),
      feName: fe?.effect || '❌ BROKEN',
      fcId: lk.fcId.substring(0, 8),
      fcName: fc?.cause || '❌ BROKEN',
      broken: !fm || !fe || !fc,
    };
  });

  const linkedFcIds = new Set(links.map((l: any) => l.fcId));
  const unlinked = fcs.filter((fc: any) => !linkedFcIds.has(fc.id)).map((fc: any) => ({
    id: fc.id.substring(0, 8),
    cause: fc.cause,
  }));

  return { links: rows, unlinkedFCs: unlinked, totalLinks: links.length, totalFCs: fcs.length };
}

// STEP 5: WS — 워크시트 구조 검증 상세
async function getStep5Detail(prisma: any, fmeaId: string) {
  const legacy = await prisma.fmeaLegacyData.findUnique({ where: { fmeaId } });
  const d = legacy?.data as any;
  if (!d?.l2) return { processes: [] };

  const processes = (d.l2 || []).map((p: any) => {
    const procFcs = p.failureCauses || [];
    const fcPcIds = new Set(procFcs.map((fc: any) => fc.processCharId).filter(Boolean));
    const pcItems: { id: string; name: string; hasFC: boolean }[] = [];

    for (const we of (p.l3 || [])) {
      for (const fn of (we.functions || [])) {
        for (const pc of (fn.processChars || [])) {
          pcItems.push({
            id: (pc.id || '').substring(0, 8),
            name: pc.name || '(빈값)',
            hasFC: fcPcIds.has(pc.id),
          });
        }
      }
    }

    return {
      processNo: p.processNo || p.no || '',
      name: p.name || '',
      fmCount: (p.failureModes || []).length,
      fcCount: procFcs.length,
      l3Count: (p.l3 || []).length,
      processChars: pcItems,
      linkCount: (p.failureLinks || []).length,
    };
  });

  return { processes };
}
