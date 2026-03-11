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
      // 특정 APQP 프로젝트 조회 (CFT 멤버 포함, 대소문자 무관)
      const apqp = await prisma.apqpRegistration.findFirst({
        where: {
          apqpNo: { equals: apqpNo, mode: 'insensitive' },
          deletedAt: null,
        },
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

      // ★★★ ProjectLinkage에서 연동 정보 가져오기 (유효한 레코드만, 최신 우선) ★★★
      const linkage = await prisma.projectLinkage.findFirst({
        where: {
          apqpNo: apqpNo.toLowerCase(),
          status: 'active',
        },
        orderBy: { updatedAt: 'desc' },  // 최신 업데이트 레코드 우선
      });

      // ★★★ 기초 정보 병합 (통합 DB 우선) ★★★
      const mergedApqp = {
        ...apqp,
        companyName: (linkage as any)?.companyName || apqp.companyName || '',
        customerName: (linkage as any)?.customerName || apqp.customerName || '',
        modelYear: (linkage as any)?.modelYear || apqp.modelYear || '',
        subject: (linkage as any)?.subject || apqp.subject || '',
        productName: (linkage as any)?.projectName || (apqp as any).productName || apqp.subject || '',
        partNo: (linkage as any)?.partNo || (apqp as any).partNo || '',
        engineeringLocation: (linkage as any)?.engineeringLocation || apqp.engineeringLocation || '',
        processResponsibility: (linkage as any)?.processResponsibility || apqp.processResponsibility || '',
        apqpResponsibleName: (linkage as any)?.responsibleName || apqp.apqpResponsibleName || '',
        apqpStartDate: (linkage as any)?.startDate || apqp.apqpStartDate || '',
        apqpRevisionDate: (linkage as any)?.revisionDate || apqp.apqpRevisionDate || '',
        // ★ 연동 정보 추가
        linkedFmea: (linkage as any)?.pfmeaId || (apqp as any).linkedFmea || null,
        linkedDfmea: (linkage as any)?.dfmeaId || (apqp as any).linkedDfmea || null,
        linkedCp: (linkage as any)?.cpNo || (apqp as any).linkedCp || null,
        linkedPfd: (linkage as any)?.pfdNo || (apqp as any).linkedPfd || null,
        createdAt: apqp.createdAt.toISOString(),
        updatedAt: apqp.updatedAt.toISOString(),
      };

      return NextResponse.json({
        success: true,
        apqp: mergedApqp
      });
    } else {
      // 전체 APQP 프로젝트 목록 조회
      const apqps = await prisma.apqpRegistration.findMany({
        where: { deletedAt: null },
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
          engineeringLocation: apqp.engineeringLocation, // ★ 추가
          customerName: apqp.customerName,
          subject: apqp.subject,
          productName: apqp.productName,
          modelYear: apqp.modelYear,
          processResponsibility: apqp.processResponsibility,
          confidentialityLevel: apqp.confidentialityLevel,
          developmentLevel: apqp.developmentLevel, // ★ 추가
          status: apqp.status,
          apqpStartDate: apqp.apqpStartDate,
          apqpRevisionDate: apqp.apqpRevisionDate,
          apqpResponsibleName: apqp.apqpResponsibleName,
          parentApqpNo: apqp.parentApqpNo,
          parentFmeaId: apqp.parentFmeaId,
          baseCpId: apqp.baseCpId,
          partNo: apqp.partNo || '', // ★ 품번 추가
          // ★ 연동 ID 추가
          linkedFmea: (apqp as any).linkedFmea,
          linkedDfmea: (apqp as any).linkedDfmea,
          linkedCp: (apqp as any).linkedCp,
          linkedPfd: (apqp as any).linkedPfd,
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
    let { apqpNo } = body;
    const { apqpInfo, cftMembers, parentFmeaId, baseCpId, parentApqpNo, linkedFmea, linkedDfmea, linkedCp, linkedPfd } = body;

    if (!apqpInfo) {
      return NextResponse.json(
        { success: false, error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // ★ apqpNo가 없으면 자동 생성 (DB 순차번호 기반)
    if (!apqpNo) {
      const year = new Date().getFullYear().toString().slice(-2);
      const prefix = `pj${year}-`;

      // DB에서 활성 레코드 기준 가장 큰 순번 조회
      const lastApqp = await prisma.apqpRegistration.findFirst({
        where: { apqpNo: { startsWith: prefix }, deletedAt: null },
        orderBy: { apqpNo: 'desc' },
        select: { apqpNo: true }
      });

      let nextNum = 1;
      if (lastApqp?.apqpNo) {
        const match = lastApqp.apqpNo.match(/(\d{3})$/);
        if (match) nextNum = parseInt(match[1]) + 1;
      }

      // ★ 충돌 회피: soft-deleted 레코드와 ID 겹침 방지
      const allApqps = await prisma.apqpRegistration.findMany({
        where: { apqpNo: { startsWith: prefix } },
        select: { apqpNo: true }
      });
      const allNums = new Set(
        allApqps.map((a: { apqpNo: string }) => {
          const m = a.apqpNo.match(/(\d{3})$/);
          return m ? parseInt(m[1]) : 0;
        }).filter((n: number) => n > 0)
      );
      while (allNums.has(nextNum)) {
        nextNum++;
      }

      apqpNo = `${prefix}${nextNum.toString().padStart(3, '0')}`;
    }

    // 기존 APQP 확인 (대소문자 무관 검색)
    const existing = await prisma.apqpRegistration.findFirst({
      where: {
        apqpNo: { equals: apqpNo, mode: 'insensitive' }
      }
    });

    if (existing) {
      // ★ 기존 데이터가 있으면 업데이트 (DB 원본 apqpNo 사용)
      const updated = await prisma.apqpRegistration.update({
        where: { apqpNo: existing.apqpNo },
        data: {
          companyName: apqpInfo.companyName || null,
          engineeringLocation: apqpInfo.engineeringLocation || null,
          customerName: apqpInfo.customerName || null,
          modelYear: apqpInfo.modelYear || null,
          subject: apqpInfo.subject || null,
          apqpStartDate: apqpInfo.apqpStartDate || null,
          apqpRevisionDate: apqpInfo.apqpRevisionDate || null,
          processResponsibility: apqpInfo.processResponsibility || null,
          confidentialityLevel: apqpInfo.confidentialityLevel || null,
          developmentLevel: apqpInfo.developmentLevel || null,
          apqpResponsibleName: apqpInfo.apqpResponsibleName || null,
          // ★★★ 품번, 품명 추가 ★★★
          partNo: apqpInfo.partNo || null,
          productName: apqpInfo.productName || apqpInfo.partName || apqpInfo.subject || null,
          // ★ 연동 필드 업데이트
          linkedFmea: linkedFmea || (existing as any).linkedFmea || null,
          linkedDfmea: linkedDfmea || (existing as any).linkedDfmea || null,
          linkedCp: linkedCp || (existing as any).linkedCp || null,
          linkedPfd: linkedPfd || (existing as any).linkedPfd || null,
        }
      });


      // ★★★ ProjectLinkage 동기화 업데이트 (업데이트 시에도 반영!!) ★★★
      try {
        const linkageData = {
          companyName: apqpInfo.companyName || null,
          engineeringLocation: apqpInfo.engineeringLocation || null,
          customerName: apqpInfo.customerName || null,
          modelYear: apqpInfo.modelYear || null,
          subject: apqpInfo.subject || null,
          projectName: apqpInfo.subject || null,
          partNo: apqpInfo.partNo || null,
          startDate: apqpInfo.apqpStartDate || null,
          revisionDate: apqpInfo.apqpRevisionDate || null,
          processResponsibility: apqpInfo.processResponsibility || null,
          responsibleName: apqpInfo.apqpResponsibleName || null,
          pfmeaId: linkedFmea || (existing as any).linkedFmea || null,
          dfmeaId: linkedDfmea || (existing as any).linkedDfmea || null,
          cpNo: linkedCp || (existing as any).linkedCp || null,
          pfdNo: linkedPfd || (existing as any).linkedPfd || null,
        };

        const existingLink = await prisma.projectLinkage.findFirst({
          where: { apqpNo: apqpNo.toLowerCase() }
        });

        if (existingLink) {
          await prisma.projectLinkage.update({
            where: { id: existingLink.id },
            data: linkageData
          });
        } else {
          await prisma.projectLinkage.create({
            data: { apqpNo: apqpNo.toLowerCase(), ...linkageData, status: 'active', linkType: 'auto' }
          });
        }
      } catch (e) {
        console.error('ProjectLinkage upsert failed:', e);
      }

      return NextResponse.json({
        success: true,
        message: 'APQP 프로젝트가 업데이트되었습니다.',
        apqpNo: updated.apqpNo,
      });
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
          developmentLevel: apqpInfo.developmentLevel || null,
          apqpResponsibleName: apqpInfo.apqpResponsibleName || null,
          productName: apqpInfo.productName || apqpInfo.subject || null,
          partNo: apqpInfo.partNo || null,
          targetDate: apqpInfo.targetDate || null,
          status: 'planning',
          parentApqpNo: parentApqpNo || null,
          parentFmeaId: parentFmeaId || null,
          baseCpId: baseCpId || null,
          // ★ 연동 필드 저장
          linkedFmea: linkedFmea || null,
          linkedDfmea: linkedDfmea || null,
          linkedCp: linkedCp || null,
          linkedPfd: linkedPfd || null,
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


    // ★★★ ProjectLinkage에 자동 등록 (기초정보 연동용, 2026-01-29) ★★★
    try {
      // 연동 ID 자동 생성 (APQP ID 기반)
      const baseIdPart = apqpNo.replace(/^pj/i, ''); // "26-n001"
      const finalPfmeaId = linkedFmea || null;
      const finalDfmeaId = linkedDfmea || null;
      const finalCpNo = linkedCp || null;
      const finalPfdNo = linkedPfd || null;

      const linkageData = {
        pfmeaId: finalPfmeaId,
        dfmeaId: finalDfmeaId,
        pfdNo: finalPfdNo,
        cpNo: finalCpNo,
        companyName: apqpInfo.companyName || null,
        engineeringLocation: apqpInfo.engineeringLocation || null,
        customerName: apqpInfo.customerName || null,
        modelYear: apqpInfo.modelYear || null,
        subject: apqpInfo.subject || null,
        projectName: apqpInfo.subject || null,
        partNo: apqpInfo.partNo || null,  // ★ 품번 추가
        startDate: apqpInfo.apqpStartDate || null,
        revisionDate: apqpInfo.apqpRevisionDate || null,
        processResponsibility: apqpInfo.processResponsibility || null,
        confidentialityLevel: apqpInfo.confidentialityLevel || null,
        responsibleName: apqpInfo.apqpResponsibleName || null,
      };

      // 기존 ProjectLinkage 확인
      const existingLinkage = await prisma.projectLinkage.findFirst({
        where: { apqpNo: apqpNo.toLowerCase() },
      });

      if (existingLinkage) {
        // 업데이트
        await prisma.projectLinkage.update({
          where: { id: existingLinkage.id },
          data: linkageData,
        });
      } else {
        // 생성
        await prisma.projectLinkage.create({
          data: { apqpNo: apqpNo.toLowerCase(), ...linkageData },
        });
      }

      // ★★★ 각 모듈 레코드 자동 생성 제거 (2026-02-05) ★★★
      // 사용자가 선택한 연동 문서만 생성됨 (각 모듈 등록 화면에서 직접 생성)


    } catch (linkageErr) {
      // ProjectLinkage 실패해도 APQP 생성은 성공으로 처리
    }

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
    const { apqpNo, apqpInfo, cftMembers, parentFmeaId, baseCpId, parentApqpNo, linkedFmea, linkedDfmea, linkedCp, linkedPfd } = body;

    if (!apqpNo) {
      return NextResponse.json(
        { success: false, error: 'APQP 번호가 필요합니다.' },
        { status: 400 }
      );
    }

    // 기존 APQP 확인 (대소문자 무관 검색, 활성 레코드만)
    const existing = await prisma.apqpRegistration.findFirst({
      where: {
        apqpNo: { equals: apqpNo, mode: 'insensitive' },
        deletedAt: null,
      }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'APQP 프로젝트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 트랜잭션으로 APQP 수정 (DB 원본 apqpNo 사용)
    const result = await prisma.$transaction(async (tx) => {
      // 1. APQP 등록 정보 수정
      const apqp = await tx.apqpRegistration.update({
        where: { apqpNo: existing.apqpNo },
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
          // ★ 연동 필드 업데이트
          linkedFmea: linkedFmea || null,
          linkedDfmea: linkedDfmea || null,
          linkedCp: linkedCp || null,
          linkedPfd: linkedPfd || null,
        }
      });

      // 2. CFT 멤버 갱신 (기존 삭제 후 재생성, 이름이 있는 멤버만 저장)
      if (cftMembers && Array.isArray(cftMembers)) {
        await tx.apqpCftMember.deleteMany({ where: { apqpNo: existing.apqpNo } });

        const validMembers = cftMembers.filter((m: any) => m.name && m.name.trim());
        if (validMembers.length > 0) {
          await tx.apqpCftMember.createMany({
            data: validMembers.map((m: any, idx: number) => ({
              apqpNo: existing.apqpNo,
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


    // ★★★ ProjectLinkage 동기화 (기초정보를 중앙 저장소에 업데이트/생성) ★★★
    try {
      const linkageKey = existing.apqpNo.toLowerCase();
      const linkage = await prisma.projectLinkage.findFirst({
        where: { apqpNo: linkageKey }
      });
      const linkageData = {
        companyName: apqpInfo?.companyName || linkage?.companyName || null,
        customerName: apqpInfo?.customerName || linkage?.customerName || null,
        modelYear: apqpInfo?.modelYear || linkage?.modelYear || null,
        subject: apqpInfo?.subject || linkage?.subject || null,
        projectName: apqpInfo?.subject || linkage?.subject || null,
        partNo: apqpInfo?.partNo || null,
        engineeringLocation: apqpInfo?.engineeringLocation || linkage?.engineeringLocation || null,
        processResponsibility: apqpInfo?.processResponsibility || linkage?.processResponsibility || null,
        confidentialityLevel: apqpInfo?.confidentialityLevel || linkage?.confidentialityLevel || null,
        responsibleName: apqpInfo?.apqpResponsibleName || linkage?.responsibleName || null,
        pfmeaId: linkedFmea || null,
        dfmeaId: linkedDfmea || null,
        cpNo: linkedCp || null,
        pfdNo: linkedPfd || null,
      };
      if (linkage) {
        await prisma.projectLinkage.update({
          where: { id: linkage.id },
          data: linkageData,
        });
      } else {
        await prisma.projectLinkage.create({
          data: { apqpNo: linkageKey, ...linkageData, status: 'active', linkType: 'auto' },
        });
      }
    } catch (linkageError) {
    }

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
    // ★ 대소문자 무시 검색 (case-insensitive)
    const existing = await prisma.apqpRegistration.findFirst({
      where: {
        apqpNo: { equals: apqpNo, mode: 'insensitive' }
      }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'APQP 프로젝트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // ★ Soft Delete (deletedAt 설정)
    await prisma.apqpRegistration.update({
      where: { apqpNo: existing.apqpNo },
      data: { deletedAt: new Date() }
    });


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

