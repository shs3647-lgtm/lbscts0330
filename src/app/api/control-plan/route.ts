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
    const { cpNo, cpInfo, cftMembers, parentFmeaId, baseCpId, parentApqpNo, linkedPfdNo } = body;

    if (!cpNo) {
      return NextResponse.json(
        { success: false, error: 'cpNo is required' },
        { status: 400 }
      );
    }

    const cpNoLower = cpNo.toLowerCase(); // ★ 소문자 정규화

    // 디버그: 저장 전 데이터 확인

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
      confidentialityLevel: cpInfo?.confidentialityLevel || '',  // CP 종류
      securityLevel: cpInfo?.securityLevel || '',  // ★ 기밀수준

      cpStartDate: cpInfo?.cpStartDate || null,
      cpRevisionDate: cpInfo?.cpRevisionDate || null,
      processResponsibility: cpInfo?.processResponsibility || '',
      cpResponsibleName: cpInfo?.cpResponsibleName || '',

      // ★ 연동 문서
      linkedPfdNo: linkedPfdNo?.toLowerCase() || null,
      linkedDfmeaNo: cpInfo?.linkedDfmeaNo?.toLowerCase() || null,

      // ★ 품명/품번
      partName: cpInfo?.partName || '',
      partNo: cpInfo?.partNo || '',

      partNameMode: body.partNameMode || 'A',  // ★ A=부품명 숨김(기본), B=부품명 표시

      // ★ Family CP 필드
      familyGroupId: body.familyGroupId || null,
      variantNo: body.variantNo ?? null,
      variantLabel: body.variantLabel || null,
      isBaseVariant: body.isBaseVariant ?? false,

      status: 'draft',
    };


    // ★ P1-1: CP 등록 + CFT 멤버를 트랜잭션으로 원자성 보장
    const savedRegistration = await prisma.$transaction(async (tx: any) => {
      const reg = await tx.cpRegistration.upsert({
        where: { cpNo: cpNoLower },
        create: registrationData,
        update: registrationData,
      });

      // 2. CFT 멤버 저장 (CpCftMember) - 삭제+생성 원자성 보장
      if (cftMembers && Array.isArray(cftMembers) && cftMembers.length > 0) {
        await tx.cpCftMember.deleteMany({
          where: { cpNo: cpNoLower },
        });

        const validMembers = cftMembers.filter((m: any) => m.name && m.name.trim());
        if (validMembers.length > 0) {
          await tx.cpCftMember.createMany({
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
        }
      }

      // ★ CpMasterDataset 자동 생성 (cpNo @unique → findUnique 사용)
      const existingDs = await tx.cpMasterDataset.findUnique({
        where: { cpNo: cpNoLower },
      });
      if (!existingDs) {
        await tx.cpMasterDataset.create({
          data: { cpNo: cpNoLower, name: 'AUTO-MASTER', isActive: true },
        });
      }

      return reg;
    });


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
      console.error('[CP API] ControlPlan upsert 오류:', e);
    }

    // ★★★ 4. ProjectLinkage에 연동 정보 + 공통 데이터 저장 ★★★
    // 원칙: 모든 공통 데이터는 ProjectLinkage에 저장, 연동 앱들이 여기서 가져감
    try {
      const linkedPfdNo = body.linkedPfdNo?.toLowerCase();

      // ★ 품명+생산공정 형식의 subject
      const partNameValue = cpInfo?.partName || '품명';
      const unifiedSubject = `${partNameValue}+생산공정`;

      // 1차: apqpNo로 기존 레코드 찾기 (APQP에서 생성한 연동)
      let existingLinkage = null;
      if (finalParentApqpNo) {
        existingLinkage = await (prisma as any).projectLinkage.findFirst({
          where: { apqpNo: finalParentApqpNo.toLowerCase(), status: 'active' }
        });
      }

      // 2차: cpNo로 기존 레코드 찾기
      if (!existingLinkage) {
        existingLinkage = await (prisma as any).projectLinkage.findFirst({
          where: { cpNo: cpNoLower, status: 'active' }
        });
      }

      // 3차: pfmeaId로 기존 레코드 찾기
      if (!existingLinkage && parentFmeaId) {
        existingLinkage = await (prisma as any).projectLinkage.findFirst({
          where: { pfmeaId: parentFmeaId.toLowerCase(), status: 'active' }
        });
      }

      // ★★★ 공통 데이터 (연동 앱들이 공유) ★★★
      const commonData = {
        cpNo: cpNoLower,
        pfdNo: linkedPfdNo || existingLinkage?.pfdNo || null,
        pfmeaId: parentFmeaId?.toLowerCase() || existingLinkage?.pfmeaId || null,
        // ★ 모든 공통 데이터 저장 (연동 앱들이 여기서 가져감)
        subject: unifiedSubject,
        projectName: unifiedSubject,
        customerName: cpInfo?.customerName || existingLinkage?.customerName || '',
        companyName: cpInfo?.companyName || existingLinkage?.companyName || '',
        modelYear: cpInfo?.modelYear || existingLinkage?.modelYear || '',
        partNo: cpInfo?.partNo || existingLinkage?.partNo || '',
        engineeringLocation: cpInfo?.engineeringLocation || existingLinkage?.engineeringLocation || '',
        processResponsibility: cpInfo?.processResponsibility || existingLinkage?.processResponsibility || '',
        responsibleName: cpInfo?.cpResponsibleName || existingLinkage?.responsibleName || '',
        startDate: cpInfo?.cpStartDate || existingLinkage?.startDate || '',
        revisionDate: cpInfo?.cpRevisionDate || existingLinkage?.revisionDate || '',
      };

      if (existingLinkage) {
        // 기존 레코드 업데이트 (APQP 연동 정보는 유지)
        await (prisma as any).projectLinkage.update({
          where: { id: existingLinkage.id },
          data: {
            ...commonData,
            // apqpNo는 건드리지 않음 (APQP에서 설정한 값 유지)
          },
        });
      } else {
        // 연동 레코드 신규 생성
        await (prisma as any).projectLinkage.create({
          data: {
            ...commonData,
            apqpNo: finalParentApqpNo || null,
            linkType: 'auto',
            status: 'active',
          },
        });
      }
    } catch (e) {
      console.error('[CP API] ProjectLinkage upsert 오류:', e);
    }

    // ★★★ 5. 연동된 FMEA 프로젝트 자동 생성/업데이트 ★★★
    if (parentFmeaId) {
      try {
        const fmeaIdLower = parentFmeaId.toLowerCase();

        // ★ FMEA 이름: 품명+생산공정 형식 (품명이 없으면 "품명+생산공정")
        const partNameValue = cpInfo?.partName || cpInfo?.subject || '품명';
        const fmeaSubject = `${partNameValue}+생산공정`;

        // 1. FmeaProject 테이블 확인
        const existingFmea = await (prisma as any).fmeaProject.findUnique({
          where: { fmeaId: fmeaIdLower },
        });

        if (!existingFmea) {
          // FMEA 프로젝트가 없으면 신규 생성
          await (prisma as any).fmeaProject.create({
            data: {
              fmeaId: fmeaIdLower,
              fmeaType: 'P',
              parentApqpNo: finalParentApqpNo || null,
              status: 'active',
            },
          });
        } else if (existingFmea.status !== 'active') {
          // 상태가 active가 아니면 active로 업데이트
          await (prisma as any).fmeaProject.update({
            where: { fmeaId: fmeaIdLower },
            data: { status: 'active' },
          });
        }

        // 2. FmeaRegistration 테이블(기초정보) 업데이트/생성
        // - subject가 비어있거나 'CP연동_'으로 시작하거나, CP에서 명시적으로 보낸 경우 업데이트
        await (prisma as any).fmeaRegistration.upsert({
          where: { fmeaId: fmeaIdLower },
          create: {
            fmeaId: fmeaIdLower,
            subject: fmeaSubject,
            customerName: cpInfo?.customerName || '',
            partName: cpInfo?.partName || cpInfo?.subject || '',
            partNo: cpInfo?.partNo || '',
            companyName: cpInfo?.companyName || 'AMPSYSTEM',
            engineeringLocation: cpInfo?.engineeringLocation || '',
            linkedCpNo: cpNoLower,
            parentApqpNo: finalParentApqpNo || null,
          },
          update: {
            subject: fmeaSubject,
            customerName: cpInfo?.customerName || '',
            partName: cpInfo?.partName || cpInfo?.subject || '',
            partNo: cpInfo?.partNo || '',
            companyName: cpInfo?.companyName || 'AMPSYSTEM',
            engineeringLocation: cpInfo?.engineeringLocation || '',
            linkedCpNo: cpNoLower,
          }
        });

      } catch (e) {
        console.error('[CP API] FMEA 연동 upsert 오류:', e);
      }
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
    const latest = searchParams.get('latest') === 'true';  // ★ 최신 CP 조회 옵션

    // ★ 성능 최적화: 최신 CP cpNo만 빠르게 반환
    if (latest) {
      const latestCp = await prisma.cpRegistration.findFirst({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: { cpNo: true },
      });

      if (!latestCp) {
        return NextResponse.json({ success: true, data: null, message: 'No CP found' });
      }

      return NextResponse.json({
        success: true,
        data: { cpNo: latestCp.cpNo },
      });
    }

    // 개별 조회 (전체 데이터 포함)
    if (cpNo || id) {
      const cp = await prisma.cpRegistration.findFirst({
        where: cpNo ? { cpNo, deletedAt: null } : { id: id!, deletedAt: null },
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

      // ★★★ ProjectLinkage(중앙 연동DB)에서 공통 데이터 조회 및 병합 ★★★
      let linkageData = null;
      try {
        linkageData = await (prisma as any).projectLinkage.findFirst({
          where: {
            OR: [
              { cpNo: cp.cpNo.toLowerCase() },
              { pfmeaId: cp.fmeaId?.toLowerCase() },
              { pfdNo: cp.linkedPfdNo?.toLowerCase() }
            ],
            status: 'active'
          }
        });
      } catch (e) {
        console.error('[CP API] ProjectLinkage 단건 조회 오류:', e);
      }

      const mergedData = {
        ...cp,
        customerName: linkageData?.customerName || (cp as any).customerName || '',
        companyName: linkageData?.companyName || (cp as any).companyName || '',
        modelYear: linkageData?.modelYear || (cp as any).modelYear || '',
        partNo: linkageData?.partNo || (cp as any).partNo || '',
        subject: linkageData?.subject || (cp as any).subject || '',
        engineeringLocation: linkageData?.engineeringLocation || (cp as any).engineeringLocation || '',
        processResponsibility: linkageData?.processResponsibility || (cp as any).processResponsibility || '',
        cpResponsibleName: linkageData?.responsibleName || (cp as any).cpResponsibleName || '',
        linkedPfdNo: linkageData?.pfdNo || (cp as any).linkedPfdNo || null,
        linkedPfmeaId: linkageData?.pfmeaId || (cp as any).fmeaId || null,
      };

      return NextResponse.json({
        success: true,
        data: mergedData,
      });
    }

    // 목록 조회 (fmeaId 필터 지원 + 서버사이드 페이지네이션)
    const pageParam = searchParams.get('page');
    const sizeParam = searchParams.get('size');
    const sortFieldParam = searchParams.get('sortField');
    const sortOrderParam = searchParams.get('sortOrder');
    const searchParam = searchParams.get('search');

    // ★ includeDeleted: 휴지통 모드 (삭제된 항목 포함)
    const includeDeleted = searchParams.get('includeDeleted') === 'true';
    const whereClause: any = includeDeleted ? {} : { deletedAt: null };
    if (fmeaId) {
      whereClause.fmeaId = fmeaId;
    }

    // ★ 검색 필터 (search → OR clause)
    if (searchParam && searchParam.trim()) {
      const q = searchParam.trim();
      whereClause.OR = [
        { cpNo: { contains: q, mode: 'insensitive' } },
        { subject: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
      ];
    }

    // ★ 정렬 (화이트리스트)
    const SORTABLE_FIELDS = ['createdAt', 'updatedAt', 'cpNo', 'subject', 'customerName', 'processResponsibility', 'cpResponsibleName', 'confidentialityLevel'];
    const resolvedSortField = sortFieldParam && SORTABLE_FIELDS.includes(sortFieldParam) ? sortFieldParam : 'createdAt';
    const resolvedSortOrder = sortOrderParam === 'asc' ? 'asc' : 'desc';

    const selectFields = {
      id: true,
      cpNo: true,
      fmeaId: true,
      fmeaNo: true,
      parentApqpNo: true,  // ★ 상위 APQP
      parentCpId: true,    // ★ 상위 CP
      linkedPfdNo: true,   // ★★★ 연동 PFD (DB 필드 직접 조회)
      customerName: true,
      modelYear: true,
      subject: true,
      cpType: true,
      confidentialityLevel: true,
      cpStartDate: true,
      cpRevisionDate: true,
      processResponsibility: true,
      cpResponsibleName: true,
      // Family CP 필드
      familyGroupId: true,
      variantNo: true,
      variantLabel: true,
      isBaseVariant: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      _count: {
        select: {
          cftMembers: true,
          processes: true,
        },
      },
    };

    // ★ 페이지네이션 모드 (page 파라미터 존재 시)
    if (pageParam) {
      const PAGE_SIZE = sizeParam ? Math.min(Math.max(parseInt(sizeParam, 10) || 50, 1), 200) : 50;
      const currentPage = Math.max(parseInt(pageParam, 10) || 1, 1);

      const [totalCount, cps] = await Promise.all([
        prisma.cpRegistration.count({ where: whereClause }),
        prisma.cpRegistration.findMany({
          where: whereClause,
          orderBy: { [resolvedSortField]: resolvedSortOrder },
          skip: (currentPage - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          select: selectFields,
        }),
      ]);

      const totalPages = Math.ceil(totalCount / PAGE_SIZE);

      // ★★★ ProjectLinkage(중앙 연동DB)에서 연동 PFD 조회 ★★★
      const cpNos = cps.map(cp => cp.cpNo);
      const linkageMap = new Map<string, string>();

      try {
        const linkages = await (prisma as any).projectLinkage.findMany({
          where: { cpNo: { in: cpNos }, status: 'active' },
          select: { cpNo: true, pfdNo: true },
        });
        linkages.forEach((l: { cpNo?: string; pfdNo?: string }) => {
          if (l.cpNo && l.pfdNo) linkageMap.set(l.cpNo.toLowerCase(), l.pfdNo);
        });
      } catch (e) {
        console.error('[CP API] ProjectLinkage 목록 조회 오류:', e);
      }

      const cpsWithLinkage = cps.map(cp => ({
        ...cp,
        linkedPfdNo: (cp as any).linkedPfdNo || linkageMap.get(cp.cpNo?.toLowerCase() || '') || null,
      }));

      return NextResponse.json({
        success: true,
        data: cpsWithLinkage,
        pagination: {
          page: currentPage,
          pageSize: PAGE_SIZE,
          totalCount,
          totalPages,
        },
      });
    }

    // ★ 레거시 모드 (page 파라미터 없음 — 하위 호환)
    const cps = await prisma.cpRegistration.findMany({
      where: whereClause,
      orderBy: { [resolvedSortField]: resolvedSortOrder },
      select: selectFields,
    });

    // ★★★ ProjectLinkage(중앙 연동DB)에서 연동 PFD 조회 ★★★
    const cpNos = cps.map(cp => cp.cpNo);
    const linkageMap = new Map<string, string>();

    try {
      const linkages = await (prisma as any).projectLinkage.findMany({
        where: {
          cpNo: { in: cpNos },
          status: 'active',
        },
        select: {
          cpNo: true,
          pfdNo: true,
        },
      });

      linkages.forEach((l: { cpNo?: string; pfdNo?: string }) => {
        if (l.cpNo && l.pfdNo) {
          linkageMap.set(l.cpNo.toLowerCase(), l.pfdNo);
        }
      });
    } catch (e) {
      console.error('[CP API] ProjectLinkage 목록 조회 오류:', e);
    }

    // DB 필드 + ProjectLinkage 병합 (둘 중 하나라도 있으면 표시)
    const cpsWithLinkage = cps.map(cp => ({
      ...cp,
      linkedPfdNo: (cp as any).linkedPfdNo || linkageMap.get(cp.cpNo?.toLowerCase() || '') || null,
    }));

    return NextResponse.json({
      success: true,
      count: cpsWithLinkage.length,
      data: cpsWithLinkage,
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
    const cpNoParam = searchParams.get('cpNo');
    const id = searchParams.get('id');

    if (!cpNoParam && !id) {
      return NextResponse.json(
        { success: false, error: 'cpNo or id is required' },
        { status: 400 }
      );
    }

    // ★ 대소문자 무관 검색을 위해 findFirst 사용
    let targetRecord;
    if (cpNoParam) {
      // cpNo로 검색 (대소문자 무관)
      targetRecord = await prisma.cpRegistration.findFirst({
        where: {
          cpNo: {
            equals: cpNoParam,
            mode: 'insensitive'  // 대소문자 무관
          }
        }
      });
    } else {
      // id로 검색
      targetRecord = await prisma.cpRegistration.findUnique({
        where: { id: id! }
      });
    }

    if (!targetRecord) {
      return NextResponse.json(
        { success: false, error: `CP를 찾을 수 없습니다: ${cpNoParam || id}` },
        { status: 404 }
      );
    }

    // ★ Soft Delete (deletedAt 설정)
    const deleted = await prisma.cpRegistration.update({
      where: { id: targetRecord.id },
      data: { deletedAt: new Date() }
    });


    return NextResponse.json({
      success: true,
      message: `CP ${deleted.cpNo} 삭제 완료`,
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

// ============================================================================
// PATCH: CP 복원 (휴지통 → 활성)
// ============================================================================
export async function PATCH(request: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { action, cpNo } = body;

    if (!cpNo || !['restore', 'softDelete'].includes(action)) {
      return NextResponse.json({ success: false, error: 'action=(restore|softDelete) and cpNo required' }, { status: 400 });
    }

    const cpNoLower = cpNo.toLowerCase();

    if (action === 'restore') {
      // 1) CP 복원 (deletedAt → null)
      const restored = await prisma.cpRegistration.updateMany({
        where: {
          cpNo: { equals: cpNoLower, mode: 'insensitive' },
          deletedAt: { not: null },
        },
        data: { deletedAt: null },
      });

      if (restored.count === 0) {
        return NextResponse.json({ success: false, error: `CP ${cpNo} not found in trash` }, { status: 404 });
      }

      // 2) ProjectLinkage 복원 (status → active)
      try {
        await (prisma as any).projectLinkage.updateMany({
          where: { cpNo: { equals: cpNoLower, mode: 'insensitive' }, status: 'deleted' },
          data: { status: 'active' },
        });
      } catch (e) {
        console.error('[CP 복원] ProjectLinkage 복원 실패:', e);
      }

      return NextResponse.json({
        success: true,
        message: `CP ${cpNo} 복원 완료(Restored)`,
        cpNo: cpNoLower,
      });
    }

    // action === 'softDelete'
    const softDeleted = await prisma.cpRegistration.updateMany({
      where: {
        cpNo: { equals: cpNoLower, mode: 'insensitive' },
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });

    if (softDeleted.count === 0) {
      return NextResponse.json({ success: false, error: `CP ${cpNo} not found` }, { status: 404 });
    }

    // ProjectLinkage status → deleted
    try {
      await (prisma as any).projectLinkage.updateMany({
        where: { cpNo: { equals: cpNoLower, mode: 'insensitive' }, status: 'active' },
        data: { status: 'deleted' },
      });
    } catch (e) {
      console.error('[CP softDelete] ProjectLinkage 상태 변경 실패:', e);
    }

    return NextResponse.json({
      success: true,
      message: `CP ${cpNo} 삭제 완료(Moved to trash)`,
      cpNo: cpNoLower,
    });
  } catch (error: any) {
    console.error('[CP API] 복원 오류:', error);
    return NextResponse.json({ success: false, error: error.message || 'CP 복원 실패' }, { status: 500 });
  }
}
