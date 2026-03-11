/**
 * @file route.ts
 * @description Family CP 생성 API — FMEA 기반 다중 관리계획서 생성
 * @created 2026-03-02
 *
 * POST /api/control-plan/family/create
 * Body: { fmeaId, baseCpNo?, variantLabel?, cpInfo? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';

export const runtime = 'nodejs';

// ── FMEA ID → Family CP ID 생성 (서버 사이드) ──
function generateFamilyCpIdServer(fmeaId: string, variantNo: number): string {
  const match = fmeaId.match(/^pfm(\d{2}-[a-z]\d{3})/i);
  if (!match) return '';
  const base = match[1].toLowerCase();
  return `cp${base}.${String(variantNo).padStart(2, '0')}`;
}

// ── FMEA base 추출 ──
function extractFmeaBaseFromId(fmeaId: string): string {
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
    const { fmeaId, baseCpNo, variantLabel, cpInfo } = body;

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

    // 2. Family 그룹 ID
    const familyGroupId = extractFmeaBaseFromId(fmeaIdLower);

    // 3. 기존 Family CP 조회 → 다음 variantNo 결정
    const existingCps = await prisma.cpRegistration.findMany({
      where: {
        fmeaId: fmeaIdLower,
        deletedAt: null,
      },
      select: { cpNo: true, variantNo: true },
      orderBy: { variantNo: 'desc' },
    });

    // variantNo 계산: 기존 max + 1, 또는 Family CP ID 패턴에서 추출
    let maxVariant = 0;
    for (const cp of existingCps) {
      if (cp.variantNo && cp.variantNo > maxVariant) {
        maxVariant = cp.variantNo;
      }
      // Family CP ID에서도 확인
      const match = cp.cpNo.match(/\.(\d{2})$/);
      if (match) {
        const vn = parseInt(match[1], 10);
        if (vn > maxVariant) maxVariant = vn;
      }
    }
    const nextVariantNo = maxVariant + 1;
    const isBase = existingCps.length === 0; // 첫 CP가 Base

    // 4. 새 CP ID 생성
    const newCpNo = generateFamilyCpIdServer(fmeaIdLower, nextVariantNo);
    if (!newCpNo) {
      return NextResponse.json(
        { success: false, error: 'FMEA ID에서 CP ID를 생성할 수 없습니다' },
        { status: 400 }
      );
    }

    // 중복 체크
    const existing = await prisma.cpRegistration.findUnique({
      where: { cpNo: newCpNo },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `이미 존재하는 CP ID: ${newCpNo}` },
        { status: 409 }
      );
    }

    // 5. FMEA 등록정보에서 공통 데이터 가져오기
    const reg = fmeaProject.registration;
    const baseCpData = baseCpNo
      ? await prisma.cpRegistration.findUnique({ where: { cpNo: baseCpNo.toLowerCase() } })
      : null;

    // 6. 트랜잭션으로 생성
    const result = await prisma.$transaction(async (tx: any) => {
      // 6a. CpRegistration 생성
      const newReg = await tx.cpRegistration.create({
        data: {
          cpNo: newCpNo,
          fmeaId: fmeaIdLower,
          fmeaNo: fmeaIdLower,
          parentApqpNo: fmeaProject.parentApqpNo || null,
          parentCpId: baseCpData?.cpNo || (isBase ? null : existingCps[0]?.cpNo || null),
          familyGroupId,
          variantNo: nextVariantNo,
          variantLabel: variantLabel || null,
          isBaseVariant: isBase,
          // 공통 데이터 (FMEA 또는 Base CP에서)
          companyName: cpInfo?.companyName || baseCpData?.companyName || reg?.companyName || '',
          engineeringLocation: cpInfo?.engineeringLocation || baseCpData?.engineeringLocation || reg?.engineeringLocation || '',
          customerName: cpInfo?.customerName || baseCpData?.customerName || reg?.customerName || '',
          modelYear: cpInfo?.modelYear || baseCpData?.modelYear || reg?.modelYear || '',
          subject: cpInfo?.subject || baseCpData?.subject || reg?.subject || '',
          cpType: cpInfo?.cpType || baseCpData?.cpType || 'P',
          confidentialityLevel: cpInfo?.confidentialityLevel || baseCpData?.confidentialityLevel || '',
          cpStartDate: cpInfo?.cpStartDate || new Date().toISOString().split('T')[0],
          processResponsibility: cpInfo?.processResponsibility || baseCpData?.processResponsibility || '',
          cpResponsibleName: cpInfo?.cpResponsibleName || baseCpData?.cpResponsibleName || reg?.fmeaResponsibleName || '',
          partName: cpInfo?.partName || baseCpData?.partName || reg?.partName || '',
          partNo: cpInfo?.partNo || baseCpData?.partNo || reg?.partNo || '',
          status: 'draft',
        },
      });

      // 6b. Base CP에서 워크시트 데이터 복제 (baseCpNo 지정 시)
      if (baseCpNo) {
        const srcCpNo = baseCpNo.toLowerCase();
        await cloneWorksheetData(tx, srcCpNo, newCpNo);
      }

      // 6c. FmeaRegistration.linkedCpNos 업데이트
      if (reg) {
        const currentLinkedCpNos: string[] = reg.linkedCpNos
          ? JSON.parse(reg.linkedCpNos as string)
          : [];
        if (!currentLinkedCpNos.includes(newCpNo)) {
          currentLinkedCpNos.push(newCpNo);
        }
        await tx.fmeaRegistration.update({
          where: { fmeaId: fmeaIdLower },
          data: {
            linkedCpNo: currentLinkedCpNos[0] || newCpNo,
            linkedCpNos: JSON.stringify(currentLinkedCpNos),
          },
        });
      }

      // 6d. ProjectLinkage 행 생성
      try {
        await tx.projectLinkage.create({
          data: {
            cpNo: newCpNo,
            pfmeaId: fmeaIdLower,
            apqpNo: fmeaProject.parentApqpNo || null,
            subject: newReg.subject || '',
            customerName: newReg.customerName || '',
            companyName: newReg.companyName || '',
            modelYear: newReg.modelYear || '',
            partNo: newReg.partNo || '',
            engineeringLocation: newReg.engineeringLocation || '',
            responsibleName: newReg.cpResponsibleName || '',
            linkType: 'family',
            status: 'active',
          },
        });
      } catch (e) {
      }

      return newReg;
    });


    return NextResponse.json({
      success: true,
      cpNo: newCpNo,
      fmeaId: fmeaIdLower,
      familyGroupId,
      variantNo: nextVariantNo,
      variantLabel: variantLabel || null,
      isBaseVariant: isBase,
      message: isBase
        ? `Base CP 생성 완료: ${newCpNo}`
        : `Variant CP 생성 완료: ${newCpNo} (Base: ${result.parentCpId})`,
    });
  } catch (err) {
    console.error('[family-cp] POST 오류:', err);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(err) },
      { status: 500 }
    );
  }
}

// ── 워크시트 데이터 복제 ──
async function cloneWorksheetData(tx: any, srcCpNo: string, newCpNo: string): Promise<void> {
  // CpProcess 복제
  const processes = await tx.cpProcess.findMany({ where: { cpNo: srcCpNo } });
  for (const proc of processes) {
    await tx.cpProcess.create({
      data: {
        cpNo: newCpNo,
        processNo: proc.processNo,
        processName: proc.processName,
        level: proc.level,
        processDesc: proc.processDesc,
        equipment: proc.equipment,
        sortOrder: proc.sortOrder,
      },
    });
  }

  // CpAtomicProcess + 하위 데이터 복제
  const atomicProcesses = await tx.cpAtomicProcess.findMany({ where: { cpNo: srcCpNo } });
  for (const ap of atomicProcesses) {
    const newId = crypto.randomUUID();
    await tx.cpAtomicProcess.create({
      data: {
        id: newId,
        cpNo: newCpNo,
        processNo: ap.processNo,
        processName: ap.processName,
        level: ap.level,
        processDesc: ap.processDesc,
        equipment: ap.equipment,
        workElement: ap.workElement,
        sortOrder: ap.sortOrder,
        rowIndex: ap.rowIndex,
        mergeGroupId: ap.mergeGroupId,
        parentId: ap.parentId,
        rowSpan: ap.rowSpan,
        colSpan: ap.colSpan,
      },
    });

    // 하위 atomic 데이터 복제 (Detector, ControlItem, ControlMethod, ReactionPlan)
    const detectors = await tx.cpAtomicDetector.findMany({
      where: { cpNo: srcCpNo, processNo: ap.processNo },
    });
    for (const d of detectors) {
      await tx.cpAtomicDetector.create({
        data: {
          cpNo: newCpNo,
          processNo: d.processNo,
          processId: newId,
          ep: d.ep,
          autoDetector: d.autoDetector,
          rowIndex: d.rowIndex,
          colIndex: d.colIndex,
          mergeGroupId: d.mergeGroupId,
          parentId: d.parentId,
          rowSpan: d.rowSpan,
          colSpan: d.colSpan,
        },
      });
    }

    const controlItems = await tx.cpAtomicControlItem.findMany({
      where: { cpNo: srcCpNo, processNo: ap.processNo },
    });
    for (const ci of controlItems) {
      await tx.cpAtomicControlItem.create({
        data: {
          cpNo: newCpNo,
          processNo: ci.processNo,
          processId: newId,
          productChar: ci.productChar,
          processChar: ci.processChar,
          specialChar: ci.specialChar,
          spec: ci.spec,
          rowIndex: ci.rowIndex,
          colIndex: ci.colIndex,
          mergeGroupId: ci.mergeGroupId,
          parentId: ci.parentId,
          rowSpan: ci.rowSpan,
          colSpan: ci.colSpan,
        },
      });
    }

    const controlMethods = await tx.cpAtomicControlMethod.findMany({
      where: { cpNo: srcCpNo, processNo: ap.processNo },
    });
    for (const cm of controlMethods) {
      await tx.cpAtomicControlMethod.create({
        data: {
          cpNo: newCpNo,
          processNo: cm.processNo,
          processId: newId,
          evalMethod: cm.evalMethod,
          sampleSize: cm.sampleSize,
          frequency: cm.frequency,
          controlMethod: cm.controlMethod,
          owner1: cm.owner1,
          owner2: cm.owner2,
          rowIndex: cm.rowIndex,
          colIndex: cm.colIndex,
          mergeGroupId: cm.mergeGroupId,
          parentId: cm.parentId,
          rowSpan: cm.rowSpan,
          colSpan: cm.colSpan,
        },
      });
    }

    const reactionPlans = await tx.cpAtomicReactionPlan.findMany({
      where: { cpNo: srcCpNo, processNo: ap.processNo },
    });
    for (const rp of reactionPlans) {
      await tx.cpAtomicReactionPlan.create({
        data: {
          cpNo: newCpNo,
          processNo: rp.processNo,
          processId: newId,
          reactionPlan: rp.reactionPlan,
          rowIndex: rp.rowIndex,
          colIndex: rp.colIndex,
          mergeGroupId: rp.mergeGroupId,
          parentId: rp.parentId,
          rowSpan: rp.rowSpan,
          colSpan: rp.colSpan,
        },
      });
    }
  }

}
