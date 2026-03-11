/**
 * @file excel-parser-utils.ts
 * @description PFMEA Excel 파서 유틸리티 함수 및 상수
 * @version 1.0.0
 *
 * excel-parser.ts에서 분리 (700행 규칙 준수)
 * - 셀 값 → 문자열 변환
 * - 시트명 정규화 및 매핑
 * - 안전 한도 상수
 */
/**
 * ██████████████████████████████████████████████████████████████
 * ██  CODEFREEZE v3.1.0 — 이 파일을 수정하지 마세요!          ██
 * ██                                                          ██
 * ██  상태: DB중심 고장연결 + v3.0 아키텍처 완성 (2026-02-28)  ██
 * ██  검증: 270테스트 PASS / tsc 에러 0개                      ██
 * ██                                                          ██
 * ██  수정이 필요하면:                                         ██
 * ██  1. 반드시 별도 브랜치에서 작업                            ██
 * ██  2. 270 골든 테스트 전체 통과 필수                         ██
 * ██  3. 사용자 승인 후 머지                                   ██
 * ██████████████████████████████████████████████████████████████
 */


/* eslint-disable @typescript-eslint/no-explicit-any */

/** ★★★ 안전 한도 상수 (2026-02-07) ★★★ */
export const MAX_DATA_ROWS = 5000;           // 시트당 최대 데이터 행 수 (500→5000 확대, 빈행 자동종료로 성능 무관)
export const MAX_CONSECUTIVE_EMPTY = 10;     // 연속 빈 행 N개 → 데이터 끝으로 판단
export const MAX_DATA_COLS = 10;             // 시트당 최대 데이터 열 수

/**
 * 공백 정규화 — 파싱 일관성 보장
 * 1) 연속 공백 → 단일 공백
 * 2) 괄호 앞 공백 제거: "외관불량 (스크래치)" → "외관불량(스크래치)"
 * 3) trim (앞뒤 공백 제거)
 */
export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\s+/g, ' ')       // 연속 공백 → 단일 공백
    .replace(/\s+\(/g, '(')     // 괄호 앞 공백 제거
    .trim();
}

/**
 * ★★★ 모든 셀 값을 문자열로 변환 (하드코딩 규칙) ★★★
 *
 * 변환 규칙:
 * - 숫자 (0, 10, 20) → 문자열 ('0', '10', '20')
 * - null/undefined → 빈 문자열 ('')
 * - RichText 객체 → 텍스트 추출
 * - 날짜 객체 → ISO 문자열 (YYYY-MM-DD)
 * - 일반 객체 → name 속성 또는 JSON
 * - ★ 공백 정규화: 연속 공백 → 단일, 괄호 앞 공백 제거
 *
 * @param cellValue - Excel 셀 값 (any type)
 * @returns 문자열 (항상 string 타입 반환, 공백 정규화 적용)
 */
export function cellValueToString(cellValue: unknown): string {
  // null/undefined 처리
  if (cellValue === null || cellValue === undefined) {
    return '';
  }

  // 기본 타입 처리
  if (typeof cellValue === 'string') {
    return normalizeWhitespace(cellValue);
  }
  if (typeof cellValue === 'number' || typeof cellValue === 'boolean') {
    return String(cellValue);
  }

  // 날짜 객체 처리
  if (cellValue instanceof Date) {
    return cellValue.toISOString().slice(0, 10);
  }

  // 객체 처리 (ExcelJS 특수 타입들)
  if (typeof cellValue === 'object') {
    // RichText 배열 처리 (ExcelJS에서 서식 있는 텍스트)
    if ('richText' in cellValue && Array.isArray((cellValue as any).richText)) {
      const richText = (cellValue as any).richText as Array<{ text?: string }>;
      return normalizeWhitespace(richText.map(r => r.text || '').join(''));
    }

    // 하이퍼링크 객체 처리
    if ('text' in cellValue && typeof (cellValue as any).text === 'string') {
      return normalizeWhitespace((cellValue as any).text);
    }

    // name 속성이 있는 객체
    if ('name' in cellValue && typeof (cellValue as any).name === 'string') {
      return normalizeWhitespace((cellValue as any).name);
    }

    // 최후의 수단: JSON 변환 시도
    try {
      const json = JSON.stringify(cellValue);
      if (json && json !== '{}' && json !== '[]') {
        return json;
      }
    } catch {
      // JSON 변환 실패
    }
    return '';
  }

  // 기타 타입
  return normalizeWhitespace(String(cellValue));
}

