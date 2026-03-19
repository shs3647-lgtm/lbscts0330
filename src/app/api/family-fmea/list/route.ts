/**
 * @file Family FMEA List API
 * GET: List all FamilyFmea with optional filters
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

export async function GET(request: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const familyMasterId = searchParams.get('familyMasterId');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (familyMasterId) where.familyMasterId = familyMasterId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.familyFmea.findMany({
        where,
        include: {
          familyMaster: true,
          masterProcess: true,
          _count: {
            select: {
              controlPlans: true,
              processFlows: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.familyFmea.count({ where }),
    ]);

    return NextResponse.json({ success: true, data, total });
  } catch (error: unknown) {
    console.error('[family-fmea/list] Error:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}
