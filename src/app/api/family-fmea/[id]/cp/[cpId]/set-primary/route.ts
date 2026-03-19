/**
 * @file Set CP as Primary API
 * PUT: Set this CP as primary, unset others
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

type RouteParams = { params: Promise<{ id: string; cpId: string }> };

export async function PUT(_request: NextRequest, { params }: RouteParams) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    const { id, cpId } = await params;

    // Verify CP exists and belongs to this FamilyFmea
    const cp = await prisma.familyControlPlan.findUnique({ where: { id: cpId } });
    if (!cp || cp.familyFmeaId !== id) {
      return NextResponse.json({ success: false, error: 'Control plan not found' }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.familyControlPlan.updateMany({
        where: { familyFmeaId: id, isPrimary: true },
        data: { isPrimary: false },
      }),
      prisma.familyControlPlan.update({
        where: { id: cpId },
        data: { isPrimary: true },
      }),
    ]);

    return NextResponse.json({ success: true, message: `CP ${cp.cpCode} set as primary` });
  } catch (error: unknown) {
    console.error('[family-fmea/cp/set-primary] Error:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}
