/**
 * @file Family FMEA Process Flow Diagrams API
 * GET: List PFDs for a FamilyFmea
 * POST: Add new PFD with auto-generated code
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

type RouteParams = { params: Promise<{ id: string }> };

const SUFFIX_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    const { id } = await params;
    const data = await prisma.familyPfd.findMany({
      where: { familyFmeaId: id },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('[family-fmea/pfd] GET Error:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    const { id } = await params;
    const body = await request.json();
    const { pfdName, isPrimary } = body as { pfdName?: string; isPrimary?: boolean };

    // Verify parent exists
    const familyFmea = await prisma.familyFmea.findUnique({ where: { id } });
    if (!familyFmea) {
      return NextResponse.json({ success: false, error: 'FamilyFmea not found' }, { status: 404 });
    }

    // Auto-generate pfdCode: PFD-{processNo}-{A,B,C...}
    const existingCount = await prisma.familyPfd.count({
      where: { familyFmeaId: id },
    });
    const suffix = SUFFIX_CHARS[existingCount % SUFFIX_CHARS.length];
    const pfdCode = `PFD-${familyFmea.processNo}-${suffix}`;

    const result = await prisma.$transaction(async (tx) => {
      if (isPrimary) {
        await tx.familyPfd.updateMany({
          where: { familyFmeaId: id, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      return tx.familyPfd.create({
        data: {
          familyFmeaId: id,
          pfdCode,
          pfdName: pfdName ?? null,
          isPrimary: isPrimary ?? false,
        },
      });
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: unknown) {
    console.error('[family-fmea/pfd] POST Error:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}
