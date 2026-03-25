/**
 * @file schema/validators/failureValidator.ts
 * @description 고장분석 검증 함수
 */

import { FMEAWorksheetDB } from '../types';
import { ValidationError, ValidationResult } from './types';

/**
 * 고장분석 (4단계) 검증
 */
export function validateFailure(db: FMEAWorksheetDB): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let missingCount = 0;
    let totalCount = 0;

    // FE 검증
    db.failureEffects.forEach((fe, idx) => {
        totalCount++;
        if (!fe.effect || fe.effect.trim() === '') {
            errors.push({ level: 'error', field: `failureEffects[${idx}].effect`, message: '고장영향이 누락되었습니다.', itemId: fe.id });
            missingCount++;
        }
        if (!fe.severity || fe.severity < 1 || fe.severity > 10) {
            errors.push({ level: 'error', field: `failureEffects[${idx}].severity`, message: '심각도(1-10)가 누락되었습니다.', itemId: fe.id });
            missingCount++;
        }
        if (!fe.l1FuncId) {
            warnings.push({ level: 'warning', field: `failureEffects[${idx}].l1FuncId`, message: '상위 기능분석(요구사항) FK가 누락되었습니다.', itemId: fe.id });
        }
    });

    // FM 검증
    db.failureModes.forEach((fm, idx) => {
        totalCount++;
        if (!fm.mode || fm.mode.trim() === '') {
            errors.push({ level: 'error', field: `failureModes[${idx}].mode`, message: '고장형태가 누락되었습니다.', itemId: fm.id });
            missingCount++;
        }
        if (!fm.l2FuncId) {
            warnings.push({ level: 'warning', field: `failureModes[${idx}].l2FuncId`, message: '상위 기능분석(설계특성) FK가 누락되었습니다.', itemId: fm.id });
        }
        if (!fm.l2StructId) {
            warnings.push({ level: 'warning', field: `failureModes[${idx}].l2StructId`, message: '상위 구조분석(공정) FK가 누락되었습니다.', itemId: fm.id });
        }
    });

    // FC 검증
    db.failureCauses.forEach((fc, idx) => {
        totalCount++;
        if (!fc.cause || fc.cause.trim() === '') {
            errors.push({ level: 'error', field: `failureCauses[${idx}].cause`, message: '고장원인이 누락되었습니다.', itemId: fc.id });
            missingCount++;
        }
        if (!fc.l3FuncId) {
            warnings.push({ level: 'warning', field: `failureCauses[${idx}].l3FuncId`, message: '상위 기능분석(설계파라미터) FK가 누락되었습니다.', itemId: fc.id });
        }
        if (!fc.l3StructId) {
            warnings.push({ level: 'warning', field: `failureCauses[${idx}].l3StructId`, message: '상위 구조분석(부품(컴포넌트)) FK가 누락되었습니다.', itemId: fc.id });
        }
    });


    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        missingCount,
        totalCount,
    };
}

/**
 * 고장연결 검증
 */
export function validateFailureLink(db: FMEAWorksheetDB): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let missingCount = 0;
    const totalCount = db.failureModes.length;

    const fmLinked = new Map<string, { feCount: number; fcCount: number }>();

    db.failureLinks.forEach(link => {
        if (!fmLinked.has(link.fmId)) {
            fmLinked.set(link.fmId, { feCount: 0, fcCount: 0 });
        }
        const stat = fmLinked.get(link.fmId)!;
        if (link.feId && link.feId !== '') stat.feCount++;
        if (link.fcId && link.fcId !== '') stat.fcCount++;
    });

    db.failureModes.forEach((fm, idx) => {
        const stat = fmLinked.get(fm.id);
        if (!stat) {
            errors.push({ level: 'error', field: `failureModes[${idx}]`, message: `고장형태 "${fm.mode}"가 연결되지 않았습니다.`, itemId: fm.id });
            missingCount++;
        } else {
            if (stat.feCount === 0) {
                warnings.push({ level: 'warning', field: `failureModes[${idx}].fe`, message: `고장형태 "${fm.mode}"에 고장영향(FE)이 연결되지 않았습니다.`, itemId: fm.id });
            }
            if (stat.fcCount === 0) {
                warnings.push({ level: 'warning', field: `failureModes[${idx}].fc`, message: `고장형태 "${fm.mode}"에 고장원인(FC)이 연결되지 않았습니다.`, itemId: fm.id });
            }
        }
    });


    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        missingCount,
        totalCount,
    };
}
