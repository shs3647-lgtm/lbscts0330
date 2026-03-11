/**
 * Project CFT (Cross Functional Team) shared types
 * - CFT 관리 화면에서 공통 사용
 */

export const CFT_DEFAULT_ROLES = [
  'Champion',
  'Leader',
  'PM',
  'Moderator',
  'CFT 팀원',
] as const;

export type CFTRole = (typeof CFT_DEFAULT_ROLES)[number];

export type CFTActionType = '추가' | '수정' | '삭제' | '조회' | '승인' | '생성';

export interface CFTMember {
  id: string;
  projectId: string;
  role: CFTRole | string;
  factory: string;
  department: string;
  name: string;
  position: string;
  responsibility: string;
  phone: string;
  email: string;
  remark: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CFTAccessLog {
  id: number;
  projectId: string;
  userName: string;
  loginTime: string; // YYYY-MM-DD HH:mm:ss
  logoutTime: string | null;
  action: CFTActionType;
  itemType: string;
  cellAddress: string;
  description: string;
}

export interface ProjectCFTSnapshot {
  projectId: string;
  members: CFTMember[];
  accessLogs: CFTAccessLog[];
  updatedAt: string;
}















