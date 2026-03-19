/**
 * @file Part FMEA 목록 조회 API
 * @description GET: 필터 기반 Part FMEA 목록 조회 (customerName, status, sourceType)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';
import { FmeaDocStatus, FmeaSourceType } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const customerName = searchParams.get('customerName');
    const status = searchParams.get('status');
    const sourceType = searchParams.get('sourceType');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (customerName) {
      where.customerName = { contains: customerName, mode: 'insensitive' };
    }
    if (status && Object.values(FmeaDocStatus).includes(status as FmeaDocStatus)) {
      where.status = status as FmeaDocStatus;
    }
    if (sourceType && Object.values(FmeaSourceType).includes(sourceType as FmeaSourceType)) {
      where.sourceType = sourceType as FmeaSourceType;
    }

    const [data, total] = await Promise.all([
      prisma.partFmea.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          controlPlan: { select: { id: true, cpCode: true, status: true } },
          processFlow: { select: { id: true, pfdCode: true, status: true } },
          sourceFamilyMaster: { select: { id: true, code: true, name: true } },
          _count: { select: { revisionHistory: true } },
        },
      }),
      prisma.partFmea.count({ where }),
    ]);

    return NextResponse.json({ success: true, data, total, page, limit });
  } catch (error: unknown) {
    console.error('[part-fmea/list] Error:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
