/**
 * @file types.ts
 * @description PFMEA 등록 페이지 타입 정의
 * @module pfmea/register
 * @updated 2026-02-10 page.tsx 분리 리팩토링 - 누락 필드 추가
 */

// =====================================================
// FMEA 유형
// =====================================================

export type FMEAType = 'M' | 'F' | 'P';
export type FMEASelectType = 'M' | 'F' | 'P' | 'ALL' | 'LOAD' | 'MF';

// =====================================================
// FMEA 정보 인터페이스
// =====================================================

export interface FMEAInfo {
  companyName: string;
  engineeringLocation: string;
  customerName: string;
  modelYear: string;
  subject: string;
  fmeaStartDate: string;
  fmeaRevisionDate: string;
  fmeaProjectName: string;
  fmeaId: string;
  fmeaType: FMEAType;
  designResponsibility: string;
  confidentialityLevel: string;
  fmeaResponsibleName: string;
  partName: string;
  partNo: string;
  linkedCpNo: string;
  linkedPfdNo: string;
  linkedDfmeaNo: string;
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// 초기 데이터
// =====================================================

export const INITIAL_FMEA: FMEAInfo = {
  companyName: '', engineeringLocation: '', customerName: '', modelYear: '',
  subject: '', fmeaStartDate: '', fmeaRevisionDate: '', fmeaProjectName: '',
  fmeaId: '', fmeaType: 'P', designResponsibility: '', confidentialityLevel: '',
  fmeaResponsibleName: '', partName: '', partNo: '', linkedCpNo: '', linkedPfdNo: '', linkedDfmeaNo: '',
  createdAt: new Date().toISOString().slice(0, 10), updatedAt: '',
};

// =====================================================
// 상태 타입
// =====================================================

export type SaveStatus = 'idle' | 'saving' | 'saved';
