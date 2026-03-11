/**
 * @file route.ts
 * @description Control Plan 저장/조회/목록 API (CP ID별 단계별 저장)
 * @version 2.0.0
 * @created 2026-01-13
 * @updated 2026-01-13 - CP 프로젝트 등록 + CFT 멤버 저장 추가
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * POST: CP 등록/수정 (CpRegistration + CpCftMember)
 */
export async function POST(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { cpNo, cpInfo, cftMembers, parentFmeaId, baseCpId, parentApqpNo } = body;

    if (!cpNo) {
      return NextResponse.json(
        { success: false, error: 'cpNo is required' },
        { status: 400 }
      );
    }

    const cpNoLower = cpNo.toLowerCase(); // ★ 소문자 정규화

    // 디버그: 저장 전 데이터 확인
    console.log('📥 CP 저장 요청:', {
      cpNo: cpNoLower,
      parentApqpNo: parentApqpNo || body.parentApqpNo,
      engineeringLocation: cpInfo?.engineeringLocation,
      cpInfo: cpInfo,
    });

    // 1. CP 등록 정보 저장 (CpRegistration)
    // ★ parentApqpNo 정규화 (빈 문자열, null, undefined 처리)
    const normalizedParentApqpNo = (parentApqpNo || body.parentApqpNo);
    const finalParentApqpNo = normalizedParentApqpNo && normalizedParentApqpNo.trim() !== '' 
      ? normalizedParentApqpNo.trim() 
      : null;
    
    const registrationData = {
      cpNo: cpNoLower,
      // 상위 연결 (3개)
      parentApqpNo: finalParentApqpNo,  // ★ 상위 APQP (최상위) - 정규화된 값
      fmeaId: parentFmeaId?.toLowerCase() || null,         // 상위 FMEA (소문자)
      fmeaNo: parentFmeaId?.toLowerCase() || null,
      parentCpId: baseCpId?.toLowerCase() || body.baseCpId?.toLowerCase() || null,    // 상위 CP (소문자)
      // 회사 정보
      companyName: cpInfo?.companyName || '',
      engineeringLocation: cpInfo?.engineeringLocation || '',  // ★ 엔지니어링 위치
      customerName: cpInfo?.customerName || '',
      modelYear: cpInfo?.modelYear || '',
      subject: cpInfo?.subject || '',
      cpType: cpInfo?.cpType || 'P',
      confidentialityLevel: cpInfo?.confidentialityLevel || '',
      cpStartDate: cpInfo?.cpStartDate || null,
      cpRevisionDate: cpInfo?.cpRevisionDate || null,
      processResponsibility: cpInfo?.processResponsibility || '',
      cpResponsibleName: cpInfo?.cpResponsibleName || '',
      status: 'draft',
    };

    console.log('💾 저장할 registrationData:', {
      cpNo: registrationData.cpNo,
      parentApqpNo: registrationData.parentApqpNo,
      engineeringLocation: registrationData.engineeringLocation,
      fmeaId: registrationData.fmeaId,
      parentCpId: registrationData.parentCpId,
    });

    const savedRegistration = await prisma.cpRegistration.upsert({
      where: { cpNo: cpNoLower },
      create: registrationData,
      update: registrationData,
    });

    console.log(`✅ CP 등록정보 저장 완료: ${savedRegistration.cpNo}`, {
      parentApqpNo: savedRegistration.parentApqpNo,
      engineeringLocation: savedRegistration.engineeringLocation,
      fmeaId: savedRegistration.fmeaId,
      parentCpId: savedRegistration.parentCpId,
    });

    // 2. CFT 멤버 저장 (CpCftMember)
    if (cftMembers && Array.isArray(cftMembers) && cftMembers.length > 0) {
      // 기존 CFT 멤버 삭제
      await prisma.cpCftMember.deleteMany({
        where: { cpNo: cpNoLower },
      });

      // 새 CFT 멤버 저장
      const validMembers = cftMembers.filter((m: any) => m.name && m.name.trim());
      if (validMembers.length > 0) {
        await prisma.cpCftMember.createMany({
          data: validMembers.map((m: any, idx: number) => ({
            cpNo: cpNoLower,
            seq: idx + 1,
            role: m.role || '',
            factory: m.factory || '',
            department: m.department || '',
            name: m.name,
            position: m.position || '',
            phone: m.phone || '',
            email: m.email || '',
            remark: m.remark || '',
          })),
        });
        console.log(`✅ CFT 멤버 ${validMembers.length}명 저장 완료`);
      }
    }

    // 3. 기존 ControlPlan 테이블에도 저장 (하위 호환)
    try {
      await prisma.controlPlan.upsert({
        where: { cpNo: cpNoLower },
        create: {
          cpNo: cpNoLower,
          fmeaId: parentFmeaId?.toLowerCase() || '',
          fmeaNo: parentFmeaId?.toLowerCase() || null,
          projectName: cpInfo?.cpProjectName || cpInfo?.subject || '',
          partName: cpInfo?.subject || '',
          customer: cpInfo?.customerName || '',
          preparedBy: cpInfo?.cpResponsibleName || '',
          status: 'draft',
          syncStatus: 'new',
        },
        update: {
          fmeaId: parentFmeaId?.toLowerCase() || '',
          fmeaNo: parentFmeaId?.toLowerCase() || null,
          projectName: cpInfo?.cpProjectName || cpInfo?.subject || '',
          partName: cpInfo?.subject || '',
          customer: cpInfo?.customerName || '',
          preparedBy: cpInfo?.cpResponsibleName || '',
          syncStatus: 'modified',
        },
      });
    } catch (e) {
      console.warn('[CP API] ControlPlan 저장 스킵 (무시)');
    }

    return NextResponse.json({
      success: true,
      message: `CP ${cpNoLower} 저장 완료`,
      cpNo: cpNoLower,
      id: savedRegistration.id,
      data: savedRegistration,
    });
  } catch (error: any) {
    console.error('[CP API] 저장 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'CP 저장 실패' },
      { status: 500 }
    );
  }
}

