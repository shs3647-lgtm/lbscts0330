/**
 * @file Set PFD as Primary API
 * PUT: Set this PFD as primary, unset others
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

type RouteParams = { params: Promise<{ id: string; pfdId: string }> };

export async function PUT(_request: NextRequest, { params }: RouteParams) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    const { id, pfdId } = await params;

    // Verify PFD exists and belongs to this FamilyFmea
    const pfd = await prisma.familyPfd.findUnique({ where: { id: pfdId } });
    if (!pfd || pfd.familyFmeaId !== id) {
      return NextResponse.json({ success: false, error: 'PFD not found' }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.familyPfd.updateMany({
        where: { familyFmeaId: id, isPrimary: true },
        data: { isPrimary: false },
      }),
      prisma.familyPfd.update({
        where: { id: pfdId },
        data: { isPrimary: true },
      }),
    ]);

    return NextResponse.json({ success: true, message: `PFD ${pfd.pfdCode} set as primary` });
  } catch (error: unknown) {
    console.error('[family-fmea/pfd/set-primary] Error:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}
