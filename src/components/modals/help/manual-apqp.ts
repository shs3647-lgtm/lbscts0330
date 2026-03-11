/**
 * @file manual-apqp.ts
 * @description APQP 상세 도움말
 *
 * 카테고리: APQP
 * 관련 화면: /apqp/*
 */

import type { ManualItem } from './types';

export const APQP_DETAIL_ITEMS_KO: ManualItem[] = [
  {
    category: 'APQP',
    title: 'APQP 등록 화면',
    content:
      'APQP 프로젝트를 등록하는 화면입니다.\n\n' +
      '■ 등록 항목\n' +
      '• APQP ID (자동 생성)\n' +
      '• 프로젝트명, 고객사, 모델연도\n' +
      '• 5단계 게이트 일정 설정\n' +
      '• 하위 모듈 연동 (FMEA/CP/PFD)\n\n' +
      '■ 하위 모듈 연결\n' +
      '• PFMEA/DFMEA 프로젝트 연동\n' +
      '• Control Plan 연동\n' +
      '• PFD 연동\n\n' +
      '[사용자 정보 제공 후 상세 내용 추가 예정]',
    keywords: ['APQP', '등록', 'register', '프로젝트', '게이트'],
    paths: ['/apqp/register'],
  },
  {
    category: 'APQP',
    title: 'APQP 리스트 화면',
    content:
      'APQP 프로젝트 목록을 조회/관리하는 화면입니다.\n\n' +
      '• APQP ID, 프로젝트명, 고객사\n' +
      '• 진행 단계 (5단계 게이트)\n' +
      '• 하위 모듈 연동 상태\n' +
      '• 검색/정렬/필터 기능\n\n' +
      '■ 삭제 규칙\n' +
      '• APQP는 최상위 부모 모듈\n' +
      '• APQP 삭제 시 하위 연동 해제\n' +
      '• 하위 모듈(FMEA/CP/PFD) 리스트에서는 APQP 삭제 불가',
    keywords: ['APQP', '리스트', 'list', '목록', '삭제'],
    paths: ['/apqp/list'],
  },
  {
    category: 'APQP',
    title: 'APQP 간트차트',
    content:
      'APQP 프로젝트 일정을 간트차트로 시각화하는 화면입니다.\n\n' +
      '■ 기능\n' +
      '• 5단계 게이트별 일정 바 차트\n' +
      '• 마일스톤 표시\n' +
      '• 진행률 시각화 (% 완료)\n' +
      '• 일정 드래그&드롭 조정\n\n' +
      '■ 5단계 게이트\n' +
      '1. 계획 및 정의\n' +
      '2. 제품 설계 및 개발\n' +
      '3. 공정 설계 및 개발\n' +
      '4. 제품 및 공정 유효성 확인\n' +
      '5. 양산 및 피드백\n\n' +
      '[사용자 정보 제공 후 상세 내용 추가 예정]',
    keywords: ['APQP', '간트', 'gantt', '차트', '일정', '마일스톤', '게이트'],
    paths: ['/gantt'],
  },
  {
    category: 'APQP',
    title: 'APQP 워크시트 / 개정관리',
    content:
      '■ APQP 워크시트\n' +
      '• 5단계별 산출물 관리\n' +
      '• 체크리스트 형태의 진행 추적\n' +
      '• 문서 링크/첨부 기능\n' +
      '• 하위 모듈 진행 상태 통합 표시\n\n' +
      '■ APQP 개정관리\n' +
      '• 3단계 결재 프로세스\n' +
      '• 개정 이력 관리\n' +
      '• 산출물 버전 관리\n\n' +
      '[사용자 정보 제공 후 상세 내용 추가 예정]',
    keywords: ['APQP', '워크시트', '개정', '산출물', '체크리스트'],
    paths: ['/apqp/worksheet', '/apqp/revision'],
  },
];

export const APQP_DETAIL_ITEMS_EN: ManualItem[] = [];
