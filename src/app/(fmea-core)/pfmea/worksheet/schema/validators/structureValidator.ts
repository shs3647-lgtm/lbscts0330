/**
 * @file schema/validators/structureValidator.ts
 * @description 구조분석 검증 함수
 */

import { FMEAWorksheetDB } from '../types';
import { ValidationError, ValidationResult } from './types';

/**
 * 구조분석 (2단계) 검증
 */
export function validateStructure(db: FMEAWorksheetDB): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let missingCount = 0;
    let totalCount = 0;

    // L1 검증
    totalCount++;
    if (!db.l1Structure || !db.l1Structure.name || db.l1Structure.name.trim() === '') {
        errors.push({ level: 'error', field: 'l1Structure.name', message: '완제품 공정명이 누락되었습니다.' });
        missingCount++;
    }

    // L2 검증
    if (db.l2Structures.length === 0) {
        errors.push({ level: 'error', field: 'l2Structures', message: '최소 1개의 메인공정이 필요합니다.' });
        missingCount++;
    } else {
        db.l2Structures.forEach((l2, idx) => {
            totalCount++;
            if (!l2.name?.trim()) {
                errors.push({ level: 'error', field: `l2Structures[${idx}].name`, message: `${idx + 1}번 공정명이 누락되었습니다.`, itemId: l2.id });
                missingCount++;
            }
            if (!l2.l1Id) {
                warnings.push({ level: 'warning', field: `l2Structures[${idx}].l1Id`, message: `${idx + 1}번 공정의 상위 FK가 누락되었습니다.`, itemId: l2.id });
            }
        });
    }

    // L3 검증
    db.l3Structures.forEach((l3, idx) => {
        totalCount++;
        if (!l3.name?.trim()) {
            errors.push({ level: 'error', field: `l3Structures[${idx}].name`, message: `작업요소명이 누락되었습니다.`, itemId: l3.id });
            missingCount++;
        }
        if (!l3.l2Id) {
            warnings.push({ level: 'warning', field: `l3Structures[${idx}].l2Id`, message: `작업요소의 상위 공정 FK가 누락되었습니다.`, itemId: l3.id });
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
