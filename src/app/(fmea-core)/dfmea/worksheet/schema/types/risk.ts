/**
 * @file schema/types/risk.ts
 * @description 리스크분석/최적화 (5-6단계) 타입
 */

import { AtomicRecord } from './base';

// ============ 리스크분석/최적화 (5-6단계) ============

/**
 * 리스크 분석 결과 (AP 값)
 */
export interface RiskAnalysis extends AtomicRecord {
    fmeaId: string;
    linkId: string;

    severity: number;       // 심각도 (1-10)
    occurrence: number;     // 발생도 (1-10)
    detection: number;      // 검출도 (1-10)

    ap: 'H' | 'M' | 'L';    // Action Priority

    preventionControl?: string;
    detectionControl?: string;
    lldReference?: string;
}

/**
 * 최적화 결과 (6단계)
 */
export interface Optimization extends AtomicRecord {
    fmeaId: string;
    riskId: string;

    recommendedAction: string;
    responsible: string;
    targetDate: string;

    newSeverity?: number;
    newOccurrence?: number;
    newDetection?: number;
    newAP?: 'H' | 'M' | 'L';

    status: 'planned' | 'in_progress' | 'completed';
    completedDate?: string;
    remarks?: string;
    detectionAction?: string;
    lldOptReference?: string;
}
