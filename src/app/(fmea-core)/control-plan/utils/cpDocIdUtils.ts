/**
 * @file cpDocIdUtils.ts
 * @description CP 문서 ID 생성 유틸리티
 * @version 3.0.0 - Family CP ID 지원 (cp{YY}-{base}.{VV}) 추가
 * @created 2026-01-28
 * @updated 2026-03-02 - Family FMEA 다중 CP 지원
 */

// =====================================================
// CP 유형 정의
// =====================================================

/**
 * CP 유형 코드
 * - T: proTotype (시작품)
 * - L: preLaunch (양산 전)
 * - P: Production (양산)
 * - S: Safe-launch (안전 런치)
 */
export type CPTypeCode = 'T' | 'L' | 'P' | 'S';

export const CP_TYPE_MAP: Record<string, CPTypeCode> = {
    'Prototype': 'T',
    'Pre-Launch': 'L',
    'Production': 'P',
    'Safe Launch': 'S',
};

export const CP_TYPE_LABELS: Record<CPTypeCode, string> = {
    'T': 'Prototype',
    'L': 'Pre-Launch',
    'P': 'Production',
    'S': 'Safe Launch',
};

// =====================================================
// ID 유효성 검사
// =====================================================

/**
 * CP 문서 ID 유효성 검사
 * 유효: cp26-t001-L01, cp26-d002-S
 * 레거시: cp26-m001, cpl26-f001
 */
export function isValidCpNo(cpNo: string): boolean {
    if (!cpNo) return false;
    // 테스트 데이터 패턴 거부
    if (/^cp-?test/i.test(cpNo)) return false;
    // Family CP: cp26-p001.01
    if (/^cp\d{2}-[a-z]\d{3}\.\d{2}$/i.test(cpNo)) return true;
    // 새 형식: cp26-t001-L01 or cp26-p001-S + 선택적 -r00
    if (/^cp\d{2}-[tlps]\d{3}-[LI]\d{2}(-r\d{2})?$/i.test(cpNo)) return true;
    if (/^cp\d{2}-[tlps]\d{3}-S(-r\d{2})?$/i.test(cpNo)) return true;
    // 레거시 형식 (M/F/P 방식): cp26-m001 or cpl26-m001
    if (/^cpl?\d{2}-[mfp]\d{3}(-r\d{2})?$/i.test(cpNo)) return true;
    // 레거시 형식 (새 유형): cp26-t001
    return /^cpl?\d{2}-[tlps]\d{3}(-r\d{2})?$/i.test(cpNo);
}

// =====================================================
// ID 생성
// =====================================================

/**
 * CP 문서 ID 생성 (v2.1 - L{NN}/S 접미사 방식)
 * 형식: cp{YY}-{t}{NNN}-{L{NN}|S}
 * 예시: cp26-t001-L01 (Prototype, 연동그룹01)
 *       cp26-d002-S (Production, 단독)
 *
 * @param cpType - CP 유형 ('T'=Prototype, 'L'=Pre-Launch, 'P'=Production, 'S'=Safe-Launch)
 * @param linkGroupNo - 연동 그룹 번호 (0=Solo, 1~99=Linked)
 */
export function generateCPId(cpType: CPTypeCode = 'P', linkGroupNo: number = 0): string {
    const year = new Date().getFullYear().toString().slice(-2);
    const typeChar = cpType.toLowerCase();
    const linkSuffix = linkGroupNo > 0
        ? `i${String(linkGroupNo).padStart(2, '0')}`  // ★ i: linked (l은 I/1과 혼동)
        : 's';

    if (typeof window !== 'undefined') {
        try {
            const stored = localStorage.getItem('cp-projects');
            if (stored) {
                const projects = JSON.parse(stored);
                const prefix = `cp${year}-${typeChar}`;
                const ids = projects
                    .filter((p: any) => p.id?.toLowerCase().startsWith(prefix) && isValidCpNo(p.id))
                    .map((p: any) => {
                        // 새 형식: cp26-t001-i01 → 001 추출
                        const match = p.id.match(/(\d{3})-[LISlis]/i);
                        return match ? parseInt(match[1]) : 0;
                    });
                if (ids.length > 0) {
                    return `cp${year}-${typeChar}${(Math.max(...ids) + 1).toString().padStart(3, '0')}-${linkSuffix}-r00`;
                }
            }
        } catch (e) { console.error('[CP ID 생성] localStorage 오류:', e); }
    }
    return `cp${year}-${typeChar}001-${linkSuffix}-r00`;
}

