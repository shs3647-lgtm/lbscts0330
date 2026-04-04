/**
 * @file api/pfd/route.ts
 * @description PFD 목록 조회 및 생성 API
 * @module pfd/api
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getPrismaForPfd } from '@/lib/project-schema';
import { safeErrorMessage } from '@/lib/security';

// ============================================================================
// GET: PFD 목록 조회
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pfdNo = searchParams.get('pfdNo');

    // 필터 파라미터 복구
    // ★★★ 2026-02-05: fmeaId 소문자 정규화 ★★★
    const fmeaId = searchParams.get('fmeaId')?.toLowerCase() || null;
    const cpNo = searchParams.get('cpNo')?.toLowerCase() || null;
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // ★ 단건 상세 조회 (등록화면 로드용)
    if (pfdNo) {
      // ★ 대소문자 불일치 해결: 정확히 일치하거나 소문자로 일치하는 경우 모두 검색
      const pfdNoLower = pfdNo.toLowerCase();
      const pfd = await prisma.pfdRegistration.findFirst({
        where: {
          OR: [
            { pfdNo: pfdNo },
            { pfdNo: pfdNoLower },
          ],
          deletedAt: null,
        },
      });

      if (pfd) {

        // ★★★ ProjectLinkage에서 공통 데이터 가져오기 (통합 DB 우선!) ★★★
        let linkageData: any = null;
        try {
          const linkage = await (prisma as any).projectLinkage.findFirst({
            where: {
              OR: [
                { pfdNo: pfdNoLower },
                { cpNo: pfd.cpNo?.toLowerCase() },
                { apqpNo: pfd.apqpProjectId?.toLowerCase() },
              ].filter(cond => Object.values(cond)[0] != null), // null 필터링
              status: 'active'
            }
          });
          if (linkage) {
            linkageData = linkage;
          }
        } catch (e) {
        }

        // ★★★ 공통 데이터 병합: ProjectLinkage 우선, PFD 폴백 ★★★
        const mergedData = {
          ...pfd,
          customerName: linkageData?.customerName || pfd.customerName || '',
          companyName: linkageData?.companyName || pfd.companyName || '',
          modelYear: linkageData?.modelYear || pfd.modelYear || '',
          partNo: linkageData?.partNo || pfd.partNo || '',
          partName: linkageData?.subject?.split('+')[0] || pfd.partName || '',
          subject: linkageData?.subject || pfd.subject || '',
          engineeringLocation: linkageData?.engineeringLocation || pfd.engineeringLocation || '',
          processOwner: linkageData?.processResponsibility || pfd.processOwner || '',
          // ★ 사용자 정보 필드 추가
          pfdResponsibleName: linkageData?.responsibleName || pfd.pfdResponsibleName || '',
          processResponsibility: linkageData?.processResponsibility || pfd.processResponsibility || '',
        };

        return NextResponse.json({ success: true, data: mergedData });
      } else {
        return NextResponse.json(
          { success: false, error: '해당 PFD를 찾을 수 없습니다' },
          { status: 404 }
        );
      }
    }

    // ★ includeDeleted: 휴지통 모드 (삭제된 항목 포함)
    const includeDeleted = searchParams.get('includeDeleted') === 'true';

    // 필터 조건 구성
    const where: any = includeDeleted ? {} : { deletedAt: null };

    if (fmeaId) where.fmeaId = fmeaId;
    if (cpNo) where.cpNo = cpNo;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { pfdNo: { contains: search, mode: 'insensitive' } },
        { partName: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
      ];
    }

    // ✅ 2026-01-26: 최신 PFD 1건 조회 기능 추가
    const isLatest = searchParams.get('latest') === 'true';
    if (isLatest) {
      const latestPfd = await prisma.pfdRegistration.findFirst({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
      if (!latestPfd) return NextResponse.json({ success: false, message: 'No PFD found' });
      return NextResponse.json({ success: true, data: latestPfd });
    }

    // ★★★ 서버사이드 페이지네이션 파라미터 ★★★
    const pageParam = searchParams.get('page');
    const sizeParam = searchParams.get('size');
    const sortFieldParam = searchParams.get('sortField') || 'createdAt';
    const sortOrderParam = searchParams.get('sortOrder') || 'desc';

    // 정렬 필드 매핑 (허용된 필드만)
    const SORTABLE_FIELDS: Record<string, string> = {
      createdAt: 'createdAt', updatedAt: 'updatedAt', pfdNo: 'pfdNo',
      subject: 'subject', customerName: 'customerName',
      confidentialityLevel: 'confidentialityLevel',
      processResponsibility: 'processResponsibility',
      pfdResponsibleName: 'pfdResponsibleName',
      pfdStartDate: 'pfdStartDate', pfdRevisionDate: 'pfdRevisionDate',
      revisionNo: 'revisionNo', step: 'step',
    };
    const sortField = SORTABLE_FIELDS[sortFieldParam] || 'createdAt';
    const sortOrder = sortOrderParam === 'asc' ? 'asc' as const : 'desc' as const;

    // 페이지네이션 모드 (page 파라미터가 있으면 페이지네이션)
    const isPaginated = !!pageParam;
    const page = Math.max(1, parseInt(pageParam || '1', 10));
    const pageSize = Math.min(200, Math.max(10, parseInt(sizeParam || '50', 10)));

    // 전체 카운트 (페이지네이션 모드일 때만)
    let totalCount = 0;
    if (isPaginated) {
      totalCount = await prisma.pfdRegistration.count({ where });
    }

    // PFD 목록 조회 (페이지네이션 적용)
    const pfds = await prisma.pfdRegistration.findMany({
      where,
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: { [sortField]: sortOrder },
      ...(isPaginated ? { skip: (page - 1) * pageSize, take: pageSize } : {}),
    });

    // ★★★ ProjectLinkage(중앙 연동DB)에서 연동 CP 조회 ★★★
    const pfdNos = pfds.map((pfd: any) => pfd.pfdNo);
    const linkageMap = new Map<string, string[]>();

    try {
      const linkages = await (prisma as any).projectLinkage.findMany({
        where: {
          pfdNo: { in: pfdNos },
          status: 'active',
        },
        select: {
          pfdNo: true,
          cpNo: true,
        },
      });

      linkages.forEach((l: { pfdNo?: string; cpNo?: string }) => {
        if (l.pfdNo && l.cpNo) {
          const key = l.pfdNo.toLowerCase();
          if (!linkageMap.has(key)) {
            linkageMap.set(key, []);
          }
          linkageMap.get(key)!.push(l.cpNo);
        }
      });
    } catch (e) {
      console.error('[PFD API] ProjectLinkage 조회 실패:', e);
    }

    // DB 필드 + ProjectLinkage 병합
    const mappedData = pfds.map((pfd: any) => {
      // DB에서 linkedCpNos 파싱 (JSON string → array)
      let dbLinkedCpNos: string[] = [];
      if (pfd.linkedCpNos) {
        try {
          dbLinkedCpNos = JSON.parse(pfd.linkedCpNos);
        } catch {
          dbLinkedCpNos = [pfd.linkedCpNos];
        }
      }

      // ProjectLinkage에서 가져온 연동 정보
      const linkageCpNos = linkageMap.get(pfd.pfdNo?.toLowerCase() || '') || [];

      // 병합 (중복 제거)
      const allCpNos = [...new Set([...dbLinkedCpNos, ...linkageCpNos])];

      return {
        ...pfd,
        itemCount: pfd._count.items,
        linkedCpNos: allCpNos,  // ★ DB + ProjectLinkage 병합
      };
    });

    // 페이지네이션 응답 vs 전체 응답
    if (isPaginated) {
      return NextResponse.json({
        success: true,
        data: mappedData,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: mappedData,
    });

  } catch (error: any) {
    console.error('[API] PFD 목록 조회 실패:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}

// POST: PFD 생성 또는 업데이트 (upsert)
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ★ 등록화면에서 보내는 구조 처리
    const {
      pfdNo,
      pfdInfo,  // 등록화면은 pfdInfo 객체로 감싸서 보냄
      parentFmeaId, // 등록화면 필드명
      linkedCpNo,   // 등록화면 필드명
      parentApqpNo, // 등록화면 필드명
      linkedCpNos,  // 연동 CP 목록 (JSON array)
      cftMembers,   // ★ CFT 멤버 추가
      // 직접 전달하는 필드 (기존 호환성)
      fmeaId,
      cpNo,
      apqpProjectId,
      partName,
      partNo,
      subject,
      customerName,
      modelYear,
      companyName,
      processOwner,
      createdBy,
    } = body;

    // 필수 필드 검증
    if (!pfdNo) {
      return NextResponse.json(
        { success: false, error: 'PFD 번호는 필수입니다' },
        { status: 400 }
      );
    }

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // ★ 데이터 정규화: 등록화면 구조와 직접 전달 모두 처리
    const finalData = {
      pfdNo,
      subject: pfdInfo?.subject || subject,
      customerName: pfdInfo?.customerName || customerName,
      modelYear: pfdInfo?.modelYear || modelYear,
      companyName: pfdInfo?.companyName || companyName,
      partName: pfdInfo?.partName || partName,
      partNo: pfdInfo?.partNo || partNo,
      // 구버전 호환
      processOwner: pfdInfo?.processResponsibility || processOwner,
      createdBy: pfdInfo?.pfdResponsibleName || createdBy,
      // ★ 등록화면 새 필드
      processResponsibility: pfdInfo?.processResponsibility,
      pfdResponsibleName: pfdInfo?.pfdResponsibleName,
      pfdStartDate: pfdInfo?.pfdStartDate,
      pfdRevisionDate: pfdInfo?.pfdRevisionDate,
      engineeringLocation: pfdInfo?.engineeringLocation,
      confidentialityLevel: pfdInfo?.confidentialityLevel,  // PFD 종류
      securityLevel: pfdInfo?.securityLevel,  // ★ 기밀수준 추가
      // 연결 정보
      fmeaId: parentFmeaId || fmeaId,
      cpNo: linkedCpNo || cpNo,
      apqpProjectId: parentApqpNo || apqpProjectId,
      // ★ 연동 CP 목록
      linkedCpNos: linkedCpNos ? (typeof linkedCpNos === 'string' ? linkedCpNos : JSON.stringify(linkedCpNos)) : undefined,
      // ★ CFT 멤버
      cftMembers: cftMembers ? (typeof cftMembers === 'string' ? cftMembers : JSON.stringify(cftMembers)) : undefined,
      status: 'draft',
    };

    // ★ 기존 PFD 확인
    const existing = await prisma.pfdRegistration.findUnique({
      where: { pfdNo },
    });

    let pfd;
    if (existing) {
      // 업데이트
      pfd = await prisma.pfdRegistration.update({
        where: { pfdNo },
        data: {
          subject: finalData.subject,
          customerName: finalData.customerName,
          modelYear: finalData.modelYear,
          companyName: finalData.companyName,
          partName: finalData.partName,
          partNo: finalData.partNo,
          processOwner: finalData.processOwner,
          createdBy: finalData.createdBy,
          processResponsibility: finalData.processResponsibility,
          pfdResponsibleName: finalData.pfdResponsibleName,
          pfdStartDate: finalData.pfdStartDate,
          pfdRevisionDate: finalData.pfdRevisionDate,
          engineeringLocation: finalData.engineeringLocation,
          confidentialityLevel: finalData.confidentialityLevel,
          securityLevel: finalData.securityLevel,
          fmeaId: finalData.fmeaId,
          cpNo: finalData.cpNo,
          apqpProjectId: finalData.apqpProjectId,
          linkedCpNos: finalData.linkedCpNos,
          cftMembers: finalData.cftMembers,
        },
      });
    } else {
      // 생성
      pfd = await prisma.pfdRegistration.create({
        data: {
          pfdNo: finalData.pfdNo,
          subject: finalData.subject,
          customerName: finalData.customerName,
          modelYear: finalData.modelYear,
          companyName: finalData.companyName,
          partName: finalData.partName,
          partNo: finalData.partNo,
          processOwner: finalData.processOwner,
          createdBy: finalData.createdBy,
          processResponsibility: finalData.processResponsibility,
          pfdResponsibleName: finalData.pfdResponsibleName,
          pfdStartDate: finalData.pfdStartDate,
          pfdRevisionDate: finalData.pfdRevisionDate,
          engineeringLocation: finalData.engineeringLocation,
          confidentialityLevel: finalData.confidentialityLevel,
          securityLevel: finalData.securityLevel,
          fmeaId: finalData.fmeaId,
          cpNo: finalData.cpNo,
          apqpProjectId: finalData.apqpProjectId,
          linkedCpNos: finalData.linkedCpNos,
          cftMembers: finalData.cftMembers,
          status: finalData.status,
        },
      });
    }

    // 문서 연결 생성/업데이트 (FMEA 연결 시)
    if (finalData.fmeaId) {
      await prisma.documentLink.upsert({
        where: {
          sourceType_sourceId_targetType_targetId: {
            sourceType: 'pfd',
            sourceId: pfd.id,
            targetType: 'fmea',
            targetId: finalData.fmeaId,
          },
        },
        update: {},
        create: {
          sourceType: 'pfd',
          sourceId: pfd.id,
          targetType: 'fmea',
          targetId: finalData.fmeaId,
          linkType: 'synced_with',
          syncPolicy: 'manual',
        },
      });
    }

    // 문서 연결 생성/업데이트 (CP 연결 시)
    if (finalData.cpNo) {
      await prisma.documentLink.upsert({
        where: {
          sourceType_sourceId_targetType_targetId: {
            sourceType: 'pfd',
            sourceId: pfd.id,
            targetType: 'cp',
            targetId: finalData.cpNo,
          },
        },
        update: {},
        create: {
          sourceType: 'pfd',
          sourceId: pfd.id,
          targetType: 'cp',
          targetId: finalData.cpNo,
          linkType: 'synced_with',
          syncPolicy: 'manual',
        },
      });
    }

    // ★★★ ProjectLinkage에 연동 정보 + 공통 데이터 저장 ★★★
    // 원칙: 모든 공통 데이터는 ProjectLinkage에 저장, 연동 앱들이 여기서 가져감
    try {
      const apqpNo = finalData.apqpProjectId?.toLowerCase();
      const pfdNoLower = pfdNo.toLowerCase();

      // ★ subject 형식: 품명+생산공정
      const partNameValue = finalData.partName || finalData.subject || '품명';
      const unifiedSubject = `${partNameValue}+생산공정`;

      // 1차: apqpNo로 기존 레코드 찾기 (APQP에서 생성한 연동)
      let existingLinkage = null;
      if (apqpNo) {
        existingLinkage = await (prisma as any).projectLinkage.findFirst({
          where: { apqpNo: apqpNo, status: 'active' }
        });
      }

      // 2차: pfdNo로 기존 레코드 찾기
      if (!existingLinkage) {
        existingLinkage = await (prisma as any).projectLinkage.findFirst({
          where: { pfdNo: pfdNoLower, status: 'active' }
        });
      }

      // ★★★ 공통 데이터 (연동 앱들이 공유) ★★★
      const commonData = {
        pfdNo: pfdNoLower,
        cpNo: finalData.cpNo?.toLowerCase() || existingLinkage?.cpNo || null,
        pfmeaId: finalData.fmeaId?.toLowerCase() || existingLinkage?.pfmeaId || null,
        // ★ 모든 공통 데이터
        subject: unifiedSubject,
        projectName: unifiedSubject,
        customerName: finalData.customerName || existingLinkage?.customerName || '',
        companyName: finalData.companyName || existingLinkage?.companyName || '',
        modelYear: finalData.modelYear || existingLinkage?.modelYear || '',
        partNo: finalData.partNo || existingLinkage?.partNo || '',
        engineeringLocation: finalData.engineeringLocation || existingLinkage?.engineeringLocation || '',
        processResponsibility: finalData.processOwner || existingLinkage?.processResponsibility || '',  // ★ 공정책임 추가
        responsibleName: finalData.pfdResponsibleName || existingLinkage?.responsibleName || '',
        startDate: finalData.pfdStartDate || existingLinkage?.startDate || '',
        revisionDate: finalData.pfdRevisionDate || existingLinkage?.revisionDate || '',
      };

      if (existingLinkage) {
        // 기존 레코드 업데이트 (APQP 연동 정보는 유지)
        await (prisma as any).projectLinkage.update({
          where: { id: existingLinkage.id },
          data: commonData,
        });
      } else {
        // 연동 레코드 신규 생성
        await (prisma as any).projectLinkage.create({
          data: {
            ...commonData,
            apqpNo: apqpNo || null,
            linkType: 'auto',
            status: 'active',
          },
        });
      }
    } catch (e) {
    }

    return NextResponse.json({
      success: true,
      data: pfd,
      message: existing ? 'PFD 업데이트 완료' : 'PFD 생성 완료',
    });

  } catch (error: any) {
    console.error('[API] PFD 저장 실패:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE: PFD 삭제
// ============================================================================

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pfdNo = searchParams.get('pfdNo');

    if (!pfdNo) {
      return NextResponse.json(
        { success: false, error: 'pfdNo는 필수입니다' },
        { status: 400 }
      );
    }

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // ★ 대소문자 무시 검색 (case-insensitive)
    const existing = await prisma.pfdRegistration.findFirst({
      where: {
        pfdNo: { equals: pfdNo, mode: 'insensitive' }
      }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '존재하지 않는 PFD입니다' },
        { status: 404 }
      );
    }

    // ★ 프로젝트 스키마에서 pfdItem/pfdMasterDataset 삭제 (Rule 19)
    const projPrisma = await getPrismaForPfd(existing.pfdNo);
    if (!projPrisma) {
      console.error('[PFD DELETE] Project schema unavailable for pfdNo:', existing.pfdNo);
    } else {
      try {
        await projPrisma.pfdItem.deleteMany({
          where: { pfdId: existing.id },
        });
      } catch { /* 프로젝트 스키마에 pfdItem 없으면 무시 */ }

      try {
        await projPrisma.pfdMasterDataset.deleteMany({
          where: { pfdNo: { equals: existing.pfdNo, mode: 'insensitive' } },
        });
      } catch { /* 프로젝트 스키마에 pfdMasterDataset 없으면 무시 */ }
    }

    // ★ 트랜잭션으로 public 메타데이터 삭제 — 원자성 보장
    await prisma.$transaction(async (tx: any) => {
      // 1. 연관된 DocumentLink 삭제 (public)
      await tx.documentLink.deleteMany({
        where: {
          OR: [
            { sourceId: existing.id, sourceType: 'pfd' },
            { targetId: existing.pfdNo, targetType: 'pfd' },
          ],
        },
      });

      // 2. PfmeaPfdMapping 삭제 (public)
      try {
        await tx.pfmeaPfdMapping.deleteMany({
          where: { pfdNo: { equals: existing.pfdNo, mode: 'insensitive' } },
        });
      } catch { /* 테이블 미존재 시 무시 */ }

      // 3. ProjectLinkage 정리 (pfdNo만 null 처리, public)
      try {
        await tx.projectLinkage.updateMany({
          where: { pfdNo: { equals: existing.pfdNo, mode: 'insensitive' } },
          data: { pfdNo: null },
        });
      } catch { /* 테이블 미존재 시 무시 */ }

      // 4. PFD 등록 삭제 (public)
      await tx.pfdRegistration.delete({
        where: { pfdNo: existing.pfdNo },
      });
    });


    return NextResponse.json({
      success: true,
      message: `PFD ${pfdNo} 삭제 완료`,
    });

  } catch (error: any) {
    console.error('[API] PFD 삭제 실패:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH: PFD 복원 (휴지통 → 활성) 또는 Soft Delete
// ============================================================================
export async function PATCH(req: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    const body = await req.json();
    const { action, pfdNo } = body;

    if (!pfdNo) {
      return NextResponse.json({ success: false, error: 'pfdNo required' }, { status: 400 });
    }

    const pfdNoLower = pfdNo.toLowerCase();

    if (action === 'restore') {
      // 복원: deletedAt → null
      const restored = await prisma.pfdRegistration.updateMany({
        where: {
          pfdNo: { equals: pfdNoLower, mode: 'insensitive' },
          deletedAt: { not: null },
        },
        data: { deletedAt: null },
      });

      if (restored.count === 0) {
        return NextResponse.json({ success: false, error: `PFD ${pfdNo} not found in trash` }, { status: 404 });
      }

      // ProjectLinkage 복원
      try {
        await (prisma as any).projectLinkage.updateMany({
          where: { pfdNo: { equals: pfdNoLower, mode: 'insensitive' }, status: 'deleted' },
          data: { status: 'active' },
        });
      } catch (e) {
        console.error('[PFD 복원] ProjectLinkage 복원 실패:', e);
      }

      return NextResponse.json({
        success: true,
        message: `PFD ${pfdNo} 복원 완료(Restored)`,
        pfdNo: pfdNoLower,
      });
    }

    if (action === 'softDelete') {
      // Soft Delete: deletedAt 설정 (휴지통으로 이동)
      const deleted = await prisma.pfdRegistration.updateMany({
        where: {
          pfdNo: { equals: pfdNoLower, mode: 'insensitive' },
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });

      if (deleted.count === 0) {
        return NextResponse.json({ success: false, error: `PFD ${pfdNo} not found` }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: `PFD ${pfdNo} 삭제 완료(Moved to trash)`,
        pfdNo: pfdNoLower,
      });
    }

    return NextResponse.json({ success: false, error: 'action must be restore or softDelete' }, { status: 400 });
  } catch (error: any) {
    console.error('[PFD API] PATCH 오류:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}

