/**
 * @file PmEquipmentConstants.ts
 * @description WS 설비/TOOL 관리 모달 상수 정의
 * @version 1.0.0 - 2026-02-11: PmEquipmentModal.tsx에서 분리
 */

/** 상태 라벨 및 색상 */
export const STATUS_CONFIG = {
    normal: { label: '정상', color: 'bg-green-100 text-green-700', icon: '✅' },
    checking: { label: '점검중', color: 'bg-yellow-100 text-yellow-700', icon: '🔧' },
    broken: { label: '고장', color: 'bg-red-100 text-red-700', icon: '❌' },
    disposed: { label: '폐기', color: 'bg-gray-100 text-gray-500', icon: '🚫' },
};

/** 점검 주기 라벨 */
export const CYCLE_CONFIG = {
    daily: { label: '매일', days: 1 },
    weekly: { label: '매주', days: 7 },
    monthly: { label: '매월', days: 30 },
    quarterly: { label: '분기', days: 90 },
    yearly: { label: '매년', days: 365 },
};
