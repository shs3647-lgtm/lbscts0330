/**
 * 시스템 역할 — 시스템관리자(ADMIN) vs 기업관리자(MANAGER)
 * - ADMIN: /admin, /api/admin 전용
 * - MANAGER: 고객사·CFT(직원) 기초정보 /master/customer, /master/user
 */

export const ROLE_ADMIN = 'admin';
export const ROLE_MANAGER = 'manager';

/** 시스템 관리(Admin 모듈, Admin API) */
export function isSystemAdminRole(role: string | null | undefined): boolean {
  return role === ROLE_ADMIN;
}

/** 기업 기초정보(고객사, CFT/직원 마스터) 접근 */
export function canAccessEnterpriseMasterRole(role: string | null | undefined): boolean {
  return role === ROLE_ADMIN || role === ROLE_MANAGER;
}

/** fmea-user 쿠키 JSON에서 role 추출 */
export function parseRoleFromFmeaUserCookie(cookieValue: string | null | undefined): string | null {
  if (!cookieValue || !cookieValue.trim()) return null;
  try {
    const decoded = decodeURIComponent(cookieValue);
    const u = JSON.parse(decoded) as { role?: string };
    return typeof u.role === 'string' ? u.role : null;
  } catch {
    try {
      const u = JSON.parse(cookieValue) as { role?: string };
      return typeof u.role === 'string' ? u.role : null;
    } catch {
      return null;
    }
  }
}
