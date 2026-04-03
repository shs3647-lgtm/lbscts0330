/**
 * @file parsing-validate/route.ts
 * @description 파싱 검증 기준표 API
 *
 * POST /api/fmea/parsing-validate
 *   body: { fmeaId, flatData?, chains? }
 *   - flatData/chains 제공 시: 클라이언트 데이터로 검증
 *   - fmeaId만 제공 시: DB에서 PfmeaMasterFlatItem + MasterFailureChain 로드 후 검증
 *
 * 응답: ParseValidationReport (검증 결과 + 자동수정 내역 + 피드백)
 *
 * @created 2026-03-19
 */

import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { getBaseDatabaseUrl, getPrismaForSchema, getPrisma } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';
import {
  runParsingCriteriaValidation,
  formatReportAsTable,
  type MasterChainLike,
} from '@/app/(fmea-core)/pfmea/import/utils/parsing-criteria-validator';
import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';

export const runtime = 'nodejs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaAny = any;

async function loadFlatDataFromDB(fmeaId: string): Promise<ImportedFlatData[]> {
  const publicPrisma = getPrisma();
  if (!publicPrisma) return [];
  const items: PrismaAny[] = await publicPrisma.pfmeaMasterFlatItem.findMany({
    where: { dataset: { fmeaId } },
    orderBy: [{ processNo: 'asc' }, { itemCode: 'asc' }],
  });

  return items.map((item: PrismaAny) => ({
    id: item.id,
    processNo: item.processNo || '',
    category: item.category || '',
    itemCode: item.itemCode || '',
    value: item.value || '',
    m4: item.m4 || undefined,
    parentItemId: item.parentItemId || undefined,
    specialChar: item.specialChar || undefined,
    belongsTo: item.belongsTo || undefined,
    createdAt: item.createdAt || new Date(),
  }));
}

async function loadChainsFromDB(prisma: PrismaAny, fmeaId: string): Promise<MasterChainLike[]> {
  const links: PrismaAny[] = await prisma.failureLink.findMany({
    where: { fmeaId },
    include: {
      failureMode: { select: { mode: true } },
      failureCause: { select: { cause: true, l2StructId: true } },
      failureEffect: { select: { effect: true, category: true } },
      riskAnalyses: {
        select: {
          severity: true,
          occurrence: true,
          detection: true,
          preventionControl: true,
          detectionControl: true,
        },
        take: 1,
      },
    },
  });

  const l2Map = new Map<string, string>();
  const l2List: PrismaAny[] = await prisma.l2Structure.findMany({
    where: { fmeaId },
    select: { id: true, no: true },
  });
  for (const l2 of l2List) l2Map.set(l2.id, l2.no || '');

  return links.map((link: PrismaAny) => {
    const l2StructId = link.failureCause?.l2StructId;
    const processNo = l2StructId ? l2Map.get(l2StructId) || '' : '';
    const ra = link.riskAnalyses?.[0];

    return {
      processNo,
      fmValue: link.failureMode?.mode || '',
      fcValue: link.failureCause?.cause || '',
      feValue: link.failureEffect?.effect || '',
      feScope: link.failureEffect?.category || '',
      severity: ra?.severity || 0,
      occurrence: ra?.occurrence || 0,
      detection: ra?.detection || 0,
      pcValue: ra?.preventionControl || '',
      dcValue: ra?.detectionControl || '',
    };
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fmeaId } = body;
    let { flatData, chains } = body;

    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'fmeaId 필요' }, { status: 400 });
    }

    const normalizedFmeaId = fmeaId.toLowerCase();
    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) return NextResponse.json({ success: false, error: 'DB 미설정' }, { status: 500 });

    const schema = getProjectSchemaName(normalizedFmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) return NextResponse.json({ success: false, error: 'Prisma 실패' }, { status: 500 });

    if (!flatData || flatData.length === 0) {
      flatData = await loadFlatDataFromDB(normalizedFmeaId);
    }
    if (!chains || chains.length === 0) {
      chains = await loadChainsFromDB(prisma, normalizedFmeaId);
    }

    const report = runParsingCriteriaValidation(flatData, chains);
    const tableText = formatReportAsTable(report);

    console.warn(`[parsing-validate] fmeaId=${normalizedFmeaId}\n${tableText}`);

    return NextResponse.json({
      success: true,
      fmeaId: normalizedFmeaId,
      report,
      tableText,
    });
  } catch (e) {
    console.error('[parsing-validate] POST error:', e);
    return NextResponse.json({ success: false, error: safeErrorMessage(e) }, { status: 500 });
  }
}
