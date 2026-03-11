/**
 * @file manual-modules.ts
 * @description 리스트 관리, 개정관리, 데이터관리, CP, PFD, APQP 도움말
 *
 * 카테고리: 리스트 관리, 개정관리, 데이터 관리, Control Plan, PFD, APQP
 * 관련 화면: /pfmea/list, /pfmea/revision, /control-plan, /pfd, /apqp
 */

import { ManualItem } from './types';

export const MODULES_ITEMS_KO: ManualItem[] = [
  // ═══════════════════════════════════════════
  // 리스트 관리
  // ═══════════════════════════════════════════
  {
    category: '리스트 관리',
    title: 'FMEA 리스트 화면 개요',
    content: '등록된 FMEA 프로젝트 목록을 조회/관리하는 화면입니다.\n\n■ 컬럼 (17개)\n체크박스 | No | 작성일 | Type(P/F/M) | ID | Rev | 단계(1~7)\n공장 | FMEA명 | 고객사 | 담당자 | DFMEA | PFD | CP\n현황 | 시작일 | 목표완료일\n\n■ 주요 기능\n• 전체 컬럼 정렬 (헤더 클릭 ↑↓)\n• 다중 필드 검색 (실시간 필터링)\n• 행 클릭 → 워크시트/등록화면 이동\n• DFMEA/PFD/CP 링크 → 해당 모듈 이동',
    keywords: ['리스트', 'list', '목록', '조회', '프로젝트'],
    paths: ['/pfmea/list'],
  },
  {
    category: '리스트 관리',
    title: '검색 & 정렬 기능',
    content: '■ 검색 (실시간 필터링)\n검색 가능 필드:\n• FMEA ID, 프로젝트명, FMEA명, 고객사\n• 담당자, 공장(engineeringLocation)\n• 단계(step), 현황(완료/진행/지연)\n• 시작일(fmeaStartDate)\n• 대소문자 무관, 부분 일치\n\n■ 정렬 (모든 컬럼)\n• 컬럼 헤더 클릭 → 오름차순/내림차순 토글\n• 현재 정렬 방향 화살표(↑/↓) 표시\n• 기본값: 작성일 내림차순\n\n■ 특수 정렬\n• 단계: 숫자 정렬 (1~7)\n• 현황: 우선순위 정렬 (완료=3 > 진행=2 > 지연=1)\n• 날짜: 문자열 비교 (YYYY-MM-DD 형식)',
    keywords: ['검색', '정렬', 'sort', 'search', '필터', '단계', '현황'],
    paths: ['/pfmea/list'],
  },
  {
    category: '리스트 관리',
    title: '현황 배지 & 단계 표시',
    content: '■ 현황 (Status) 자동 계산\n• 완료 (녹색): step ≥ 7 (모든 단계 완료)\n• 지연 (빨강): 목표완료일 < 오늘 날짜\n• 진행 (파랑): 그 외 (정상 진행 중)\n\n■ 단계 배지 (StepBadge)\n• 1~7단계 숫자 표시\n• 색상 그라데이션 (낮은 단계=밝음, 높은 단계=진함)\n\n■ Type 배지\n• P (Part): 일반 파트 FMEA\n• F (Family): 패밀리 FMEA\n• M (Master): 마스터 FMEA\n• 각 유형별 고유 색상 배지',
    keywords: ['현황', '상태', '완료', '진행', '지연', '단계', 'step', 'badge'],
    paths: ['/pfmea/list'],
  },
  {
    category: '리스트 관리',
    title: '액션바 (버튼 모음)',
    content: '리스트 상단 액션바의 버튼입니다.\n\n■ 💾 저장: 변경사항 DB 저장\n■ 📋 개정: 선택한 FMEA를 복제하여 새 개정 생성 (1건 선택 시)\n■ 🗑️ 삭제: 선택한 행 삭제\n  • 승인 완료 모듈은 삭제 불가\n  • 연동 모듈(DFMEA/PFD/CP) 선택 삭제 가능\n  • 삭제된 항목은 휴지통에서 복원 가능\n■ ➕ 신규 등록: 등록 화면으로 이동 (/pfmea/register?mode=new)\n\n■ 삭제 도움말 (❓ 아이콘)\n• FMEA: 항상 삭제 (필수)\n• CP/PFD: 체크 시 함께 삭제\n• DFMEA/PFMEA: 연동 상대편, 체크 시 함께 삭제\n• WS/PM: 체크 시 함께 삭제\n• APQP: 부모 모듈 — APQP 리스트에서만 삭제 가능',
    keywords: ['액션바', '저장', '개정', '삭제', '등록', '버튼', '휴지통'],
    paths: ['/pfmea/list'],
  },

  // ═══════════════════════════════════════════
  // 개정관리
  // ═══════════════════════════════════════════
  {
    category: '개정관리',
    title: '개정관리 화면 개요',
    content: 'FMEA 개정 이력을 관리하고 3단계 결재 프로세스를 수행하는 화면입니다.\n\n■ 주요 섹션\n• 프로젝트 정보 테이블: 선택된 FMEA 기본 정보\n• 결재 진행 바: 작성→검토→승인 3단계 시각화\n• 개정 이력 테이블: 상세 개정 기록\n• 회의록 테이블: 개정 관련 회의 기록\n• 변경 히스토리: SOD 변경/확정 이력\n\n■ 자동 저장\n• 개정 테이블: 1.5초 디바운스\n• 회의록: 1초 디바운스\n• requestSave 패턴으로 렌더 후 저장 보장',
    keywords: ['개정관리', 'revision', '결재', '이력', '회의록'],
    paths: ['/pfmea/revision'],
  },
  {
    category: '개정관리',
    title: '결재 진행 바 (3단계 승인)',
    content: '온프레미스 결재 플로우를 시각화하는 컴포넌트입니다.\n\n■ 3단계 결재\n\n1) 작성 (Step 1)\n• 상태: 진행 → 상신 → 승인/반려\n• "상신" 버튼: 검토자에게 이메일 발송\n• "회수" 버튼: 상신 취소 (검토 전에만)\n\n2) 검토 (Step 2)\n• 상태: 진행 → 승인/반려\n• "검토 승인" 버튼: 승인자에게 이메일 발송\n• "반려" 버튼: 작성자에게 사유와 함께 반려\n\n3) 승인 (Step 3)\n• 상태: 진행 → 최종승인/반려\n• "최종 승인" 버튼: revisionDate 자동 설정\n• "결재 완료" 배지 표시\n\n■ REV N+1 (신규 개정)\n• "적용" 배지 클릭: 기존 데이터 기반으로 새 개정 생성\n• 기존 데이터를 적용하여 바로 워크시트로 이동',
    keywords: ['결재', '상신', '검토', '승인', '반려', '회수', '이메일', '3단계'],
    paths: ['/pfmea/revision'],
  },
  {
    category: '개정관리',
    title: '개정 이력 테이블',
    content: '개정 기록의 상세 정보를 관리하는 테이블입니다.\n\n■ 컬럼 (18개)\n체크박스 | 개정번호 | 개정일자 | FMEA ID | FMEA명 | 개정이력\n작성직급 | 작성자 | 작성일 | 작성상태\n검토직급 | 검토자 | 검토일 | 검토상태\n승인직급 | 승인자 | 승인일 | 승인상태\n관리 (백업/복원/승인 버튼)\n\n■ 편집 규칙\n• 신규 개정: 모든 필드 편집 가능\n• 승인된 개정: 편집 불가 (읽기 전용)\n• 사용자 필드 (작성자/검토자/승인자): 클릭 → UserSelectModal\n• 상태 드롭다운: 진행/상신/승인/반려\n\n■ 행 관리\n• + 추가: 새 개정 행 추가\n• − 삭제: 선택 행 삭제 (승인된 행 삭제 불가, 완전삭제)\n• 자동저장: 변경 시 1.5초 후 자동 DB 저장',
    keywords: ['개정', '테이블', '작성자', '검토자', '승인자', '상태', '행 추가'],
    paths: ['/pfmea/revision'],
  },
  {
    category: '개정관리',
    title: '회의록 & 변경 히스토리',
    content: '■ 회의록 테이블 (MeetingMinutesTable)\n• 컬럼: 회의일자 | 참석자 | 의제 | 결정사항 | 조치사항\n• + 추가: 회의 기록 행 추가\n• 삭제: 선택 행 삭제\n• 1초 디바운스 자동저장\n\n■ 변경 히스토리 (ChangeHistoryTable)\n• SOD 변경 이력: 심각도/발생도/검출도 변경 기록\n• 확정 이력: 고장확정(4ST), 6ST확정 등\n• 등록정보 변경 이력: 프로젝트 기본정보 변경\n• 각 변경에 타임스탬프 + 변경 전/후 값 표시',
    keywords: ['회의록', 'meeting', '변경', '히스토리', 'SOD', '확정'],
    paths: ['/pfmea/revision'],
  },

  // ═══════════════════════════════════════════
  // 데이터 관리
  // ═══════════════════════════════════════════
  {
    category: '데이터 관리',
    title: '엑셀 임포트/내보내기',
    content: '엑셀 연동 기능입니다.\n\n임포트:\n• 기초정보 Import: 구조 데이터 불러오기\n• 워크시트 Import: 전체 FMEA 데이터 불러오기\n\n내보내기:\n• 워크시트 내보내기: 현재 데이터 엑셀 저장\n• FMEA4 양식: AIAG VDA 표준 양식으로 출력\n• PDF 출력: A4 형식 페이지별 출력',
    keywords: ['엑셀', 'import', 'export', '임포트', '내보내기', 'PDF'],
  },

  // ═══════════════════════════════════════════
  // Control Plan / PFD / APQP
  // ═══════════════════════════════════════════
  {
    category: 'Control Plan',
    title: 'Control Plan (관리계획서) 워크플로우',
    content: 'FMEA 분석 결과를 기반으로 관리계획서를 작성합니다.\n\n워크플로우:\n1. PFMEA 워크시트에서 분석 완료\n2. CP 등록 → PFMEA 연동 선택\n3. 공정별 관리항목 정의\n4. 검출기, 관리방법, 반응계획 작성\n5. 최종 확인 후 출력\n\n■ PFMEA 자동 연동\n• PFMEA → CP 구조 동기화 (워크시트 메뉴바)\n• 공정/검출관리/예방관리 자동 매핑',
    keywords: ['CP', 'control plan', '관리계획서', '검출기', '관리항목', '연동'],
    paths: ['/control-plan'],
  },
  {
    category: 'PFD',
    title: 'PFD (공정흐름도) 워크플로우',
    content: '제조 공정의 흐름을 시각적으로 정의합니다.\n\n워크플로우:\n1. PFD 등록 → PFMEA 연동 선택\n2. 공정 단계별 흐름 정의\n3. 공정 분류 (가공/검사/이동/대기)\n4. 특별특성 표기\n5. PFMEA/CP와 자동 연동\n\n■ 연동 방향\n• PFMEA 워크시트에서 PFD로 구조 자동 동기화\n• PFD 변경 시 PFMEA에 반영',
    keywords: ['PFD', '공정흐름도', '공정', '흐름', '분류', '연동'],
    paths: ['/pfd'],
  },
  {
    category: 'APQP',
    title: 'APQP 프로젝트 관리',
    content: 'Advanced Product Quality Planning — 제품 품질 선행 계획입니다.\n\n• APQP 프로젝트 등록 → FMEA/CP/PFD 하위 연결\n• 5단계 게이트 관리\n• 일정 관리 (마일스톤, 간트차트)\n• 산출물 관리\n• 대시보드: 진행률, 리스크 현황\n\n■ APQP 삭제 규칙\n• APQP는 부모 모듈 — 하위에서 삭제 불가\n• APQP 리스트에서만 삭제 가능',
    keywords: ['APQP', '프로젝트', '게이트', '일정', '대시보드', '산출물'],
    paths: ['/apqp'],
  },
];

export const MODULES_ITEMS_EN: ManualItem[] = [];
