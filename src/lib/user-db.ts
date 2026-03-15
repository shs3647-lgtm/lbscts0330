/**
 * 사용자 정보 데이터베이스 - DB 우선, localStorage 폴백
 * 
 * 저장 우선순위:
 * 1. PostgreSQL DB (전체 프로젝트 공유) - API: /api/users
 * 2. localStorage (폴백, DB 미연결 시)
 * 
 * @ref C:\01_Next_FMEA\packages\core\user-info-db.ts
 */

import { UserInfo, USER_STORAGE_KEY } from '@/types/user';

// ============ DB 우선, localStorage 폴백 패턴 ============

/**
 * 전체 사용자 조회
 * DB 우선, 실패 시 localStorage 사용
 */
export async function getAllUsers(): Promise<UserInfo[]> {
  try {
    // DB에서 조회 시도 (cache: 'no-store'로 항상 최신 데이터 보장)
    const res = await fetch('/api/users', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.users) {
        // DB 데이터를 localStorage에 캐시로 저장 (폴백용)
        if (typeof window !== 'undefined') {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.users));
        }
        return data.users;
      }
    }
  } catch (error) {
    console.error('[user-db] 사용자 목록 DB 조회 실패:', error);
  }

  // 폴백: localStorage 사용
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(USER_STORAGE_KEY);
  const users = data ? JSON.parse(data) : [];
  return users;
}

/**
 * 사용자 생성
 * DB 우선, 실패 시 localStorage 사용
 */
export async function createUser(user: Omit<UserInfo, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserInfo> {
  try {
    // DB에 저장 시도
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.user) {
        // localStorage에도 동기화
        const users = await getAllUsers();
        if (typeof window !== 'undefined') {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
        }
        return data.user;
      }
    }
  } catch (error) {
    console.error('[user-db] 사용자 DB 생성 실패:', error);
  }

  // 폴백: localStorage 사용
  const now = new Date().toISOString();
  const newUser: UserInfo = {
    id: crypto.randomUUID(),
    ...user,
    createdAt: now,
    updatedAt: now,
  };
  const users = await getAllUsers();
  users.push(newUser);
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
  }
  return newUser;
}

/**
 * 사용자 수정
 * DB 우선, 실패 시 localStorage 사용
 */
export async function updateUser(id: string, updates: Partial<Omit<UserInfo, 'id' | 'createdAt'>>): Promise<void> {
  try {
    // DB에서 현재 사용자 정보 가져오기
    const allUsers = await getAllUsers();
    const existing = allUsers.find(u => u.id === id);
    if (!existing) {
      return;
    }

    const updatedUser = { ...existing, ...updates };

    // DB에 업데이트 시도
    const res = await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        // localStorage에도 동기화
        const users = await getAllUsers();
        if (typeof window !== 'undefined') {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
        }
        return;
      }
    }
  } catch (error) {
    console.error('[user-db] 사용자 DB 수정 실패:', error);
  }

  // 폴백: localStorage 사용
  const users = await getAllUsers();
  const index = users.findIndex(u => u.id === id);
  if (index !== -1) {
    users[index] = {
      ...users[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
    }
  }
}

/**
 * 사용자 삭제
 * DB 우선, 실패 시 에러 throw (호출자에서 처리)
 * @returns true = 삭제 성공
 * @throws Error = 삭제 실패 (API 오류, DB 제약 등)
 */
export async function deleteUser(id: string): Promise<boolean> {
  console.log('[user-db] deleteUser called, id:', id);

  if (!id || typeof id !== 'string') {
    throw new Error('삭제할 사용자 ID가 유효하지 않습니다.');
  }

  try {
    const res = await fetch(`/api/users?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    let data: { success?: boolean; error?: string; message?: string };
    try {
      data = await res.json();
    } catch {
      throw new Error(`서버 응답 파싱 실패 (HTTP ${res.status})`);
    }

    console.log('[user-db] deleteUser response:', res.status, data);

    if (res.ok && data.success) {
      // localStorage에도 동기화
      try {
        const users = await getAllUsers();
        if (typeof window !== 'undefined') {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
        }
      } catch (syncError) {
        console.error('[user-db] localStorage 동기화 실패 (삭제는 성공):', syncError);
      }
      return true;
    }

    // API가 명시적 에러 반환
    throw new Error(data.error || `삭제 실패 (HTTP ${res.status})`);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      // 네트워크 오류 → 에러 전파 (조용히 성공 처리하면 안 됨)
      console.error('[user-db] 네트워크 오류:', error);
      throw new Error('네트워크 오류로 삭제할 수 없습니다. 서버 연결을 확인해주세요.');
    }
    // DB/API 오류는 호출자에게 전파
    throw error;
  }
}


