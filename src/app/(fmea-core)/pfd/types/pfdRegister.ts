
export type PFDType = 'M' | 'F' | 'P';
export type PFDSelectType = 'M' | 'F' | 'P' | 'ALL' | 'LOAD';

export interface PFDInfo {
    companyName: string;
    engineeringLocation: string;
    customerName: string;
    modelYear: string;
    subject: string;
    pfdStartDate: string;
    pfdRevisionDate: string;
    pfdId: string;
    pfdType: PFDType;
    processResponsibility: string;
    confidentialityLevel: string;
    securityLevel: string;  // ★ 기밀수준
    pfdResponsibleName: string;
    linkedCpNo: string;
    linkedDfmeaNo?: string;  // ★ 연동 DFMEA 번호
    createdAt: string;   // ✅ 최초 작성일
    updatedAt: string;   // ✅ 수정일
    partName?: string;   // ★ 품명
    partNo?: string;     // ★ 품번
}

export const INITIAL_PFD: PFDInfo = {
    companyName: 'AMPSYSTEM', engineeringLocation: '', customerName: '', modelYear: '',
    subject: '', pfdStartDate: '', pfdRevisionDate: '', pfdId: '',
    pfdType: 'P', processResponsibility: '', confidentialityLevel: '',
    securityLevel: '', pfdResponsibleName: '', linkedCpNo: '', linkedDfmeaNo: '', partName: '', partNo: '',
    createdAt: new Date().toISOString().slice(0, 10), updatedAt: '',
};

export interface PfdItem { id: string; subject: string; type: string; }
export interface FmeaItem { id: string; subject: string; type: string; }
export interface CpItem { id: string; subject: string; type: string; linkedPfdNo?: string; }

export interface LinkedCpItem {
    cpId: string;
    cpType: 'M' | 'F' | 'P';
    status: 'auto' | 'linked' | 'pending';
}

// CFT 관련 타입 re-export
export type { CFTMember } from '@/types/project-cft';
export type { CFTAccessLog } from '@/types/project-cft';
