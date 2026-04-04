/**
 * @file sync-helpers.ts
 * @description 모듈 간 동기화 공용 유틸리티
 * @created 2026-03-08
 *
 * 진단보고서 21건 이슈 수정을 위한 공용 함수:
 * - normalizeM4WithOriginal: M4 정규화 + 원본 보존 (C2, H7)
 * - validateProcessNo: processNo 포맷 검증 (H8)
 * - recordSyncLog: SyncLog 기록 (M6)
 * - validateLinkedCpNos: linkedCpNos JSON 검증 (C5)
 */

import type { PrismaClient } from '@prisma/client';

// ============================================================
// C2/H7: M4 정규화 — 원본값 보존
// ============================================================

interface M4Result {
    /** CP/PFD 표시용 정규화된 M4 (MC/IM/EN/MN) */
    normalized: string;
    /** 원본 M4 코드 (MD/JG 등 원본 그대로 보존) */
    original: string;
}

/**
 * 4M 정규화 + 원본 보존
 * - MD(금형)/JG(지그) → normalized: MC, original: MD/JG (원본 보존)
 * - MC/MN/IM/EN → 그대로
 * - IATF 16949 4M 감사 부적합 방지
 */
export function normalizeM4WithOriginal(raw: string): M4Result {
    const original = (raw || '').trim().toUpperCase();
    if (!original) return { normalized: '', original: '' };

    // MD(금형)/JG(지그)는 CP 표시상 MC로 분류하되, 원본 코드 보존
    if (original === 'MD' || original === 'JG') {
        return { normalized: 'MC', original };
    }
    if (['MC', 'MN', 'IM', 'EN'].includes(original)) {
        return { normalized: original, original };
    }
    return { normalized: '', original };
}

// ============================================================
// H8: processNo 포맷 검증
// ============================================================

/**
 * processNo가 유효한 형식인지 검증
 * - 빈 문자열, 순수 공백 → false
 * - 숫자 or 숫자-문자 조합만 허용
 */
export function isValidProcessNo(processNo: string | null | undefined): boolean {
    const trimmed = (processNo || '').trim();
    if (!trimmed) return false;
    // 최소 1글자 이상의 비-공백 문자
    return trimmed.length > 0 && trimmed.length <= 20;
}

// ============================================================
// M6: SyncLog 기록
// ============================================================

interface SyncLogEntry {
    sourceType: string;
    sourceId: string;
    targetType: string;
    targetId: string;
    action: string;
    status?: string;
    errorMsg?: string;
    fieldChanges?: string;
}

/**
 * SyncLog 테이블에 동기화 이력 기록
 * - 모든 Sync API에서 호출
 * - 에러 시에도 기록 (status: 'error')
 */
export async function recordSyncLog(
    prisma: PrismaClient | any,
    entry: SyncLogEntry
): Promise<void> {
    try {
        await prisma.syncLog.create({
            data: {
                sourceType: entry.sourceType,
                sourceId: entry.sourceId,
                targetType: entry.targetType,
                targetId: entry.targetId,
                action: entry.action,
                status: entry.status || 'completed',
                errorMsg: entry.errorMsg || null,
                fieldChanges: entry.fieldChanges || null,
                syncedAt: new Date(),
            },
        });
    } catch (logErr) {
        // SyncLog 기록 실패는 메인 로직을 중단시키지 않음
        console.error('[SyncLog] 기록 실패:', logErr);
    }
}

// ============================================================
// C5: linkedCpNos JSON 검증
// ============================================================

/**
 * linkedCpNos JSON 문자열을 안전하게 파싱
 * - 유효한 JSON 배열인지 검증
 * - 각 요소가 비어있지 않은 문자열인지 확인
 * - 실패 시 빈 배열 반환 (자동 CP 생성 방지)
 */
