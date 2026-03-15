/**
 * @file route.ts
 * @description FMEA 등록정보 조회 API (Prisma 기반)
 * - GET: FMEA ID로 등록정보 조회 (작성자, 검토자, 승인자 정보 포함)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// GET: FMEA 등록정보 조회
export async function GET(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Database not configured', fmeaInfo: null }, { status: 500 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    // ✅ FMEA ID는 항상 소문자로 정규화 (DB 일관성 보장)
    const fmeaId = searchParams.get('fmeaId')?.toLowerCase();

    if (!fmeaId) {
      return NextResponse.json({ success: false, error: 'fmeaId is required', fmeaInfo: null }, { status: 400 });
    }

    // Prisma로 FMEA 등록정보 조회
    const registration = await prisma.fmeaRegistration.findUnique({
      where: { fmeaId },
      select: {
        fmeaId: true,
        subject: true,
        customerName: true,
        modelYear: true,
        designResponsibility: true,
        confidentialityLevel: true,
        fmeaStartDate: true,
        fmeaRevisionDate: true,
        fmeaResponsibleName: true,
        engineeringLocation: true,  // ✅ 공장 필드
        companyName: true,          // ✅ 회사명 필드
        partName: true,             // ✅ 부품명(품명) 필드
        fmeaProjectName: true,      // ✅ 프로젝트명 필드
      },
    });

    if (!registration) {
      return NextResponse.json({
        success: false,
        error: 'FMEA registration not found',
        fmeaInfo: null
      }, { status: 404 });
    }

    // FmeaProject에서 revisionNo 조회
    const project = await prisma.fmeaProject.findUnique({
      where: { fmeaId },
      select: {
        revisionNo: true,
      },
    });

    // ✅ ProjectLinkage에서 공통 데이터 조회 (연동 DB 우선)
    let linkage: any = null;
    try {
      linkage = await (prisma as any).projectLinkage.findFirst({
        where: {
          pfmeaId: fmeaId,
          status: 'active',
        },
      });
    } catch { /* ProjectLinkage 없으면 무시 */ }

    // CFT 멤버에서 검토자/승인자 정보 조회 (역할별)
    const cftMembers = await prisma.fmeaCftMember.findMany({
      where: { fmeaId },
      select: {
        role: true,
        name: true,
        position: true,
      },
    });

    // ✅ CFT 역할별로 매핑 (Leader→작성자, Technical Leader→검토자, Champion→승인자)
    const leader = cftMembers.find(m => m.role === 'Leader');
    const techLeader = cftMembers.find(m => m.role === 'Technical Leader');
    const champion = cftMembers.find(m => m.role === 'Champion');

    // ✅ 필드 매핑 (ProjectLinkage 우선 → registration 폴백)
    const subject = linkage?.subject || registration.subject || '';
    const customerName = linkage?.customerName || registration.customerName || '';
    const engineeringLocation = linkage?.engineeringLocation || registration.engineeringLocation || '';
    const responsibleName = linkage?.responsibleName || registration.fmeaResponsibleName || '';
    const companyName = linkage?.companyName || registration.companyName || '';
    const modelYear = linkage?.modelYear || registration.modelYear || '';
    const partName = registration.partName || (subject.includes('+') ? subject.split('+')[0] : '') || '';


    return NextResponse.json({
      success: true,
      fmeaInfo: {
        ...registration,
        // ✅ 개정관리 화면용 필드 매핑 (ProjectLinkage 우선 → registration 폴백)
        fmeaName: subject || fmeaId,                                        // FMEA명
        factory: engineeringLocation || companyName || '',                   // 공장 (엔지니어링위치 → 회사명 폴백)
        responsible: responsibleName || '',                                  // FMEA책임자
        customer: customerName || '',                                        // 고객
        productName: partName || modelYear || subject || '',                 // 모델(품명): 부품명 → 모델연식 → subject 폴백
        // 기존 필드
        revisionNo: project?.revisionNo || 'Rev.00',
        // ✅ 작성자: FMEA담당자 + CFT Leader (수정가능)
        fmeaResponsiblePosition: leader?.position || '',
        // ✅ 검토자: CFT Technical Leader (수정가능)
        reviewResponsibleName: techLeader?.name || '',
        reviewResponsiblePosition: techLeader?.position || '',
        // ✅ 승인자: CFT Champion (수정가능)
        approvalResponsibleName: champion?.name || '',
        approvalResponsiblePosition: champion?.position || '',
      }
    });
  } catch (error: any) {
    console.error('❌ FMEA 등록정보 조회 실패:', error.message);

    return NextResponse.json({
      success: false,
      error: error.message,
      fmeaInfo: null
    }, { status: 500 });
  }
}

