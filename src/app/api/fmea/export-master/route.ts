/**
 * @file export-master/route.ts
 * @description 마스터 FMEA 영구저장 API
 *
 * POST /api/fmea/export-master
 * body: { fmeaId }
 * → Atomic DB 전체 데이터를 data/master-fmea/{fmeaId}.json 에 저장
 * → PfmeaMasterDataset + PfmeaMasterFlatItem 동기화
 * → 통계 반환
 *
 * GET /api/fmea/export-master?fmeaId=xxx
 * → 저장된 마스터 JSON 로드 (파일 기반)
 */

import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { getBaseDatabaseUrl, getPrismaForSchema, getPrisma } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';
import { atomicToFlatData } from '@/app/(fmea-core)/pfmea/import/utils/atomicToFlatData';
import { atomicToChains } from '@/app/(fmea-core)/pfmea/import/utils/atomicToChains';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const MASTER_DIR = path.join(process.cwd(), 'data', 'master-fmea');

function ensureMasterDir() {
  if (!fs.existsSync(MASTER_DIR)) {
    fs.mkdirSync(MASTER_DIR, { recursive: true });
  }
}

async function loadAtomicDB(prisma: any, fmeaId: string) {
  const [
    l1Structure, l2Structures, l3Structures,
    l1Functions, l2Functions, l3Functions,
    failureEffects, failureModes, failureCauses,
    failureLinks, riskAnalyses,
  ] = await Promise.all([
    prisma.l1Structure.findFirst({ where: { fmeaId } }),
    prisma.l2Structure.findMany({ where: { fmeaId }, orderBy: { order: 'asc' } }),
    prisma.l3Structure.findMany({ where: { fmeaId }, orderBy: { order: 'asc' } }),
    prisma.l1Function.findMany({ where: { fmeaId } }),
    prisma.l2Function.findMany({ where: { fmeaId } }),
    prisma.l3Function.findMany({ where: { fmeaId } }),
    prisma.failureEffect.findMany({ where: { fmeaId } }),
    prisma.failureMode.findMany({ where: { fmeaId } }),
    prisma.failureCause.findMany({ where: { fmeaId } }),
    prisma.failureLink.findMany({ where: { fmeaId } }),
    prisma.riskAnalysis.findMany({ where: { fmeaId } }),
  ]);

  return {
    fmeaId,
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
    failureAnalyses: [] as any[],
    riskAnalyses,
    optimizations: [] as any[],
    confirmed: {},
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fmeaId = body.fmeaId?.toLowerCase();
    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'fmeaId 필요' }, { status: 400 });
    }

    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) return NextResponse.json({ success: false, error: 'DB 미설정' }, { status: 500 });

    const schema = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) return NextResponse.json({ success: false, error: 'Prisma 실패' }, { status: 500 });

    const db = await loadAtomicDB(prisma, fmeaId);

    const { flatData, idRemap } = atomicToFlatData(db as any, { fmeaId });
    const chains = atomicToChains(db as any, idRemap);

    const stats = {
      fmeaId,
      exportedAt: new Date().toISOString(),
      l2Count: db.l2Structures.length,
      l3Count: db.l3Structures.length,
      l1FuncCount: db.l1Functions.length,
      l2FuncCount: db.l2Functions.length,
      l3FuncCount: db.l3Functions.length,
      fmCount: db.failureModes.length,
      feCount: db.failureEffects.length,
      fcCount: db.failureCauses.length,
      linkCount: db.failureLinks.length,
      riskCount: db.riskAnalyses.length,
      flatDataCount: flatData.length,
      chainCount: chains.length,
      flatBreakdown: {
        A1: flatData.filter(f => f.itemCode === 'A1').length,
        A2: flatData.filter(f => f.itemCode === 'A2').length,
        A3: flatData.filter(f => f.itemCode === 'A3').length,
        A4: flatData.filter(f => f.itemCode === 'A4').length,
        A5: flatData.filter(f => f.itemCode === 'A5').length,
        A6: flatData.filter(f => f.itemCode === 'A6').length,
        B1: flatData.filter(f => f.itemCode === 'B1').length,
        B2: flatData.filter(f => f.itemCode === 'B2').length,
        B3: flatData.filter(f => f.itemCode === 'B3').length,
        B4: flatData.filter(f => f.itemCode === 'B4').length,
        B5: flatData.filter(f => f.itemCode === 'B5').length,
        C1: flatData.filter(f => f.itemCode === 'C1').length,
        C2: flatData.filter(f => f.itemCode === 'C2').length,
        C3: flatData.filter(f => f.itemCode === 'C3').length,
        C4: flatData.filter(f => f.itemCode === 'C4').length,
      },
    };

    // 파일 저장
    ensureMasterDir();
    const masterFile = path.join(MASTER_DIR, `${fmeaId}.json`);
    const statsFile = path.join(MASTER_DIR, `${fmeaId}-stats.json`);

    const masterPayload = {
      version: 1,
      fmeaId,
      exportedAt: stats.exportedAt,
      atomicDB: db,
      flatData,
      chains,
      stats,
    };

    fs.writeFileSync(masterFile, JSON.stringify(masterPayload, null, 2), 'utf-8');
    fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2), 'utf-8');

    // PfmeaMasterDataset 동기화
    const publicPrisma = getPrisma();
    if (publicPrisma) {
      try {
        const existing = await publicPrisma.pfmeaMasterDataset.findUnique({
          where: { fmeaId },
        });

        const flatForMaster = flatData.map((f, idx) => ({
          processNo: f.processNo,
          category: f.category,
          itemCode: f.itemCode,
          value: f.value || '',
          m4: f.m4 || undefined,
          specialChar: f.specialChar || undefined,
          parentItemId: f.parentItemId || undefined,
          orderIndex: idx,
        }));

        if (existing) {
          await publicPrisma.pfmeaMasterFlatItem.deleteMany({ where: { datasetId: existing.id } });
          await publicPrisma.pfmeaMasterDataset.update({
            where: { fmeaId },
            data: {
              version: existing.version + 1,
              failureChains: chains as any,
              updatedAt: new Date(),
            },
          });
          await publicPrisma.pfmeaMasterFlatItem.createMany({
            data: flatForMaster.map(f => ({
              datasetId: existing.id,
              ...f,
            })),
            skipDuplicates: true,
          });
          console.info(`[export-master] PfmeaMasterDataset 업데이트: ${fmeaId} (v${existing.version + 1}, ${flatForMaster.length}건)`);
        } else {
          await publicPrisma.pfmeaMasterDataset.create({
            data: {
              fmeaId,
              fmeaType: 'P',
              name: `Master ${fmeaId}`,
              failureChains: chains as any,
              flatItems: {
                createMany: { data: flatForMaster, skipDuplicates: true },
              },
            },
          });
          console.info(`[export-master] PfmeaMasterDataset 신규 생성: ${fmeaId} (${flatForMaster.length}건)`);
        }
      } catch (dbErr) {
        console.error('[export-master] DB 동기화 실패 (파일 저장은 성공):', dbErr);
      }
    }

    console.info(`[export-master] ${fmeaId}: JSON(${(JSON.stringify(masterPayload).length / 1024).toFixed(1)}KB) 저장 완료`);

    return NextResponse.json({
      success: true,
      masterFile: `data/master-fmea/${fmeaId}.json`,
      statsFile: `data/master-fmea/${fmeaId}-stats.json`,
      stats,
    });
  } catch (e) {
    console.error('[export-master] 에러:', e);
    return NextResponse.json({ success: false, error: safeErrorMessage(e) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const fmeaId = req.nextUrl.searchParams.get('fmeaId')?.toLowerCase();
    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'fmeaId 필요' }, { status: 400 });
    }

    ensureMasterDir();
    const masterFile = path.join(MASTER_DIR, `${fmeaId}.json`);

    if (!fs.existsSync(masterFile)) {
      return NextResponse.json({ success: false, error: `마스터 데이터 없음: ${fmeaId}` }, { status: 404 });
    }

    const raw = fs.readFileSync(masterFile, 'utf-8');
    const data = JSON.parse(raw);

    return NextResponse.json({
      success: true,
      data: {
        fmeaId: data.fmeaId,
        exportedAt: data.exportedAt,
        stats: data.stats,
        flatDataCount: data.flatData?.length || 0,
        chainCount: data.chains?.length || 0,
      },
    });
  } catch (e) {
    console.error('[export-master] GET 에러:', e);
    return NextResponse.json({ success: false, error: safeErrorMessage(e) }, { status: 500 });
  }
}
