/**
 * @file reverse-import/excel/route.ts
 * 역설계 Import — DB → Import 엑셀 다운로드
 *
 * GET /api/fmea/reverse-import/excel?fmeaId=pfm26-m002
 */

import { NextRequest, NextResponse } from 'next/server';
import { assertFmeaId, getIsolatedPrisma } from '@/lib/fmea-core/guards';
import { generateImportExcelFromDB } from '@/lib/fmea-core/generate-import-excel';
import { safeErrorMessage } from '@/lib/security';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const fmeaId = req.nextUrl.searchParams.get('fmeaId') || '';
    assertFmeaId(fmeaId);

    const prisma = await getIsolatedPrisma(fmeaId);
    const { buffer, fileName, stats } = await generateImportExcelFromDB(prisma, fmeaId);

    console.info(`[reverse-excel] ${fmeaId} → ${fileName} (L1=${stats.l1Rows} L2=${stats.l2Rows} L3=${stats.l3Rows} FC=${stats.fcRows} FA=${stats.faRows})`);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    console.error('[reverse-excel] 오류:', e);
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(e) },
      { status: 500 }
    );
  }
}
