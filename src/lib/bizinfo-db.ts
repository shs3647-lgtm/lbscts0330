/**
 * 기초정보 데이터베이스 — PUBLIC DB 영구저장 전용
 * localStorage 완전 제거 (2026-03-24)
 */

import { BizInfoCustomer, BizInfoProject } from '@/types/bizinfo';

// localStorage 캐시 삭제 (레거시 정리용, 향후 제거 가능)
export function clearAllBizInfoCache(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('bizinfo-projects');
    localStorage.removeItem('bizinfo-customers');
  }
}

// ========== 프로젝트 기초정보 CRUD — DB only ==========

export async function getAllProjects(_forceRefresh = false): Promise<BizInfoProject[]> {
  if (typeof window === 'undefined') return [];
  try {
    const res = await fetch(`/api/bizinfo/projects?t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.projects)) return data.projects;
    }
  } catch (e) {
    console.error('[bizinfo] 프로젝트 DB 조회 실패:', e);
  }
  return [];
}

export async function saveProject(project: BizInfoProject): Promise<BizInfoProject> {
  const now = new Date().toISOString();
  project.updatedAt = now;
  if (!project.createdAt) project.createdAt = now;

  // 신규: POST, 기존(id 있고 DB에 존재): PUT
  // 먼저 PUT 시도 → 404면 POST로 생성
  if (project.id) {
    const putRes = await fetch('/api/bizinfo/projects', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    });
    if (putRes.ok) {
      const data = await putRes.json();
      if (data.success && data.project) return data.project;
    }
    // PUT 실패(404 등) → POST로 신규 생성
  }

  const postRes = await fetch('/api/bizinfo/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: project.customerName,
      customerCode: project.customerCode,
      factory: project.factory,
      modelYear: project.modelYear,
      program: project.program,
      productName: project.productName,
      partNo: project.partNo,
    }),
  });
  if (postRes.ok) {
    const data = await postRes.json();
    if (data.success && data.project) return data.project;
  }
  throw new Error('프로젝트 저장 실패');
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`/api/bizinfo/projects?id=${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('프로젝트 삭제 실패');
}

// ========== 고객 CRUD — DB only ==========

export async function getAllCustomers(): Promise<BizInfoCustomer[]> {
  if (typeof window === 'undefined') return [];
  try {
    const res = await fetch('/api/customers');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.customers) return data.customers;
    }
  } catch (e) {
    console.error('[bizinfo] 고객 DB 조회 실패:', e);
  }
  return [];
}

export async function createCustomer(customer: Omit<BizInfoCustomer, 'id' | 'createdAt' | 'updatedAt'>): Promise<BizInfoCustomer> {
  const res = await fetch('/api/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customer),
  });
  if (res.ok) {
    const data = await res.json();
    if (data.success && data.customer) return data.customer;
  }
  throw new Error('고객 생성 실패');
}

export async function updateCustomer(customer: BizInfoCustomer): Promise<BizInfoCustomer> {
  const updated = { ...customer, updatedAt: new Date().toISOString() };
  const res = await fetch('/api/customers', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updated),
  });
  if (res.ok) {
    const data = await res.json();
    if (data.success && data.customer) return data.customer;
  }
  throw new Error('고객 수정 실패');
}

export async function deleteCustomer(id: string): Promise<void> {
  const res = await fetch(`/api/customers?id=${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('고객 삭제 실패');
}
