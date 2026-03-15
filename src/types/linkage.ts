/**
 * @file linkage.ts
 * @description 프로젝트 연동 관련 타입 정의
 * @created 2026-01-29
 * @updated 2026-02-04 모듈 ID 접두사 규칙 하드코딩
 * 
 * @status CODE_FREEZE 🔒🔒🔒
 * @freeze_level L1 (Critical) - 절대 수정 금지
 * @frozen_date 2026-02-04
 * @allowed_changes 없음
 * 
 * 🚨🚨🚨 이 파일은 L1 코드프리즈 상태입니다 🚨🚨🚨
 * APP_CONFIGS의 prefix 값은 절대 변경 금지!
 * 수정 시 시스템 전체 ID 체계가 깨질 수 있습니다.
 */

// =====================================================
// 연동 모드
// =====================================================
export type LinkMode = 'solo' | 'linked';

// =====================================================
// 앱 유형
// =====================================================
export type AppType = 'apqp' | 'pfmea' | 'dfmea' | 'pfd' | 'cp';  // legacy — dfmea는 DB 호환성 유지용

// =====================================================
// 앱 설정
// =====================================================
export interface AppConfig {
    id: AppType;
    name: string;
    prefix: string;
    color: string;
    bgColor: string;
    icon: string;
}

// ★★★ HARDCODED - 모듈 ID 접두사 규칙 (변경 금지) ★★★
// APQP=apq(3자리), PFMEA=pfm(3자리), DFMEA=dfm(3자리), PFD=pfd(3자리), CP=cp(2자리)
export const APP_CONFIGS: Record<AppType, AppConfig> = {
    apqp: { id: 'apqp', name: 'APQP', prefix: 'apq', color: '#16a34a', bgColor: 'bg-green-500', icon: '📋' },  // HARDCODED ★ apq (3자리)
    pfmea: { id: 'pfmea', name: 'PFMEA', prefix: 'pfm', color: '#00587a', bgColor: 'bg-teal-600', icon: '🔧' },  // HARDCODED
    dfmea: { id: 'dfmea', name: 'DFMEA', prefix: 'dfm', color: '#7c3aed', bgColor: 'bg-violet-600', icon: '🔩' },  // HARDCODED — legacy, DB 호환성 유지용
    pfd: { id: 'pfd', name: 'PFD', prefix: 'pfd', color: '#8b5cf6', bgColor: 'bg-purple-500', icon: '📐' },  // HARDCODED
    cp: { id: 'cp', name: 'CP', prefix: 'cp', color: '#0d9488', bgColor: 'bg-teal-500', icon: '📝' },  // HARDCODED
};

// =====================================================
// 문서 생성 요청
// =====================================================
export interface CreateDocumentRequest {
    linkMode: LinkMode;
    sourceApp: AppType;              // 어느 리스트에서 시작했는지
    linkedApps: Partial<Record<AppType, boolean>>;  // 함께 생성할 앱들
    fmeaType?: 'M' | 'F' | 'P';      // ★ FMEA 종류 (Master/Family/Part), 기본값 P
    basicInfo?: {
        projectName?: string;
        customerName?: string;
        modelYear?: string;
        companyName?: string;
        // ★★★ 추가 필드 ★★★
        engineeringLocation?: string;
        confidentialityLevel?: string;
        processResponsibility?: string;
    };
}

// =====================================================
// 문서 생성 응답
// =====================================================
export interface CreateDocumentResponse {
    success: boolean;
    linkGroupNo: number;
    createdDocs: Partial<Record<AppType, string>>;  // 앱별 생성된 ID
    linkageId?: string;
    error?: string;
}

// =====================================================
// 연동 상태
// =====================================================
export interface LinkageStatus {
    isLinked: boolean;
    linkGroupNo: number;
    linkedApps: Partial<Record<AppType, string>>;  // 앱별 연동된 ID
}

// =====================================================
// ID 접미사 타입
// =====================================================
export type LinkSuffix = 'S' | `L${string}`;

// =====================================================
// 연동 계층 관계 (상위 → 하위)
// =====================================================
export const APP_HIERARCHY: Record<AppType, AppType[]> = {
    apqp: ['pfmea'],                     // APQP → PFMEA (dfmea 제거)
    pfmea: ['pfd', 'cp'],                // PFMEA → PFD, CP
    dfmea: [],                           // legacy — DB 호환성 유지용
    pfd: ['cp'],                         // PFD → CP
    cp: [],                              // CP → (없음)
};

// =====================================================
// 앱별 등록 화면 URL
// =====================================================
export const APP_REGISTER_URLS: Record<AppType, string> = {
    apqp: '/apqp/register',
    pfmea: '/pfmea/register',
    dfmea: '/dfmea/register',    // legacy — DB 호환성 유지용
    pfd: '/pfd/register',
    cp: '/control-plan/register',
};

// =====================================================
// 앱별 리스트 화면 URL
// =====================================================
export const APP_LIST_URLS: Record<AppType, string> = {
    apqp: '/apqp/list',
    pfmea: '/pfmea/list',
    dfmea: '/dfmea/list',        // legacy — DB 호환성 유지용
    pfd: '/pfd/list',
    cp: '/control-plan/list',
};
