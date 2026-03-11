/**
 * @file utils.ts
 * @description APQP 등록 유틸리티 함수
 */

import { APQPInfo, DevLevel } from './types';
import { CFTMember } from '@/components/tables/CFTRegistrationTable';

/** ID 생성 (개발레벨별: pj26-n001, pj26-ma001, pj26-mi001, pj26-p001) */
export function generateAPQPId(devLevel: DevLevel = ''): string {
  const year = new Date().getFullYear().toString().slice(-2);
  let typeChar = 'p';
  if (devLevel === 'NEW') typeChar = 'n';
  else if (devLevel === 'MAJOR') typeChar = 'ma';
  else if (devLevel === 'MINOR') typeChar = 'mi';

  try {
    const stored = localStorage.getItem('apqp-projects');
    if (stored) {
      const projects = JSON.parse(stored);
      const prefix = `pj${year}-${typeChar}`;
      const ids = projects
        .filter((p: any) => p.id?.toLowerCase().startsWith(prefix))
        .map((p: any) => parseInt(p.id.match(/\d{3}$/)?.[0] || '0'));
      if (ids.length > 0) return `pj${year}-${typeChar}${(Math.max(...ids) + 1).toString().padStart(3, '0')}`;
    }
  } catch (e) { console.error('[APQP ID 생성] 오류:', e); }
  return `pj${year}-${typeChar}001`;
}

/** localStorage 동기화 */
export function syncToLocalStorage(id: string, info: APQPInfo, cft: CFTMember[], fmea: string | null, cp: string | null) {
  try {
    let projects = JSON.parse(localStorage.getItem('apqp-projects') || '[]');
    projects = projects.filter((p: any) => p.id?.toLowerCase() !== id.toLowerCase());
    projects.unshift({
      id, name: info.subject || id, apqpInfo: info,
      cftMembers: cft, linkedFmea: fmea, linkedCp: cp, updatedAt: new Date().toISOString(),
    });
    localStorage.setItem('apqp-projects', JSON.stringify(projects));
  } catch (e) { console.error('[localStorage 동기화] 오류:', e); }
}

/** 변경 이력 기록 */
export function recordChangeHistory(
  targetId: string,
  apqpInfo: APQPInfo,
  originalData: APQPInfo,
  userName: string,
) {
  const fieldLabels: Record<keyof APQPInfo, string> = {
    companyName: '회사명', engineeringLocation: '엔지니어링 위치', customerName: '고객명',
    modelYear: '모델 연식', subject: 'APQP명', apqpStartDate: '시작 일자',
    apqpRevisionDate: '목표 완료일', apqpId: 'APQP ID', developmentLevel: '개발레벨',
    processResponsibility: '개발 책임', confidentialityLevel: '기밀유지 수준', apqpResponsibleName: 'APQP 담당자',
    partName: '품명', partNo: '품번',
  };

  const changes: { field: string; oldValue: string; newValue: string }[] = [];

  (Object.keys(apqpInfo) as (keyof APQPInfo)[]).forEach(key => {
    const oldVal = originalData[key] || '';
    const newVal = apqpInfo[key] || '';
    if (oldVal !== newVal) {
      changes.push({ field: fieldLabels[key] || key, oldValue: oldVal, newValue: newVal });
    }
  });

  if (changes.length === 0) return;

  const historyKey = `apqp_change_history_${targetId}`;
  const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');

  const newEntry = {
    id: `CH-${Date.now()}`,
    timestamp: new Date().toISOString(),
    user: userName,
    apqpId: targetId,
    apqpName: apqpInfo.subject || '',
    changes,
    description: changes.map(c => `${c.field}: "${c.oldValue}" → "${c.newValue}"`).join(', '),
  };

  existingHistory.unshift(newEntry);
  localStorage.setItem(historyKey, JSON.stringify(existingHistory.slice(0, 100)));
}
