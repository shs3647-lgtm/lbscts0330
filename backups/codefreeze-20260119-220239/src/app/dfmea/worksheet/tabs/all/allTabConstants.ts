// @ts-nocheck
/**
 * @file allTabConstants.ts
 * @description ALL 화면 색상, 컬럼 정의 및 유틸리티
 */

import { L1, L2, L3 } from '@/styles/worksheet';

// ============ 색상 정의 (구조분석 기준 통일) ============
export const COLORS = {
  // 2단계: 구조분석 (컬럼별 개별 색상)
  structure: {
    product: { header: L1.header, headerLight: L1.headerLight, cell: L1.cell, cellAlt: L1.cellAlt },
    main: { header: L2.header, headerLight: L2.headerLight, cell: L2.cell, cellAlt: L2.cellAlt },
    // DFMEA: m4 제거됨
    workElement: { header: '#f57c00', headerLight: '#ff9800', cell: '#ffe0b1', cellAlt: '#ffcc80' },
  },
  // 3단계: 기능분석 (컬럼별 개별 색상)
  function: {
    division: { header: '#1565c0', headerLight: '#42a5f5', cell: '#e3f2fd', cellAlt: '#bbdefb' },
    productFunc: { header: '#1976d2', headerLight: '#64b5f6', cell: '#e1f5fe', cellAlt: '#b3e5fc' },
    requirement: { header: '#7b1fa2', headerLight: '#ba68c8', cell: '#f3e5f5', cellAlt: '#e1bee7' },
    processFunc: { header: '#2e7d32', headerLight: '#66bb6a', cell: '#e8f5e9', cellAlt: '#c8e6c9' },
    productChar: { header: '#388e3c', headerLight: '#81c784', cell: '#f1f8e9', cellAlt: '#dcedc8' },
    workFunc: { header: '#ef6c00', headerLight: '#ffa726', cell: '#fff3e0', cellAlt: '#ffe0b2' },
    processChar: { header: '#fb8c00', headerLight: '#ffb74d', cell: '#fff8e1', cellAlt: '#ffecb3' },
  },
  // 4단계: 고장분석 (FE=노랑, FM=네이비, FC=연두)
  failure: {
    fe: { header: '#f9a825', headerLight: '#fdd835', cell: '#fffde7', cellAlt: '#fff9c4' },
    fm: { header: '#303f9f', headerLight: '#5c6bc0', cell: '#e8eaf6', cellAlt: '#c5cae9' },
    fc: { header: '#388e3c', headerLight: '#66bb6a', cell: '#e8f5e9', cellAlt: '#c8e6c9' },
  },
  // 5단계: 리스크분석 (3색 시스템)
  risk: {
    prevention: { header: '#1565c0', headerLight: '#42a5f5', cell: '#e3f2fd', cellAlt: '#bbdefb' },
    detection: { header: '#2e7d32', headerLight: '#66bb6a', cell: '#e8f5e9', cellAlt: '#c8e6c9' },
    evaluation: { header: '#1a237e', headerLight: '#3949ab', cell: '#e8eaf6', cellAlt: '#c5cae9' },
  },
  // 6단계: 최적화 (컬럼별 색상)
  optimization: {
    prevention: { header: '#1565c0', headerLight: '#42a5f5', cell: '#e3f2fd', cellAlt: '#bbdefb' },
    detection: { header: '#2e7d32', headerLight: '#66bb6a', cell: '#e8f5e9', cellAlt: '#c8e6c9' },
    person: { header: '#7b1fa2', headerLight: '#ab47bc', cell: '#f3e5f5', cellAlt: '#e1bee7' },
    date: { header: '#00838f', headerLight: '#26c6da', cell: '#e0f7fa', cellAlt: '#b2ebf2' },
    status: { header: '#ef6c00', headerLight: '#ffa726', cell: '#fff3e0', cellAlt: '#ffe0b2' },
    result: { header: '#558b2f', headerLight: '#7cb342', cell: '#f1f8e9', cellAlt: '#dcedc8' },
    complete: { header: '#00695c', headerLight: '#26a69a', cell: '#e0f2f1', cellAlt: '#b2dfdb' },
    severity: { header: '#e65100', headerLight: '#ff9800', cell: '#fff3e0', cellAlt: '#ffe0b2' },
    occurrence: { header: '#e65100', headerLight: '#ff9800', cell: '#fff3e0', cellAlt: '#ffe0b2' },
    detection2: { header: '#e65100', headerLight: '#ff9800', cell: '#fff3e0', cellAlt: '#ffe0b2' },
    special: { header: '#283593', headerLight: '#5c6bc0', cell: '#e8eaf6', cellAlt: '#c5cae9' },
    ap: { header: '#f9a825', headerLight: '#ffeb3b', cell: '#fffde7', cellAlt: '#fff9c4' },
    note: { header: '#5d4037', headerLight: '#8d6e63', cell: '#efebe9', cellAlt: '#d7ccc8' },
    monitoring: { header: '#558b2f', headerLight: '#7cb342', cell: '#f1f8e9', cellAlt: '#dcedc8' },
    evaluation: { header: '#d84315', headerLight: '#ff7043', cell: '#fbe9e7', cellAlt: '#ffccbc' },
  },
};

