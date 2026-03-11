/**
 * @file apCalculator.ts
 * @description AP(Action Priority) 계산 로직
 */

// AP 테이블 데이터 (사용자 정의 테이블)
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
  
  // Detection 컬럼 인덱스 결정 (1-3, 4-5, 6-7, 8-10)
  let dIdx: number;
  if (d >= 8) dIdx = 0;
  else if (d >= 6) dIdx = 1;
  else if (d >= 4) dIdx = 2;
  else dIdx = 3;
  
  // AP 테이블에서 값 찾기
  const row = AP_TABLE_DATA.find(r => r.s === sRange && r.o === oRange);
  return row ? row.d[dIdx] : 'L';
}

/**
 * AP 배경색 반환
 */
export function getAPBackgroundColor(ap: 'H' | 'M' | 'L' | ''): string {
  if (ap === 'H') return '#ef5350';
  if (ap === 'M') return '#ffa726';
  if (ap === 'L') return '#66bb6a';
  return '#f5f5f5';
}

/**
 * AP 텍스트 색상 반환
 */
export function getAPTextColor(ap: 'H' | 'M' | 'L' | ''): string {
  if (ap === 'H' || ap === 'M' || ap === 'L') return '#fff';
  return '#999';
}



