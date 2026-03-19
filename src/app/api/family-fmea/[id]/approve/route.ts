/**
 * @file Family FMEA Approve API
 * POST: REVIEW -> APPROVED with Master-00 propagation
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

type RouteParams = { params: Promise<{ id: string }> };

function incrementVersion(version: string): string {
  const parts = version.split('.');
  const minor = parseInt(parts[1] ?? '0', 10) + 1;
  return `${parts[0]}.${minor}`;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    const { id } = await params;
    const body = await request.json();
    const { approverId, approverName } = body as { approverId?: string; approverName?: string };

    if (!approverId && !approverName) {
      return NextResponse.json({ success: false, error: 'approverId or approverName is required' }, { status: 400 });
    }

    const existing = await prisma.familyFmea.findUnique({
      where: { id },
      include: { familyMaster: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'FamilyFmea not found' }, { status: 404 });
    }
    if (existing.status !== 'REVIEW') {
      return NextResponse.json(
        { success: false, error: `Cannot approve: current status is ${existing.status}` },
        { status: 400 }
      );
    }

    const now = new Date();
    const oldMasterVersion = existing.familyMaster.version;
    const newMasterVersion = incrementVersion(oldMasterVersion);

    // Transaction: approve FF + propagate to Master-00
    const result = await prisma.$transaction(async (tx) => {
      // 1. Approve the FamilyFmea
      const approved = await tx.familyFmea.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approverId,
          approverName: approverName ?? null,
          approvalDate: now,
          reviewDate: now,
        },
      });

      // 2. Increment FamilyMaster version
      await tx.familyMaster.update({
        where: { id: existing.familyMasterId },
        data: { version: newMasterVersion },
      });

      // 3. Create MasterRevisionLog entry
      await tx.masterRevisionLog.create({
        data: {
          familyMasterId: existing.familyMasterId,
          familyFmeaId: id,
          familyCode: existing.familyCode,
          fromVersion: oldMasterVersion,
          toVersion: newMasterVersion,
          changeDesc: `Approved FF ${existing.familyCode} v${existing.version}`,
          approvedAt: now,
        },
      });

      return approved;
    });

    return NextResponse.json({
      success: true,
      data: result,
      masterVersion: newMasterVersion,
    });
  } catch (error: unknown) {
    console.error('[family-fmea/approve] Error:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}
