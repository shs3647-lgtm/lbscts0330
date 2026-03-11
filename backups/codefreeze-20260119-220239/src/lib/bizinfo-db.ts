/**
 * 기초정보 데이터베이스 (LocalStorage)
 * @ref C:\01_Next_FMEA\packages\core\master-data-db.ts
 */

import { 
  BizInfoCustomer, 
  BizInfoProduct, 
  BizInfoFactory,
  BizInfoProject,
  BIZINFO_STORAGE_KEYS 
} from '@/types/bizinfo';

// UUID 생성
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ========== 프로젝트 기초정보 CRUD (DB 전용, localStorage 완전 제거) ==========
// localStorage 모든 캐시 완전 삭제 유틸리티
export function clearAllBizInfoCache(): void {
  if (typeof window !== 'undefined') {
    // 모든 bizinfo 관련 localStorage 키 삭제
    Object.values(BIZINFO_STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    console.log('[bizinfo-db] ✅ 모든 기초정보 localStorage 캐시 완전 삭제 완료');
  }
}

// 프로젝트 기초정보 localStorage 캐시만 삭제
export function clearProjectsCache(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(BIZINFO_STORAGE_KEYS.projects);
    console.log('[bizinfo-db] 프로젝트 기초정보 localStorage 캐시 클리어 완료');
  }
}

// ★ DB 전용: localStorage 폴백 완전 제거
export async function getAllProjects(forceRefresh = false): Promise<BizInfoProject[]> {
  if (typeof window === 'undefined') return [];
  
  try {
    // ★ DB에서만 조회 (캐시 버스팅 파라미터 추가)
    const cacheBuster = forceRefresh ? `?t=${Date.now()}` : '';
    const response = await fetch(`/api/bizinfo/projects${cacheBuster}`);
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && Array.isArray(data.projects)) {
        console.log('[bizinfo-db] ✅ DB에서 프로젝트 기초정보 로드:', data.projects.length, '개');
        // ★ localStorage에 저장하지 않음 (DB 전용)
        return data.projects;
      }
    }
    
    // DB 조회 실패 시 빈 배열 반환 (localStorage 폴백 제거)
    console.warn('[bizinfo-db] ⚠️ DB 조회 실패, 빈 배열 반환');
    return [];
  } catch (error) {
    console.error('[bizinfo-db] ❌ DB 조회 오류:', error);
    // 오류 발생 시에도 빈 배열 반환 (localStorage 폴백 제거)
    return [];
  }
}

// ★ DB 전용: localStorage 폴백 완전 제거
export async function createProject(project: Omit<BizInfoProject, 'id' | 'createdAt' | 'updatedAt'>): Promise<BizInfoProject> {
  try {
    // ★ DB에만 저장
    const response = await fetch('/api/bizinfo/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.project) {
        console.log('[bizinfo-db] ✅ DB에 프로젝트 기초정보 저장 완료:', data.project.customerName);
        return data.project;
      }
    }
    
    throw new Error('DB 저장 실패');
  } catch (error) {
    console.error('[bizinfo-db] ❌ DB 저장 실패:', error);
    throw error; // localStorage 폴백 제거, 오류 throw
  }
}

// ★ DB 전용: localStorage 폴백 완전 제거
export async function deleteProject(id: string): Promise<void> {
  try {
    // ★ DB에서만 삭제
    const response = await fetch(`/api/bizinfo/projects?id=${id}`, {
      method: 'DELETE',
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        console.log('[bizinfo-db] ✅ DB에서 프로젝트 기초정보 삭제 완료:', id);
        return;
      }
    }
    
    throw new Error('DB 삭제 실패');
  } catch (error) {
    console.error('[bizinfo-db] ❌ DB 삭제 실패:', error);
    throw error; // localStorage 폴백 제거, 오류 throw
  }
}

// 프로젝트 저장 (신규 또는 수정) - ★ DB 전용: localStorage 폴백 완전 제거
export async function saveProject(project: BizInfoProject): Promise<BizInfoProject> {
  try {
    // ★ DB에만 저장 (PUT)
    const response = await fetch('/api/bizinfo/projects', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.project) {
        console.log('[bizinfo-db] ✅ DB에 프로젝트 기초정보 저장 완료:', data.project.customerName);
        return data.project;
      }
    }
    
    throw new Error('DB 저장 실패');
  } catch (error) {
    console.error('[bizinfo-db] ❌ DB 저장 실패:', error);
    throw error; // localStorage 폴백 제거, 오류 throw
  }
}

