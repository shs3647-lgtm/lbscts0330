/**
 * @file types.ts
 * @description CP 등록 페이지 타입 정의 및 초기값
 */

import { CFTMember } from '@/components/tables/CFTRegistrationTable';

// =====================================================
// 타입 정의
// =====================================================

/** CP 종류 (M=양산, F=시작, P=시작전) */
export type CPType = 'M' | 'F' | 'P';

/** CP 선택 타입 (ALL=전체, LOAD=불러오기 포함) */
export type CPSelectType = 'M' | 'F' | 'P' | 'ALL' | 'LOAD';

/** CP 기본 정보 */
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
  cpType: CPType;
  processResponsibility: string;
  confidentialityLevel: string;
  securityLevel: string;          // 기밀수준
  cpResponsibleName: string;
  createdAt: string;              // 최초 작성일
  updatedAt: string;              // 수정일
  partName?: string;              // 품명
  partNo?: string;                // 품번
  linkedDfmeaNo?: string;         // 연동 DFMEA 번호
  partNameMode?: string;          // A=부품명 숨김(기본), B=부품명 표시
}

/** CP 초기값 */
export const INITIAL_CP: CPInfo = {
  companyName: '', engineeringLocation: '', customerName: '', modelYear: '',
  subject: '', cpStartDate: '', cpRevisionDate: '', cpProjectName: '',
  cpId: '', cpType: 'P', processResponsibility: '', confidentialityLevel: '',
  securityLevel: '', cpResponsibleName: '', partName: '', partNo: '', linkedDfmeaNo: '', partNameMode: 'A',
  createdAt: new Date().toISOString().slice(0, 10), updatedAt: '',
};

/** CP 종류 -> 유형 코드 매핑 */
export const CP_TYPE_CODE_MAP: Record<string, string> = {
  'Prototype': 't', 'Pre-Launch': 'l', 'Production': 'p', 'Safe Launch': 's',
  'M': 'm', 'F': 'f', 'P': 'p',  // 레거시 호환
};

/** CP 선택 아이템 */
export interface CpItem {
  id: string;
  subject: string;
  type: string;
}

/** FMEA 선택 아이템 */
export interface FmeaItem {
  id: string;
  subject: string;
  type: string;
}

/** 저장 상태 */
export type SaveStatus = 'idle' | 'saving' | 'saved';
