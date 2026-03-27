/**
 * @file fmea-project-service.ts
 * @description FMEA 프로젝트 DB 서비스 레이어
 * 
 * 목적: API route에서 DB 로직 분리 (모듈화)
 * 규칙: 각 파일 500줄 이하 유지
 * 
 * @created 2026-01-11
 */

import { getPrisma } from '@/lib/prisma';

// ============ 타입 정의 ============

export interface FMEAProjectData {
  id: string;
  fmeaType: string;
  parentFmeaId: string | null;
  parentFmeaType: string | null;
  status: string;
  step: number;
  revisionNo: string;
  createdAt: string;
  updatedAt: string;
  fmeaInfo: any;
  project: any;
  cftMembers: any[];
}

export interface CreateProjectData {
  fmeaId: string;
  fmeaType?: string;
  project?: any;
  fmeaInfo?: any;
  cftMembers?: any[];
  parentApqpNo?: string | null;  // ★ 상위 APQP (최상위)
  parentFmeaId?: string | null;
  parentFmeaType?: string | null;
  revisionNo?: string | null;    // ★ 개정번호 (등록화면에서 전달)
}

// ============ 프로젝트 조회 ============

/**
 * 프로젝트 목록 조회 (특정 ID 또는 전체)
 */
export async function getProjects(
  fmeaId?: string | null,
  fmeaType?: string | null,
  options?: { includeDeleted?: boolean; isArchive?: boolean },
): Promise<FMEAProjectData[]> {
  const prisma = getPrisma();
  if (!prisma) {
    throw new Error('Database not configured');
  }

  const targetId = fmeaId?.toLowerCase() || null;
  const whereClause: Record<string, any> = {};
  
  // ★ 기본: 삭제 항목 제외 / includeDeleted=true: 전체 반환 (admin 휴지통용)
  if (!options?.includeDeleted) {
    whereClause.deletedAt = null;
  }
  
  // ★ Archived 여부 분기
  if (options?.isArchive) {
    whereClause.status = 'archived';
  } else if (!options?.includeDeleted) {
    whereClause.status = 'active';
  }
  if (targetId) whereClause.fmeaId = targetId;
  // ★ 2026-02-09: D/P 유형별 필터링
  // PFMEA 모듈(type=P)은 P(Part), F(Family), M(Machine) 서브타입 모두 포함
  if (fmeaType) {
    const upper = fmeaType.toUpperCase();
    if (upper === 'P') {
      whereClause.fmeaType = { in: ['P', 'F', 'M'] };
    } else {
      whereClause.fmeaType = upper;
    }
  }

  // 프로젝트 목록 조회 (등록정보, CFT 멤버 포함)
  const projects = await prisma.fmeaProject.findMany({
    where: whereClause,
    include: {
      registration: true,
      cftMembers: {
        orderBy: { order: 'asc' }
      },
    },
    orderBy: [
      { fmeaType: 'asc' },
      { createdAt: 'desc' }
    ]
  });

  // ★★★ ProjectLinkage에서 공통 데이터 조회 (연동 DB 우선) ★★★
  const linkageMap = new Map<string, any>();
  if (projects.length > 0) {
    const fmeaIds = projects.map(p => p.fmeaId.toLowerCase());
    try {
      const linkages = await (prisma as any).projectLinkage.findMany({
        where: {
          pfmeaId: { in: fmeaIds },
          status: 'active'
        }
      });
      linkages.forEach((l: any) => {
        if (l.pfmeaId) linkageMap.set(l.pfmeaId.toLowerCase(), l);
      });
    } catch (e) {
      console.error('[fmea-project] ProjectLinkage 조회 실패:', e);
    }
  }

  // 응답 형식으로 변환 (ProjectLinkage 우선)
  const result = projects.map(p => {
    // ★★★ ProjectLinkage에서 공통 데이터 가져오기 (연동 DB 우선!) ★★★
    const linkage = linkageMap.get(p.fmeaId.toLowerCase());

    // ★★★ 연동 정보를 최상위 레벨에도 추가 (리스트 페이지 호환) ★★★
    const linkedPfdNo = linkage?.pfdNo || p.registration?.linkedPfdNo || '';
    const linkedCpNo = linkage?.cpNo || p.registration?.linkedCpNo || '';
    const linkedPfmeaNo = p.registration?.linkedPfmeaNo || '';

    // ★★★ 공통 데이터: ProjectLinkage 우선, 없으면 registration 사용 ★★★
    const subject = linkage?.subject || p.registration?.subject || '';
    const customerName = linkage?.customerName || p.registration?.customerName || '';
    const companyName = linkage?.companyName || p.registration?.companyName || '';
    const modelYear = linkage?.modelYear || p.registration?.modelYear || '';
    const engineeringLocation = linkage?.engineeringLocation || p.registration?.engineeringLocation || '';
    const partNo = linkage?.partNo || p.registration?.partNo || '';
    const responsibleName = linkage?.responsibleName || p.registration?.fmeaResponsibleName || '';

    // ★★★ partName: subject에서 추출 (품명+생산공정 → 품명) ★★★
    const partName = p.registration?.partName || (subject.includes('+') ? subject.split('+')[0] : subject) || '';

    return {
      id: p.fmeaId.toLowerCase(),
      fmeaType: p.fmeaType,
      deletedAt: p.deletedAt ? p.deletedAt.toISOString() : null,
      parentApqpNo: p.parentApqpNo || null,  // ★ 상위 APQP
      parentFmeaId: p.parentFmeaId ? p.parentFmeaId.toLowerCase() : null,
      parentFmeaType: p.parentFmeaType,
      status: p.status,
      step: p.step,
      revisionNo: p.revisionNo,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      // ★★★ 최상위 레벨 연동 정보 (리스트 페이지 직접 접근용) ★★★
      linkedPfdNo,
      linkedCpNo,
      linkedPfmeaNo,
      // ★★★ fmeaInfo: ProjectLinkage 우선, registration 폴백 ★★★
      fmeaInfo: {
        companyName,
        engineeringLocation,
        customerName,
        modelYear,
        subject,  // ★ ProjectLinkage에서 가져옴!
        fmeaStartDate: p.registration?.fmeaStartDate || linkage?.startDate || '',
        fmeaRevisionDate: p.registration?.fmeaRevisionDate || linkage?.revisionDate || '',
        fmeaProjectName: p.registration?.fmeaProjectName || subject || '',
        fmeaId: p.fmeaId,
        fmeaType: p.fmeaType,
        designResponsibility: p.registration?.designResponsibility || linkage?.processResponsibility || '',
        confidentialityLevel: p.registration?.confidentialityLevel || linkage?.confidentialityLevel || '',
        fmeaResponsibleName: responsibleName,
        linkedCpNo,
        linkedPfdNo,
        linkedDfmeaNo: p.registration?.linkedDfmeaNo || '',
        partName: partName || p.registration?.partName || '',  // ★ ProjectLinkage subject에서 추출!
        partNo,
        remark: p.registration?.remark || '',
      },
      project: p.registration ? {
        projectName: subject || p.registration.fmeaProjectName || p.registration.subject || '',
        customer: customerName || p.registration.customerName || '',
        productName: subject || p.registration.subject || '',
        department: p.registration.designResponsibility || '',
        leader: p.registration.fmeaResponsibleName || '',
        startDate: p.registration.fmeaStartDate || '',
      } : { projectName: subject || '', productName: subject || '' },
      cftMembers: p.cftMembers.length > 0
        ? p.cftMembers.map(m => ({
          id: m.id,
          role: m.role,
          name: m.name || '',
          department: m.department || '',
          position: m.position || '',
          task: m.responsibility || '',
          responsibility: m.responsibility || '',
          email: m.email || '',
          phone: m.phone || '',
          remark: m.remarks || '',
          remarks: m.remarks || '',
        }))
        : [], // 레거시 폴백 제거
    };
  });

  // ★ 2026-01-17: 레거시 전용 프로젝트 추가 로직 제거
  // 프로젝트 테이블에 없는 레거시 데이터는 더 이상 표시하지 않음

  // 유형별 정렬 (M → F → P)
  const typeOrder: Record<string, number> = { 'M': 1, 'F': 2, 'P': 3 };
  result.sort((a, b) => {
    const orderA = typeOrder[a.fmeaType] || 3;
    const orderB = typeOrder[b.fmeaType] || 3;
    if (orderA !== orderB) return orderA - orderB;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return result;
}

// ============ 프로젝트 페이지네이션 조회 ============

/** 정렬 가능 필드 화이트리스트 */
const SORTABLE_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  fmeaId: 'fmeaId',
  fmeaType: 'fmeaType',
  step: 'step',
  revisionNo: 'revisionNo',
};

/** 정렬이 registration 테이블에 속하는 필드 */
const REGISTRATION_SORT_FIELDS: Record<string, string> = {
  subject: 'subject',
  customer: 'customerName',
  customerName: 'customerName',
  processOwner: 'designResponsibility',
  responsibleName: 'fmeaResponsibleName',
  fmeaResponsibleName: 'fmeaResponsibleName',
  startDate: 'fmeaStartDate',
  fmeaStartDate: 'fmeaStartDate',
  targetDate: 'fmeaRevisionDate',
  fmeaRevisionDate: 'fmeaRevisionDate',
  engineeringLocation: 'engineeringLocation',
};

export interface PaginatedResult {
  data: FMEAProjectData[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

/**
 * 페이지네이션된 프로젝트 목록 조회
 * - 서버 사이드 정렬/검색/페이징
 */
export async function getProjectsPaginated(
  fmeaType: string | null,
  page: number,
  pageSize: number,
  sortField: string,
  sortOrder: 'asc' | 'desc',
  search: string,
  options?: { includeDeleted?: boolean; isArchive?: boolean },
): Promise<PaginatedResult> {
  const prisma = getPrisma();
  if (!prisma) {
    throw new Error('Database not configured');
  }

  // Where 조건 구성
  const whereClause: Record<string, any> = {};

  if (!options?.includeDeleted) {
    whereClause.deletedAt = null;
  }

  // ★ Archived 여부 분기
  if (options?.isArchive) {
    whereClause.status = 'archived';
  } else if (!options?.includeDeleted) {
    whereClause.status = 'active';
  }

  // 유형 필터 (P → P/F/M 포함)
  if (fmeaType) {
    const upper = fmeaType.toUpperCase();
    if (upper === 'P') {
      whereClause.fmeaType = { in: ['P', 'F', 'M'] };
    } else {
      whereClause.fmeaType = upper;
    }
  }

  // 검색 조건 (fmeaId OR registration.subject)
  if (search && search.trim()) {
    const q = search.trim();
    whereClause.OR = [
      { fmeaId: { contains: q, mode: 'insensitive' } },
      { registration: { subject: { contains: q, mode: 'insensitive' } } },
      { registration: { customerName: { contains: q, mode: 'insensitive' } } },
      { registration: { fmeaResponsibleName: { contains: q, mode: 'insensitive' } } },
      { registration: { engineeringLocation: { contains: q, mode: 'insensitive' } } },
    ];
  }

  // 총 개수 조회
  const totalCount = await prisma.fmeaProject.count({ where: whereClause });
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  // 정렬 조건 구성
  const order = sortOrder === 'asc' ? 'asc' : 'desc';
  let orderBy: any[] = [];

  if (SORTABLE_FIELDS[sortField]) {
    orderBy = [{ [SORTABLE_FIELDS[sortField]]: order }];
  } else if (REGISTRATION_SORT_FIELDS[sortField]) {
    orderBy = [{ registration: { [REGISTRATION_SORT_FIELDS[sortField]]: order } }];
  } else {
    // 기본 정렬: fmeaType asc, createdAt desc
    orderBy = [{ fmeaType: 'asc' }, { createdAt: 'desc' }];
  }

  // 페이지네이션 쿼리
  const projects = await prisma.fmeaProject.findMany({
    where: whereClause,
    include: {
      registration: true,
      cftMembers: { orderBy: { order: 'asc' } },
    },
    orderBy,
    skip: (safePage - 1) * pageSize,
    take: pageSize,
  });

  // ProjectLinkage 병합
  const linkageMap = new Map<string, any>();
  if (projects.length > 0) {
    const fmeaIds = projects.map(p => p.fmeaId.toLowerCase());
    try {
      const linkages = await (prisma as any).projectLinkage.findMany({
        where: {
          pfmeaId: { in: fmeaIds },
          status: 'active',
        },
      });
      linkages.forEach((l: any) => {
        if (l.pfmeaId) linkageMap.set(l.pfmeaId.toLowerCase(), l);
      });
    } catch (e) {
      console.error('[fmea-project] ProjectLinkage 조회 실패:', e);
    }
  }

  // 응답 변환 (기존 getProjects와 동일한 형식)
  const data = projects.map(p => {
    const linkage = linkageMap.get(p.fmeaId.toLowerCase());
    const linkedPfdNo = linkage?.pfdNo || p.registration?.linkedPfdNo || '';
    const linkedCpNo = linkage?.cpNo || p.registration?.linkedCpNo || '';
    const linkedPfmeaNo = p.registration?.linkedPfmeaNo || '';
    const subject = linkage?.subject || p.registration?.subject || '';
    const customerName = linkage?.customerName || p.registration?.customerName || '';
    const companyName = linkage?.companyName || p.registration?.companyName || '';
    const modelYear = linkage?.modelYear || p.registration?.modelYear || '';
    const engineeringLocation = linkage?.engineeringLocation || p.registration?.engineeringLocation || '';
    const partNo = linkage?.partNo || p.registration?.partNo || '';
    const responsibleName = linkage?.responsibleName || p.registration?.fmeaResponsibleName || '';
    const partName = p.registration?.partName || (subject.includes('+') ? subject.split('+')[0] : subject) || '';

    return {
      id: p.fmeaId.toLowerCase(),
      fmeaType: p.fmeaType,
      deletedAt: p.deletedAt ? p.deletedAt.toISOString() : null,
      parentApqpNo: p.parentApqpNo || null,
      parentFmeaId: p.parentFmeaId ? p.parentFmeaId.toLowerCase() : null,
      parentFmeaType: p.parentFmeaType,
      status: p.status,
      step: p.step,
      revisionNo: p.revisionNo,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      linkedPfdNo,
      linkedCpNo,
      linkedPfmeaNo,
      fmeaInfo: {
        companyName,
        engineeringLocation,
        customerName,
        modelYear,
        subject,
        fmeaStartDate: p.registration?.fmeaStartDate || linkage?.startDate || '',
        fmeaRevisionDate: p.registration?.fmeaRevisionDate || linkage?.revisionDate || '',
        fmeaProjectName: p.registration?.fmeaProjectName || subject || '',
        fmeaId: p.fmeaId,
        fmeaType: p.fmeaType,
        designResponsibility: p.registration?.designResponsibility || linkage?.processResponsibility || '',
        confidentialityLevel: p.registration?.confidentialityLevel || linkage?.confidentialityLevel || '',
        fmeaResponsibleName: responsibleName,
        linkedCpNo,
        linkedPfdNo,
        linkedDfmeaNo: p.registration?.linkedDfmeaNo || '',
        partName: partName || p.registration?.partName || '',
        partNo,
        remark: p.registration?.remark || '',
      },
      project: p.registration ? {
        projectName: subject || p.registration.fmeaProjectName || p.registration.subject || '',
        customer: customerName || p.registration.customerName || '',
        productName: subject || p.registration.subject || '',
        department: p.registration.designResponsibility || '',
        leader: p.registration.fmeaResponsibleName || '',
        startDate: p.registration.fmeaStartDate || '',
      } : { projectName: subject || '', productName: subject || '' },
      cftMembers: p.cftMembers.length > 0
        ? p.cftMembers.map(m => ({
          id: m.id,
          role: m.role,
          name: m.name || '',
          department: m.department || '',
          position: m.position || '',
          task: m.responsibility || '',
          responsibility: m.responsibility || '',
          email: m.email || '',
          phone: m.phone || '',
          remark: m.remarks || '',
          remarks: m.remarks || '',
        }))
        : [],
    };
  });

  return {
    data,
    pagination: {
      page: safePage,
      pageSize,
      totalCount,
      totalPages,
    },
  };
}

// ============ 프로젝트 생성/수정 ============

/**
 * parentFmeaId, parentFmeaType 결정 로직
 */
function determineParentInfo(
  fmeaId: string,
  fmeaType: string | undefined,
  parentFmeaId: string | null | undefined,
  parentFmeaType: string | null | undefined
): { parentId: string | null; parentType: string | null } {
  const actualType = fmeaType || (fmeaId.includes('-M') ? 'M' : fmeaId.includes('-F') ? 'F' : 'P');

  let parentId: string | null = null;
  let parentType: string | null = null;

  if (actualType === 'M') {
    // Master는 자기 자신이 parent (항상 소문자로 정규화)
    parentId = fmeaId.toLowerCase();
    parentType = 'M';
  } else if (parentFmeaId) {
    // Family/Part는 선택된 상위 FMEA를 parent로 가짐 (소문자로 정규화)
    parentId = parentFmeaId.toLowerCase();
    // parentFmeaType이 제공되면 사용, 없으면 parentId에서 추출
    if (parentFmeaType) {
      parentType = parentFmeaType.toUpperCase(); // 타입은 대문자 유지 (M/F/P)
    } else {
      // parentId에서 타입 추출 (예: pfm26-m001 -> M)
      const match = parentId.match(/pfm\d{2}-([mfp])/i);
      parentType = match ? match[1].toUpperCase() : null; // 타입은 대문자로 변환
    }
  }

  return { parentId, parentType };
}

/**
 * CFT 멤버 저장 로직
 * 
 * 저장 정책:
 * - ✅ name이 있는 멤버만 저장 (name이 필수)
 * - name이 없으면 role만 있어도 제외됨
 * - 모든 필드가 제대로 매핑되도록 보장
 */
async function saveCftMembers(
  tx: any,
  fmeaId: string,
  cftMembers: any[]
): Promise<void> {
  if (!cftMembers || !Array.isArray(cftMembers)) {
    return;
  }

  // 기존 멤버 삭제
  await tx.fmeaCftMember.deleteMany({ where: { fmeaId } });

  // ✅ name이 있는 멤버만 저장 (name이 필수)
  // 핵심: role이 아니라 name이 중요! name이 있는 멤버만 저장
  const validMembers = cftMembers.filter((m: any, idx: number) => {
    // 객체 유효성 확인
    if (!m || typeof m !== 'object') {
      return false;
    }

    // name이 있는지 확인 (필수)
    const hasName = m.name && String(m.name).trim() !== '';

    if (!hasName) {
      return false;
    }

    return true;
  });

  // 모든 유효한 멤버 저장 (빈 멤버도 제외하지 않음)
  if (validMembers.length > 0) {
    const memberDataList = validMembers.map((m: any, idx: number) => {
      // ✅ 모든 필드 정확히 매핑 (task → responsibility, remark → remarks)
      // role은 선택 사항 (없어도 저장 가능, 빈 문자열 허용)
      const memberData = {
        fmeaId,
        role: (m.role && String(m.role).trim() !== '')
          ? String(m.role).trim()
          : '', // role이 없으면 빈 문자열 (선택 사항, DB 스키마 호환)
        // ✅ 사용자 정보 필드 (name은 필수, 나머지는 선택)
        name: String(m.name || '').trim(),
        department: String(m.department || '').trim() || null,
        position: String(m.position || '').trim() || null,
        // ✅ task 필드도 responsibility로 매핑
        responsibility: String(m.responsibility || m.task || '').trim() || null,
        email: (String(m.email || '').trim() || null) as string | null,
        phone: (String(m.phone || '').trim() || null) as string | null,
        // ✅ remark 필드도 remarks로 매핑
        remarks: (String(m.remarks || m.remark || '').trim() || null) as string | null,
        order: idx,
      };

      return memberData;
    });

    // DB 저장 실행
    const createResult = await tx.fmeaCftMember.createMany({
      data: memberDataList,
    });

    // 저장 개수가 다르면 에러
    if (createResult.count !== memberDataList.length) {
      console.error(`[CFT 멤버] 저장 개수 불일치! 예상: ${memberDataList.length}명, 실제 저장: ${createResult.count}명`);
      throw new Error(`CFT 멤버 저장 실패: 예상 ${memberDataList.length}명, 실제 저장 ${createResult.count}명`);
    }

    // 저장 후 DB에서 실제 확인 (검증)
    const verifySaved = await tx.fmeaCftMember.findMany({
      where: { fmeaId },
      orderBy: { order: 'asc' }
    });

    // 검증 실패 시 에러
    if (verifySaved.length !== memberDataList.length) {
      console.error(`[CFT 멤버] 검증 실패! 예상: ${memberDataList.length}명, DB 조회: ${verifySaved.length}명`);
      throw new Error(`CFT 멤버 검증 실패: 예상 ${memberDataList.length}명, DB 조회 ${verifySaved.length}명`);
    }

  } else {
  }
}

/**
 * 프로젝트 생성/수정
 */
export async function createOrUpdateProject(data: CreateProjectData): Promise<void> {
  const prisma = getPrisma();
  if (!prisma) {
    throw new Error('Database not configured - DATABASE_URL 환경변수를 확인하세요');
  }

  const fmeaId = data.fmeaId.toLowerCase();
  const { fmeaType, project, fmeaInfo, cftMembers, parentApqpNo, parentFmeaId, parentFmeaType, revisionNo } = data;

  if (!fmeaId) {
    throw new Error('fmeaId is required');
  }

  const { parentId, parentType } = determineParentInfo(fmeaId, fmeaType, parentFmeaId, parentFmeaType);

  await prisma.$transaction(async (tx) => {
    // 1. fmea_projects 테이블 저장/수정
    const projectResult = await tx.fmeaProject.upsert({
      where: { fmeaId },
      create: {
        fmeaId,
        fmeaType: fmeaType || (fmeaId.includes('-M') ? 'M' : fmeaId.includes('-F') ? 'F' : 'P'),
        parentApqpNo: parentApqpNo || null,  // ★ 상위 APQP
        parentFmeaId: parentId,
        parentFmeaType: parentType,
        status: 'active',
        step: 1,
        ...(revisionNo ? { revisionNo } : {}),
      },
      update: {
        fmeaType: fmeaType || (fmeaId.includes('-M') ? 'M' : fmeaId.includes('-F') ? 'F' : 'P'),
        // ★ FIX: sendBeacon 부분저장 시 undefined → 기존값 보존 (Prisma: undefined = skip)
        parentApqpNo: parentApqpNo !== undefined ? (parentApqpNo || null) : undefined,
        parentFmeaId: parentFmeaId !== undefined ? parentId : undefined,
        parentFmeaType: parentFmeaType !== undefined ? parentType : undefined,
        deletedAt: null,  // ★ soft-delete 복구: 재등록 시 삭제 상태 해제
        updatedAt: new Date(),
        ...(revisionNo ? { revisionNo } : {}),
      },
    });
    // 2. fmea_registrations 테이블 저장/수정
    if (fmeaInfo) {
      // ★ FIX: partName이 비어있으면 subject에서 자동 추출 (완제품명 누락 방지)
      // FmeaNameModal이 subject만 설정하고 partName을 설정하지 않는 문제 보완
      let effectivePartName = (fmeaInfo.partName || '').trim();
      if (!effectivePartName && fmeaInfo.subject) {
        const sub = fmeaInfo.subject.trim();
        effectivePartName = sub.includes('+') ? sub.split('+')[0].trim() : sub;
        // 기본값/플레이스홀더는 partName으로 사용하지 않음
        if (!effectivePartName || effectivePartName === '품명' || effectivePartName === '품명+PFMEA') {
          effectivePartName = '';
        }
      }

      const regResult = await tx.fmeaRegistration.upsert({
        where: { fmeaId },
        create: {
          fmeaId,
          companyName: fmeaInfo.companyName || '',
          engineeringLocation: fmeaInfo.engineeringLocation || '',
          customerName: fmeaInfo.customerName || '',
          modelYear: fmeaInfo.modelYear || '',
          subject: fmeaInfo.subject || '',
          fmeaStartDate: fmeaInfo.fmeaStartDate || '',
          fmeaRevisionDate: fmeaInfo.fmeaRevisionDate || undefined,
          fmeaProjectName: fmeaInfo.fmeaProjectName || project?.projectName || undefined,
          designResponsibility: fmeaInfo.designResponsibility || undefined,
          confidentialityLevel: fmeaInfo.confidentialityLevel || undefined,
          fmeaResponsibleName: fmeaInfo.fmeaResponsibleName || undefined,
          linkedCpNo: fmeaInfo.linkedCpNo || undefined,  // ✅ 연동 CP
          linkedPfdNo: fmeaInfo.linkedPfdNo || undefined, // ✅ 연동 PFD
          linkedPfmeaNo: fmeaInfo.linkedPfmeaNo || undefined,
          linkedDfmeaNo: fmeaInfo.linkedDfmeaNo || undefined, // legacy — DB 컬럼 유지
          partName: effectivePartName || undefined,  // ★ subject에서 자동 추출
          partNo: fmeaInfo.partNo || undefined,      // ★ 품번 추가
          remark: fmeaInfo.remark || undefined,       // ★ 비고
        },
        update: {
          companyName: fmeaInfo.companyName || '',
          engineeringLocation: fmeaInfo.engineeringLocation || '',
          customerName: fmeaInfo.customerName || '',
          modelYear: fmeaInfo.modelYear || '',
          subject: fmeaInfo.subject || '',
          fmeaStartDate: fmeaInfo.fmeaStartDate || '',
          fmeaRevisionDate: fmeaInfo.fmeaRevisionDate || undefined,
          fmeaProjectName: fmeaInfo.fmeaProjectName || project?.projectName || undefined,
          designResponsibility: fmeaInfo.designResponsibility || undefined,
          confidentialityLevel: fmeaInfo.confidentialityLevel || undefined,
          fmeaResponsibleName: fmeaInfo.fmeaResponsibleName || undefined,
          linkedCpNo: fmeaInfo.linkedCpNo || undefined,  // ✅ 연동 CP
          linkedPfdNo: fmeaInfo.linkedPfdNo || undefined, // ✅ 연동 PFD
          linkedPfmeaNo: fmeaInfo.linkedPfmeaNo || undefined,
          linkedDfmeaNo: fmeaInfo.linkedDfmeaNo || undefined, // legacy — DB 컬럼 유지
          partName: effectivePartName || undefined,  // ★ subject에서 자동 추출
          partNo: fmeaInfo.partNo || undefined,      // ★ 품번 추가
          remark: fmeaInfo.remark || undefined,       // ★ 비고
          updatedAt: new Date(),
        },
      });
    }

    // 3. CFT 멤버 저장 (★ cftMembers가 명시적으로 제공된 경우에만 — sendBeacon 부분저장 보호)
    if (cftMembers !== undefined) {
      await saveCftMembers(tx, fmeaId, cftMembers || []);
    }

    // ★ 4. ProjectLinkage 통합 DB 저장/업데이트 (2026-02-01 추가)
    try {
      if (fmeaInfo) {
        const idLower = fmeaId.toLowerCase();
        const existingLinkage = await (tx as any).projectLinkage.findFirst({
          where: {
            pfmeaId: idLower,
            status: 'active'
          }
        });

        // 통합 subject 형식: "품명+생산공정"
        const unifiedSubject = fmeaInfo.subject || `${fmeaInfo.partName || '품명'}+생산공정`;

        const commonData = {
          pfmeaId: fmeaId.toLowerCase().startsWith('pfm') ? idLower : existingLinkage?.pfmeaId || null,
          dfmeaId: existingLinkage?.dfmeaId || null, // legacy — DB 컬럼 유지
          pfdNo: fmeaInfo.linkedPfdNo?.toLowerCase() || existingLinkage?.pfdNo || null,
          cpNo: fmeaInfo.linkedCpNo?.toLowerCase() || existingLinkage?.cpNo || null,
          subject: unifiedSubject,
          projectName: unifiedSubject,
          customerName: fmeaInfo.customerName || existingLinkage?.customerName || '',
          companyName: fmeaInfo.companyName || existingLinkage?.companyName || '',
          modelYear: fmeaInfo.modelYear || existingLinkage?.modelYear || '',
          partNo: fmeaInfo.partNo || existingLinkage?.partNo || '',
          engineeringLocation: fmeaInfo.engineeringLocation || existingLinkage?.engineeringLocation || '',
          processResponsibility: fmeaInfo.designResponsibility || existingLinkage?.processResponsibility || '',
          responsibleName: fmeaInfo.fmeaResponsibleName || existingLinkage?.responsibleName || '',
          startDate: fmeaInfo.fmeaStartDate || existingLinkage?.startDate || '',
          revisionDate: fmeaInfo.fmeaRevisionDate || existingLinkage?.revisionDate || '',
        };

        if (existingLinkage) {
          await (tx as any).projectLinkage.update({
            where: { id: existingLinkage.id },
            data: commonData
          });
        } else {
          await (tx as any).projectLinkage.create({
            data: {
              ...commonData,
              linkType: 'auto',
              status: 'active'
            }
          });
        }
      }
    } catch (e: any) {
      // ProjectLinkage 테이블 미존재(마이그레이션 미완료)만 무시, 그 외는 트랜잭션 롤백
      if (e?.code === 'P2021' || e?.message?.includes('does not exist')) {
        console.error('[fmea-project] ProjectLinkage 테이블 미존재 (마이그레이션 필요):', e?.message);
      } else {
        throw e;
      }
    }

    // ★ 5. 마스터 FMEA 생성 시 폴백 공정 데이터 DB 복사
    try {
      const effectiveType = fmeaType || (fmeaId.includes('-m') ? 'M' : fmeaId.includes('-f') ? 'F' : 'P');
      // 마스터(M) 생성 시: 기존 마스터에서 폴백 데이터 복사
      if (effectiveType === 'M') {
        const existingDataset = await tx.pfmeaMasterDataset.findFirst({
          where: { fmeaId, isActive: true },
        });
        if (!existingDataset) {
          // 새 데이터셋 생성
          const newDataset = await tx.pfmeaMasterDataset.create({
            data: { fmeaId, isActive: true, name: `Master-${fmeaId}`, fmeaType: 'M' },
          });
          // 기존 마스터에서 폴백 데이터 복사
          const fallbackDataset = await tx.pfmeaMasterDataset.findFirst({
            where: { isActive: true, fmeaType: 'M', fmeaId: { not: fmeaId } },
            orderBy: { updatedAt: 'desc' },
          });
          if (fallbackDataset) {
            const fallbackItems = await tx.pfmeaMasterFlatItem.findMany({
              where: { datasetId: fallbackDataset.id },
            });
            if (fallbackItems.length > 0) {
              await tx.pfmeaMasterFlatItem.createMany({
                data: fallbackItems.map((item: any) => ({
                  datasetId: newDataset.id,
                  processNo: item.processNo,
                  category: item.category,
                  itemCode: item.itemCode,
                  value: item.value,
                  m4: item.m4 || undefined,  // ★★★ 2026-03-27: m4 필드 복사 추가 ★★★
                  rowSpan: item.rowSpan ?? 1,
                })),
                skipDuplicates: true,
              });
              console.info(`[fmea-project] 마스터 폴백 데이터 ${fallbackItems.length}건 복사 → ${fmeaId}`);
            }
          }
        }
      }
      // 파트(P)/패밀리(F) 생성 시: 연결된 마스터에서 데이터 복사
      if ((effectiveType === 'P' || effectiveType === 'F') && parentId) {
        const existingDataset = await tx.pfmeaMasterDataset.findFirst({
          where: { fmeaId, isActive: true },
        });
        if (!existingDataset) {
          const parentDataset = await tx.pfmeaMasterDataset.findFirst({
            where: { fmeaId: parentId, isActive: true },
            orderBy: { updatedAt: 'desc' },
          });
          if (parentDataset) {
            const newDataset = await tx.pfmeaMasterDataset.create({
              data: { fmeaId, isActive: true, name: `${effectiveType}-${fmeaId}`, fmeaType: effectiveType },
            });
            const parentItems = await tx.pfmeaMasterFlatItem.findMany({
              where: { datasetId: parentDataset.id },
            });
            if (parentItems.length > 0) {
              await tx.pfmeaMasterFlatItem.createMany({
                data: parentItems.map((item: any) => ({
                  datasetId: newDataset.id,
                  processNo: item.processNo,
                  category: item.category,
                  itemCode: item.itemCode,
                  value: item.value,
                  m4: item.m4 || undefined,  // ★★★ 2026-03-27: m4 필드 복사 추가 ★★★
                  rowSpan: item.rowSpan ?? 1,
                })),
                skipDuplicates: true,
              });
              console.info(`[fmea-project] 마스터→${effectiveType} 데이터 ${parentItems.length}건 복사: ${parentId} → ${fmeaId}`);
            }
          }
        }
      }
    } catch (copyErr: any) {
      console.error('[fmea-project] 공정 데이터 복사 오류 (무시):', copyErr?.message);
    }

    // ★ 6. 트랜잭션 내에서 저장 검증
    const verifyProject = await tx.fmeaProject.findUnique({
      where: { fmeaId }
    });
    if (!verifyProject) {
      throw new Error(`트랜잭션 내 검증 실패: fmeaProject에 ${fmeaId} 없음`);
    }

    // ★ 6. Auto-Archive (50개 초과분 구본보관함으로 전환)
    try {
      const ACTIVE_LIMIT = 50;
      const activeCount = await tx.fmeaProject.count({
        where: { status: 'active', deletedAt: null }
      });
      
      if (activeCount > ACTIVE_LIMIT) {
        const excessCount = activeCount - ACTIVE_LIMIT;
        const oldestProjects = await tx.fmeaProject.findMany({
          where: { status: 'active', deletedAt: null },
          orderBy: [{ updatedAt: 'asc' }, { createdAt: 'asc' }],
          take: excessCount + 1, // Add 1 just in case current project is the oldest
          select: { id: true, fmeaId: true }
        });
        
        const idsToArchive = oldestProjects
          .filter((p: any) => p.fmeaId !== fmeaId)
          .slice(0, excessCount)
          .map((p: any) => p.id);
          
        if (idsToArchive.length > 0) {
          await tx.fmeaProject.updateMany({
            where: { id: { in: idsToArchive } },
            data: { status: 'archived' }
          });
          console.info(`[fmea-project] 자동 아카이브(50개 초과 구본보관함 이동): ${idsToArchive.length}건`);
        }
      }
    } catch (archiveErr) {
      console.error('[fmea-project] 자동 아카이브 로직 오류:', archiveErr);
    }
  });

  // ★ 트랜잭션 완료 후 최종 검증
  const finalVerify = await prisma.fmeaProject.findUnique({
    where: { fmeaId }
  });
  if (!finalVerify) {
    console.error(`[프로젝트 저장] 최종 검증 실패! 트랜잭션 후 DB에서 ${fmeaId} 없음`);
    throw new Error(`DB 저장 최종 검증 실패: ${fmeaId}`);
  }

}

// ============ 프로젝트 삭제 ============

/**
 * 프로젝트 삭제 (대소문자 무관)
 * 
 * ★★★ 2026-02-05 수정: mode: 'insensitive' 대신 소문자 정규화로 검색 ★★★
 * - Prisma의 insensitive mode가 일부 PostgreSQL 설정에서 불안정할 수 있음
 * - 소문자로 정규화된 fmeaId를 직접 검색하여 안정성 확보
 */

// ============ 비고(remark) 단독 업데이트 ============
export async function updateProjectRemark(fmeaId: string, remark: string): Promise<void> {
  const prisma = getPrisma();
  if (!prisma) throw new Error('Database not configured');
  await prisma.fmeaRegistration.update({
    where: { fmeaId: fmeaId.toLowerCase() },
    data: { remark, updatedAt: new Date() },
  });
}

export async function deleteProject(
  fmeaId: string,
  options?: { skipApprovalCheck?: boolean; deleteModules?: string[]; permanentDelete?: boolean }
): Promise<void> {
  const skipApprovalCheck = options?.skipApprovalCheck ?? false;
  const permanentDelete = options?.permanentDelete ?? false;
  // deleteModules: 삭제할 모듈 목록. undefined=전부, ['FMEA']=FMEA만, ['FMEA','CP','PFD']=선택적
  const deleteModules = options?.deleteModules;
  const prisma = getPrisma();
  if (!prisma) {
    throw new Error('Database not configured');
  }

  if (!fmeaId) {
    throw new Error('fmeaId is required');
  }

  // ★ 승인 상태 확인 (skipApprovalCheck=false일 때만)
  if (!skipApprovalCheck) {
    try {
      const selfApproval = await (prisma as any).fmeaApproval.findFirst({
        where: { fmeaId: { equals: fmeaId.toLowerCase(), mode: 'insensitive' }, status: 'APPROVED' },
      });
      if (selfApproval) {
        throw new Error(`FMEA(${fmeaId})는 이미 승인되어 삭제할 수 없습니다.`);
      }
    } catch (e: any) {
      if (e.message.includes('승인')) throw e;
      // fmeaApproval 테이블 없으면 무시
    }
  }

  // ★★★ 핵심 수정: 소문자로 정규화하여 검색 ★★★
  const normalizedId = fmeaId.toLowerCase();

  // ★ 소문자 정규화된 ID로 직접 검색 (mode: insensitive 제거)
  let targetProject = await prisma.fmeaProject.findUnique({
    where: { fmeaId: normalizedId }
  });

  // ★ 소문자로 못 찾으면 원본 ID로 재시도
  if (!targetProject) {
    targetProject = await prisma.fmeaProject.findUnique({
      where: { fmeaId: fmeaId }
    });
  }

  if (!targetProject) {
    // 에러 대신 조용히 성공 처리 (멱등성)
    return;
  }

  const actualFmeaId = targetProject.fmeaId;

  // ★ 개정본(-rNN) 여부 판별 → 완전삭제(hard delete)
  const isRevision = /-r\d+$/.test(actualFmeaId);

  // deleteModules 필터: 특정 모듈만 삭제 가능
  const shouldDelete = (mod: string) => !deleteModules || deleteModules.includes(mod);

  try {
    // ★ 개정본: 완전삭제 (hard delete) → 개정번호 연속 생성 가능
    if (isRevision) {
      await hardDeleteRevision(prisma, actualFmeaId);
      return;
    }

    // ★ 영구삭제 (admin 휴지통에서 완전 삭제)
    if (permanentDelete) {
      await hardDeleteRevision(prisma, actualFmeaId);
      return;
    }

    // ★ 원본: Soft Delete (기존 동작 유지)
    await prisma.fmeaProject.update({
      where: { fmeaId: actualFmeaId },
      data: { deletedAt: new Date() }
    });

    // ★ ProjectLinkage 비활성화 + 연관 모듈 선택적 soft-delete
    const isPfmea = actualFmeaId.toLowerCase().startsWith('pfm');
    try {
      // 1) 연결된 linkage 조회 (삭제 전에 연관 ID 확보)
      const linkedRecords = await (prisma as any).projectLinkage.findMany({
        where: { pfmeaId: { equals: actualFmeaId, mode: 'insensitive' }, status: 'active' },
        select: { cpNo: true, pfdNo: true, apqpNo: true, pfmeaId: true, dfmeaId: true },
      });

      // 2) ProjectLinkage 비활성화
      await (prisma as any).projectLinkage.updateMany({
        where: { pfmeaId: { equals: actualFmeaId, mode: 'insensitive' } },
        data: { status: 'deleted' },
      });

      // 3) 연관 모듈 선택적 soft-delete
      const now = new Date();
      for (const link of linkedRecords) {
        // CP soft-delete
        if (link.cpNo && shouldDelete('CP')) {
          try {
            await prisma.cpRegistration.update({
              where: { cpNo: link.cpNo },
              data: { deletedAt: now },
            });
          } catch { /* 이미 삭제됨 */ }
        }
        // PFD soft-delete
        if (link.pfdNo && shouldDelete('PFD')) {
          try {
            await prisma.pfdRegistration.update({
              where: { pfdNo: link.pfdNo },
              data: { deletedAt: now },
            });
          } catch { /* 이미 삭제됨 */ }
        }
        // legacy: 연동 DFMEA가 있으면 함께 soft-delete (하위호환)
        if (link.dfmeaId && shouldDelete('DFMEA')) {
          try {
            await prisma.fmeaProject.update({
              where: { fmeaId: link.dfmeaId },
              data: { deletedAt: now },
            });
          } catch { /* 이미 삭제됨 */ }
        }
        // ※ APQP는 부모 모듈이므로 자식에서 삭제하지 않음 (APQP 리스트에서만 삭제 가능)
      }
    } catch { /* projectLinkage 없으면 무시 */ }

    // 3-2) ★★★ 폴백: fmeaId 직접 조회로 PFD/CP 삭제 (ProjectLinkage에 누락된 경우 대비) ★★★
    const fallbackNow = new Date();
    if (shouldDelete('PFD')) {
      try {
        const fallbackResult = await prisma.pfdRegistration.updateMany({
          where: {
            OR: [
              { fmeaId: { equals: actualFmeaId, mode: 'insensitive' } },
              { linkedPfmeaNo: { equals: actualFmeaId, mode: 'insensitive' } },
            ],
            deletedAt: null,
          },
          data: { deletedAt: fallbackNow },
        });
        if (fallbackResult.count > 0) {
          console.log(`[FMEA 삭제] PFD 폴백 삭제: ${fallbackResult.count}건 (fmeaId=${actualFmeaId})`);
        }
      } catch (e) {
        console.error('[FMEA 삭제] PFD 폴백 삭제 실패:', e);
      }
    }
    if (shouldDelete('CP')) {
      try {
        const fallbackResult = await prisma.cpRegistration.updateMany({
          where: {
            fmeaId: { equals: actualFmeaId, mode: 'insensitive' },
            deletedAt: null,
          },
          data: { deletedAt: fallbackNow },
        });
        if (fallbackResult.count > 0) {
          console.log(`[FMEA 삭제] CP 폴백 삭제: ${fallbackResult.count}건 (fmeaId=${actualFmeaId})`);
        }
      } catch (e) {
        console.error('[FMEA 삭제] CP 폴백 삭제 실패:', e);
      }
    }

    // 4) PfmeaMasterDataset (BD 데이터) 삭제 — FlatItem은 FK cascade로 자동 삭제
    try {
      const deleted = await prisma.pfmeaMasterDataset.deleteMany({
        where: { fmeaId: actualFmeaId },
      });
      if (deleted.count > 0) {
      }
    } catch { /* pfmeaMasterDataset 없으면 무시 */ }


    // 5) WS soft-delete (parentFmeaId 기반)
    if (shouldDelete('WS')) {
      try {
        await (prisma as any).wsRegistration.updateMany({
          where: { parentFmeaId: { equals: actualFmeaId, mode: 'insensitive' }, deletedAt: null },
          data: { deletedAt: new Date() },
        });
      } catch { /* wsRegistration 없으면 무시 */ }
    }

    // 5) PM soft-delete (parentFmeaId 기반)
    if (shouldDelete('PM')) {
      try {
        await (prisma as any).pmRegistration.updateMany({
          where: { parentFmeaId: { equals: actualFmeaId, mode: 'insensitive' }, deletedAt: null },
          data: { deletedAt: new Date() },
        });
      } catch { /* pmRegistration 없으면 무시 */ }
    }
  } catch (deleteError: any) {
    console.error(`[FMEA 삭제] fmeaProject soft delete 실패: ${actualFmeaId}`, deleteError.message);
    throw deleteError;
  }

}

// ── 프로젝트 복원 (admin 휴지통에서 복원) ──
export async function restoreProject(fmeaId: string): Promise<void> {
  const prisma = getPrisma();
  if (!prisma) throw new Error('Database not configured');

  const actualFmeaId = fmeaId.toLowerCase();
  const project = await prisma.fmeaProject.findUnique({ where: { fmeaId: actualFmeaId } });
  if (!project) throw new Error(`프로젝트를 찾을 수 없습니다: ${fmeaId}`);
  if (!project.deletedAt) throw new Error(`이미 활성 상태인 프로젝트입니다: ${fmeaId}`);

  // 1. FmeaProject 복원
  await prisma.fmeaProject.update({
    where: { fmeaId: actualFmeaId },
    data: { deletedAt: null },
  });

  // 2. ProjectLinkage status 복원
  const isPfmea = actualFmeaId.startsWith('pfm');
  try {
    await (prisma as any).projectLinkage.updateMany({
      where: { pfmeaId: { equals: actualFmeaId, mode: 'insensitive' }, status: 'deleted' },
      data: { status: 'active' },
    });
  } catch { /* projectLinkage 테이블 없으면 무시 */ }
}

// ── 개정본 완전삭제 (hard delete) ──
// fmeaId를 참조하는 모든 테이블에서 레코드를 물리적으로 삭제
async function hardDeleteRevision(prisma: any, fmeaId: string): Promise<void> {
  // fmeaId 참조 테이블 (FK 없는 plain String 필드)
  const FMEA_ID_TABLES = [
    'l1_structures', 'l2_structures', 'l3_structures',
    'l1_functions', 'l2_functions', 'l3_functions',
    'failure_effects', 'failure_modes', 'failure_causes',
    'failure_links', 'failure_analyses', 'risk_analyses', 'optimizations',
    'fmea_confirmed_states', 'fmea_revision_history',
    'pfmea_master_datasets', 'fmea_meeting_minutes', 'fmea_sod_history',
    'fmea_official_revisions', 'fmea_version_backups', 'fmea_approvals',
    'fmea_confirm_histories', 'fmea_register_change_histories',
    'shared_process_master', 'pfmea_cp_mappings', 'pfmea_pfd_mappings',
    'dashboard_stats_cache', 'ep_devices', 'lessons_learned',
    'pfmea_state_history', 'dfmea_master_datasets',
  ] as const;

  // 1) fmeaId 참조 테이블 삭제
  for (const table of FMEA_ID_TABLES) {
    try {
      await prisma.$executeRawUnsafe(
        `DELETE FROM "${table}" WHERE "fmeaId" = $1`, fmeaId
      );
    } catch { /* 테이블/컬럼 미존재 시 무시 */ }
  }

  // 2) ProjectLinkage 삭제
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "project_linkages" WHERE "pfmeaId" = $1`, fmeaId
    );
  } catch { /* 무시 */ }

  // 3) FK 자식 테이블 삭제 (fmea_registrations, cft_members, worksheet_data)
  for (const table of ['fmea_worksheet_data', 'fmea_cft_members', 'fmea_registrations']) {
    try {
      await prisma.$executeRawUnsafe(
        `DELETE FROM "${table}" WHERE "fmeaId" = $1`, fmeaId
      );
    } catch { /* 무시 */ }
  }

  // 4) fmea_projects 본체 삭제 (마지막에 — FK 참조 제거 후)
  await prisma.$executeRawUnsafe(
    `DELETE FROM "fmea_projects" WHERE "fmeaId" = $1`, fmeaId
  );

}