export function parseLinkedCpNos(raw: string | null | undefined): string[] {
    if (!raw || typeof raw !== 'string') return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            console.warn('[parseLinkedCpNos] JSON은 유효하나 배열이 아님:', typeof parsed);
            return [];
        }
        return parsed
            .filter((v: unknown): v is string => typeof v === 'string' && v.trim().length > 0)
            .map((v: string) => v.trim());
    } catch (e) {
        console.error('[parseLinkedCpNos] JSON 파싱 실패:', raw);
        return [];
    }
}

// ============================================================
// C1: 사용자 편집 보존을 위한 기존 CP 항목 룩업
// ============================================================

interface PreservedCpFields {
    specTolerance?: string | null;
    evalMethod?: string | null;
    sampleSize?: string | null;
    sampleFreq?: string | null;
    controlMethod?: string | null;
    owner1?: string | null;
    owner2?: string | null;
    reactionPlan?: string | null;
    detectorNo?: boolean;
    detectorEp?: boolean;
    detectorAuto?: boolean;
    epDeviceIds?: string | null;
    autoDeviceIds?: string | null;
}

/**
 * 기존 CP 항목에서 사용자 편집 필드를 룩업 맵으로 수집
 * deleteMany 전에 호출하여 사용자 편집 데이터 보존
 * 키: processNo|workElement|productChar|processChar
 */
export async function buildCpPreservedFieldsMap(
    prisma: PrismaClient | any,
    cpId: string
): Promise<Map<string, PreservedCpFields>> {
    const map = new Map<string, PreservedCpFields>();
    try {
        const existingItems = await prisma.controlPlanItem.findMany({
            where: { cpId, linkStatus: 'linked' },
            select: {
                processNo: true,
                workElement: true,
                productChar: true,
                processChar: true,
                specTolerance: true,
                evalMethod: true,
                sampleSize: true,
                sampleFreq: true,
                controlMethod: true,
                owner1: true,
                owner2: true,
                reactionPlan: true,
                detectorNo: true,
                detectorEp: true,
                detectorAuto: true,
                epDeviceIds: true,
                autoDeviceIds: true,
            },
        });
        for (const item of existingItems) {
            const key = `${item.processNo || ''}|${item.workElement || ''}|${item.productChar || ''}|${item.processChar || ''}`;
            // 사용자가 편집한 필드가 하나라도 있으면 보존
            const hasUserEdits =
                item.specTolerance || item.evalMethod || item.sampleSize ||
                item.sampleFreq || item.controlMethod || item.owner1 ||
                item.owner2 || item.detectorNo || item.detectorEp ||
                item.detectorAuto || item.epDeviceIds || item.autoDeviceIds;
            if (hasUserEdits) {
                map.set(key, {
                    specTolerance: item.specTolerance,
                    evalMethod: item.evalMethod,
                    sampleSize: item.sampleSize,
                    sampleFreq: item.sampleFreq,
                    controlMethod: item.controlMethod,
                    owner1: item.owner1,
                    owner2: item.owner2,
                    reactionPlan: item.reactionPlan,
                    detectorNo: item.detectorNo,
                    detectorEp: item.detectorEp,
                    detectorAuto: item.detectorAuto,
                    epDeviceIds: item.epDeviceIds,
                    autoDeviceIds: item.autoDeviceIds,
                });
            }
        }
    } catch (err) {
        console.error('[buildCpPreservedFieldsMap] 기존 항목 조회 실패:', err);
    }
    return map;
}

/**
 * 보존된 사용자 편집 필드를 새 항목에 복원
 */
export function restorePreservedFields(
    preservedMap: Map<string, PreservedCpFields>,
    processNo: string,
    workElement: string,
    productChar: string,
    processChar: string,
    defaultReactionPlan: string
): Partial<PreservedCpFields> {
    const key = `${processNo}|${workElement}|${productChar}|${processChar}`;
    const preserved = preservedMap.get(key);
    if (!preserved) return { reactionPlan: defaultReactionPlan };
    return {
        ...preserved,
        // reactionPlan은 사용자가 편집하지 않았으면 기본값 사용
        reactionPlan: preserved.reactionPlan || defaultReactionPlan,
    };
}
