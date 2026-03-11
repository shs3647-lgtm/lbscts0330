/**
 * @file manual-dfmea.ts
 * @description DFMEA 모듈 도움말
 *
 * 카테고리: DFMEA
 * 관련 화면: /dfmea/*
 */

import type { ManualItem } from './types';

export const DFMEA_ITEMS_KO: ManualItem[] = [
  {
    category: 'DFMEA',
    title: 'DFMEA 등록 화면',
    content:
      'DFMEA(Design FMEA) 프로젝트를 등록하는 화면입니다.\n\n' +
      '■ PFMEA 등록과 유사한 구조\n' +
      '• FMEA ID: dfm{YY}-{type}{serial} 형식\n' +
      '• 유형: Master(M) / Family(F) / Part(P)\n' +
      '• 상위 FMEA 연동 설정\n' +
      '• CFT 멤버 등록\n\n' +
      '■ DFMEA 특이사항\n' +
      '• 초점요소번호(focusElementNo) 기반 (공정번호 대신)\n' +
      '• 구분값: 법규(Regulation) / 기본(Primary) / user(Secondary) / 관능(Sensory)\n' +
      '• 타입: S(System) / I(Interface) / F(Function) / C(Component)\n\n' +
      '[사용자 정보 제공 후 상세 내용 추가 예정]',
    keywords: ['DFMEA', '등록', 'register', '설계', 'design', '초점요소'],
    paths: ['/dfmea/register'],
  },
  {
    category: 'DFMEA',
    title: 'DFMEA 리스트 화면',
    content:
      'DFMEA 프로젝트 목록을 조회/관리하는 화면입니다.\n\n' +
      '• PFMEA 리스트와 동일한 구조\n' +
      '• DFMEA 전용 컬럼 (초점요소, 설계유형 등)\n' +
      '• 검색, 정렬, 필터 기능\n' +
      '• 행 클릭 → DFMEA 워크시트로 이동',
    keywords: ['DFMEA', '리스트', 'list', '목록', '설계'],
    paths: ['/dfmea/list'],
  },
  {
    category: 'DFMEA',
    title: 'DFMEA 워크시트 화면',
    content:
      'DFMEA(Design FMEA)는 설계 단계에서 잠재적 고장 모드를 분석하는 워크시트입니다.\n\n' +
      '■ PFMEA와의 주요 차이점\n' +
      '• 분석 대상: PFMEA=제조 공정 / DFMEA=제품 설계\n' +
      '• 구조분석: PFMEA=공정번호/4M/작업요소 / DFMEA=시스템/서브시스템/컴포넌트\n' +
      '• 기능분석: PFMEA=공정기능 / DFMEA=설계기능 (제품이 수행하는 기능)\n' +
      '• 고장원인: PFMEA=공정 파라미터 / DFMEA=설계 결함 (재질/치수/공차)\n' +
      '• 예방관리: PFMEA=SPC/포카요케 / DFMEA=시뮬레이션/DV 테스트\n' +
      '• 특별특성: PFMEA=CC/SC/HI 확정 / DFMEA=YC/YS 식별 (잠재적)\n' +
      '• 결과 연계: PFMEA=CP 연동 / DFMEA=PFMEA로 전이, DVP&R 연동\n\n' +
      '■ DFMEA 구조분석 계층\n' +
      '• Level 1: 시스템 → Level 2: 서브시스템 → Level 3: 컴포넌트\n\n' +
      '■ DFMEA → PFMEA 전이\n' +
      '• YC(S=9~10) → PFMEA에서 CC 또는 OS로 확정\n' +
      '• YS(S=5~8) → PFMEA에서 SC 또는 HI로 확정\n\n' +
      '■ D-FMEA SOD 기준\n' +
      '• 심각도: 단일 열 (최종사용자 관점)\n' +
      '• 발생도: 등급별 하위 판단기준 (설계경험/검증/표준/예방관리)\n' +
      '• 검출도: 시험유형 3가지 (합격-불합격/불합격/성능저하)',
    keywords: ['DFMEA', '워크시트', 'worksheet', '설계', '분석', '초점요소'],
    paths: ['/dfmea/worksheet'],
  },
  {
    category: 'DFMEA',
    title: 'DFMEA 개정관리 / Import',
    content:
      '■ DFMEA 개정관리\n' +
      '• PFMEA 개정관리와 동일한 3단계 결재 프로세스\n' +
      '• 개정 이력 테이블, 회의록, 변경 히스토리\n\n' +
      '■ DFMEA Import (기초정보)\n' +
      '• DFMEA 전용 기초정보 엑셀 Import\n' +
      '• 초점요소번호 기반 매핑\n' +
      '• 구분값: 법규/기본/user/관능\n\n' +
      '[사용자 정보 제공 후 상세 내용 추가 예정]',
    keywords: ['DFMEA', '개정', '임포트', 'import', '기초정보', '결재'],
    paths: ['/dfmea/revision', '/dfmea/import'],
  },
  {
    category: 'DFMEA',
    title: 'DFMEA 습득교훈 / AP개선',
    content:
      '■ DFMEA 습득교훈(LLD)\n' +
      '• 설계 관점의 교훈 데이터 관리\n' +
      '• DFMEA 워크시트와 연동\n' +
      '• PFMEA LLD와 동일한 구조\n\n' +
      '■ DFMEA AP 개선관리\n' +
      '• 설계 개선 관점의 AP 관리\n' +
      '• D-FMEA SOD 기준 적용\n' +
      '• 개선 담당자/기한/상태 추적\n\n' +
      '[사용자 정보 제공 후 상세 내용 추가 예정]',
    keywords: ['DFMEA', 'LLD', '습득교훈', 'AP', '개선', '설계'],
    paths: ['/dfmea/lessons-learned', '/dfmea/ap-improvement'],
  },
];

export const DFMEA_ITEMS_EN: ManualItem[] = [];
