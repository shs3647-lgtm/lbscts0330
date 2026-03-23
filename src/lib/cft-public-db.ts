/**
 * CFT·직원 공용 디렉터리 (public.cft_public_members)
 * — 로그인 `users`와 분리. `/api/cft-public-members` + localStorage 폴백
 */

import { UserInfo } from '@/types/user';

export const CFT_PUBLIC_STORAGE_KEY = 'ss-cft-public-directory';

export async function getAllCftPublicMembers(): Promise<UserInfo[]> {
  try {
    const res = await fetch('/api/cft-public-members', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.members)) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(CFT_PUBLIC_STORAGE_KEY, JSON.stringify(data.members));
        }
        return data.members as UserInfo[];
      }
    }
  } catch (error) {
    console.error('[cft-public-db] 목록 조회 실패:', error);
  }

  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(CFT_PUBLIC_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as UserInfo[]) : [];
}

export async function createCftPublicMember(
  user: Omit<UserInfo, 'id' | 'createdAt' | 'updatedAt'>
): Promise<UserInfo> {
  try {
    const res = await fetch('/api/cft-public-members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.member) {
        await getAllCftPublicMembers();
        return data.member as UserInfo;
      }
    }
  } catch (error) {
    console.error('[cft-public-db] 생성 실패:', error);
  }

  const now = new Date().toISOString();
  const newRow: UserInfo = {
    id: crypto.randomUUID(),
    ...user,
    createdAt: now,
    updatedAt: now,
  };
  const list = await getAllCftPublicMembers();
  list.push(newRow);
  if (typeof window !== 'undefined') {
    localStorage.setItem(CFT_PUBLIC_STORAGE_KEY, JSON.stringify(list));
  }
  return newRow;
}

export async function updateCftPublicMember(
  id: string,
  updates: Partial<Omit<UserInfo, 'id' | 'createdAt'>>
): Promise<void> {
  const all = await getAllCftPublicMembers();
  const existing = all.find((u) => u.id === id);
  if (!existing) return;

  try {
    const res = await fetch('/api/cft-public-members', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        await getAllCftPublicMembers();
        return;
      }
    }
  } catch (error) {
    console.error('[cft-public-db] 수정 실패:', error);
  }

  const list = await getAllCftPublicMembers();
  const index = list.findIndex((u) => u.id === id);
  if (index !== -1) {
    list[index] = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem(CFT_PUBLIC_STORAGE_KEY, JSON.stringify(list));
    }
  }
}

export async function deleteCftPublicMember(id: string): Promise<boolean> {
  if (!id || typeof id !== 'string') {
    throw new Error('삭제할 ID가 유효하지 않습니다.');
  }

  try {
    const res = await fetch(`/api/cft-public-members?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    let data: { success?: boolean; error?: string };
    try {
      data = await res.json();
    } catch {
      throw new Error(`서버 응답 파싱 실패 (HTTP ${res.status})`);
    }

    if (res.ok && data.success) {
      try {
        await getAllCftPublicMembers();
      } catch (syncError) {
        console.error('[cft-public-db] localStorage 동기화 실패 (삭제는 성공):', syncError);
      }
      return true;
    }
    throw new Error(data.error || `삭제 실패 (HTTP ${res.status})`);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('네트워크 오류로 삭제할 수 없습니다.');
    }
    throw error;
  }
}
