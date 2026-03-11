/**
 * @file pfdIdUtils.ts
 * @description PFD ID 생성 유틸리티
 * @version 2.2.0 - i{NN}/s 접미사 방식 (l→i 변경: l은 I/1과 혼동)
 * @updated 2026-03-08
 */

import { PFDType } from '../types/pfdRegister';

// =====================================================
// ID 유효성 검사
// =====================================================

/**
 * PFD ID 유효성 검사 (새 형식 지원)
 * 유효: pfd26-m001-i01, pfd26-f002-s
 * 레거시: pfd26-m001, pfdl26-f001, pfd26-m001-L01
 */
export function isValidPfdNo(pfdNo: string): boolean {
    if (!pfdNo) return false;
    // 테스트 데이터 패턴 명시적 거부
    if (/^pfd-?test/i.test(pfdNo)) return false;
    // 타임스탬프 패턴 거부 (13자리 숫자로 끝남)
    if (/\d{13}$/.test(pfdNo)) return false;
    // 새 형식: pfd26-m001-i01 or pfd26-m001-s (레거시 L도 인식)
    if (/^pfd\d{2}-[mfp]\d{3}-[LI]\d{2}$/i.test(pfdNo)) return true;
    if (/^pfd\d{2}-[mfp]\d{3}-S$/i.test(pfdNo)) return true;
    // 레거시 형식: pfd26-m001 or pfdl26-m001
    return /^pfdl?\d{2}-[mfp]\d{3}$/i.test(pfdNo);
}

// =====================================================
// ID 생성
// =====================================================

/**
 * PFD ID 생성 (v2.2 - i{NN}/s 접미사 방식)
 * 형식: pfd{YY}-{t}{NNN}-{i{NN}|s}
 * 예시: pfd26-m001-i01 (Master, 연동그룹01)
 *       pfd26-f002-s (Family, 단독)
 */
export function generatePFDId(pfdType: PFDType = 'P', linkGroupNo: number = 0): string {
    const year = new Date().getFullYear().toString().slice(-2);
    const typeChar = pfdType.toLowerCase();
    const linkSuffix = linkGroupNo > 0
        ? `i${String(linkGroupNo).padStart(2, '0')}`  // ★ i: linked (l은 I/1과 혼동)
        : 's';

    if (typeof window !== 'undefined') {
        try {
            const stored = localStorage.getItem('pfd-projects');
            if (stored) {
                const projects = JSON.parse(stored);
                const prefix = `pfd${year}-${typeChar}`;
                const ids = projects
                    .filter((p: any) => p.id?.toLowerCase().startsWith(prefix) && isValidPfdNo(p.id))
                    .map((p: any) => {
                        // 새 형식: pfd26-m001-i01 → 001 추출
                        const match = p.id.match(/(\d{3})-[LISlis]/i);
                        return match ? parseInt(match[1]) : 0;
                    });
                if (ids.length > 0) {
                    return `pfd${year}-${typeChar}${(Math.max(...ids) + 1).toString().padStart(3, '0')}-${linkSuffix}`;
                }
            }
        } catch (e) { console.error('[WS PFD ID 생성] localStorage 오류:', e); }
    }
    return `pfd${year}-${typeChar}001-${linkSuffix}`;
}

// =====================================================
// 연동 상태 확인/변경
// =====================================================

/**
 * ID에서 연동 상태 확인
 */
export function isLinked(pfdNo: string): boolean {
    return /-[LI]\d{2}$/i.test(pfdNo);
}

/**
 * ID가 단독 문서인지 확인
 */
export function isSolo(pfdNo: string): boolean {
    return /-S$/i.test(pfdNo);
}

/**
 * 연동 그룹 번호 추출
 */
export function getLinkGroupNo(pfdNo: string): number {
    const match = pfdNo.match(/-[LI](\d{2})$/i);
    return match ? parseInt(match[1], 10) : 0;
}

/**
 * 연동 상태를 Linked로 변경
 */
export function setLinked(pfdNo: string, linkGroupNo: number = 1): string {
    const groupStr = String(linkGroupNo).padStart(2, '0');
    if (/-[LI]\d{2}$/i.test(pfdNo)) {
        return pfdNo.replace(/-[LI]\d{2}$/i, `-i${groupStr}`);
    }
    if (/-S$/i.test(pfdNo)) {
        return pfdNo.replace(/-S$/i, `-i${groupStr}`);
    }
    return `${pfdNo}-i${groupStr}`;
}

/**
 * 연동 상태를 Solo로 변경
 */
export function setSolo(pfdNo: string): string {
    if (/-[LI]\d{2}$/i.test(pfdNo)) {
        return pfdNo.replace(/-[LI]\d{2}$/i, '-s');
    }
    if (/-S$/i.test(pfdNo)) {
        return pfdNo;
    }
    return `${pfdNo}-s`;
}

// =====================================================
// 연동 문서 ID 생성
// =====================================================

/**
 * 연동 CP ID 생성 (같은 유형/번호/그룹 유지)
 * pfd26-m001-i01 → cp26-m001-i01
 */
export function generateLinkedCpNo(pfdNo: string): string {
    if (!pfdNo) return '';
    let cpNo = pfdNo.replace(/^pfdl?/i, 'cp');
    // 레거시 형식이면 i01 추가
    if (!/-[LI]\d{2}$/i.test(cpNo) && !/-S$/i.test(cpNo)) {
        cpNo += '-i01';
    }
    return cpNo;
}

/**
 * 연동 PFMEA ID 생성
 * pfd26-m001-i01 → pfm26-m001-i01
 */
export function generateLinkedPfmeaId(pfdNo: string): string {
    if (!pfdNo) return '';
    let fmeaId = pfdNo.replace(/^pfdl?/i, 'pfm');
    if (!/-[LI]\d{2}$/i.test(fmeaId) && !/-S$/i.test(fmeaId)) {
        fmeaId += '-i01';
    }
    return fmeaId;
}

// =====================================================
// 레거시 호환
// =====================================================

/**
 * 레거시 연동 PFD ID 생성 (하위 호환)
 * @deprecated 새 시스템에서는 linkGroupNo 파라미터 사용
 */
export function generateLinkedPfdNo(pfdNo: string): string {
    if (!pfdNo) return '';
    // 새 형식이면 그대로 반환
    if (/-[LI]\d{2}$/i.test(pfdNo)) {
        return pfdNo;
    }
    if (/-S$/i.test(pfdNo)) {
        return pfdNo.replace(/-S$/i, '-i01');
    }
    // 레거시: pfdl 접두사 추가
    if (/^pfdl/i.test(pfdNo)) return pfdNo;
    return pfdNo.replace(/^pfd/i, 'pfdl');
}

/**
 * 레거시 ID를 새 형식으로 변환
 * pfdl26-f001 → pfd26-f001-i01
 */
export function migrateLegacyId(legacyId: string, linkGroupNo: number = 1): string {
    if (!legacyId) return '';
    // 이미 새 형식
    if (/-[LI]\d{2}$/i.test(legacyId) || /-S$/i.test(legacyId)) return legacyId;

    const groupStr = String(linkGroupNo).padStart(2, '0');

    // pfdl → pfd + i{NN}
    if (/^pfdl/i.test(legacyId)) {
        return legacyId.replace(/^pfdl/i, 'pfd') + `-i${groupStr}`;
    }
    // 기본: 단독으로 처리
    return legacyId + '-s';
}
