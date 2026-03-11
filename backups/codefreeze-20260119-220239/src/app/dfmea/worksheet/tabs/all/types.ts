// @ts-nocheck
/**
 * @file types.ts
 * @description AllTab 전용 타입 정의
 */

import { FlatRow } from '../../constants';
import { FailureLinkUI, ModalConfig, ModalType, SODData } from '../../../../../types/fmea/all-tab';

/**
 * AllTab Props
 */
export interface AllTabRendererProps {
  rows: FlatRow[];
  state: any;
  onUpdateState: (updates: any) => void;
  l1Spans: number[];
  l2Spans: number[];
  l1TypeSpans?: number[];
  l1FuncSpans?: number[];
}

// FailureLinkUI, ModalType, ModalConfig, SODData는 공용 타입으로 분리됨

