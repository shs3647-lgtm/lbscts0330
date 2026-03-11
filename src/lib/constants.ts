/**
 * @file constants.ts
 * @description 시스템 전역 상수 정의 (하드코딩)
 * @created 2026-02-05
 * 
 * ★★★ 코드프리즈: 온프레미스 안정성을 위해 모든 상수값 하드코딩 ★★★
 * - 이 파일의 값들은 시스템 전체에서 일관되게 사용해야 함
 * - 값 변경 시 영향도 분석 필수
 */

// =====================================================
// FMEA ID 정규화
// =====================================================

/**
 * FMEA ID 정규화 함수
 * - 모든 FMEA ID는 소문자로 저장/검색
 * - null/undefined 입력 시 null 반환
 */
export function normalizeFmeaId(id: string | null | undefined): string | null {
  if (!id) return null;
  return id.toLowerCase();
}

/**
 * FMEA ID 정규화 (non-null 보장)
 * - 빈 문자열 반환 대신 예외 발생 방지용
 */
export function normalizeFmeaIdSafe(id: string | null | undefined): string {
  return id?.toLowerCase() || '';
}

// =====================================================
// 공통공정번호
// =====================================================

/**
 * 공통공정번호
 * - 모든 공정에 공통으로 적용되는 항목의 공정번호
 * - 모달에서 공통 항목은 모든 공정에 표시됨
 */
export const COMMON_PROCESS_NO = '0';

/**
 * 공통공정 여부 확인
 */
export function isCommonProcess(processNo: string | null | undefined): boolean {
  if (!processNo) return false;
  const normalized = String(processNo).trim();
  return normalized === COMMON_PROCESS_NO || normalized === '00';  // '00'도 호환성 유지
}

// =====================================================
// FMEA 타입
// =====================================================

/**
 * FMEA 타입 상수
 * - P: PFMEA (Process FMEA)
 * - D: DFMEA (Design FMEA)
 * - M: MFMEA (Machinery FMEA) / Master FMEA
 */
export const FMEA_TYPES = {
  PFMEA: 'P',
  DFMEA: 'D',
  MFMEA: 'M',
} as const;

export type FmeaType = typeof FMEA_TYPES[keyof typeof FMEA_TYPES];

/**
 * FMEA ID에서 타입 추출
 * - pfm26-m001 → 'P'
 * - dfm26-m001 → 'D'
 */
export function getFmeaTypeFromId(fmeaId: string | null | undefined): FmeaType | null {
  if (!fmeaId) return null;
  const lower = fmeaId.toLowerCase();
  if (lower.startsWith('pfm')) return FMEA_TYPES.PFMEA;
  if (lower.startsWith('dfm')) return FMEA_TYPES.DFMEA;
  if (lower.includes('-m')) return FMEA_TYPES.MFMEA;
  return FMEA_TYPES.PFMEA;  // 기본값
}

// =====================================================
// 특별특성 기호
// =====================================================

/**
 * 특별특성 기호
 * - CC: Critical Characteristic (중요특성)
 * - SC: Significant Characteristic (주요특성)
 */
export const SPECIAL_CHARS = {
  CC: 'CC',
  SC: 'SC',
  NONE: '',
} as const;

export type SpecialChar = typeof SPECIAL_CHARS[keyof typeof SPECIAL_CHARS];

// =====================================================
// 4M+1E 분류
// =====================================================

/**
 * 4M+1E 분류
 * - MN: Man (작업자)
 * - MC: Machine (설비)
 * - MT: Material (자재)
 * - MD: Method (방법)
 * - EN: Environment (환경)
 */
export const M4_CATEGORIES = {
  MAN: 'MN',
  MACHINE: 'MC',
  MATERIAL: 'MT',
  METHOD: 'MD',
  ENVIRONMENT: 'EN',
} as const;

export type M4Category = typeof M4_CATEGORIES[keyof typeof M4_CATEGORIES];

