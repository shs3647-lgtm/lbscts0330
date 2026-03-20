/**
 * @file items/route.ts
 * @description Control Plan Items CRUD API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getPrismaForCp } from '@/lib/project-schema';
import { syncCPItemToUnified } from '@/lib/unified-sync';

// GET: CP Items 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });
    }

    const { id } = await params;

    // ★★★ 1단계: ControlPlan 테이블에서 CP 조회 ★★★
    let cp = await prisma.controlPlan.findFirst({
      where: { OR: [{ id }, { cpNo: id }] },
    });

    // ★★★ 2단계: ControlPlan이 없으면 CpRegistration에서 조회 (APQP에서 생성한 CP) ★★★
    let cpRegistration = null;
    if (!cp) {
      cpRegistration = await prisma.cpRegistration.findFirst({
        where: { OR: [{ id }, { cpNo: id }] },
      });

      if (cpRegistration) {

        // ★★★ 3단계: CpRegistration의 fmeaId로 ControlPlan 추가 검색 ★★★
        // (FMEA→CP 연동 시 다른 cpNo로 ControlPlan이 생성될 수 있음)
        if (cpRegistration.fmeaId) {
          cp = await prisma.controlPlan.findFirst({
            where: { fmeaId: cpRegistration.fmeaId },
          });
          if (cp) {
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

    const items = await prisma.controlPlanItem.findMany({
      where: {
        cpId: cp!.id,
        linkStatus: { not: 'unlinked' },  // ★ unlinked 제외
        processNo: { not: '' },  // ★ 빈 공정번호 제외
      },
      orderBy: { sortOrder: 'asc' },
    });

    // ★ CpRegistration에서 partNameMode 조회
    let partNameMode = 'A';
    try {
      const cpReg = await prisma.cpRegistration.findFirst({
        where: { cpNo: cp!.cpNo },
        select: { partNameMode: true },
      });
      if (cpReg?.partNameMode) partNameMode = cpReg.partNameMode;
    } catch { /* ignore */ }

    // ★ CpRegistration에서 status 조회
    let cpStatus = 'draft';
    try {
      const cpRegStatus = await prisma.cpRegistration.findFirst({
        where: { cpNo: cp!.cpNo },
        select: { status: true },
      });
      if (cpRegStatus?.status) cpStatus = cpRegStatus.status;
    } catch { /* ignore */ }

    // ★ linkedPfdNo 역방향 조회: DB에 null이면 PFD에서 이 cpNo를 linkedCpNos에 가진 PFD 검색
    let effectiveLinkedPfdNo = cp!.linkedPfdNo || null;
    if (!effectiveLinkedPfdNo) {
      try {
        const pfdWithCp = await prisma.pfdRegistration.findFirst({
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
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });
    }

    const { id } = await params;
    const { items } = await request.json();

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ success: false, error: 'items 배열이 필요합니다' }, { status: 400 });
    }

    // ★★★ 1단계: ControlPlan 테이블에서 CP 조회 ★★★
    let cp = await prisma.controlPlan.findFirst({
      where: { OR: [{ id }, { cpNo: id }] },
    });

    // ★★★ 2단계: ControlPlan이 없으면 CpRegistration에서 조회하고 ControlPlan 자동 생성 ★★★
    if (!cp) {
      const cpRegistration = await prisma.cpRegistration.findFirst({
        where: { OR: [{ id }, { cpNo: id }] },
      });

      if (cpRegistration) {
        // CpRegistration 정보로 ControlPlan 레코드 생성
        cp = await prisma.controlPlan.create({
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

    // ★ 트랜잭션으로 deleteMany + create 원자성 보장
    const createdItems: any[] = [];

    await prisma.$transaction(async (tx: any) => {
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
            await tx.unifiedProcessItem.delete({ where: { id: upiId } }).catch(() => {});
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
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });
    }

    const { id } = await params;
    const item = await request.json();

    // ★★★ 1단계: ControlPlan 테이블에서 CP 조회 ★★★
    let cp = await prisma.controlPlan.findFirst({
      where: { OR: [{ id }, { cpNo: id }] },
    });

    // ★★★ 2단계: ControlPlan이 없으면 CpRegistration에서 조회하고 ControlPlan 자동 생성 ★★★
    if (!cp) {
      const cpRegistration = await prisma.cpRegistration.findFirst({
        where: { OR: [{ id }, { cpNo: id }] },
      });

      if (cpRegistration) {
        cp = await prisma.controlPlan.create({
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

    // 마지막 sortOrder 조회
    const lastItem = await prisma.controlPlanItem.findFirst({
      where: { cpId: cp.id },
      orderBy: { sortOrder: 'desc' },
    });

    const newItem = await prisma.controlPlanItem.create({
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


