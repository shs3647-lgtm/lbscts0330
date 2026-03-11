import { WorksheetState, uid } from '../../constants';

export interface FlatRow {
  l1Id: string;
  l1Name: string;
  l1TypeId: string;
  l1Type: string;
  l1FunctionId: string;
  l1Function: string;
  l1RequirementId: string;
  l1Requirement: string;
  l2Id: string;
  l2No: string;
  l2Name: string;
  l2Function: string;
  l2ProductChar: string;
  l3Id: string;
  m4: string;
  l3Name: string;
  l3Function: string;
  l3ProcessChar: string;
}

export type ModalType = 'l1Type' | 'l1Function' | 'l1Requirement' | 'l2Function' | 'l2ProductChar' | 'l3Function' | 'l3ProcessChar' | null;

export interface FunctionTabProps {
  state: WorksheetState;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
  rows: FlatRow[];
  l1Spans: number[];
  l1TypeSpans: number[];
  l1FuncSpans: number[];
  l2Spans: number[];
  setDirty: (dirty: boolean) => void;
  handleInputBlur: () => void;
  handleInputKeyDown: (e: React.KeyboardEvent) => void;
  saveToLocalStorage?: () => void;
}