// ============ 높이 정의 ============
export const HEIGHTS = {
  header1: 28,
  header2: 26,
  header3: 24,
  body: 22, // 2px 축소하여 더 컴팩트하게
};

// ============ 셀 스타일 최적화 (2026-01-11) ============
export const CELL_STYLE = {
  padding: '1px 2px',       // 최소 패딩 (가로 2px, 세로 1px)
  fontSize: '10px',         // 기본 폰트 크기
  fontSizeCompact: '9px',   // 컴팩트 폰트 크기
  lineHeight: 1.2,          // 120% 줄 높이
  maxLines: 2,              // 최대 2줄 (120% 이상 시 줄바꿈)
};

// ============ FM 구분선 스타일 (2026-01-11) ============
export const FM_DIVIDER = {
  borderWidth: '2px',
  borderColor: '#5c6bc0',   // FM 헤더 색상과 동일
  borderStyle: 'solid',
};

// ============ 단계별 세로 구분선 (2026-01-11) ============
export const STEP_DIVIDER = {
  borderWidth: '2px',
  borderColor: '#333',      // 진한 회색
  borderStyle: 'solid',
};

// 각 단계의 첫 번째 컬럼 ID (세로 구분선 적용 대상) (DFMEA: 4M 제거로 인덱스 조정)
export const STEP_FIRST_COLUMN_IDS = [1, 4, 11, 15, 22]; // 구조분석, 기능분석, 고장분석, 리스크분석, 최적화

// ============ 컬럼 정의 ============
export interface ColumnDef {
  id: number;
  step: string;
  group: string;
  name: string;
  width: number;
  headerColor: string;
  cellColor: string;
  cellAltColor: string;
  align: 'left' | 'center' | 'right';
  isRPN?: boolean;
  isDark?: boolean;
}

