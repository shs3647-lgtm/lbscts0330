/**
 * @file types.ts
 * @description CP 등록 페이지 타입 정의
 */

// CP 유형
export type CPType = 'M' | 'F' | 'P';

// CP 기본정보
export interface CPInfo {
  companyName: string;
  engineeringLocation: string;
  customerName: string;
  modelYear: string;
  subject: string;
  cpStartDate: string;
  cpRevisionDate: string;
  cpProjectName: string;
  cpId: string;
  processResponsibility: string;
  confidentialityLevel: string;
  cpResponsibleName: string;
  cpType: CPType;
}

// 초기 CP 정보
export const INITIAL_CP: CPInfo = {
  companyName: '',
  engineeringLocation: '',
  customerName: '',
  modelYear: '',
  subject: '',
  cpStartDate: '',
  cpRevisionDate: '',
  cpProjectName: '',
  cpId: '',
  processResponsibility: '',
  confidentialityLevel: '',
  cpResponsibleName: '',
  cpType: 'P',
};

// FMEA 선택 항목
export interface FmeaSelectItem {
  id: string;
  subject: string;
  type: string;
}

// CP 선택 항목
export interface CpSelectItem {
  id: string;
  subject: string;
  type: string;
}

// 저장 상태
export type SaveStatus = 'idle' | 'saving' | 'saved';



