/**
 * @file verify-integrity/repair/route.ts
 * @description Import 기준 데이터 복원 + 초과 레코드 정리 API
 *
 * POST /api/fmea/verify-integrity/repair
 * Body: { fmeaId: string }
 *
 * 1. L1Function 복원 — Import FlatItem C1/C2/C3에서 재생성
 * 2. 초과 FC 정리 — Import B4 기준 초과분 삭제
 * 3. 초과 FailureLink 정리 — Import failureChains 기준 초과분 삭제
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma, getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';

export const runtime = 'nodejs';

interface RepairResult {
  table: string;
  action: string;
  count: number;
  detail: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fmeaId = (body.fmeaId as string)?.toLowerCase();

    if (!fmeaId) {
      return NextResponse.json({ success: false, error: 'fmeaId required' }, { status: 400 });
    }

    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) {
      return NextResponse.json({ success: false, error: 'DB not configured' }, { status: 500 });
    }

    const schema = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });

    const publicPrisma = getPrisma();
    const prisma = getPrismaForSchema(schema);
    if (!publicPrisma || !prisma) {
      return NextResponse.json({ success: false, error: 'Prisma not configured' }, { status: 500 });
    }

    const results: RepairResult[] = [];

    // ─── Import 데이터 로드 ───
    const dataset = await publicPrisma.pfmeaMasterDataset.findFirst({
      where: { fmeaId, isActive: true },
      select: { id: true, failureChains: true },
    });

    if (!dataset) {
      return NextResponse.json({ success: true, fmeaId, totalFixed: 0, results: [{ table: 'N/A', action: 'skip', count: 0, detail: 'Import 데이터 없음' }] });
    }

    // ─── 1. L1Function 복원 ───
    const l1All = await prisma.l1Structure.findMany({ where: { fmeaId }, select: { id: true } });
    if (l1All.length > 0) {
      const l1Id = l1All[0].id;

      // Import에서 C1(category), C2(functionName), C3(requirement) 로드
      const importC1 = await publicPrisma.pfmeaMasterFlatItem.findMany({
        where: { datasetId: dataset.id, itemCode: 'C1', value: { not: '' } },
        distinct: ['value'],
        select: { value: true },
      });
      const importC2 = await publicPrisma.pfmeaMasterFlatItem.findMany({
        where: { datasetId: dataset.id, itemCode: 'C2', value: { not: '' } },
        distinct: ['value'],
        select: { value: true },
      });
      const importC3 = await publicPrisma.pfmeaMasterFlatItem.findMany({
        where: { datasetId: dataset.id, itemCode: 'C3', value: { not: '' } },
        select: { processNo: true, value: true },
      });

      // 현재 DB L1Function
      const dbL1Funcs = await prisma.l1Function.findMany({
        where: { fmeaId },
        select: { id: true, category: true, functionName: true, requirement: true },
      });

      const dbFuncNames = new Set(dbL1Funcs.map((f: { functionName: string }) => f.functionName));
      const dbReqKeys = new Set(dbL1Funcs.map((f: { requirement: string }) => f.requirement));

      // 누락된 C2(functionName) 찾기 — category와 함께 짝지어 생성
      const importFuncNames = importC2.map((r: { value: string }) => r.value);
      const missingFuncNames = importFuncNames.filter((fn: string) => !dbFuncNames.has(fn));

      // Import C3를 행 단위로 가져와서 (processNo → C1/C2/C3 연결)
      // Import의 전체 C3 행 로드
      const allC3Rows = await publicPrisma.pfmeaMasterFlatItem.findMany({
        where: { datasetId: dataset.id, itemCode: 'C3', value: { not: '' } },
        select: { processNo: true, value: true, parentItemId: true },
      });

      // DB에 이미 있는 requirement 세트
      const dbReqSet = new Set(dbL1Funcs.map((f: { requirement: string }) => f.requirement));

      // 누락된 requirement 찾기
      const missingReqs = allC3Rows.filter((r: { value: string }) => !dbReqSet.has(r.value));

      let created = 0;

      if (missingFuncNames.length > 0 || missingReqs.length > 0) {
        await prisma.$transaction(async (tx: any) => {
          // 누락 functionName 복원
          for (const fn of missingFuncNames) {
            const category = importC1[0]?.value || '';
            await tx.l1Function.create({
              data: { fmeaId, l1StructId: l1Id, category, functionName: fn, requirement: '' },
            });
            created++;
          }

          // 누락 requirement 복원 — 각 requirement에 대해 같은 행의 C1/C2 찾아서 매칭
          for (const reqRow of missingReqs) {
            // 같은 parentItemId의 C1/C2 찾기
            const parentId = reqRow.parentItemId;
            let category = importC1[0]?.value || '';
            let funcName = '';

            if (parentId) {
              const relatedC1 = await publicPrisma.pfmeaMasterFlatItem.findFirst({
                where: { datasetId: dataset.id, itemCode: 'C1', parentItemId: parentId },
                select: { value: true },
              });
              const relatedC2 = await publicPrisma.pfmeaMasterFlatItem.findFirst({
                where: { datasetId: dataset.id, itemCode: 'C2', parentItemId: parentId },
                select: { value: true },
              });
              if (relatedC1?.value) category = relatedC1.value;
              if (relatedC2?.value) funcName = relatedC2.value;
            }

            if (!funcName && importC2.length > 0) {
              funcName = importC2[0].value;
            }

            // DB에 같은 (category, functionName)의 L1Function이 있으면 requirement만 할당
            const existingFunc = await tx.l1Function.findFirst({
              where: { fmeaId, category, functionName: funcName, requirement: '' },
              select: { id: true },
            });

            if (existingFunc) {
              await tx.l1Function.update({
                where: { id: existingFunc.id },
                data: { requirement: reqRow.value },
              });
            } else {
              await tx.l1Function.create({
                data: { fmeaId, l1StructId: l1Id, category, functionName: funcName, requirement: reqRow.value },
              });
            }
            created++;
          }
        });

        results.push({
          table: 'L1Function',
          action: 'restore',
          count: created,
          detail: `funcName ${missingFuncNames.length}개 + requirement ${missingReqs.length}개 복원`,
        });
      }
    }

    // ─── 2. 초과 FailureLink 정리 ───
    // Import failureChains 수와 DB FailureLink 수 비교
    const chains = Array.isArray(dataset.failureChains) ? dataset.failureChains as Record<string, unknown>[] : [];
    const importLinkCount = chains.length;

    const dbLinks = await prisma.failureLink.findMany({
      where: { fmeaId, deletedAt: null },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    if (dbLinks.length > importLinkCount && importLinkCount > 0) {
      // 가장 오래된 N개만 유지, 나머지 삭제
      const keepIds = dbLinks.slice(0, importLinkCount).map((r: { id: string }) => r.id);
      const deleteIds = dbLinks.slice(importLinkCount).map((r: { id: string }) => r.id);

      if (deleteIds.length > 0) {
        await prisma.$transaction(async (tx: any) => {
          // 종속 레코드 삭제 (RiskAnalysis → Optimization → FailureAnalysis → Link)
          const orphanRa = await tx.riskAnalysis.findMany({
            where: { fmeaId, linkId: { in: deleteIds } },
            select: { id: true },
          });
          const orphanRaIds = orphanRa.map((r: { id: string }) => r.id);
          if (orphanRaIds.length > 0) {
            await tx.optimization.deleteMany({ where: { riskId: { in: orphanRaIds } } });
          }
          await tx.riskAnalysis.deleteMany({ where: { fmeaId, linkId: { in: deleteIds } } });
          await tx.failureAnalysis.deleteMany({ where: { fmeaId, linkId: { in: deleteIds } } });
          const del = await tx.failureLink.deleteMany({ where: { id: { in: deleteIds } } });

          results.push({
            table: 'FailureLink',
            action: 'trim',
            count: del.count,
            detail: `Import 기준(${importLinkCount}) 초과 ${del.count}개 삭제 (유지=${keepIds.length})`,
          });
        });
      }
    }

    // ─── 3. 초과 FC 정리 ───
    // Import B4 수(자동생성 제외)와 DB FC 수(자동생성 제외) 비교
    const importB4Items = await publicPrisma.pfmeaMasterFlatItem.findMany({
      where: { datasetId: dataset.id, itemCode: 'B4', value: { not: '' } },
      select: { value: true },
    });
    const autoGenB4 = importB4Items.filter((r: { value: string }) => r.value.endsWith('부적합')).length;
    const importFcCount = importB4Items.length - autoGenB4;

    const dbFcAll = await prisma.failureCause.findMany({
      where: { fmeaId, cause: { not: { endsWith: '부적합' } } },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    if (dbFcAll.length > importFcCount && importFcCount > 0) {
      const keepFcIds = dbFcAll.slice(0, importFcCount).map((r: { id: string }) => r.id);
      const deleteFcIds = dbFcAll.slice(importFcCount).map((r: { id: string }) => r.id);

      if (deleteFcIds.length > 0) {
        await prisma.$transaction(async (tx: any) => {
          // 이 FC를 참조하는 FailureLink 정리 (fcId 재할당 또는 삭제)
          await tx.failureLink.deleteMany({
            where: { fmeaId, fcId: { in: deleteFcIds } },
          });
          const del = await tx.failureCause.deleteMany({
            where: { id: { in: deleteFcIds } },
          });

          results.push({
            table: 'FailureCause',
            action: 'trim',
            count: del.count,
            detail: `Import 기준(${importFcCount}) 초과 ${del.count}개 삭제 (유지=${keepFcIds.length})`,
          });
        });
      }
    }

    const totalFixed = results.reduce((sum, r) => sum + r.count, 0);

    return NextResponse.json({
      success: true,
      fmeaId,
      totalFixed,
      results,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[verify-integrity/repair] error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