/**
 * GET: CP 목록 또는 개별 조회 (CpRegistration 기반)
 */
export async function GET(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const cpNo = searchParams.get('cpNo')?.toLowerCase();
    const id = searchParams.get('id');
    const fmeaId = searchParams.get('fmeaId')?.toLowerCase();  // ★ fmeaId 필터 추가

    // 개별 조회 (전체 데이터 포함)
    if (cpNo || id) {
      const cp = await prisma.cpRegistration.findFirst({
        where: cpNo ? { cpNo } : { id: id! },
        include: {
          cftMembers: { orderBy: { seq: 'asc' } },
          revisions: { orderBy: { createdAt: 'desc' } },
          processes: {
            orderBy: { sortOrder: 'asc' },
            include: {
              detectors: true,
              controlItems: true,
              controlMethods: true,
              reactionPlans: true,
            },
          },
        },
      });

      if (!cp) {
        return NextResponse.json(
          { success: false, error: 'CP not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: cp,
      });
    }

    // 목록 조회 (fmeaId 필터 지원)
    const whereClause: any = {};
    if (fmeaId) {
      whereClause.fmeaId = fmeaId;
      console.log(`🔍 fmeaId 필터 적용: ${fmeaId}`);
    }

    const cps = await prisma.cpRegistration.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        cpNo: true,
        fmeaId: true,
        fmeaNo: true,
        parentApqpNo: true,  // ★ 상위 APQP
        parentCpId: true,    // ★ 상위 CP
        companyName: true,
        customerName: true,
        modelYear: true,
        subject: true,
        cpType: true,
        confidentialityLevel: true,
        cpStartDate: true,
        cpRevisionDate: true,
        processResponsibility: true,
        cpResponsibleName: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            cftMembers: true,
            processes: true,
          },
        },
      },
    });

    // 디버그: 조회된 데이터 확인
    console.log('📋 CP 목록 조회:', cps.length, '건');
    if (cps.length > 0) {
      const sample = cps[0];
      console.log('📋 첫 번째 CP 샘플:', {
        cpNo: sample.cpNo,
        parentApqpNo: sample.parentApqpNo,
        parentCpId: sample.parentCpId,
        subject: sample.subject,
      });
    }

    return NextResponse.json({
      success: true,
      count: cps.length,
      data: cps,
    });
  } catch (error: any) {
    console.error('[CP API] 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'CP 조회 실패' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: CP 삭제 (CpRegistration + 연관 데이터 전부 Cascade 삭제)
 */
export async function DELETE(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const cpNo = searchParams.get('cpNo')?.toLowerCase();
    const id = searchParams.get('id');

    if (!cpNo && !id) {
      return NextResponse.json(
        { success: false, error: 'cpNo or id is required' },
        { status: 400 }
      );
    }

    // CpRegistration 삭제 (Cascade로 연관 테이블 자동 삭제)
    const deleted = await prisma.cpRegistration.delete({
      where: cpNo ? { cpNo } : { id: id! },
    });

    // 기존 ControlPlan도 삭제 시도
    try {
      await prisma.controlPlan.delete({
        where: { cpNo: deleted.cpNo },
      });
    } catch (e) {
      // 없으면 무시
    }

    return NextResponse.json({
      success: true,
      message: `CP ${deleted.cpNo} 삭제 완료 (연관 데이터 포함)`,
      deletedId: deleted.id,
      deletedCpNo: deleted.cpNo,
    });
  } catch (error: any) {
    console.error('[CP API] 삭제 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'CP 삭제 실패' },
      { status: 500 }
    );
  }
}
