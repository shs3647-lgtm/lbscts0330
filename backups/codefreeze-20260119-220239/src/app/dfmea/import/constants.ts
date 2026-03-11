/**
 * @file constants.ts
 * @description DFMEA Import 페이지 상수 및 샘플 데이터
 */

import { ImportedFlatData } from './types';

// 드롭다운 항목 (L2: 공정/고장형태, L3: 작업요소/고장원인, L1: 완제품/고장영향)
export const PREVIEW_OPTIONS = [
  { value: 'A1', label: 'L2-1 공정번호' },
  { value: 'A2', label: 'L2-2 공정명' },
  { value: 'A3', label: 'L2-3 공정기능' },
  { value: 'A4', label: 'L2-4 제품특성' },
  { value: 'A5', label: 'L2-5 고장형태' },
  { value: 'A6', label: 'L2-6 검출관리' },
  { value: 'B1', label: 'L3-1 작업요소' },
  { value: 'B2', label: 'L3-2 요소기능' },
  { value: 'B3', label: 'L3-3 공정특성' },
  { value: 'B4', label: 'L3-4 고장원인' },
  { value: 'B5', label: 'L3-5 예방관리' },
  { value: 'C1', label: 'L1-1 구분' },  // YOUR PLANT, SHIP TO PLANT, USER
  { value: 'C2', label: 'L1-2 제품기능' },
  { value: 'C3', label: 'L1-3 요구사항' },
  { value: 'C4', label: 'L1-4 고장영향' },
];

// FMEA 프로젝트 타입
export interface FMEAProject {
  id: string;
  fmeaNo?: string;
  fmeaInfo?: {
    subject?: string;
  };
  project?: {
    productName?: string;
  };
}

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
  // 공정 40 - 열처리
  { id: '40-A1', processNo: '40', category: 'A', itemCode: 'A1', value: '40', createdAt: new Date() },
  { id: '40-A2', processNo: '40', category: 'A', itemCode: 'A2', value: '열처리', createdAt: new Date() },
  { id: '40-A3', processNo: '40', category: 'A', itemCode: 'A3', value: '담금질/뜨임', createdAt: new Date() },
  { id: '40-A4', processNo: '40', category: 'A', itemCode: 'A4', value: '경도, 조직', createdAt: new Date() },
  { id: '40-A5', processNo: '40', category: 'A', itemCode: 'A5', value: '경도미달, 변형', createdAt: new Date() },
  { id: '40-A6', processNo: '40', category: 'A', itemCode: 'A6', value: '경도검사, 조직검사', createdAt: new Date() },
  { id: '40-B1', processNo: '40', category: 'B', itemCode: 'B1', value: '열처리로, 냉각조', createdAt: new Date() },
  { id: '40-B2', processNo: '40', category: 'B', itemCode: 'B2', value: '가열, 냉각', createdAt: new Date() },
  { id: '40-B3', processNo: '40', category: 'B', itemCode: 'B3', value: '온도, 시간, 냉각속도', createdAt: new Date() },
  { id: '40-B4', processNo: '40', category: 'B', itemCode: 'B4', value: '온도이탈, 시간부족', createdAt: new Date() },
  { id: '40-B5', processNo: '40', category: 'B', itemCode: 'B5', value: '온도모니터링, 정기교정', createdAt: new Date() },
  // 공정 50 - 조립
  { id: '50-A1', processNo: '50', category: 'A', itemCode: 'A1', value: '50', createdAt: new Date() },
  { id: '50-A2', processNo: '50', category: 'A', itemCode: 'A2', value: '조립', createdAt: new Date() },
  { id: '50-A3', processNo: '50', category: 'A', itemCode: 'A3', value: '부품결합/체결', createdAt: new Date() },
  { id: '50-A4', processNo: '50', category: 'A', itemCode: 'A4', value: '체결력, 위치정도', createdAt: new Date() },
  { id: '50-A5', processNo: '50', category: 'A', itemCode: 'A5', value: '미체결, 오조립', createdAt: new Date() },
  { id: '50-A6', processNo: '50', category: 'A', itemCode: 'A6', value: '토크검사, 외관검사', createdAt: new Date() },
  { id: '50-B1', processNo: '50', category: 'B', itemCode: 'B1', value: '토크렌치, 지그', createdAt: new Date() },
  { id: '50-B2', processNo: '50', category: 'B', itemCode: 'B2', value: '체결, 정렬', createdAt: new Date() },
  { id: '50-B3', processNo: '50', category: 'B', itemCode: 'B3', value: '토크값, 체결순서', createdAt: new Date() },
  { id: '50-B4', processNo: '50', category: 'B', itemCode: 'B4', value: '토크부족, 순서누락', createdAt: new Date() },
  { id: '50-B5', processNo: '50', category: 'B', itemCode: 'B5', value: '작업표준서, 포카요케', createdAt: new Date() },
  // 완제품 정보
  { id: 'C1-1', processNo: 'ALL', category: 'C', itemCode: 'C1', value: 'YOUR PLANT', createdAt: new Date() },
  { id: 'C2-1', processNo: 'ALL', category: 'C', itemCode: 'C2', value: '동력전달', createdAt: new Date() },
  { id: 'C3-1', processNo: 'ALL', category: 'C', itemCode: 'C3', value: '내구성 10만km', createdAt: new Date() },
  { id: 'C4-1', processNo: 'ALL', category: 'C', itemCode: 'C4', value: '차량정지, 안전사고', createdAt: new Date() },
];
