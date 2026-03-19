/**
 * @file api/pfd/[id]/items/route.ts
 * @description PFD 항목 일괄 저장 API
 * @module pfd/api
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { getPrismaForPfd } from '@/lib/project-schema';
import { safeErrorMessage } from '@/lib/security';

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

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // PFD 확인 또는 자동 생성
    let pfd = await prisma.pfdRegistration.findFirst({
      where: {
        OR: [
          { id },
          { pfdNo: id },
        ],
      },
    });

    // ★★★ PFD가 없으면 자동 생성 (Import 시 필요) ★★★
    if (!pfd) {
      pfd = await prisma.pfdRegistration.create({
        data: {
          pfdNo: id,
          subject: `PFD Import - ${id}`,
          status: 'draft',
        },
      });
    }

    // 트랜잭션으로 처리 (기존 항목 삭제 후 새로 생성)
    const result = await prisma.$transaction(async (tx: any) => {
      // ★★★ 기존 항목 hard delete (soft delete 대신) ★★★
      await tx.pfdItem.deleteMany({
        where: { pfdId: pfd.id },
      });

      // ★★★ 2026-01-31: 병합 강제 통일 - 동일 그룹 내 모든 행을 첫 행 값으로 덮어씀 ★★★
      // 그룹 키 생성 함수 (공정번호+공정명+레벨+공정설명 기준)
      const getGroupKey = (item: any) => {
        return `${item.processNo || ''}-${item.processName || ''}-${item.processLevel || ''}-${item.processDesc || ''}`;
      };

      // 그룹별 첫 번째 항목의 값 수집 (빈 값이 아닌 첫 값)
      const groupFirstValues: { [key: string]: { workElement: string; equipment: string } } = {};
      for (const item of items) {
        const key = getGroupKey(item);
        if (!groupFirstValues[key]) {
          // 그룹의 첫 번째 항목 - 빈 값이 아닌 첫 값 찾기
          groupFirstValues[key] = {
            workElement: (item.workElement && item.workElement !== '-' && item.workElement.trim() !== '') ? item.workElement : '',
            equipment: (item.equipment && item.equipment !== '-' && item.equipment.trim() !== '') ? item.equipment : '',
          };
        } else {
          // 기존 값이 비어있으면 이 항목의 값으로 업데이트
          if (!groupFirstValues[key].workElement && item.workElement && item.workElement !== '-' && item.workElement.trim() !== '') {
            groupFirstValues[key].workElement = item.workElement;
          }
          if (!groupFirstValues[key].equipment && item.equipment && item.equipment !== '-' && item.equipment.trim() !== '') {
            groupFirstValues[key].equipment = item.equipment;
          }
        }
      }

      // ★★★ 모든 항목 새로 생성 (강제 통일 - 첫 행 값으로 덮어씀) ★★★
      const savedItems = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const groupKey = getGroupKey(item);
        const groupValues = groupFirstValues[groupKey] || { workElement: '', equipment: '' };

        // ★ 강제 통일: 그룹의 첫 번째 값으로 무조건 덮어씀 (병합 보장)
        const normalizedWorkElement = groupValues.workElement || item.workElement || '';
        const normalizedEquipment = groupValues.equipment || item.equipment || '';

        // ★★★ 1단계: UnifiedProcessItem (종합 DB)에 저장 ★★★
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
            sortOrder: i,
          },
        });

        // ★★★ 2단계: PfdItem 생성 (UnifiedItem 참조) ★★★
        const created = await tx.pfdItem.create({
          data: {
            pfdId: pfd.id,
            unifiedItemId: unifiedItem.id,  // ★ 종합 DB 연결
            processNo: item.processNo || '',
            processName: item.processName || '',
            processLevel: item.processLevel || '',
            processDesc: item.processDesc || '',
            partName: item.partName || '',
            workElement: normalizedWorkElement,
            equipment: normalizedEquipment,
            productSC: item.productSC || '',
            productChar: item.productChar || '',
            processSC: item.processSC || '',
            processChar: item.processChar || '',
            specialChar: item.specialChar || '',
            fmeaL2Id: item.fmeaL2Id || null,
            fmeaL3Id: item.fmeaL3Id || null,
            cpItemId: item.cpItemId || null,
            sortOrder: i,
          },
        });
        savedItems.push(created);
      }

      return savedItems;
    });

    // 동기화 로그 기록
    await prisma.syncLog.create({
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