// 샘플 프로젝트 기초정보 생성 (11개) - async 버전
// ★ 이전 데이터 완전 삭제 후 최신 데이터만 생성
export async function createSampleProjects(): Promise<void> {
  try {
    // 1. 기존 프로젝트 조회
    const existingProjects = await getAllProjects(true);
    
    // 2. 이전 데이터 삭제 대상: TESLA, GM대우, 르노삼성, 쌍용자동차
    const oldCustomerNames = ['TESLA', '테슬라', 'GM대우', 'GM 대우', '르노삼성', '르노', '쌍용자동차', '쌍용'];
    
    if (Array.isArray(existingProjects) && existingProjects.length > 0) {
      // 이전 데이터 삭제
      const oldProjects = existingProjects.filter(p => 
        oldCustomerNames.some(oldName => 
          p.customerName?.toUpperCase().includes(oldName.toUpperCase())
        )
      );
      
      if (oldProjects.length > 0) {
        console.log(`🗑️ 이전 데이터 ${oldProjects.length}개 삭제 중...`);
        for (const oldProject of oldProjects) {
          try {
            await deleteProject(oldProject.id);
            console.log(`✅ 삭제 완료: ${oldProject.customerName} - ${oldProject.productName}`);
          } catch (error) {
            console.warn(`⚠️ 삭제 실패: ${oldProject.id}`, error);
          }
        }
      }
      
      // 최신 데이터가 이미 있으면 생성 스킵
      const hasLatestData = existingProjects.some(p => 
        ['현대자동차', '기아자동차', 'BMW', 'Volkswagen', 'Ford', 'Stellantis', 'GM코리아'].includes(p.customerName)
      );
      
      if (hasLatestData && oldProjects.length === 0) {
        console.log('ℹ️ 최신 프로젝트 기초정보 이미 존재');
        return;
      }
    }

    // 3. 최신 샘플 데이터 생성
    // ★ 최신 고객사 순서: 현대, 기아, BMW, VW, FORD, 스텔란티스, GM
    const sampleProjects: Omit<BizInfoProject, 'id' | 'createdAt' | 'updatedAt'>[] = [
    // 현대자동차 (1순위)
    { customerName: '현대자동차', customerCode: 'HMC', factory: '울산공장', modelYear: 'MY2025', program: 'NE1', productName: '도어패널', partNo: 'DP-001' },
    { customerName: '현대자동차', customerCode: 'HMC', factory: '아산공장', modelYear: 'MY2025', program: 'NE2', productName: '후드', partNo: 'HD-002' },
    { customerName: '현대자동차', customerCode: 'HMC', factory: '전주공장', modelYear: 'MY2024', program: 'NE3', productName: '트렁크리드', partNo: 'TL-003' },
    // 기아자동차 (2순위)
    { customerName: '기아자동차', customerCode: 'KIA', factory: '광주공장', modelYear: 'MY2024', program: 'SP2i', productName: '범퍼', partNo: 'BP-004' },
    { customerName: '기아자동차', customerCode: 'KIA', factory: '화성공장', modelYear: 'MY2025', program: 'EV6', productName: '펜더', partNo: 'FD-005' },
    { customerName: '기아자동차', customerCode: 'KIA', factory: '소하리공장', modelYear: 'MY2025', program: 'EV9', productName: '사이드패널', partNo: 'SP-006' },
    // BMW (3순위)
    { customerName: 'BMW', customerCode: 'BMW', factory: 'Munich', modelYear: 'MY2025', program: 'X5', productName: '프론트범퍼', partNo: 'FB-007' },
    // Volkswagen (4순위)
    { customerName: 'Volkswagen', customerCode: 'VW', factory: 'Wolfsburg', modelYear: 'MY2025', program: 'Golf', productName: '리어범퍼', partNo: 'RB-008' },
    // Ford (5순위)
    { customerName: 'Ford', customerCode: 'FORD', factory: 'Dearborn', modelYear: 'MY2025', program: 'F-150', productName: '후드패널', partNo: 'HP-009' },
    // Stellantis (6순위)
    { customerName: 'Stellantis', customerCode: 'STLA', factory: 'Amsterdam', modelYear: 'MY2025', program: 'Peugeot', productName: '사이드미러', partNo: 'SM-010' },
    // GM (7순위 - 맨 아래)
    { customerName: 'GM코리아', customerCode: 'GMK', factory: '부평공장', modelYear: 'MY2024', program: 'X1', productName: '루프패널', partNo: 'RP-011' },
  ];

    for (const p of sampleProjects) {
      try {
        await createProject(p);
      } catch (error) {
        console.warn(`⚠️ 샘플 프로젝트 생성 실패: ${p.customerName}`, error);
      }
    }
    console.log('✅ 프로젝트 기초정보 샘플 데이터 생성 완료 (11개)');
  } catch (error) {
    console.error('❌ 샘플 프로젝트 생성 중 오류:', error);
  }
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
        console.log('[bizinfo-db] DB에서 고객사 로드:', data.customers.length, '개');
        return data.customers;
      }
    }
  } catch (error) {
    console.warn('[bizinfo-db] DB 조회 실패, localStorage 폴백:', error);
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
        console.log('[bizinfo-db] DB에 고객사 저장 완료:', data.customer.name);
        return data.customer;
      }
    }
  } catch (error) {
    console.warn('[bizinfo-db] DB 저장 실패, localStorage 폴백:', error);
  }
  
  // localStorage 폴백
  const newCustomer: BizInfoCustomer = {
    id: generateUUID(),
    ...customer,
    createdAt: now,
    updatedAt: now,
  };
  const customers = await getAllCustomers();
  customers.push(newCustomer);
  localStorage.setItem(BIZINFO_STORAGE_KEYS.customers, JSON.stringify(customers));
  return newCustomer;
}

