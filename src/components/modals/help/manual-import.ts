/**
 * @file manual-import.ts
 * @description 기초정보 Import + BD 현황 화면 도움말
 *
 * 카테고리: 기초정보 Import
 * 관련 화면: /pfmea/import, /dfmea/import
 */

import { ManualItem } from './types';

export const IMPORT_ITEMS_KO: ManualItem[] = [
  // ─── 기초정보 Import 개요 ───
  {
    category: '기초정보 Import',
    title: '기초정보 Import 워크플로우',
    content: '엑셀 파일에서 PFMEA 기초정보를 불러오는 화면입니다.\n\n워크플로우:\n1. BD 현황 테이블에서 FMEA 선택\n2. 모드 선택: SA(구조분석) / FA(고장분석) / CA(특성분석)\n3. 샘플/빈 템플릿 다운로드 또는 마스터 데이터 활용\n4. 엑셀 파일 업로드 → 미리보기 패널에서 확인/편집\n5. 저장 → DB에 원자적 저장\n6. 적합 판정 완료 시 워크시트로 이동\n\n아이템코드 체계:\n• A2(공정) A3(공정기능) A4(제품특성) A5(관련특성) A6(검출관리)\n• B1(작업요소) B2(작업기능) B3(공정특성) B4(고장원인) B5(예방관리)\n• C1~C4(DFMEA 연계) FC(고장사슬)',
    keywords: ['기초정보', 'import', '임포트', '엑셀', '업로드', '템플릿', 'BD'],
    paths: ['/pfmea/import'],
  },

  // ─── BD 현황 테이블 ───
  {
    category: '기초정보 Import',
    title: 'BD 현황 테이블 (Basic Data 현황)',
    content: 'Import된 기초정보 데이터셋 현황을 보여주는 테이블입니다.\n\n■ 컬럼 (16개)\n유형(M/F/P) | 회사명 | 고객 | BD ID | BD생성일 | BD Rev\nFMEA ID | FMEA명 | 작성일 | Rev | 공정수 | FM수 | FC수 | 데이터수 | 판정\n\n■ 유형 필터 탭\n• ALL: 전체 데이터셋\n• Master(M): 마스터 FMEA만\n• Family(F): 패밀리 FMEA만\n• Part(P): 파트 FMEA만\n\n■ 검색\n• FMEA ID, FMEA명, 고객사, 회사명, BD ID로 검색\n• 실시간 필터링 (대소문자 무관)\n\n■ 정렬\n• 모든 컬럼 헤더 클릭 → 오름차순/내림차순 토글\n• 현재 정렬 방향 화살표(↑/↓) 표시',
    keywords: ['BD', '현황', '테이블', '유형', '필터', '검색', '정렬', '데이터셋'],
    paths: ['/pfmea/import'],
  },
  {
    category: '기초정보 Import',
    title: '판정 배지 (적합 버튼)',
    content: 'BD 현황 테이블의 판정 컬럼에 표시되는 배지입니다.\n\n■ 적합 조건\n• 공정수 > 0 AND FM수 > 0 AND FC수 > 0\n• 세 조건 모두 충족 시 "적합" (녹색 배지) 표시\n\n■ 적합 버튼 클릭\n• 해당 FMEA의 워크시트로 바로 이동\n• /pfmea/worksheet?id={fmeaId} 페이지로 네비게이션\n\n■ 미충족 시\n• 빈 칸 또는 "부적합" 표시\n• 데이터를 추가로 Import해야 함',
    keywords: ['판정', '적합', '부적합', '워크시트', '이동', '배지'],
    paths: ['/pfmea/import'],
  },
  {
    category: '기초정보 Import',
    title: 'BD 삭제/복구 (관리자 모드)',
    content: '데이터셋 삭제 및 복구 기능입니다.\n\n■ 일반 모드\n• 체크박스로 행 선택 → "삭제" 버튼\n• Soft Delete (복구 가능)\n\n■ 관리자 모드 (Admin Mode)\n• "관리자" 버튼 클릭 → 관리자 ON\n• 삭제된 항목도 화면에 표시 ([삭제] 접두사, 투명도 낮음)\n• "복구" 버튼: 삭제된 항목 원복\n• "완전삭제" 버튼: DB에서 영구 삭제 (복구 불가)\n• "삭제됨 N건 선택": 삭제 항목 일괄 선택\n\n■ 가져오기 (← 가져오기)\n• 데이터가 0건이고 상위 FMEA가 있는 경우 표시\n• 상위 FMEA의 BD를 현재 데이터셋으로 복사',
    keywords: ['삭제', '복구', '관리자', 'admin', '완전삭제', '가져오기'],
    paths: ['/pfmea/import'],
  },

  // ─── 미리보기 패널 ───
  {
    category: '기초정보 Import',
    title: '미리보기 패널 사용법',
    content: '업로드된 데이터를 확인/편집하는 패널입니다.\n\n■ 아이템코드 탭\n• A2(공정) → A3(공정기능) → A4(제품특성) → A5(관련특성) → A6(검출관리)\n• B1(작업요소) → B2(작업기능) → B3(공정특성) → B4(고장원인) → B5(예방관리)\n• FC(고장사슬)\n\n■ 셀 편집\n• 클릭: 텍스트 셀 직접 편집\n• 드롭다운: 4M 분류 (MN/MC/IM/EN)\n• 드래그: ↕ 아이콘으로 행 순서 변경\n\n■ 행 관리\n• 전체선택: 체크박스로 행 전체 선택/해제\n• 삭제: 행 우측 X 버튼\n\n■ 4M 배지 색상\n• MN(사람)=파랑 MC(설비)=초록 IM(부자재)=주황 EN(환경)=보라',
    keywords: ['미리보기', 'preview', '편집', '드래그', '4M', 'MN', 'MC', 'IM', 'EN'],
    paths: ['/pfmea/import'],
  },
  {
    category: '기초정보 Import',
    title: '마스터 데이타 Import 활용',
    content: '기존 Master/Family FMEA의 기초정보를 재활용하는 기능입니다.\n\n사용법:\n1. 마스터 데이타 유형 선택 (Master/Family/Part)\n2. DB에서 FMEA 선택 → 항목수/데이타수 자동 표시\n3. "적용" 선택 → 해당 FMEA의 기초정보가 미리보기에 로드\n4. 새 엑셀 업로드 → "비교" 버튼으로 마스터와 차이 비교\n5. 변경사항 확정 → 저장\n\n비교 모드:\n• 추가된 항목: 초록색 하이라이트\n• 삭제된 항목: 빨간색 하이라이트\n• 변경된 항목: 노란색 하이라이트',
    keywords: ['마스터', '활용', '비교', '적용', '재활용', '템플릿'],
    paths: ['/pfmea/import'],
  },
  {
    category: '기초정보 Import',
    title: '엑셀 Import 프로세스',
    content: '엑셀 파일에서 기초정보를 파싱하는 과정입니다.\n\n■ 지원 형식\n• .xlsx (Excel 2007+)\n• 멀티시트 자동 감지 (SA/FA/CA 시트)\n\n■ 파싱 순서\n1. 파일 선택 → 시트 자동 감지\n2. parseMultiSheetExcel() 실행\n3. 각 행 → itemCode (A2~B5, C1~C4, FC) 분류\n4. 컬럼: processNo, itemCode, m4, value, belongsTo\n\n■ 검증 규칙\n• 계층 체인: A2≤A3≤A4≤A5≤A6 (scope별)\n• B1≤B2≤B3≤B4≤B5 (scope별)\n• C1≤C2≤C3≤C4 (scope별)\n• 14항목 검증: 12항목 + A6(검출관리) + B5(예방관리)\n\n■ 오류 처리\n• 파싱 에러 시 상세 위치 표시 (시트명, 행번호)\n• 중복 데이터 자동 경고',
    keywords: ['엑셀', 'Excel', '파싱', 'parse', '검증', '시트', '에러'],
    paths: ['/pfmea/import'],
  },
  {
    category: '기초정보 Import',
    title: '통계 패널 / 고장사슬 팝업',
    content: '■ 통계 패널 (ParseStatisticsPanel)\n• 아이템코드별 건수 표시\n• 검증 결과: 통과/경고/오류 배지\n• 총 데이터 건수\n\n■ 고장사슬 팝업 (FailureChainPopup)\n• FM(고장형태) ↔ FC(고장원인) 관계 시각화\n• 공정별 연결 상태 확인\n• 누락된 연결 표시 (빨간 경고)\n\n■ 백업/복원\n• 버전 스냅샷 저장\n• 이전 시점으로 복원 가능\n• 백업 타임스탬프 목록',
    keywords: ['통계', '고장사슬', 'chain', '백업', '복원', '검증'],
    paths: ['/pfmea/import'],
  },
];

export const IMPORT_ITEMS_EN: ManualItem[] = [];
