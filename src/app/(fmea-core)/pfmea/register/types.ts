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

/** 고객사 분류 — 특별특성 기호 필터링용 */
export type CustomerIndustry = '' | '자사' | 'LBS' | '현대기아' | 'FORD' | 'BMW';

/** 고객사 분류 옵션 목록 */
export const CUSTOMER_INDUSTRY_OPTIONS: { value: CustomerIndustry; label: string }[] = [
  { value: '', label: '선택 안 함' },
  { value: '자사', label: '자사 (In-house)' },
  { value: 'LBS', label: 'LBS (LB Semicon)' },
  { value: '현대기아', label: '현대/기아 (Hyundai/Kia)' },
  { value: 'FORD', label: 'FORD' },
  { value: 'BMW', label: 'BMW' },
];

export interface FMEAInfo {
  companyName: string;
  engineeringLocation: string;
  customerName: string;
  /** 고객사 분류 — 특별특성 기호 필터링용 (customerName과 별도) */
  customerIndustry: CustomerIndustry;
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
  companyName: 'LBS', engineeringLocation: '평택공장', customerName: '', customerIndustry: '', modelYear: '',
  subject: '', fmeaStartDate: '', fmeaRevisionDate: '', fmeaProjectName: '',
  fmeaId: '', fmeaType: 'P', designResponsibility: '', confidentialityLevel: '',
  fmeaResponsibleName: '', partName: '', partNo: '', linkedCpNo: '', linkedPfdNo: '', linkedDfmeaNo: '',
  createdAt: new Date().toISOString().slice(0, 10), updatedAt: '',
};

// =====================================================
// 상태 타입
// =====================================================

export type SaveStatus = 'idle' | 'saving' | 'saved';
