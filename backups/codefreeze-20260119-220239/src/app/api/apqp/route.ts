/**
 * APQP 프로젝트 API - CP와 동일한 구조
 * 
 * POST /api/apqp - APQP 프로젝트 생성
 * GET /api/apqp - APQP 프로젝트 목록 조회
 * GET /api/apqp?apqpNo=xxx - 특정 APQP 프로젝트 조회
 * PUT /api/apqp - APQP 프로젝트 수정
 * DELETE /api/apqp?apqpNo=xxx - APQP 프로젝트 삭제
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// ============ GET: APQP 프로젝트 조회 ============
export async function GET(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const apqpNo = searchParams.get('apqpNo');

  try {
    if (apqpNo) {
      // 특정 APQP 프로젝트 조회 (CFT 멤버 포함)
      const apqp = await prisma.apqpRegistration.findFirst({
        where: { apqpNo },
        include: {
          cftMembers: { orderBy: { seq: 'asc' } },
          revisions: { orderBy: { createdAt: 'desc' } },
          phases: { orderBy: { phaseNo: 'asc' } },
          schedules: { orderBy: { planDate: 'asc' } },
        }
      });

      if (!apqp) {
        return NextResponse.json(
          { success: false, error: 'APQP 프로젝트를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        apqp: {
          ...apqp,
          createdAt: apqp.createdAt.toISOString(),
          updatedAt: apqp.updatedAt.toISOString(),
        }
      });
    } else {
      // 전체 APQP 프로젝트 목록 조회
      const apqps = await prisma.apqpRegistration.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          cftMembers: { where: { role: '팀장' }, take: 1 },
        }
      });

      return NextResponse.json({
        success: true,
        apqps: apqps.map(apqp => ({
          id: apqp.id,
          apqpNo: apqp.apqpNo,
          companyName: apqp.companyName,
          customerName: apqp.customerName,
          subject: apqp.subject,
          productName: apqp.productName,
          modelYear: apqp.modelYear,
          status: apqp.status,
          apqpStartDate: apqp.apqpStartDate,
          apqpRevisionDate: apqp.apqpRevisionDate,
          apqpResponsibleName: apqp.apqpResponsibleName,
          parentApqpNo: apqp.parentApqpNo,
          parentFmeaId: apqp.parentFmeaId,
          baseCpId: apqp.baseCpId,
          leader: apqp.cftMembers[0]?.name || '',
          createdAt: apqp.createdAt.toISOString(),
          updatedAt: apqp.updatedAt.toISOString(),
        }))
      });
    }
  } catch (error: any) {
    console.error('[APQP API] GET 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch APQP' },
      { status: 500 }
    );
  }
}

// ============ POST: APQP 프로젝트 생성 ============
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
    const { apqpNo, apqpInfo, cftMembers, parentFmeaId, baseCpId, parentApqpNo } = body;

    if (!apqpNo || !apqpInfo) {
      return NextResponse.json(
        { success: false, error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 기존 APQP 확인 (findFirst 사용 - unique 필드가 제대로 인식되지 않을 경우 대비)
    const existing = await prisma.apqpRegistration.findFirst({
      where: { apqpNo }
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `APQP ${apqpNo}가 이미 존재합니다.` },
        { status: 409 }
      );
    }

    // 트랜잭션으로 APQP 생성
    const result = await prisma.$transaction(async (tx) => {
      // 1. APQP 등록 정보 생성
      const apqp = await tx.apqpRegistration.create({
        data: {
          apqpNo,
          companyName: apqpInfo.companyName || null,
          engineeringLocation: apqpInfo.engineeringLocation || null,
          customerName: apqpInfo.customerName || null,
          modelYear: apqpInfo.modelYear || null,
          subject: apqpInfo.subject || null,
          apqpStartDate: apqpInfo.apqpStartDate || null,
          apqpRevisionDate: apqpInfo.apqpRevisionDate || null,
          processResponsibility: apqpInfo.processResponsibility || null,
          confidentialityLevel: apqpInfo.confidentialityLevel || null,
          apqpResponsibleName: apqpInfo.apqpResponsibleName || null,
          productName: apqpInfo.productName || apqpInfo.subject || null,
          partNo: apqpInfo.partNo || null,
          targetDate: apqpInfo.targetDate || null,
          status: 'planning',
          parentApqpNo: parentApqpNo || null,
          parentFmeaId: parentFmeaId || null,
          baseCpId: baseCpId || null,
        }
      });

      // 2. CFT 멤버 생성 (이름이 있는 멤버만 저장)
      if (cftMembers && Array.isArray(cftMembers)) {
        const validMembers = cftMembers.filter((m: any) => m.name && m.name.trim());
        if (validMembers.length > 0) {
          await tx.apqpCftMember.createMany({
            data: validMembers.map((m: any, idx: number) => ({
              apqpNo,
              seq: idx + 1,
              role: m.role || null,
              factory: m.factory || null,
              department: m.department || null,
              name: m.name || null,
              position: m.position || null,
              phone: m.phone || null,
              email: m.email || null,
              remark: m.remark || null,
            }))
          });
        }
      }

      // 3. 기본 개정 이력 생성
      await tx.apqpRevision.create({
        data: {
          apqpNo,
          revNo: 'Rev.00',
          revDate: apqpInfo.apqpStartDate || new Date().toISOString().split('T')[0],
          description: '최초 등록',
          author: apqpInfo.apqpResponsibleName || null,
        }
      });

      // 4. 기본 5단계(Phase) 생성
      const phases = [
        { phaseNo: 1, phaseName: 'Phase 1: 계획 및 정의' },
        { phaseNo: 2, phaseName: 'Phase 2: 제품설계 및 개발' },
        { phaseNo: 3, phaseName: 'Phase 3: 공정설계 및 개발' },
        { phaseNo: 4, phaseName: 'Phase 4: 제품 및 공정 유효성확인' },
        { phaseNo: 5, phaseName: 'Phase 5: 피드백, 평가 및 시정조치' },
      ];

      await tx.apqpPhase.createMany({
        data: phases.map(p => ({
          apqpNo,
          phaseNo: p.phaseNo,
          phaseName: p.phaseName,
          status: 'pending',
          progress: 0,
        }))
      });

      return apqp;
    });

    console.log(`✅ APQP 프로젝트 생성 완료: ${result.apqpNo}`);

    return NextResponse.json({
      success: true,
      message: 'APQP 프로젝트가 성공적으로 생성되었습니다.',
      apqpNo: result.apqpNo,
    });

  } catch (error: any) {
    console.error('[APQP API] POST 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create APQP' },
      { status: 500 }
    );
  }
}

// ============ PUT: APQP 프로젝트 수정 ============
export async function PUT(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { apqpNo, apqpInfo, cftMembers, parentFmeaId, baseCpId, parentApqpNo } = body;

    if (!apqpNo) {
      return NextResponse.json(
        { success: false, error: 'APQP 번호가 필요합니다.' },
        { status: 400 }
      );
    }

    // 기존 APQP 확인 (findFirst 사용 - unique 필드가 제대로 인식되지 않을 경우 대비)
    const existing = await prisma.apqpRegistration.findFirst({
      where: { apqpNo }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'APQP 프로젝트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 트랜잭션으로 APQP 수정
    const result = await prisma.$transaction(async (tx) => {
      // 1. APQP 등록 정보 수정
      const apqp = await tx.apqpRegistration.update({
        where: { apqpNo },
        data: {
          companyName: apqpInfo?.companyName,
          engineeringLocation: apqpInfo?.engineeringLocation,
          customerName: apqpInfo?.customerName,
          modelYear: apqpInfo?.modelYear,
          subject: apqpInfo?.subject,
          apqpStartDate: apqpInfo?.apqpStartDate,
          apqpRevisionDate: apqpInfo?.apqpRevisionDate,
          processResponsibility: apqpInfo?.processResponsibility,
          confidentialityLevel: apqpInfo?.confidentialityLevel,
          apqpResponsibleName: apqpInfo?.apqpResponsibleName,
          productName: apqpInfo?.productName || apqpInfo?.subject,
          partNo: apqpInfo?.partNo,
          targetDate: apqpInfo?.targetDate,
          parentApqpNo: parentApqpNo,
          parentFmeaId: parentFmeaId,
          baseCpId: baseCpId,
        }
      });

      // 2. CFT 멤버 갱신 (기존 삭제 후 재생성, 이름이 있는 멤버만 저장)
      if (cftMembers && Array.isArray(cftMembers)) {
        await tx.apqpCftMember.deleteMany({ where: { apqpNo } });
        
        const validMembers = cftMembers.filter((m: any) => m.name && m.name.trim());
        if (validMembers.length > 0) {
          await tx.apqpCftMember.createMany({
            data: validMembers.map((m: any, idx: number) => ({
              apqpNo,
              seq: idx + 1,
              role: m.role || null,
              factory: m.factory || null,
              department: m.department || null,
              name: m.name || null,
              position: m.position || null,
              phone: m.phone || null,
              email: m.email || null,
              remark: m.remark || null,
            }))
          });
        }
      }

      return apqp;
    });

    console.log(`✅ APQP 프로젝트 수정 완료: ${result.apqpNo}`);

    return NextResponse.json({
      success: true,
      message: 'APQP 프로젝트가 성공적으로 수정되었습니다.',
      apqpNo: result.apqpNo,
    });

  } catch (error: any) {
    console.error('[APQP API] PUT 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update APQP' },
      { status: 500 }
    );
  }
}

// ============ DELETE: APQP 프로젝트 삭제 ============
export async function DELETE(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { success: false, error: 'Database not configured' },
      { status: 500 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const apqpNo = searchParams.get('apqpNo');

  if (!apqpNo) {
    return NextResponse.json(
      { success: false, error: 'APQP 번호가 필요합니다.' },
      { status: 400 }
    );
  }

  try {
    // 기존 APQP 확인 (findFirst 사용 - unique 필드가 제대로 인식되지 않을 경우 대비)
    const existing = await prisma.apqpRegistration.findFirst({
      where: { apqpNo }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'APQP 프로젝트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // CASCADE 삭제 (관련 테이블 자동 삭제)
    await prisma.apqpRegistration.delete({
      where: { apqpNo }
    });

    console.log(`✅ APQP 프로젝트 삭제 완료: ${apqpNo}`);

    return NextResponse.json({
      success: true,
      message: 'APQP 프로젝트가 성공적으로 삭제되었습니다.',
    });

  } catch (error: any) {
    console.error('[APQP API] DELETE 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete APQP' },
      { status: 500 }
    );
  }
}

