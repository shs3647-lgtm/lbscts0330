/**
 * @file verify-counts/route.ts
 * DB 엔티티 카운트 검증 API — pfmea_master_flat_items 기준
 *
 * GET /api/fmea/verify-counts?fmeaId=xxx
 * Returns: { success: true, counts: { A1: 21, A2: 21, ... C4: 16 } }
 *
 * ★ 2026-03-29: flat items 기준 카운트로 전면 변경
 *   엔티티 테이블(l1Function 등)이 아닌 pfmea_master_flat_items에서
 *   itemCode별 GROUP BY 카운트 — 원본 flat data와 1:1 일치 보장
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
    const schemaName = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: getBaseDatabaseUrl(), schema: schemaName });
    const prisma = getPrismaForSchema(schemaName);

    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Import 먼저 실행해주세요 (프로젝트 스키마 없음)', schema: schemaName },
        { status: 404 },
      );
    }

    // ★ 2026-03-29: pfmea_master_flat_items 기준 — 원본 flat data와 1:1 일치
    // 1) 해당 FMEA의 dataset 찾기
    const dataset = await prisma.pfmeaMasterDataset.findUnique({
      where: { fmeaId },
      select: { id: true },
    });

    const counts: Record<string, number> = {};
    const ALL_CODES = [
      'A1', 'A2', 'A3', 'A4', 'A5', 'A6',
      'B1', 'B2', 'B3', 'B4', 'B5',
      'C1', 'C2', 'C3', 'C4',
      'D1', 'D2', 'D3', 'D4', 'D5',
    ];

    if (dataset) {
      // 2) flat items에서 itemCode별 카운트
      const grouped = await prisma.pfmeaMasterFlatItem.groupBy({
        by: ['itemCode'],
        where: { datasetId: dataset.id },
        _count: { id: true },
      });

      for (const code of ALL_CODES) {
        counts[code] = 0;
      }
      for (const g of grouped) {
        counts[g.itemCode] = g._count.id;
      }

      // 3) D코드: flat items에 D코드가 없으면 failureChains에서 파생
      const dCodes = ['D1', 'D2', 'D3', 'D4', 'D5'];
      const hasDData = dCodes.some(d => (counts[d] || 0) > 0);
      if (!hasDData) {
        // failureChains JSON에서 카운트
        const ds = await prisma.pfmeaMasterDataset.findUnique({
          where: { fmeaId },
          select: { failureChains: true },
        });
        const chains: any[] = (ds?.failureChains as any[]) || [];
        if (chains.length > 0) {
          counts['D1'] = new Set(chains.map(c => (c.feValue || '').trim()).filter(Boolean)).size;
          counts['D2'] = new Set(chains.map(c => c.processNo).filter(Boolean)).size;
          counts['D3'] = new Set(chains.map(c => `${c.processNo}|${c.fmValue}`).filter(Boolean)).size;
          counts['D4'] = new Set(chains.map(c => `${c.processNo}|${c.m4||''}|${c.workElement||''}`).filter(Boolean)).size;
          counts['D5'] = new Set(chains.map(c => `${c.processNo}|${c.m4||''}|${c.workElement||''}|${c.fcValue||''}`).filter(Boolean)).size;
        }
      }
    } else {
      // dataset 없으면 모두 0
      for (const code of ALL_CODES) {
        counts[code] = 0;
      }
    }

    return NextResponse.json({ success: true, fmeaId, schema: schemaName, counts });
  } catch (error) {
    console.error('[verify-counts] Error:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 },
    );
  }
}