// 기본화면 34컬럼 (DFMEA: 4M 제거, RPN 제외)
export const COLUMNS_BASE: ColumnDef[] = [
  // ■ 2단계: 구조분석 (3컬럼) (DFMEA: 4M 제거)
  { id: 1, step: '구조분석', group: '1. 제품명', name: '제품명', width: 160, 
    headerColor: COLORS.structure.product.headerLight, cellColor: COLORS.structure.product.cell, cellAltColor: COLORS.structure.product.cellAlt, align: 'left' },
  { id: 2, step: '구조분석', group: '2. A\'SSY명', name: 'A\'SSY명', width: 140, 
    headerColor: COLORS.structure.main.headerLight, cellColor: COLORS.structure.main.cell, cellAltColor: COLORS.structure.main.cellAlt, align: 'left' },
  // DFMEA: 4M 제거됨 (id: 3)
  { id: 4, step: '구조분석', group: '3. 부품 또는 특성', name: '부품 또는 특성', width: 140, 
    headerColor: COLORS.structure.workElement.headerLight, cellColor: COLORS.structure.workElement.cell, cellAltColor: COLORS.structure.workElement.cellAlt, align: 'left' },
  
  // ■ 3단계: 기능분석 (7컬럼)
  { id: 5, step: '기능분석', group: '1. 제품 기능/요구사항', name: '구분', width: 50, 
    headerColor: COLORS.function.division.headerLight, cellColor: COLORS.function.division.cell, cellAltColor: COLORS.function.division.cellAlt, align: 'center' },
  { id: 6, step: '기능분석', group: '1. 제품 기능/요구사항', name: '제품 기능', width: 170, 
    headerColor: COLORS.function.productFunc.headerLight, cellColor: COLORS.function.productFunc.cell, cellAltColor: COLORS.function.productFunc.cellAlt, align: 'left' },
  { id: 7, step: '기능분석', group: '1. 제품 기능/요구사항', name: '요구사항', width: 160, 
    headerColor: COLORS.function.requirement.headerLight, cellColor: COLORS.function.requirement.cell, cellAltColor: COLORS.function.requirement.cellAlt, align: 'left' },
  { id: 8, step: '기능분석', group: '2. A\'SSY 기능 및 제품 특성', name: 'A\'SSY 기능', width: 140, 
    headerColor: COLORS.function.processFunc.headerLight, cellColor: COLORS.function.processFunc.cell, cellAltColor: COLORS.function.processFunc.cellAlt, align: 'left' },
  { id: 9, step: '기능분석', group: '2. A\'SSY 기능 및 제품 특성', name: '제품 특성', width: 110, 
    headerColor: COLORS.function.productChar.headerLight, cellColor: COLORS.function.productChar.cell, cellAltColor: COLORS.function.productChar.cellAlt, align: 'left' },
  { id: 10, step: '기능분석', group: '3. 부품 기능 및 부품 특성', name: '부품 기능', width: 140, 
    headerColor: COLORS.function.workFunc.headerLight, cellColor: COLORS.function.workFunc.cell, cellAltColor: COLORS.function.workFunc.cellAlt, align: 'left' },
  { id: 11, step: '기능분석', group: '3. 부품 기능 및 부품 특성', name: '부품 특성', width: 110, 
    headerColor: COLORS.function.processChar.headerLight, cellColor: COLORS.function.processChar.cell, cellAltColor: COLORS.function.processChar.cellAlt, align: 'left' },
  
  // ■ 4단계: 고장분석 (4컬럼)
  { id: 12, step: '고장분석', group: '1. 고장영향(FE)', name: '고장영향(FE)', width: 160, 
    headerColor: COLORS.failure.fe.headerLight, cellColor: COLORS.failure.fe.cell, cellAltColor: COLORS.failure.fe.cellAlt, align: 'left' },
  { id: 13, step: '고장분석', group: '1. 고장영향(FE)', name: '심각도', width: 50, 
    headerColor: COLORS.optimization.severity.headerLight, cellColor: COLORS.optimization.severity.cell, cellAltColor: COLORS.optimization.severity.cellAlt, align: 'center' },
  { id: 14, step: '고장분석', group: '2. 고장형태(FM)', name: '고장형태(FM)', width: 135, 
    headerColor: COLORS.failure.fm.headerLight, cellColor: COLORS.failure.fm.cell, cellAltColor: COLORS.failure.fm.cellAlt, align: 'left', isDark: true },
  { id: 15, step: '고장분석', group: '3. 고장원인(FC)', name: '고장원인(FC)', width: 160, 
    headerColor: COLORS.failure.fc.headerLight, cellColor: COLORS.failure.fc.cell, cellAltColor: COLORS.failure.fc.cellAlt, align: 'left' },
  
  // ■ 5단계: 리스크분석 (7컬럼)
  { id: 16, step: '리스크분석', group: '1. 현재 예방관리', name: '예방관리(PC)', width: 140, 
    headerColor: COLORS.risk.prevention.headerLight, cellColor: COLORS.risk.prevention.cell, cellAltColor: COLORS.risk.prevention.cellAlt, align: 'left' },
  { id: 17, step: '리스크분석', group: '1. 현재 예방관리', name: '발생도', width: 50, 
    headerColor: COLORS.optimization.severity.headerLight, cellColor: COLORS.optimization.severity.cell, cellAltColor: COLORS.optimization.severity.cellAlt, align: 'center' },
  { id: 18, step: '리스크분석', group: '2. 현재 검출관리', name: '검출관리(DC)', width: 140, 
    headerColor: COLORS.risk.detection.headerLight, cellColor: COLORS.risk.detection.cell, cellAltColor: COLORS.risk.detection.cellAlt, align: 'left' },
  { id: 19, step: '리스크분석', group: '2. 현재 검출관리', name: '검출도', width: 50, 
    headerColor: COLORS.optimization.severity.headerLight, cellColor: COLORS.optimization.severity.cell, cellAltColor: COLORS.optimization.severity.cellAlt, align: 'center' },
  { id: 20, step: '리스크분석', group: '3. 리스크 평가', name: 'AP', width: 30, 
    headerColor: COLORS.optimization.ap.headerLight, cellColor: COLORS.optimization.ap.cell, cellAltColor: COLORS.optimization.ap.cellAlt, align: 'center' },
  { id: 21, step: '리스크분석', group: '3. 리스크 평가', name: '특별특성', width: 50, 
    headerColor: COLORS.optimization.special.headerLight, cellColor: COLORS.optimization.special.cell, cellAltColor: COLORS.optimization.special.cellAlt, align: 'center' },
  { id: 22, step: '리스크분석', group: '3. 리스크 평가', name: '습득교훈', width: 100, 
    headerColor: COLORS.failure.fc.headerLight, cellColor: COLORS.failure.fc.cell, cellAltColor: COLORS.failure.fc.cellAlt, align: 'left' },
  
  // ■ 6단계: 최적화 (13컬럼)
  { id: 23, step: '최적화', group: '1. 계획', name: '예방관리개선', width: 140, 
    headerColor: COLORS.optimization.prevention.headerLight, cellColor: COLORS.optimization.prevention.cell, cellAltColor: COLORS.optimization.prevention.cellAlt, align: 'left' },
  { id: 24, step: '최적화', group: '1. 계획', name: '검출관리개선', width: 140, 
    headerColor: COLORS.optimization.detection.headerLight, cellColor: COLORS.optimization.detection.cell, cellAltColor: COLORS.optimization.detection.cellAlt, align: 'left' },
  { id: 25, step: '최적화', group: '1. 계획', name: '책임자성명', width: 80, 
    headerColor: COLORS.optimization.person.headerLight, cellColor: COLORS.optimization.person.cell, cellAltColor: COLORS.optimization.person.cellAlt, align: 'center' },
  { id: 26, step: '최적화', group: '1. 계획', name: '목표완료일자', width: 70, 
    headerColor: COLORS.optimization.date.headerLight, cellColor: COLORS.optimization.date.cell, cellAltColor: COLORS.optimization.date.cellAlt, align: 'center' },
  { id: 27, step: '최적화', group: '1. 계획', name: '상태', width: 50, 
    headerColor: COLORS.optimization.status.headerLight, cellColor: COLORS.optimization.status.cell, cellAltColor: COLORS.optimization.status.cellAlt, align: 'center' },
  { id: 28, step: '최적화', group: '2. 결과 모니터링', name: '개선결과근거', width: 100, 
    headerColor: COLORS.optimization.result.headerLight, cellColor: COLORS.optimization.result.cell, cellAltColor: COLORS.optimization.result.cellAlt, align: 'left' },
  { id: 29, step: '최적화', group: '2. 결과 모니터링', name: '완료일자', width: 70, 
    headerColor: COLORS.optimization.complete.headerLight, cellColor: COLORS.optimization.complete.cell, cellAltColor: COLORS.optimization.complete.cellAlt, align: 'center' },
  { id: 30, step: '최적화', group: '3. 효과 평가', name: '심각도', width: 50, 
    headerColor: COLORS.optimization.severity.headerLight, cellColor: COLORS.optimization.severity.cell, cellAltColor: COLORS.optimization.severity.cellAlt, align: 'center' },
  { id: 31, step: '최적화', group: '3. 효과 평가', name: '발생도', width: 50, 
    headerColor: COLORS.optimization.occurrence.headerLight, cellColor: COLORS.optimization.occurrence.cell, cellAltColor: COLORS.optimization.occurrence.cellAlt, align: 'center' },
  { id: 32, step: '최적화', group: '3. 효과 평가', name: '검출도', width: 50, 
    headerColor: COLORS.optimization.detection2.headerLight, cellColor: COLORS.optimization.detection2.cell, cellAltColor: COLORS.optimization.detection2.cellAlt, align: 'center' },
  { id: 33, step: '최적화', group: '3. 효과 평가', name: '특별특성', width: 50, 
    headerColor: COLORS.optimization.special.headerLight, cellColor: COLORS.optimization.special.cell, cellAltColor: COLORS.optimization.special.cellAlt, align: 'center' },
  { id: 34, step: '최적화', group: '3. 효과 평가', name: 'AP', width: 30, 
    headerColor: COLORS.optimization.ap.headerLight, cellColor: COLORS.optimization.ap.cell, cellAltColor: COLORS.optimization.ap.cellAlt, align: 'center' },
  { id: 35, step: '최적화', group: '3. 효과 평가', name: '비고', width: 80, 
    headerColor: COLORS.optimization.note.headerLight, cellColor: COLORS.optimization.note.cell, cellAltColor: COLORS.optimization.note.cellAlt, align: 'left' },
];

