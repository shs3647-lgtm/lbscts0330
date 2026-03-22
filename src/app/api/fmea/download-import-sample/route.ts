/**
 * @file GET /api/fmea/download-import-sample
 * @description aubump Import 샘플 엑셀 다운로드 (4시트: L1+L2+L3+FC)
 *
 * 사용법: GET /api/fmea/download-import-sample
 *   → aubump_import_sample.xlsx 다운로드
 *
 * @created 2026-03-22
 */
import { NextResponse } from 'next/server';
import { extractFromExcel, generateImportExcel } from '../../../../../scripts/generate-import-4sheet';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const inputPath = 'C:/Users/Administrator/Desktop/LB쎄미콘/aubump/aubump.xlsx';

    if (!fs.existsSync(inputPath)) {
      return NextResponse.json({ error: '원본 엑셀 파일을 찾을 수 없습니다: ' + inputPath }, { status: 404 });
    }

    const data = await extractFromExcel(inputPath);
    const wb = await generateImportExcel(data);

    const buffer = await wb.xlsx.writeBuffer();

    const uint8 = new Uint8Array(buffer as ArrayBuffer);
    return new NextResponse(uint8, {
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
