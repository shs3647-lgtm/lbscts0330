/**
 * POST /api/fmea/repair-l3?fmeaId=xxx
 * L3Function=0인 경우 L3Structure에서 placeholder L3Function 즉시 생성
 * + FlatItem B2/B3/B4 데이터 있으면 실제값으로 복원
 */
import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { getProjectSchemaName, ensureProjectSchemaReady } from '@/lib/project-schema';
import { getPrisma, getPrismaForSchema } from '@/lib/prisma';

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

    // 현재 상태 확인
    const [l3Count, l3FuncCount, fcCount, flCount, raCount] = await Promise.all([
      prisma.l3Structure.count({ where: { fmeaId: normalizedId } }),
      prisma.l3Function.count({ where: { fmeaId: normalizedId } }),
      prisma.failureCause.count({ where: { fmeaId: normalizedId } }),
      prisma.failureLink.count({ where: { fmeaId: normalizedId } }),
      prisma.riskAnalysis.count({ where: { fmeaId: normalizedId } }),
    ]);
    const repairs: string[] = [];

    // ─── 1. FlatItem에서 B2/B3/B4 데이터 로드 시도 (공개 스키마) ───
    const publicPrisma = getPrisma();
    const b2Map = new Map<string, string>(); // l3StructId → functionName
    const b3Map = new Map<string, string>(); // l3StructId → processChar
    const b4Map = new Map<string, string>(); // l3StructId → cause

    if (publicPrisma) {
      try {
        const ds = await publicPrisma.pfmeaMasterDataset.findFirst({
          where: { fmeaId: normalizedId },
          select: { id: true },
        });
        if (ds) {
          const [b2Items, b3Items, b4Items] = await Promise.all([
            publicPrisma.pfmeaMasterFlatItem.findMany({ where: { datasetId: ds.id, itemCode: 'B2' }, select: { processNo: true, m4: true, value: true, parentItemId: true } }),
            publicPrisma.pfmeaMasterFlatItem.findMany({ where: { datasetId: ds.id, itemCode: 'B3' }, select: { processNo: true, m4: true, value: true, parentItemId: true } }),
            publicPrisma.pfmeaMasterFlatItem.findMany({ where: { datasetId: ds.id, itemCode: 'B4' }, select: { processNo: true, m4: true, value: true, parentItemId: true } }),
          ]);
          // parentItemId = B1 id → "pno-B1-idx" → B1 기반으로 B2/B3 매핑
          b2Items.forEach(item => { if (item.parentItemId) b2Map.set(item.parentItemId, item.value || ''); });
          b3Items.forEach(item => { if (item.parentItemId) b3Map.set(item.parentItemId, item.value || ''); });
          b4Items.forEach(item => { if (item.parentItemId) b4Map.set(item.parentItemId, item.value || ''); });
        }
      } catch (e) {
        console.warn('[repair-l3] FlatItem 로드 실패 (정상):', e);
      }
    }

    // ─── 2. L3Function 생성 (L3Structure 기준) ───
    if (l3FuncCount === 0 && l3Count > 0) {
      const l3Structs = await prisma.l3Structure.findMany({
        where: { fmeaId: normalizedId },
        select: { id: true, name: true, m4: true, l2Id: true, order: true },
      });

      const now = new Date();
      const POS_UUID = /^L3-R(\d+)$/;
      const l3FuncData = l3Structs.map((s, idx) => {
        // L3Structure.id = "L3-R{n}" → L3Function.id = "L3-R{n}-C5"
        const match = s.id.match(POS_UUID);
        const l3FuncId = match ? `${s.id}-C5` : `${s.id}-F`;
        const b1Id = `${idx}`; // fallback
        return {
          id: l3FuncId,
          fmeaId: normalizedId,
          l3StructId: s.id,
          l2StructId: s.l2Id,
          functionName: b2Map.get(b1Id) || '',
          processChar: b3Map.get(b1Id) || '',
          createdAt: now,
          updatedAt: now,
        };
      });

      await prisma.l3Function.createMany({ data: l3FuncData, skipDuplicates: true });
      repairs.push(`L3Function ${l3FuncData.length}건 생성 (L3Structure 기준)`);

      // L3Function 생성 완료
    }

    // ─── 3. RA 보완 (FL → RA) ───
    if (raCount < flCount && flCount > 0) {
      const allFLs = await prisma.failureLink.findMany({ where: { fmeaId: normalizedId }, select: { id: true } });
      const existingRaLinkIds = new Set(
        (await prisma.riskAnalysis.findMany({ where: { fmeaId: normalizedId }, select: { linkId: true } }))
          .map((r: { linkId: string }) => r.linkId)
      );
      const missingFLs = allFLs.filter((fl: { id: string }) => !existingRaLinkIds.has(fl.id));
      if (missingFLs.length > 0) {
        const now = new Date();
        await prisma.riskAnalysis.createMany({
          skipDuplicates: true,
          data: missingFLs.map((fl: { id: string }) => ({
            id: `${fl.id}-RA`, fmeaId: normalizedId, linkId: fl.id,
            severity: 1, occurrence: 1, detection: 1, ap: 'L', createdAt: now, updatedAt: now,
          })),
        });
        repairs.push(`RA ${missingFLs.length}건 보완`);
      }
    }

    // ─── 4. processCharId 리매핑 ───
    const fcsNullPc = await prisma.failureCause.findMany({
      where: { fmeaId: normalizedId, processCharId: null },
      select: { id: true, l3FuncId: true },
    });
    let pcFixed = 0;
    for (const fc of fcsNullPc) {
      if (fc.l3FuncId) {
        await prisma.failureCause.update({ where: { id: fc.id }, data: { processCharId: fc.l3FuncId } });
        pcFixed++;
      }
    }
    if (pcFixed > 0) repairs.push(`processCharId 리매핑 ${pcFixed}건`);

    // 최종 카운트
    const [newL3FuncCount, newRaCount] = await Promise.all([
      prisma.l3Function.count({ where: { fmeaId: normalizedId } }),
      prisma.riskAnalysis.count({ where: { fmeaId: normalizedId } }),
    ]);

    return NextResponse.json({
      success: true,
      fmeaId: normalizedId,
      before: { l3: l3Count, l3f: l3FuncCount, fc: fcCount, fl: flCount, ra: raCount },
      after: { l3f: newL3FuncCount, ra: newRaCount },
      repairs,
    });

  } catch (err) {
    console.error('[repair-l3] Error:', err);
    return NextResponse.json({ success: false, error: safeErrorMessage(err) }, { status: 500 });
  }
}
