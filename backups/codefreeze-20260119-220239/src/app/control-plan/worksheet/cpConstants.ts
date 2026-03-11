/**
 * @file cpConstants.ts
 * @description Control Plan 워크시트 상수 정의 (PFMEA allTabConstants.ts 패턴)
 * 
 * CP 5개 그룹: 공정현황 > 검출장치 > 관리항목 > 관리방법 > 대응계획
 * 
 * @version 3.0.0 - 컬럼 폭 최적화 (총 1200px, 한 화면 표시)
 */

// ============ 색상 정의 ============
export const COLORS = {
  // 1. 공정현황 (파란색 계열) - 줄무늬 대비 강화
  process: {
    header: '#1565c0',
    headerLight: '#42a5f5',
    cell: '#e3f2fd',      // 짝수 행: 연한 파란색
    cellAlt: '#c5d9f0',   // 홀수 행: 더 진한 파란색 (대비 강화)
  },
  // 2. 관리항목 (녹색 계열) - 줄무늬 대비 강화
  control: {
    header: '#2e7d32',
    headerLight: '#66bb6a',
    cell: '#e8f5e9',      // 짝수 행: 연한 녹색
    cellAlt: '#c8e6c9',   // 홀수 행: 더 진한 녹색 (대비 강화)
  },
  // 3. 관리방법 (주황색 계열) - 줄무늬 대비 강화
  method: {
    header: '#f57c00',
    headerLight: '#ffb74d',
    cell: '#fff3e0',      // 짝수 행: 연한 주황색
    cellAlt: '#ffe0b2',   // 홀수 행: 더 진한 주황색 (대비 강화)
  },
  // 4. 대응계획 (보라색 계열) - 줄무늬 대비 강화
  action: {
    header: '#7b1fa2',
    headerLight: '#ba68c8',
    cell: '#f3e5f5',      // 짝수 행: 연한 보라색
    cellAlt: '#e1bee7',   // 홀수 행: 더 진한 보라색 (대비 강화)
  },
  // 특별특성 색상
  special: {
    CC: '#dc2626',
    SC: '#ea580c',
    IC: '#ca8a04',
  },
};

// ============ 높이 정의 ============
export const HEIGHTS = {
  header1: 28,
  header2: 26,
  header3: 24,
  body: 25,
};

// ============ 셀 스타일 ============
export const CELL_STYLE = {
  padding: '1px',
  fontSize: '11px',
  lineHeight: 1.2,
};

// ============ 컬럼 정의 ============
export interface CPColumnDef {
  id: number;
  group: string;
  name: string;
  key: string;
  width: number;
  headerColor: string;
  cellColor: string;
  cellAltColor: string;
  align: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
  pfmeaSync?: boolean;  // PFMEA 연동 컬럼
  editable?: boolean;   // 편집 가능 여부
  type?: 'text' | 'boolean' | 'select' | 'number';  // 입력 타입
}

