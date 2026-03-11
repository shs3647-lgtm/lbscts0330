/**
 * 기초정보 데이터베이스 (LocalStorage)
 * @ref C:\01_Next_FMEA\packages\core\master-data-db.ts
 */

import {
  BizInfoCustomer,
  BizInfoProject,
  BIZINFO_STORAGE_KEYS
} from '@/types/bizinfo';

// ========== 프로젝트 기초정보 CRUD (DB 전용, localStorage 완전 제거) ==========
// localStorage 모든 캐시 완전 삭제 유틸리티
export function clearAllBizInfoCache(): void {
  if (typeof window !== 'undefined') {
    // 모든 bizinfo 관련 localStorage 키 삭제
    Object.values(BIZINFO_STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
}

// ★ DB 우선, localStorage 폴백 지원 (온프레미스용)
export async function getAllProjects(forceRefresh = false): Promise<BizInfoProject[]> {
  if (typeof window === 'undefined') return [];
  
  const STORAGE_KEY = 'bizinfo-projects';
  
  try {
    // 1단계: DB에서 조회 시도
    const cacheBuster = forceRefresh ? `?t=${Date.now()}` : '';
    const response = await fetch(`/api/bizinfo/projects${cacheBuster}`);
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && Array.isArray(data.projects) && data.projects.length > 0) {
        // DB 데이터를 localStorage에 캐시
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.projects));
        return data.projects;
      }
    }
  } catch (error) {
    console.error('[bizinfo] 프로젝트 목록 DB 조회 실패:', error);
  }

  // 2단계: localStorage 폴백
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) {
    const projects = JSON.parse(cached);
    return projects;
  }

  // 데이터 없음 - 빈 배열 반환 (사용자가 Import/추가로 직접 등록)
  return [];
}


// ★ DB 우선, localStorage 폴백 지원
export async function deleteProject(id: string): Promise<void> {
  const STORAGE_KEY = 'bizinfo-projects';
  
  try {
    // DB에서 삭제 시도
    const response = await fetch(`/api/bizinfo/projects?id=${id}`, {
      method: 'DELETE',
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
      }
    }
  } catch (error) {
    console.error('[bizinfo] 프로젝트 DB 삭제 실패:', error);
  }

  // localStorage에서도 삭제
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) {
    const projects = JSON.parse(cached).filter((p: BizInfoProject) => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }
}

// 프로젝트 저장 (신규 또는 수정) - ★ DB 우선, localStorage 폴백 지원
export async function saveProject(project: BizInfoProject): Promise<BizInfoProject> {
  const STORAGE_KEY = 'bizinfo-projects';
  const now = new Date().toISOString();
  
  // ID가 없으면 생성
  if (!project.id) {
    project.id = `BIZ-${Date.now()}`;
  }
  project.updatedAt = now;
  if (!project.createdAt) {
    project.createdAt = now;
  }
  
  try {
    // DB에 저장 시도 (PUT)
    const response = await fetch('/api/bizinfo/projects', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.project) {
        // localStorage 캐시도 업데이트
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const projects = JSON.parse(cached);
          const idx = projects.findIndex((p: BizInfoProject) => p.id === project.id);
          if (idx >= 0) {
            projects[idx] = data.project;
          } else {
            projects.push(data.project);
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
        }
        return data.project;
      }
    }
  } catch (error) {
    console.error('[bizinfo] 프로젝트 DB 저장 실패:', error);
  }

  // localStorage 폴백
  const cached = localStorage.getItem(STORAGE_KEY);
  const projects: BizInfoProject[] = cached ? JSON.parse(cached) : [];
  const idx = projects.findIndex(p => p.id === project.id);
  if (idx >= 0) {
    projects[idx] = project;
  } else {
    projects.push(project);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  return project;
}

// ========== 고객 CRUD (DB 우선, localStorage 폴백) ==========
export async function getAllCustomers(): Promise<BizInfoCustomer[]> {
  if (typeof window === 'undefined') return [];
  
  try {
    // DB에서 조회 시도
    const response = await fetch('/api/customers');
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.customers) {
        return data.customers;
      }
    }
  } catch (error) {
    console.error('[bizinfo] 고객 목록 DB 조회 실패:', error);
  }

  // localStorage 폴백
  const data = localStorage.getItem(BIZINFO_STORAGE_KEYS.customers);
  return data ? JSON.parse(data) : [];
}

export async function createCustomer(customer: Omit<BizInfoCustomer, 'id' | 'createdAt' | 'updatedAt'>): Promise<BizInfoCustomer> {
  const now = new Date().toISOString();
  
  try {
    // DB에 저장 시도
    const response = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer),
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.customer) {
        return data.customer;
      }
    }
  } catch (error) {
    console.error('[bizinfo] 고객 DB 생성 실패:', error);
  }

  // localStorage 폴백
  const newCustomer: BizInfoCustomer = {
    id: crypto.randomUUID(),
    ...customer,
    createdAt: now,
    updatedAt: now,
  };
  const customers = await getAllCustomers();
  customers.push(newCustomer);
  localStorage.setItem(BIZINFO_STORAGE_KEYS.customers, JSON.stringify(customers));
  return newCustomer;
}

// ★ 고객사 수정 (DB 우선, localStorage 폴백)
export async function updateCustomer(customer: BizInfoCustomer): Promise<BizInfoCustomer> {
  const now = new Date().toISOString();
  const updated = { ...customer, updatedAt: now };

  try {
    const response = await fetch('/api/customers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.customer) {
        return data.customer;
      }
    }
  } catch (error) {
    console.error('[bizinfo] 고객 DB 수정 실패:', error);
  }

  // localStorage 폴백
  const customers = await getAllCustomers();
  const idx = customers.findIndex(c => c.id === updated.id);
  if (idx >= 0) {
    customers[idx] = updated;
  } else {
    customers.push(updated);
  }
  localStorage.setItem(BIZINFO_STORAGE_KEYS.customers, JSON.stringify(customers));
  return updated;
}

export async function deleteCustomer(id: string): Promise<void> {
  try {
    // DB에서 삭제 시도
    const response = await fetch(`/api/customers?id=${id}`, {
      method: 'DELETE',
    });
    
    if (response.ok) {
      return;
    }
  } catch (error) {
    console.error('[bizinfo] 고객 DB 삭제 실패:', error);
  }

  // localStorage 폴백
  const customers = await getAllCustomers();
  const filtered = customers.filter(c => c.id !== id);
  localStorage.setItem(BIZINFO_STORAGE_KEYS.customers, JSON.stringify(filtered));
}

