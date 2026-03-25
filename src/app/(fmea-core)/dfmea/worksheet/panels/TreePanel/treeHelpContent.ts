/**
 * @file treeHelpContent.ts
 * @description 트리뷰 탭별 도움말 콘텐츠
 * @updated 2026-02-17 — 트리구조 설명 + 모달 사용법 중심으로 재작성 (워크시트 중복 제거)
 * @note 트리뷰 도움말 = 트리 구조 읽는 법 + 모달(기초정보 선택) 사용법
 *       워크시트 입력 항목 설명은 워크시트 도움말(HelpPopup)에서 담당
 */

export interface HelpItem {
  title: string;
  desc: string;
}

export interface HelpSection {
  label: string;
  items: HelpItem[];
}

export interface TabHelp {
  title: string;
  summary: string;
  sections: HelpSection[];
}

// ============ 공통 섹션 ============

/** 트리뷰 구조 읽는 법 */
const TREE_STRUCTURE_HELP: HelpSection = {
  label: '트리뷰 읽는 법',
  items: [
    { title: '헤더 숫자', desc: '완제품(1), 서브시스템(7), 부품(컴포넌트)(40) 등 — 괄호 안 숫자는 해당 항목의 총 개수입니다.' },
    { title: '트리 계층', desc: '들여쓰기(가지선)로 상위→하위 관계를 표현합니다. 왼쪽이 상위, 오른쪽이 하위입니다.' },
    { title: '배지(숫자)', desc: '항목 오른쪽의 숫자 배지는 하위 항목 개수를 나타냅니다.' },
    { title: '색상 구분', desc: '파란색=구조, 초록색=기능, 남색=고장 — 현재 탭에 맞는 색상이 표시됩니다.' },
  ],
};

/** 모달(기초정보 선택창) 사용법 — 모든 탭 공통 */
const MODAL_USAGE_HELP: HelpSection = {
  label: '기초정보 선택 모달 사용법',
  items: [
    { title: '모달 열기', desc: '워크시트 셀을 클릭하면 기초정보 선택 모달이 열립니다.' },
    { title: '검색', desc: '모달 상단 검색창에 키워드를 입력하면 목록이 즉시 필터링됩니다.' },
    { title: '선택/해제', desc: '항목을 클릭(체크)하여 선택합니다. 다시 클릭하면 해제됩니다.' },
    { title: '다중 선택', desc: '여러 항목을 동시에 체크할 수 있습니다. 선택 후 "적용"을 누르세요.' },
    { title: '직접 입력', desc: '모달 하단 입력창에 새 항목을 입력 → Enter로 목록에 추가됩니다.' },
    { title: '적용 버튼', desc: '선택한 항목을 워크시트에 반영합니다. (기초정보 원본은 변경되지 않음)' },
    { title: '삭제 버튼', desc: '체크된 항목을 워크시트에서 제거합니다. 기초정보 원본은 유지됩니다.' },
    { title: '모달 닫기', desc: 'ESC 키, X 버튼, 또는 모달 바깥 영역 클릭으로 닫습니다.' },
  ],
};

/** 헤더 버튼 (확정/수정/누락) */
const HEADER_BUTTONS_HELP: HelpSection = {
  label: '헤더 버튼',
  items: [
    { title: '미확정 → 확정', desc: '"미확정" 클릭 → 현재 화면을 DB에 저장하고 확정 상태로 전환합니다.' },
    { title: '누락 N건', desc: '필수 항목 중 비어있는 건수입니다. 클릭하면 누락 위치를 표시합니다.' },
    { title: '수정', desc: '확정된 탭을 다시 편집 가능 상태로 전환합니다.' },
  ],
};

/** 자동/수동 모드 포함 헤더 */
const HEADER_BUTTONS_AUTO_HELP: HelpSection = {
  label: '헤더 버튼',
  items: [
    ...HEADER_BUTTONS_HELP.items,
    { title: '자동 / 수동', desc: '자동: 기초정보(DB)에서 자동 매핑 / 수동: 사용자가 직접 입력합니다.' },
  ],
};

