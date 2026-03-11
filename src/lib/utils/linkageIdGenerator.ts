/**
 * @file linkageIdGenerator.ts
 * @description 연동 ID 생성 유틸리티
 * @created 2026-01-29
 */

import { AppType, APP_CONFIGS, LinkMode, LinkSuffix } from '@/types/linkage';

// =====================================================
// ID 생성 함수
// =====================================================

/**
 * 새 문서 ID 생성
 * @param appType - 앱 유형 ('apqp', 'pfmea', 'dfmea', 'pfd', 'cp')
 * @param typeCode - 유형 코드 ('m', 'f', 'p' / 't', 'l', 'p', 's')
 * @param serialNo - 일련번호
 * @param linkMode - 연동 모드 ('solo' | 'linked')
 * @param linkGroupNo - 연동 그룹 번호 (1~99, linked 모드일 때만 사용)
 * @returns 생성된 ID (예: 'pfm26-m001-l01', 'cp26-t001-s') - ★ 모두 소문자
 */
export function generateDocId(
    appType: AppType,
    typeCode: string,
    serialNo: number,
    linkMode: LinkMode = 'solo',
    linkGroupNo: number = 1
): string {
    const prefix = APP_CONFIGS[appType].prefix;
    const year = new Date().getFullYear().toString().slice(-2);
    const serial = String(serialNo).padStart(3, '0');

    // ★ 연동 상태 접미사 (소문자로 정규화) — i: linked, s: solo
    const linkSuffix: string = linkMode === 'linked'
        ? `i${String(linkGroupNo).padStart(2, '0')}`  // ★ 소문자 i (l은 I/1과 혼동)
        : 's';  // ★ 소문자 s

    // APQP는 유형 코드 없음
    if (appType === 'apqp') {
        return `${prefix}${year}-${serial}-${linkSuffix}`.toLowerCase();  // ★ 전체 소문자
    }

    return `${prefix}${year}-${typeCode}${serial}-${linkSuffix}`.toLowerCase();  // ★ 전체 소문자
}

/**
 * 다음 일련번호 계산
 * @param existingIds - 기존 ID 목록
 * @param prefix - 앱 프리픽스
 * @returns 다음 일련번호
 */
export function getNextSerialNo(existingIds: string[], prefix: string): number {
    const year = new Date().getFullYear().toString().slice(-2);
    const pattern = new RegExp(`^${prefix}${year}-[a-z]?(\\d{3})-`, 'i');

    const serials = existingIds
        .map(id => {
            const match = id.match(pattern);
            return match ? parseInt(match[1], 10) : 0;
        })
        .filter(n => n > 0);

    return serials.length > 0 ? Math.max(...serials) + 1 : 1;
}

/**
 * 다음 연동 그룹 번호 계산
 * @param existingIds - 기존 ID 목록
 * @returns 다음 연동 그룹 번호
 */
export function getNextLinkGroupNo(existingIds: string[]): number {
    const pattern = /-[LI](\d{2})$/i;

    const linkNos = existingIds
        .map(id => {
            const match = id.match(pattern);
            return match ? parseInt(match[1], 10) : 0;
        })
        .filter(n => n > 0);

    return linkNos.length > 0 ? Math.max(...linkNos) + 1 : 1;
}

// =====================================================
// ID 분석 함수
// =====================================================

/**
 * ID가 연동된 문서인지 확인
 */
export function isLinked(id: string): boolean {
    return /-[LI]\d{2}$/i.test(id);
}

/**
 * ID가 단독 문서인지 확인
 */
export function isSolo(id: string): boolean {
    return /-S$/i.test(id);
}

/**
 * ID에서 연동 그룹 번호 추출
 * @returns 연동 그룹 번호 (Solo면 0)
 */
export function getLinkGroupNo(id: string): number {
    const match = id.match(/-[LI](\d{2})$/i);
    return match ? parseInt(match[1], 10) : 0;
}

/**
 * ID에서 앱 유형 추출
 */
export function getAppTypeFromId(id: string): AppType | null {
    const lowerCaseId = id.toLowerCase();
    if (lowerCaseId.startsWith('apqp')) return 'apqp';
    if (lowerCaseId.startsWith('pfm')) return 'pfmea';
    if (lowerCaseId.startsWith('dfm')) return 'dfmea';
    if (lowerCaseId.startsWith('pfd')) return 'pfd';
    if (lowerCaseId.startsWith('cp')) return 'cp';
    return null;
}

/**
 * ID에서 유형 코드 추출 (M/F/P 또는 T/L/P/S)
 */
export function getTypeCodeFromId(id: string): string {
    // 예: pfm26-m001-L01 → 'm'
    const match = id.match(/^\w+\d{2}-([a-z])\d{3}/i);
    return match ? match[1].toLowerCase() : 'm';
}

// =====================================================
// 연동 ID 생성 함수
// =====================================================

/**
 * 같은 연동 그룹의 다른 앱 ID 생성
 * @param sourceId - 원본 ID
 * @param targetApp - 대상 앱 유형
 * @returns 연동된 ID (소문자)
 */
export function generateLinkedDocId(sourceId: string, targetApp: AppType): string {
    const targetPrefix = APP_CONFIGS[targetApp].prefix;
    const sourceApp = getAppTypeFromId(sourceId);

    if (!sourceApp) return sourceId.toLowerCase();  // ★ 소문자

    const sourcePrefix = APP_CONFIGS[sourceApp].prefix;

    // 프리픽스만 교체 + 소문자 정규화
    return sourceId.replace(new RegExp(`^${sourcePrefix}`, 'i'), targetPrefix).toLowerCase();  // ★ 소문자
}

/**
 * 연동 그룹의 모든 앱 ID 생성
 * @param baseInfo - 기본 정보 (일련번호, 연동 그룹 번호)
 * @param apps - 생성할 앱 목록
 * @param typeCode - 유형 코드
 * @returns 앱별 ID 맵
 */
export function generateAllLinkedIds(
    serialNo: number,
    linkGroupNo: number,
    apps: AppType[],
    typeCode: string = 'm'
): Record<AppType, string> {
    const result: Partial<Record<AppType, string>> = {};

    for (const app of apps) {
        result[app] = generateDocId(app, typeCode, serialNo, 'linked', linkGroupNo);
    }

    return result as Record<AppType, string>;
}

/**
 * 단독 문서 ID 생성
 */
export function generateSoloId(appType: AppType, typeCode: string, serialNo: number): string {
    return generateDocId(appType, typeCode, serialNo, 'solo');
}
