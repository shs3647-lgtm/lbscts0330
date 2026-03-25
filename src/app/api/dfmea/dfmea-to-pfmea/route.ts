/**
 * @file route.ts
 * @description DFMEA -> PFMEA 연동 API
 * POST /api/dfmea/dfmea-to-pfmea — FM->FC 전환 미리보기
 * GET  /api/dfmea/dfmea-to-pfmea?dfmeaId=xxx — DFMEA FM 목록 조회
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { getProjectSchemaName } from '@/lib/project-schema';

interface DfmeaToPfmeaRequest {
  dfmeaId: string;
  pfmeaId: string;
  selectedFmIds?: string[];
}

interface MappingEntry {
  dfmeaFmId: string;
  dfmeaFmName: string;
  pfmeaFcId: string;
  pfmeaFcName: string;
}

async function queryFMs(dfmeaId: string, selectedFmIds?: string[]) {
  const prisma = getPrisma();
  if (!prisma) throw new Error('Database connection failed');

  const schema = getProjectSchemaName(dfmeaId);
  await prisma.$executeRawUnsafe(`SET search_path TO "${schema}", public`);

  try {
    const where = selectedFmIds?.length ? { id: { in: selectedFmIds } } : {};
    const failureModes = await prisma.failureMode.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
    return failureModes;
  } finally {
    await prisma.$executeRawUnsafe(`SET search_path TO public`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: DfmeaToPfmeaRequest = await req.json();
    const { dfmeaId, pfmeaId, selectedFmIds } = body;

    if (!dfmeaId || !pfmeaId) {
      return NextResponse.json({ error: 'dfmeaId, pfmeaId 필수' }, { status: 400 });
    }
    if (!isValidFmeaId(dfmeaId) || !isValidFmeaId(pfmeaId)) {
      return NextResponse.json({ error: '유효하지 않은 FMEA ID' }, { status: 400 });
    }

    const failureModes = await queryFMs(dfmeaId, selectedFmIds);

    if (failureModes.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'DFMEA에 고장형태(FM)가 없습니다. 먼저 DFMEA 워크시트를 작성하세요.',
        mappings: [],
      });
    }

    const mappings: MappingEntry[] = failureModes.map((fm) => ({
      dfmeaFmId: fm.id,
      dfmeaFmName: fm.mode || '',
      pfmeaFcId: '',
      pfmeaFcName: fm.mode || '',
    }));

    return NextResponse.json({
      success: true,
      dfmeaId,
      pfmeaId,
      totalFMs: failureModes.length,
      mappings,
      message: `DFMEA ${failureModes.length}건의 FM을 PFMEA FC로 전환 준비 완료`,
    });
  } catch (error) {
    console.error('[DFMEA-to-PFMEA] Error:', error);
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const dfmeaId = req.nextUrl.searchParams.get('dfmeaId');
    if (!dfmeaId || !isValidFmeaId(dfmeaId)) {
      return NextResponse.json({ error: '유효한 dfmeaId 필수' }, { status: 400 });
    }

    const failureModes = await queryFMs(dfmeaId);

    return NextResponse.json({
      dfmeaId,
      totalFMs: failureModes.length,
      failureModes: failureModes.map((fm) => ({
        id: fm.id,
        mode: fm.mode,
      })),
    });
  } catch (error) {
    console.error('[DFMEA-to-PFMEA GET] Error:', error);
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 500 });
  }
}
