/**
 * @file document-link-utils.ts
 * @description 문서 연동 ID 생성 유틸리티
 * @version 2.1.0 - L{NN}/S 접미사 방식 (복수 연동 지원)
 * @updated 2026-01-28
 */

// =====================================================
// ID 구조: [접두사][연도]-[유형][일련번호]-[연동상태][연동번호]
// 예시: pfm26-m001-L01, cp26-f002-S
// =====================================================

export type DocModule = 'pfm' | 'pfd' | 'cp' | 'apqp' | 'dfm';
export type DocType = 'm' | 'f' | 'p' | '';  // Master, Family, Part, (empty for APQP)

// =====================================================
// ID 생성 함수
// =====================================================

/**
 * 새 문서 ID 생성
 * @param module - 모듈명 ('pfm', 'pfd', 'cp', 'apqp', 'dfm')
 * @param type - 유형 ('m', 'f', 'p')
 * @param serialNo - 일련번호
 * @param linkGroupNo - 연동 그룹 번호 (0 = Solo, 1~99 = Linked)
 */
export function generateDocId(
    module: DocModule,
    type: DocType,
    serialNo: number,
    linkGroupNo: number = 0
): string {
    const year = new Date().getFullYear().toString().slice(-2);
    const serial = String(serialNo).padStart(3, '0');

    // ★ 연동 상태 접미사 (L/S 대문자)
    const linkSuffix = linkGroupNo > 0
        ? `-L${String(linkGroupNo).padStart(2, '0')}`
        : '-S';

    // APQP는 유형 코드 없음
    if (module === 'apqp') {
        return `${module}${year}-${serial}${linkSuffix}`;
    }

    return `${module}${year}-${type}${serial}${linkSuffix}`;
}

/**
 * 다음 일련번호의 ID 생성
 */
export function generateNextDocId(
    module: DocModule,
    type: DocType,
    existingIds: string[],
    linkGroupNo: number = 0
): string {
    const year = new Date().getFullYear().toString().slice(-2);
    const prefix = module === 'apqp'
        ? `${module}${year}-`
        : `${module}${year}-${type}`;

    const existingNums = existingIds
        .filter(id => id.toLowerCase().startsWith(prefix.toLowerCase()))
        .map(id => {
            // 새 형식: pfm26-m001-L01 또는 pfm26-m001-S
            const match = id.match(/(\d{3})-[LS]/i);
            return match ? parseInt(match[1], 10) : 0;
        });

    const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
    return generateDocId(module, type, nextNum, linkGroupNo);
}

// =====================================================
// 연동 상태 확인 함수
// =====================================================

/**
 * ID에서 연동 상태 확인 (Linked)
 */
export function isLinked(id: string): boolean {
    return /-L\d{2}$/i.test(id);
}

/**
 * ID가 단독 문서인지 확인 (Solo)
 */
export function isSolo(id: string): boolean {
    return /-S$/i.test(id);
}

/**
 * 연동 그룹 번호 추출
 * pfm26-m001-L01 → 1
 * pfm26-m001-S → 0
 */
export function getLinkGroupNo(id: string): number {
    const match = id.match(/-L(\d{2})$/i);
    return match ? parseInt(match[1], 10) : 0;
}

/**
 * 다음 연동 그룹 번호 계산
 */
export function getNextLinkGroupNo(existingIds: string[]): number {
    const linkNos = existingIds
        .filter(id => /-L\d{2}$/i.test(id))
        .map(id => {
            const match = id.match(/-L(\d{2})$/i);
            return match ? parseInt(match[1], 10) : 0;
        });

    return linkNos.length > 0 ? Math.max(...linkNos) + 1 : 1;
}

// =====================================================
// 연동 상태 변경 함수
// =====================================================

/**
 * 연동 상태를 Linked로 변경 (기존 그룹 번호 유지 또는 새 번호 부여)
 */
export function setLinked(id: string, linkGroupNo: number = 1): string {
    const groupStr = String(linkGroupNo).padStart(2, '0');

    // 이미 연동된 경우 그룹 번호만 변경
    if (/-[lL]\d{2}$/i.test(id)) {
        return id.replace(/-[lL]\d{2}$/i, '').toLowerCase() + `-L${groupStr}`;
    }
    // Solo → Linked
    if (/-[sS]$/i.test(id)) {
        return id.replace(/-[sS]$/i, '').toLowerCase() + `-L${groupStr}`;
    }
    // 접미사 없으면 추가
    return `${id.toLowerCase()}-L${groupStr}`;
}

