/**
 * @file types.ts
 * @description 사용자 인증/권한 관련 타입 정의
 * @created 2026-01-19
 */

// 시스템 권한 타입
export type UserRole = 'admin' | 'editor' | 'viewer';

// 모듈별 권한 타입
export type ModulePermission = 'none' | 'read' | 'write';

// 권한 레벨 (숫자가 높을수록 더 많은 권한)
export const ROLE_LEVELS: Record<UserRole, number> = {
  admin: 100,
  editor: 50,
  viewer: 10,
};

// 권한 설명
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: '관리자',
  editor: '편집자',
  viewer: '열람자',
};

// 모듈별 권한 레이블
export const PERM_LABELS: Record<ModulePermission, string> = {
  none: '없음',
  read: '읽기',
  write: '쓰기',
};

// 모듈별 권한 색상
export const PERM_COLORS: Record<ModulePermission, { bg: string; text: string }> = {
  none: { bg: 'bg-gray-100', text: 'text-gray-500' },
  read: { bg: 'bg-blue-50', text: 'text-blue-700' },
  write: { bg: 'bg-green-50', text: 'text-green-700' },
};

// 세션 사용자 정보
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  factory: string;
  department: string;
  position: string;
  role: UserRole;
  isActive: boolean;
}

// 로그인 요청
export interface LoginRequest {
  email: string;
  password: string;
}

// 로그인 응답
export interface LoginResponse {
  success: boolean;
  user?: SessionUser;
  error?: string;
}

// 권한 체크 함수
export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_LEVELS[userRole] >= ROLE_LEVELS[requiredRole];
}

// 관리자 여부
export function isAdmin(role: UserRole): boolean {
  return role === 'admin';
}

// 편집 권한 여부
export function canEdit(role: UserRole): boolean {
  return hasPermission(role, 'editor');
}

// 열람 권한 여부 (모든 역할 가능)
export function canView(role: UserRole): boolean {
  return hasPermission(role, 'viewer');
}
