/**
 * @file atom-map.ts
 * @description PATCH /api/fmea/atom-map 요청/응답 타입
 *
 * 셀 단위 UPDATE — DELETE ALL→CREATE ALL 패턴 제거
 * @created 2026-03-22
 */

/** 단일 셀 변경 */
export interface AtomCellChange {
  /** Prisma 모델명: failureModes, riskAnalyses 등 */
  table: string;
  /** 레코드 ID (위치기반 UUID 또는 기존 UUID) */
  id: string;
  /** 필드명: mode, severity 등 */
  field: string;
  /** 새 값 */
  value: string | number;
}

/** PATCH 요청 */
export interface AtomMapPatchRequest {
  fmeaId: string;
  changes: AtomCellChange[];
}

/** PATCH 응답 */
export interface AtomMapPatchResponse {
  success: boolean;
  saved: number;
  failed: number;
  errors: string[];
  apRecalculated: number;
}

/** 편집 가능 필드 정의 */
export interface EditableField {
  table: string;
  field: string;
  type: 'string' | 'int';
  /** Prisma 모델의 실제 delegate 이름 */
  prismaModel: string;
}
