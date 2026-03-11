/**
 * @file prefix-utils.ts
 * @description 공정번호 prefix 자동 추출/제거 유틸리티
 * Python build_prefix_patterns() + strip_prefix() 포팅
 * @created 2026-03-05
 */

import type { WarningCollector } from './types';

/**
 * 공정번호로부터 가능한 모든 prefix 패턴 목록 반환
 * 예) procNo='10' → [/^10번_[A-Z]{2}_\d+/, /^10번[A-Z]\d+_/, /^10번[-\s]+/]
 */
export function buildPrefixPatterns(procNo: string): RegExp[] {
  if (!procNo) return [];
  const escaped = procNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [
    new RegExp(`^${escaped}번_[A-Z]{2}_\\d+`),   // 10번_MC_01XXX
    new RegExp(`^${escaped}번[A-Z]\\d+_`),        // 10번F01_XXX
    new RegExp(`^${escaped}번[-\\s]+`),            // 10번-XXX, 10번 XXX
  ];
}

/**
 * 텍스트에서 공정번호 prefix를 제거
 * 다른 공정번호 prefix가 붙어있으면 경고 후 원문 반환
 */
export function stripPrefix(
  text: string,
  procNo: string,
  warn?: WarningCollector,
  row?: number,
  field?: string,
): string {
  if (!text || !procNo) return text;

  // 다른 공정번호 prefix 감지
  const otherMatch = text.match(/^(\d+)번/);
  if (otherMatch && otherMatch[1] !== procNo) {
    if (warn) {
      warn.warn(
        'PREFIX_MISMATCH',
        `${field || ''}: 공정${procNo}번 데이터에 ${otherMatch[1]}번 prefix 발견`,
        row,
        text.substring(0, 40),
      );
    }
    return text; // 원문 유지 (임의 제거 금지)
  }

  for (const pat of buildPrefixPatterns(procNo)) {
    const m = pat.exec(text);
    if (m) {
      const result = text.substring(m[0].length).trim();
      // 제거 후 빈 문자열이면 원문 유지
      return result || text;
    }
  }

  return text;
}

// ── FE 코드 제거 ──

/**
 * 'Y1-6:선별재작업...' → '선별재작업...'
 * FE 코드 패턴: Y/C/U + 숫자 + - + 숫자 + 구분자
 */
export function stripFECode(feRaw: string): string {
  const trimmed = feRaw.trim();
  const m = trimmed.match(/^[YCU]\d+[-_]\d+[:.\s]*/);
  if (!m) return normalizeFEToNoun(trimmed);
  const stripped = trimmed.substring(m[0].length).trim();
  return normalizeFEToNoun(stripped || trimmed);
}

/**
 * FE 텍스트 서술형 → 명사형 정규화
 *
 * "제품의 기능에 이상이 발생한다" → "제품 기능 이상 발생"
 * "기능 이상이 발생" → "기능 이상 발생"
 * "불량이 발생할 수 있다" → "불량 발생"
 *
 * 한국어 FMEA 고장영향은 명사형(체언종결)이 표준:
 *   ✅ "기능 이상 발생", "선별 재작업", "라인 정지"
 *   ❌ "기능에 이상이 발생한다", "라인이 정지된다"
 */
export function normalizeFEToNoun(text: string): string {
  if (!text) return text;

  let result = text;

  // 1. 서술형 어미 → 제거 (끝에서부터)
  //    "~한다/된다/있다/없다/않다/진다" → 어간 유지
  result = result
    .replace(/할\s*수\s*있다\.?$/, '')
    .replace(/할\s*수\s*없다\.?$/, ' 불가')
    .replace(/하지\s*못한다\.?$/, ' 불가')
    .replace(/하지\s*않는다\.?$/, '')
    .replace(/발생한다\.?$/, '발생')
    .replace(/발생된다\.?$/, '발생')
    .replace(/발생할\s*수\s*있다\.?$/, '발생 우려')
    .replace(/저하된다\.?$/, '저하')
    .replace(/된다\.?$/, '')
    .replace(/한다\.?$/, '')
    .replace(/있다\.?$/, '')
    .replace(/없다\.?$/, '')
    .replace(/않다\.?$/, '');

  // 2. 조사 제거: "~이/가/을/를/은/는/의/에/로" (체언 뒤)
  //    "기능에 이상이 발생" → "기능 이상 발생"
  //    주의: 단어 경계 없이 제거하면 "이상"의 "이"도 제거됨 → 앞에 공백+한글 필수
  result = result
    .replace(/([가-힣])(이|가|을|를|은|는|의|에|에서|으로|로|와|과|도)\s/g, '$1 ');

  // 3. 마지막 글자가 조사로 끝나는 경우 제거
  result = result
    .replace(/([가-힣])(이|가|을|를|은|는|의|에)$/, '$1');

  // 4. 연속 공백 정리
  result = result.replace(/\s+/g, ' ').trim();

  // 5. 마침표 제거
  result = result.replace(/\.$/, '').trim();

  return result || text; // 빈 결과면 원본 유지
}

// ── FE 구분 정규화 ──

const FE_SCOPE_MAP: Record<string, string> = {
  'your plant': 'YP', 'yp': 'YP',
  'ship to plant': 'SP', 'sp': 'SP',
  'end user': 'USER', 'user': 'USER',
  // 한국어 매핑
  '자사': 'YP', '고객': 'SP', '사용자': 'USER',
  '자사(your plant)': 'YP', '고객(ship to plant)': 'SP', '사용자(user)': 'USER',
};

/**
 * FE scope 값 정규화: "Your Plant" / "자사(Your Plant)" → "YP" 등
 */
export function normalizeScope(
  raw: string,
  warn?: WarningCollector,
  row?: number,
): string {
  const key = raw.trim().toLowerCase();
  // 정확 일치
  if (FE_SCOPE_MAP[key]) return FE_SCOPE_MAP[key];
  // 부분 포함 fallback: "1. 자사(Your Plant)" 같은 번호 prefix 대응
  if (key.includes('자사') || key.includes('your plant')) return 'YP';
  if (key.includes('고객') || key.includes('ship to')) return 'SP';
  if (key.includes('사용자') || key.includes('end user') || key.includes('user')) return 'USER';
  if (raw.trim()) {
    warn?.warn('UNKNOWN_SCOPE', '알 수 없는 구분값', row, raw);
  }
  return raw.trim() || 'YP';
}

// ── 안전한 숫자 변환 ──

/**
 * 값을 정수로 안전하게 변환 (실패 시 null)
 */
export function toIntSafe(
  val: string | number | null | undefined,
  warn?: WarningCollector,
  row?: number,
  field?: string,
): number | null {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  if (isNaN(num)) {
    warn?.warn('INVALID_NUMBER', `${field || ''} 숫자 변환 실패`, row, String(val));
    return null;
  }
  return Math.round(num);
}

// ── 특별특성 정규화 ──

/**
 * 특별특성: 'L'은 AP값 혼입 → 제거
 */
export function normalizeSC(scRaw: string | null | undefined, apVal: string | null | undefined): string {
  const s = scRaw ? String(scRaw).trim() : '';
  return s === 'L' ? '' : s;
}
