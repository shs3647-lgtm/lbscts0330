/**
 * @file pfdIdUtils.ts
 * @description PFD 하이브리드 ID 생성/파싱 유틸리티
 *
 * 벤치마킹: CP 하이브리드 ID 시스템
 *
 * PFD 하이브리드 ID 형식: {PFD_SEQ}-{TYPE}-{PATH}-{SEQ}
 *
 * 예시:
 *   공정: PFD001-P-001                  PFD001의 1번째 공정
 *   특성: PFD001-C-P001-001             PFD001의 P001 공정의 1번째 특성
 *   흐름: PFD001-F-P001-001             PFD001의 P001 공정의 1번째 흐름
 *
 * 경로 형식:
 *   공정: P{NO}                        P01, P02, ...
 *   특성: P{NO}                        P01 (공정 경로)
 *   흐름: P{NO}                        P01 (공정 경로)
 */

// ===== 타입 정의 =====
export type PfdAtomicType =
  | 'P'      // Process (공정)
  | 'C'      // Char (특성)
  | 'F';     // Flow (흐름)

// ===== 하이브리드 ID 생성 파라미터 =====
export interface PfdHybridIdParams {
  pfdSeq: string;       // PFD 시퀀스 (예: PFD001)
  type: PfdAtomicType;  // 타입
  path: string;         // 경로 (예: P01)
  seq: number;          // 순번 (1-based)
}

// ===== 하이브리드 ID 생성 함수 =====
export const createPfdHybridId = ({ pfdSeq, type, path, seq }: PfdHybridIdParams): string => {
  const seqStr = seq.toString().padStart(3, '0');
  return `${pfdSeq}-${type}-${path}-${seqStr}`;
};

// ===== 경로 생성 헬퍼 함수들 =====

/**
 * 공정 경로 생성
 * @param procNo 공정번호 (1-based)
 * @returns 경로 문자열 (예: P01)
 */
export const createPfdProcessPath = (procNo: number): string => {
  return `P${procNo.toString().padStart(2, '0')}`;
};

/**
 * 특성 경로 생성 (공정 경로 재사용)
 * @param procNo 공정번호 (1-based)
 * @returns 경로 문자열 (예: P01)
 */
export const createPfdCharPath = (procNo: number): string => {
  return createPfdProcessPath(procNo);
};

/**
 * 흐름 경로 생성 (공정 경로 재사용)
 * @param procNo 공정번호 (1-based)
 * @returns 경로 문자열 (예: P01)
 */
export const createPfdFlowPath = (procNo: number): string => {
  return createPfdProcessPath(procNo);
};

// ===== ID 파싱 =====
export interface ParsedPfdHybridId {
  pfdSeq: string;
  type: string;
  path: string;
  seq: number;
}

/**
 * 하이브리드 ID 파싱
 * @param hybridId 하이브리드 ID (예: PFD001-P-P01-001)
 * @returns 파싱된 정보
 */
export const parsePfdHybridId = (hybridId: string): ParsedPfdHybridId => {
  const parts = hybridId.split('-');
  if (parts.length !== 4) {
    throw new Error(`Invalid PFD hybrid ID format: ${hybridId}`);
  }

  const [pfdSeq, type, path, seqStr] = parts;
  const seq = parseInt(seqStr, 10);

  return { pfdSeq, type, path, seq };
};

// ===== 유틸리티 함수들 =====

/**
 * 공정 ID에서 공정번호 추출
 * @param processId 공정 ID (예: PFD001-P-P01-001)
 * @returns 공정번호 (1-based)
 */
export const getProcessNoFromId = (processId: string): number => {
  const parsed = parsePfdHybridId(processId);
  const procNoStr = parsed.path.substring(1); // P01 -> 01
  return parseInt(procNoStr, 10);
};

/**
 * 타입별 ID 생성 헬퍼
 */
export const createPfdProcessId = (pfdSeq: string, procNo: number, seq: number = 1): string => {
  const path = createPfdProcessPath(procNo);
  return createPfdHybridId({ pfdSeq, type: 'P', path, seq });
};

export const createPfdCharId = (pfdSeq: string, procNo: number, seq: number = 1): string => {
  const path = createPfdCharPath(procNo);
  return createPfdHybridId({ pfdSeq, type: 'C', path, seq });
};

export const createPfdFlowId = (pfdSeq: string, procNo: number, seq: number = 1): string => {
  const path = createPfdFlowPath(procNo);
  return createPfdHybridId({ pfdSeq, type: 'F', path, seq });
};