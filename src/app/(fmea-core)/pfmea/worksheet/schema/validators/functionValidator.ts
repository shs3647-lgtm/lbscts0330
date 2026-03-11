/**
 * @file schema/validators/functionValidator.ts
 * @description 기능분석 검증 함수
 */

import { FMEAWorksheetDB } from '../types';
import { ValidationError, ValidationResult } from './types';

/**
 * 기능분석 (3단계) 검증
 */
export function validateFunction(db: FMEAWorksheetDB): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let missingCount = 0;
    let totalCount = 0;

    // L1Function 검증
    db.l1Functions.forEach((f, idx) => {
        totalCount++;
        if (!f.category) {
            errors.push({ level: 'error', field: `l1Functions[${idx}].category`, message: '구분이 누락되었습니다.', itemId: f.id });
            missingCount++;
        }
        if (!f.functionName || f.functionName.trim() === '') {
            errors.push({ level: 'error', field: `l1Functions[${idx}].functionName`, message: '완제품 기능명이 누락되었습니다.', itemId: f.id });
            missingCount++;
        }
        if (!f.requirement || f.requirement.trim() === '') {
            errors.push({ level: 'error', field: `l1Functions[${idx}].requirement`, message: '요구사항이 누락되었습니다.', itemId: f.id });
            missingCount++;
        }
        if (!f.l1StructId) {
            warnings.push({ level: 'warning', field: `l1Functions[${idx}].l1StructId`, message: '상위 구조분석 FK가 누락되었습니다.', itemId: f.id });
        }
    });

    // L2Function 검증
    db.l2Functions.forEach((f, idx) => {
        totalCount++;
        if (!f.functionName || f.functionName.trim() === '') {
            errors.push({ level: 'error', field: `l2Functions[${idx}].functionName`, message: '메인공정 기능명이 누락되었습니다.', itemId: f.id });
            missingCount++;
        }
        if (!f.productChar || f.productChar.trim() === '') {
            errors.push({ level: 'error', field: `l2Functions[${idx}].productChar`, message: '제품특성이 누락되었습니다.', itemId: f.id });
            missingCount++;
        }
        if (!f.l2StructId) {
            warnings.push({ level: 'warning', field: `l2Functions[${idx}].l2StructId`, message: '상위 구조분석(공정) FK가 누락되었습니다.', itemId: f.id });
        }
    });

    // L3Function 검증
    db.l3Functions.forEach((f, idx) => {
        totalCount++;
        if (!f.functionName || f.functionName.trim() === '') {
            errors.push({ level: 'error', field: `l3Functions[${idx}].functionName`, message: '작업요소 기능명이 누락되었습니다.', itemId: f.id });
            missingCount++;
        }
        if (!f.processChar || f.processChar.trim() === '') {
            errors.push({ level: 'error', field: `l3Functions[${idx}].processChar`, message: '공정특성이 누락되었습니다.', itemId: f.id });
            missingCount++;
        }
        if (!f.l3StructId) {
            warnings.push({ level: 'warning', field: `l3Functions[${idx}].l3StructId`, message: '상위 구조분석(작업요소) FK가 누락되었습니다.', itemId: f.id });
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