// CP 20컬럼 정의 (NO 열 추가, 반응형: minWidth 기준, 브라우저 자동 확장)
// ※ width 값은 최소폭(minWidth)으로 적용됨, 화면 크기에 따라 자동 확장
export const CP_COLUMNS: CPColumnDef[] = [
  // ■ 0. 단계 열 (연한 파란색)
  { id: 0, group: '단계', name: '컬럼', key: 'rowNo', width: 40,
    headerColor: '#90caf9', cellColor: '#e3f2fd', cellAltColor: '#c5d9f0', align: 'center', editable: false },
  // ■ 1. 공정현황 (5컬럼)
  { id: 1, group: '공정현황', name: '공정번호', key: 'processNo', width: 45,
    headerColor: COLORS.control.headerLight, cellColor: COLORS.control.cell, cellAltColor: COLORS.control.cellAlt, align: 'center', pfmeaSync: true },
  { id: 2, group: '공정현황', name: '공정명', key: 'processName', width: 65,
    headerColor: COLORS.control.headerLight, cellColor: COLORS.control.cell, cellAltColor: COLORS.control.cellAlt, align: 'center', pfmeaSync: true },
  { id: 3, group: '공정현황', name: '레벨', key: 'processLevel', width: 45,
    headerColor: COLORS.process.headerLight, cellColor: COLORS.process.cell, cellAltColor: COLORS.process.cellAlt, align: 'center', type: 'select' },
  { id: 4, group: '공정현황', name: '공정설명', key: 'processDesc', width: 160,
    headerColor: COLORS.process.headerLight, cellColor: COLORS.process.cell, cellAltColor: COLORS.process.cellAlt, align: 'left', pfmeaSync: true },
  { id: 5, group: '공정현황', name: '설비/금형/JIG', key: 'workElement', width: 100,
    headerColor: COLORS.process.headerLight, cellColor: COLORS.process.cell, cellAltColor: COLORS.process.cellAlt, align: 'center' },
  
  // ■ 2. 검출장치 (2컬럼)
  { id: 6, group: '검출장치', name: 'EP', key: 'detectorEp', width: 40,
    headerColor: COLORS.control.headerLight, cellColor: COLORS.control.cell, cellAltColor: COLORS.control.cellAlt, align: 'center', type: 'boolean' },
  { id: 7, group: '검출장치', name: '자동', key: 'detectorAuto', width: 40,
    headerColor: COLORS.control.headerLight, cellColor: COLORS.control.cell, cellAltColor: COLORS.control.cellAlt, align: 'center', type: 'boolean' },
  
  // ■ 3. 관리항목 (5컬럼) - NO 추가 (공정별 특성 순번)
  { id: 8, group: '관리항목', name: 'NO', key: 'charNo', width: 25,
    headerColor: '#fff9c4', cellColor: '#fffde7', cellAltColor: '#fff9c4', align: 'center', type: 'number' },
  { id: 9, group: '관리항목', name: '제품특성', key: 'productChar', width: 80,
    headerColor: COLORS.control.headerLight, cellColor: COLORS.control.cell, cellAltColor: COLORS.control.cellAlt, align: 'center', pfmeaSync: true },
  { id: 10, group: '관리항목', name: '공정특성', key: 'processChar', width: 80,
    headerColor: '#ffeb3b', cellColor: '#fffde7', cellAltColor: '#fff9c4', align: 'center', pfmeaSync: true },
  { id: 11, group: '관리항목', name: '특별특성', key: 'specialChar', width: 35,
    headerColor: COLORS.control.headerLight, cellColor: COLORS.control.cell, cellAltColor: COLORS.control.cellAlt, align: 'center', pfmeaSync: true, type: 'select' },
  { id: 12, group: '관리항목', name: '스펙/공차', key: 'specTolerance', width: 75,
    headerColor: COLORS.control.headerLight, cellColor: COLORS.control.cell, cellAltColor: COLORS.control.cellAlt, align: 'center' },
  
  // ■ 4. 관리방법 (6컬럼) = 290px
  { id: 13, group: '관리방법', name: '평가방법', key: 'evalMethod', width: 70,
    headerColor: COLORS.method.headerLight, cellColor: COLORS.method.cell, cellAltColor: COLORS.method.cellAlt, align: 'center' },
  { id: 14, group: '관리방법', name: '샘플', key: 'sampleSize', width: 35,
    headerColor: COLORS.method.headerLight, cellColor: COLORS.method.cell, cellAltColor: COLORS.method.cellAlt, align: 'center' },
  { id: 15, group: '관리방법', name: '주기', key: 'sampleFreq', width: 45,
    headerColor: COLORS.method.headerLight, cellColor: COLORS.method.cell, cellAltColor: COLORS.method.cellAlt, align: 'center', type: 'select' },
  { id: 16, group: '관리방법', name: '관리방법', key: 'controlMethod', width: 80,
    headerColor: COLORS.method.headerLight, cellColor: COLORS.method.cell, cellAltColor: COLORS.method.cellAlt, align: 'center', pfmeaSync: true },
  { id: 17, group: '관리방법', name: '책임1', key: 'owner1', width: 50,
    headerColor: COLORS.method.headerLight, cellColor: COLORS.method.cell, cellAltColor: COLORS.method.cellAlt, align: 'center', type: 'select' },
  { id: 18, group: '관리방법', name: '책임2', key: 'owner2', width: 50,
    headerColor: COLORS.method.headerLight, cellColor: COLORS.method.cell, cellAltColor: COLORS.method.cellAlt, align: 'center', type: 'select' },
  
  // ■ 5. 대응계획 (1컬럼)
  { id: 19, group: '대응계획', name: '대응계획', key: 'reactionPlan', width: 200,
    headerColor: COLORS.action.headerLight, cellColor: COLORS.action.cell, cellAltColor: COLORS.action.cellAlt, align: 'center' },
];

