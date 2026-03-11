/**
 * @file pfdRegister.ts
 * @description WS 등록 타입 정의 (PFD 등록과 동등 수준)
 * @updated 2026-02-10
 */

export type PFDType = 'M' | 'F' | 'P';
export type PFDSelectType = 'M' | 'F' | 'P' | 'ALL' | 'LOAD';

export interface PFDInfo {
    companyName: string;
    engineeringLocation: string;
    customerName: string;
    modelYear: string;
    subject: string;
    pfdStartDate: string;   // wsStartDate로 매핑
    pfdRevisionDate: string; // wsRevisionDate로 매핑
    pfdId: string;           // wsNo로 매핑
    pfdType: PFDType;
    processResponsibility: string;
    confidentialityLevel: string;
    securityLevel: string;
    pfdResponsibleName: string; // wsResponsibleName으로 매핑
    linkedCpNo: string;
    createdAt: string;
    updatedAt: string;
    partName?: string;
    partNo?: string;
    linkedDfmeaNo?: string;
    processName?: string; // WS 전용: 공정명
}

export const INITIAL_PFD: PFDInfo = {
    companyName: '', engineeringLocation: '', customerName: '', modelYear: '',
    subject: '', pfdStartDate: '', pfdRevisionDate: '', pfdId: '',
    pfdType: 'P', processResponsibility: '', confidentialityLevel: '',
    securityLevel: '', pfdResponsibleName: '', linkedCpNo: '', partName: '', partNo: '',
    createdAt: new Date().toISOString().slice(0, 10), updatedAt: '',
    processName: '',
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
export type { CFTMember } from '@/components/tables/CFTRegistrationTable';
export type { CFTAccessLog } from '@/types/project-cft';
