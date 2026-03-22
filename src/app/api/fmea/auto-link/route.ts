/**
 * POST /api/fmea/auto-link?fmeaId=xxx
 * 미연결 FC(FailureCause)를 FM↔FE↔FC 자동 연결
 *
 * 로직:
 * 1. FL이 없는 FailureCause 탐색 (l2StructId 기준)
 * 2. 같은 공정의 FailureMode와 연결
 * 3. 공정에 매핑된 FailureEffect와 연결 (기존 FL에서 feId 추출)
 * 4. FailureLink + RiskAnalysis 생성
 */
import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { getProjectSchemaName, ensureProjectSchemaReady } from '@/lib/project-schema';
import { getPrismaForSchema } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const fmeaId = searchParams.get('fmeaId') || (await request.json().catch(() => ({}))).fmeaId;
    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'Invalid fmeaId' }, { status: 400 });
    }

    const normalizedId = fmeaId.toLowerCase();
    const schema = getProjectSchemaName(normalizedId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: process.env.DATABASE_URL || '', schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) return NextResponse.json({ success: false, error: 'DB error' }, { status: 500 });

    // ─── 현재 상태 로드 ───
    const [allFMs, allFEs, allFCs, existingFLs] = await Promise.all([
      prisma.failureMode.findMany({ where: { fmeaId: normalizedId }, select: { id: true, l2StructId: true, mode: true } }),
      prisma.failureEffect.findMany({ where: { fmeaId: normalizedId }, select: { id: true, category: true, effect: true } }),
      prisma.failureCause.findMany({ where: { fmeaId: normalizedId }, select: { id: true, l2StructId: true, cause: true, l3StructId: true } }),
      prisma.failureLink.findMany({ where: { fmeaId: normalizedId }, select: { id: true, fmId: true, feId: true, fcId: true } }),
    ]);

    // 이미 연결된 FC set
    const linkedFcIds = new Set(existingFLs.map((fl: any) => fl.fcId));
    // l2StructId → FM 목록
    const fmByL2 = new Map<string, string[]>();
    for (const fm of allFMs) {
      const list = fmByL2.get(fm.l2StructId) || [];
      list.push(fm.id);
      fmByL2.set(fm.l2StructId, list);
    }
    // 기존 FL에서 l2StructId → feId 매핑 (FM의 l2StructId 통해)
    const fmToL2 = new Map(allFMs.map((fm: any) => [fm.id, fm.l2StructId]));
    const l2ToFeIds = new Map<string, Set<string>>();
    for (const fl of existingFLs) {
      const l2 = fmToL2.get(fl.fmId) || '';
      if (!l2 || !fl.feId) continue;
      if (!l2ToFeIds.has(l2)) l2ToFeIds.set(l2, new Set());
      l2ToFeIds.get(l2)!.add(fl.feId);
    }
    // FE가 없는 l2에는 전체 FE 중 YP 첫 번째 사용
    const fallbackFE = allFEs.find((fe: any) => fe.category === 'YP') || allFEs[0];

    // ─── 미연결 FC → FL 생성 ───
    const newFLs: any[] = [];
    const newRAs: any[] = [];
    const now = new Date();

    for (const fc of allFCs) {
      if (linkedFcIds.has(fc.id)) continue; // 이미 연결됨

      const fmIds = fmByL2.get(fc.l2StructId) || [];
      if (fmIds.length === 0) continue; // 같은 공정 FM 없음

      const feIds = l2ToFeIds.get(fc.l2StructId);

      for (const fmId of fmIds) {
        // feId 결정: 기존 FL에서 이 l2의 FE, 없으면 fallback
        const feId = feIds ? [...feIds][0] : fallbackFE?.id;
        if (!feId) continue;

        const flId = `${fc.id}-FL-${fmId.substring(0, 8)}`;
        newFLs.push({
          id: flId, fmeaId: normalizedId,
          fmId, feId, fcId: fc.id,
          fmText: allFMs.find((m: any) => m.id === fmId)?.mode || '',
          feText: allFEs.find((e: any) => e.id === feId)?.effect || '',
          fcText: fc.cause,
        });
        newRAs.push({
          id: `${flId}-RA`, fmeaId: normalizedId,
          linkId: flId, severity: 1, occurrence: 3, detection: 3, ap: 'L',
          createdAt: now, updatedAt: now,
        });
      }
    }

    // ─── DB 저장 ───
    let createdFL = 0, createdRA = 0;
    if (newFLs.length > 0) {
      const result = await prisma.failureLink.createMany({ data: newFLs, skipDuplicates: true });
      createdFL = result.count;
    }
    if (newRAs.length > 0) {
      const result = await prisma.riskAnalysis.createMany({ data: newRAs, skipDuplicates: true });
      createdRA = result.count;
    }

    const totalFL = await prisma.failureLink.count({ where: { fmeaId: normalizedId } });
    const totalRA = await prisma.riskAnalysis.count({ where: { fmeaId: normalizedId } });

    console.log(`[auto-link] fmeaId=${normalizedId} 신규 FL=${createdFL} RA=${createdRA} 총 FL=${totalFL}`);

    return NextResponse.json({
      success: true, fmeaId: normalizedId,
      created: { fl: createdFL, ra: createdRA },
      total: { fl: totalFL, ra: totalRA },
      skipped: allFCs.filter((fc: any) => linkedFcIds.has(fc.id)).length,
    });

  } catch (err) {
    console.error('[auto-link] Error:', err);
    return NextResponse.json({ success: false, error: safeErrorMessage(err) }, { status: 500 });
  }
}
