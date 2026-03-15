/**
 * @file utils.ts
 * @description PFMEA 등록 페이지 유틸리티 함수
 * @module pfmea/register
 */

import { FMEAType, FMEAInfo } from './types';
import { CFTMember } from '@/components/tables/CFTRegistrationTable';

// =====================================================
// FMEA ID 생성
// =====================================================

/**
 * ★★★ 2026-02-07: DB 기반 FMEA ID 생성 (비동기) ★★★
 * /api/fmea/next-id API를 호출하여 DB에서 다음 시퀀스 번호를 가져옴
 *
 * 형식: pfm{YY}-{t}{NNN}-{L{NN}|S}
 * 예시: pfm26-m001-L01 (Master, 연동그룹01), pfm26-f001-S (Family, 단독)
 */
export async function generateFMEAIdFromDB(fmeaType: FMEAType = 'P', linkGroupNo: number = 0): Promise<string> {
  try {
    const res = await fetch(`/api/fmea/next-id?type=${fmeaType}&module=pfmea&linkGroup=${linkGroupNo}`);
    const json = await res.json();
    if (json.success && json.nextId) {
      return json.nextId;
    }
  } catch (e) {
    console.error('[ID] ❌ DB ID 생성 실패, 폴백 사용:', e);
  }
  // 폴백: 기본값 (Master/Family는 접미사 없음, Part만 사용)
  const year = new Date().getFullYear().toString().slice(-2);
  const typeChar = fmeaType.toLowerCase();
  const suffix = fmeaType === 'P'
    ? (linkGroupNo > 0 ? `-L${String(linkGroupNo).padStart(2, '0')}` : '-S')
    : '';
  return `pfm${year}-${typeChar}001${suffix}-r00`;
}

/** 동기 버전 (하위호환) - localStorage 폴백 */
export function generateFMEAId(fmeaType: FMEAType = 'P', linkGroupNo: number = 0): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const typeChar = fmeaType.toLowerCase();
  const suffix = fmeaType === 'P'
    ? (linkGroupNo > 0 ? `-L${String(linkGroupNo).padStart(2, '0')}` : '-S')
    : '';
  return `pfm${year}-${typeChar}001${suffix}-r00`;
}

// =====================================================
// localStorage 동기화
// =====================================================

/**
 * localStorage에 프로젝트 데이터 동기화
 * DB 저장 실패 시 폴백으로 사용
 */
export function syncToLocalStorage(
  id: string,
  info: FMEAInfo,
  cft: CFTMember[],
  selectedBaseFmea: string | null,
  selectedParentApqp: string | null
): void {
  try {
    const normalizedId = id.toLowerCase();
    let projects = [];
    const stored = localStorage.getItem('pfmea-projects');
    if (stored) projects = JSON.parse(stored);

    // 기존 항목 제거 (대소문자 무관)
    projects = projects.filter((p: any) => p.id?.toLowerCase() !== normalizedId);

    // 완전한 프로젝트 데이터 저장
    const projectData = {
      id: normalizedId,
      name: info.subject || normalizedId,
      fmeaType: info.fmeaType || 'P',
      fmeaInfo: info,
      project: {
        projectName: info.fmeaProjectName || info.subject,
        customer: info.customerName,
        productName: info.subject,
        department: info.designResponsibility,
        leader: info.fmeaResponsibleName,
        startDate: info.fmeaStartDate,
      },
      cftMembers: cft,
      parentFmeaId: selectedBaseFmea || null,
      parentApqpNo: selectedParentApqp || null,
      updatedAt: new Date().toISOString(),
    };

    projects.unshift(projectData);
    localStorage.setItem('pfmea-projects', JSON.stringify(projects));
  } catch (e) {
    console.error('[localStorage] ❌ 동기화 실패:', e);
  }
}

// =====================================================
// 데이터 변환 유틸
// =====================================================

/**
 * DB 응답을 FMEAInfo로 변환
 */
export function mapDbToFmeaInfo(project: any): FMEAInfo {
  const info = project.fmeaInfo || {};
  const proj = project.project || {};

  return {
    companyName: info.companyName || proj.department || '',
    engineeringLocation: info.engineeringLocation || '',
    customerName: info.customerName || proj.customer || '',
    customerIndustry: (info.customerIndustry || '') as import('./types').CustomerIndustry,
    modelYear: info.modelYear || '',
    subject: info.subject || proj.productName || '',
    fmeaStartDate: info.fmeaStartDate || proj.startDate || '',
    fmeaRevisionDate: info.fmeaRevisionDate || '',
    fmeaProjectName: info.fmeaProjectName || proj.projectName || '',
    fmeaId: project.id || '',
    fmeaType: (info.fmeaType || project.fmeaType || 'P') as FMEAType,
    designResponsibility: info.designResponsibility || proj.department || '',
    confidentialityLevel: info.confidentialityLevel || '',
    fmeaResponsibleName: info.fmeaResponsibleName || proj.leader || '',
    partName: info.partName || '',
    partNo: info.partNo || '',
    linkedCpNo: info.linkedCpNo || '',
    linkedPfdNo: info.linkedPfdNo || '',
    linkedDfmeaNo: info.linkedDfmeaNo || '',
    createdAt: info.createdAt || project.createdAt || '',
    updatedAt: info.updatedAt || project.updatedAt || '',
  };
}

/**
 * localStorage 응답을 FMEAInfo로 변환
 */
export function mapLocalToFmeaInfo(project: any): FMEAInfo {
  const info = project.fmeaInfo || {};

  return {
    companyName: info.companyName || '',
    engineeringLocation: info.engineeringLocation || '',
    customerName: info.customerName || '',
    customerIndustry: (info.customerIndustry || '') as import('./types').CustomerIndustry,
    modelYear: info.modelYear || '',
    subject: info.subject || project.name || '',
    fmeaStartDate: info.fmeaStartDate || '',
    fmeaRevisionDate: info.fmeaRevisionDate || '',
    fmeaProjectName: info.fmeaProjectName || '',
    fmeaId: project.id || '',
    fmeaType: (info.fmeaType || project.fmeaType || 'P') as FMEAType,
    designResponsibility: info.designResponsibility || '',
    confidentialityLevel: info.confidentialityLevel || '',
    fmeaResponsibleName: info.fmeaResponsibleName || '',
    partName: info.partName || '',
    partNo: info.partNo || '',
    linkedCpNo: info.linkedCpNo || '',
    linkedPfdNo: info.linkedPfdNo || '',
    linkedDfmeaNo: info.linkedDfmeaNo || '',
    createdAt: info.createdAt || '',
    updatedAt: info.updatedAt || '',
  };
}

