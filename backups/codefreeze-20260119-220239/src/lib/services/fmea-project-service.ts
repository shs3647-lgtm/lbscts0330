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
}

// ============ 프로젝트 조회 ============

/**
 * 프로젝트 목록 조회 (특정 ID 또는 전체)
 */
export async function getProjects(fmeaId?: string | null): Promise<FMEAProjectData[]> {
  const prisma = getPrisma();
  if (!prisma) {
    throw new Error('Database not configured');
  }

  const targetId = fmeaId?.toLowerCase() || null;
  const whereClause = targetId ? { fmeaId: targetId } : {};
  
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

  // ★ 2026-01-17: 레거시 데이터 조회 제거 - 입력된 데이터만 사용
  // 레거시 폴백 로직 완전 제거됨
  console.log(`[FMEA-SERVICE] 프로젝트 조회: ${projects.length}개 (레거시 폴백 비활성화)`);

  // 응답 형식으로 변환 (레거시 폴백 없음)
  const result = projects.map(p => {
    return {
      id: p.fmeaId.toLowerCase(),
      fmeaType: p.fmeaType,
      parentApqpNo: p.parentApqpNo || null,  // ★ 상위 APQP
      parentFmeaId: p.parentFmeaId ? p.parentFmeaId.toLowerCase() : null,
      parentFmeaType: p.parentFmeaType,
      status: p.status,
      step: p.step,
      revisionNo: p.revisionNo,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      // ★ registration 데이터만 사용, 레거시 폴백 제거
      fmeaInfo: p.registration ? {
        companyName: p.registration.companyName || '',
        engineeringLocation: p.registration.engineeringLocation || '',
        customerName: p.registration.customerName || '',
        modelYear: p.registration.modelYear || '',
        subject: p.registration.subject || '',
        fmeaStartDate: p.registration.fmeaStartDate || '',
        fmeaRevisionDate: p.registration.fmeaRevisionDate || '',
        fmeaProjectName: p.registration.fmeaProjectName || '',
        fmeaId: p.fmeaId,
        fmeaType: p.fmeaType,
        designResponsibility: p.registration.designResponsibility || '',
        confidentialityLevel: p.registration.confidentialityLevel || '',
        fmeaResponsibleName: p.registration.fmeaResponsibleName || '',
      } : { subject: p.fmeaId }, // 레거시 폴백 대신 기본값 사용
      project: p.registration ? {
        projectName: p.registration.fmeaProjectName || p.registration.subject || p.fmeaId,
        customer: p.registration.customerName || '',
        productName: p.registration.subject || '',
        department: p.registration.designResponsibility || '',
        leader: p.registration.fmeaResponsibleName || '',
        startDate: p.registration.fmeaStartDate || '',
      } : { projectName: p.fmeaId }, // 레거시 폴백 대신 기본값 사용
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
    console.warn('[CFT 멤버 저장] cftMembers가 배열이 아닙니다:', cftMembers);
    return;
  }

  // ✅ 입력 데이터 상세 로그 (name 존재 여부 명확히 확인)
  console.log(`[CFT 멤버 저장] 입력받은 데이터 (${cftMembers.length}명):`, 
    JSON.stringify(cftMembers.map((m, idx) => ({
      idx,
      role: m.role || '(role없음)',
      name: m.name || '(name없음)',
      nameEmpty: !m.name || String(m.name).trim() === '',
      nameType: typeof m.name,
      department: m.department || '(부서없음)',
      position: m.position || '(직급없음)',
      email: m.email || '(이메일없음)',
      phone: m.phone || '(전화없음)',
      task: m.task || '(task없음)',
      remark: m.remark || '(remark없음)',
    })), null, 2)
  );
  
  // ✅ name이 있는 멤버와 없는 멤버 분리 확인
  const withName = cftMembers.filter(m => m.name && String(m.name).trim() !== '');
  const withoutName = cftMembers.filter(m => !m.name || String(m.name).trim() === '');
  console.log(`[CFT 멤버 저장] name 상태: ${withName.length}명(name있음), ${withoutName.length}명(name없음)`);
  
  if (withoutName.length > 0) {
    console.error(`[CFT 멤버 저장] ⚠️ name 없는 멤버 상세:`, 
      withoutName.map((m, idx) => ({
        idx,
        role: m.role,
        name: m.name,
        nameType: typeof m.name,
        nameValue: String(m.name || ''),
        nameTrimmed: String(m.name || '').trim(),
        nameIsEmpty: !m.name || String(m.name).trim() === '',
      }))
    );
  }

  // 기존 멤버 삭제
  await tx.fmeaCftMember.deleteMany({ where: { fmeaId } });
  
  // ✅ name이 있는 멤버만 저장 (name이 필수)
  // 핵심: role이 아니라 name이 중요! name이 있는 멤버만 저장
  const validMembers = cftMembers.filter((m: any, idx: number) => {
    // 객체 유효성 확인
    if (!m || typeof m !== 'object') {
      console.warn(`[CFT 멤버 저장] ⚠️ [${idx}] 유효하지 않은 객체 제외:`, m);
      return false;
    }
    
    // ✅ name이 있는지 확인 (필수)
    const hasName = m.name && String(m.name).trim() !== '';
    
    if (!hasName) {
      console.warn(`[CFT 멤버 저장] ⚠️ [${idx}] name이 없는 멤버 제외 (role: ${m.role || '없음'}):`, m);
      return false;
    }
    
    return true;
  });
  
  console.log(`[CFT 멤버 저장] 전체: ${cftMembers.length}명, 유효: ${validMembers.length}명, 제외: ${cftMembers.length - validMembers.length}명`);
  
  // ✅ 저장할 멤버가 전체와 다르면 상세 로그 + 모든 멤버 상세 출력
  if (validMembers.length !== cftMembers.length) {
    console.error(`[CFT 멤버 저장] ❌ 멤버 수 불일치! 전체: ${cftMembers.length}명, 저장할 멤버: ${validMembers.length}명`);
    
    // 모든 멤버 상세 출력
    console.error('[CFT 멤버 저장] 입력받은 모든 멤버:', 
      cftMembers.map((m, idx) => ({
        idx,
        id: m.id || '(id없음)',
        role: m.role || '(role없음)',
        name: m.name || '(name없음)',
        nameTrim: m.name ? String(m.name).trim() : '',
        nameEmpty: !m.name || String(m.name).trim() === '',
      }))
    );
    
    // 제외된 멤버 상세 출력
    const excluded = cftMembers.filter((m, idx) => {
      const hasName = m.name && String(m.name).trim() !== '';
      return !hasName;
    });
    console.error('[CFT 멤버 저장] 제외된 멤버 상세:', excluded.map((m, idx) => ({
      idx,
      id: m.id,
      role: m.role,
      name: m.name,
      nameEmpty: !m.name || String(m.name).trim() === '',
    })));
    
    // 유효한 멤버 상세 출력
    console.log('[CFT 멤버 저장] 유효한 멤버 상세:', validMembers.map((m, idx) => ({
      idx,
      id: m.id,
      role: m.role,
      name: m.name,
    })));
  } else {
    console.log(`[CFT 멤버 저장] ✅ 모든 멤버 유효: ${cftMembers.length}명 모두 저장 예정`);
  }
  
  // ✅ 모든 유효한 멤버 저장 (빈 멤버도 제외하지 않음)
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
      
      // 상세 로그
      if (memberData.name) {
        console.log(`[CFT 멤버 저장] ✅ [${idx}] ${memberData.name} (${memberData.role}) - ${memberData.department || '(부서없음)'}`);
      } else {
        console.warn(`[CFT 멤버 저장] ⚠️ [${idx}] 이름 없음 (role: ${memberData.role}) - role만 저장됨`);
      }
      
      return memberData;
    });
    
    // 저장 전 최종 검증
    console.log(`[CFT 멤버 저장] 저장할 데이터 (${memberDataList.length}명):`, 
      JSON.stringify(memberDataList.map(m => ({
        role: m.role,
        name: m.name || '(이름없음)',
        department: m.department || '(부서없음)',
        order: m.order,
      })), null, 2)
    );
    
    // ✅ DB 저장 실행
    console.log(`[CFT 멤버 저장] DB 저장 시작: ${memberDataList.length}명 저장 시도`);
    
    const createResult = await tx.fmeaCftMember.createMany({
      data: memberDataList,
    });
    
    // ✅ 실제 저장된 개수 확인
    console.log(`✅ [CFT 멤버] DB 저장 완료:`, {
      createResultCount: createResult.count,
      예상개수: memberDataList.length,
      일치여부: createResult.count === memberDataList.length,
      fmeaId,
    });
    
    // ✅ 저장 개수가 다르면 에러
    if (createResult.count !== memberDataList.length) {
      console.error(`❌ [CFT 멤버] 저장 개수 불일치! 예상: ${memberDataList.length}명, 실제 저장: ${createResult.count}명`);
      throw new Error(`CFT 멤버 저장 실패: 예상 ${memberDataList.length}명, 실제 저장 ${createResult.count}명`);
    }
    
    // ✅ 저장 후 DB에서 실제 확인 (검증)
    const verifySaved = await tx.fmeaCftMember.findMany({
      where: { fmeaId },
      orderBy: { order: 'asc' }
    });
    
    console.log(`[CFT 멤버 저장] ✅ DB 검증 완료: 실제 DB에 저장된 멤버 ${verifySaved.length}명`,
      verifySaved.map((m: { name: string | null; role: string | null; department: string | null; order: number }, idx: number) => ({
        idx,
        name: m.name || '(이름없음)',
        role: m.role || '(role없음)',
        department: m.department || '(부서없음)',
        order: m.order,
      }))
    );
    
    // ✅ 검증 실패 시 에러
    if (verifySaved.length !== memberDataList.length) {
      console.error(`❌ [CFT 멤버] 검증 실패! 예상: ${memberDataList.length}명, DB 조회: ${verifySaved.length}명`);
      throw new Error(`CFT 멤버 검증 실패: 예상 ${memberDataList.length}명, DB 조회 ${verifySaved.length}명`);
    }
    
    console.log(`✅ [CFT 멤버] 최종 확인 완료: ${verifySaved.length}명 모두 DB에 저장됨`);
  } else {
    console.warn(`[CFT 멤버 저장] 저장할 유효한 멤버가 없습니다 (fmeaId: ${fmeaId})`);
  }
}

