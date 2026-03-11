/**
 * 기초정보 타입 정의
 * @ref C:\01_Next_FMEA\packages\types\bizinfo.ts
 */

// 통합 프로젝트 기초정보 (한 세트)
export interface BizInfoProject {
  id: string;
  customerName: string;   // 고객명 (현대자동차)
  customerCode: string;   // 코드 (HMC)
  factory: string;        // 공장 (울산공장)
  modelYear: string;      // 모델년도 (2025)
  program: string;        // 프로그램 (NE1)
  productName: string;    // 품명 (도어패널)
  partNo: string;         // 품번 (DP-001)
  createdAt: string;
  updatedAt: string;
}

// 고객 정보 (하위 호환용)
export interface BizInfoCustomer {
  id: string;
  name: string;
  code: string;
  factory: string;
  createdAt: string;
  updatedAt: string;
}

// 품명 정보 (하위 호환용)
export interface BizInfoProduct {
  id: string;
  name: string;
  partNo: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

// 공장 정보 (하위 호환용)
export interface BizInfoFactory {
  id: string;
  name: string;
  code: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export type BizInfoType = 'customer' | 'product' | 'factory' | 'project';

export const BIZINFO_LABELS: Record<BizInfoType, string> = {
  customer: '고객',
  product: '품명',
  factory: '공장',
  project: '기초정보',
};

export const BIZINFO_STORAGE_KEYS = {
  customers: 'ss-bizinfo-customers',
  products: 'ss-bizinfo-products',
  factories: 'ss-bizinfo-factories',
  projects: 'ss-bizinfo-projects',
};

