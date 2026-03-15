/**
 * @file cpConstants.ts
 * @description Control Plan 워크시트 상수 정의 (PFMEA allTabConstants.ts 패턴)
 * 
 * CP 4개 그룹: 공정현황 > 관리항목 > 관리방법 > 조치방법
 * 
 * @version 3.0.0 - 컬럼 폭 최적화 (총 1200px, 한 화면 표시)
 */

// ============ 색상 정의 (PFD 스타일: 1행>2행>3행>데이터셀 순서로 연해짐) ============
export const COLORS = {
  // 1. 공정현황 (파란색 계열)
  process: {
    header: '#1565c0',      // 1행: 진한 파란색
    headerLight: '#42a5f5', // 2행: 연한 파란색
    header3: '#90caf9',     // 3행: 더 연한 파란색
    cell: '#e3f2fd',        // 데이터 짝수행: 가장 연한 파란색 (3행보다 연함)
    cellAlt: '#f0f7ff',     // 데이터 홀수행: 더 연한 파란색
    empty: '#ffffff',       // 미입력: 흰색
  },
  // 2. 관리항목 (녹색 계열)
  control: {
    header: '#2e7d32',      // 1행: 진한 녹색
    headerLight: '#66bb6a', // 2행: 연한 녹색
    header3: '#a5d6a7',     // 3행: 더 연한 녹색
    cell: '#e8f5e9',        // 데이터 짝수행: 가장 연한 녹색
    cellAlt: '#f1f8f2',     // 데이터 홀수행: 더 연한 녹색
    empty: '#ffffff',       // 미입력: 흰색
  },
  // 3. 관리방법 (청록색 계열) - 더 어둡게 조정
  method: {
    header: '#0d9488',      // 1행: 진한 청록색
    headerLight: '#14b8a6', // 2행: 연한 청록색 (더 어둡게)
    header3: '#5eead4',     // 3행: 더 연한 청록색 (더 어둡게)
    cell: '#ccfbf1',        // 데이터 짝수행: 가장 연한 청록색
    cellAlt: '#e6fef8',     // 데이터 홀수행: 더 연한 청록색
    empty: '#ffffff',       // 미입력: 흰색
  },
  // 4. 조치방법 (남색 계열)
  action: {
    header: '#4338ca',      // 1행: 진한 남색
    headerLight: '#818cf8', // 2행: 연한 남색
    header3: '#a5b4fc',     // 3행: 더 연한 남색
    cell: '#e0e7ff',        // 데이터 짝수행: 가장 연한 남색
    cellAlt: '#eef2ff',     // 데이터 홀수행: 더 연한 남색
    empty: '#ffffff',       // 미입력: 흰색
  },
  // ★ 5. 부품명 그룹 (파란색 계열 - 부모: 부품명, 자식: 제품특성 이하)
  partGroup: {
    parent: '#90caf9',      // 부모(부품명): 진한 파란색
    parentAlt: '#a2d3fb',   // 부모 홀수행
    child: '#bbdefb',       // 자식: 연한 파란색
    childAlt: '#cce7fc',    // 자식 홀수행
  },
  // ★ 6. 설비 그룹 (녹색 계열 - 부모: 설비/금형/JIG, 자식: 공정특성 이하)
  // - 밝기를 부품명 그룹과 동일하게 조정
  equipGroup: {
    parent: '#a5d6a7',      // 부모(설비): 진한 녹색 (밝기 맞춤)
    parentAlt: '#b7deb9',   // 부모 홀수행
    child: '#c8e6c9',       // 자식: 연한 녹색 (밝기 맞춤)
    childAlt: '#d9eed9',    // 자식 홀수행
  },
  // 특별특성 색상
  special: {
    '★': '#dc2626',    // 제품 특별특성 (레거시 CC)
    '◇': '#ea580c',    // 공정 특별특성 (레거시 SC)
    CC: '#dc2626',      // 레거시 호환
    SC: '#ea580c',      // 레거시 호환
    IC: '#ca8a04',
  },
  // 7. PFMEA 참조 (주황색 계열)
  pfmeaRef: {
    header: '#c2410c',
    headerLight: '#ea580c',
    header3: '#fb923c',
    cell: '#fff7ed',
    cellAlt: '#ffedd5',
    empty: '#ffffff',
  },
};

