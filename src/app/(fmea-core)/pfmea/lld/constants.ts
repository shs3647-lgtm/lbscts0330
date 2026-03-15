/**
 * @file constants.ts
 * @description LLD 테이블 컬럼 정의 + 엑셀 Import/Export 헤더
 */

// ── 테이블 컬럼 정의 ──
export const COLUMNS = [
  { ko: 'LLD No', w: '4.5%', key: 'lldNo' },
  { ko: '구분', w: '3.5%', key: 'classification' },
  { ko: '제품명', w: '5%', key: 'productName' },
  { ko: '공정명', w: '4.5%', key: 'processName' },
  { ko: '고장형태\n(FM)', w: '8%', key: 'failureMode' },
  { ko: '고장원인\n(FC)', w: '8%', key: 'cause' },
  { ko: 'S', w: '1.8%', key: 'severity' },
  { ko: 'O', w: '1.8%', key: 'occurrence' },
  { ko: 'D', w: '1.8%', key: 'detection' },
  { ko: '예방관리\n개선', w: '', key: 'preventionImprovement' },
  { ko: '검출관리\n개선', w: '', key: 'detectionImprovement' },
  { ko: '개선\n일자', w: '4.5%', key: 'completedDate' },
  { ko: '상\n태', w: '2%', key: 'status' },
  { ko: '담당\n자', w: '3%', key: 'owner' },
  { ko: 'FMEA', w: '3.5%', key: 'fmeaId' },
  { ko: '첨부', w: '2.5%', key: 'attachmentUrl' },
  { ko: '', w: '1.2%', key: '' },
] as const;

export const COL_COUNT = COLUMNS.length;
export const ROW_HEIGHT = 28;

// ── 엑셀 Import/Export 헤더 ──
export const EXCEL_HEADERS = [
  'LLD_No', '구분', '제품명', '공정명',
  '고장형태', '고장원인',
  'S값', 'O값', 'D값',
  '예방관리 개선', '검출관리 개선',
  '개선일자', '상태', '담당자',
  '첨부(근거서류)',
  // 숨겨진 필드 (Import/Export 호환)
  '적용', '공정번호', '차종', '대상', '4M', '발생장소',
  '적용FMEA', '적용일자',
];

export const EXCEL_COL_WIDTHS = [
  12, 10, 15, 15,
  25, 25,
  6, 6, 6,
  35, 35,
  12, 6, 10,
  20,
  // 숨겨진 필드
  8, 10, 10, 8, 6, 12,
  15, 12,
];
