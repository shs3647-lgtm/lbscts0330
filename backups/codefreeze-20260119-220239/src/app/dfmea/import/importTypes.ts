/**
 * @file importTypes.ts
 * @description Import 페이지 전용 타입 정의
 */

import { ImportedFlatData } from './types';
import { ParseResult } from './excel-parser';

/** FMEA 프로젝트 타입 */
export interface FMEAProject {
  id: string;
  fmeaInfo?: {
    subject?: string;
  };
  project?: {
    productName?: string;
  };
  fmeaNo?: string;
}

/** Import 상태 타입 */
export interface ImportState {
  importType: 'full' | 'partial';
  fileName: string;
  flatData: ImportedFlatData[];
  isLoaded: boolean;
  isParsing: boolean;
  parseResult: ParseResult | null;
  pendingData: ImportedFlatData[];
  isImporting: boolean;
  importSuccess: boolean;
}

/** 미리보기 상태 타입 */
export interface PreviewState {
  previewColumn: string;
  selectedRows: Set<string>;
  draggedIndex: number | null;
}

/** 관계형 탭 상태 타입 */
export interface RelationState {
  relationTab: 'A' | 'B' | 'C';
  selectedRelationRows: Set<string>;
}

/** 개별 Import 상태 타입 */
export interface PartialImportState {
  partialItemCode: string;
  partialFileName: string;
  partialPendingData: ImportedFlatData[];
  isPartialParsing: boolean;
}

/** 저장 상태 타입 */
export interface SaveState {
  isSaved: boolean;
  isSaving: boolean;
  dirty: boolean;
}

/** 샘플 FMEA 선택 상태 */
export interface SampleFmeaState {
  sampleFmeaL0: string;
  sampleFmeaL1: string;
  sampleFmeaL2: string;
  sampleFmeaL3: string;
}

/** Tailwind 클래스 정의 */
export const TW_CLASSES = {
  headerCell: 'bg-[#00587a] text-white border border-[#999] text-center font-semibold text-[11px] p-1',
  firstCol: 'bg-[#00587a] text-white border border-[#999] text-center font-semibold text-[11px] p-1',
  dataCell: 'border border-[#999] text-[11px] p-1',
  cellCenter: 'border border-[#999] text-[11px] p-1 text-center align-middle',
  cellPad: 'border border-[#999] text-[11px] px-1 py-0.5 align-middle',
  row: 'h-[28px]',
  evenRow: 'bg-[#e0f2fb]',
  oddRow: 'bg-white',
  input: 'w-full px-1 py-0.5 border border-gray-300 rounded text-[11px] bg-gray-50 focus:bg-white focus:border-blue-400 focus:outline-none',
  btn: 'px-2 py-1 rounded text-[11px] font-medium',
  btnPrimary: 'bg-blue-600 text-white hover:bg-blue-700',
  btnSecondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300',
  btnSuccess: 'bg-green-600 text-white hover:bg-green-700',
  btnWarning: 'bg-orange-500 text-white hover:bg-orange-600',
};