/**
 * 4M+1E 표시명
 */
export const M4_LABELS: Record<string, string> = {
  MN: 'Man (작업자)',
  MC: 'Machine (설비)',
  MT: 'Material (자재)',
  MD: 'Method (방법)',
  EN: 'Environment (환경)',
  IM: 'Material (자재)',  // 레거시 호환
};

/**
 * ★ 4M 기준변수 분리 함수
 * 사용자 입력에서 4M 코드를 value가 아닌 m4 기준변수로 추출
 *
 * "MC 절단기" → { m4: 'MC', name: '절단기' }
 * "MN"       → { m4: 'MN', name: '' }  (순수 4M 코드, name 없음)
 * "절단기"   → { name: '절단기' }       (4M 코드 없음)
 *
 * MD/JG → MC 자동 변환 (파서 규칙 동일)
 */
const M4_CODE_SET = new Set(['MN', 'MC', 'MD', 'JG', 'IM', 'EN']);

export function extractM4FromValue(input: string): { m4?: string; name: string } {
  const words = input.trim().split(/\s+/);
  const firstWord = words[0]?.toUpperCase();

  if (firstWord && M4_CODE_SET.has(firstWord)) {
    const normalized = (firstWord === 'MD' || firstWord === 'JG') ? 'MC' : firstWord;
    if (words.length >= 2) {
      return { m4: normalized, name: words.slice(1).join(' ') };
    }
    return { m4: normalized, name: '' };
  }
  return { name: input.trim() };
}

/** 순수 4M 코드 여부 확인 */
export function isM4Code(value: string): boolean {
  return M4_CODE_SET.has(value.toUpperCase().trim());
}

// =====================================================
// 엑셀 파일 형식
// =====================================================

/**
 * 지원되는 엑셀 확장자
 */
export const ALLOWED_EXCEL_EXTENSIONS = ['.xlsx'] as const;

/**
 * 엑셀 MIME 타입
 */
export const EXCEL_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// =====================================================
// API 응답 상태
// =====================================================

/**
 * 프로젝트 상태
 */
export const PROJECT_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  DELETED: 'deleted',
} as const;

/**
 * FMEA 단계 (Step)
 * - 1: 등록
 * - 2: 구조분석 확정
 * - 3: 기능분석 확정
 * - 4: 고장연결 확정
 * - 5: 리스크분석 확정
 * - 6: 최적화 확정
 * - 7: 개정 승인
 */
export const FMEA_STEPS = {
  REGISTER: 1,
  STRUCTURE: 2,
  FUNCTION: 3,
  FAILURE_LINK: 4,
  RISK: 5,
  OPTIMIZATION: 6,
  REVISION_APPROVED: 7,
} as const;

// =====================================================
// 데이터 임포트 필터링
// =====================================================

/**
 * 엑셀 임포트 시 제외할 값들
 * - 빈 값, 플레이스홀더, 메타 데이터 등
 */
export const IMPORT_EXCLUDE_VALUES = [
  '',
  'null',
  'undefined',
  '0',           // 데이터 값 '0'은 제외 (공정번호 0과 다름)
  '(필수)',
  '(선택)',
] as const;

/**
 * 엑셀 임포트 시 제외할 패턴
 */
export const IMPORT_EXCLUDE_PATTERNS = [
  /^공정번호/,   // 헤더 텍스트
  /^구분/,       // 헤더 텍스트
  /^L[123]-\d/,  // 레벨 코드 (L1-1, L2-3 등)
] as const;

/**
 * 값이 임포트 제외 대상인지 확인
 */
export function shouldExcludeValue(value: string | null | undefined): boolean {
  if (!value) return true;
  const trimmed = String(value).trim();
  
  if (IMPORT_EXCLUDE_VALUES.includes(trimmed as any)) return true;
  
  for (const pattern of IMPORT_EXCLUDE_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }
  
  return false;
}
