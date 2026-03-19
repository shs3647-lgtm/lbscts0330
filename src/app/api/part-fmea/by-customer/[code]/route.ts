/**
 * @file 고객사별 Part FMEA 목록 API
 * @description GET: customerName LIKE '%code%' (case insensitive) 검색
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

type RouteParams = { params: Promise<{ code: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { code } = await params;

    if (!code || code.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '고객사 코드를 입력해주세요' },
        { status: 400 }
      );
    }

    const data = await prisma.partFmea.findMany({
      where: {
        customerName: { contains: code, mode: 'insensitive' },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        controlPlan: { select: { id: true, cpCode: true, status: true } },
        processFlow: { select: { id: true, pfdCode: true, status: true } },
        sourceFamilyMaster: { select: { id: true, code: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data, total: data.length });
  } catch (error: unknown) {
    console.error('[part-fmea/by-customer] Error:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
