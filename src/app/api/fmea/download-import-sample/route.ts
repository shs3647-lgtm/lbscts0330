/**
 * @file GET /api/fmea/download-import-sample
 * @description aubump Import 샘플 엑셀 다운로드 (4시트: L1+L2+L3+FC, N:1:N 다대다)
 *
 * 사용법: GET /api/fmea/download-import-sample
 *   → aubump_import_sample.xlsx 다운로드 (public/downloads에 캐시)
 *
 * @created 2026-03-22
 */
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'downloads', 'aubump_import_sample.xlsx');

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: '샘플 파일이 없습니다. scripts/generate-import-4sheet.ts --merge 실행 필요' }, { status: 404 });
    }

    const buffer = fs.readFileSync(filePath);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="aubump_import_sample.xlsx"',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (e: any) {
    console.error('[download-import-sample] error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
