/**
 * @file pmConstants.ts
 * @description PFD 워크시트 상수 정의 (CP cpConstants.ts 패턴)
 *
 * PFD 3개 그룹: 공정정보 > 특성정보 > 흐름정보
 *
 * @version 1.0.0 - PFD 컬럼 정의
 */

// ============ 색상 정의 ============
export const COLORS = {
  // 1. 공정정보 (파란색 계열)
  process: {
    header: '#1565c0',
    headerLight: '#42a5f5',
    cell: '#e3f2fd',
    cellAlt: '#c5d9f0',
  },
  // 2. 특성정보 (녹색 계열)
  char: {
    header: '#2e7d32',
    headerLight: '#66bb6a',
    cell: '#e8f5e9',
    cellAlt: '#c8e6c9',
  },
  // 3. 흐름정보 (주황색 계열)
  flow: {
    header: '#f57c00',
    headerLight: '#ffb74d',
    cell: '#fff3e0',
    cellAlt: '#ffe0b2',
  },
  // ★ 4. 부품명 그룹 (파란색 계열 - CP 동일)
  partGroup: {
    parent: '#90caf9',      // 부모(부품명): 진한 파란색
    parentAlt: '#a2d3fb',   // 부모 홀수행
    child: '#bbdefb',       // 자식: 연한 파란색
    childAlt: '#cce7fc',    // 자식 홀수행
  },
  // ★ 5. 설비 그룹 (녹색 계열 - CP 동일)
  equipGroup: {
    parent: '#a5d6a7',      // 부모(설비): 진한 녹색
    parentAlt: '#b7deb9',   // 부모 홀수행
    child: '#c8e6c9',       // 자식: 연한 녹색
    childAlt: '#d9eed9',    // 자식 홀수행
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
export interface PmColumnDef {
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
  fmeaSync?: boolean;  // PFMEA 연동 컬럼
  editable?: boolean;   // 편집 가능 여부
  type?: 'text' | 'boolean' | 'select' | 'number';  // 입력 타입
}

// PFD 16컬럼 정의 - 고정 폭 (리사이즈 비활성화)
export const PM_COLUMNS: PmColumnDef[] = [
  // ■ 0. 단계 열 (NO)
  {
    id: 0, group: '단계', name: '컬럼', key: 'rowNo', width: 35,
    headerColor: '#90caf9', cellColor: '#e3f2fd', cellAltColor: '#c5d9f0', align: 'center', editable: false
  },

  // ■ 1. 공정현황 (2컬럼)
  {
    id: 1, group: '공정현황', name: '공정번호', key: 'processNo', width: 60,
    headerColor: COLORS.process.headerLight, cellColor: COLORS.process.cell, cellAltColor: COLORS.process.cellAlt, align: 'center', valign: 'middle', fmeaSync: true
  },
  {
    id: 2, group: '공정현황', name: '공정명', key: 'processName', width: 90,
    headerColor: COLORS.process.headerLight, cellColor: COLORS.process.cell, cellAltColor: COLORS.process.cellAlt, align: 'center', valign: 'middle', fmeaSync: true
  },

  // ■ 2. 공정흐름 심볼 (4컬럼) - 공정명 바로 우측 배치
  {
    id: 3, group: '공정흐름', name: '작업', key: 'flowWork', width: 28,
    headerColor: COLORS.flow.headerLight, cellColor: COLORS.flow.cell, cellAltColor: COLORS.flow.cellAlt, align: 'center', type: 'boolean', editable: true
  },
  {
    id: 4, group: '공정흐름', name: '운반', key: 'flowTransport', width: 28,
    headerColor: COLORS.flow.headerLight, cellColor: COLORS.flow.cell, cellAltColor: COLORS.flow.cellAlt, align: 'center', type: 'boolean', editable: true
  },
  {
    id: 5, group: '공정흐름', name: '저장', key: 'flowStorage', width: 28,
    headerColor: COLORS.flow.headerLight, cellColor: COLORS.flow.cell, cellAltColor: COLORS.flow.cellAlt, align: 'center', type: 'boolean', editable: true
  },
  {
    id: 6, group: '공정흐름', name: '검사', key: 'flowInspect', width: 28,
    headerColor: COLORS.flow.headerLight, cellColor: COLORS.flow.cell, cellAltColor: COLORS.flow.cellAlt, align: 'center', type: 'boolean', editable: true
  },

  // ■ 3. 공정상세 (4컬럼)
  {
    id: 7, group: '공정상세', name: '레벨', key: 'processLevel', width: 40,
    headerColor: COLORS.process.headerLight, cellColor: COLORS.process.cell, cellAltColor: COLORS.process.cellAlt, align: 'center', valign: 'middle', type: 'select'
  },
  {
    id: 8, group: '공정상세', name: '공정설명', key: 'processDesc', width: 120,
    headerColor: COLORS.process.headerLight, cellColor: COLORS.process.cell, cellAltColor: COLORS.process.cellAlt, align: 'left', valign: 'middle', fmeaSync: true
  },
  {
    id: 9, group: '공정상세', name: '부품명', key: 'partName', width: 100,
    headerColor: COLORS.process.headerLight, cellColor: COLORS.process.cell, cellAltColor: COLORS.process.cellAlt, align: 'center', valign: 'middle', fmeaSync: true
  },
  {
    id: 10, group: '공정상세', name: '설비/금형/JIG', key: 'equipment', width: 100,
    headerColor: COLORS.process.headerLight, cellColor: COLORS.process.cell, cellAltColor: COLORS.process.cellAlt, align: 'center', valign: 'middle', fmeaSync: true
  },

  // ■ 4. 관리항목 (5컬럼)
  {
    id: 11, group: '관리항목', name: 'NO', key: 'charNo', width: 30,
    headerColor: COLORS.char.headerLight, cellColor: COLORS.char.cell, cellAltColor: COLORS.char.cellAlt, align: 'center', type: 'number'
  },
  {
    id: 12, group: '관리항목', name: '제품SC', key: 'productSC', width: 25,
    headerColor: COLORS.char.headerLight, cellColor: COLORS.char.cell, cellAltColor: COLORS.char.cellAlt, align: 'center', fmeaSync: true, type: 'select'
  },
  {
    id: 13, group: '관리항목', name: '제품특성', key: 'productChar', width: 110,
    headerColor: COLORS.char.headerLight, cellColor: COLORS.char.cell, cellAltColor: COLORS.char.cellAlt, align: 'left', valign: 'middle', fmeaSync: true
  },
  {
    id: 14, group: '관리항목', name: '공정SC', key: 'processSC', width: 25,
    headerColor: COLORS.char.headerLight, cellColor: COLORS.char.cell, cellAltColor: COLORS.char.cellAlt, align: 'center', fmeaSync: true, type: 'select'
  },
  {
    id: 15, group: '관리항목', name: '공정특성', key: 'processChar', width: 120,
    headerColor: COLORS.char.headerLight, cellColor: COLORS.char.cell, cellAltColor: COLORS.char.cellAlt, align: 'left', valign: 'middle', fmeaSync: true
  },
];

// ============ 그룹 스팬 계산 ============
export function calculateGroupSpans(columns: PmColumnDef[]) {
  const groupInfo: { group: string; span: number; color: string }[] = [];
  const seen = new Set<string>();

  columns.forEach(col => {
    if (col.group !== '단계' && !seen.has(col.group)) {
      seen.add(col.group);
      const span = columns.filter(c => c.group === col.group).length;
      // 그룹별 색상
      let color = '#666';
      if (col.group === '공정현황') color = COLORS.process.header;
      else if (col.group === '공정흐름') color = COLORS.flow.header;
      else if (col.group === '공정상세') color = COLORS.process.header;
      else if (col.group === '관리항목') color = COLORS.char.header;
      groupInfo.push({ group: col.group, span, color });
    }
  });

  return groupInfo;
}

// ============ 총 너비 계산 ============
export function calculateTotalWidth() {
  return PM_COLUMNS.reduce((sum, col) => sum + col.width, 0);
}

// ============ 리사이즈 설정 ============
export const RESIZE_CONFIG = {
  disabled: true,     // 리사이즈 비활성화 - 항상 기본 폭 사용
  minWidth: 30,
  maxWidth: 300,
  handleWidth: 4,
};