/**
 * 프로젝트 생성/수정
 */
export async function createOrUpdateProject(data: CreateProjectData): Promise<void> {
  const prisma = getPrisma();
  if (!prisma) {
    throw new Error('Database not configured');
  }

  const fmeaId = data.fmeaId.toLowerCase();
  const { fmeaType, project, fmeaInfo, cftMembers, parentApqpNo, parentFmeaId, parentFmeaType } = data;

  if (!fmeaId) {
    throw new Error('fmeaId is required');
  }

  const { parentId, parentType } = determineParentInfo(fmeaId, fmeaType, parentFmeaId, parentFmeaType);
  console.log(`[프로젝트 저장] FMEA ID: ${fmeaId}, Type: ${fmeaType || 'P'}, Parent APQP: ${parentApqpNo}, Parent FMEA: ${parentId}, ParentType: ${parentType}`);

  // 트랜잭션으로 모든 테이블 저장
  await prisma.$transaction(async (tx) => {
    // 1. fmea_projects 테이블 저장/수정
    await tx.fmeaProject.upsert({
      where: { fmeaId },
      create: {
        fmeaId,
        fmeaType: fmeaType || (fmeaId.includes('-M') ? 'M' : fmeaId.includes('-F') ? 'F' : 'P'),
        parentApqpNo: parentApqpNo || null,  // ★ 상위 APQP
        parentFmeaId: parentId,
        parentFmeaType: parentType,
        status: 'active',
        step: 1,
      },
      update: {
        fmeaType: fmeaType || (fmeaId.includes('-M') ? 'M' : fmeaId.includes('-F') ? 'F' : 'P'),
        parentApqpNo: parentApqpNo || null,  // ★ 상위 APQP
        parentFmeaId: parentId,
        parentFmeaType: parentType,
        updatedAt: new Date(),
      },
    });

    // 2. fmea_registrations 테이블 저장/수정
    if (fmeaInfo) {
      await tx.fmeaRegistration.upsert({
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
          updatedAt: new Date(),
        },
      });
    }

    // 3. CFT 멤버 저장
    await saveCftMembers(tx, fmeaId, cftMembers || []);

    // 4. fmea_legacy_data에도 저장 (하위호환)
    const existingLegacy = await tx.fmeaLegacyData.findUnique({
      where: { fmeaId }
    });
    const existingData = (existingLegacy?.data as any) || {};
    
    await tx.fmeaLegacyData.upsert({
      where: { fmeaId },
      create: {
        fmeaId,
        data: {
          ...existingData,
          fmeaInfo,
          project,
          cftMembers,
          fmeaType: fmeaType || (fmeaId.includes('-M') ? 'M' : fmeaId.includes('-F') ? 'F' : 'P'),
          parentFmeaId: parentId,
          parentFmeaType: parentType,
          savedAt: new Date().toISOString(),
        },
      },
      update: {
        data: {
          ...existingData,
          fmeaInfo,
          project,
          cftMembers,
          fmeaType: fmeaType || (fmeaId.includes('-M') ? 'M' : fmeaId.includes('-F') ? 'F' : 'P'),
          parentFmeaId: parentId,
          parentFmeaType: parentType,
          savedAt: new Date().toISOString(),
        },
      },
    });
  });

  console.log(`✅ FMEA 프로젝트 저장 완료: ${fmeaId}`);
}

// ============ 프로젝트 삭제 ============

/**
 * 프로젝트 삭제
 */
export async function deleteProject(fmeaId: string): Promise<void> {
  const prisma = getPrisma();
  if (!prisma) {
    throw new Error('Database not configured');
  }

  if (!fmeaId) {
    throw new Error('fmeaId is required');
  }

  const normalizedId = fmeaId.toLowerCase();

  // CASCADE 삭제 (registration, cftMembers, worksheetData 자동 삭제)
  await prisma.fmeaProject.delete({
    where: { fmeaId: normalizedId }
  });

  // 레거시 데이터도 삭제
  await prisma.fmeaLegacyData.deleteMany({
    where: { fmeaId: normalizedId }
  });

  console.log(`✅ FMEA 프로젝트 삭제 완료: ${normalizedId}`);
}

