/**
 * @file Family FMEA Reject API
 * POST: REVIEW -> DRAFT (rejection with reason)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    const { id } = await params;
    const body = await request.json();
    const { reason } = body as { reason?: string };

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Rejection reason is required' }, { status: 400 });
    }

    const existing = await prisma.familyFmea.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'FamilyFmea not found' }, { status: 404 });
    }
    if (existing.status !== 'REVIEW') {
      return NextResponse.json(
        { success: false, error: `Cannot reject: current status is ${existing.status}` },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Revert status to DRAFT
      const rejected = await tx.familyFmea.update({
        where: { id },
        data: {
          status: 'DRAFT',
          reviewerId: null,
          reviewerName: null,
          reviewDate: null,
        },
      });

      // Record rejection in revision history
      await tx.familyFmeaRevision.create({
        data: {
          familyFmeaId: id,
          revNo: `REJ-${existing.version}`,
          changeDesc: `Rejected: ${reason.trim()}`,
          changedBy: existing.reviewerName ?? 'Reviewer',
        },
      });

      return rejected;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    console.error('[family-fmea/reject] Error:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}
