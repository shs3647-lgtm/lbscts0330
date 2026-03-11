/**
 * @file schema/utils/createEmpty.ts
 * @description 빈 워크시트 DB 생성 함수
 */

import { FMEAWorksheetDB } from '../types';

export const createEmptyDB = (fmeaId: string): FMEAWorksheetDB => ({
    fmeaId,
    savedAt: new Date().toISOString(),
    l1Structure: null,
    l2Structures: [],
    l3Structures: [],
    l1Functions: [],
    l2Functions: [],
    l3Functions: [],
    failureEffects: [],
    failureModes: [],
    failureCauses: [],
    failureLinks: [],
    failureAnalyses: [],
    riskAnalyses: [],
    optimizations: [],
    confirmed: {
        structure: false,
        l1Function: false,
        l2Function: false,
        l3Function: false,
        l1Failure: false,
        l2Failure: false,
        l3Failure: false,
        failureLink: false,
        risk: false,
        optimization: false,
    },
});