/** 셀 조작 공통 */
const CELL_OPERATION_HELP: HelpSection = {
  label: '셀 조작',
  items: [
    { title: '클릭', desc: '기초정보 선택 모달이 열립니다.' },
    { title: '더블클릭', desc: '셀이 편집 모드로 전환되어 직접 텍스트를 입력할 수 있습니다.' },
    { title: '우클릭', desc: '행 추가/삭제 등 컨텍스트 메뉴가 나타납니다.' },
    { title: 'Enter', desc: '편집 완료 후 Enter로 확정합니다.' },
  ],
};

// ============ 탭별 도움말 ============

export const TREE_HELP: Record<string, TabHelp> = {
  structure: {
    title: '2단계(Step) 구조분석',
    summary: '완제품 → 서브시스템 → 부품(컴포넌트)의 3계층 트리 구조를 보여줍니다.',
    sections: [
      {
        label: '트리 구조 (3계층)',
        items: [
          { title: '1L 완제품 공정명', desc: '최상위 노드. 품명 + "생산공정" 형식입니다. (예: Motor Controller IC 생산공정)' },
          { title: '2L 서브시스템', desc: '공정번호-공정명 형태로 표시됩니다. (예: 10-SMT, 20-수삽)' },
          { title: '3L 부품(컴포넌트)', desc: '4M(사람/설비/부자재/환경)별 색상 배지와 함께 표시됩니다.' },
          { title: '4M 색상', desc: 'MN(사람)=빨강, MC(설비)=파랑, IM(부자재)=초록, EN(환경)=주황' },
        ],
      },
      {
        label: '트리뷰 배지 의미',
        items: [
          { title: '연결됨 N개', desc: '해당 공정에 연결된 부품(컴포넌트) 개수입니다.' },
          { title: '누락 N개 (빨간색)', desc: '기초정보에는 있지만 아직 연결하지 않은 부품(컴포넌트) 개수입니다.' },
        ],
      },
      HEADER_BUTTONS_AUTO_HELP,
      MODAL_USAGE_HELP,
    ],
  },
  'function-l1': {
    title: '1L 기능분석',
    summary: '완제품의 구분(YP/SP/USER)별 기능과 요구사항 트리를 보여줍니다.',
    sections: [
      TREE_STRUCTURE_HELP,
      {
        label: '트리 구조',
        items: [
          { title: '구분 노드', desc: 'YP(자사공정) / SP(고객사) / USER(최종사용자) — scope-constants.ts 참조' },
          { title: '기능 노드', desc: '각 구분 아래의 완제품 기능 목록입니다.' },
          { title: '요구사항', desc: '각 기능 아래의 요구사항/사양 목록입니다.' },
        ],
      },
      {
        label: '필수 규칙',
        items: [
          { title: 'YP/SP/USER 3개 필수', desc: '3개 구분이 모두 있어야 확정할 수 있습니다.' },
          { title: 'YP/SP 최소 1건', desc: 'YP, SP에는 각각 최소 1개의 기능+요구사항이 필요합니다.' },
          { title: 'USER N/A 허용', desc: 'USER 구분은 해당 없으면 N/A를 선택할 수 있습니다.' },
        ],
      },
      CELL_OPERATION_HELP,
      HEADER_BUTTONS_HELP,
      MODAL_USAGE_HELP,
    ],
  },
  'function-l2': {
    title: '2L 기능분석',
    summary: '서브시스템별 설계기능과 설계특성 트리를 보여줍니다.',
    sections: [
      TREE_STRUCTURE_HELP,
      {
        label: '트리 구조',
        items: [
          { title: '서브시스템 노드', desc: '공정번호-공정명으로 표시됩니다.' },
          { title: '설계기능', desc: '각 공정이 수행하는 기능입니다.' },
          { title: '설계특성', desc: '공정에서 관리해야 할 제품의 특성입니다.' },
        ],
      },
      {
        label: '특별특성 (설계특성 옆 배지)',
        items: [
          { title: '지정 방법', desc: '설계특성 옆의 배지를 클릭하면 특별특성 선택 모달이 열립니다.' },
          { title: '★ (제품 특별특성)', desc: '고객 요구 규격 직결. Ball Height, Co-planarity, Bond Strength, 전기적 특성(Vf, Ir, BVR) 등' },
          { title: '◇ (공정 특별특성)', desc: '공정 파라미터 관리 필요. Etch Rate, Plating 두께, Chemical 농도, Mold 온도/압력 등' },
          { title: '빈 값', desc: '특별특성 해당 없음. 배지를 클릭하여 해제할 수 있습니다.' },
        ],
      },
      CELL_OPERATION_HELP,
      HEADER_BUTTONS_HELP,
      MODAL_USAGE_HELP,
    ],
  },
  'function-l3': {
    title: '3L 기능분석',
    summary: '부품(컴포넌트)별 작업기능과 설계파라미터 트리를 보여줍니다.',
    sections: [
      TREE_STRUCTURE_HELP,
      {
        label: '트리 구조',
        items: [
          { title: '서브시스템 노드', desc: '상위 공정 구분입니다.' },
          { title: '부품(컴포넌트) 노드', desc: '4M 색상 배지와 함께 표시됩니다.' },
          { title: '작업기능', desc: '각 부품(컴포넌트)가 수행하는 기능입니다.' },
          { title: '설계파라미터', desc: '부품(컴포넌트)에서 관리해야 할 공정의 특성입니다.' },
        ],
      },
      CELL_OPERATION_HELP,
      HEADER_BUTTONS_AUTO_HELP,
      MODAL_USAGE_HELP,
    ],
  },
  'failure-l1': {
    title: '1L 고장분석',
    summary: '구분별 고장영향(FE)과 심각도(S) 트리를 보여줍니다.',
    sections: [
      TREE_STRUCTURE_HELP,
      {
        label: '트리 구조',
        items: [
          { title: '구분 노드', desc: 'YP / SP / USER별로 그룹화됩니다.' },
          { title: '고장영향(FE)', desc: '요구사항이 충족되지 않을 때 최종 사용자에게 미치는 영향입니다.' },
          { title: '심각도(S)', desc: '고장영향의 심각한 정도 (1~10, 10=가장 심각)' },
          { title: '색상 의미', desc: '심각도 높을수록 진한 빨강으로 표시됩니다.' },
        ],
      },
      {
        label: '선행 조건',
        items: [
          { title: '1L 기능분석 확정 필수', desc: '구분/기능/요구사항을 먼저 확정해야 고장분석을 시작할 수 있습니다.' },
        ],
      },
      CELL_OPERATION_HELP,
      HEADER_BUTTONS_HELP,
      MODAL_USAGE_HELP,
    ],
  },
  'failure-l2': {
    title: '2L 고장분석',
    summary: '공정별 고장형태(FM) 트리를 보여줍니다.',
    sections: [
      TREE_STRUCTURE_HELP,
      {
        label: '트리 구조',
        items: [
          { title: '서브시스템 노드', desc: '공정번호-공정명으로 그룹화됩니다.' },
          { title: '고장형태(FM)', desc: '설계특성이 충족되지 않는 방식(고장 모드)입니다.' },
        ],
      },
      {
        label: '선행 조건',
        items: [
          { title: '2L 기능분석 확정 필수', desc: '설계기능/설계특성을 먼저 확정해야 합니다.' },
        ],
      },
      CELL_OPERATION_HELP,
      HEADER_BUTTONS_AUTO_HELP,
      MODAL_USAGE_HELP,
    ],
  },
  'failure-l3': {
    title: '3L 고장분석',
    summary: '부품(컴포넌트)별 고장원인(FC)과 발생도(O) 트리를 보여줍니다.',
    sections: [
      TREE_STRUCTURE_HELP,
      {
        label: '트리 구조',
        items: [
          { title: '부품(컴포넌트) 노드', desc: '4M 색상 배지와 함께 표시됩니다.' },
          { title: '고장원인(FC)', desc: '고장형태를 유발하는 근본 원인입니다.' },
          { title: '발생도(O)', desc: '고장원인의 발생 가능성 (1~10, 10=매우 빈번)' },
        ],
      },
      {
        label: '선행 조건',
        items: [
          { title: '3L 기능분석 확정 필수', desc: '부품(컴포넌트)기능/설계파라미터을 먼저 확정해야 합니다.' },
        ],
      },
      CELL_OPERATION_HELP,
      HEADER_BUTTONS_AUTO_HELP,
      MODAL_USAGE_HELP,
    ],
  },

  // ============ 4단계 고장연결 ============

  'failure-link': {
    title: '4단계(Step) 고장연결',
    summary: '고장영향(FE) ↔ 고장형태(FM) ↔ 고장원인(FC)을 연결하여 고장사슬을 완성합니다.',
    sections: [
      {
        label: '고장연결 개요',
        items: [
          { title: '목적', desc: 'FM(고장형태)을 중심으로 상위 FE(고장영향)와 하위 FC(고장원인)를 연결합니다.' },
          { title: '진입 조건', desc: '1L/2L/3L 고장분석이 모두 확정되어야 고장연결 탭이 활성화됩니다.' },
          { title: '연결 방식', desc: '왼쪽 FM을 선택 → 오른쪽 FE/FC를 체크하여 연결합니다.' },
        ],
      },
      {
        label: '화면 구성',
        items: [
          { title: '좌측: FM 목록', desc: '공정별 고장형태(FM) 목록. 클릭하여 선택합니다.' },
          { title: '우측 상단: FE 후보', desc: '선택된 FM에 연결할 고장영향(FE) 후보 목록입니다.' },
          { title: '우측 하단: FC 후보', desc: '선택된 FM에 연결할 고장원인(FC) 후보 목록입니다.' },
          { title: '고장사슬 다이어그램', desc: 'FE ← FM → FC 연결 관계를 시각적으로 보여줍니다.' },
        ],
      },
      {
        label: '검증 기능',
        items: [
          { title: '파이프라인 검증', desc: 'Import→DB→워크시트→연결의 14항목 건수를 단계별로 비교합니다.' },
          { title: 'FC검증', desc: 'Import FC 251건 vs 파싱/WS/검증 건수를 공정별로 비교합니다.' },
          { title: '누락 경고', desc: 'FM에 FE 또는 FC가 연결되지 않으면 빨간색 경고가 표시됩니다.' },
          { title: '자동 복구', desc: '누락된 연결을 자동으로 복구하는 버튼이 제공됩니다.' },
        ],
      },
      {
        label: '확정/해제',
        items: [
          { title: '전체확정', desc: '모든 FM에 FE+FC가 연결되면 전체확정 버튼이 활성화됩니다.' },
          { title: '연결해제', desc: '확정 후에도 수정 버튼으로 연결을 해제/재연결할 수 있습니다.' },
        ],
      },
    ],
  },

  // ============ 5단계 리스크분석 ============

  risk: {
    title: '5단계(Step) 리스크분석',
    summary: 'SOD 평가(심각도/발생도/검출도)로 위험 수준을 결정하고, AP(조치 우선순위)를 자동 산출합니다.',
    sections: [
      {
        label: 'SOD 평가',
        items: [
          { title: 'S (심각도)', desc: '고장영향의 심각도. 1L 고장분석(FE)에서 평가된 값이 자동 반영됩니다. (1~10)' },
          { title: 'O (발생도)', desc: '고장원인의 발생 빈도. 설계검증 예방(PC)의 효과에 따라 평가합니다. (1~10)' },
          { title: 'D (검출도)', desc: '현재 설계검증 검출(DC)의 검출 능력. 검출방법 성숙도에 따라 평가합니다. (1~10)' },
          { title: 'SOD 기준표', desc: 'ALL 탭 툴바의 SOD 버튼 → AIAG-VDA 1st Edition 기준 판정표 참조.' },
        ],
      },
      {
        label: 'AP (Action Priority)',
        items: [
          { title: 'H (High)', desc: '높은 우선순위 — 즉시 개선 조치 필요. 빨간색으로 표시됩니다.' },
          { title: 'M (Medium)', desc: '중간 우선순위 — 개선 조치 권고. 노란색으로 표시됩니다.' },
          { title: 'L (Low)', desc: '낮은 우선순위 — 현재 관리 유지 가능. 초록색으로 표시됩니다.' },
          { title: 'AP 자동 산출', desc: 'S×O×D 조합으로 AP가 자동 결정됩니다. (AIAG-VDA AP Table 기준)' },
        ],
      },
      {
        label: '예방/설계검증 검출',
        items: [
          { title: '설계검증 예방 (PC)', desc: 'B5 항목. Import 기초정보에서 FC↔PC 1:1 매칭으로 자동 추천됩니다.' },
          { title: '설계검증 검출 (DC)', desc: 'A6 항목. Import 기초정보에서 FC↔DC 매칭으로 자동 추천됩니다.' },
          { title: 'O값 자동평가', desc: '설계검증 예방 텍스트를 분석하여 발생도(O)를 자동 산출합니다. (상한 O≤4)' },
          { title: 'D값 자동평가', desc: '설계검증 검출 텍스트를 분석하여 검출도(D)를 자동 산출합니다. (상한 D≤4)' },
        ],
      },
      {
        label: 'RPN 차트',
        items: [
          { title: 'RPN = S × O × D', desc: '위험 우선순위 번호. 높을수록 위험합니다.' },
          { title: 'RPN 파레토 차트', desc: 'ALL 탭 → RPN 버튼 → 우측 패널에 RPN 분포 차트가 표시됩니다.' },
        ],
      },
    ],
  },

  // ============ 6단계 최적화 ============

  opt: {
    title: '6단계(Step) 최적화',
    summary: 'AP=H/M인 항목에 대한 개선 조치를 계획하고, 조치 후 SOD를 재평가하여 위험을 저감합니다.',
    sections: [
      {
        label: '최적화 개요',
        items: [
          { title: '대상', desc: 'AP=H(High) 또는 M(Medium)인 항목이 최적화 대상입니다.' },
          { title: '목표', desc: '개선 조치를 통해 S/O/D를 낮추고, AP를 L(Low)로 전환하는 것이 목표입니다.' },
          { title: '6AP 테이블', desc: 'ALL 탭 → 6AP 버튼 → 우측 패널에 최적화 조치 테이블이 표시됩니다.' },
        ],
      },
      {
        label: '최적화 항목',
        items: [
          { title: '예방 조치', desc: '발생도(O)를 낮추기 위한 예방 관리 개선 계획입니다.' },
          { title: '검출 조치', desc: '검출도(D)를 낮추기 위한 검출 관리 개선 계획입니다.' },
          { title: '책임자/목표일', desc: '조치 담당자와 완료 예정일을 지정합니다.' },
          { title: '상태 관리', desc: '미착수 → 진행중 → 완료 3단계로 진행 상태를 추적합니다.' },
          { title: '효과 평가', desc: '조치 완료 후 S/O/D/AP를 재평가하여 위험 저감 효과를 확인합니다.' },
        ],
      },
      {
        label: '개선안 추천',
        items: [
          { title: '자동 추천', desc: '기초정보 Import 데이터에서 공정별 예방/검출 관리 개선안이 자동 추천됩니다.' },
          { title: '수동 입력', desc: '셀을 더블클릭하여 직접 개선 조치를 입력할 수 있습니다.' },
          { title: 'O/D 자동 재평가', desc: '개선 예방/설계검증 검출 텍스트에서 O/D 값이 자동으로 재산출됩니다.' },
        ],
      },
      {
        label: '습득교훈 (Lessons Learned)',
        items: [
          { title: '목적', desc: 'FMEA 분석 과정에서 발견한 문제점과 해결책을 문서화하여 향후 프로젝트에 활용합니다.' },
          { title: '기록 항목', desc: '고장 유형, 근본 원인, 효과적인 관리 방법, 개선 전후 SOD 비교 등을 기록합니다.' },
          { title: '활용', desc: '신규 프로젝트 기초정보 작성 시 과거 습득교훈을 참조하여 초기 SOD를 보다 정확하게 평가합니다.' },
        ],
      },
    ],
  },

  // ============ 전체보기 (ALL) ============

  all: {
    title: '전체보기 (ALL)',
    summary: '2~6단계의 모든 데이터를 하나의 통합 화면(약 40열)에 표시하며, 리스크 분석과 최적화를 수행합니다.',
    sections: [
      {
        label: '화면 구성',
        items: [
          { title: '가로 스크롤', desc: '약 40열의 전체 데이터를 가로 스크롤로 조회합니다.' },
          { title: '단계별 토글', desc: '상단 2ST/3ST/4ST/5ST/6ST 버튼으로 특정 단계 열을 표시/숨김합니다.' },
          { title: '우측 패널', desc: '5AP/6AP/RPN/고장사슬/PDF/TREE 등 다양한 패널을 활성화합니다.' },
        ],
      },
      {
        label: '주요 기능',
        items: [
          { title: '설계검증 예방 자동추천', desc: 'O매칭 버튼 → Import FC↔PC 1:1 매칭으로 설계검증 예방(PC)를 자동 채움합니다.' },
          { title: '설계검증 검출 자동추천', desc: 'Import FC↔DC 매칭으로 설계검증 검출(DC)를 자동 채움합니다.' },
          { title: 'SOD 평가', desc: 'S(심각도)/O(발생도)/D(검출도) 셀에 직접 입력하거나 자동 평가합니다.' },
          { title: 'AP 자동 산출', desc: 'S×O×D 조합으로 AP(H/M/L)가 자동 결정됩니다.' },
        ],
      },
      {
        label: '검증 도구',
        items: [
          { title: '파이프라인 검증', desc: '검증 버튼 → Import/DB/WS/연결의 14항목 건수를 단계별로 비교합니다.' },
          { title: 'FC검증', desc: 'FC검증 버튼 → Import FC 건수 vs 파싱/WS/검증 건수를 비교합니다.' },
          { title: 'GAP 분석', desc: '우측 GAP 패널 → Import 데이터와 워크시트 간 누락 항목을 식별합니다.' },
        ],
      },
      {
        label: '우측 패널 안내',
        items: [
          { title: 'TREE', desc: '현재 탭에 맞는 구조/기능/고장 트리뷰를 표시합니다.' },
          { title: 'PDF', desc: 'PDF 파일을 업로드하여 참고 자료로 열람합니다.' },
          { title: 'RPN', desc: 'RPN 분포 파레토 차트를 표시합니다.' },
          { title: '5AP', desc: '5단계 위험분석 AP 테이블을 표시합니다.' },
          { title: '6AP', desc: '6단계 최적화 조치 테이블을 표시합니다.' },
          { title: '고장사슬', desc: '선택한 FM의 FE-FM-FC 연결 사슬을 시각적으로 표시합니다.' },
          { title: 'GAP', desc: 'Import↔WS 간 누락 항목을 항목코드별로 분석합니다.' },
          { title: '패널 닫기', desc: '우측 상단 ✕ 버튼 또는 ALL 탭 재클릭으로 패널을 닫습니다.' },
        ],
      },
    ],
  },
};
