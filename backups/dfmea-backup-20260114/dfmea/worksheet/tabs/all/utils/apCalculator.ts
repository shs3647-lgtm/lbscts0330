/**
 * @file apCalculator.ts
 * @description AP (Action Priority) 계산 유틸리티
 * @note 사용자 정의 AP 테이블 기반 우선순위 계산
 */

// AP 테이블 데이터 (APTableInline.tsx와 동일)
export const AP_TABLE_DATA: { s: string; o: string; d: ('H' | 'M' | 'L')[] }[] = [
  { s: '9-10', o: '8-10', d: ['H', 'H', 'H', 'H'] },
  { s: '9-10', o: '6-7', d: ['H', 'H', 'H', 'H'] },
  { s: '9-10', o: '4-5', d: ['H', 'H', 'L', 'L'] },
  { s: '9-10', o: '2-3', d: ['H', 'M', 'L', 'L'] },
  { s: '9-10', o: '1', d: ['H', 'L', 'L', 'L'] },
  { s: '7-8', o: '8-10', d: ['H', 'H', 'H', 'H'] },
  { s: '7-8', o: '6-7', d: ['H', 'H', 'M', 'H'] },
  { s: '7-8', o: '4-5', d: ['H', 'M', 'L', 'L'] },
  { s: '7-8', o: '2-3', d: ['M', 'L', 'L', 'L'] },
  { s: '7-8', o: '1', d: ['L', 'L', 'L', 'L'] },
  { s: '4-6', o: '8-10', d: ['H', 'H', 'M', 'L'] },
  { s: '4-6', o: '6-7', d: ['H', 'M', 'L', 'L'] },
  { s: '4-6', o: '4-5', d: ['H', 'M', 'L', 'L'] },
  { s: '4-6', o: '2-3', d: ['M', 'L', 'L', 'L'] },
  { s: '4-6', o: '1', d: ['L', 'L', 'L', 'L'] },
  { s: '2-3', o: '8-10', d: ['M', 'L', 'L', 'L'] },
  { s: '2-3', o: '6-7', d: ['L', 'L', 'L', 'L'] },
  { s: '2-3', o: '4-5', d: ['L', 'L', 'L', 'L'] },
  { s: '2-3', o: '2-3', d: ['L', 'L', 'L', 'L'] },
  { s: '2-3', o: '1', d: ['L', 'L', 'L', 'L'] },
];

/**
 * AP 계산 함수 (사용자 정의 AP 테이블 기준)
 * @param s Severity (1-10)
 * @param o Occurrence (1-10)
 * @param d Detection (1-10)
 * @returns 'H' | 'M' | 'L' | ''
 */
export function calculateAP(s: number, o: number, d: number): 'H' | 'M' | 'L' | '' {
  if (s === 0 || o === 0 || d === 0) return '';
  
  // Severity 범위 결정
  let sRange: string;
  if (s >= 9) sRange = '9-10';
  else if (s >= 7) sRange = '7-8';
  else if (s >= 4) sRange = '4-6';
  else if (s >= 2) sRange = '2-3';
  else return 'L'; // S=1인 경우 L
  
  // Occurrence 범위 결정
  let oRange: string;
  if (o >= 8) oRange = '8-10';
  else if (o >= 6) oRange = '6-7';
  else if (o >= 4) oRange = '4-5';
  else if (o >= 2) oRange = '2-3';
  else oRange = '1';
  
  // Detection 인덱스 결정 (D_HEADERS: ['7-10', '5-6', '2-4', '1'])
  let dIdx: number;
  if (d >= 7) dIdx = 0;
  else if (d >= 5) dIdx = 1;
  else if (d >= 2) dIdx = 2;
  else dIdx = 3;
  
  // 테이블에서 찾기
  const row = AP_TABLE_DATA.find(r => r.s === sRange && r.o === oRange);
  if (row) return row.d[dIdx];
  return 'L';
}

/**
 * AP 색상 가져오기
 * @param ap 'H' | 'M' | 'L' | ''
 * @returns 색상 객체 { bg, text }
 */
export function getAPColor(ap: 'H' | 'M' | 'L' | ''): { bg: string; text: string } {
  const AP_COLORS: Record<'H' | 'M' | 'L' | '', { bg: string; text: string }> = {
    H: { bg: '#dc3545', text: '#fff' },
    M: { bg: '#ffc107', text: '#000' },
    L: { bg: '#28a745', text: '#fff' },
    '': { bg: '#e9ecef', text: '#6c757d' },
  };
  return AP_COLORS[ap];
}

/**
 * RPN 색상 가져오기
 * @param rpn RPN 값
 * @returns 색상 문자열
 */
export function getRPNColor(rpn: number): string {
  if (rpn >= 100) return '#dc3545'; // 빨강
  if (rpn >= 50) return '#ffc107';  // 노랑
  return '#28a745';                 // 녹색
}



