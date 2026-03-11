/**
 * FMEA 삭제 가능 여부 확인 API
 *
 * GET /api/fmea/delete-check?ids=pfm26-f001-l04,pfm26-f002-l05
 *
 * 연관 모듈(CP/PFD/APQP/DFMEA/WS/PM)의 승인 상태를 확인하여
 * 삭제 가능 여부와 연관 모듈 목록을 반환
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

interface LinkedModule {
  type: 'CP' | 'PFD' | 'APQP' | 'PFMEA' | 'DFMEA' | 'WS' | 'PM';
  id: string;
  status: string;
  approved: boolean;
}

interface DeleteCheckResult {
  fmeaId: string;
  canDelete: boolean;
  reason?: string;
  linkedModules: LinkedModule[];
}

export async function GET(request: NextRequest) {
  const idsParam = request.nextUrl.searchParams.get('ids');
  if (!idsParam) {
    return NextResponse.json({ success: false, error: 'ids parameter required' }, { status: 400 });
  }

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: true, results: [] });
  }

  const fmeaIds = idsParam.split(',').map(id => id.trim().toLowerCase());
  const results: DeleteCheckResult[] = [];

  for (const fmeaId of fmeaIds) {
    const linkedModules: LinkedModule[] = [];
    let canDelete = true;
    let reason: string | undefined;

    const isPfmea = fmeaId.startsWith('pfm');

    // projectLinkage에서 연관 모듈 조회
    try {
      const linkages = await (prisma as any).projectLinkage.findMany({
        where: isPfmea
          ? { pfmeaId: { equals: fmeaId, mode: 'insensitive' }, status: 'active' }
          : { dfmeaId: { equals: fmeaId, mode: 'insensitive' }, status: 'active' },
      });

      for (const link of linkages) {
        // CP 승인 상태 확인
        if (link.cpNo) {
          try {
            const cp = await prisma.cpRegistration.findUnique({
              where: { cpNo: link.cpNo },
              select: { status: true, confirmedAt: true, deletedAt: true },
            });
            if (cp && !cp.deletedAt) {
              const isApproved = cp.status === 'approved' || !!cp.confirmedAt;
              linkedModules.push({ type: 'CP', id: link.cpNo, status: cp.status || 'draft', approved: isApproved });
              if (isApproved) { canDelete = false; reason = `CP(${link.cpNo})가 이미 승인되어 삭제할 수 없습니다.`; }
            }
          } catch { /* not found */ }
        }

        // PFD 상태 확인
        if (link.pfdNo) {
          try {
            const pfd = await prisma.pfdRegistration.findUnique({
              where: { pfdNo: link.pfdNo },
              select: { status: true, deletedAt: true },
            });
            if (pfd && !pfd.deletedAt) {
              const isApproved = pfd.status === 'approved';
              linkedModules.push({ type: 'PFD', id: link.pfdNo, status: pfd.status || 'draft', approved: isApproved });
              if (isApproved) { canDelete = false; reason = `PFD(${link.pfdNo})가 이미 승인되어 삭제할 수 없습니다.`; }
            }
          } catch { /* not found */ }
        }

        // APQP 상태 확인
        if (link.apqpNo) {
          try {
            const apqp = await prisma.apqpRegistration.findUnique({
              where: { apqpNo: link.apqpNo },
              select: { status: true, deletedAt: true },
            });
            if (apqp && !apqp.deletedAt) {
              const isApproved = apqp.status === 'approved';
              linkedModules.push({ type: 'APQP', id: link.apqpNo, status: apqp.status || 'planning', approved: isApproved });
              if (isApproved) { canDelete = false; reason = `APQP(${link.apqpNo})가 이미 승인되어 삭제할 수 없습니다.`; }
            }
          } catch { /* not found */ }
        }

        // 상대편 FMEA 확인 (PFMEA→DFMEA, DFMEA→PFMEA)
        const otherFmeaId = isPfmea ? link.dfmeaId : link.pfmeaId;
        if (otherFmeaId) {
          try {
            const other = await prisma.fmeaProject.findUnique({
              where: { fmeaId: otherFmeaId },
              select: { status: true, deletedAt: true },
            });
            if (other && !other.deletedAt) {
              // FMEA 승인 확인: FmeaApproval 테이블
              const approval = await (prisma as any).fmeaApproval.findFirst({
                where: { fmeaId: { equals: otherFmeaId, mode: 'insensitive' }, status: 'APPROVED' },
              });
              const isApproved = !!approval;
              const type = isPfmea ? 'DFMEA' : 'PFMEA';
              linkedModules.push({ type, id: otherFmeaId, status: other.status || 'active', approved: isApproved });
              if (isApproved) { canDelete = false; reason = `${type}(${otherFmeaId})가 이미 승인되어 삭제할 수 없습니다.`; }
            }
          } catch { /* not found */ }
        }
      }
    } catch { /* projectLinkage 없으면 무시 */ }

    // WS (작업표준서) 연관 확인 — parentFmeaId 기반
    try {
      const wsRecords = await (prisma as any).wsRegistration.findMany({
        where: { parentFmeaId: { equals: fmeaId, mode: 'insensitive' }, deletedAt: null },
        select: { wsNo: true, status: true },
      });
      for (const ws of wsRecords) {
        const isApproved = ws.status === 'approved';
        linkedModules.push({ type: 'WS', id: ws.wsNo, status: ws.status || 'draft', approved: isApproved });
        if (isApproved) { canDelete = false; reason = `WS(${ws.wsNo})가 이미 승인되어 삭제할 수 없습니다.`; }
      }
    } catch { /* wsRegistration 없으면 무시 */ }

    // PM (예방보전) 연관 확인 — parentFmeaId 기반
    try {
      const pmRecords = await (prisma as any).pmRegistration.findMany({
        where: { parentFmeaId: { equals: fmeaId, mode: 'insensitive' }, deletedAt: null },
        select: { pmNo: true, status: true },
      });
      for (const pm of pmRecords) {
        const isApproved = pm.status === 'approved';
        linkedModules.push({ type: 'PM', id: pm.pmNo, status: pm.status || 'draft', approved: isApproved });
        if (isApproved) { canDelete = false; reason = `PM(${pm.pmNo})가 이미 승인되어 삭제할 수 없습니다.`; }
      }
    } catch { /* pmRegistration 없으면 무시 */ }

    // FMEA 자체 승인 확인
    try {
      const selfApproval = await (prisma as any).fmeaApproval.findFirst({
        where: { fmeaId: { equals: fmeaId, mode: 'insensitive' }, status: 'APPROVED' },
      });
      if (selfApproval) {
        canDelete = false;
        reason = `FMEA(${fmeaId}) 자체가 이미 승인되어 삭제할 수 없습니다.`;
      }
    } catch { /* fmeaApproval 없으면 무시 */ }

    results.push({ fmeaId, canDelete, reason, linkedModules });
  }

  return NextResponse.json({ success: true, results });
}
