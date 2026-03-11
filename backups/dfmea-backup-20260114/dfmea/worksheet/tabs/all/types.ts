/**
 * @file types.ts
 * @description AllTab 전용 타입 정의
 */

import { FlatRow } from '../../constants';

/**
 * 고장연결 UI 타입 (기능분석과 연결)
 */
export interface FailureLinkUI {
  id: string;
  fmId: string;
  fmText: string;
  fcId: string;
  fcText: string;
  fcM4: string;
  fcWe: string;
  feId: string;
  feText: string;
  severity: number;
  processName: string;
  functionName: string;
  productCharName: string;
  workElementName: string;
  specialChar: string;
  pcText: string;
  dcText: string;
  occurrence: number;
  detection: number;
  ap: 'H' | 'M' | 'L' | '';
  rpn: number;
  scClass: string;
  lesson: string;
  prevAction: string;
  detAction: string;
  respPerson: string;
  targetDate: string;
  status: string;
  actionResult: string;
  completeDate: string;
  afterSeverity: number;
  afterOccurrence: number;
  afterDetection: number;
  afterScClass: string;
  afterAP: 'H' | 'M' | 'L' | '';
  afterRPN: number;
  remark: string;
}

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

/**
 * 모달 타입
 */
export type ModalType = 
  | 'severity' 
  | 'occurrence' 
  | 'detection' 
  | 'scClass' 
  | 'afterSeverity' 
  | 'afterOccurrence' 
  | 'afterDetection' 
  | 'afterScClass';

/**
 * 모달 설정
 */
export interface ModalConfig {
  isOpen: boolean;
  type: ModalType | null;
  linkId: string | null;
}

/**
 * SOD 데이터 타입
 */
export interface SODData {
  code: string;
  desc: string;
}

