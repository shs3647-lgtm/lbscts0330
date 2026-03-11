/**
 * @file constants.ts
 * @description Import 페이지 상수 정의
 */
/* DFMEA 전용 — PFMEA 클론 후 DFMEA 용어로 변환 (2026-03-03) */


import { ImportedFlatData } from './types';

// 드롭다운 항목 (L2: 초점요소/고장형태, L3: 하위요소/고장원인, L1: 상위수준/고장영향)
// value는 기존 A1/B1/C1 형식 유지 (내부 로직 호환), label은 L2-1/L3-1/L1-1 형식
// v3.0: A6(검출관리), B5(예방관리) IMPORT 제외 → 리스크 탭에서 입력
export const PREVIEW_OPTIONS = [
  { value: 'A1', label: 'L2-1(A1) 초점요소번호', sheetName: 'L2-1(A1) 초점요소번호' },
  { value: 'A2', label: 'L2-2(A2) 초점요소명', sheetName: 'L2-1(A1) 초점요소번호' },  // A1 시트에 포함
  { value: 'A3', label: 'L2-3(A3) 초점기능', sheetName: 'L2-3(A3) 초점기능' },
  { value: 'A4', label: 'L2-4(A4) 초점요소 요구사항', sheetName: 'L2-4(A4) 초점요소 요구사항' },
  { value: 'A5', label: 'L2-5(A5) 고장형태', sheetName: 'L2-5(A5) 고장형태' },
  { value: 'B1', label: 'L3-1(B1) 하위요소', sheetName: 'L3-1(B1) 하위요소' },
  { value: 'B2', label: 'L3-2(B2) 하위기능', sheetName: 'L3-2(B2) 하위기능' },
  { value: 'B3', label: 'L3-3(B3) 하위기능 요구사항', sheetName: 'L3-3(B3) 하위기능 요구사항' },
  { value: 'B4', label: 'L3-4(B4) 고장원인', sheetName: 'L3-4(B4) 고장원인' },
  { value: 'C1', label: 'L1-1(C1) 구분', sheetName: 'L1-1(C1) 구분' },
  { value: 'C2', label: 'L1-2(C2) 상위기능', sheetName: 'L1-2(C2) 상위기능' },
  { value: 'C3', label: 'L1-3(C3) 상위요구사항', sheetName: 'L1-3(C3) 상위요구사항' },
  { value: 'C4', label: 'L1-4(C4) 고장영향', sheetName: 'L1-4(C4) 고장영향' },
];

