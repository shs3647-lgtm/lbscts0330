/**
 * @file /api/myjob/jobs/route.ts
 * @description MY JOB 실데이터 조회 API
 * - FmeaProject + FmeaRegistration + FmeaRevisionHistory JOIN
 * - CpRegistration + PfdRegistration 포함
 * - 각 프로젝트의 결재 진행상황 (담당자/검토자/승인자) 추출
 * @created 2026-03-02
 */

import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

interface MyJobItem {
  no: number;
  type: string;
  id: string;
  name: string;
  lead: string;
  client: string;
  start: string;
  end: string;
  status: string;
  // 결재 진행상황
  createName: string;
  createStatus: string;
  reviewName: string;
  reviewStatus: string;
  approveName: string;
  approveStatus: string;
}

export async function GET() {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: true, jobs: [] });
  }

  try {
    const jobs: MyJobItem[] = [];
    let no = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. FMEA 프로젝트 (PFMEA + DFMEA)
    const fmeaProjects = await prisma.fmeaProject.findMany({
      where: { deletedAt: null, fmeaType: { not: 'D' } },
      include: {
        registration: {
          select: {
            customerName: true,
            subject: true,
            fmeaProjectName: true,
            fmeaResponsibleName: true,
            fmeaStartDate: true,
            fmeaRevisionDate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // FMEA별 최신 개정이력 조회
    const fmeaIds = fmeaProjects.map(p => p.fmeaId);
    let revisionHistories: Array<{
      fmeaId: string;
      createName: string | null;
      createStatus: string | null;
      reviewName: string | null;
      reviewStatus: string | null;
      approveName: string | null;
      approveStatus: string | null;
    }> = [];

    if (fmeaIds.length > 0) {
      try {
        revisionHistories = await prisma.fmeaRevisionHistory.findMany({
          where: { fmeaId: { in: fmeaIds } },
          select: {
            fmeaId: true,
            createName: true,
            createStatus: true,
            reviewName: true,
            reviewStatus: true,
            approveName: true,
            approveStatus: true,
          },
          orderBy: { createdAt: 'desc' },
        });
      } catch {
        // FmeaRevisionHistory 테이블 미존재 시 무시
      }
    }

    // fmeaId → 최신 개정이력 맵
    const revMap = new Map<string, typeof revisionHistories[0]>();
    for (const rh of revisionHistories) {
      if (!revMap.has(rh.fmeaId)) {
        revMap.set(rh.fmeaId, rh); // 첫 번째 = 최신 (orderBy desc)
      }
    }

    for (const proj of fmeaProjects) {
      const reg = proj.registration;
      // 기초정보(registration) 미등록 프로젝트는 제외
      if (!reg) continue;
      no++;
      const rev = revMap.get(proj.fmeaId);
      const fmeaType = proj.fmeaType === 'D' ? 'DFMEA' : 'PFMEA';
      const endDate = reg?.fmeaRevisionDate || '';
      const isArchived = proj.status === 'archived';

      let status = '진행중';
      if (isArchived) {
        status = '완료';
      } else if (endDate) {
        const end = new Date(endDate);
        if (end < today) status = '지연';
      }

      jobs.push({
        no,
        type: fmeaType,
        id: proj.fmeaId,
        name: reg?.fmeaProjectName || reg?.subject || proj.fmeaId,
        lead: reg?.fmeaResponsibleName || '-',
        client: reg?.customerName || '-',
        start: reg?.fmeaStartDate || '-',
        end: endDate || '-',
        status,
        createName: rev?.createName || '-',
        createStatus: rev?.createStatus || '-',
        reviewName: rev?.reviewName || '-',
        reviewStatus: rev?.reviewStatus || '-',
        approveName: rev?.approveName || '-',
        approveStatus: rev?.approveStatus || '-',
      });
    }

    // 2. CP
    const cpList = await prisma.cpRegistration.findMany({
      where: { deletedAt: null },
      select: {
        cpNo: true,
        subject: true,
        customerName: true,
        cpResponsibleName: true,
        cpStartDate: true,
        cpRevisionDate: true,
        status: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    for (const cp of cpList) {
      no++;
      const endDate = cp.cpRevisionDate || '';
      let status = '진행중';
      if (cp.status === 'approved') {
        status = '완료';
      } else if (endDate) {
        const end = new Date(endDate);
        if (end < today) status = '지연';
      }

      jobs.push({
        no,
        type: 'CP',
        id: cp.cpNo,
        name: cp.subject || cp.cpNo,
        lead: cp.cpResponsibleName || '-',
        client: cp.customerName || '-',
        start: cp.cpStartDate || '-',
        end: endDate || '-',
        status,
        createName: '-',
        createStatus: '-',
        reviewName: '-',
        reviewStatus: '-',
        approveName: '-',
        approveStatus: '-',
      });
    }

    // 3. PFD
    const pfdList = await prisma.pfdRegistration.findMany({
      where: { deletedAt: null },
      select: {
        pfdNo: true,
        subject: true,
        customerName: true,
        pfdResponsibleName: true,
        pfdStartDate: true,
        pfdRevisionDate: true,
        status: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    for (const pfd of pfdList) {
      no++;
      const endDate = pfd.pfdRevisionDate || '';
      let status = '진행중';
      if (pfd.status === 'active' || pfd.status === 'locked') {
        status = '완료';
      } else if (endDate) {
        const end = new Date(endDate);
        if (end < today) status = '지연';
      }

      jobs.push({
        no,
        type: 'PFD',
        id: pfd.pfdNo,
        name: pfd.subject || pfd.pfdNo,
        lead: pfd.pfdResponsibleName || '-',
        client: pfd.customerName || '-',
        start: pfd.pfdStartDate || '-',
        end: endDate || '-',
        status,
        createName: '-',
        createStatus: '-',
        reviewName: '-',
        reviewStatus: '-',
        approveName: '-',
        approveStatus: '-',
      });
    }

    return NextResponse.json({ success: true, jobs });
  } catch (error) {
    console.error('[MY JOB] jobs API 오류:', error);
    return NextResponse.json({ success: true, jobs: [] });
  }
}
