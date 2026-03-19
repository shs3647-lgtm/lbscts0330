/**
 * @file Master FMEA API
 * GET: List all MasterFmea
 * POST: Create MasterFmea + FamilyMaster (Master-00) in transaction
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

export async function GET() {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    const data = await prisma.masterFmea.findMany({
      include: {
        _count: { select: { processes: true } },
        familyMaster: { select: { id: true, code: true, version: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('[master-fmea] GET Error:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}

interface CreateMasterBody {
  code: string;
  name: string;
  productName?: string;
  description?: string;
}

export async function POST(request: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    const body = (await request.json()) as CreateMasterBody;
    const { code, name, productName, description } = body;

    if (!code || !name) {
      return NextResponse.json({ success: false, error: 'code and name are required' }, { status: 400 });
    }

    // Check for duplicate code
    const existing = await prisma.masterFmea.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ success: false, error: `Master FMEA code "${code}" already exists` }, { status: 409 });
    }

    // Extract code suffix for FamilyMaster code (e.g., MF-12AU -> 12AU)
    const codeSuffix = code.replace(/^MF-/i, '');
    const fmCode = `FM-${codeSuffix}-00`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create MasterFmea
      const masterFmea = await tx.masterFmea.create({
        data: {
          code,
          name,
          productName: productName ?? null,
          description: description ?? null,
        },
      });

      // 2. Auto-create FamilyMaster (Master-00)
      const familyMaster = await tx.familyMaster.create({
        data: {
          masterFmeaId: masterFmea.id,
          code: fmCode,
          name: `${name} Master-00`,
        },
      });

      return { ...masterFmea, familyMaster };
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: unknown) {
    console.error('[master-fmea] POST Error:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}
