/**
 * @file route.ts
 * @description CP 워크시트 확정 상태 API
 *
 * GET  /api/control-plan/worksheet/confirmed?cpNo={cpNo}  -> load confirmed state
 * POST /api/control-plan/worksheet/confirmed              -> save confirmed state
 * 
 * 벤치마킹: PFMEA 확정 상태 관리
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrismaForCp } from '@/lib/project-schema';
import type { CpConfirmedState } from '@/app/(fmea-core)/control-plan/worksheet/schema';

export const runtime = 'nodejs';

type SearchParams = Record<string, string | undefined>;

type SaveBody = {
  cpNo: string;
  confirmedState: Partial<CpConfirmedState>;
};

function jsonOk(data: unknown) {
  return NextResponse.json(data, { status: 200 });
}

// ★★★ 2026-02-05: API 응답 형식 통일 (ok → success) ★★★
export async function GET(req: NextRequest) {
  const sp = Object.fromEntries(req.nextUrl.searchParams.entries()) as SearchParams;
  const cpNo = sp.cpNo;
  if (!cpNo) {
    return NextResponse.json({ error: 'cpNo is required' }, { status: 400 });
  }

  // ★ Rule 19: 프로젝트 스키마 사용 — cpConfirmedState는 프로젝트 전용 스키마에서 조회
  const prisma = await getPrismaForCp(cpNo);
  if (!prisma) return jsonOk({ success: false, error: 'DATABASE_URL not configured' });

  try {
    const confirmedState = await prisma.cpConfirmedState.findUnique({
      where: { cpNo },
    });

    if (!confirmedState) {
      // 기본 확정 상태 반환
      return jsonOk({
        success: true,
        confirmedState: {
          id: '',
          cpNo,
          processConfirmed: false,
          detectorConfirmed: false,
          controlItemConfirmed: false,
          controlMethodConfirmed: false,
          reactionPlanConfirmed: false,
        },
      });
    }

    return jsonOk({
      success: true,
      confirmedState: {
        id: confirmedState.id,
        cpNo: confirmedState.cpNo,
        processConfirmed: confirmedState.processConfirmed,
        detectorConfirmed: confirmedState.detectorConfirmed,
        controlItemConfirmed: confirmedState.controlItemConfirmed,
        controlMethodConfirmed: confirmedState.controlMethodConfirmed,
        reactionPlanConfirmed: confirmedState.reactionPlanConfirmed,
        createdAt: confirmedState.createdAt.toISOString(),
        updatedAt: confirmedState.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[CP Confirmed API] GET error:', error);
    return NextResponse.json({ error: error.message || 'Failed to load confirmed state' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as SaveBody;
  if (!body.cpNo || !body.confirmedState) {
    return NextResponse.json({ error: 'cpNo and confirmedState are required' }, { status: 400 });
  }

  // ★ Rule 19: 프로젝트 스키마 사용 — cpConfirmedState는 프로젝트 전용 스키마에 저장
  const prisma = await getPrismaForCp(body.cpNo);
  if (!prisma) return jsonOk({ success: false, error: 'DATABASE_URL not configured' });

  try {
    const { cpNo, confirmedState } = body;

    const result = await prisma.cpConfirmedState.upsert({
      where: { cpNo },
      create: {
        cpNo,
        processConfirmed: confirmedState.processConfirmed ?? false,
        detectorConfirmed: confirmedState.detectorConfirmed ?? false,
        controlItemConfirmed: confirmedState.controlItemConfirmed ?? false,
        controlMethodConfirmed: confirmedState.controlMethodConfirmed ?? false,
        reactionPlanConfirmed: confirmedState.reactionPlanConfirmed ?? false,
      },
      update: {
        processConfirmed: confirmedState.processConfirmed ?? undefined,
        detectorConfirmed: confirmedState.detectorConfirmed ?? undefined,
        controlItemConfirmed: confirmedState.controlItemConfirmed ?? undefined,
        controlMethodConfirmed: confirmedState.controlMethodConfirmed ?? undefined,
        reactionPlanConfirmed: confirmedState.reactionPlanConfirmed ?? undefined,
      },
    });

    return jsonOk({
      success: true,
      confirmedState: {
        id: result.id,
        cpNo: result.cpNo,
        processConfirmed: result.processConfirmed,
        detectorConfirmed: result.detectorConfirmed,
        controlItemConfirmed: result.controlItemConfirmed,
        controlMethodConfirmed: result.controlMethodConfirmed,
        reactionPlanConfirmed: result.reactionPlanConfirmed,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[CP Confirmed API] POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save confirmed state' }, { status: 500 });
  }
}