/** 시트 이름 → 내부 코드 매핑 (템플릿 다운로드와 100% 일치) */
const SHEET_NAME_MAP: Record<string, string> = {
  // 템플릿 다운로드에서 사용하는 정확한 시트명 (excel-template.ts와 일치)
  'L2-1': 'A1',
  'L2-1 공정번호': 'A1',           // 레거시 시트명
  'L2-1(A1) 공정번호': 'A1',       // 신규 시트명 (A/B/C 코드 포함)
  'L2-2': 'A2',
  'L2-2 공정명': 'A2',
  'L2-2(A2) 공정명': 'A2',
  'L2-3': 'A3',
  'L2-3 공정기능': 'A3',
  'L2-3(A3) 공정기능': 'A3',
  'L2-4': 'A4',
  'L2-4 제품특성': 'A4',
  'L2-4(A4) 제품특성': 'A4',
  'L2-5': 'A5',
  'L2-5 고장형태': 'A5',
  'L2-5(A5) 고장형태': 'A5',
  // v3.0: L2-6(A6) 검출관리 IMPORT 제외 → 리스크 탭
  'L3-1': 'B1',
  'L3-1 작업요소': 'B1',
  'L3-1(B1) 작업요소': 'B1',
  'L3-2': 'B2',
  'L3-2 요소기능': 'B2',
  'L3-2(B2) 요소기능': 'B2',
  'L3-3': 'B3',
  'L3-3 공정특성': 'B3',
  'L3-3(B3) 공정특성': 'B3',
  'L3-4': 'B4',
  'L3-4 고장원인': 'B4',
  'L3-4(B4) 고장원인': 'B4',
  // v3.0: L3-5(B5) 예방관리 IMPORT 제외 → 리스크 탭
  'L1-1': 'C1',
  'L1-1 구분': 'C1',
  'L1-1(C1) 구분': 'C1',
  'L1-2': 'C2',
  'L1-2 제품기능': 'C2',
  'L1-2(C2) 제품기능': 'C2',
  'L1-3': 'C3',
  'L1-3 요구사항': 'C3',
  'L1-3(C3) 요구사항': 'C3',
  'L1-4': 'C4',
  'L1-4 고장영향': 'C4',
  'L1-4(C4) 고장영향': 'C4',
  // excel-styles.ts 전용 (A12 합병 시트명)
  'L2-1,2(A1,2) 공정번호': 'A1',
  'L1-2(C2) 완제품기능': 'C2',
  // 기존 형식도 지원 (하위호환)
  'A1': 'A1', 'A2': 'A2', 'A3': 'A3', 'A4': 'A4', 'A5': 'A5',
  'B1': 'B1', 'B2': 'B2', 'B3': 'B3', 'B4': 'B4',
  'C1': 'C1', 'C2': 'C2', 'C3': 'C3', 'C4': 'C4',
};

