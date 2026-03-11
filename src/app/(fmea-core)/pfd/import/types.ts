/**
 * @file types.ts
 * @description PFD Import 페이지 타입 정의
 * @created 2026-01-24
 * 
 * PFD 컬럼 (9개):
 * - 공정정보 (5개): 공정번호, 공정명, 공정설명, 작업요소, 설비/금형/지그
 * - 특성정보 (4개): 제품특별특성, 제품특성, 공정특별특성, 공정특성
 */

// PFD 프로젝트 타입 (CP와 동일한 구조)
export interface PFDProject {
  id: string;
  pfdNo?: string;
  name?: string;
  pfdType?: 'M' | 'F' | 'P';
  pfdInfo?: {
    subject?: string;
    partName?: string;
    partNo?: string;
    pfdType?: string;
  };
  updatedAt?: string;
}

// Import 데이터 타입
export interface ImportedData {
  id: string;
  processNo: string;          // 공정번호 (부모 키)
  processName?: string;       // 공정명
  category: string;           // 시트명: processInfo | characteristic
  itemCode: string;           // 컬럼 코드 (A1~A5, B1~B3)
  value: string;              // 값
  createdAt: Date;
}

// 시트/그룹 타입
export type SheetGroup = 'processInfo' | 'characteristic';

// 미리보기 옵션
export interface PreviewOption {
  value: string;
  label: string;
  sheetName?: string;        // 엑셀 시트명
  group?: SheetGroup;        // 시트 그룹
}

// 미리보기 컬럼
export interface PreviewColumn {
  key: string;
  label: string;
  width: string;
  group?: SheetGroup;        // 시트 그룹
  smallText?: boolean;       // 작은 글씨 (좁은 컬럼용)
}

// 플랫 데이터 (테이블 표시용)
export interface FlatRowData {
  rowNo: number;
  processNo: string;
  processName: string;
  processDesc?: string;
  workElement?: string;
  equipment?: string;
  productSpecialChar?: string;  // 제품특별특성
  productChar?: string;
  processSpecialChar?: string;  // 공정특별특성
  processChar?: string;
}