// 샘플 데이터 (DFMEA 기초정보 기반) — v3.0: A6/B5 제거
export const SAMPLE_DATA: ImportedFlatData[] = [
  // 공정 10 - 입고검사
  { id: '10-A1', processNo: '10', category: 'A', itemCode: 'A1', value: '10', createdAt: new Date() },
  { id: '10-A2', processNo: '10', category: 'A', itemCode: 'A2', value: '입고검사', createdAt: new Date() },
  { id: '10-A3', processNo: '10', category: 'A', itemCode: 'A3', value: '원자재 품질 검사', createdAt: new Date() },
  { id: '10-A4', processNo: '10', category: 'A', itemCode: 'A4', value: '외관, 치수, 재질', createdAt: new Date() },
  { id: '10-A5', processNo: '10', category: 'A', itemCode: 'A5', value: '불량품 입고', createdAt: new Date() },
  { id: '10-B1', processNo: '10', category: 'B', itemCode: 'B1', value: '측정기, 검사대', createdAt: new Date() },
  { id: '10-B2', processNo: '10', category: 'B', itemCode: 'B2', value: '치수측정, 외관검사', createdAt: new Date() },
  { id: '10-B3', processNo: '10', category: 'B', itemCode: 'B3', value: '검사정밀도', createdAt: new Date() },
  { id: '10-B4', processNo: '10', category: 'B', itemCode: 'B4', value: '검사누락, 오판정', createdAt: new Date() },
  // 공정 20 - 전처리
  { id: '20-A1', processNo: '20', category: 'A', itemCode: 'A1', value: '20', createdAt: new Date() },
  { id: '20-A2', processNo: '20', category: 'A', itemCode: 'A2', value: '전처리', createdAt: new Date() },
  { id: '20-A3', processNo: '20', category: 'A', itemCode: 'A3', value: '표면 세척 및 탈지', createdAt: new Date() },
  { id: '20-A4', processNo: '20', category: 'A', itemCode: 'A4', value: '청정도, 탈지율', createdAt: new Date() },
  { id: '20-A5', processNo: '20', category: 'A', itemCode: 'A5', value: '잔류이물, 탈지불량', createdAt: new Date() },
  { id: '20-B1', processNo: '20', category: 'B', itemCode: 'B1', value: '세척기, 탈지조', createdAt: new Date() },
  { id: '20-B2', processNo: '20', category: 'B', itemCode: 'B2', value: '세척, 탈지', createdAt: new Date() },
  { id: '20-B3', processNo: '20', category: 'B', itemCode: 'B3', value: '온도, 농도, 시간', createdAt: new Date() },
  { id: '20-B4', processNo: '20', category: 'B', itemCode: 'B4', value: '온도편차, 농도부족', createdAt: new Date() },
  // 공정 30 - 가공
  { id: '30-A1', processNo: '30', category: 'A', itemCode: 'A1', value: '30', createdAt: new Date() },
  { id: '30-A2', processNo: '30', category: 'A', itemCode: 'A2', value: '가공', createdAt: new Date() },
  { id: '30-A3', processNo: '30', category: 'A', itemCode: 'A3', value: 'CNC 절삭가공', createdAt: new Date() },
  { id: '30-A4', processNo: '30', category: 'A', itemCode: 'A4', value: '치수정밀도, 표면조도', createdAt: new Date() },
  { id: '30-A5', processNo: '30', category: 'A', itemCode: 'A5', value: '치수불량, 조도불량', createdAt: new Date() },
  { id: '30-B1', processNo: '30', category: 'B', itemCode: 'B1', value: 'CNC선반, 공구', createdAt: new Date() },
  { id: '30-B2', processNo: '30', category: 'B', itemCode: 'B2', value: '절삭, 가공', createdAt: new Date() },
  { id: '30-B3', processNo: '30', category: 'B', itemCode: 'B3', value: '이송속도, 절삭깊이', createdAt: new Date() },
  { id: '30-B4', processNo: '30', category: 'B', itemCode: 'B4', value: '공구마모, 셋팅오류', createdAt: new Date() },
  // ★★★ 상위수준 정보 (법규/기본/보조/관능별 분리) ★★★
  // 법규 (Regulation)
  { id: 'C1-법규', processNo: '법규', category: 'C', itemCode: 'C1', value: '법규', createdAt: new Date() },
  { id: 'C2-법규', processNo: '법규', category: 'C', itemCode: 'C2', value: '법규 요구사항 충족', createdAt: new Date() },
  { id: 'C3-법규', processNo: '법규', category: 'C', itemCode: 'C3', value: '안전규격 준수', createdAt: new Date() },
  { id: 'C4-법규', processNo: '법규', category: 'C', itemCode: 'C4', value: '규제 미준수, 리콜', createdAt: new Date() },
  // 기본 (Primary)
  { id: 'C1-기본', processNo: '기본', category: 'C', itemCode: 'C1', value: '기본', createdAt: new Date() },
  { id: 'C2-기본', processNo: '기본', category: 'C', itemCode: 'C2', value: '기본 성능 확보', createdAt: new Date() },
  { id: 'C3-기본', processNo: '기본', category: 'C', itemCode: 'C3', value: '내구성능 규격', createdAt: new Date() },
  { id: 'C4-기본', processNo: '기본', category: 'C', itemCode: 'C4', value: '성능 저하, 내구 수명 단축', createdAt: new Date() },
  // 보조 (Secondary)
  { id: 'C1-보조', processNo: '보조', category: 'C', itemCode: 'C1', value: '보조', createdAt: new Date() },
  { id: 'C2-보조', processNo: '보조', category: 'C', itemCode: 'C2', value: '안전 운행', createdAt: new Date() },
  { id: 'C3-보조', processNo: '보조', category: 'C', itemCode: 'C3', value: '안전 기준 충족', createdAt: new Date() },
  { id: 'C4-보조', processNo: '보조', category: 'C', itemCode: 'C4', value: '안전 사고 위험', createdAt: new Date() },
  // 관능 (Sensory)
  { id: 'C1-관능', processNo: '관능', category: 'C', itemCode: 'C1', value: '관능', createdAt: new Date() },
  { id: 'C2-관능', processNo: '관능', category: 'C', itemCode: 'C2', value: '외관 품질 확보', createdAt: new Date() },
  { id: 'C3-관능', processNo: '관능', category: 'C', itemCode: 'C3', value: '외관/NVH 기준', createdAt: new Date() },
  { id: 'C4-관능', processNo: '관능', category: 'C', itemCode: 'C4', value: '외관 불량, 소음 발생', createdAt: new Date() },
];







