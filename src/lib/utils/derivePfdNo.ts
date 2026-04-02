/**
 * @file derivePfdNo.ts
 * @description FMEA ID → PFD ID 변환 유틸리티
 * @version 1.0.0
 * @created 2026-03-08
 *
 * FMEA ID에서 PFD ID를 올바르게 도출합니다.
 * FMEA 전용 접미사(linkage group, revision)를 제거하고
 * PFD 표준 형식(pfd{YY}-{t}{NNN}-{NN})으로 변환합니다.
 *
 * 예시:
 *   pfm26-f001-l68-r00 → pfd26-f001-01
 *   pfm26-m001-i01     → pfd26-m001-01
 *   pfm26-f002-s       → pfd26-f002-01
 *   PFM26-F001-L68-R00 → pfd26-f001-01
 */

/**
 * FMEA ID에서 PFD ID를 도출합니다.
 *
 * FMEA ID 구조: pfm{YY}-{t}{NNN}[-{linkSuffix}][-{revSuffix}]
 *   - linkSuffix: i01, l68, L01, s, S (연동 그룹 또는 단독)
 *   - revSuffix: r00, r01 (개정 번호)
 *
 * PFD ID 구조: pfd{YY}-{t}{NNN}-{NN}
 *   - 항상 2자리 순번 (01부터 시작)
 *
 * @param fmeaId - FMEA ID (예: pfm26-f001-l68-r00)
 * @param sequenceNo - PFD 순번 (기본값 1 → 01)
 * @returns PFD ID (예: pfd26-f001-01)
 */
/**
 * PFD ID가 올바른 형식인지 검증합니다.
 * 올바른: pfd26-f001-01, pfd26-f001-i01, pfd26-f001-s, pfd26-f001 (최대 3세그먼트)
 * 잘못된: pfd26-f001-l68-05 (4세그먼트 = FMEA suffix 유입)
 */
export function isValidPfdFormat(pfdNo: string): boolean {
    if (!pfdNo) return false;
    const trimmed = pfdNo.trim().toLowerCase();
    if (!trimmed.startsWith('pfd')) return false;
    // 4세그먼트 이상이면 FMEA suffix가 섞인 잘못된 ID
    return trimmed.split('-').length <= 3;
}

/**
 * 표준 PFD 번호에서 PFMEA 베이스 ID만 추출 (스키마 라우팅용).
 * 예: pfd26-p006-01, pfd26-p006-i06 → pfm26-p006
 */
export function derivePfmeaIdFromPfdNo(pfdNo: string): string | null {
    const m = String(pfdNo || '').trim().toLowerCase().match(/^pfd(\d{2}-[mfp]\d{3})/);
    return m ? `pfm${m[1]}` : null;
}

export function derivePfdNoFromFmeaId(fmeaId: string, sequenceNo: number = 1): string {
    if (!fmeaId) return '';

    const normalized = fmeaId.toLowerCase().trim();

    // Extract base: pfm{YY}-{t}{NNN}
    // Matches: pfm26-f001, pfm26-m001, pfm26-p002
    const baseMatch = normalized.match(/^pfm(\d{2}-[mfp]\d{3})/);
    if (baseMatch) {
        const base = baseMatch[1]; // "26-f001"
        const seq = String(Math.max(1, sequenceNo)).padStart(2, '0');
        return `pfd${base}-${seq}`;
    }

    // Fallback: non-standard FMEA ID — strip known suffixes, replace prefix
    const stripped = normalized
        .replace(/^pfm/i, 'pfd')     // prefix swap
        .replace(/-r\d+$/i, '')       // drop revision suffix
        .replace(/-[lis]\d*$/i, '');  // drop linkage suffix
    return `${stripped}-${String(Math.max(1, sequenceNo)).padStart(2, '0')}`;
}