// ============ 그룹 정의 ============
export const CP_GROUPS = [
  { name: '공정현황', color: COLORS.process.header, colspan: 5 },
  { name: '검출장치', color: COLORS.control.header, colspan: 2 },
  { name: '관리항목', color: COLORS.control.header, colspan: 5 },
  { name: '관리방법', color: COLORS.method.header, colspan: 6 },
  { name: '대응계획', color: COLORS.action.header, colspan: 1 },
];

// ============ 그룹별 스팬 계산 ============
export function calculateGroupSpans(columns: CPColumnDef[]): Array<{ group: string; span: number; color: string }> {
  const spans: Array<{ group: string; span: number; color: string }> = [];
  let currentGroup = '';
  let currentSpan = 0;
  let currentColor = '';
  
  columns.forEach((col, idx) => {
    // 단계 열은 그룹 스팬 계산에서 제외
    if (col.group === '단계') {
      return;
    }
    
    if (col.group !== currentGroup) {
      if (currentGroup) {
        spans.push({ group: currentGroup, span: currentSpan, color: currentColor });
      }
      currentGroup = col.group;
      currentSpan = 1;
      currentColor = CP_GROUPS.find(g => g.name === col.group)?.color || '#666';
    } else {
      currentSpan++;
    }
    
    // 마지막 열 처리 (단계 열 제외한 마지막 열)
    const remainingCols = columns.slice(idx + 1).filter(c => c.group !== '단계');
    if (remainingCols.length === 0) {
      spans.push({ group: currentGroup, span: currentSpan, color: currentColor });
    }
  });
  
  return spans;
}

// ============ 총 너비 계산 ============
export function calculateTotalWidth(): number {
  return CP_COLUMNS.reduce((sum, col) => sum + col.width, 0);
}

// ============ 드롭다운 옵션 ============
export const SPECIAL_CHAR_OPTIONS = [
  { value: '', label: '-' },
  { value: 'CC', label: 'CC' },
  { value: 'SC', label: 'SC' },
  { value: 'IC', label: 'IC' },
];

export const FREQUENCY_OPTIONS = [
  'LOT', '전수', '셋업', '1/H', '1/Shift', '1/Day', '1/Week', '1/Month'
];

export const AP_OPTIONS = [
  { value: 'H', label: 'H', color: '#dc2626' },
  { value: 'M', label: 'M', color: '#f59e0b' },
  { value: 'L', label: 'L', color: '#22c55e' },
];

export const OWNER_OPTIONS = [
  '생산', '품질', '연구', '기술', '물류', '설비'
];

export const LEVEL_OPTIONS = [
  'Main', 'Sub', '외주'
];

// ============ 컬럼 리사이즈 설정 ============
export const RESIZE_CONFIG = {
  minRatio: 0.8,    // 최소 80% (기본폭 대비)
  maxRatio: 1.2,    // 최대 120% (기본폭 대비)
  handleWidth: 6,   // 리사이즈 핸들 폭
  // 120% 이하에서 텍스트 축소 적용 (폰트 사이즈 조정)
  textScaleThreshold: 1.0,  // 100% 이하일 때 텍스트 축소 시작
  minFontSize: 8,           // 최소 폰트 크기 (px)
  defaultFontSize: 11,      // 기본 폰트 크기 (px)
};

// ============ 컬럼별 기본폭 및 리사이즈 범위 계산 ============
export function getColumnResizeBounds(colId: number): { min: number; max: number; default: number } {
  const col = CP_COLUMNS.find(c => c.id === colId);
  if (!col) return { min: 30, max: 300, default: 80 };

  return {
    min: Math.floor(col.width * RESIZE_CONFIG.minRatio),
    max: Math.ceil(col.width * RESIZE_CONFIG.maxRatio),
    default: col.width,
  };
}

// ============ 텍스트 폰트 크기 계산 (폭 기준) ============
export function calculateFontSize(currentWidth: number, defaultWidth: number): number {
  const ratio = currentWidth / defaultWidth;

  // 100% 이상이면 기본 폰트
  if (ratio >= RESIZE_CONFIG.textScaleThreshold) {
    return RESIZE_CONFIG.defaultFontSize;
  }

  // 80% ~ 100%: 선형적으로 폰트 축소
  const scale = (ratio - RESIZE_CONFIG.minRatio) / (RESIZE_CONFIG.textScaleThreshold - RESIZE_CONFIG.minRatio);
  const fontSize = RESIZE_CONFIG.minFontSize + (RESIZE_CONFIG.defaultFontSize - RESIZE_CONFIG.minFontSize) * scale;

  return Math.max(RESIZE_CONFIG.minFontSize, Math.round(fontSize));
}
