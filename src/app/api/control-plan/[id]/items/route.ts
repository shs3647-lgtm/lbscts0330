/**
 * @file items/route.ts
 * @description Control Plan Items CRUD API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getPrismaForCp } from '@/lib/project-schema';
import { syncCPItemToUnified } from '@/lib/unified-sync';
import { validateCrossSchemaRefs } from '@/lib/validate-cross-refs';

// GET: CP Items 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const publicPrisma = getPrisma();
    if (!publicPrisma) {
      return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });
    }

    const { id } = await params;

    // ★ cpNo 결정을 위해 먼저 public에서 CpRegistration 조회
    let resolvedCpNo: string | null = null;

    // ★★★ 1단계: 프로젝트 스키마에서 ControlPlan 조회 ★★★
    // cpNo 후보: id 자체가 cpNo일 수 있으므로 먼저 시도
    let projPrisma = await getPrismaForCp(id);
    let cp = projPrisma ? await projPrisma.controlPlan.findFirst({
      where: { OR: [{ id }, { cpNo: id }] },
    }) : null;
    if (cp) resolvedCpNo = cp.cpNo;

    // ★★★ 2단계: ControlPlan이 없으면 CpRegistration에서 조회 (APQP에서 생성한 CP) ★★★
    let cpRegistration = null;
    if (!cp) {
      cpRegistration = await publicPrisma.cpRegistration.findFirst({
        where: { OR: [{ id }, { cpNo: id }] },
      });

      if (cpRegistration) {
        resolvedCpNo = cpRegistration.cpNo;

        // ★★★ 3단계: CpRegistration의 fmeaId로 ControlPlan 추가 검색 ★★★
        // (FMEA→CP 연동 시 다른 cpNo로 ControlPlan이 생성될 수 있음)
        if (cpRegistration.fmeaId) {
          projPrisma = await getPrismaForCp(cpRegistration.cpNo);
          if (projPrisma) {
            cp = await projPrisma.controlPlan.findFirst({
              where: { fmeaId: cpRegistration.fmeaId },
            });
          }
          if (cp) {
            resolvedCpNo = cp.cpNo;
            // cp를 찾았으므로 아래 items 조회 로직으로 진행 (return하지 않음)
          }
        }

        // ControlPlan을 못 찾은 경우에만 빈 items 반환
        if (!cp) {
          return NextResponse.json({
            success: true,
            data: [],  // items가 없음
            cp: {
              id: cpRegistration.id,
              cpNo: cpRegistration.cpNo,
              fmeaId: cpRegistration.fmeaId,
              fmeaNo: cpRegistration.fmeaNo,
              linkedPfmeaNo: cpRegistration.fmeaId,  // ★ APQP에서 저장된 PFMEA 연동 ID
              linkedPfdNo: (cpRegistration as any).linkedPfdNo,  // ★ PFD 연동 ID
              partName: cpRegistration.subject,
              partNo: '',
              customer: cpRegistration.customerName,
              partNameMode: (cpRegistration as any).partNameMode || 'A',  // ★ 부품명 모드
              status: cpRegistration.status || 'draft',  // ★ 확정/승인 상태
            }
          });
        }
      }
    }

    if (!cp && !cpRegistration) {
      return NextResponse.json({ success: false, error: 'CP를 찾을 수 없습니다' }, { status: 404 });
    }

    // ★ 프로젝트 스키마 Prisma로 Atomic DB 조회
    const cpPrisma = projPrisma || await getPrismaForCp(resolvedCpNo || id);
    if (!cpPrisma) {
      return NextResponse.json({ success: false, error: 'CP 프로젝트 스키마 연결 실패' }, { status: 500 });
    }

    const items = await cpPrisma.controlPlanItem.findMany({
      where: {
        cpId: cp!.id,
        linkStatus: { not: 'unlinked' },  // ★ unlinked 제외
        processNo: { not: '' },  // ★ 빈 공정번호 제외
      },
      orderBy: { sortOrder: 'asc' },
    });

    // ★ CpRegistration에서 partNameMode 조회 (public 스키마 — 메타데이터)
    let partNameMode = 'A';
    try {
      const cpReg = await publicPrisma.cpRegistration.findFirst({
        where: { cpNo: cp!.cpNo },
        select: { partNameMode: true },
      });
      if (cpReg?.partNameMode) partNameMode = cpReg.partNameMode;
    } catch { /* ignore */ }

    // ★ CpRegistration에서 status 조회 (public 스키마 — 메타데이터)
    let cpStatus = 'draft';
    try {
      const cpRegStatus = await publicPrisma.cpRegistration.findFirst({
        where: { cpNo: cp!.cpNo },
        select: { status: true },
      });
      if (cpRegStatus?.status) cpStatus = cpRegStatus.status;
    } catch { /* ignore */ }

    // ★ linkedPfdNo 역방향 조회: DB에 null이면 PFD에서 이 cpNo를 linkedCpNos에 가진 PFD 검색
    let effectiveLinkedPfdNo = cp!.linkedPfdNo || null;
    if (!effectiveLinkedPfdNo) {
      try {
        const pfdWithCp = await publicPrisma.pfdRegistration.findFirst({
          where: {
            deletedAt: null,
            OR: [
              { cpNo: cp!.cpNo },
              { linkedCpNos: { contains: cp!.cpNo } },
            ],
          },
          select: { pfdNo: true },
          orderBy: { updatedAt: 'desc' },
        });
        if (pfdWithCp) effectiveLinkedPfdNo = pfdWithCp.pfdNo;
      } catch { /* PFD 역방향 조회 실패 — 무시 */ }
    }

    // CP 헤더 정보도 함께 반환 (fmeaId 및 연동 ID 포함)
    return NextResponse.json({
      success: true,
      data: items,
      cp: {
        id: cp!.id,
        cpNo: cp!.cpNo,
        fmeaId: cp!.fmeaId,
        fmeaNo: cp!.fmeaNo,
        linkedPfmeaNo: cp!.linkedPfmeaNo,  // ★ APQP에서 저장된 PFMEA 연동 ID
        linkedPfdNo: effectiveLinkedPfdNo,  // ★ PFD 연동 ID (역방향 조회 포함)
        partName: cp!.partName,
        partNo: cp!.partNo,
        customer: cp!.customer,
        partNameMode,  // ★ 부품명 모드
        status: cpStatus,  // ★ 확정/승인 상태
      }
    });
  } catch (error) {
    console.error('CP Items 조회 오류:', error);
    return NextResponse.json({ success: false, error: 'CP Items 조회 실패' }, { status: 500 });
  }
}

