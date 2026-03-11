/**
 * 사용자 정보 타입 정의
 * @ref C:\01_Next_FMEA\packages\types\user.ts
 */

// 사용자 정보
export interface UserInfo {
  id: string;
  factory: string;        // 공장
  department: string;     // 부서
  name: string;           // 성명
  position: string;       // 직급
  phone: string;          // 전화번호
  email: string;          // 이메일
  remark?: string;        // 비고
  createdAt: string;
  updatedAt: string;
}

// 승인권자 역할
export type ApproverRole = 'PM' | 'CFT(담당자)' | 'Leader' | 'Champion' | '작성' | '검토' | '승인';

// 승인권자 정보
export interface Approver {
  id: string;
  role: ApproverRole;
  department: string;
  name: string;
  position: string;
  phone: string;
  email: string;
}

// CFT 멤버
export interface CFTMember {
  id: string;
  role: 'Champion' | '리더' | '프로젝트 관리자' | '팀(CFT)' | '파트너';
  teamName?: string;
  name: string;
  responsibility?: string;
  position?: string;
  email?: string;
  phone?: string;
}

export const USER_STORAGE_KEY = 'ss-user-info';