/** 유효한 시트 이름 확인 및 내부 코드 반환 (템플릿 다운로드 시트명과 100% 매칭) */
export function normalizeSheetName(name: string): string | null {
  const trimmedName = name.trim();

  // 1. 직접 매핑 확인 (정확한 이름 일치)
  if (SHEET_NAME_MAP[trimmedName]) {
    return SHEET_NAME_MAP[trimmedName];
  }

  // 2. 대소문자 구분 없이 매핑 확인
  const lowerTrimmed = trimmedName.toLowerCase();
  for (const [key, value] of Object.entries(SHEET_NAME_MAP)) {
    if (key.toLowerCase() === lowerTrimmed) {
      return value;
    }
  }

  // 3. L2-1, L2-4(A4) 제품특성 같은 형식 처리 (공백 이후 제거, 괄호 제거 후 매칭)
  const nameParts = trimmedName.split(/\s+/);
  let baseName = nameParts[0]; // 'L2-1', 'L3-1', 'L2-4(A4)' 등
  // ★ L2-4(A4), L3-3(B3) 등 괄호 접미사 제거하여 directMap 매칭
  const baseStripped = baseName.replace(/\s*\([A-Za-z0-9-]+\)\s*$/, '').trim();

  // 4. L2-1, L3-1, L1-1 형식 직접 매핑 (템플릿 다운로드와 동일)
  const directMap: Record<string, string> = {
    'L2-1': 'A1', 'L2-2': 'A2', 'L2-3': 'A3', 'L2-4': 'A4', 'L2-5': 'A5',
    'L3-1': 'B1', 'L3-2': 'B2', 'L3-3': 'B3', 'L3-4': 'B4',
    'L1-1': 'C1', 'L1-2': 'C2', 'L1-3': 'C3', 'L1-4': 'C4',
  };

  if (directMap[baseName]) {
    return directMap[baseName];
  }
  if (baseStripped && directMap[baseStripped]) {
    return directMap[baseStripped];
  }

  // 5. 부분 매핑 확인 (시트 이름 앞부분만 일치) - 템플릿과의 호환성
  for (const [key, value] of Object.entries(SHEET_NAME_MAP)) {
    const keyBase = key.split(/\s+/)[0].toLowerCase();
    const nameBase = baseName.toLowerCase();
    if (nameBase === keyBase || trimmedName.toLowerCase().startsWith(keyBase)) {
      return value;
    }
  }

  // 6. 기존 A1~C4 형식 확인 (하위호환)
  // v3.0: A6/B5 IMPORT 제외
  const validNames = [
    'A1', 'A2', 'A3', 'A4', 'A5',
    'B1', 'B2', 'B3', 'B4',
    'C1', 'C2', 'C3', 'C4',
  ];
  if (validNames.includes(trimmedName) || validNames.includes(trimmedName.toUpperCase())) {
    const matched = validNames.find(n => n.toUpperCase() === trimmedName.toUpperCase());
    return matched || trimmedName.toUpperCase();
  }

  // ★★★ 7. 핵심 키워드 기반 유연한 매핑 (2026-02-04) ★★★
  const keywordMap: { keywords: string[]; code: string }[] = [
    { keywords: ['공정번호'], code: 'A1' },
    { keywords: ['공정명'], code: 'A2' },
    { keywords: ['공정기능', '공정설명'], code: 'A3' },
    { keywords: ['제품특성'], code: 'A4' },
    { keywords: ['고장형태', '고장모드'], code: 'A5' },
    // v3.0: 검출관리(A6) IMPORT 제외
    { keywords: ['작업요소', '설비'], code: 'B1' },
    { keywords: ['요소기능'], code: 'B2' },
    { keywords: ['공정특성'], code: 'B3' },
    { keywords: ['고장원인', '원인'], code: 'B4' },
    // v3.0: 예방관리(B5) IMPORT 제외
    { keywords: ['구분', 'YP', 'SP', 'USER'], code: 'C1' },
    { keywords: ['제품기능'], code: 'C2' },
    { keywords: ['요구사항'], code: 'C3' },
    { keywords: ['고장영향', '영향'], code: 'C4' },
  ];

  const lowerName = trimmedName.toLowerCase();
  for (const { keywords, code } of keywordMap) {
    if (keywords.some(kw => lowerName.includes(kw.toLowerCase()))) {
      return code;
    }
  }

  return null;
}

