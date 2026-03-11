/**
 * @file mock-data.ts
 * @description 웰컴보드 목업 데이터
 * @author AI Assistant
 * @created 2026-01-03
 */

import { ProjectStats, APSummaryItem, QuickLinkItem } from './types';

/** 프로젝트 상태 샘플 데이터 */
export const projectStats: ProjectStats = {
  inProgress: 8,
  completed: 14,
  delayed: 3,
};

/** 바로가기 메뉴 데이터 */
export const quickLinks: QuickLinkItem[] = [
  { id: 'project', title: 'Project', badge: 'GO', desc: '프로젝트 목록', href: '/apqp/list' },
  { id: 'dfmea', title: 'DFMEA', badge: '설계', desc: '설계FMEA', href: '/dfmea/worksheet' },
  { id: 'pfmea', title: 'PFMEA', badge: '공정', desc: '공정FMEA', href: '/pfmea/worksheet' },
  { id: 'cp', title: 'Control Plan', badge: null, desc: '관리계획서', href: '/control-plan/worksheet' },
  { id: 'pfd', title: 'PFD', badge: null, desc: '공정 흐름도', href: '/pfd/worksheet' },
  { id: 'ws', title: 'WS', badge: null, desc: '작업표준', href: '/ws' },
  { id: 'pm', title: 'PM', badge: null, desc: '설비/예방보전', href: '/pm' },
];

/** AP Improvement 요약 데이터 */
export const apSummaryData: APSummaryItem[] = [
  { 
    id: 'AP-001', ap5: 'M', ap6: 'M', severity: 7, occurrence: 4, detection: 6, prn5: 168, prn6: null,
    specialChar: 'SC', preventiveControl: '이물질표 표시작업시 주의',
    failureMode: '10이물질 혼입', failureCause: '작업자 이물질 유입 실수',
    detectionControl: '육안 검사', preventionAction: '', detectionAction: '',
    responsible: '김철수', status: '진행중', dueDate: '2025/01/05'
  },
  { 
    id: 'AP-002', ap5: 'M', ap6: 'M', severity: 7, occurrence: 3, detection: 6, prn5: 126, prn6: null,
    specialChar: 'SC', preventiveControl: '접합시 온도 및 속도조건 장치 설치',
    failureMode: '10연결부 제품 손상', failureCause: '온도 설정 오류로 연결부 손상',
    detectionControl: '외관검사', preventionAction: '', detectionAction: '',
    responsible: '이영희', status: '완료', dueDate: '2024/12/28'
  },
  { 
    id: 'AP-003', ap5: 'L', ap6: 'L', severity: 2, occurrence: 5, detection: 6, prn5: 60, prn6: null,
    specialChar: 'SC', preventiveControl: '',
    failureMode: '11상태온도 손상', failureCause: '파라미터 입력 실수',
    detectionControl: '', preventionAction: '', detectionAction: '',
    responsible: '박민수', status: '대기', dueDate: '2025/01/10'
  },
  { 
    id: 'AP-004', ap5: 'L', ap6: 'L', severity: 2, occurrence: 3, detection: 6, prn5: 36, prn6: null,
    specialChar: 'SC', preventiveControl: '',
    failureMode: '11상태온도 손상', failureCause: '온도 센서 접속 불량',
    detectionControl: '', preventionAction: '', detectionAction: '',
    responsible: '', status: '대기', dueDate: ''
  },
  { 
    id: 'AP-005', ap5: 'L', ap6: 'L', severity: 6, occurrence: 5, detection: 6, prn5: 180, prn6: null,
    specialChar: '', preventiveControl: '',
    failureMode: '20 외관 불량 미검사', failureCause: '검사 기준 누락',
    detectionControl: '', preventionAction: '', detectionAction: '',
    responsible: '', status: '대기', dueDate: ''
  },
];





