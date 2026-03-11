/**
 * @file cpIdUtils.ts
 * @description CP 하이브리드 ID 생성/파싱 유틸리티
 * 
 * 벤치마킹: FMEA 하이브리드 ID 시스템
 * 
 * CP 하이브리드 ID 형식: {CP_SEQ}-{TYPE}-{PATH}-{SEQ}
 * 
 * 예시:
 *   공정: CP001-P-001                  CP001의 1번째 공정
 *   검출장치: CP001-D-P001-001         CP001의 P001 공정의 1번째 검출장치
 *   관리항목: CP001-CI-P001-001        CP001의 P001 공정의 1번째 관리항목
 *   관리방법: CP001-CM-P001-001        CP001의 P001 공정의 1번째 관리방법
 *   대응계획: CP001-RP-P001-001        CP001의 P001 공정의 1번째 대응계획
 * 
 * 경로 형식:
 *   공정: P{NO}                        P01, P02, ...
 *   검출장치: P{NO}                    P01 (공정 경로)
 *   관리항목: P{NO}                    P01 (공정 경로)
 *   관리방법: P{NO}                    P01 (공정 경로)
 *   대응계획: P{NO}                    P01 (공정 경로)
 */

// ===== 타입 정의 =====
export type CpAtomicType = 
  | 'P'      // Process (공정)
  | 'D'      // Detector (검출장치)
  | 'CI'     // ControlItem (관리항목)
  | 'CM'     // ControlMethod (관리방법)
  | 'RP';    // ReactionPlan (대응계획)

// ===== 하이브리드 ID 생성 파라미터 =====
export interface CpHybridIdParams {
  cpSeq: string;       // CP 시퀀스 (예: CP001)
  type: CpAtomicType;  // 타입
  path: string;        // 경로 (예: P01)
  seq: number;         // 순번 (1-based)
}

// ===== 하이브리드 ID 생성 함수 =====
export const createCpHybridId = ({ cpSeq, type, path, seq }: CpHybridIdParams): string => {
  const seqStr = seq.toString().padStart(3, '0');
  return `${cpSeq}-${type}-${path}-${seqStr}`;
};

// ===== 경로 생성 헬퍼 함수들 =====

/**
 * 공정 경로 생성
 * @param procNo 공정번호 (1-based)
 * @returns 경로 문자열 (예: P01)
 */
export const createCpProcessPath = (procNo: number): string => {
  return `P${procNo.toString().padStart(2, '0')}`;
};

/**
 * 검출장치 경로 생성 (공정 경로 재사용)
 * @param procNo 공정번호 (1-based)
 * @returns 경로 문자열 (예: P01)
 */
export const createCpDetectorPath = (procNo: number): string => {
  return createCpProcessPath(procNo);
};

/**
 * 관리항목 경로 생성 (공정 경로 재사용)
 * @param procNo 공정번호 (1-based)
 * @returns 경로 문자열 (예: P01)
 */
export const createCpControlItemPath = (procNo: number): string => {
  return createCpProcessPath(procNo);
};

/**
 * 관리방법 경로 생성 (공정 경로 재사용)
 * @param procNo 공정번호 (1-based)
 * @returns 경로 문자열 (예: P01)
 */
export const createCpControlMethodPath = (procNo: number): string => {
  return createCpProcessPath(procNo);
};

/**
 * 대응계획 경로 생성 (공정 경로 재사용)
 * @param procNo 공정번호 (1-based)
 * @returns 경로 문자열 (예: P01)
 */
export const createCpReactionPlanPath = (procNo: number): string => {
  return createCpProcessPath(procNo);
};

// ===== ID 파싱 =====
export interface ParsedCpHybridId {
  cpSeq: string;
  type: string;
  path: string;
  seq: number;
}

/**
 * CP 하이브리드 ID 파싱
 * @param id 하이브리드 ID (예: CP001-P-P01-001)
 * @returns 파싱된 정보 또는 null
 */
export const parseCpHybridId = (id: string): ParsedCpHybridId | null => {
  // 포맷: {CP_SEQ}-{TYPE}-{PATH}-{SEQ}
  // 예: CP001-P-P01-001
  const match = id.match(/^(CP\d+)-([A-Z]+)-(.+)-(\d{3})$/);
  if (!match) return null;
  return {
    cpSeq: match[1],
    type: match[2],
    path: match[3],
    seq: parseInt(match[4], 10),
  };
};

// ===== CP ID에서 시퀀스 추출 =====

/**
 * CP ID에서 시퀀스 추출
 * @param cpId CP ID (예: CP26-P001, cp26-m001)
 * @returns CP 시퀀스 (예: CP001)
 */
export const extractCpSeq = (cpId: string): string => {
  // CP26-P001 → CP001, cp26-m001 → CP001
  const match = cpId.match(/[Cc][Pp](\d+)/);
  if (match) {
    const num = match[1];
    // 연도 2자리 + 시퀀스 3자리 형식 처리
    if (num.length >= 3) {
      // CP26-001 형식: 연도 2자리 + 시퀀스 3자리
      const seq = num.slice(-3); // 마지막 3자리
      return `CP${seq.padStart(3, '0')}`;
    } else {
      // CP26-P001 형식: 연도만 있으면 기본값
      return `CP${num.padStart(3, '0')}`;
    }
  }
  return 'CP001';
};

/**
 * CP 번호에서 시퀀스 추출 (cpNo 형식: CP26-P001)
 * @param cpNo CP 번호
 * @returns CP 시퀀스 (예: CP001)
 */
export const extractCpSeqFromNo = (cpNo: string): string => {
  // CP26-P001 → P001에서 숫자 추출 → CP001
  const match = cpNo.match(/-([PMF])(\d+)$/);
  if (match) {
    const seq = match[2];
    return `CP${seq.padStart(3, '0')}`;
  }
  
  // 직접 숫자 추출 시도
  return extractCpSeq(cpNo);
};

// ===== 경로에서 공정번호 추출 =====

/**
 * 경로에서 공정번호 추출
 * @param path 경로 (예: P01)
 * @returns 공정번호 (1-based) 또는 null
 */
export const extractProcessNoFromPath = (path: string): number | null => {
  const match = path.match(/^P(\d+)$/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
};

// ===== 레거시 호환 =====

/**
 * 레거시 ID를 하이브리드 ID로 변환 (필요시)
 * @param legacyId 레거시 ID
 * @param cpSeq CP 시퀀스
 * @param type 타입
 * @param procNo 공정번호
 * @param seq 순번
 * @returns 하이브리드 ID
 */
export const convertLegacyIdToHybrid = (
  legacyId: string,
  cpSeq: string,
  type: CpAtomicType,
  procNo: number,
  seq: number
): string => {
  const path = createCpProcessPath(procNo);
  return createCpHybridId({ cpSeq, type, path, seq });
};

