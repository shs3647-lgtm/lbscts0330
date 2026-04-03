/**
 * ██████████████████████████████████████████████████████████████████████████
 * ██  CODEFREEZE — 2026-04-03                                           ██
 * ██  PFD 항목 일괄 저장 — resolveProjectPfdRegistration으로 프로젝트   ██
 * ██  스키마 pfdId 해석 보정 로직 보호.                                  ██
 * ██  수정 시 반드시 사용자 승인 필수.                                   ██
 * ██████████████████████████████████████████████████████████████████████████
 *
 * @file api/pfd/[id]/items/route.ts
 * @description PFD 항목 일괄 저장 API
 * @module pfd/api
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getPrismaForPfd } from '@/lib/project-schema';
import { resolveProjectPfdRegistration } from '@/lib/fmea-core/resolve-pfd-project-row';
import { safeErrorMessage } from '@/lib/security';
import { validateCrossSchemaRefs } from '@/lib/validate-cross-refs';
import type { PrismaClient } from '@prisma/client';

// ============================================================================
// POST: PFD 항목 일괄 저장
// ============================================================================

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { items } = await req.json();

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: '항목 배열이 필요합니다' },
        { status: 400 }
      );
    }

    const publicPrisma = getPrisma();
    if (!publicPrisma) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // PFD 확인 또는 자동 생성 (pfdRegistration = public 스키마)
    let pfd = await publicPrisma.pfdRegistration.findFirst({
      where: {
        OR: [
          { id },
          { pfdNo: id },
        ],
      },
    });

    if (!pfd) {
      // TripletGroup에 소속된 PFD만 자동생성 허용 (SSI-01 불변량)
      const tg = await publicPrisma.tripletGroup.findFirst({
        where: { pfdId: id },
        select: { id: true, pfmeaId: true },
        orderBy: { createdAt: 'desc' },
      }).catch(() => null);

      if (tg) {
        pfd = await publicPrisma.pfdRegistration.create({
          data: {
            pfdNo: id,
            fmeaId: tg.pfmeaId || undefined,
            linkedPfmeaNo: tg.pfmeaId || undefined,
            tripletGroupId: tg.id,
            subject: `PFD - ${id}`,
            status: 'draft',
          },
        });
        console.warn(`[pfd/items] pfdNo=${id}: TripletGroup(${tg.id}) 기반 자동생성`);
      } else {
        console.warn(`[pfd/items] pfdNo=${id}: TripletGroup 미소속 — PFD 자동생성 거부`);
        return NextResponse.json(
          { success: false, error: `PFD '${id}'를 찾을 수 없습니다. TripletGroup 등록 후 시도해주세요.` },
          { status: 404 }
        );
      }
    }

    // ★ pfdItem/unifiedProcessItem = Atomic DB → 프로젝트 스키마 사용
    const projPrisma = await getPrismaForPfd(pfd.pfdNo) as PrismaClient;
    if (!projPrisma) {
      return NextResponse.json(
        { success: false, error: 'Project schema connection failed' },
        { status: 500 }
      );
    }

    const projRow = await resolveProjectPfdRegistration(projPrisma, {
      id: pfd.id,
      pfdNo: pfd.pfdNo,
      fmeaId: pfd.fmeaId,
      linkedPfmeaNo: (pfd as { linkedPfmeaNo?: string | null }).linkedPfmeaNo ?? null,
    });
    const projectPfdId = projRow?.id ?? pfd.id;

    // ★★★ Write-time cross-ref 검증 (TODO-04) ★★★
    const refsToValidate = items
      .filter((item: any) => item.fmeaL2Id || item.fmeaL3Id)
      .map((item: any, i: number) => ({
        sourceModel: 'PfdItem',
        sourceId: `new-pfd-item-${i}`,
        fmeaL2Id: item.fmeaL2Id || null,
        fmeaL3Id: item.fmeaL3Id || null,
      }));
    if (refsToValidate.length > 0) {
      const orphans = await validateCrossSchemaRefs(projPrisma, refsToValidate);
      if (orphans.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `FMEA 참조 무결성 오류: ${orphans.length}건의 존재하지 않는 L2/L3 참조가 있습니다.`,
            orphanRefs: orphans.map(o => ({ field: o.field, missingId: o.orphanId })),
          },
          { status: 400 },
        );
      }
    }

    // 트랜잭션으로 처리 (기존 항목 삭제 후 새로 생성) — 프로젝트 스키마
    const result = await projPrisma.$transaction(async (tx: any) => {
      // 기존 UPI ID 수집 (고아 방지용)
      const oldItems = await tx.pfdItem.findMany({
        where: { pfdId: projectPfdId },
        select: { unifiedItemId: true },
      });
      const oldUpiIds = oldItems
        .map((i: any) => i.unifiedItemId)
        .filter(Boolean) as string[];

      // 기존 항목 hard delete
      await tx.pfdItem.deleteMany({
        where: { pfdId: projectPfdId },
      });

      // 병합 강제 통일 - 동일 그룹 내 모든 행을 첫 행 값으로 덮어씀
      const getGroupKey = (item: any) => {
        return `${item.processNo || ''}-${item.processName || ''}-${item.processLevel || ''}-${item.processDesc || ''}`;
      };

      const groupFirstValues: { [key: string]: { workElement: string; equipment: string } } = {};
      for (const item of items) {
        const key = getGroupKey(item);
        if (!groupFirstValues[key]) {
          groupFirstValues[key] = {
            workElement: (item.workElement && item.workElement !== '-' && item.workElement.trim() !== '') ? item.workElement : '',
            equipment: (item.equipment && item.equipment !== '-' && item.equipment.trim() !== '') ? item.equipment : '',
          };
        } else {
          if (!groupFirstValues[key].workElement && item.workElement && item.workElement !== '-' && item.workElement.trim() !== '') {
            groupFirstValues[key].workElement = item.workElement;
          }
          if (!groupFirstValues[key].equipment && item.equipment && item.equipment !== '-' && item.equipment.trim() !== '') {
            groupFirstValues[key].equipment = item.equipment;
          }
        }
      }

      const savedItems = [];
      const newUpiIds: string[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const groupKey = getGroupKey(item);
        const groupValues = groupFirstValues[groupKey] || { workElement: '', equipment: '' };
        const normalizedWorkElement = groupValues.workElement || item.workElement || '';
        const normalizedEquipment = groupValues.equipment || item.equipment || '';

        // 1단계: UnifiedProcessItem — FMEA FK 포함 (FIX-INT-06)
        const unifiedItem = await tx.unifiedProcessItem.create({
          data: {
            processNo: item.processNo || '',
            processName: item.processName || '',
            processLevel: item.processLevel || '',
            processDesc: item.processDesc || '',
            partName: item.partName || '',
            equipment: normalizedEquipment,
            workElement: normalizedWorkElement,
            productChar: item.productChar || '',
            processChar: item.processChar || '',
            specialChar: item.specialChar || '',
            fmeaL2Id: item.fmeaL2Id || null,
            fmeaL3Id: item.fmeaL3Id || null,
            sortOrder: i,
          },
        });
        newUpiIds.push(unifiedItem.id);

        // 2단계: PfdItem — FMEA FK 보존 (INV-INT-01)
        const created = await tx.pfdItem.create({
          data: {
            pfdId: projectPfdId,
            unifiedItemId: unifiedItem.id,
            processNo: item.processNo || '',
            processName: item.processName || '',
            processLevel: item.processLevel || '',
            processDesc: item.processDesc || '',
            partName: item.partName || '',
            workElement: normalizedWorkElement,
            equipment: normalizedEquipment,
            equipmentM4: item.equipmentM4 || null,
            productSC: item.productSC || '',
            productChar: item.productChar || '',
            processSC: item.processSC || '',
            processChar: item.processChar || '',
            specialChar: item.specialChar || '',
            fmeaL2Id: item.fmeaL2Id || null,
            fmeaL3Id: item.fmeaL3Id || null,
            cpItemId: item.cpItemId || null,
            productCharId: item.productCharId || null,
            sortOrder: i,
          },
        });
        savedItems.push(created);
      }

      // 고아 UPI 삭제 (FIX-INT-03)
      const orphanUpiIds = oldUpiIds.filter(id => !newUpiIds.includes(id));
      if (orphanUpiIds.length > 0) {
        for (const upiId of orphanUpiIds) {
          const cpRef = await tx.controlPlanItem.count({ where: { unifiedItemId: upiId } });
          if (cpRef === 0) {
            await tx.unifiedProcessItem.delete({ where: { id: upiId } }).catch(() => {});
          }
        }
      }

      return savedItems;
    });

    // 동기화 로그 기록 (syncLog = public 스키마)
    await publicPrisma.syncLog.create({
      data: {
        sourceType: 'pfd',
        sourceId: pfd.id,
        targetType: 'pfd',
        targetId: pfd.id,
        action: 'update',
        status: 'synced',
        fieldChanges: JSON.stringify({ itemCount: items.length }),
        syncedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: result,
      count: result.length,
    });

  } catch (error: any) {
    console.error('[API] PFD 항목 저장 실패:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT: PFD 항목 일괄 저장 (handleSave에서 호출)
// ============================================================================
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // POST와 동일한 로직 사용
  return POST(req, { params });
}
