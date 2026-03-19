/**
 * @file Family FMEA Control Plans API
 * GET: List CPs for a FamilyFmea
 * POST: Add new CP with auto-generated code
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
    const data = await prisma.familyControlPlan.findMany({
      where: { familyFmeaId: id },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('[family-fmea/cp] GET Error:', error);
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
    const { cpName, isPrimary } = body as { cpName?: string; isPrimary?: boolean };

    // Verify parent exists
    const familyFmea = await prisma.familyFmea.findUnique({ where: { id } });
    if (!familyFmea) {
      return NextResponse.json({ success: false, error: 'FamilyFmea not found' }, { status: 404 });
    }

    // Auto-generate cpCode: CP-{processNo}-{A,B,C...}
    const existingCount = await prisma.familyControlPlan.count({
      where: { familyFmeaId: id },
    });
    const suffix = SUFFIX_CHARS[existingCount % SUFFIX_CHARS.length];
    const cpCode = `CP-${familyFmea.processNo}-${suffix}`;

    const result = await prisma.$transaction(async (tx) => {
      // If isPrimary, unset other CPs
      if (isPrimary) {
        await tx.familyControlPlan.updateMany({
          where: { familyFmeaId: id, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      return tx.familyControlPlan.create({
        data: {
          familyFmeaId: id,
          cpCode,
          cpName: cpName ?? null,
          isPrimary: isPrimary ?? false,
        },
      });
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: unknown) {
    console.error('[family-fmea/cp] POST Error:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}
