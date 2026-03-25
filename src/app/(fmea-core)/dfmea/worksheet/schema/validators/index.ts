/**
 * @file schema/validators/index.ts
 * @description 검증 함수 통합 re-export
 */

export * from './types';
export * from './structureValidator';
export * from './functionValidator';
export * from './failureValidator';
export * from './failureChainValidator';

import { FMEAWorksheetDB } from '../types';
import { ValidationResult, ChainValidationResult } from './types';
import { validateStructure } from './structureValidator';
import { validateFunction } from './functionValidator';
import { validateFailure, validateFailureLink } from './failureValidator';
import { validateFailureChain } from './failureChainValidator';

/**
 * 전체 FMEA 검증 (모든 단계)
 */
export function validateAll(db: FMEAWorksheetDB): {
    structure: ValidationResult;
    function: ValidationResult;
    failure: ValidationResult;
    failureLink: ValidationResult;
    failureChain: ChainValidationResult;
    overall: { isValid: boolean; totalErrors: number; totalWarnings: number; totalMissing: number };
} {
    const structure = validateStructure(db);
    const func = validateFunction(db);
    const failure = validateFailure(db);
    const failureLinkResult = validateFailureLink(db);
    const failureChainResult = validateFailureChain(db);

    const totalErrors = structure.errors.length + func.errors.length + failure.errors.length + failureLinkResult.errors.length + failureChainResult.errors.length;
    const totalWarnings = structure.warnings.length + func.warnings.length + failure.warnings.length + failureLinkResult.warnings.length + failureChainResult.warnings.length;
    const totalMissing = structure.missingCount + func.missingCount + failure.missingCount + failureLinkResult.missingCount + failureChainResult.missingCount;


    return {
        structure,
        function: func,
        failure,
        failureLink: failureLinkResult,
        failureChain: failureChainResult,
        overall: {
            isValid: totalErrors === 0,
            totalErrors,
            totalWarnings,
            totalMissing,
        },
    };
}
