/**
 * @file schema/types/worksheet.ts
 * @description FMEA 워크시트 DB 통합 타입
 */

import { L1Structure, L2Structure, L3Structure } from './structure';
import { L1Function, L2Function, L3Function } from './function';
import { FailureEffect, FailureMode, FailureCause, FailureLink, FailureAnalysis } from './failure';
import { RiskAnalysis, Optimization } from './risk';

/**
 * FMEA 워크시트 DB (원자성 기반)
 */
export interface FMEAWorksheetDB {
    fmeaId: string;
    savedAt: string;

    // 구조분석 (2단계)
    l1Structure: L1Structure | null;
    l2Structures: L2Structure[];
    l3Structures: L3Structure[];

    // 기능분석 (3단계)
    l1Functions: L1Function[];
    l2Functions: L2Function[];
    l3Functions: L3Function[];

    // 고장분석 (4단계)
    failureEffects: FailureEffect[];
    failureModes: FailureMode[];
    failureCauses: FailureCause[];

    // 고장연결
    failureLinks: FailureLink[];

    // 고장분석 통합 데이터
    failureAnalyses: FailureAnalysis[];

    // 리스크분석/최적화
    riskAnalyses: RiskAnalysis[];
    optimizations: Optimization[];

    // 확정 상태
    confirmed: {
        structure: boolean;
        l1Function: boolean;
        l2Function: boolean;
        l3Function: boolean;
        l1Failure: boolean;
        l2Failure: boolean;
        l3Failure: boolean;
        failureLink: boolean;
        risk: boolean;
        optimization: boolean;
    };
}