// 단계별 메인 색상 (1행 헤더용)
export const STEP_COLORS: Record<string, string> = {
  '구조분석': '#1976d2',
  '기능분석': '#388e3c',
  '고장분석': '#f57c00',
  '리스크분석': '#1a237e',
  '최적화': '#558b2f',
};

// 단계명 → 표시용 텍스트 (단계 번호 포함)
export const STEP_LABELS: Record<string, string> = {
  '구조분석': '2단계 구조분석',
  '기능분석': '3단계 기능분석',
  '고장분석': '4단계 고장분석',
  '리스크분석': '5단계 리스크분석',
  '최적화': '6단계 최적화',
};

// RPN 컬럼 (옵션)
export const RPN_COLUMNS: ColumnDef[] = [
  { id: 0, step: '리스크분석', group: '3. 리스크 평가', name: 'RPN', width: 40, 
    headerColor: COLORS.risk.evaluation.headerLight, cellColor: COLORS.risk.evaluation.cell, cellAltColor: COLORS.risk.evaluation.cellAlt, align: 'center', isRPN: true, isDark: true },
  { id: 0, step: '최적화', group: '3. 효과 평가', name: 'RPN', width: 40, 
    headerColor: COLORS.optimization.evaluation.headerLight, cellColor: COLORS.optimization.evaluation.cell, cellAltColor: COLORS.optimization.evaluation.cellAlt, align: 'center', isRPN: true },
];