// PUT: CP Items 일괄 저장 (upsert)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const publicPrisma = getPrisma();
    if (!publicPrisma) {
      return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });
    }

    const { id } = await params;
    const { items } = await request.json();

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ success: false, error: 'items 배열이 필요합니다' }, { status: 400 });
    }

    // ★ 프로젝트 스키마 Prisma 클라이언트 획득
    let cpPrisma = await getPrismaForCp(id);

    // ★★★ 1단계: 프로젝트 스키마에서 ControlPlan 조회 ★★★
    let cp = cpPrisma ? await cpPrisma.controlPlan.findFirst({
      where: { OR: [{ id }, { cpNo: id }] },
    }) : null;

    // ★★★ 2단계: ControlPlan이 없으면 CpRegistration에서 조회하고 ControlPlan 자동 생성 ★★★
    if (!cp) {
      const cpRegistration = await publicPrisma.cpRegistration.findFirst({
        where: { OR: [{ id }, { cpNo: id }] },
      });

      if (cpRegistration) {
        // cpNo 확정 후 프로젝트 스키마 재획득
        if (!cpPrisma) cpPrisma = await getPrismaForCp(cpRegistration.cpNo);
        if (!cpPrisma) {
          return NextResponse.json({ success: false, error: 'CP 프로젝트 스키마 연결 실패' }, { status: 500 });
        }
        // CpRegistration 정보로 ControlPlan 레코드 생성 (프로젝트 스키마)
        cp = await cpPrisma.controlPlan.create({
          data: {
            cpNo: cpRegistration.cpNo,
            fmeaId: cpRegistration.fmeaId || '',
            fmeaNo: cpRegistration.fmeaNo,
            projectName: cpRegistration.subject || '',
            partName: cpRegistration.subject || '',
            customer: cpRegistration.customerName || '',
            preparedBy: cpRegistration.cpResponsibleName || '',
            status: 'draft',
            syncStatus: 'new',
          },
        });
      }
    }

    if (!cp) {
      return NextResponse.json({ success: false, error: 'CP를 찾을 수 없습니다' }, { status: 404 });
    }

    if (!cpPrisma) {
      return NextResponse.json({ success: false, error: 'CP 프로젝트 스키마 연결 실패' }, { status: 500 });
    }

    // ★★★ Write-time cross-ref 검증 (TODO-04) ★★★
    const refsToValidate = items
      .filter((item: any) => item.pfmeaProcessId || item.pfmeaWorkElemId)
      .map((item: any, i: number) => ({
        sourceModel: 'CpAtomicProcess' as const,
        sourceId: `new-cp-item-${i}`,
        fmeaL2Id: item.pfmeaProcessId || null,
        fmeaL3Id: item.pfmeaWorkElemId || null,
      }));
    if (refsToValidate.length > 0) {
      const orphans = await validateCrossSchemaRefs(cpPrisma, refsToValidate);
      if (orphans.length > 0) {
        console.warn(`[CP Items] ${orphans.length}건 고아 FMEA 참조 감지 - 참조 해제 후 저장`);
        // CP는 PFD와 달리 고아 참조를 null로 자동 보정 (엄격한 차단대신)
        for (const orphan of orphans) {
          const item = items.find((_: any, idx: number) => `new-cp-item-${idx}` === orphan.sourceId);
          if (item) {
            if (orphan.field === 'fmeaL2Id') item.pfmeaProcessId = null;
            if (orphan.field === 'fmeaL3Id') item.pfmeaWorkElemId = null;
          }
        }
      }
    }

    // ★ 트랜잭션으로 deleteMany + create 원자성 보장 (프로젝트 스키마)
    const createdItems: any[] = [];

    await cpPrisma.$transaction(async (tx: any) => {
      // 기존 UPI ID 수집 (고아 방지용)
      const oldItems = await tx.controlPlanItem.findMany({
        where: { cpId: cp.id },
        select: { unifiedItemId: true },
      });
      const oldUpiIds = oldItems
        .map((i: any) => i.unifiedItemId)
        .filter(Boolean) as string[];

      // 기존 아이템 삭제 후 새로 생성
      await tx.controlPlanItem.deleteMany({
        where: { cpId: cp.id },
      });

      const newUpiIds: string[] = [];

      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];

        // 1단계: UnifiedProcessItem (종합 DB) — FMEA FK 포함
        const unifiedItem = await tx.unifiedProcessItem.create({
          data: {
            apqpNo: cp.fmeaId || null,
            processNo: item.processNo || '',
            processName: item.processName || '',
            processLevel: item.processLevel || 'Main',
            processDesc: item.processDesc || '',
            partName: item.partName || '',
            equipment: item.equipment || '',
            workElement: item.workElement || '',
            productChar: item.productChar || '',
            processChar: item.processChar || '',
            specialChar: item.specialChar || '',
            fmeaL2Id: item.pfmeaProcessId || null,
            fmeaL3Id: item.pfmeaWorkElemId || null,
            parentId: item.parentId || null,
            mergeGroupId: item.mergeGroupId || null,
            rowSpan: item.rowSpan || 1,
            sortOrder: idx,
          },
        });
        newUpiIds.push(unifiedItem.id);

        // 2단계: ControlPlanItem — FMEA FK 보존 (INV-INT-01)
        const cpItem = await tx.controlPlanItem.create({
          data: {
            cpId: cp.id,
            unifiedItemId: unifiedItem.id,
            processNo: item.processNo || '',
            processName: item.processName || '',
            processLevel: item.processLevel || 'Main',
            processDesc: item.processDesc || '',
            partName: item.partName || '',
            equipment: item.equipment || '',
            equipmentM4: item.equipmentM4 || null,
            workElement: item.workElement || '',
            detectorNo: item.detectorNo || false,
            detectorEp: item.detectorEp || false,
            detectorAuto: item.detectorAuto || false,
            epDeviceIds: item.epDeviceIds || null,
            autoDeviceIds: item.autoDeviceIds || null,
            productChar: item.productChar || '',
            processChar: item.processChar || '',
            specialChar: item.specialChar || '',
            charIndex: item.charIndex ?? idx,
            specTolerance: item.specTolerance || '',
            evalMethod: item.evalMethod || '',
            sampleSize: item.sampleSize || '',
            sampleFreq: item.sampleFreq || '',
            controlMethod: item.controlMethod || '',
            owner1: item.owner1 || '',
            owner2: item.owner2 || '',
            reactionPlan: item.reactionPlan || '',
            rowType: item.rowType || null,
            refSeverity: item.refSeverity || null,
            refOccurrence: item.refOccurrence || null,
            refDetection: item.refDetection || null,
            refAp: item.refAp || '',
            linkStatus: item.linkStatus || 'new',
            sortOrder: idx,
            pfmeaRowUid: item.pfmeaRowUid || null,
            pfmeaProcessId: item.pfmeaProcessId || null,
            pfmeaWorkElemId: item.pfmeaWorkElemId || null,
            productCharId: item.productCharId || null,
            processCharId: item.processCharId || null,
            linkId: item.linkId || null,
          },
        });

        createdItems.push(cpItem);
      }

      // 고아 UPI 삭제 (이전 저장의 UPI 중 새 저장에서 사용되지 않는 것)
      const orphanUpiIds = oldUpiIds.filter(id => !newUpiIds.includes(id));
      if (orphanUpiIds.length > 0) {
        // PFD에서 참조하지 않는 UPI만 삭제
        for (const upiId of orphanUpiIds) {
          const pfdRef = await tx.pfdItem.count({ where: { unifiedItemId: upiId } });
          if (pfdRef === 0) {
            await tx.unifiedProcessItem.delete({ where: { id: upiId } }).catch((e: unknown) => console.error('UPI delete error:', e));
          }
        }
      }

      // CP 업데이트 시간 갱신
      await tx.controlPlan.update({
        where: { id: cp.id },
        data: { syncStatus: 'modified' },
      });
    });


    return NextResponse.json({
      success: true,
      data: createdItems,
      count: createdItems.length,
    });
  } catch (error) {
    console.error('CP Items 저장 오류:', error);
    return NextResponse.json({ success: false, error: 'CP Items 저장 실패' }, { status: 500 });
  }
}

