/**
 * @file create-project/route.ts
 * Master FMEA 기반으로 새 Part FMEA 프로젝트를 생성한다.
 * 원본 FMEA의 Atomic DB 전체를 복사하고 fmeaId만 변경.
 *
 * POST body: { masterFmeaId: string, projectName?: string, customerName?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { reverseExtract } from '@/lib/fmea-core/reverse-extract';
import { remapFmeaId } from '@/lib/fmea-core/remap-fmeaid';
import { saveAtomicDBInTransaction } from '@/lib/fmea-core/save-atomic';

export async function POST(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { success: false, error: 'DB 연결 실패' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { masterFmeaId, projectName, customerName } = body as {
      masterFmeaId?: string;
      projectName?: string;
      customerName?: string;
    };

    if (!masterFmeaId) {
      return NextResponse.json(
        { success: false, error: 'masterFmeaId 필수' },
        { status: 400 }
      );
    }

    // 1. MasterFmea + FamilyMaster 로드
    const masterFmea = await (prisma as any).masterFmea.findUnique({
      where: { id: masterFmeaId },
      include: { familyMaster: true },
    });
    if (!masterFmea) {
      return NextResponse.json(
        { success: false, error: `MasterFmea 없음: ${masterFmeaId}` },
        { status: 404 }
      );
    }

    const sourceFmeaId = masterFmea.familyMaster?.fmeaId;
    if (!sourceFmeaId || !isValidFmeaId(sourceFmeaId)) {
      return NextResponse.json(
        { success: false, error: 'FamilyMaster에 원본 fmeaId 없음' },
        { status: 400 }
      );
    }

    // 2. 원본 FMEA 프로젝트 확인
    const sourceProject = await (prisma as any).fmeaProject.findUnique({
      where: { fmeaId: sourceFmeaId },
      include: { registration: true },
    });
    if (!sourceProject) {
      return NextResponse.json(
        { success: false, error: `원본 FMEA 프로젝트 없음: ${sourceFmeaId}` },
        { status: 404 }
      );
    }

    // 3. 새 fmeaId 생성
    const count = await (prisma as any).fmeaProject.count();
    const seq = String(count + 1).padStart(3, '0');
    const newFmeaId = `pfm26-p${seq}`;

    // 4. 원본 Atomic DB 추출
    const sourceAtomic = await reverseExtract(prisma, sourceFmeaId);

    // 5. fmeaId 리매핑 (UUID는 유지, fmeaId만 변경)
    const remappedAtomic = remapFmeaId(sourceAtomic, newFmeaId);

    // 6. 트랜잭션: FmeaProject + Registration + Legacy + Atomic DB 생성
    const result = await (prisma as any).$transaction(async (tx: any) => {
      // 6a. FmeaProject 생성
      await tx.fmeaProject.create({
        data: {
          fmeaId: newFmeaId,
          fmeaType: 'P',
          parentFmeaId: sourceFmeaId,
          parentFmeaType: 'M',
          status: 'active',
          step: 1,
        },
      });

      // 6b. FmeaRegistration 복사
      const srcReg = sourceProject.registration;
      if (srcReg) {
        await tx.fmeaRegistration.create({
          data: {
            fmeaId: newFmeaId,
            companyName: srcReg.companyName,
            engineeringLocation: srcReg.engineeringLocation,
            customerName: customerName || srcReg.customerName,
            modelYear: srcReg.modelYear,
            subject: srcReg.subject,
            fmeaProjectName: projectName || srcReg.fmeaProjectName,
            designResponsibility: srcReg.designResponsibility,
            confidentialityLevel: srcReg.confidentialityLevel,
            fmeaResponsibleName: srcReg.fmeaResponsibleName,
            partName: srcReg.partName,
            partNo: srcReg.partNo,
            parentApqpNo: srcReg.parentApqpNo,
            linkedCpNo: null,
            linkedPfdNo: null,
            remark: `Master FMEA(${masterFmea.code})에서 생성`,
          },
        });
      }

      return { newFmeaId };
    }, { timeout: 30000 });

    // 7. Atomic DB 저장 (별도 트랜잭션 — saveAtomicDBInTransaction 내부에서 래핑)
    const { counts } = await saveAtomicDBInTransaction(
      prisma,
      remappedAtomic,
      { copySOD: true, copyDCPC: true, copyOptimization: true }
    );

    return NextResponse.json({
      success: true,
      newFmeaId: result.newFmeaId,
      sourceFmeaId,
      masterCode: masterFmea.code,
      atomicCounts: counts,
    });
  } catch (error) {
    console.error('[create-project] Error:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
