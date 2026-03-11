/**
 * @file types.ts
 * @description CP Import 페이지 타입 정의
 * @updated 2026-01-13 - 5개 시트 구조로 변경
 */

// CP 프로젝트 타입
export interface CPProject {
  id: string;
  cpInfo?: {
    subject?: string;
  };
}

// Import 데이터 타입
export interface ImportedData {
  id: string;
  processNo: string;          // 공정번호 (부모 키)
  processName?: string;       // 공정명 (부모 키)
  category: string;           // 시트명: processInfo | controlItem | controlMethod | reactionPlan | detector
  itemCode: string;           // 컬럼 코드
  value: string;              // 값
  createdAt: Date;
}

// 시트/그룹 타입
export type SheetGroup = 'processInfo' | 'controlItem' | 'controlMethod' | 'reactionPlan' | 'detector';

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
  level?: string;
  processDesc?: string;
  equipment?: string;
  productChar?: string;
  processChar?: string;
  specialChar?: string;
  spec?: string;
  evalMethod?: string;
  sampleSize?: string;
  frequency?: string;
  owner1?: string;
  owner2?: string;
  reactionPlan?: string;
  ep?: string;
  autoDetector?: string;
}
