/**
 * @file project-navigation.ts
 * @description 프로젝트 간 이동 경로 표준화 유틸리티
 *
 * PFMEA ↔ CP ↔ PFD 간 이동 시 반드시 이 유틸리티를 사용한다.
 * 직접 router.push() 호출 금지 — navigateTo*() 함수만 사용.
 *
 * 원칙:
 *   1. 모든 ID는 lowercase 정규화
 *   2. null/undefined ID → 리스트 페이지로 이동 (엉뚱한 페이지 방지)
 *   3. 이동 전 ID 유효성 검증
 *   4. ProjectLinkage 기반 연결 ID 조회
 *
 * @version 1.0.0
 * @created 2026-03-21
 */

// ══════════════════════════════════════════════
// 타입 정의
// ══════════════════════════════════════════════

export type ModuleType = 'pfmea' | 'cp' | 'pfd';
export type PageType = 'register' | 'worksheet' | 'list';

export interface NavigationTarget {
  module: ModuleType;
  page: PageType;
  id: string | null;
  /** 추가 쿼리 파라미터 */
  query?: Record<string, string>;
}

export interface LinkedProjectIds {
  fmeaId: string | null;
  cpNo: string | null;
  pfdNo: string | null;
}

export interface NavigationResult {
  url: string;
  valid: boolean;
  warning?: string;
}

// ══════════════════════════════════════════════
// ID 정규화
// ══════════════════════════════════════════════

/**
 * 프로젝트 ID를 정규화 (lowercase, trim)
 * null/undefined/빈문자열 → null 반환
 */
