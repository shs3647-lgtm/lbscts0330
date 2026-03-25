/**
 * @file route.ts
 * @description RPN 분석 API — RiskAnalysis + FailureLink 기반 SOD/AP 데이터 조회
 *
 * GET /api/rpn-analysis            → 전체 FMEA 프로젝트 목록 + 첫 프로젝트 RPN 데이터
 * GET /api/rpn-analysis?fmeaId=xxx → 특정 FMEA의 RPN 데이터
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Database not configured', items: [], projects: [] }, { status: 500 });
  }

  const fmeaId = request.nextUrl.searchParams.get('fmeaId');

  try {
    // 1. 프로젝트 목록 조회
    let projects: any[] = [];
    try {
      const raw = await prisma.fmeaProject.findMany({
        where: { status: 'active', deletedAt: null },
        select: {
          fmeaId: true,
          fmeaType: true,
          registration: {
            select: {
              partName: true,
              customerName: true,
              subject: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      });
      projects = raw.map(p => ({
        fmeaId: p.fmeaId,
        fmeaType: p.fmeaType,
        partName: p.registration?.partName || '',
        customerName: p.registration?.customerName || '',
        subject: p.registration?.subject || '',
        label: p.registration?.partName || p.registration?.subject || p.fmeaId,
      }));
    } catch { /* table may not exist */ }

    // 선택된 FMEA ID (없으면 첫 번째 프로젝트)
    const targetFmeaId = fmeaId || projects[0]?.fmeaId;
    if (!targetFmeaId) {
      return NextResponse.json({ success: true, items: [], projects, message: '프로젝트가 없습니다.' });
    }

    // 2. RiskAnalysis + FailureLink → RPN 데이터 조회
    const risks = await prisma.riskAnalysis.findMany({
      where: { fmeaId: targetFmeaId },
      include: {
        failureLink: {
          select: {
            fmText: true,
            feText: true,
            fcText: true,
            severity: true,
            fmPath: true,
            fcWorkElem: true,
          }
        }
      },
      orderBy: { createdAt: 'asc' },
    });

    // 3. Optimization 데이터 조회 (개선 후 SOD)
    const riskIds = risks.map(r => r.id);
    const optimizations = riskIds.length > 0
      ? await prisma.optimization.findMany({
          where: { riskId: { in: riskIds } },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    // optimization map (riskId → latest optimization)
    const optMap = new Map<string, any>();
    for (const opt of optimizations) {
      if (!optMap.has(opt.riskId)) {
        optMap.set(opt.riskId, opt);
      }
    }

    // 4. 데이터 매핑
    const items = risks.map(risk => {
      const opt = optMap.get(risk.id);
      const rpnBefore = risk.severity * risk.occurrence * risk.detection;
      const newS = opt?.newSeverity || 0;
      const newO = opt?.newOccurrence || 0;
      const newD = opt?.newDetection || 0;
      const rpnAfter = (newS > 0 && newO > 0 && newD > 0) ? newS * newO * newD : 0;

      // 공정명 추출: fmPath "L1>L2>L3" 형태에서 추출 or failureLink.fcWorkElem
      let processName = '';
      if (risk.failureLink?.fmPath) {
        const parts = risk.failureLink.fmPath.split('>');
        processName = parts[parts.length - 1]?.trim() || parts[0]?.trim() || '';
      }
      if (!processName) processName = risk.failureLink?.fcWorkElem || '';

      return {
        id: risk.id,
        fmeaId: risk.fmeaId,
        linkId: risk.linkId,
        processName,
        failureMode: risk.failureLink?.fmText || '',
        failureEffect: risk.failureLink?.feText || '',
        failureCause: risk.failureLink?.fcText || '',
        severity: risk.severity,
        occurrence: risk.occurrence,
        detection: risk.detection,
        rpn: rpnBefore,
        ap: risk.ap,
        preventionControl: risk.preventionControl || '',
        detectionControl: risk.detectionControl || '',
        severityAfter: newS,
        occurrenceAfter: newO,
        detectionAfter: newD,
        rpnAfter,
        apAfter: opt?.newAP || '',
        preventionAction: opt?.recommendedAction || '',
        detectionAction: opt?.detectionAction || '',
        responsible: opt?.responsible || '',
        status: opt?.status || '미완료',
        targetDate: opt?.targetDate || '',
        completedDate: opt?.completedDate || '',
      };
    });

    return NextResponse.json({
      success: true,
      fmeaId: targetFmeaId,
      projects,
      items,
      totalCount: items.length,
    });

  } catch (error: any) {
    console.error('[RPN Analysis API] GET 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error', items: [], projects: [] },
      { status: 500 }
    );
  }
}