/**
 * 연동 상태를 Solo로 변경
 */
export function setSolo(id: string): string {
    // 연동 → Solo
    if (/-[lL]\d{2}$/i.test(id)) {
        return id.replace(/-[lL]\d{2}$/i, '').toLowerCase() + '-S';
    }
    // 이미 Solo면 정규화
    if (/-[sS]$/i.test(id)) {
        return id.replace(/-[sS]$/i, '').toLowerCase() + '-S';
    }
    // 접미사 없으면 추가
    return `${id.toLowerCase()}-S`;
}

// =====================================================
// 연동 문서 ID 생성 함수
// =====================================================

/**
 * 연동 문서 ID 생성 (같은 그룹 번호 유지)
 * pfm26-m001-L01 → pfd26-m001-L01
 */
export function generateLinkedDocId(sourceId: string, targetModule: DocModule): string {
    // 기존 ID에서 모듈명만 교체 (base 소문자, L/S 대문자 유지)
    const replaced = sourceId.replace(/^(pfm|pfd|cp|dfm|apqp)/i, targetModule);
    if (/-[lL](\d{2})$/i.test(replaced)) {
        const num = replaced.match(/-[lL](\d{2})$/i)![1];
        return replaced.replace(/-[lL]\d{2}$/i, '').toLowerCase() + `-L${num}`;
    }
    if (/-[sS]$/i.test(replaced)) {
        return replaced.replace(/-[sS]$/i, '').toLowerCase() + '-S';
    }
    return replaced.toLowerCase();
}

/**
 * PFMEA에서 PFD 연동 ID 생성
 */
export function generatePfdFromPfmea(fmeaId: string): string {
    return generateLinkedDocId(fmeaId, 'pfd');
}

/**
 * PFMEA에서 CP 연동 ID 생성
 */
export function generateCpFromPfmea(fmeaId: string): string {
    return generateLinkedDocId(fmeaId, 'cp');
}

/**
 * PFD에서 CP 연동 ID 생성
 */
export function generateCpFromPfd(pfdNo: string): string {
    return generateLinkedDocId(pfdNo, 'cp');
}

// =====================================================
// ID 파싱 함수
// =====================================================

export interface ParsedDocId {
    module: DocModule;
    year: string;
    type: DocType;
    serialNo: number;
    isLinked: boolean;
    linkGroupNo: number;  // 0 = Solo, 1~99 = Linked
    original: string;
}

/**
 * ID 파싱
 */
export function parseDocId(id: string): ParsedDocId | null {
    // APQP 형식: apqp26-001-L01 or apqp26-001-S
    const apqpLinkedMatch = id.match(/^(apqp)(\d{2})-(\d{3})-L(\d{2})$/i);
    if (apqpLinkedMatch) {
        return {
            module: apqpLinkedMatch[1].toLowerCase() as DocModule,
            year: apqpLinkedMatch[2],
            type: '',
            serialNo: parseInt(apqpLinkedMatch[3], 10),
            isLinked: true,
            linkGroupNo: parseInt(apqpLinkedMatch[4], 10),
            original: id,
        };
    }

    const apqpSoloMatch = id.match(/^(apqp)(\d{2})-(\d{3})-S$/i);
    if (apqpSoloMatch) {
        return {
            module: apqpSoloMatch[1].toLowerCase() as DocModule,
            year: apqpSoloMatch[2],
            type: '',
            serialNo: parseInt(apqpSoloMatch[3], 10),
            isLinked: false,
            linkGroupNo: 0,
            original: id,
        };
    }

    // 일반 형식 (Linked): pfm26-m001-L01
    const linkedMatch = id.match(/^(pfm|pfd|cp|dfm)(\d{2})-([mfp])(\d{3})-L(\d{2})$/i);
    if (linkedMatch) {
        return {
            module: linkedMatch[1].toLowerCase() as DocModule,
            year: linkedMatch[2],
            type: linkedMatch[3].toLowerCase() as DocType,
            serialNo: parseInt(linkedMatch[4], 10),
            isLinked: true,
            linkGroupNo: parseInt(linkedMatch[5], 10),
            original: id,
        };
    }

    // 일반 형식 (Solo): pfm26-m001-S
    const soloMatch = id.match(/^(pfm|pfd|cp|dfm)(\d{2})-([mfp])(\d{3})-S$/i);
    if (soloMatch) {
        return {
            module: soloMatch[1].toLowerCase() as DocModule,
            year: soloMatch[2],
            type: soloMatch[3].toLowerCase() as DocType,
            serialNo: parseInt(soloMatch[4], 10),
            isLinked: false,
            linkGroupNo: 0,
            original: id,
        };
    }

    return null;
}

