/**
 * @file Family FMEA Create API
 * POST: Create new FamilyFmea with auto-generated codes
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

interface CreateBody {
  familyMasterId: string;
  masterProcessId: string;
  processNo: string;
  processName: string;
  authorId?: string;
  authorName?: string;
  description?: string;
}

export async function POST(request: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    const body = (await request.json()) as CreateBody;
    const { familyMasterId, masterProcessId, processNo, processName, authorId, authorName, description } = body;

    if (!familyMasterId || !masterProcessId || !processNo || !processName) {
      return NextResponse.json(
        { success: false, error: 'familyMasterId, masterProcessId, processNo, processName are required' },
        { status: 400 }
      );
    }

    // Verify parent records exist
    const [familyMaster, masterProcess] = await Promise.all([
      prisma.familyMaster.findUnique({ where: { id: familyMasterId } }),
      prisma.masterFmeaProcess.findUnique({ where: { id: masterProcessId } }),
    ]);

    if (!familyMaster) {
      return NextResponse.json({ success: false, error: 'FamilyMaster not found' }, { status: 404 });
    }
    if (!masterProcess) {
      return NextResponse.json({ success: false, error: 'MasterFmeaProcess not found' }, { status: 404 });
    }

    // Auto-generate familyCode: FF-{processNo}-{seq}
    const existingCount = await prisma.familyFmea.count({
      where: { familyMasterId, processNo },
    });
    const seq = String(existingCount + 1).padStart(3, '0');
    const familyCode = `FF-${processNo}-${seq}`;
    const fmeaId = `ffm-${processNo}-${seq}`;

    const created = await prisma.familyFmea.create({
      data: {
        familyMasterId,
        masterProcessId,
        familyCode,
        processNo,
        processName,
        fmeaId,
        authorId: authorId ?? null,
        authorName: authorName ?? null,
        description: description ?? null,
      },
      include: {
        familyMaster: true,
        masterProcess: true,
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: unknown) {
    console.error('[family-fmea/create] Error:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}
