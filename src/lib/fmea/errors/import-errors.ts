/**
 * Import / 검증 API용 에러 코드 (클라이언트·로그 식별)
 * @see docs/Import 파이프라인 방어선.md 작업 7
 * @see docs/Import 파이프라인에 dedupKey · UUID · FK · parentId 생성 코드 강제 삽입.md
 */
export const ImportErrorCode = {
  INVALID_FMEA_ID: 'IMPORT_INVALID_FMEA_ID',
  INVALID_JOB_ID: 'IMPORT_INVALID_JOB_ID',
  VALIDATION_FAILED: 'IMPORT_VALIDATION_FAILED',
  DB_UNAVAILABLE: 'IMPORT_DB_UNAVAILABLE',
  SAVE_INTEGRITY: 'IMPORT_SAVE_INTEGRITY',
} as const;

export type ImportErrorCodeType = (typeof ImportErrorCode)[keyof typeof ImportErrorCode];

/** 위치기반 Import 저장 후 dedupKey·페이로드 정합성 실패 시 — 트랜잭션 롤백용 */
export class ImportSaveIntegrityError extends Error {
  readonly code = ImportErrorCode.SAVE_INTEGRITY;

  constructor(
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ImportSaveIntegrityError';
  }
}
