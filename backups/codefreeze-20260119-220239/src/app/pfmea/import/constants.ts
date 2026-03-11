/**
 * @file constants.ts
 * @description Import 페이지 상수 정의
 */

import { ImportedFlatData } from './types';

// 드롭다운 항목 (L2: 공정/고장형태, L3: 작업요소/고장원인, L1: 완제품/고장영향)
// value는 기존 A1/B1/C1 형식 유지 (내부 로직 호환), label은 L2-1/L3-1/L1-1 형식
export const PREVIEW_OPTIONS = [
  { value: 'A1', label: 'L2-1 공정번호', sheetName: 'L2-1 공정번호' },
  { value: 'A2', label: 'L2-2 공정명', sheetName: 'L2-1 공정번호' },  // A1 시트에 포함
  { value: 'A3', label: 'L2-3 공정기능', sheetName: 'L2-3 공정기능' },
  { value: 'A4', label: 'L2-4 제품특성', sheetName: 'L2-4 제품특성' },
  { value: 'A5', label: 'L2-5 고장형태', sheetName: 'L2-5 고장형태' },
  { value: 'A6', label: 'L2-6 검출관리', sheetName: 'L2-6 검출관리' },
  { value: 'B1', label: 'L3-1 작업요소', sheetName: 'L3-1 작업요소' },
  { value: 'B2', label: 'L3-2 요소기능', sheetName: 'L3-2 요소기능' },
  { value: 'B3', label: 'L3-3 공정특성', sheetName: 'L3-3 공정특성' },
  { value: 'B4', label: 'L3-4 고장원인', sheetName: 'L3-4 고장원인' },
  { value: 'B5', label: 'L3-5 예방관리', sheetName: 'L3-5 예방관리' },
  { value: 'C1', label: 'L1-1 구분', sheetName: 'L1-1 구분' },
  { value: 'C2', label: 'L1-2 제품기능', sheetName: 'L1-2 제품기능' },
  { value: 'C3', label: 'L1-3 요구사항', sheetName: 'L1-3 요구사항' },
  { value: 'C4', label: 'L1-4 고장영향', sheetName: 'L1-4 고장영향' },
];

// 테이블 디자인 표준
export const TABLE_DESIGN = {
  ROW_HEIGHT: '28px',
  FONT_SIZE: '11px',
  CELL_PADDING: '4px 6px',
};

// 테이블 스타일
export const getTableStyles = () => {
  const { ROW_HEIGHT, FONT_SIZE, CELL_PADDING } = TABLE_DESIGN;
  return {
    headerStyle: { 
      background: '#00587a', 
      color: 'white', 
      border: '1px solid #999', 
      padding: CELL_PADDING, 
      fontWeight: 'bold' as const, 
      textAlign: 'center' as const, 
      whiteSpace: 'nowrap' as const, 
      height: ROW_HEIGHT, 
      fontSize: FONT_SIZE 
    },
    rowHeaderStyle: { 
      background: '#00587a', 
      color: 'white', 
      border: '1px solid #999', 
      padding: CELL_PADDING, 
      fontWeight: 'bold' as const, 
      textAlign: 'center' as const, 
      whiteSpace: 'nowrap' as const, 
      height: ROW_HEIGHT, 
      fontSize: FONT_SIZE 
    },
    cellStyle: { 
      background: 'white', 
      border: '1px solid #999', 
      padding: CELL_PADDING, 
      whiteSpace: 'nowrap' as const, 
      height: ROW_HEIGHT, 
      fontSize: FONT_SIZE 
    },
    lightBlueStyle: { 
      background: '#e0f2fb', 
      border: '1px solid #999', 
      padding: CELL_PADDING, 
      whiteSpace: 'nowrap' as const, 
      height: ROW_HEIGHT, 
      fontSize: FONT_SIZE 
    },
    tableWrapperStyle: { 
      borderRadius: '8px', 
      overflow: 'hidden' as const, 
      border: '1px solid #999' 
    },
    sectionTitleStyle: { 
      fontSize: '13px', 
      fontWeight: 'bold' as const, 
      marginBottom: '6px', 
      color: '#00587a' 
    },
  };
};

