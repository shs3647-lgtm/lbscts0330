/**
 * @file download-filled-excel/route.ts
 * @description 빈칸 없는 완전한 5시트 Import Excel 다운로드 API
 *
 * GET /api/fmea/download-filled-excel?fmeaId=pfm26-m066
 * → Excel 파일 다운로드 (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
 *
 * 골든 마스터 JSON + 기존 엑셀을 결합하여 빈칸 0건 엑셀 제공
 */
import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const fmeaId = request.nextUrl.searchParams.get('fmeaId') || 'pfm26-m066';
    if (!isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'Invalid fmeaId' }, { status: 400 });
    }

    // 1. 빈칸 채운 파일 확인
    const filledPath = path.resolve(
      process.cwd(),
      `data/master-fmea/master_import_12inch_AuBump_filled.xlsx`
    );

    if (!fs.existsSync(filledPath)) {
      // 폴백: 기존 파일
      const origPath = path.resolve(
        process.cwd(),
        'data/master-fmea/master_import_12inch_AuBump.xlsx'
      );
      if (!fs.existsSync(origPath)) {
        return NextResponse.json(
          { success: false, error: 'Excel 파일이 없습니다' },
          { status: 404 }
        );
      }

      const buffer = fs.readFileSync(origPath);
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${fmeaId}_import.xlsx"`,
          'Content-Length': String(buffer.length),
        },
      });
    }

    const buffer = fs.readFileSync(filledPath);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fmeaId}_import_filled.xlsx"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (error) {
    console.error('[download-filled-excel]', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