// ============ 높이 정의 ============
export const HEIGHTS = {
  header1: 24,
  header2: 30,
  header3: 22,
  body: 20,
};

// ============ 셀 스타일 ============
export const CELL_STYLE = {
  padding: '1px',
  fontSize: '9px',       // 반응형 70~130% 최적화
  lineHeight: 1.15,      // 줄바꿈 시 가독성
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
  {
    id: 0, group: '단계(Step)', name: '컬럼(Col.)', key: 'rowNo', width: 40,
    headerColor: '#90caf9', cellColor: '#e3f2fd', cellAltColor: '#c5d9f0', align: 'center', editable: false
  },
  // ■ 1. 공정현황 (5컬럼) - 모두 연한 파란색
  {
    id: 1, group: '공정현황(Process Status)', name: '공정번호(P-No)', key: 'processNo', width: 55,
    headerColor: COLORS.process.headerLight, cellColor: COLORS.process.cell, cellAltColor: COLORS.process.cellAlt, align: 'center', pfmeaSync: true
  },
  {
    id: 2, group: '공정현황(Process Status)', name: '공정명(Process Name)', key: 'processName', width: 80,
    headerColor: COLORS.process.headerLight, cellColor: COLORS.process.cell, cellAltColor: COLORS.process.cellAlt, align: 'center', pfmeaSync: true
  },
  {
    id: 3, group: '공정현황(Process Status)', name: '레벨(Level)', key: 'processLevel', width: 50,
    headerColor: COLORS.process.headerLight, cellColor: COLORS.process.cell, cellAltColor: COLORS.process.cellAlt, align: 'center', type: 'select'
  },
  {
    id: 4, group: '공정현황(Process Status)', name: '공정설명(Process Desc.)', key: 'processDesc', width: 160,
    headerColor: COLORS.process.headerLight, cellColor: COLORS.process.cell, cellAltColor: COLORS.process.cellAlt, align: 'left', pfmeaSync: true
  },
  // ✅ 부품명 컬럼 추가 (CP↔PFD 연동)
  {
    id: 5, group: '공정현황(Process Status)', name: '부품명(Part Name)', key: 'partName', width: 80,
    headerColor: COLORS.process.headerLight, cellColor: COLORS.process.cell, cellAltColor: COLORS.process.cellAlt, align: 'center'
  },
  {
    id: 6, group: '공정현황(Process Status)', name: '설비/금형/JIG(Equip.)', key: 'equipment', width: 80,
    headerColor: COLORS.process.headerLight, cellColor: COLORS.process.cell, cellAltColor: COLORS.process.cellAlt, align: 'center', pfmeaSync: true
  },

  // ■ 2. 관리항목 (7컬럼: 검출장치 2 + 관리항목 5)
  {
    id: 7, group: '관리항목(Control Item)', name: 'EP', key: 'detectorEp', width: 30,
    headerColor: COLORS.control.headerLight, cellColor: COLORS.control.cell, cellAltColor: COLORS.control.cellAlt, align: 'center', type: 'boolean'
  },
  {
    id: 8, group: '관리항목(Control Item)', name: '자동검사(Auto Ins.)', key: 'detectorAuto', width: 48,
    headerColor: COLORS.control.headerLight, cellColor: COLORS.control.cell, cellAltColor: COLORS.control.cellAlt, align: 'center', type: 'boolean'
  },
  // ■ 관리항목 계속 (NO, 제품특성, 공정특성, 특별특성, 스펙/공차)
  {
    id: 9, group: '관리항목(Control Item)', name: 'NO', key: 'charNo', width: 28,
    headerColor: COLORS.control.headerLight, cellColor: COLORS.control.cell, cellAltColor: COLORS.control.cellAlt, align: 'center', type: 'number'
  },
  {
    id: 10, group: '관리항목(Control Item)', name: '제품특성(Prod. Char.)', key: 'productChar', width: 80,
    headerColor: COLORS.control.headerLight, cellColor: COLORS.control.cell, cellAltColor: COLORS.control.cellAlt, align: 'center', pfmeaSync: true
  },
  {
    id: 11, group: '관리항목(Control Item)', name: '공정특성(Proc. Char.)', key: 'processChar', width: 80,
    headerColor: COLORS.control.headerLight, cellColor: COLORS.control.cell, cellAltColor: COLORS.control.cellAlt, align: 'center', pfmeaSync: true
  },
  {
    id: 12, group: '관리항목(Control Item)', name: '특별특성(SC)', key: 'specialChar', width: 50,
    headerColor: COLORS.control.headerLight, cellColor: COLORS.control.cell, cellAltColor: COLORS.control.cellAlt, align: 'center', pfmeaSync: true, type: 'select'
  },
  {
    id: 13, group: '관리항목(Control Item)', name: '스펙/공차(Spec/Tol.)', key: 'specTolerance', width: 75,
    headerColor: COLORS.control.headerLight, cellColor: COLORS.control.cell, cellAltColor: COLORS.control.cellAlt, align: 'center'
  },

  // ■ 4. 관리방법 (6컬럼) = 350px
  {
    id: 14, group: '관리방법(Control Method)', name: '평가방법(Eval. Method)', key: 'evalMethod', width: 75,
    headerColor: COLORS.method.headerLight, cellColor: COLORS.method.cell, cellAltColor: COLORS.method.cellAlt, align: 'center'
  },
  {
    id: 15, group: '관리방법(Control Method)', name: '샘플크기(Sample)', key: 'sampleSize', width: 50,
    headerColor: COLORS.method.headerLight, cellColor: COLORS.method.cell, cellAltColor: COLORS.method.cellAlt, align: 'center'
  },
  {
    id: 16, group: '관리방법(Control Method)', name: '주기(Freq.)', key: 'sampleFreq', width: 55,
    headerColor: COLORS.method.headerLight, cellColor: COLORS.method.cell, cellAltColor: COLORS.method.cellAlt, align: 'center', type: 'select'
  },
  {
    id: 17, group: '관리방법(Control Method)', name: '관리방법(Ctrl. Method)', key: 'controlMethod', width: 80,
    headerColor: COLORS.method.headerLight, cellColor: COLORS.method.cell, cellAltColor: COLORS.method.cellAlt, align: 'center', pfmeaSync: true
  },
  {
    id: 18, group: '관리방법(Control Method)', name: '책임1(Owner1)', key: 'owner1', width: 48,
    headerColor: COLORS.method.headerLight, cellColor: COLORS.method.cell, cellAltColor: COLORS.method.cellAlt, align: 'center', type: 'select'
  },
  {
    id: 19, group: '관리방법(Control Method)', name: '책임2(Owner2)', key: 'owner2', width: 48,
    headerColor: COLORS.method.headerLight, cellColor: COLORS.method.cell, cellAltColor: COLORS.method.cellAlt, align: 'center', type: 'select'
  },

  // ■ 5. 대응계획 (1컬럼) - 그룹명: 대응계획, 컬럼명: 조치방법
  {
    id: 20, group: '대응계획(Reaction Plan)', name: '조치방법(Reaction)', key: 'reactionPlan', width: 160,
    headerColor: COLORS.action.headerLight, cellColor: COLORS.action.cell, cellAltColor: COLORS.action.cellAlt, align: 'center'
  },

  // ■ 6. PFMEA 참조 (4컬럼: S, O, D, AP — 읽기전용)
  {
    id: 21, group: 'PFMEA참조(PFMEA Ref.)', name: 'S', key: 'refSeverity', width: 28,
    headerColor: COLORS.pfmeaRef.headerLight, cellColor: COLORS.pfmeaRef.cell, cellAltColor: COLORS.pfmeaRef.cellAlt, align: 'center', editable: false, type: 'number', pfmeaSync: true
  },
  {
    id: 22, group: 'PFMEA참조(PFMEA Ref.)', name: 'O', key: 'refOccurrence', width: 28,
    headerColor: COLORS.pfmeaRef.headerLight, cellColor: COLORS.pfmeaRef.cell, cellAltColor: COLORS.pfmeaRef.cellAlt, align: 'center', editable: false, type: 'number', pfmeaSync: true
  },
  {
    id: 23, group: 'PFMEA참조(PFMEA Ref.)', name: 'D', key: 'refDetection', width: 28,
    headerColor: COLORS.pfmeaRef.headerLight, cellColor: COLORS.pfmeaRef.cell, cellAltColor: COLORS.pfmeaRef.cellAlt, align: 'center', editable: false, type: 'number', pfmeaSync: true
  },
  {
    id: 24, group: 'PFMEA참조(PFMEA Ref.)', name: 'AP', key: 'refAp', width: 30,
    headerColor: COLORS.pfmeaRef.headerLight, cellColor: COLORS.pfmeaRef.cell, cellAltColor: COLORS.pfmeaRef.cellAlt, align: 'center', editable: false, type: 'select', pfmeaSync: true
  },
];

