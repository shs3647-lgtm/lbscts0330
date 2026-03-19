/**
 * @file Family FMEA Detail API
 * GET: Detail with relations
 * PUT: Update (DRAFT only)
 * DELETE: Delete (DRAFT only) with cascade
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage, pickFields } from '@/lib/security';

type RouteParams = { params: Promise<{ id: string }> };

const UPDATABLE_FIELDS = [
  'processName', 'description', 'authorId', 'authorName',
  'reviewerId', 'reviewerName', 'approverId', 'approverName',
];

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    const { id } = await params;
    const data = await prisma.familyFmea.findUnique({
      where: { id },
      include: {
        familyMaster: true,
        masterProcess: true,
        controlPlans: { orderBy: { createdAt: 'asc' } },
        processFlows: { orderBy: { createdAt: 'asc' } },
        revisionHistory: { orderBy: { revDate: 'desc' } },
      },
    });

    if (!data) {
      return NextResponse.json({ success: false, error: 'FamilyFmea not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('[family-fmea/[id]] GET Error:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    const { id } = await params;
    const existing = await prisma.familyFmea.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'FamilyFmea not found' }, { status: 404 });
    }
    if (existing.status !== 'DRAFT') {
      return NextResponse.json({ success: false, error: 'Only DRAFT status can be updated' }, { status: 400 });
    }

    const body = await request.json();
    const updateData = pickFields(body, UPDATABLE_FIELDS);

    const updated = await prisma.familyFmea.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error('[family-fmea/[id]] PUT Error:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    const { id } = await params;
    const existing = await prisma.familyFmea.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'FamilyFmea not found' }, { status: 404 });
    }
    if (existing.status !== 'DRAFT') {
      return NextResponse.json({ success: false, error: 'Only DRAFT status can be deleted' }, { status: 400 });
    }

    // Cascade delete handled by Prisma onDelete: Cascade for CP/PFD/revisions
    await prisma.familyFmea.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Deleted successfully' });
  } catch (error: unknown) {
    console.error('[family-fmea/[id]] DELETE Error:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}
