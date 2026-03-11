/**
 * @file linked-docs/route.ts
 * @description FMEA에 연동된 CP/PFD 문서 목록 조회
 * GET /api/fmea/linked-docs?fmeaId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const fmeaId = request.nextUrl.searchParams.get('fmeaId')?.toLowerCase();
    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'fmeaId required' }, { status: 400 });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'DB not configured' }, { status: 500 });
    }

    // CpRegistration에서 fmeaId로 연결된 CP 목록 조회
    const cpRegs = await prisma.cpRegistration.findMany({
      where: { fmeaId: { equals: fmeaId, mode: 'insensitive' } },
      select: { cpNo: true, subject: true, cpType: true },
      orderBy: { cpNo: 'asc' },
    });

    // PfdRegistration에서 fmeaId로 연결된 PFD 목록 조회
    const pfdRegs = await prisma.pfdRegistration.findMany({
      where: { fmeaId: { equals: fmeaId, mode: 'insensitive' } },
      select: { pfdNo: true, subject: true },
      orderBy: { pfdNo: 'asc' },
    });

    return NextResponse.json({
      success: true,
      cps: cpRegs.map(c => ({ id: c.cpNo, subject: c.subject || '', cpType: c.cpType || 'P' })),
      pfds: pfdRegs.map(p => ({ id: p.pfdNo, subject: p.subject || '' })),
    });
  } catch (e: unknown) {
    const msg = safeErrorMessage(e);
    console.error('[linked-docs] error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
