/**
 * @file utils.ts
 * @description PFMEA 개정관리 유틸리티 함수
 * @module pfmea/revision
 *
 * @status CODEFREEZE L4 (Gold) 🔒
 * @freeze_level L4 (Critical - Gold Test Passed)
 * @frozen_date 2026-03-02
 * @gold_tag v4.0.0-gold
 * @allowed_changes NONE — 사용자 명시적 승인 + full test pass 필수
 */

import { RevisionRecord, FMEAInfoData } from './types';

// =====================================================
// 개정번호 정규화 (Rev.XX → N.XX)
// =====================================================

export const normalizeRevisionNumber = (revNum: string): string => {
  if (!revNum) return '0.00';
  // Rev.00 → 0.00, Rev.01 → 0.01, ...
  const revMatch = revNum.match(/^Rev\.?(\d{2})$/i);
  if (revMatch) {
    const minor = parseInt(revMatch[1], 10);
    return `0.${minor.toString().padStart(2, '0')}`;
  }
  // 이미 N.XX 형식이면 그대로
  if (/^\d+\.\d{2}$/.test(revNum)) {
    return revNum;
  }
  return '0.00';
};

// =====================================================
// 초기 개정 이력 생성 (FMEA 등록정보 자동 반영)
// =====================================================

export const createDefaultRevisions = (
  projectId: string,
  fmeaInfo?: FMEAInfoData | null
): RevisionRecord[] =>
  Array.from({ length: 3 }, (_, index) => ({
    id: `REV-${projectId}-${index}`,
    projectId: projectId,
    revisionNumber: `0.${index.toString().padStart(2, '0')}`,
    revisionDate: index === 0 ? new Date().toISOString().split('T')[0] : '',
    revisionHistory: index === 0 ? '신규 프로젝트 등록' : '',
    // 작성 (FMEA 등록정보에서 자동 채움)
    createPosition: index === 0 ? (fmeaInfo?.fmeaResponsiblePosition || '리더') : '',
    createName: index === 0 ? (fmeaInfo?.fmeaResponsibleName || '') : '',
    createDate: index === 0 ? new Date().toISOString().split('T')[0] : '',
    createStatus: index === 0 ? '진행' : '',
    // 검토
    reviewPosition: index === 0 ? (fmeaInfo?.reviewResponsiblePosition || 'te') : '',
    reviewName: index === 0 ? (fmeaInfo?.reviewResponsibleName || '') : '',
    reviewDate: '',
    reviewStatus: '',
    // 승인
    approvePosition: index === 0 ? (fmeaInfo?.approvalResponsiblePosition || 'champion') : '',
    approveName: index === 0 ? (fmeaInfo?.approvalResponsibleName || '') : '',
    approveDate: '',
    approveStatus: '',
  }));

