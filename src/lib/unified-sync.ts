/**
 * @file lib/unified-sync.ts
 * @description 종합 원자성 DB 동기화 모듈
 * 
 * CP, PFD, FMEA 모두 이 모듈을 통해 UnifiedProcessItem에 동기화
 * 연계성 100% 보장을 위한 Single Source of Truth
 */

import { PrismaClient } from '@prisma/client';

// ============================================================================
// 타입 정의
// ============================================================================

export interface UnifiedItemData {
    projectLinkageId?: string;
    apqpNo?: string;

    // 공정 정보 (필수)
    processNo: string;
    processName: string;
    processLevel?: string;
    processDesc?: string;

    // 부품/설비 정보
    partName?: string;
    equipment?: string;

    // FMEA 작업요소
    workElement?: string;

    // 특성 정보
    productChar?: string;
    processChar?: string;
    specialChar?: string;

    // 모자관계
    parentId?: string;
    mergeGroupId?: string;
    rowSpan?: number;

    // 정렬
    sortOrder?: number;
}

export interface SyncResult {
    success: boolean;
    unifiedItemId?: string;
    error?: string;
}

export interface BulkSyncResult {
    success: boolean;
    count: number;
    unifiedItemIds: string[];
    errors: string[];
}

// ============================================================================
// 단일 아이템 동기화
// ============================================================================

/**
 * 단일 아이템을 UnifiedProcessItem에 동기화
 */
export async function syncToUnifiedItem(
    prisma: PrismaClient | any,
    data: UnifiedItemData
): Promise<SyncResult> {
    try {
        const unifiedItem = await prisma.unifiedProcessItem.create({
            data: {
                projectLinkageId: data.projectLinkageId || null,
                apqpNo: data.apqpNo || null,

                processNo: data.processNo || '',
                processName: data.processName || '',
                processLevel: data.processLevel || '',
                processDesc: data.processDesc || '',

                partName: data.partName || '',
                equipment: data.equipment || '',
                workElement: data.workElement || '',

                productChar: data.productChar || '',
                processChar: data.processChar || '',
                specialChar: data.specialChar || '',

                parentId: data.parentId || null,
                mergeGroupId: data.mergeGroupId || null,
                rowSpan: data.rowSpan || 1,

                sortOrder: data.sortOrder || 0,
            },
        });

        return {
            success: true,
            unifiedItemId: unifiedItem.id,
        };
    } catch (error: any) {
        console.error('[UnifiedSync] 단일 동기화 실패:', error.message);
        return {
            success: false,
            error: error.message,
        };
    }
}

// ============================================================================
// 일괄 동기화
// ============================================================================

/**
 * 여러 아이템을 UnifiedProcessItem에 일괄 동기화
 */
export async function bulkSyncToUnifiedItems(
    prisma: PrismaClient | any,
    items: UnifiedItemData[],
    options?: {
        deleteExisting?: boolean;  // 기존 데이터 삭제 여부
        apqpNo?: string;           // 삭제 시 사용할 apqpNo
    }
): Promise<BulkSyncResult> {
    const result: BulkSyncResult = {
        success: false,
        count: 0,
        unifiedItemIds: [],
        errors: [],
    };

    try {
        // 기존 데이터 삭제 (옵션)
        if (options?.deleteExisting && options?.apqpNo) {
            await prisma.unifiedProcessItem.deleteMany({
                where: { apqpNo: options.apqpNo }
            });
        }

        // 일괄 생성
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const syncResult = await syncToUnifiedItem(prisma, {
                ...item,
                sortOrder: item.sortOrder ?? i,
            });

            if (syncResult.success && syncResult.unifiedItemId) {
                result.unifiedItemIds.push(syncResult.unifiedItemId);
                result.count++;
            } else if (syncResult.error) {
                result.errors.push(`[${i}] ${syncResult.error}`);
            }
        }

        result.success = result.errors.length === 0;

        return result;
    } catch (error: any) {
        console.error('[UnifiedSync] 일괄 동기화 실패:', error.message);
        result.errors.push(error.message);
        return result;
    }
}

// ============================================================================
// CP 아이템 동기화 헬퍼
// ============================================================================

/**
 * CP 아이템 저장 시 UnifiedProcessItem 동기화
 */
export async function syncCPItemToUnified(
    prisma: PrismaClient | any,
    cpItem: any,
    apqpNo?: string
): Promise<SyncResult> {
    return syncToUnifiedItem(prisma, {
        apqpNo,
        processNo: cpItem.processNo || '',
        processName: cpItem.processName || '',
        processLevel: cpItem.processLevel || '',
        processDesc: cpItem.processDesc || '',
        partName: cpItem.partName || '',
        equipment: cpItem.equipment || '',
        workElement: cpItem.workElement || '',
        productChar: cpItem.productChar || '',
        processChar: cpItem.processChar || '',
        specialChar: cpItem.specialChar || '',
        sortOrder: cpItem.sortOrder,
    });
}

