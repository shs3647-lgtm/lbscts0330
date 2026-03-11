/**
 * @file schema/utils/linkHelpers.ts
 * @description FK 연결 헬퍼 함수
 */

import { FMEAWorksheetDB } from '../types';

/**
 * 기능분석 입력 시 상위 구조분석 FK 연결 저장
 */
export function linkFunctionToStructure(
    db: FMEAWorksheetDB,
    level: 1 | 2 | 3,
    functionId: string,
    structureId: string
): FMEAWorksheetDB {
    const result = { ...db };

    if (level === 1) {
        const func = result.l1Functions.find(f => f.id === functionId);
        if (func) func.l1StructId = structureId;
    } else if (level === 2) {
        const func = result.l2Functions.find(f => f.id === functionId);
        if (func) func.l2StructId = structureId;
    } else if (level === 3) {
        const func = result.l3Functions.find(f => f.id === functionId);
        if (func) func.l3StructId = structureId;
    }

    return result;
}

/**
 * 고장분석 입력 시 상위 기능분석 FK 연결 저장
 */
export function linkFailureToFunction(
    db: FMEAWorksheetDB,
    type: 'FE' | 'FM' | 'FC',
    failureId: string,
    functionId: string
): FMEAWorksheetDB {
    const result = { ...db };

    if (type === 'FE') {
        const fe = result.failureEffects.find(f => f.id === failureId);
        if (fe) fe.l1FuncId = functionId;
    } else if (type === 'FM') {
        const fm = result.failureModes.find(f => f.id === failureId);
        if (fm) fm.l2FuncId = functionId;
    } else if (type === 'FC') {
        const fc = result.failureCauses.find(f => f.id === failureId);
        if (fc) fc.l3FuncId = functionId;
    }

    return result;
}
