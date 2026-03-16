/**
 * @file verify-integrity/fix/route.ts
 * @description FK 고아 레코드 복구 API
 *
 * POST /api/fmea/verify-integrity/fix
 * Body: { fmeaId: string }
 *
 * 전략: 삭제가 아닌 복구(Repair)
 * 비유: 부서진 체인은 끊지 않고, 빠진 링크를 다시 연결한다.
 *
 * 1. L2→L1 (l1Id 무효): 고아 L2를 기존 L1에 재할당
 * 2. FM→PC (productCharId 무효): 무효 productCharId를 null로 설정
 * 3. FailureLink (fmId/feId/fcId 무효): 끊어진 링크 삭제 + 종속 레코드 정리
 * 4. RiskAnalysis (linkId 무효): 고아 Risk 삭제
 * 5. FC→L3Func (l3FuncId 무효): l3FuncId를 null로 설정
 * 6. FM→L2Func (l2FuncId 무효): l2FuncId를 null로 설정
 * 7. L3→L2 (l2Id 무효): 고아 L3를 첫 번째 유효 L2에 재할당
 * 8. soft-deleted FailureLink 영구 삭제
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';

export const runtime = 'nodejs';

interface RepairResult {
  relation: string;
  action: 'reassign' | 'nullify' | 'delete';
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

    const prisma = getPrismaForSchema(schema);
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Prisma not configured' }, { status: 500 });
    }

    const results: RepairResult[] = [];

    // ─── 유효 ID 세트 로드 (병렬) ───
    const [l1All, l2All, l2FuncAll, l3FuncAll, pcAll, fmAllRaw, feAll, fcAll] = await Promise.all([
      prisma.l1Structure.findMany({ where: { fmeaId }, select: { id: true } }),
      prisma.l2Structure.findMany({ where: { fmeaId }, select: { id: true, l1Id: true } }),
      prisma.l2Function.findMany({ where: { fmeaId }, select: { id: true } }),
      prisma.l3Function.findMany({ where: { fmeaId }, select: { id: true } }),
      prisma.processProductChar.findMany({ where: { fmeaId }, select: { id: true } }),
      prisma.failureMode.findMany({ where: { fmeaId }, select: { id: true, l2FuncId: true, productCharId: true } }),
      prisma.failureEffect.findMany({ where: { fmeaId }, select: { id: true } }),
      prisma.failureCause.findMany({ where: { fmeaId }, select: { id: true, l3FuncId: true } }),
    ]);

    const l1Ids = new Set(l1All.map((x: { id: string }) => x.id));
    const l2Ids = new Set(l2All.map((x: { id: string }) => x.id));
    const l2FuncIds = new Set(l2FuncAll.map((x: { id: string }) => x.id));
    const l3FuncIds = new Set(l3FuncAll.map((x: { id: string }) => x.id));
    const pcIds = new Set(pcAll.map((x: { id: string }) => x.id));
    const fmIds = new Set(fmAllRaw.map((x: { id: string }) => x.id));
    const feIds = new Set(feAll.map((x: { id: string }) => x.id));
    const fcIds = new Set(fcAll.map((x: { id: string }) => x.id));

    await prisma.$transaction(async (tx: any) => {
      // ─── 1. L2→L1 고아: 기존 L1에 재할당 ───
      const orphanL2 = l2All.filter((r: { id: string; l1Id: string | null }) =>
        r.l1Id && !l1Ids.has(r.l1Id)
      );
      if (orphanL2.length > 0 && l1Ids.size > 0) {
        const targetL1Id = l1All[0].id; // 첫 번째 유효 L1에 할당
        const orphanL2Ids = orphanL2.map((r: { id: string }) => r.id);
        const upd = await tx.l2Structure.updateMany({
          where: { id: { in: orphanL2Ids } },
          data: { l1Id: targetL1Id },
        });
        results.push({
          relation: 'L2→L1 (l1Id)',
          action: 'reassign',
          count: upd.count,
          detail: `${upd.count}개 L2를 L1(${targetL1Id.slice(0, 20)}...)에 재할당`,
        });
      }

      // ─── 2. FM→PC 고아: productCharId를 null로 설정 ───
      const orphanFmPc = fmAllRaw.filter(
        (r: { id: string; productCharId: string | null }) =>
          r.productCharId && !pcIds.has(r.productCharId)
      );
      if (orphanFmPc.length > 0) {
        const orphanFmPcIds = orphanFmPc.map((r: { id: string }) => r.id);
        const upd = await tx.failureMode.updateMany({
          where: { id: { in: orphanFmPcIds } },
          data: { productCharId: null },
        });
        results.push({
          relation: 'FM→PC (productCharId)',
          action: 'nullify',
          count: upd.count,
          detail: `${upd.count}개 FM의 productCharId를 null로 설정 (데이터 보존)`,
        });
      }

      // ─── 3. FM→L2Func 고아: l2FuncId를 null로 설정 ───
      const orphanFmFunc = fmAllRaw.filter(
        (r: { id: string; l2FuncId: string | null }) =>
          r.l2FuncId && !l2FuncIds.has(r.l2FuncId)
      );
      if (orphanFmFunc.length > 0) {
        const ids = orphanFmFunc.map((r: { id: string }) => r.id);
        const upd = await tx.failureMode.updateMany({
          where: { id: { in: ids } },
          data: { l2FuncId: null },
        });
        results.push({
          relation: 'FM→L2Func (l2FuncId)',
          action: 'nullify',
          count: upd.count,
          detail: `${upd.count}개 FM의 l2FuncId를 null로 설정`,
        });
      }

      // ─── 4. FC→L3Func 고아: l3FuncId를 null로 설정 ───
      const orphanFc = fcAll.filter(
        (r: { id: string; l3FuncId: string | null }) =>
          r.l3FuncId && !l3FuncIds.has(r.l3FuncId)
      );
      if (orphanFc.length > 0) {
        const ids = orphanFc.map((r: { id: string }) => r.id);
        const upd = await tx.failureCause.updateMany({
          where: { id: { in: ids } },
          data: { l3FuncId: null },
        });
        results.push({
          relation: 'FC→L3Func (l3FuncId)',
          action: 'nullify',
          count: upd.count,
          detail: `${upd.count}개 FC의 l3FuncId를 null로 설정`,
        });
      }

      // ─── 5. FailureLink 고아: fmId/feId/fcId 무효 → 삭제 + 종속 정리 ───
      const linksAll = await tx.failureLink.findMany({
        where: { fmeaId, deletedAt: null },
        select: { id: true, fmId: true, feId: true, fcId: true },
      });
      const orphanLinkIds = linksAll
        .filter((r: { id: string; fmId: string | null; feId: string | null; fcId: string | null }) =>
          (r.fmId && !fmIds.has(r.fmId)) ||
          (r.feId && !feIds.has(r.feId)) ||
          (r.fcId && !fcIds.has(r.fcId))
        )
        .map((r: { id: string }) => r.id);

      if (orphanLinkIds.length > 0) {
        // 종속 레코드 삭제 (Opt → RA → FA → Link)
        await tx.optimization.deleteMany({ where: { fmeaId, linkId: { in: orphanLinkIds } } });
        await tx.riskAnalysis.deleteMany({ where: { fmeaId, linkId: { in: orphanLinkIds } } });
        await tx.failureAnalysis.deleteMany({ where: { fmeaId, linkId: { in: orphanLinkIds } } });
        const del = await tx.failureLink.deleteMany({ where: { id: { in: orphanLinkIds } } });
        results.push({
          relation: 'FailureLink (FM/FE/FC 무효)',
          action: 'delete',
          count: del.count,
          detail: `${del.count}개 끊어진 FailureLink + 종속 레코드 삭제`,
        });
      }

      // ─── 6. RiskAnalysis 고아: linkId가 유효 active link에 없음 ───
      const activeLinkIds = new Set(linksAll.map((r: { id: string }) => r.id));
      // orphanLink 삭제 후 남은 유효 링크에서 제외된 것도 처리
      for (const olId of orphanLinkIds) activeLinkIds.delete(olId);

      const raAll = await tx.riskAnalysis.findMany({
        where: { fmeaId },
        select: { id: true, linkId: true },
      });
      const orphanRaIds = raAll
        .filter((r: { id: string; linkId: string | null }) => r.linkId && !activeLinkIds.has(r.linkId))
        .map((r: { id: string }) => r.id);

      if (orphanRaIds.length > 0) {
        await tx.optimization.deleteMany({ where: { fmeaId, riskId: { in: orphanRaIds } } });
        const del = await tx.riskAnalysis.deleteMany({ where: { id: { in: orphanRaIds } } });
        results.push({
          relation: 'RiskAnalysis (linkId 무효)',
          action: 'delete',
          count: del.count,
          detail: `${del.count}개 고아 RiskAnalysis + Optimization 삭제`,
        });
      }

      // ─── 7. L3→L2 고아: 유효 L2에 재할당 ───
      const l3All2 = await tx.l3Structure.findMany({
        where: { fmeaId },
        select: { id: true, l2Id: true },
      });
      const orphanL3 = l3All2.filter(
        (r: { id: string; l2Id: string | null }) => r.l2Id && !l2Ids.has(r.l2Id)
      );
      if (orphanL3.length > 0 && l2Ids.size > 0) {
        const targetL2Id = [...l2Ids][0];
        const ids = orphanL3.map((r: { id: string }) => r.id);
        const upd = await tx.l3Structure.updateMany({
          where: { id: { in: ids } },
          data: { l2Id: targetL2Id },
        });
        results.push({
          relation: 'L3→L2 (l2Id)',
          action: 'reassign',
          count: upd.count,
          detail: `${upd.count}개 L3를 L2(${targetL2Id.slice(0, 20)}...)에 재할당`,
        });
      }
    });

    // ─── 8. soft-deleted FailureLink 영구 삭제 ───
    const softDeletedLinks = await prisma.failureLink.findMany({
      where: { fmeaId, deletedAt: { not: null } },
      select: { id: true },
    });

    if (softDeletedLinks.length > 0) {
      const softIds = softDeletedLinks.map((r: { id: string }) => r.id);
      await prisma.$transaction(async (tx: any) => {
        await tx.optimization.deleteMany({ where: { fmeaId, linkId: { in: softIds } } });
        await tx.riskAnalysis.deleteMany({ where: { fmeaId, linkId: { in: softIds } } });
        await tx.failureAnalysis.deleteMany({ where: { fmeaId, linkId: { in: softIds } } });
        const del = await tx.failureLink.deleteMany({ where: { id: { in: softIds } } });
        if (del.count > 0) {
          results.push({
            relation: 'SoftDeleted FailureLink',
            action: 'delete',
            count: del.count,
            detail: `${del.count}개 소프트 삭제 링크 영구 정리`,
          });
        }
      });
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
    console.error('[verify-integrity/fix] error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
