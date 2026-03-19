/**
 * @file Family FMEA New Version API
 * POST: Create new version from APPROVED, mark old as SUPERSEDED
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

type RouteParams = { params: Promise<{ id: string }> };

function incrementMajorVersion(version: string): string {
  const major = parseInt(version.split('.')[0] ?? '1', 10) + 1;
  return `${major}.0`;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    const { id } = await params;
    const existing = await prisma.familyFmea.findUnique({
      where: { id },
      include: { controlPlans: true, processFlows: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'FamilyFmea not found' }, { status: 404 });
    }
    if (existing.status !== 'APPROVED') {
      return NextResponse.json(
        { success: false, error: `Cannot create new version: current status is ${existing.status}` },
        { status: 400 }
      );
    }

    const newVersion = incrementMajorVersion(existing.version);
    // Generate unique familyCode for new version
    const existingCount = await prisma.familyFmea.count({
      where: { familyMasterId: existing.familyMasterId, processNo: existing.processNo },
    });
    const seq = String(existingCount + 1).padStart(3, '0');
    const newFamilyCode = `FF-${existing.processNo}-${seq}`;
    const newFmeaId = `ffm-${existing.processNo}-${seq}`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark old version as SUPERSEDED
      await tx.familyFmea.update({
        where: { id },
        data: { status: 'SUPERSEDED' },
      });

      // 2. Create new version
      const newFF = await tx.familyFmea.create({
        data: {
          familyMasterId: existing.familyMasterId,
          masterProcessId: existing.masterProcessId,
          familyCode: newFamilyCode,
          processNo: existing.processNo,
          processName: existing.processName,
          version: newVersion,
          status: 'DRAFT',
          fmeaId: newFmeaId,
          description: existing.description,
          authorId: existing.authorId,
          authorName: existing.authorName,
        },
      });

      // 3. Record revision
      await tx.familyFmeaRevision.create({
        data: {
          familyFmeaId: newFF.id,
          revNo: newVersion,
          changeDesc: `New version from ${existing.familyCode} v${existing.version}`,
          changedBy: existing.authorName ?? 'System',
        },
      });

      return newFF;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: unknown) {
    console.error('[family-fmea/new-version] Error:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}
