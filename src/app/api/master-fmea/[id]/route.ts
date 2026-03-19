/**
 * @file Master FMEA Detail API
 * GET: Detail with processes and familyMaster
 * PUT: Update MasterFmea fields
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage, pickFields } from '@/lib/security';

type RouteParams = { params: Promise<{ id: string }> };

const UPDATABLE_FIELDS = ['name', 'productName', 'description', 'status'];

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    const { id } = await params;
    const data = await prisma.masterFmea.findUnique({
      where: { id },
      include: {
        processes: { orderBy: { orderIndex: 'asc' } },
        familyMaster: {
          include: {
            familyFmeas: {
              orderBy: { processNo: 'asc' },
              include: {
                _count: { select: { controlPlans: true, processFlows: true } },
              },
            },
            revisionLogs: { orderBy: { propagatedAt: 'desc' }, take: 10 },
          },
        },
        revisionHistory: { orderBy: { revDate: 'desc' }, take: 10 },
      },
    });

    if (!data) {
      return NextResponse.json({ success: false, error: 'MasterFmea not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('[master-fmea/[id]] GET Error:', error);
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
    const existing = await prisma.masterFmea.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'MasterFmea not found' }, { status: 404 });
    }

    const body = await request.json();
    const updateData = pickFields(body, UPDATABLE_FIELDS);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await prisma.masterFmea.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error('[master-fmea/[id]] PUT Error:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}
