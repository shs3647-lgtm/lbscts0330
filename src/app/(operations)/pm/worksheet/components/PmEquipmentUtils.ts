/**
 * @file PmEquipmentUtils.ts
 * @description WS 설비/TOOL 관리 모달 유틸리티 함수
 * @version 1.0.0 - 2026-02-11: PmEquipmentModal.tsx에서 분리
 */

import { CYCLE_CONFIG } from './PmEquipmentConstants';

/** 다음 점검일 계산 */
export const calculateNextCheckDate = (lastDate: string, cycle: string): string => {
    const date = new Date(lastDate);
    const days = CYCLE_CONFIG[cycle as keyof typeof CYCLE_CONFIG]?.days || 30;
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
};
