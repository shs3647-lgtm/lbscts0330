/**
 * @file mock-data.ts
 * @description AP 개선관리 목업 데이터
 * @author AI Assistant
 * @created 2026-01-03
 */

import { APItem } from './types';

/** 샘플 AP 데이터 */
export const mockAPData: APItem[] = [
  {
    id: '1',
    ap5: 'M',
    ap6: 'M',
    specialChar: 'SC',
    preventiveControl: '미비지점 표시작업 실시',
    severity: 7,
    failureMode: '10 미비지점 누락',
    failureCause: '작업자 미비지점 식별 누락',
    occurrence: 4,
    detectionControl: '외관 검사',
    detection: 6,
    preventionAction: '작업표준서 보완',
    detectionAction: '검사 치구 도입',
    responsible: '김철수',
    status: '진행중',
    dueDate: '2025-01-15',
  },
  {
    id: '2',
    ap5: 'M',
    ap6: 'M',
    specialChar: 'SC',
    preventiveControl: '금형온도 체크 및 센서장치 설치',
    severity: 7,
    failureMode: '10 제품,제품 파손',
    failureCause: '금형온도 과열로 제품 파손',
    occurrence: 3,
    detectionControl: '초품검사',
    detection: 6,
    preventionAction: '온도센서 교체',
    detectionAction: '',
    responsible: '이영희',
    status: '완료',
    dueDate: '2025-01-10',
  },
  {
    id: '3',
    ap5: 'L',
    ap6: 'L',
    specialChar: 'SC',
    preventiveControl: '',
    severity: 2,
    failureMode: '11 상태온도 불량',
    failureCause: '파라미터 입력 실수',
    occurrence: 5,
    detectionControl: '',
    detection: 6,
    preventionAction: '파라미터 검증 절차 수립',
    detectionAction: '',
    responsible: '박민수',
    status: '대기',
    dueDate: '2025-01-20',
  },
  {
    id: '4',
    ap5: 'H',
    ap6: 'H',
    specialChar: 'CC',
    preventiveControl: '용접 전류/시간 모니터링',
    severity: 9,
    failureMode: '용접 강도 부족',
    failureCause: '용접 파라미터 이탈',
    occurrence: 4,
    detectionControl: '파괴검사',
    detection: 5,
    preventionAction: '실시간 모니터링 시스템',
    detectionAction: '비파괴검사 도입',
    responsible: '최지훈',
    status: '진행중',
    dueDate: '2025-01-25',
  },
  {
    id: '5',
    ap5: 'L',
    ap6: 'L',
    specialChar: '',
    preventiveControl: '',
    severity: 6,
    failureMode: '외관 스크래치',
    failureCause: '취급 부주의',
    occurrence: 5,
    detectionControl: '외관검사',
    detection: 6,
    preventionAction: '보호 포장재 적용',
    detectionAction: '',
    responsible: '정수연',
    status: '대기',
    dueDate: '2025-02-01',
  },
];

















