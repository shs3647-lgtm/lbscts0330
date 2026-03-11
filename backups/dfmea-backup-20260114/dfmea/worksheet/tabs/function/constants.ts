import { COLORS } from '../../constants';

// 기능분석 색상 - 진한녹색 계열 (표준화)
export const FUNC_COLORS = {
  l1Main: '#1b5e20',      // 진한녹색
  l1Sub: '#66bb6a',       // 중간녹색
  l1Cell: '#c8e6c9',      // 연한녹색
  l2Main: '#2e7d32',      // 진한녹색  
  l2Sub: '#81c784',       // 중간녹색
  l2Cell: '#dcedc8',      // 연한녹색
  l3Main: '#388e3c',      // 진한녹색
  l3Sub: '#a5d6a7',       // 중간녹색
  l3Cell: '#e8f5e9',      // 연한녹색
};

export const stickyFirstColStyle: React.CSSProperties = {
  position: 'sticky',
  left: 0,
  zIndex: 10,
};

export const MODAL_CONFIG: Record<string, { title: string; itemCode: string }> = {
  l1Type: { title: '구분 선택', itemCode: 'C1' },
  l1Function: { title: '완제품 기능 선택', itemCode: 'C2' },
  l1Requirement: { title: '요구사항 선택', itemCode: 'C3' },
  l2Function: { title: '공정 기능 선택', itemCode: 'A3' },
  l2ProductChar: { title: '제품특성 선택', itemCode: 'A4' },
  l3Function: { title: '작업요소 기능 선택', itemCode: 'B2' },
  l3ProcessChar: { title: '공정특성 선택', itemCode: 'B3' },
};