// ============================================================================
// PFD 아이템 동기화 헬퍼
// ============================================================================

/**
 * PFD 아이템 저장 시 UnifiedProcessItem 동기화
 */
export async function syncPFDItemToUnified(
    prisma: PrismaClient | any,
    pfdItem: any,
    apqpNo?: string
): Promise<SyncResult> {
    return syncToUnifiedItem(prisma, {
        apqpNo,
        processNo: pfdItem.processNo || '',
        processName: pfdItem.processName || '',
        processLevel: pfdItem.processLevel || '',
        processDesc: pfdItem.processDesc || '',
        partName: pfdItem.partName || '',
        equipment: pfdItem.equipment || '',
        workElement: pfdItem.workElement || '',
        productChar: pfdItem.productChar || '',
        processChar: pfdItem.processChar || '',
        specialChar: pfdItem.specialChar || '',
        sortOrder: pfdItem.sortOrder,
    });
}

// ============================================================================
// FMEA 구조 동기화 헬퍼
// ============================================================================

/**
 * FMEA L2/L3 구조를 UnifiedProcessItem으로 변환
 */
export function convertFMEAStructuresToUnifiedItems(
    l2Structures: any[],
    l3Structures: any[],
    fmeaId: string
): UnifiedItemData[] {
    const unifiedItems: UnifiedItemData[] = [];
    let sortOrder = 0;

    for (const l2 of l2Structures) {
        const relatedL3s = l3Structures.filter(l3 => l3.l2Id === l2.id);

        if (relatedL3s.length === 0) {
            // L3 없으면 L2만으로 생성
            unifiedItems.push({
                apqpNo: fmeaId,
                processNo: l2.no || '',
                processName: l2.name || '',
                processLevel: 'Main',
                processDesc: '',
                partName: '',
                equipment: '',
                workElement: '',
                productChar: '',
                processChar: '',
                specialChar: '',
                sortOrder: sortOrder++,
            });
        } else {
            // L3 각각에 대해 생성
            for (const l3 of relatedL3s) {
                unifiedItems.push({
                    apqpNo: fmeaId,
                    processNo: l2.no || '',
                    processName: l2.name || '',
                    processLevel: l3.m4 || 'Main',
                    processDesc: '',
                    partName: '',
                    equipment: '',
                    workElement: l3.name || '',
                    productChar: '',
                    processChar: '',
                    specialChar: '',
                    sortOrder: sortOrder++,
                });
            }
        }
    }

    return unifiedItems;
}

/**
 * FMEA 저장 시 UnifiedProcessItem 동기화
 */
export async function syncFMEAToUnified(
    prisma: PrismaClient | any,
    l2Structures: any[],
    l3Structures: any[],
    fmeaId: string
): Promise<BulkSyncResult> {
    const unifiedItems = convertFMEAStructuresToUnifiedItems(l2Structures, l3Structures, fmeaId);

    return bulkSyncToUnifiedItems(prisma, unifiedItems, {
        deleteExisting: true,
        apqpNo: fmeaId,
    });
}

// ============================================================================
// 기능분석 특성 업데이트
// ============================================================================

/**
 * FMEA L2/L3 Function의 특성을 UnifiedProcessItem에 업데이트
 */
export async function updateUnifiedCharacteristics(
    prisma: PrismaClient | any,
    fmeaId: string,
    l2Functions: any[],
    l3Functions: any[]
): Promise<void> {
    try {
        // L2Function에서 제품특성 추출
        for (const l2Func of l2Functions) {
            if (l2Func.productChar) {
                await prisma.unifiedProcessItem.updateMany({
                    where: {
                        apqpNo: fmeaId,
                        processNo: { not: '' },  // 해당 공정 찾기
                    },
                    data: {
                        productChar: l2Func.productChar,
                        specialChar: l2Func.specialChar || '',
                    },
                });
            }
        }

        // L3Function에서 공정특성 추출
        for (const l3Func of l3Functions) {
            if (l3Func.processChar) {
                await prisma.unifiedProcessItem.updateMany({
                    where: {
                        apqpNo: fmeaId,
                        workElement: { not: '' },  // 해당 작업요소 찾기
                    },
                    data: {
                        processChar: l3Func.processChar,
                        specialChar: l3Func.specialChar || '',
                    },
                });
            }
        }

    } catch (error: any) {
        console.error('[UnifiedSync] 특성 업데이트 실패:', error.message);
    }
}
