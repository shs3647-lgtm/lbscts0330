/**
 * @file Master FMEA Processes API
 * GET: List processes for a Master FMEA
 * POST: Add new process
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    const { id } = await params;
    const data = await prisma.masterFmeaProcess.findMany({
      where: { masterFmeaId: id, isActive: true },
      orderBy: { orderIndex: 'asc' },
    });

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('[master-fmea/processes] GET Error:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}

interface CreateProcessBody {
  processNo: string;
  processName: string;
  category?: string;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    const { id } = await params;
    const body = (await request.json()) as CreateProcessBody;
    const { processNo, processName, category } = body;

    if (!processNo || !processName) {
      return NextResponse.json({ success: false, error: 'processNo and processName are required' }, { status: 400 });
    }

    // Verify MasterFmea exists
    const masterFmea = await prisma.masterFmea.findUnique({ where: { id } });
    if (!masterFmea) {
      return NextResponse.json({ success: false, error: 'MasterFmea not found' }, { status: 404 });
    }

    // Determine orderIndex (next in sequence)
    const maxOrder = await prisma.masterFmeaProcess.aggregate({
      where: { masterFmeaId: id },
      _max: { orderIndex: true },
    });
    const nextOrder = (maxOrder._max.orderIndex ?? 0) + 1;

    const created = await prisma.masterFmeaProcess.create({
      data: {
        masterFmeaId: id,
        processNo,
        processName,
        category: category ?? null,
        orderIndex: nextOrder,
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: unknown) {
    console.error('[master-fmea/processes] POST Error:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}