/**
 * confidentialityLevel 문자열로 CP ID 생성
 */
export function generateCPIdFromLevel(confidentialityLevel: string, linkGroupNo: number = 0): string {
    const typeCode = CP_TYPE_MAP[confidentialityLevel] || 'D';
    return generateCPId(typeCode, linkGroupNo);
}

// =====================================================
// 연동 상태 확인/변경
// =====================================================

/**
 * ID에서 연동 상태 확인
 */
export function isLinked(cpNo: string): boolean {
    return /-[LI]\d{2}(-r\d{2})?$/i.test(cpNo);
}

/**
 * ID가 단독 문서인지 확인
 */
export function isSolo(cpNo: string): boolean {
    return /-S(-r\d{2})?$/i.test(cpNo);
}

/**
 * 연동 그룹 번호 추출
 */
export function getLinkGroupNo(cpNo: string): number {
    const match = cpNo.match(/-[LI](\d{2})(-r\d{2})?$/i);
    return match ? parseInt(match[1], 10) : 0;
}

/**
 * 연동 상태를 Linked로 변경
 */
export function setLinked(cpNo: string, linkGroupNo: number = 1): string {
    const groupStr = String(linkGroupNo).padStart(2, '0');
    // -r00 개정 접미사 보존
    const revMatch = cpNo.match(/(-r\d{2})$/i);
    const revSuffix = revMatch ? revMatch[1] : '';
    const base = revSuffix ? cpNo.slice(0, -revSuffix.length) : cpNo;
    if (/-[LI]\d{2}$/i.test(base)) {
        return base.replace(/-[LI]\d{2}$/i, `-i${groupStr}`) + revSuffix;
    }
    if (/-S$/i.test(base)) {
        return base.replace(/-S$/i, `-i${groupStr}`) + revSuffix;
    }
    return `${base}-i${groupStr}${revSuffix}`;
}

/**
 * 연동 상태를 Solo로 변경
 */
export function setSolo(cpNo: string): string {
    // -r00 개정 접미사 보존
    const revMatch = cpNo.match(/(-r\d{2})$/i);
    const revSuffix = revMatch ? revMatch[1] : '';
    const base = revSuffix ? cpNo.slice(0, -revSuffix.length) : cpNo;
    if (/-[LI]\d{2}$/i.test(base)) {
        return base.replace(/-[LI]\d{2}$/i, '-S') + revSuffix;
    }
    if (/-S$/i.test(base)) {
        return cpNo;
    }
    return `${base}-S${revSuffix}`;
}

// =====================================================
// 연동 문서 ID 생성
// =====================================================

/**
 * 연동 PFD ID 생성
 * cp26-t001-i01 → pfd26-t001-i01
 */
export function generateLinkedPfdNo(cpNo: string): string {
    if (!cpNo) return '';
    let pfdNo = cpNo.replace(/^cpl?/i, 'pfd');
    // 레거시 형식이면 i01 추가
    if (!/-[LI]\d{2}$/i.test(pfdNo) && !/-S$/i.test(pfdNo)) {
        pfdNo += '-i01';
    }
    return pfdNo;
}

/**
 * 연동 PFMEA ID 생성
 * cp26-t001-i01 → pfm26-t001-i01
 */
export function generateLinkedPfmeaId(cpNo: string): string {
    if (!cpNo) return '';
    let fmeaId = cpNo.replace(/^cpl?/i, 'pfm');
    if (!/-[LI]\d{2}$/i.test(fmeaId) && !/-S$/i.test(fmeaId)) {
        fmeaId += '-i01';
    }
    return fmeaId;
}

// =====================================================
// 유형 추출
// =====================================================

/**
 * ID에서 CP 유형 코드 추출
 */
export function extractCpTypeCode(cpNo: string): CPTypeCode | null {
    const match = cpNo.match(/^cpl?\d{2}-([tlps])\d{3}/i);
    return match ? match[1].toUpperCase() as CPTypeCode : null;
}