// 옵션화면용 37컬럼 생성 함수
export function getColumnsWithRPN(): ColumnDef[] {
  const columns = [...COLUMNS_BASE];
  const riskRpnIdx = columns.findIndex(c => c.id === 21);
  columns.splice(riskRpnIdx, 0, { ...RPN_COLUMNS[0], id: 21 });
  for (let i = riskRpnIdx; i < columns.length; i++) {
    columns[i] = { ...columns[i], id: i + 1 };
  }
  const optRpnIdx = columns.findIndex(c => c.name === '비고' && c.step === '최적화');
  columns.splice(optRpnIdx, 0, { ...RPN_COLUMNS[1], id: optRpnIdx + 1 });
  for (let i = optRpnIdx; i < columns.length; i++) {
    columns[i] = { ...columns[i], id: i + 1 };
  }
  return columns;
}

// ============ 1행 (단계) colSpan 계산 ============
export interface StepSpan {
  step: string;
  colSpan: number;
  color: string;
}

export function calculateStepSpans(columns: ColumnDef[]): StepSpan[] {
  const spans: StepSpan[] = [];
  let currentStep = '';
  let currentSpan = 0;
  
  columns.forEach((col, idx) => {
    if (col.step !== currentStep) {
      if (currentSpan > 0) {
        spans.push({ step: currentStep, colSpan: currentSpan, color: STEP_COLORS[currentStep] || '#666' });
      }
      currentStep = col.step;
      currentSpan = 1;
    } else {
      currentSpan++;
    }
    
    if (idx === columns.length - 1) {
      spans.push({ step: currentStep, colSpan: currentSpan, color: STEP_COLORS[currentStep] || '#666' });
    }
  });
  
  return spans;
}

// ============ 2행 (분류) colSpan 계산 ============
export interface GroupSpan {
  group: string;
  colSpan: number;
  color: string;
  isDark?: boolean;
  startColId: number;  // ★ 2026-01-11: 단계 구분선용
}

export function calculateGroupSpans(columns: ColumnDef[]): GroupSpan[] {
  const spans: GroupSpan[] = [];
  let currentGroup = '';
  let currentSpan = 0;
  let currentColor = '';
  let currentIsDark = false;
  let currentStartColId = 0;
  
  columns.forEach((col, idx) => {
    if (col.group !== currentGroup) {
      if (currentSpan > 0) {
        spans.push({ group: currentGroup, colSpan: currentSpan, color: currentColor, isDark: currentIsDark, startColId: currentStartColId });
      }
      currentGroup = col.group;
      currentSpan = 1;
      currentColor = col.headerColor;
      currentIsDark = col.isDark || false;
      currentStartColId = col.id;  // ★ 그룹 시작 컬럼 ID 저장
    } else {
      currentSpan++;
    }
    
    if (idx === columns.length - 1) {
      spans.push({ group: currentGroup, colSpan: currentSpan, color: currentColor, isDark: currentIsDark, startColId: currentStartColId });
    }
  });
  
  return spans;
}