// POST: 단일 Item 추가
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const publicPrisma = getPrisma();
    if (!publicPrisma) {
      return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });
    }

    const { id } = await params;
    const item = await request.json();

    // ★ 프로젝트 스키마 Prisma 클라이언트 획득
    let cpPrisma = await getPrismaForCp(id);

    // ★★★ 1단계: 프로젝트 스키마에서 ControlPlan 조회 ★★★
    let cp = cpPrisma ? await cpPrisma.controlPlan.findFirst({
      where: { OR: [{ id }, { cpNo: id }] },
    }) : null;

    // ★★★ 2단계: ControlPlan이 없으면 CpRegistration에서 조회하고 ControlPlan 자동 생성 ★★★
    if (!cp) {
      const cpRegistration = await publicPrisma.cpRegistration.findFirst({
        where: { OR: [{ id }, { cpNo: id }] },
      });

      if (cpRegistration) {
        if (!cpPrisma) cpPrisma = await getPrismaForCp(cpRegistration.cpNo);
        if (!cpPrisma) {
          return NextResponse.json({ success: false, error: 'CP 프로젝트 스키마 연결 실패' }, { status: 500 });
        }
        cp = await cpPrisma.controlPlan.create({
          data: {
            cpNo: cpRegistration.cpNo,
            fmeaId: cpRegistration.fmeaId || '',
            fmeaNo: cpRegistration.fmeaNo,
            projectName: cpRegistration.subject || '',
            partName: cpRegistration.subject || '',
            customer: cpRegistration.customerName || '',
            preparedBy: cpRegistration.cpResponsibleName || '',
            status: 'draft',
            syncStatus: 'new',
          },
        });
      }
    }

    if (!cp) {
      return NextResponse.json({ success: false, error: 'CP를 찾을 수 없습니다' }, { status: 404 });
    }

    if (!cpPrisma) {
      return NextResponse.json({ success: false, error: 'CP 프로젝트 스키마 연결 실패' }, { status: 500 });
    }

    // 마지막 sortOrder 조회 (프로젝트 스키마)
    const lastItem = await cpPrisma.controlPlanItem.findFirst({
      where: { cpId: cp.id },
      orderBy: { sortOrder: 'desc' },
    });

    const newItem = await cpPrisma.controlPlanItem.create({
      data: {
        cpId: cp.id,
        processNo: item.processNo || '',
        processName: item.processName || '',
        processLevel: item.processLevel || 'Main',
        processDesc: item.processDesc || '',
        partName: item.partName || '',  // ✅ 부품명 추가
        equipment: item.equipment || '',  // ✅ 설비/금형/JIG
        workElement: item.workElement || '',  // PFMEA 작업요소 연동용
        detectorNo: item.detectorNo || false,
        detectorEp: item.detectorEp || false,
        detectorAuto: item.detectorAuto || false,
        epDeviceIds: item.epDeviceIds || null,
        autoDeviceIds: item.autoDeviceIds || null,
        productChar: item.productChar || '',  // 원자성: 한 셀에 하나만
        processChar: item.processChar || '',  // 원자성: 한 셀에 하나만
        specialChar: item.specialChar || '',
        charIndex: item.charIndex ?? (lastItem?.sortOrder || 0) + 1,  // ★ 원자성 인덱스
        specTolerance: item.specTolerance || '',
        evalMethod: item.evalMethod || '',
        sampleSize: item.sampleSize || '',
        sampleFreq: item.sampleFreq || '',
        controlMethod: item.controlMethod || '',
        owner1: item.owner1 || '',
        owner2: item.owner2 || '',
        reactionPlan: item.reactionPlan || '',
        refSeverity: item.refSeverity || null,
        refOccurrence: item.refOccurrence || null,
        refDetection: item.refDetection || null,
        refAp: item.refAp || '',
        linkStatus: 'new',
        sortOrder: (lastItem?.sortOrder || 0) + 1,
      },
    });

    return NextResponse.json({ success: true, data: newItem });
  } catch (error) {
    console.error('CP Item 추가 오류:', error);
    return NextResponse.json({ success: false, error: 'CP Item 추가 실패' }, { status: 500 });
  }
}