export async function deleteCustomer(id: string): Promise<void> {
  try {
    // DB에서 삭제 시도
    const response = await fetch(`/api/customers?id=${id}`, {
      method: 'DELETE',
    });
    
    if (response.ok) {
      console.log('[bizinfo-db] DB에서 고객사 삭제 완료:', id);
      return;
    }
  } catch (error) {
    console.warn('[bizinfo-db] DB 삭제 실패, localStorage 폴백:', error);
  }
  
  // localStorage 폴백
  const customers = await getAllCustomers();
  const filtered = customers.filter(c => c.id !== id);
  localStorage.setItem(BIZINFO_STORAGE_KEYS.customers, JSON.stringify(filtered));
}

// ========== 품명 CRUD ==========
export function getAllProducts(): BizInfoProduct[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(BIZINFO_STORAGE_KEYS.products);
  return data ? JSON.parse(data) : [];
}

export function createProduct(product: Omit<BizInfoProduct, 'id' | 'createdAt' | 'updatedAt'>): BizInfoProduct {
  const now = new Date().toISOString();
  const newProduct: BizInfoProduct = {
    id: generateUUID(),
    ...product,
    createdAt: now,
    updatedAt: now,
  };
  const products = getAllProducts();
  products.push(newProduct);
  localStorage.setItem(BIZINFO_STORAGE_KEYS.products, JSON.stringify(products));
  return newProduct;
}

export function deleteProduct(id: string): void {
  const products = getAllProducts().filter(p => p.id !== id);
  localStorage.setItem(BIZINFO_STORAGE_KEYS.products, JSON.stringify(products));
}

// ========== 공장 CRUD ==========
export function getAllFactories(): BizInfoFactory[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(BIZINFO_STORAGE_KEYS.factories);
  return data ? JSON.parse(data) : [];
}

export function createFactory(factory: Omit<BizInfoFactory, 'id' | 'createdAt' | 'updatedAt'>): BizInfoFactory {
  const now = new Date().toISOString();
  const newFactory: BizInfoFactory = {
    id: generateUUID(),
    ...factory,
    createdAt: now,
    updatedAt: now,
  };
  const factories = getAllFactories();
  factories.push(newFactory);
  localStorage.setItem(BIZINFO_STORAGE_KEYS.factories, JSON.stringify(factories));
  return newFactory;
}

export function deleteFactory(id: string): void {
  const factories = getAllFactories().filter(f => f.id !== id);
  localStorage.setItem(BIZINFO_STORAGE_KEYS.factories, JSON.stringify(factories));
}

// ========== 샘플 데이터 생성 ==========
export async function createSampleBizInfo(): Promise<void> {
  // 고객 샘플
  const existingCustomers = await getAllCustomers();
  if (!Array.isArray(existingCustomers) || existingCustomers.length === 0) {
    const sampleCustomers = [
      { name: '현대자동차', code: 'HMC', factory: '울산공장' },
      { name: '기아자동차', code: 'KIA', factory: '광주공장' },
      { name: 'GM대우', code: 'GMD', factory: '부평공장' },
      { name: '르노삼성', code: 'RSM', factory: '부산공장' },
      { name: '쌍용자동차', code: 'SYM', factory: '평택공장' },
    ];
    for (const c of sampleCustomers) {
      await createCustomer(c);
    }
    console.log('✅ 고객 샘플 데이터 생성 완료');
  }

  // 품명 샘플
  if (getAllProducts().length === 0) {
    const sampleProducts = [
      { name: '도어패널', partNo: 'DP-001', description: '차량 도어 패널' },
      { name: '후드', partNo: 'HD-002', description: '차량 후드' },
      { name: '범퍼', partNo: 'BP-003', description: '전/후방 범퍼' },
      { name: '펜더', partNo: 'FD-004', description: '차량 펜더' },
      { name: '사이드미러', partNo: 'SM-005', description: '좌/우 사이드미러' },
    ];
    sampleProducts.forEach(p => createProduct(p));
    console.log('✅ 품명 샘플 데이터 생성 완료');
  }

  // 공장 샘플
  if (getAllFactories().length === 0) {
    const sampleFactories = [
      { name: '울산공장', code: 'ULSAN', address: '울산광역시 북구 양정동' },
      { name: '서울공장', code: 'SEOUL', address: '서울특별시 강남구 역삼동' },
      { name: '부산공장', code: 'BUSAN', address: '부산광역시 강서구 녹산동' },
      { name: '광주공장', code: 'GWANGJU', address: '광주광역시 광산구 하남동' },
      { name: '아산공장', code: 'ASAN', address: '충청남도 아산시 인주면' },
    ];
    sampleFactories.forEach(f => createFactory(f));
    console.log('✅ 공장 샘플 데이터 생성 완료');
  }
}

