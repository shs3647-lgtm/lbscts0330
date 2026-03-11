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

// UUID 생성
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============ DB 우선, localStorage 폴백 패턴 ============

/**
 * 전체 사용자 조회
 * DB 우선, 실패 시 localStorage 사용
 */
export async function getAllUsers(): Promise<UserInfo[]> {
  try {
    // DB에서 조회 시도
    const res = await fetch('/api/users');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.users) {
        console.log(`✅ [Users] DB에서 ${data.users.length}명 조회`);
        // DB 데이터를 localStorage에 캐시로 저장 (폴백용)
        if (typeof window !== 'undefined') {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.users));
        }
        return data.users;
      }
    }
  } catch (error) {
    console.warn('[Users] DB 조회 실패, localStorage 폴백:', error);
  }

  // 폴백: localStorage 사용
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(USER_STORAGE_KEY);
  const users = data ? JSON.parse(data) : [];
  console.log(`⚠️ [Users] localStorage에서 ${users.length}명 조회 (폴백)`);
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
        console.log(`✅ [Users] DB에 사용자 생성: ${data.user.name}`);
        // localStorage에도 동기화
        const users = await getAllUsers();
        if (typeof window !== 'undefined') {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
        }
        return data.user;
      }
    }
  } catch (error) {
    console.warn('[Users] DB 생성 실패, localStorage 폴백:', error);
  }

  // 폴백: localStorage 사용
  const now = new Date().toISOString();
  const newUser: UserInfo = {
    id: generateUUID(),
    ...user,
    createdAt: now,
    updatedAt: now,
  };
  const users = await getAllUsers();
  users.push(newUser);
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
  }
  console.log(`⚠️ [Users] localStorage에 사용자 생성 (폴백): ${newUser.name}`);
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
      console.warn(`[Users] 사용자를 찾을 수 없음: ${id}`);
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
        console.log(`✅ [Users] DB에 사용자 수정: ${id}`);
        // localStorage에도 동기화
        const users = await getAllUsers();
        if (typeof window !== 'undefined') {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
        }
        return;
      }
    }
  } catch (error) {
    console.warn('[Users] DB 수정 실패, localStorage 폴백:', error);
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
    console.log(`⚠️ [Users] localStorage에 사용자 수정 (폴백): ${id}`);
  }
}

/**
 * 사용자 삭제
 * DB 우선, 실패 시 localStorage 사용
 */
export async function deleteUser(id: string): Promise<void> {
  try {
    // DB에서 삭제 시도
    const res = await fetch(`/api/users?id=${id}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        console.log(`✅ [Users] DB에서 사용자 삭제: ${id}`);
        // localStorage에도 동기화
        const users = await getAllUsers();
        if (typeof window !== 'undefined') {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
        }
        return;
      }
    }
  } catch (error) {
    console.warn('[Users] DB 삭제 실패, localStorage 폴백:', error);
  }

  // 폴백: localStorage 사용
  const users = await getAllUsers();
  const filtered = users.filter(u => u.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(filtered));
  }
  console.log(`⚠️ [Users] localStorage에서 사용자 삭제 (폴백): ${id}`);
}

/**
 * 이메일로 사용자 조회
 */
export async function getUserByEmail(email: string): Promise<UserInfo | undefined> {
  const users = await getAllUsers();
  return users.find(u => u.email === email);
}

/**
 * 샘플 사용자 데이터 생성
 * DB 우선, localStorage 폴백
 */
export async function createSampleUsers(): Promise<void> {
  const existingUsers = await getAllUsers();
  if (existingUsers.length >= 10) {
    console.log('ℹ️ 샘플 사용자 이미 존재 (10명 이상)');
    return;
  }

  const sampleUsers: Omit<UserInfo, 'id' | 'createdAt' | 'updatedAt'>[] = [
    { factory: '울산공장', department: '품질보증팀', name: '김철수', position: '차장', phone: '010-1234-5678', email: 'kim.cs@example.com', remark: 'FMEA 담당' },
    { factory: '서울공장', department: '생산기술팀', name: '이영희', position: '과장', phone: '010-2345-6789', email: 'lee.yh@example.com', remark: 'CP 담당' },
    { factory: '부산공장', department: '품질관리팀', name: '박민수', position: '대리', phone: '010-3456-7890', email: 'park.ms@example.com', remark: 'PFD 담당' },
    { factory: '울산공장', department: '공정개선팀', name: '최지원', position: '사원', phone: '010-4567-8901', email: 'choi.jw@example.com', remark: 'WS 담당' },
    { factory: '서울공장', department: '프로젝트팀', name: '정수연', position: '부장', phone: '010-5678-9012', email: 'jung.sy@example.com', remark: 'PM 담당' },
    { factory: '부산공장', department: '설계팀', name: '강동훈', position: '차장', phone: '010-6789-0123', email: 'kang.dh@example.com', remark: '설계 검증' },
    { factory: '울산공장', department: '제조팀', name: '윤서아', position: '과장', phone: '010-7890-1234', email: 'yoon.sa@example.com', remark: '제조 공정' },
    { factory: '서울공장', department: 'R&D팀', name: '한지민', position: '선임', phone: '010-8901-2345', email: 'han.jm@example.com', remark: '연구개발' },
    { factory: '부산공장', department: '구매팀', name: '송민호', position: '대리', phone: '010-9012-3456', email: 'song.mh@example.com', remark: '자재 구매' },
    { factory: '울산공장', department: '안전환경팀', name: '임하늘', position: '사원', phone: '010-0123-4567', email: 'lim.hn@example.com', remark: '안전 관리' },
  ];

  console.log('🔄 샘플 사용자 데이터 생성 시작...');
  let createdCount = 0;

  for (const user of sampleUsers) {
    const existing = await getUserByEmail(user.email || '');
    if (!existing) {
      await createUser(user);
      createdCount++;
    }
  }

  console.log(`✅ 샘플 사용자 데이터 생성 완료 (${createdCount}명)`);
}















