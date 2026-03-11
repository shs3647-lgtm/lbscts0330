/**
 * @file manual-cp-pfd.ts
 * @description Control Plan / PFD 상세 + CP·PFD 연동 도움말
 *
 * 카테고리: Control Plan, PFD
 * 관련 화면: /control-plan/*, /pfd/*, /pfmea/worksheet (연동 기능)
 */

import type { ManualItem } from './types';

export const CP_PFD_ITEMS_KO: ManualItem[] = [
  // ═══════════════════════════════════════════
  // Control Plan
  // ═══════════════════════════════════════════
  {
    category: 'Control Plan',
    title: 'CP 등록 화면',
    content:
      'Control Plan(관리계획서) 프로젝트를 등록하는 화면입니다.\n\n' +
      '■ 등록 항목\n' +
      '• CP ID (자동 생성)\n' +
      '• PFMEA 연동 선택 (필수)\n' +
      '• 프로젝트 정보, 고객사, 공장\n' +
      '• 담당자 지정\n\n' +
      '■ PFMEA 연동\n' +
      '• 등록 시 연동할 PFMEA 프로젝트 선택\n' +
      '• PFMEA → CP 구조 자동 동기화\n\n' +
      '[사용자 정보 제공 후 상세 내용 추가 예정]',
    keywords: ['CP', '등록', 'register', '관리계획서', '연동'],
    paths: ['/control-plan/register'],
  },
  {
    category: 'Control Plan',
    title: 'CP 리스트 화면',
    content:
      'Control Plan 프로젝트 목록을 조회/관리하는 화면입니다.\n\n' +
      '• CP ID, 프로젝트명, 연동 PFMEA\n' +
      '• 진행 상태, 담당자, 날짜\n' +
      '• 검색/정렬/필터 기능\n' +
      '• 행 클릭 → CP 워크시트로 이동',
    keywords: ['CP', '리스트', 'list', '관리계획서', '목록'],
    paths: ['/control-plan/list'],
  },
  {
    category: 'Control Plan',
    title: 'CP 워크시트 상세',
    content:
      '양산 단계에서 제품 품질을 보장하기 위한 관리 항목, 관리 방법, 검사 기준을 정의하는 문서입니다.\n\n' +
      '■ 행 유형\n' +
      '• 제품특성행 (rowType: product): J열(제품특성)에 값 기재, K열 비움\n' +
      '• 공정특성행 (rowType: process): K열(공정특성)에 값 기재, J열 비움\n' +
      '• 행 추가 시 상위 병합(공정번호/공정명)이 자동 확장\n\n' +
      '■ 병합 구조\n' +
      '• A~D열 (공정정보): 동일 공정의 전체 행 병합\n' +
      '• E열 (부품명): 같은 부품끼리 병합\n' +
      '• F열 (설비명): 같은 설비끼리 병합\n' +
      '• G~T열: 행 단위 개별 입력\n\n' +
      '■ 주요 컬럼\n' +
      '• A~D: 공정번호/공정명/레벨/공정설명\n' +
      '• E~F: 부품명/설비명\n' +
      '• J: 제품특성 (product행만) / K: 공정특성 (process행만)\n' +
      '• L: 특별특성 / M: 스펙/공차\n' +
      '• N: 평가방법 (FMEA 검출관리와 동기화)\n' +
      '• O~S: 관리방법 (CP 고유)\n' +
      '• T: 대응계획\n\n' +
      '■ FMEA 연동\n' +
      '• PFMEA 예방관리 → CP 관리방법 / PFMEA 검출관리 → CP 평가방법(N열)',
    keywords: ['CP', '워크시트', 'worksheet', '관리계획서', '관리항목', '검출기'],
    paths: ['/control-plan/worksheet'],
  },
  {
    category: 'Control Plan',
    title: 'CP 연동 (워크시트 메뉴바)',
    content:
      'PFMEA 워크시트와 관리계획서(CP)를 양방향으로 연동하는 기능입니다.\n\n' +
      '■ 3가지 동기화 옵션\n\n' +
      '① CP 구조연동 (FMEA→CP)\n' +
      '• FMEA의 공정번호/공정명/제품특성/공정특성/특별특성을 CP에 일괄 생성\n' +
      '• 실행 단계: 원자성 데이터 생성 → 구조 연동 → 부품명+제품특성 → 설비+공정특성 → 특별특성+검출관리\n' +
      '• 핵심 규칙 — 분리배치 방식: 제품특성행은 J열만, 공정특성행은 K열만 채움\n' +
      '• 행수 = 제품특성 수 + 공정특성 수 (곱하기 아님)\n\n' +
      '② CP 데이터동기화 (FMEA↔CP 양방향)\n' +
      '• 구조연동 이후 변경된 데이터만 업데이트\n' +
      '• FMEA에서 예방관리/검출관리 수정 → CP에 반영\n' +
      '• CP에서 평가방법/대응계획 수정 → FMEA에 역반영\n\n' +
      '③ CP 이동\n' +
      '• 연동된 CP 워크시트 화면으로 바로 이동\n\n' +
      '■ CP 병합 규칙\n' +
      '• A~D열: 공정 전체 병합 / E열: 부품 단위 / F열: 설비 단위',
    keywords: ['CP', '연동', '동기화', 'sync', '관리계획서', '메뉴바'],
    paths: ['/pfmea/worksheet'],
  },
  {
    category: 'Control Plan',
    title: 'CP 개정관리',
    content:
      'Control Plan의 개정 이력과 결재를 관리하는 화면입니다.\n\n' +
      '• 3단계 결재 프로세스 (작성→검토→승인)\n' +
      '• 개정 이력 테이블\n' +
      '• PFMEA 개정관리와 동일한 구조\n\n' +
      '[사용자 정보 제공 후 상세 내용 추가 예정]',
    keywords: ['CP', '개정', 'revision', '관리계획서', '결재'],
    paths: ['/control-plan/revision'],
  },

  // ═══════════════════════════════════════════
  // PFD
  // ═══════════════════════════════════════════
  {
    category: 'PFD',
    title: 'PFD 리스트 / 등록',
    content:
      '■ PFD 리스트\n' +
      '• PFD 프로젝트 목록 조회/관리\n' +
      '• PFD ID, 프로젝트명, 연동 PFMEA\n' +
      '• 검색/정렬/필터 기능\n\n' +
      '■ PFD 등록\n' +
      '• PFD ID 자동 생성\n' +
      '• PFMEA 연동 선택\n' +
      '• 프로젝트 정보 입력\n\n' +
      '[사용자 정보 제공 후 상세 내용 추가 예정]',
    keywords: ['PFD', '리스트', '등록', '공정흐름도', '목록'],
    paths: ['/pfd/list', '/pfd/register'],
  },
  {
    category: 'PFD',
    title: 'PFD 워크시트 / 개정관리',
    content:
      'PFD(Process Flow Diagram)는 제조 공정의 흐름을 시각적으로 표현하는 공정흐름도입니다.\n\n' +
      '■ 공정 분류\n' +
      '• ○ 가공 (Operation): 물리적/화학적 변화를 가하는 공정\n' +
      '• □ 검사 (Inspection): 품질 확인을 위한 검사 공정\n' +
      '• → 운반 (Transport): 제품/자재의 이동\n' +
      '• D 대기 (Delay): 다음 공정까지의 대기/보관\n' +
      '• ▽ 저장 (Storage): 창고 보관\n\n' +
      '■ 주요 컬럼\n' +
      '• 공정번호 / 공정명 / 공정분류\n' +
      '• 설비명 / 설비번호 / 작업요소 / 비고\n\n' +
      '■ PFD → PFMEA 연계\n' +
      '• PFD 공정번호/공정명 → PFMEA 1단계(구조분석) 반영\n' +
      '• PFD 설비 → PFMEA 4M 중 Machine 반영\n' +
      '• PFD 작업요소 → PFMEA L3(작업요소) 반영\n\n' +
      '■ PFD 개정관리\n' +
      '• 3단계 결재 프로세스 / 개정 이력 관리',
    keywords: ['PFD', '워크시트', '개정', '공정흐름도', '분류', '설비'],
    paths: ['/pfd/worksheet', '/pfd/revision'],
  },
  {
    category: 'PFD',
    title: 'PFD 연동 (워크시트 메뉴바)',
    content:
      'PFMEA 워크시트에서 PFD(공정흐름도)로 데이터를 동기화하는 기능입니다.\n\n' +
      '■ 연동 방향\n' +
      '• PFMEA → PFD (단방향)\n' +
      '• 공정 구조 → PFD 공정 항목\n\n' +
      '■ 동기화 내용\n' +
      '• L2 공정 → PFD 공정 단계\n' +
      '• 특별특성(CC/SC) → PFD 특별특성 표기\n' +
      '• 공정 분류 → PFD 공정 기호\n\n' +
      '■ 사용법\n' +
      '• 메뉴바 "PFD연동" 버튼 클릭\n' +
      '• 동기화 미리보기 확인\n' +
      '• "적용" 클릭 → PFD에 반영',
    keywords: ['PFD', '연동', '동기화', '공정흐름도', '메뉴바'],
    paths: ['/pfmea/worksheet'],
  },
  {
    category: 'PFD',
    title: 'CP이동 / PFD이동 (메뉴바)',
    content:
      '워크시트에서 연동된 CP 또는 PFD 작성화면으로 바로 이동하는 버튼입니다.\n\n' +
      '■ CP이동\n' +
      '• 메뉴바 "CP이동" 클릭\n' +
      '• 현재 FMEA와 연동된 Control Plan 워크시트로 이동\n' +
      '• 연동된 CP가 없으면 → CP 등록 안내\n\n' +
      '■ PFD이동\n' +
      '• 메뉴바 "PFD이동" 클릭\n' +
      '• 현재 FMEA와 연동된 PFD 작성화면으로 이동\n' +
      '• 연동된 PFD가 없으면 → PFD 등록 안내',
    keywords: ['CP이동', 'PFD이동', '이동', '바로가기', '연동'],
    paths: ['/pfmea/worksheet'],
  },
];

export const CP_PFD_ITEMS_EN: ManualItem[] = [];
