/**
 * @file route.ts
 * @description FmeaLegacyData -> FmeaWorksheetData 마이그레이션 API
 * @version 1.0.0
 * @created 2026-01-13
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * POST: 기존 FmeaLegacyData를 FmeaWorksheetData로 마이그레이션
 */
export async function POST(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
  }

  try {
    // 1. 모든 FmeaLegacyData 조회
    const legacyDataList = await prisma.fmeaLegacyData.findMany();
    
    if (legacyDataList.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'FmeaLegacyData에 마이그레이션할 데이터가 없습니다.',
        migrated: 0,
      });
    }

    let migratedCount = 0;
    const results: { fmeaId: string; status: string }[] = [];

    // 2. 각 레거시 데이터를 FmeaWorksheetData로 복사
    for (const legacy of legacyDataList) {
      try {
        const data = legacy.data as any;
        
        if (!data) {
          results.push({ fmeaId: legacy.fmeaId, status: 'skipped (no data)' });
          continue;
        }

        await prisma.fmeaWorksheetData.upsert({
          where: { fmeaId: legacy.fmeaId },
          create: {
            fmeaId: legacy.fmeaId,
            l1Data: data.l1 || null,
            l2Data: data.l2 || null,
            riskData: data.riskData || null,
            failureLinks: data.failureLinks || null,
            tab: data.tab || 'structure',
            version: legacy.version || '1.0.0',
          },
          update: {
            l1Data: data.l1 || null,
            l2Data: data.l2 || null,
            riskData: data.riskData || null,
            failureLinks: data.failureLinks || null,
            tab: data.tab || 'structure',
            version: legacy.version || '1.0.0',
          },
        });

        migratedCount++;
        results.push({ fmeaId: legacy.fmeaId, status: 'success' });
        console.log(`✅ 마이그레이션 완료: ${legacy.fmeaId}`);
      } catch (err: any) {
        results.push({ fmeaId: legacy.fmeaId, status: `error: ${err.message}` });
        console.error(`❌ 마이그레이션 실패: ${legacy.fmeaId}`, err.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${migratedCount}개 프로젝트가 FmeaWorksheetData로 마이그레이션되었습니다.`,
      migrated: migratedCount,
      total: legacyDataList.length,
      results,
    });
  } catch (error: any) {
    console.error('[Migrate Worksheet API] 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || '마이그레이션 실패' },
      { status: 500 }
    );
  }
}

/**
 * GET: FmeaWorksheetData 현황 조회
 */
export async function GET(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
  }

  try {
    const worksheetData = await prisma.fmeaWorksheetData.findMany({
      select: {
        fmeaId: true,
        tab: true,
        version: true,
        savedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const legacyCount = await prisma.fmeaLegacyData.count();
    const worksheetCount = worksheetData.length;

    return NextResponse.json({
      success: true,
      summary: {
        legacyDataCount: legacyCount,
        worksheetDataCount: worksheetCount,
        needsMigration: legacyCount > worksheetCount,
      },
      worksheetData,
    });
  } catch (error: any) {
    console.error('[Migrate Worksheet API] 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || '조회 실패' },
      { status: 500 }
    );
  }
}