// ★★★ PUT: FMEA 등록정보 업데이트 (APQP 연동용, 2026-01-29) ★★★
export async function PUT(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const {
      id, // fmeaId
      parentApqpNo,
      initialSync, // ★ true면 기초정보가 비어있을 때만 채움
      companyName,
      customerName,
      modelYear,
      subject,
      engineeringLocation,
      startDate,
      revisionDate,
      processResponsibility,
      confidentialityLevel,
      responsibleName,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'id (fmeaId) is required' }, { status: 400 });
    }

    const fmeaId = id.toLowerCase();

    // 기존 등록정보 확인
    const existing = await prisma.fmeaRegistration.findUnique({
      where: { fmeaId },
    });

    // 업데이트 데이터 (parentApqpNo는 항상 업데이트)
    const updateData: any = {};
    if (parentApqpNo !== undefined) updateData.parentApqpNo = parentApqpNo;

    // ★ initialSync 모드: 기초정보가 비어있을 때만 채움 (최초 생성 시)
    const shouldSyncBaseInfo = !initialSync || !existing ||
      (!existing.companyName && !existing.customerName && !existing.subject);

    if (shouldSyncBaseInfo) {
      if (companyName) updateData.companyName = companyName;
      if (customerName) updateData.customerName = customerName;
      if (modelYear) updateData.modelYear = modelYear;
      if (subject) updateData.subject = subject;
      if (engineeringLocation) updateData.engineeringLocation = engineeringLocation;
      if (startDate) updateData.fmeaStartDate = startDate;
      if (revisionDate) updateData.fmeaRevisionDate = revisionDate;
      if (processResponsibility) updateData.designResponsibility = processResponsibility;
      if (confidentialityLevel) updateData.confidentialityLevel = confidentialityLevel;
      if (responsibleName) updateData.fmeaResponsibleName = responsibleName;
    } else {
    }

    let result;
    if (existing) {
      // 기존 레코드 업데이트
      result = await prisma.fmeaRegistration.update({
        where: { fmeaId },
        data: updateData,
      });
    } else {
      // ★ FmeaProject가 없으면 먼저 생성 (FK 관계 충족)
      const existingProject = await prisma.fmeaProject.findUnique({
        where: { fmeaId },
      });

      if (!existingProject) {
        await prisma.fmeaProject.create({
          data: {
            fmeaId,
            fmeaType: 'P',
            status: 'draft',
          },
        });
      }

      // 새 레코드 생성
      result = await prisma.fmeaRegistration.create({
        data: {
          fmeaId,
          ...updateData,
        },
      });

      // ★ 등록 시 개정 이력 자동 생성 (없으면)
      try {
        const existingRevisions = await prisma.fmeaRevisionHistory.findMany({ where: { fmeaId } });
        if (existingRevisions.length === 0) {
          const responsibleName = updateData.fmeaResponsibleName || '';
          const responsiblePosition = updateData.fmeaResponsiblePosition || '';
          const defaultRevisions = Array.from({ length: 10 }, (_, index) => ({
            fmeaId,
            revisionNumber: `Rev.${index.toString().padStart(2, '0')}`,
            revisionHistory: index === 0 ? '신규 프로젝트 등록' : '',
            createPosition: index === 0 ? responsiblePosition : '',
            createName: index === 0 ? responsibleName : '',
            createDate: index === 0 ? new Date().toISOString().split('T')[0] : '',
            createStatus: index === 0 ? '진행' : '',
            reviewPosition: '', reviewName: '', reviewDate: '', reviewStatus: '',
            approvePosition: '', approveName: '', approveDate: '', approveStatus: '',
          }));
          await prisma.fmeaRevisionHistory.createMany({ data: defaultRevisions });
        }
      } catch (revErr: any) {
      }
    }

    return NextResponse.json({
      success: true,
      message: existing ? 'Updated' : 'Created',
      data: result,
    });
  } catch (error: any) {
    console.error('❌ FMEA 등록정보 업데이트 실패:', error.message);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
