/**
 * APQP 프로젝트 타입 정의
 * 
 * 목적: APQP (Advanced Product Quality Planning) 데이터 구조 표준화
 * 버전: v1.0.0
 */

/**
 * APQP 프로젝트 (최상위 객체)
 */
export interface APQPProject {
  id: string;                    // PJ-123456 형식
  projectName: string;           // 프로젝트명
  customer: string;              // 고객사
  factory: string;               // 공장
  productName: string;           // 제품명
  startDate: string;             // 시작일 (YYYY-MM-DD)
  endDate: string;               // 종료일 (YYYY-MM-DD)
  status: string;                // 상태 (Active, Completed, On Hold 등)
  stages: APQPStage[];           // APQP 5 Stage
  createdAt: string;             // 생성일시 (ISO 8601)
  updatedAt: string;             // 수정일시 (ISO 8601)
  createdBy: string;             // 생성자
}

/**
 * APQP Stage (5단계)
 * 
 * Stage 1: 계획 및 정의
 * Stage 2: 제품 설계 및 개발
 * Stage 3: 공정 설계 및 개발
 * Stage 4: 제품 및 공정 검증
 * Stage 5: 양산 준비
 */
export interface APQPStage {
  id: string;                    // stage-1, stage-2, ..., stage-5
  label: string;                 // Stage 이름
  expanded: boolean;             // 확장/축소 상태
  activities: APQPActivity[];    // Activity 목록
}

/**
 * APQP Activity (세부 활동)
 */
export interface APQPActivity {
  id: string;                    // activity-1, activity-2, ...
  name: string;                  // Activity 이름
  stageId: string;               // 소속 Stage ID
  planStart?: string;            // 계획 시작일 (YYYY-MM-DD)
  planFinish?: string;           // 계획 완료일 (YYYY-MM-DD)
  actStart?: string;             // 실제 시작일 (YYYY-MM-DD)
  actFinish?: string;            // 실제 완료일 (YYYY-MM-DD)
  state?: 'G' | 'Y' | 'R';       // 상태: Green(정상), Yellow(주의), Red(지연)
  department?: string;           // 담당 부서
  owner?: string;                // 담당자
}

/**
 * APQP Storage Key
 */
export const APQP_STORAGE_KEYS = {
  PROJECT_PREFIX: 'apqp-project-',  // localStorage 키 접두사
  PROJECT_LIST: 'apqp-project-list', // 프로젝트 목록
} as const;



















