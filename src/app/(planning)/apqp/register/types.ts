/**
 * @file types.ts
 * @description APQP 등록 페이지 타입 및 초기값
 */

export type DevLevel = 'NEW' | 'MAJOR' | 'MINOR' | 'OTHER' | '';

export interface APQPInfo {
  companyName: string;
  engineeringLocation: string;
  customerName: string;
  modelYear: string;
  subject: string;
  apqpStartDate: string;
  apqpRevisionDate: string;
  apqpId: string;
  developmentLevel: DevLevel;
  processResponsibility: string;
  confidentialityLevel: string;
  apqpResponsibleName: string;
  partName?: string;
  partNo?: string;
}

export const INITIAL_APQP: APQPInfo = {
  companyName: '', engineeringLocation: '', customerName: '', modelYear: '',
  subject: '', apqpStartDate: '', apqpRevisionDate: '', apqpId: '',
  developmentLevel: '', processResponsibility: '', confidentialityLevel: '',
  apqpResponsibleName: '', partName: '', partNo: '',
};
