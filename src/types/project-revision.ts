/**
 * Project Revision (개정이력) shared types
 * - 개정관리 화면에서 공통 사용
 */

export interface RevisionRecord {
  id: string;
  projectId: string;
  revisionNumber: string; // Rev.00, Rev.01, Rev.02...
  revisionHistory: string; // 개정이력 텍스트
  
  // 작성자
  createPosition: string;
  createName: string;
  createDate: string;
  createStatus: RevisionStatus;
  
  // 검토자
  reviewPosition: string;
  reviewName: string;
  reviewDate: string;
  reviewStatus: RevisionStatus;
  
  // 승인자
  approvePosition: string;
  approveName: string;
  approveDate: string;
  approveStatus: RevisionStatus;
}

export type RevisionStatus = '진행' | '승인' | '반려' | '';

export const REVISION_STATUS_OPTIONS: RevisionStatus[] = ['진행', '승인', '반려'];

export const DEFAULT_REVISION_COUNT = 5;

/**
 * Meeting Minutes (회의록) shared types
 */
export interface MeetingMinute {
  id: string;
  no: number;
  date: string;
  projectName: string;
  content: string;
  author: string;
  authorPosition: string;
  attachment?: {
    fileName: string;
    fileData: string; // Base64 encoded
    fileSize: number;
  };
}