/**
 * ID에서 CP 유형 라벨 추출
 */
export function extractCpTypeLabel(cpNo: string): string {
    const code = extractCpTypeCode(cpNo);
    return code ? CP_TYPE_LABELS[code] : '';
}

// =====================================================
// 레거시 호환
// =====================================================

/**
 * 레거시 ID를 새 형식으로 변환
 * cpl26-f001 → cp26-f001-L01
 * cp26-m001 → cp26-m001-S
 */
export function migrateLegacyId(legacyId: string, linkGroupNo: number = 1): string {
    if (!legacyId) return '';
    // 이미 새 형식
    if (/-[LI]\d{2}$/i.test(legacyId) || /-S$/i.test(legacyId)) return legacyId;

    const groupStr = String(linkGroupNo).padStart(2, '0');

    // cpl → cp + i{NN}
    if (/^cpl/i.test(legacyId)) {
        return legacyId.replace(/^cpl/i, 'cp') + `-i${groupStr}`;
    }
    // 기본: 단독으로 처리
    return legacyId + '-s';
}

// =====================================================
// Family CP ID (다중 관리계획서)
// =====================================================

/**
 * FMEA ID에서 Family CP ID 생성
 * pfm26-p001 → cp26-p001.01 (variant 1)
 * pfm26-m001 → cp26-m001.02 (variant 2)
 *
 * @param fmeaId - 상위 FMEA ID (예: pfm26-p001)
 * @param variantNo - Family 내 순번 (1, 2, ...)
 */
export function generateFamilyCpId(fmeaId: string, variantNo: number): string {
    if (!fmeaId) return '';
    const match = fmeaId.match(/^pfm(\d{2}-[a-z]\d{3})/i);
    if (!match) return '';
    const base = match[1].toLowerCase();
    return `cp${base}.${String(variantNo).padStart(2, '0')}`;
}

/**
 * Family CP ID 여부 확인
 * cp26-p001.01 → true
 * cp26-p001-S  → false
 */
export function isFamilyCp(cpNo: string): boolean {
    if (!cpNo) return false;
    return /^cp\d{2}-[a-z]\d{3}\.\d{2}$/i.test(cpNo);
}

/**
 * Family CP ID에서 FMEA base 추출
 * cp26-p001.02 → 'p001'
 * cp26-p001-S  → null (Family CP 아님)
 */
export function extractFmeaBase(cpNo: string): string | null {
    if (!cpNo) return null;
    const match = cpNo.match(/^cp\d{2}-([a-z]\d{3})\.\d{2}$/i);
    return match ? match[1].toLowerCase() : null;
}

/**
 * Family CP ID에서 variant 번호 추출
 * cp26-p001.02 → 2
 * cp26-p001-S  → 0 (Family CP 아님)
 */
export function extractVariantNo(cpNo: string): number {
    if (!cpNo) return 0;
    const match = cpNo.match(/^cp\d{2}-[a-z]\d{3}\.(\d{2})$/i);
    return match ? parseInt(match[1], 10) : 0;
}

// =====================================================
// DB 기반 ID 생성 (비동기)
// =====================================================

/**
 * DB 기반 CP ID 생성 (비동기)
 * /api/control-plan/next-id API 호출 → DB에서 다음 시퀀스 번호 조회
 * 실패 시 localStorage 기반 generateCPId() 폴백
 *
 * @param cpType - CP 유형 코드 ('T','L','P','S' 또는 레거시 'M','F')
 * @param linkGroupNo - 연동 그룹 번호 (0=Solo, 1~99=Linked)
 */
export async function generateCPIdFromDB(
    cpType: string = 'P',
    linkGroupNo: number = 0
): Promise<string> {
    try {
        const res = await fetch(
            `/api/control-plan/next-id?type=${encodeURIComponent(cpType)}&linkGroup=${linkGroupNo}`
        );
        const json = await res.json();
        if (json.success && json.nextId) {
            return json.nextId;
        }
    } catch (e) {
        console.error('[CP ID] DB ID 생성 실패, localStorage 폴백 사용:', e);
    }
    // Fallback: localStorage 기반
    const typeCode = CP_TYPE_MAP[cpType] || (cpType as CPTypeCode);
    return generateCPId(typeCode || 'P', linkGroupNo);
}