// 샘플 데이터 (PFMEA기초정보입력.xlsx 기반)
export const SAMPLE_DATA: ImportedFlatData[] = [
  // 공정 10 - 입고검사
  { id: '10-A1', processNo: '10', category: 'A', itemCode: 'A1', value: '10', createdAt: new Date() },
  { id: '10-A2', processNo: '10', category: 'A', itemCode: 'A2', value: '입고검사', createdAt: new Date() },
  { id: '10-A3', processNo: '10', category: 'A', itemCode: 'A3', value: '원자재 품질 검사', createdAt: new Date() },
  { id: '10-A4', processNo: '10', category: 'A', itemCode: 'A4', value: '외관, 치수, 재질', createdAt: new Date() },
  { id: '10-A5', processNo: '10', category: 'A', itemCode: 'A5', value: '불량품 입고', createdAt: new Date() },
  { id: '10-A6', processNo: '10', category: 'A', itemCode: 'A6', value: '수입검사 체크시트', createdAt: new Date() },
  { id: '10-B1', processNo: '10', category: 'B', itemCode: 'B1', value: '측정기, 검사대', createdAt: new Date() },
  { id: '10-B2', processNo: '10', category: 'B', itemCode: 'B2', value: '치수측정, 외관검사', createdAt: new Date() },
  { id: '10-B3', processNo: '10', category: 'B', itemCode: 'B3', value: '검사정밀도', createdAt: new Date() },
  { id: '10-B4', processNo: '10', category: 'B', itemCode: 'B4', value: '검사누락, 오판정', createdAt: new Date() },
  { id: '10-B5', processNo: '10', category: 'B', itemCode: 'B5', value: '검사교육, 체크시트', createdAt: new Date() },
  // 공정 20 - 전처리
  { id: '20-A1', processNo: '20', category: 'A', itemCode: 'A1', value: '20', createdAt: new Date() },
  { id: '20-A2', processNo: '20', category: 'A', itemCode: 'A2', value: '전처리', createdAt: new Date() },
  { id: '20-A3', processNo: '20', category: 'A', itemCode: 'A3', value: '표면 세척 및 탈지', createdAt: new Date() },
  { id: '20-A4', processNo: '20', category: 'A', itemCode: 'A4', value: '청정도, 탈지율', createdAt: new Date() },
  { id: '20-A5', processNo: '20', category: 'A', itemCode: 'A5', value: '잔류이물, 탈지불량', createdAt: new Date() },
  { id: '20-A6', processNo: '20', category: 'A', itemCode: 'A6', value: '청정도 측정', createdAt: new Date() },
  { id: '20-B1', processNo: '20', category: 'B', itemCode: 'B1', value: '세척기, 탈지조', createdAt: new Date() },
  { id: '20-B2', processNo: '20', category: 'B', itemCode: 'B2', value: '세척, 탈지', createdAt: new Date() },
  { id: '20-B3', processNo: '20', category: 'B', itemCode: 'B3', value: '온도, 농도, 시간', createdAt: new Date() },
  { id: '20-B4', processNo: '20', category: 'B', itemCode: 'B4', value: '온도편차, 농도부족', createdAt: new Date() },
  { id: '20-B5', processNo: '20', category: 'B', itemCode: 'B5', value: '정기점검, 농도관리', createdAt: new Date() },
  // 공정 30 - 가공
  { id: '30-A1', processNo: '30', category: 'A', itemCode: 'A1', value: '30', createdAt: new Date() },
  { id: '30-A2', processNo: '30', category: 'A', itemCode: 'A2', value: '가공', createdAt: new Date() },
  { id: '30-A3', processNo: '30', category: 'A', itemCode: 'A3', value: 'CNC 절삭가공', createdAt: new Date() },
  { id: '30-A4', processNo: '30', category: 'A', itemCode: 'A4', value: '치수정밀도, 표면조도', createdAt: new Date() },
  { id: '30-A5', processNo: '30', category: 'A', itemCode: 'A5', value: '치수불량, 조도불량', createdAt: new Date() },
  { id: '30-A6', processNo: '30', category: 'A', itemCode: 'A6', value: '초중종품검사', createdAt: new Date() },
  { id: '30-B1', processNo: '30', category: 'B', itemCode: 'B1', value: 'CNC선반, 공구', createdAt: new Date() },
  { id: '30-B2', processNo: '30', category: 'B', itemCode: 'B2', value: '절삭, 가공', createdAt: new Date() },
  { id: '30-B3', processNo: '30', category: 'B', itemCode: 'B3', value: '이송속도, 절삭깊이', createdAt: new Date() },
  { id: '30-B4', processNo: '30', category: 'B', itemCode: 'B4', value: '공구마모, 셋팅오류', createdAt: new Date() },
  { id: '30-B5', processNo: '30', category: 'B', itemCode: 'B5', value: '공구교환주기, TPM', createdAt: new Date() },
  // 완제품 정보
  { id: 'C1-1', processNo: 'ALL', category: 'C', itemCode: 'C1', value: 'YOUR PLANT', createdAt: new Date() },
  { id: 'C2-1', processNo: 'ALL', category: 'C', itemCode: 'C2', value: '동력전달', createdAt: new Date() },
  { id: 'C3-1', processNo: 'ALL', category: 'C', itemCode: 'C3', value: '내구성 10만km', createdAt: new Date() },
  { id: 'C4-1', processNo: 'ALL', category: 'C', itemCode: 'C4', value: '차량정지, 안전사고', createdAt: new Date() },
];







