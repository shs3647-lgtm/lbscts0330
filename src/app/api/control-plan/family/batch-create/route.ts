/**
 * @file route.ts
 * @description Family CP 일괄 생성 API — FMEA 하위 다중 관리계획서 한번에 생성
 * @created 2026-03-02
 *
 * POST /api/control-plan/family/batch-create
 * Body: { fmeaId, count, labels? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';

export const runtime = 'nodejs';

// ── FMEA ID → Family CP ID 생성 ──
function generateFamilyCpId(fmeaId: string, variantNo: number): string {
  const match = fmeaId.match(/^pfm(\d{2}-[a-z]\d{3})/i);
  if (!match) return '';
  const base = match[1].toLowerCase();
  return `cp${base}.${String(variantNo).padStart(2, '0')}`;
}

// ── FMEA base 추출 ──
function extractFmeaBase(fmeaId: string): string {
  const match = fmeaId.match(/^pfm(\d{2}-[a-z]\d{3})/i);
  return match ? match[1].toLowerCase() : fmeaId;
}

export async function POST(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { fmeaId, count, labels } = body;

    // 입력 검증
    if (!fmeaId) {
      return NextResponse.json(
        { success: false, error: 'fmeaId is required' },
        { status: 400 }
      );
    }

    const fmeaIdLower = fmeaId.toLowerCase();
    if (!isValidFmeaId(fmeaIdLower)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 fmeaId 형식입니다' },
        { status: 400 }
      );
    }

    const cpCount = Math.min(Math.max(parseInt(count) || 1, 1), 10);
    const cpLabels: string[] = Array.isArray(labels) ? labels : [];

    // 1. 상위 FMEA 존재 확인
    const fmeaProject = await prisma.fmeaProject.findUnique({
      where: { fmeaId: fmeaIdLower },
      include: { registration: true },
    });

    if (!fmeaProject) {
      return NextResponse.json(
        { success: false, error: `FMEA를 찾을 수 없습니다: ${fmeaIdLower}` },
        { status: 404 }
      );
    }

    // 2. Family 그룹 ID + 기존 CP 조회
    const familyGroupId = extractFmeaBase(fmeaIdLower);
    const existingCps = await prisma.cpRegistration.findMany({
      where: { fmeaId: fmeaIdLower, deletedAt: null },
      select: { cpNo: true, variantNo: true },
      orderBy: { variantNo: 'desc' },
    });

    // max variantNo 계산
    let maxVariant = 0;
    for (const cp of existingCps) {
      if (cp.variantNo && cp.variantNo > maxVariant) maxVariant = cp.variantNo;
      const match = cp.cpNo.match(/\.(\d{2})$/);
      if (match) {
        const vn = parseInt(match[1], 10);
        if (vn > maxVariant) maxVariant = vn;
      }
    }

    const hasExistingCps = existingCps.length > 0;
    const reg = fmeaProject.registration;

    // 3. 중복 체크 + CP ID 목록 사전 생성
    const toCreate: { cpNo: string; variantNo: number; variantLabel: string | null; isBase: boolean }[] = [];
    for (let i = 0; i < cpCount; i++) {
      const variantNo = maxVariant + 1 + i;
      const cpNo = generateFamilyCpId(fmeaIdLower, variantNo);
      if (!cpNo) {
        return NextResponse.json(
          { success: false, error: 'FMEA ID에서 CP ID를 생성할 수 없습니다' },
          { status: 400 }
        );
      }
      toCreate.push({
        cpNo,
        variantNo,
        variantLabel: cpLabels[i] || null,
        isBase: !hasExistingCps && i === 0,
      });
    }

    // 중복 체크
    const existingIds = await prisma.cpRegistration.findMany({
      where: { cpNo: { in: toCreate.map(c => c.cpNo) } },
      select: { cpNo: true },
    });
    if (existingIds.length > 0) {
      return NextResponse.json(
        { success: false, error: `이미 존재하는 CP: ${existingIds.map(e => e.cpNo).join(', ')}` },
        { status: 409 }
      );
    }

    // 4. 트랜잭션으로 일괄 생성
    const result = await prisma.$transaction(async (tx: any) => {
      const created: { cpNo: string; variantNo: number; variantLabel: string | null; isBaseVariant: boolean }[] = [];

      for (const item of toCreate) {
        await tx.cpRegistration.create({
          data: {
            cpNo: item.cpNo,
            fmeaId: fmeaIdLower,
            fmeaNo: fmeaIdLower,
            parentApqpNo: fmeaProject.parentApqpNo || null,
            parentCpId: item.isBase ? null : (existingCps[0]?.cpNo || toCreate[0].cpNo),
            familyGroupId,
            variantNo: item.variantNo,
            variantLabel: item.variantLabel,
            isBaseVariant: item.isBase,
            // FMEA 공통 데이터 복사
            companyName: reg?.companyName || '',
            engineeringLocation: reg?.engineeringLocation || '',
            customerName: reg?.customerName || '',
            modelYear: reg?.modelYear || '',
            subject: reg?.subject || '',
            cpType: 'P',
            confidentialityLevel: '',
            cpStartDate: new Date().toISOString().split('T')[0],
            processResponsibility: reg?.designResponsibility || '',
            cpResponsibleName: reg?.fmeaResponsibleName || '',
            partName: reg?.partName || '',
            partNo: reg?.partNo || '',
            status: 'draft',
          },
        });

        created.push({
          cpNo: item.cpNo,
          variantNo: item.variantNo,
          variantLabel: item.variantLabel,
          isBaseVariant: item.isBase,
        });

        // ProjectLinkage 행 생성
        try {
          await tx.projectLinkage.create({
            data: {
              cpNo: item.cpNo,
              pfmeaId: fmeaIdLower,
              apqpNo: fmeaProject.parentApqpNo || null,
              subject: reg?.subject || '',
              customerName: reg?.customerName || '',
              companyName: reg?.companyName || '',
              modelYear: reg?.modelYear || '',
              partNo: reg?.partNo || '',
              engineeringLocation: reg?.engineeringLocation || '',
              responsibleName: reg?.fmeaResponsibleName || '',
              linkType: 'family',
              status: 'active',
            },
          });
        } catch (e) {
          console.error('[family-cp-batch] ProjectLinkage 생성 오류:', e);
        }
      }

      // FmeaRegistration.linkedCpNos 업데이트
      if (reg) {
        const currentLinkedCpNos: string[] = reg.linkedCpNos
          ? JSON.parse(reg.linkedCpNos as string)
          : [];
        for (const item of toCreate) {
          if (!currentLinkedCpNos.includes(item.cpNo)) {
            currentLinkedCpNos.push(item.cpNo);
          }
        }
        await tx.fmeaRegistration.update({
          where: { fmeaId: fmeaIdLower },
          data: {
            linkedCpNo: currentLinkedCpNos[0] || toCreate[0].cpNo,
            linkedCpNos: JSON.stringify(currentLinkedCpNos),
          },
        });
      }

      return created;
    });


    return NextResponse.json({
      success: true,
      created: result,
      totalCount: result.length,
    });
  } catch (err) {
    console.error('[family-cp-batch] POST 오류:', err);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(err) },
      { status: 500 }
    );
  }
}
