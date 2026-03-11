/**
 * @file all-cells.ts
 * @description dfmea 리스크분석/최적화 셀 렌더링 공통 타입
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
// Note: any 타입은 레거시 데이터 구조 호환성을 위해 의도적으로 사용됨

import { WorksheetState } from '../../../app/(fmea-core)/dfmea/worksheet/constants';

/** 셀 렌더링 공통 Props */
export interface CellProps {
  colIdx: number;
  globalRowIdx: number;
  rowSpan: number;
  cellColor: string;
  cellAltColor: string;
  align: 'left' | 'center' | 'right';
  state?: WorksheetState;
  setState?: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setDirty?: React.Dispatch<React.SetStateAction<boolean>>;
}

/** 컨트롤 셀 Props (예방관리, 검출관리, 특별특성) */
export interface ControlCellProps extends CellProps {
  type: 'prevention' | 'detection' | 'specialChar' | 'prevention-opt' | 'detection-opt';
  onOpenModal: (type: string, rowIndex: number) => void;
}

/** SOD 셀 Props */
export interface SODCellProps extends CellProps {
  category: 'S' | 'O' | 'D';
  targetType: 'risk' | 'opt';
  onSODClick: (category: 'S' | 'O' | 'D', targetType: 'risk' | 'opt', rowIndex: number, currentValue?: number) => void;
}

/** 텍스트 입력 셀 Props */
export interface TextInputCellProps extends CellProps {
  field: string;
  label: string;
}

/** 날짜 입력 셀 Props */
export interface DateInputCellProps extends CellProps {
  field: string;
  label: string;
}

/** 상태 셀 Props */
export interface StatusCellProps extends CellProps {
  options: string[];
}

/** AP 셀 Props */
export interface APCellProps extends CellProps {
  stage: 5 | 6;
  severity: number;
  occurrence: number;
  detection: number;
  onAPClick: (stage: 5 | 6, data: any[]) => void;
}

/** 높이 상수 */
export const HEIGHTS = {
  header1: 32,
  header2: 28,
  header3: 26,
  body: 28,
};