/**
 * ID에서 유형 추출 (레거시 호환)
 */
export function extractTypeFromId(id: string): 'M' | 'F' | 'P' | null {
    const parsed = parseDocId(id);
    if (!parsed || !parsed.type) return null;
    return parsed.type.toUpperCase() as 'M' | 'F' | 'P';
}

/**
 * ID에서 모듈 추출
 */
export function extractModuleFromId(id: string): DocModule | null {
    const parsed = parseDocId(id);
    return parsed?.module || null;
}

// =====================================================
// 유효성 검사 함수
// =====================================================

/**
 * 유효한 ID 형식인지 확인
 */
export function isValidDocId(id: string): boolean {
    return parseDocId(id) !== null;
}

/**
 * 연동 가능 여부 확인 (같은 레벨끼리만)
 */
export function canLink(sourceType: DocType, targetType: DocType): boolean {
    return sourceType === targetType;
}

// =====================================================
// 레거시 ID 마이그레이션
// =====================================================

/**
 * 레거시 ID를 새 형식으로 변환
 * pfdl26-f001 → pfd26-f001-L01
 * cpl26-m001 → cp26-m001-L01
 * pfm26-m001 → pfm26-m001-S (연동 정보 없으면)
 * pfm26-m001-L → pfm26-m001-L01 (번호 보정)
 */
export function migrateLegacyId(legacyId: string, hasLinkage: boolean = false, linkGroupNo: number = 1): string {
    // 이미 새 형식이면 그대로 반환
    if (/-L\d{2}$/i.test(legacyId) || /-S$/i.test(legacyId)) {
        return legacyId;
    }

    const groupStr = String(linkGroupNo).padStart(2, '0');

    // -L만 있는 경우 (번호 없음) → L01로 보정
    if (/-[lL]$/i.test(legacyId)) {
        return legacyId.replace(/-[lL]$/i, '').toLowerCase() + `-L${groupStr}`;
    }

    // pfdl → pfd로 변환 (연동됨)
    if (/^pfdl/i.test(legacyId)) {
        return legacyId.replace(/^pfdl/i, 'pfd').toLowerCase() + `-L${groupStr}`;
    }

    // cpl → cp로 변환 (연동됨)
    if (/^cpl/i.test(legacyId)) {
        return legacyId.replace(/^cpl/i, 'cp').toLowerCase() + `-L${groupStr}`;
    }

    // pfml → pfm으로 변환 (연동됨)
    if (/^pfml/i.test(legacyId)) {
        return legacyId.replace(/^pfml/i, 'pfm').toLowerCase() + `-L${groupStr}`;
    }

    // 일반 ID는 연동 정보에 따라 L01 또는 S 추가
    return legacyId.toLowerCase() + (hasLinkage ? `-L${groupStr}` : '-S');
}

/**
 * 새 형식 ID를 레거시 형식으로 변환 (호환성)
 * pfd26-f001-L01 → pfdl26-f001
 */
export function toLegacyId(newId: string): string {
    const parsed = parseDocId(newId);
    if (!parsed) return newId;

    // 접미사 제거 (-L01 or -S)
    const baseId = newId.replace(/-L\d{2}$/i, '').replace(/-S$/i, '');

    // 연동된 경우 l 접두사 추가 (PFD, CP만)
    if (parsed.isLinked) {
        if (parsed.module === 'pfd') {
            return baseId.replace(/^pfd/i, 'pfdl');
        }
        if (parsed.module === 'cp') {
            return baseId.replace(/^cp/i, 'cpl');
        }
    }

    return baseId;
}

// =====================================================
// 연동 ID 집합 생성 (한번에 PFMEA, PFD, CP 생성)
// =====================================================

export interface LinkedDocIdSet {
    pfmeaId: string;
    pfdId: string;
    cpId: string;
    linkGroupNo: number;
}

/**
 * 연동 문서 ID 집합 생성
 * 같은 연동 그룹 번호를 공유하는 PFMEA, PFD, CP ID 생성
 */
export function generateLinkedDocIdSet(
    type: DocType,
    serialNo: number,
    linkGroupNo: number
): LinkedDocIdSet {
    return {
        pfmeaId: generateDocId('pfm', type, serialNo, linkGroupNo),
        pfdId: generateDocId('pfd', type, serialNo, linkGroupNo),
        cpId: generateDocId('cp', type, serialNo, linkGroupNo),
        linkGroupNo,
    };
}