export function normalizeProjectId(id: string | null | undefined): string | null {
  if (!id || typeof id !== 'string') return null;
  const trimmed = id.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

// ══════════════════════════════════════════════
// URL 생성
// ══════════════════════════════════════════════

const MODULE_PATHS: Record<ModuleType, string> = {
  pfmea: '/pfmea',
  cp: '/control-plan',
  pfd: '/pfd',
};

const ID_PARAM: Record<ModuleType, string> = {
  pfmea: 'id',
  cp: 'id',       // register에서는 id, worksheet에서는 cpNo
  pfd: 'id',       // register에서는 id, worksheet에서는 pfdNo
};

/**
 * 모듈 이동 URL 생성
 * ID가 없으면 리스트 페이지 URL 반환 (엉뚱한 페이지 이동 방지)
 */
export function buildNavigationUrl(target: NavigationTarget): NavigationResult {
  const basePath = MODULE_PATHS[target.module];
  const normalizedId = normalizeProjectId(target.id);

  // ID 없으면 리스트 페이지로
  if (!normalizedId) {
    return {
      url: `${basePath}/list`,
      valid: false,
      warning: `${target.module} ID가 없어 리스트 페이지로 이동합니다.`,
    };
  }

  // 페이지별 URL 생성
  let url: string;
  const queryParts: string[] = [];

  switch (target.page) {
    case 'register':
      queryParts.push(`id=${encodeURIComponent(normalizedId)}`);
      url = `${basePath}/register`;
      break;

    case 'worksheet':
      if (target.module === 'cp') {
        queryParts.push(`cpNo=${encodeURIComponent(normalizedId)}`);
      } else if (target.module === 'pfd') {
        queryParts.push(`pfdNo=${encodeURIComponent(normalizedId)}`);
      } else {
        queryParts.push(`id=${encodeURIComponent(normalizedId)}`);
      }
      url = `${basePath}/worksheet`;
      break;

    case 'list':
    default:
      url = `${basePath}/list`;
      break;
  }

  // 추가 쿼리 파라미터
  if (target.query) {
    for (const [key, value] of Object.entries(target.query)) {
      if (value) queryParts.push(`${key}=${encodeURIComponent(value)}`);
    }
  }

  if (queryParts.length > 0) {
    url += `?${queryParts.join('&')}`;
  }

  return { url, valid: true };
}

// ══════════════════════════════════════════════
// 네비게이션 함수 (router.push 래퍼)
// ══════════════════════════════════════════════

/**
 * PFMEA → CP 워크시트 이동
 */
export function getUrlToCpWorksheet(cpNo: string | null | undefined): NavigationResult {
  return buildNavigationUrl({
    module: 'cp',
    page: 'worksheet',
    id: cpNo ?? null,
  });
}

/**
 * PFMEA → PFD 워크시트 이동
 */
export function getUrlToPfdWorksheet(pfdNo: string | null | undefined): NavigationResult {
  return buildNavigationUrl({
    module: 'pfd',
    page: 'worksheet',
    id: pfdNo ?? null,
  });
}

/**
 * CP/PFD → PFMEA 워크시트 이동
 */
export function getUrlToPfmeaWorksheet(fmeaId: string | null | undefined, tab?: string): NavigationResult {
  return buildNavigationUrl({
    module: 'pfmea',
    page: 'worksheet',
    id: fmeaId ?? null,
    query: tab ? { tab } : undefined,
  });
}

/**
 * → CP 등록 페이지 이동
 */
export function getUrlToCpRegister(cpNo: string | null | undefined): NavigationResult {
  return buildNavigationUrl({
    module: 'cp',
    page: 'register',
    id: cpNo ?? null,
  });
}

/**
 * → PFD 등록 페이지 이동
 */
export function getUrlToPfdRegister(pfdNo: string | null | undefined): NavigationResult {
  return buildNavigationUrl({
    module: 'pfd',
    page: 'register',
    id: pfdNo ?? null,
  });
}

/**
 * → PFMEA 등록 페이지 이동
 */
export function getUrlToPfmeaRegister(fmeaId: string | null | undefined): NavigationResult {
  return buildNavigationUrl({
    module: 'pfmea',
    page: 'register',
    id: fmeaId ?? null,
  });
}

// ══════════════════════════════════════════════
// ProjectLinkage 기반 연결 ID 조회
// ══════════════════════════════════════════════

/**
 * 프로젝트의 연결된 FMEA/CP/PFD ID 조회
 * ProjectLinkage 테이블 우선, Registration fallback
 */
export async function fetchLinkedProjectIds(
  currentModule: ModuleType,
  currentId: string
): Promise<LinkedProjectIds> {
  const normalizedId = normalizeProjectId(currentId);
  if (!normalizedId) {
    return { fmeaId: null, cpNo: null, pfdNo: null };
  }

  try {
    // 1차: ProjectLinkage에서 조회
    const paramKey = currentModule === 'pfmea' ? 'pfmeaId'
      : currentModule === 'cp' ? 'cpNo'
      : 'pfdNo';

    const linkRes = await fetch(
      `/api/project-linkage?${paramKey}=${encodeURIComponent(normalizedId)}`
    );

    if (linkRes.ok) {
      const linkData = await linkRes.json();
      if (linkData.success && linkData.data?.length > 0) {
        const link = linkData.data[0];
        return {
          fmeaId: normalizeProjectId(link.pfmeaId),
          cpNo: normalizeProjectId(link.cpNo),
          pfdNo: normalizeProjectId(link.pfdNo),
        };
      }
    }

    // 2차: 각 모듈별 Registration에서 조회
    if (currentModule === 'pfmea') {
      const regRes = await fetch(`/api/pfmea/${normalizedId}`);
      if (regRes.ok) {
        const regData = await regRes.json();
        const d = regData.data || regData;
        return {
          fmeaId: normalizedId,
          cpNo: normalizeProjectId(d.linkedCpNo),
          pfdNo: normalizeProjectId(d.linkedPfdNo),
        };
      }
    }

    if (currentModule === 'cp') {
      const regRes = await fetch(`/api/control-plan?cpNo=${encodeURIComponent(normalizedId)}`);
      if (regRes.ok) {
        const regData = await regRes.json();
        const d = Array.isArray(regData.data) ? regData.data[0] : regData.data;
        if (d) {
          return {
            fmeaId: normalizeProjectId(d.fmeaId || d.linkedPfmeaNo || d.parentFmeaId),
            cpNo: normalizedId,
            pfdNo: normalizeProjectId(d.linkedPfdNo),
          };
        }
      }
    }

    if (currentModule === 'pfd') {
      const regRes = await fetch(`/api/pfd?pfdNo=${encodeURIComponent(normalizedId)}`);
      if (regRes.ok) {
        const regData = await regRes.json();
        const d = Array.isArray(regData.data) ? regData.data[0] : regData.data;
        if (d) {
          const cpNos = d.linkedCpNos;
          return {
            fmeaId: normalizeProjectId(d.fmeaId || d.parentFmeaId),
            cpNo: normalizeProjectId(Array.isArray(cpNos) ? cpNos[0] : cpNos),
            pfdNo: normalizedId,
          };
        }
      }
    }
  } catch (err) {
    console.error('[project-navigation] fetchLinkedProjectIds 오류:', err);
  }

  return { fmeaId: null, cpNo: null, pfdNo: null };
}

// ══════════════════════════════════════════════
// 안전한 네비게이션 (router 래퍼)
// ══════════════════════════════════════════════

/**
 * 안전한 모듈 간 이동
 * - ID 정규화
 * - null → 리스트 페이지
 * - 경고 메시지 토스트 (optional)
 *
 * @example
 * const nav = safeNavigate('cp', 'worksheet', cpNo);
 * if (nav.warning) toast.warn(nav.warning);
 * router.push(nav.url);
 */
export function safeNavigate(
  module: ModuleType,
  page: PageType,
  id: string | null | undefined,
  query?: Record<string, string>
): NavigationResult {
  return buildNavigationUrl({ module, page, id: id ?? null, query });
}
