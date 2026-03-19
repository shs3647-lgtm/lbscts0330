/**
 * @file Family FMEA Submit for Review API
 * POST: DRAFT -> REVIEW status transition
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
    const { reviewerId, reviewerName } = body as { reviewerId?: string; reviewerName?: string };

    if (!reviewerId && !reviewerName) {
      return NextResponse.json({ success: false, error: 'reviewerId or reviewerName is required' }, { status: 400 });
    }

    const existing = await prisma.familyFmea.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'FamilyFmea not found' }, { status: 404 });
    }
    if (existing.status !== 'DRAFT') {
      return NextResponse.json(
        { success: false, error: `Cannot submit for review: current status is ${existing.status}` },
        { status: 400 }
      );
    }

    const updated = await prisma.familyFmea.update({
      where: { id },
      data: {
        status: 'REVIEW',
        reviewerId,
        reviewerName: reviewerName ?? null,
        authorDate: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error('[family-fmea/submit-review] Error:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}
