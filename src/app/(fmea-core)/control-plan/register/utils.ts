/**
 * @file utils.ts
 * @description CP 등록 페이지 유틸리티 함수
 */

import { CFTMember } from '@/components/tables/CFTRegistrationTable';
import { CPInfo, CPType, CP_TYPE_CODE_MAP } from './types';

/**
 * CP 프로젝트 상태를 localStorage에 동기화
 * - 기존 동일 ID 항목을 제거하고 최신 데이터를 맨 앞에 삽입
 */
export function syncToLocalStorage(
  id: string,
  info: CPInfo,
  cft: CFTMember[],
  baseCp: string | null,
  apqp: string | null,
  fmea: string | null
): void {
  try {
    let projects = JSON.parse(localStorage.getItem('cp-projects') || '[]');
    projects = projects.filter((p: { id?: string }) => p.id?.toLowerCase() !== id.toLowerCase());
    projects.unshift({
      id, name: info.subject || id, cpType: info.cpType, cpInfo: info,
      project: { productName: info.subject, customer: info.customerName },
      cftMembers: cft, baseCpId: baseCp, parentApqpNo: apqp, parentFmeaId: fmea, updatedAt: new Date().toISOString(),
    });
    localStorage.setItem('cp-projects', JSON.stringify(projects));
  } catch (e) { console.error('[CP localStorage 동기화] 오류:', e); }
}

/**
 * CP ID 생성
 * - 연도 + 유형코드 + 시퀀스 + 링크 접미사
 */
export function generateCPId(cpType: CPType | string = 'P', confidentialityLevel: string = '', linkGroupNo: number = 0): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const typeChar = CP_TYPE_CODE_MAP[confidentialityLevel] || CP_TYPE_CODE_MAP[cpType] || 'p';
  const linkSuffix = linkGroupNo > 0
    ? `L${String(linkGroupNo).padStart(2, '0')}`
    : 'S';
  try {
    const stored = localStorage.getItem('cp-projects');
    if (stored) {
      const projects = JSON.parse(stored);
      const prefix = `cp${year}-${typeChar}`;
      const ids = projects
        .filter((p: { id?: string }) => p.id?.toLowerCase().startsWith(prefix))
        .map((p: { id?: string }) => {
          const match = p.id?.match(/(\d{3})-[LS]/i);
          return match ? parseInt(match[1]) : 0;
        });
      if (ids.length > 0) return `cp${year}-${typeChar}${(Math.max(...ids) + 1).toString().padStart(3, '0')}-${linkSuffix}`;
    }
  } catch (e) { console.error('[CP ID 생성] 오류:', e); }
  return `cp${year}-${typeChar}001-${linkSuffix}`;
}