// ============ 그룹 정의 (4개 그룹) ============
export const CP_GROUPS = [
  { name: '공정현황(Process Status)', color: COLORS.process.header, colspan: 6 },
  { name: '관리항목(Control Item)', color: COLORS.control.header, colspan: 7 },
  { name: '관리방법(Control Method)', color: COLORS.method.header, colspan: 6 },
  { name: '대응계획(Reaction Plan)', color: COLORS.action.header, colspan: 1 },
  { name: 'PFMEA참조(PFMEA Ref.)', color: COLORS.pfmeaRef.header, colspan: 4 },
];

// ============ 그룹별 스팬 계산 ============
export function calculateGroupSpans(columns: CPColumnDef[]): Array<{ group: string; span: number; color: string }> {
  const spans: Array<{ group: string; span: number; color: string }> = [];
  let currentGroup = '';
  let currentSpan = 0;
  let currentColor = '';

  columns.forEach((col, idx) => {
    // 단계 열은 그룹 스팬 계산에서 제외
    if (col.group.startsWith('단계')) {
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
    const remainingCols = columns.slice(idx + 1).filter(c => !c.group.startsWith('단계'));
    if (remainingCols.length === 0) {
      spans.push({ group: currentGroup, span: currentSpan, color: currentColor });
    }
  });

  return spans;
}

// ============ 부품명 표시 여부에 따른 컬럼 반환 ============
/** A=부품명 숨김(기본), B=부품명 표시(DFMEA연동) */
export function getCPColumns(showPartName: boolean): CPColumnDef[] {
  if (showPartName) return CP_COLUMNS;
  return CP_COLUMNS.filter(col => col.key !== 'partName');
}

// ============ 총 너비 계산 ============
export function calculateTotalWidth(columns?: CPColumnDef[]): number {
  return (columns || CP_COLUMNS).reduce((sum, col) => sum + col.width, 0);
}

// ============ 드롭다운 옵션 ============
// CC: 중요특성 (Critical Characteristic)
// IC: 중요특성 (Important Characteristic)
// ★ 제품SC, 공정SC는 드롭다운 옵션이 아님 - 탭 필터 라벨로만 사용
export const SPECIAL_CHAR_OPTIONS = [
  { value: '', label: '-' },
  { value: '★', label: '★ (제품 특별특성)' },
  { value: '◇', label: '◇ (공정 특별특성)' },
];

export const FREQUENCY_OPTIONS = [
  // 기본 옵션
  'LOT', '전수', '셋업', '1/H', '1/Shift', '1/Day', '1/Week', '1/Month',
  // 확장 옵션 (실제 사용 데이터)
  '매입고', '매Lot', '매Batch', '매시', '수시', '일일', '주간', '월간',
];

export const AP_OPTIONS = [
  { value: 'H', label: 'H', color: '#dc2626' },
  { value: 'M', label: 'M', color: '#f59e0b' },
  { value: 'L', label: 'L', color: '#22c55e' },
];

export const OWNER_OPTIONS = [
  // 기본 부서
  '생산', '품질', '연구', '기술', '물류', '설비',
  // 확장 옵션 (팀/직책)
  '품질팀', '생산팀', '검사원', '작업자', '공정팀장', '품질팀장', '생산팀장',
  '기술팀', '연구팀', '물류팀', '설비팀',
];

export const LEVEL_OPTIONS = [
  'Main', 'Sub', '외주'
];

// ============ 컬럼 리사이즈 설정 ============
export const RESIZE_CONFIG = {
  minRatio: 0.8,    // 최소 80% (기본폭 대비)
  maxRatio: 1.5,    // 최대 150% (기본폭 대비)
  handleWidth: 6,   // 리사이즈 핸들 폭
  // 80~120% 범위에서 텍스트 크기 최적화
  textScaleThreshold: 1.2,  // 120% 이하일 때 텍스트 축소 시작
  minFontSize: 7,           // 최소 폰트 크기 (px) - 80%
  defaultFontSize: 9,       // 기본 폰트 크기 (px) - 반응형 최적화
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
