/**
 * @file route.ts
 * @description AP 개선관리 API — RiskAnalysis + Optimization CRUD
 * GET  /api/ap-improvement?fmeaId=xxx — AP H/M 항목 조회
 * PATCH /api/ap-improvement — Optimization upsert (개선조치 저장)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrismaForSchema, getBaseDatabaseUrl } from '@/lib/prisma';
import { getProjectSchemaName, ensureProjectSchemaReady } from '@/lib/project-schema';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { calculateAP } from '@/app/(fmea-core)/pfmea/worksheet/tabs/all/apCalculator';

interface RiskWithRelations {
  id: string;
  fmeaId: string;
  linkId: string;
  severity: number;
  occurrence: number;
  detection: number;
  ap: string;
  preventionControl: string | null;
  detectionControl: string | null;
  failureLink: {
    fmText: string | null;
    fcText: string | null;
    feText: string | null;
    fmProcess: string | null;
    fcM4: string | null;
    failureMode: {
      mode: string;
      l2Function: { specialChar: string | null } | null;
      l2Structure: { name: string; no: string } | null;
    } | null;
    failureCause: { cause: string } | null;
    failureEffect: { effect: string; severity: number } | null;
  } | null;
  optimizations: Array<{
    id: string;
    recommendedAction: string;
    responsible: string;
    targetDate: string;
    newSeverity: number | null;
    newOccurrence: number | null;
    newDetection: number | null;
    newAP: string | null;
    status: string;
    completedDate: string | null;
    remarks: string | null;
  }>;
}

/** GET: FMEA 프로젝트의 AP H/M 항목 조회 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fmeaId = searchParams.get('fmeaId') || '';

    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid fmeaId' },
        { status: 400 }
      );
    }

    const baseUrl = getBaseDatabaseUrl();
    const schema = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // RiskAnalysis + FailureLink(FM/FC/FE 원본 fallback) + Optimization 조회
    const riskAnalyses = await prisma.riskAnalysis.findMany({
      where: {
        fmeaId: { equals: fmeaId, mode: 'insensitive' },
        ap: { in: ['H', 'M', 'L'] },
      },
      include: {
        failureLink: {
          include: {
            failureMode: {
              select: {
                mode: true,
                l2Function: { select: { specialChar: true } },
                l2Structure: { select: { name: true, no: true } },
              },
            },
            failureCause: { select: { cause: true } },
            failureEffect: { select: { effect: true, severity: true } },
          },
        },
        optimizations: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'asc' },
    }) as unknown as RiskWithRelations[];

    // APItem 형태로 변환
    const items = riskAnalyses.map((ra: RiskWithRelations) => {
      const link = ra.failureLink;
      const opt = ra.optimizations[0] || null;

      // FM/FC/FE: fmText/fcText/feText가 비어있으면 원본 테이블에서 fallback
      const fm = link?.fmText || link?.failureMode?.mode || '';
      const fc = link?.fcText || link?.failureCause?.cause || '';
      const sc = link?.failureMode?.l2Function?.specialChar || '';
      const proc = link?.fmProcess || link?.failureMode?.l2Structure?.name || '';

      return {
        id: ra.id,
        riskId: ra.id,
        optId: opt?.id || undefined,
        fmeaId: ra.fmeaId,
        linkId: ra.linkId,
        ap5: ra.ap as 'H' | 'M' | 'L',
        ap6: (opt?.newAP as 'H' | 'M' | 'L') || '',
        specialChar: sc,
        category: '' as const,
        preventiveControl: ra.preventionControl || '',
        severity: ra.severity,
        failureMode: fm,
        failureCause: fc,
        occurrence: ra.occurrence,
        detectionControl: ra.detectionControl || '',
        detection: ra.detection,
        preventionAction: opt ? extractAction(opt.recommendedAction, '예방') : '',
        detectionAction: opt ? extractAction(opt.recommendedAction, '검출') : '',
        responsible: opt?.responsible || '',
        status: (opt?.status as '대기' | '진행중' | '완료') || '대기',
        dueDate: opt?.targetDate || '',
        completedDate: opt?.completedDate || undefined,
        processName: proc,
        newSeverity: opt?.newSeverity || undefined,
        newOccurrence: opt?.newOccurrence || undefined,
        newDetection: opt?.newDetection || undefined,
        remarks: opt?.remarks || undefined,
      };
    });

    return NextResponse.json(
      { success: true, items, total: items.length },
      {
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (error) {
    console.error('[AP-Improvement GET] Error:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}

/** PATCH: Optimization upsert (개선조치 저장/수정) */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      riskId,
      fmeaId,
      preventionAction,
      detectionAction,
      responsible,
      targetDate,
      status,
      newSeverity,
      newOccurrence,
      newDetection,
      completedDate,
      remarks,
    } = body;

    if (!riskId || !fmeaId) {
      return NextResponse.json(
        { success: false, error: 'riskId and fmeaId are required' },
        { status: 400 }
      );
    }

    const baseUrl = getBaseDatabaseUrl();
    const schema = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // RiskAnalysis 존재 확인
    const risk = await prisma.riskAnalysis.findUnique({
      where: { id: riskId },
    });

    if (!risk) {
      return NextResponse.json(
        { success: false, error: 'RiskAnalysis not found' },
        { status: 404 }
      );
    }

    // newAP 자동 계산
    const effectiveS = newSeverity ?? risk.severity;
    const effectiveO = newOccurrence ?? risk.occurrence;
    const effectiveD = newDetection ?? risk.detection;
    const newAP = (effectiveS && effectiveO && effectiveD)
      ? calculateAP(effectiveS, effectiveO, effectiveD)
      : null;

    // recommendedAction 합성: 예방+검출 조치를 하나의 필드에
    const actionParts: string[] = [];
    if (preventionAction) actionParts.push(`[예방] ${preventionAction}`);
    if (detectionAction) actionParts.push(`[검출] ${detectionAction}`);
    const recommendedAction = actionParts.join(' | ') || '';

    // 기존 Optimization 찾기
    const existingOpt = await prisma.optimization.findFirst({
      where: { riskId, fmeaId: { equals: fmeaId, mode: 'insensitive' } },
    });

    let optimization;
    if (existingOpt) {
      // 업데이트
      optimization = await prisma.optimization.update({
        where: { id: existingOpt.id },
        data: {
          recommendedAction,
          responsible: responsible || '',
          targetDate: targetDate || '',
          newSeverity: newSeverity || null,
          newOccurrence: newOccurrence || null,
          newDetection: newDetection || null,
          newAP: newAP || null,
          status: status || '대기',
          completedDate: status === '완료' ? (completedDate || new Date().toISOString().split('T')[0]) : null,
          remarks: remarks || null,
        },
      });
    } else {
      // 신규 생성
      optimization = await prisma.optimization.create({
        data: {
          fmeaId: risk.fmeaId,
          riskId,
          recommendedAction,
          responsible: responsible || '',
          targetDate: targetDate || '',
          newSeverity: newSeverity || null,
          newOccurrence: newOccurrence || null,
          newDetection: newDetection || null,
          newAP: newAP || null,
          status: status || '대기',
          completedDate: status === '완료' ? (completedDate || new Date().toISOString().split('T')[0]) : null,
          remarks: remarks || null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      optimization: {
        id: optimization.id,
        newAP,
        status: optimization.status,
      },
    });
  } catch (error) {
    console.error('[AP-Improvement PATCH] Error:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}

/** recommendedAction에서 예방/검출 조치 분리 추출 */
function extractAction(action: string | null, type: '예방' | '검출'): string {
  if (!action) return '';
  const tag = `[${type}]`;
  const parts = action.split(' | ');
  const found = parts.find((p) => p.startsWith(tag));
  if (found) return found.replace(tag, '').trim();
  // 태그 없으면 전체 반환 (레거시 호환)
  if (type === '예방' && !action.includes('[검출]')) return action;
  return '';
}
