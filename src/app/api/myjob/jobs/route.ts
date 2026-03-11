/**
 * @file /api/myjob/jobs/route.ts
 * @description MY JOB 실데이터 조회 API (최적화)
 * - 3개 DB 쿼리 병렬 실행 (Promise.all)
 * - select 최소화 — 필요한 필드만 조회
 * - Cache-Control 30초
 * @created 2026-03-02
 * @optimized 2026-03-11
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
  createName: string;
  createStatus: string;
  reviewName: string;
  reviewStatus: string;
  approveName: string;
  approveStatus: string;
}

function calcStatus(endDate: string, isDone: boolean, today: Date): string {
  if (isDone) return '완료';
  if (endDate && new Date(endDate) < today) return '지연';
  return '진행중';
}

export async function GET() {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: true, jobs: [] });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ★ 3개 쿼리 병렬 실행
    const [fmeaProjects, cpList, pfdList] = await Promise.all([
      prisma.fmeaProject.findMany({
        where: { deletedAt: null, fmeaType: { not: 'D' } },
        select: {
          fmeaId: true,
          fmeaType: true,
          status: true,
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
      }),
      prisma.cpRegistration.findMany({
        where: { deletedAt: null },
        select: {
          cpNo: true, subject: true, customerName: true,
          cpResponsibleName: true, cpStartDate: true, cpRevisionDate: true, status: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.pfdRegistration.findMany({
        where: { deletedAt: null },
        select: {
          pfdNo: true, subject: true, customerName: true,
          pfdResponsibleName: true, pfdStartDate: true, pfdRevisionDate: true, status: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // FMEA 개정이력 조회 (registration 있는 것만)
    const registeredFmeas = fmeaProjects.filter(f => f.registration !== null);
    const fmeaIds = registeredFmeas.map(p => p.fmeaId);

    type RevItem = {
      fmeaId: string;
      createName: string | null;
      createStatus: string | null;
      reviewName: string | null;
      reviewStatus: string | null;
      approveName: string | null;
      approveStatus: string | null;
    };
    let revisionHistories: RevItem[] = [];

    if (fmeaIds.length > 0) {
      try {
        revisionHistories = await prisma.fmeaRevisionHistory.findMany({
          where: { fmeaId: { in: fmeaIds } },
          select: {
            fmeaId: true,
            createName: true, createStatus: true,
            reviewName: true, reviewStatus: true,
            approveName: true, approveStatus: true,
          },
          orderBy: { createdAt: 'desc' },
        });
      } catch {
        // FmeaRevisionHistory 테이블 미존재 시 무시
      }
    }

    // fmeaId → 최신 개정이력 맵 (첫 번째 = 최신, orderBy desc)
    const revMap = new Map<string, RevItem>();
    for (const rh of revisionHistories) {
      if (!revMap.has(rh.fmeaId)) revMap.set(rh.fmeaId, rh);
    }

    const jobs: MyJobItem[] = [];
    let no = 0;
    const DASH = '-';

    // FMEA
    for (const proj of registeredFmeas) {
      const reg = proj.registration!;
      no++;
      const rev = revMap.get(proj.fmeaId);
      const endDate = reg.fmeaRevisionDate || '';

      jobs.push({
        no,
        type: proj.fmeaType === 'D' ? 'DFMEA' : 'PFMEA',
        id: proj.fmeaId,
        name: reg.fmeaProjectName || reg.subject || proj.fmeaId,
        lead: reg.fmeaResponsibleName || DASH,
        client: reg.customerName || DASH,
        start: reg.fmeaStartDate || DASH,
        end: endDate || DASH,
        status: calcStatus(endDate, proj.status === 'archived', today),
        createName: rev?.createName || DASH,
        createStatus: rev?.createStatus || DASH,
        reviewName: rev?.reviewName || DASH,
        reviewStatus: rev?.reviewStatus || DASH,
        approveName: rev?.approveName || DASH,
        approveStatus: rev?.approveStatus || DASH,
      });
    }

    // CP
    for (const cp of cpList) {
      no++;
      const endDate = cp.cpRevisionDate || '';
      jobs.push({
        no, type: 'CP', id: cp.cpNo,
        name: cp.subject || cp.cpNo,
        lead: cp.cpResponsibleName || DASH,
        client: cp.customerName || DASH,
        start: cp.cpStartDate || DASH,
        end: endDate || DASH,
        status: calcStatus(endDate, cp.status === 'approved', today),
        createName: DASH, createStatus: DASH,
        reviewName: DASH, reviewStatus: DASH,
        approveName: DASH, approveStatus: DASH,
      });
    }

    // PFD
    for (const pfd of pfdList) {
      no++;
      const endDate = pfd.pfdRevisionDate || '';
      const isDone = pfd.status === 'active' || pfd.status === 'locked';
      jobs.push({
        no, type: 'PFD', id: pfd.pfdNo,
        name: pfd.subject || pfd.pfdNo,
        lead: pfd.pfdResponsibleName || DASH,
        client: pfd.customerName || DASH,
        start: pfd.pfdStartDate || DASH,
        end: endDate || DASH,
        status: calcStatus(endDate, isDone, today),
        createName: DASH, createStatus: DASH,
        reviewName: DASH, reviewStatus: DASH,
        approveName: DASH, approveStatus: DASH,
      });
    }

    return NextResponse.json(
      { success: true, jobs },
      { headers: { 'Cache-Control': 'private, max-age=30' } },
    );
  } catch (error) {
    console.error('[MY JOB] jobs API 오류:', error);
    return NextResponse.json({ success: true, jobs: [] });
  }
}
