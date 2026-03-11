/**
 * @file schema/validators/types.ts
 * @description 검증 결과 타입
 */

export interface ValidationError {
    level: 'error' | 'warning';
    field: string;
    message: string;
    itemId?: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
    missingCount: number;
    totalCount: number;
}

// ─── 고장사슬 검증 타입 (v2.3.0) ───

/** 고장사슬 검증 오류 (확장 타입) */
export interface ChainValidationError extends ValidationError {
    processNo?: string;
    chainId?: string;
    fmText?: string;
    fcText?: string;
    feText?: string;
    errorType: string;  // V1~V7
}

/** 고장사슬 검증 결과 */
export interface ChainValidationResult extends ValidationResult {
    chainErrors: ChainValidationError[];
    summary: Record<string, number>;
}
