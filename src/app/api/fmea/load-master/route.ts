/**
 * @file load-master/route.ts
 * @description 마스터 FMEA 데이터 로드 API
 *
 * GET /api/fmea/load-master?fmeaId=xxx
 *
 * DB(PfmeaMasterDataset) 우선 → 없으면 data/master-fmea/{fmeaId}.json 파일에서 로드
 *
 * @created 2026-03-17
 */
import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { getPrismaForSchema } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const fmeaId = request.nextUrl.searchParams.get('fmeaId');

    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json(
        { success: false, error: 'fmeaId가 없거나 유효하지 않습니다' },
        { status: 400 }
      );
    }

    const normalizedFmeaId = fmeaId.toLowerCase();

    // 1. DB 우선 로드 (PfmeaMasterDataset)
    const publicPrisma = getPrismaForSchema('public');
    if (publicPrisma) {
      try {
        const dataset = await publicPrisma.pfmeaMasterDataset.findUnique({
          where: { fmeaId: normalizedFmeaId },
          include: { flatItems: true },
        });

        if (dataset) {
          const flatData = dataset.flatItems.map((item) => ({
            id: item.id,
            processNo: item.processNo,
            category: item.category,
            itemCode: item.itemCode,
            value: item.value,
            m4: item.m4,
            specialChar: item.specialChar,
            parentItemId: item.parentItemId,
          }));

          const chains = dataset.failureChains as unknown[] || [];

          const stats = {
            flatDataCount: flatData.length,
            chainCount: Array.isArray(chains) ? chains.length : 0,
            version: dataset.version,
            source: 'database' as const,
            updatedAt: dataset.updatedAt.toISOString(),
          };

          console.info(`[load-master] DB에서 로드 완료: ${normalizedFmeaId} (flatItems: ${flatData.length}건)`);

          return NextResponse.json({
            success: true,
            fmeaId: normalizedFmeaId,
            source: 'database',
            data: {
              flatData,
              chains,
              stats,
            },
          }, {
            headers: { 'Cache-Control': 'private, max-age=60' },
          });
        }
      } catch (dbErr: unknown) {
        console.error('[load-master] DB 로드 실패, 파일 폴백:', dbErr instanceof Error ? dbErr.message : String(dbErr));
      }
    }

    // 2. 파일 폴백
    const jsonPath = path.join(process.cwd(), 'data', 'master-fmea', `${normalizedFmeaId}.json`);

    try {
      const raw = await readFile(jsonPath, 'utf-8');
      const parsed = JSON.parse(raw);

      console.info(`[load-master] 파일에서 로드 완료: ${jsonPath}`);

      return NextResponse.json({
        success: true,
        fmeaId: normalizedFmeaId,
        source: 'file',
        data: {
          atomicDB: parsed.atomicDB,
          flatData: parsed.flatData,
          chains: parsed.chains,
          stats: {
            ...parsed.stats,
            source: 'file',
            exportedAt: parsed.exportedAt,
          },
        },
      }, {
        headers: { 'Cache-Control': 'private, max-age=300' },
      });
    } catch (fileErr: unknown) {
      console.error('[load-master] 파일 로드도 실패:', fileErr instanceof Error ? fileErr.message : String(fileErr));
    }

    return NextResponse.json({
      success: false,
      error: `마스터 데이터를 찾을 수 없습니다: ${normalizedFmeaId}`,
    }, { status: 404 });
  } catch (e: unknown) {
    console.error('[load-master] error:', e instanceof Error ? e.message : String(e));
    return NextResponse.json(
      { success: false, error: safeErrorMessage(e) },
      { status: 500 }
    );
  }
}
