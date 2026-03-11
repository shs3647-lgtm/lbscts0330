/**
 * @file types.ts
 * @description PFMEA 개정관리 타입 정의
 * @module pfmea/revision
 *
 * @status CODEFREEZE L4 (Gold) 🔒
 * @freeze_level L4 (Critical - Gold Test Passed)
 * @frozen_date 2026-03-02
 * @gold_tag v4.0.0-gold
 * @allowed_changes NONE — 사용자 명시적 승인 + full test pass 필수
 */

// =====================================================
// FMEA 프로젝트 타입
// =====================================================

export interface FMEAProject {
  id: string;
  project: {
    projectName: string;
    customer: string;
    productName: string;
  };
  createdAt?: string;
}

// =====================================================
// 개정 이력 레코드
// =====================================================

export interface RevisionRecord {
  id: string;
  projectId: string;
  revisionNumber: string; // 1.00, 1.01, 1.02...
  revisionDate: string;   // 개정일자 (YYYY-MM-DD)
  revisionHistory: string; // 개정이력 설명
  // 작성
  createPosition: string;
  createName: string;
  createDate: string;
  createStatus: string; // 진행/승인/반려
  // 검토
  reviewPosition: string;
  reviewName: string;
  reviewDate: string;
  reviewStatus: string;
  // 승인
  approvePosition: string;
  approveName: string;
  approveDate: string;
  approveStatus: string;
}

// =====================================================
// FMEA 등록정보 타입
// =====================================================

export interface FMEAInfoData {
  fmeaName?: string;
  subject?: string;
  customerName?: string;
  engineeringLocation?: string;
  modelYear?: string;
  factory?: string;
  responsible?: string;
  customer?: string;
  productName?: string;
  partName?: string;
  fmeaResponsibleName?: string;
  fmeaResponsiblePosition?: string;
  reviewResponsibleName?: string;
  reviewResponsiblePosition?: string;
  approvalResponsibleName?: string;
  approvalResponsiblePosition?: string;
  fmeaRevisionDate?: string; // 목표완료일
}

// =====================================================
// SOD 히스토리 타입
// =====================================================

export interface SODHistoryRecord {
  id: string;
  date: string;
  severity: number;
  occurrence: number;
  detection: number;
  rpn: number;
  apRanking: string;
  note: string;
}
