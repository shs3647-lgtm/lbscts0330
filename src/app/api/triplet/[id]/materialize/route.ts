/**
 * @file POST /api/triplet/[id]/materialize
 * @description Lazy CP/PFD 생성 API — TripletGroup에 cp_id/pfd_id가 null일 때 on-demand 생성
 * @created 2026-03-13
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { generateLazyDocId, parseTripletGroupId } from '@/lib/utils/tripletIdGenerator';
import { safeErrorMessage } from '@/lib/security';
import { hasTripletModel, tripletNotReadyErrorResponse } from '@/lib/utils/tripletGuard';

export const runtime = 'nodejs';

interface MaterializeBody {
  docKind: 'cp' | 'pfd';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const prisma = getPrisma();
  if (!prisma || !hasTripletModel(prisma)) {
    return tripletNotReadyErrorResponse();
  }

  try {
    const { id: tripletGroupId } = await params;
    const body: MaterializeBody = await request.json();
    const { docKind } = body;

    if (!['cp', 'pfd'].includes(docKind)) {
      return NextResponse.json({ success: false, error: 'docKind must be "cp" or "pfd"' }, { status: 400 });
    }

    const triplet = await prisma.tripletGroup.findUnique({
      where: { id: tripletGroupId },
    });

    if (!triplet) {
      return NextResponse.json({ success: false, error: 'TripletGroup not found' }, { status: 404 });
    }

    const existingId = docKind === 'cp' ? triplet.cpId : triplet.pfdId;
    if (existingId) {
      return NextResponse.json({
        success: true,
        id: existingId,
        tripletGroupId,
        alreadyExists: true,
      });
    }

    const parsed = parseTripletGroupId(tripletGroupId);
    if (!parsed) {
      return NextResponse.json({ success: false, error: 'Invalid TripletGroup ID format' }, { status: 400 });
    }

    const newDocId = generateLazyDocId(docKind, parsed.typeCode, parsed.serial, triplet.linkGroup);

    await prisma.$transaction(async (tx: any) => {
      if (docKind === 'cp') {
        await tx.cpRegistration.create({
          data: {
            cpNo: newDocId,
            cpType: parsed.typeCode.toUpperCase(),
            fmeaId: triplet.pfmeaId,
            linkedPfmeaNo: triplet.pfmeaId,
            linkedPfdNo: triplet.pfdId,
            tripletGroupId,
            subject: triplet.subject || '',
            customerName: triplet.customerName || '',
            companyName: triplet.companyName || '',
            partNo: triplet.partNo || '',
          },
        });

        await tx.tripletGroup.update({
          where: { id: tripletGroupId },
          data: { cpId: newDocId, syncStatus: 'synced' },
        });
      } else {
        await tx.pfdRegistration.create({
          data: {
            pfdNo: newDocId,
            fmeaId: triplet.pfmeaId,
            linkedPfmeaNo: triplet.pfmeaId,
            linkedCpNos: triplet.cpId ? JSON.stringify([triplet.cpId]) : null,
            tripletGroupId,
            subject: triplet.subject || '',
            customerName: triplet.customerName || '',
            companyName: triplet.companyName || '',
          },
        });

        await tx.tripletGroup.update({
          where: { id: tripletGroupId },
          data: { pfdId: newDocId, syncStatus: 'synced' },
        });
      }
    });

    return NextResponse.json({
      success: true,
      id: newDocId,
      tripletGroupId,
      docKind,
      alreadyExists: false,
    });
  } catch (error) {
    console.error('[triplet/materialize] 오류:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}
