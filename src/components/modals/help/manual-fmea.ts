/**
 * @file manual-fmea.ts
 * @description FMEA 유형 정의 + 등록 화면 도움말
 *
 * 카테고리: FMEA 유형 정의, FMEA 등록
 * 관련 화면: /pfmea/register, /dfmea/register
 */

import { ManualItem } from './types';

// ─── FMEA 유형 정의 ───

const FMEA_TYPE_ITEMS: ManualItem[] = [
  {
    category: 'FMEA 유형 정의',
    title: 'Master FMEA (마스터)',
    content: '모든 제품군에 공통으로 적용되는 뼈대(Skeleton) FMEA입니다.\n\n• 목적: 제품 전체에 공통되는 공정/고장/리스크 분석의 기준을 수립\n• 예시: "자전거 공통 마스터" — 프레임 제조, 용접, 도장 등 모든 자전거에 공통되는 공정\n• 특징: 한번 작성하면 Family/Part FMEA에서 상속받아 재사용\n• 계층: [Master] → Family → Part (Master가 최상위)',
    keywords: ['마스터', 'master', 'M', '공통', '뼈대', 'skeleton', '기준'],
  },
  {
    category: 'FMEA 유형 정의',
    title: 'Family FMEA (패밀리)',
    content: '동일 제품군(그룹)별로 적용되는 FMEA입니다.\n\n• 목적: 제품군별 특화된 공정/고장 분석 (산악용, 가정용, 선수용, 전문가용 등)\n• 예시: "산악용 자전거 패밀리" — 산악 전용 서스펜션, 강화 프레임 공정 포함\n• 특징: Master FMEA를 기반으로 그룹 특화 요소를 추가\n• 계층: Master → [Family] → Part (중간 레벨)',
    keywords: ['패밀리', 'family', 'F', '그룹', '제품군', '산악', '가정용'],
  },
  {
    category: 'FMEA 유형 정의',
    title: 'Part FMEA (파트)',
    content: '고객이 제공한 구체적인 사양에 맞춰 개발되는 유니크한 FMEA입니다.\n\n• 목적: 실제 양산 제품에 대한 구체적인 FMEA 분석\n• 예시: "자전거 프레임 Part" — 특정 고객의 MTB-2026-A1 모델 전용\n• 특징: Family FMEA를 기반으로 고객 사양에 맞는 세부 항목 추가\n• 계층: Master → Family → [Part] (최하위, 실제 양산 적용)',
    keywords: ['파트', 'part', 'P', '고객', '사양', '유니크', '양산'],
  },
  {
    category: 'FMEA 유형 정의',
    title: 'M/F/P 계층 구조 요약',
    content: '┌─ Master FMEA: 모든 자전거 공통 (뼈대)\n├── Family FMEA: 산악용/가정용/선수용 등 그룹별\n│   ├── Part FMEA: MTB-2026-A1 (고객 A사 사양)\n│   └── Part FMEA: MTB-2026-B2 (고객 B사 사양)\n├── Family FMEA: 전문가용 그룹\n│   └── Part FMEA: PRO-2026-C1\n└── ...\n\n워크플로우:\n1. Master FMEA 작성 (공통 공정/고장 정의)\n2. Family FMEA 생성 → Master 기반 상속 + 그룹 특화\n3. Part FMEA 생성 → Family 기반 상속 + 고객 사양 반영\n4. 각 Part FMEA에서 기초정보 Import → 구조분석 → 워크시트 작업',
    keywords: ['계층', '구조', '상속', '워크플로우', 'hierarchy'],
  },
];

// ─── FMEA 등록 ───

const FMEA_REGISTER_ITEMS: ManualItem[] = [
  {
    category: 'FMEA 등록',
    title: 'FMEA 등록 화면 워크플로우',
    content: '새로운 FMEA 프로젝트를 등록하는 화면입니다.\n\n워크플로우:\n1. FMEA No 입력 (자동 생성 또는 수동 입력)\n2. FMEA 유형 선택: Master(M) / Family(F) / Part(P)\n3. 상위 FMEA 선택 (Family→Master 연결, Part→Family 연결)\n4. 프로젝트 정보 입력 (회사명, 고객, 모델연도 등)\n5. CFT 멤버 등록\n6. 저장 → 기초정보 Import 페이지로 이동',
    keywords: ['등록', 'register', '신규', '프로젝트', 'FMEA No'],
    paths: ['/pfmea/register'],
  },
  {
    category: 'FMEA 등록',
    title: 'FMEA ID 부여 규칙',
    content: 'FMEA ID는 유형별로 고유한 시리얼 번호가 자동 부여됩니다.\n\n형식: {모듈}{연도}-{유형}{시리얼}[-연동접미사]\n\n■ Master FMEA\n  pfm26-m001, pfm26-m002, pfm26-m003 …\n  • 접미사 없음\n  • 시리얼: m001부터 순차 증가\n\n■ Family FMEA\n  pfm26-f001, pfm26-f002, pfm26-f003 …\n  • 접미사 없음\n  • 시리얼: f001부터 순차 증가\n\n■ Part FMEA\n  pfm26-p001-S  (단독)\n  pfm26-p001-L01 (연동그룹 01)\n  pfm26-p001-L02 (연동그룹 02)\n  • -S: 단독 Part (연동 없음)\n  • -L{NN}: 연동그룹 번호 (Master/Family와 연동)\n  • 시리얼: p001부터 순차 증가\n\n■ DFMEA\n  dfm26-m001 (Design Master)\n  dfm26-p001-S (Design Part)\n  • 접두사만 dfm으로 변경, 나머지 규칙 동일\n\n※ 시리얼 번호는 DB 기준으로 자동 계산되며 중복 없이 부여됩니다.',
    keywords: ['ID', '부여', '규칙', '시리얼', 'pfm', 'dfm', '넘버링', '번호', 'naming'],
    paths: ['/pfmea/register'],
  },
  {
    category: 'FMEA 등록',
    title: 'M/F/P 연동 구조',
    content: 'Master → Family → Part 간 연동(상속) 관계를 설정합니다.\n\n■ 연동 방향\n  Master(상위) → Family(중간) → Part(하위)\n  • Part는 반드시 Family 또는 Master를 부모로 선택\n  • Family는 반드시 Master를 부모로 선택\n  • Master는 최상위이므로 부모 없음\n\n■ 등록 시 연동 설정\n  1. FMEA 유형 선택 (M/F/P)\n  2. 상위 FMEA 선택 드롭다운에서 부모 지정\n     — Family 선택 시 → Master 목록 표시\n     — Part 선택 시 → Family 목록 표시\n  3. 연동 선택 완료 → ID 자동 부여\n\n■ 연동 효과\n  • 기초정보 Import 시 부모 FMEA 데이터 참조/비교 가능\n  • 템플릿 다운로드 시 부모 데이터 반영된 양식 제공\n  • 워크시트에서 부모 구조 상속받아 작업 시작\n\n■ Part FMEA ID 접미사\n  • -S: 단독 Part (연동 설정하지 않은 경우)\n  • -L{NN}: 연동그룹 번호 (같은 Family 하위 Part 구분)',
    keywords: ['연동', '상속', '부모', '자식', '계층', 'link', '그룹', '접미사'],
    paths: ['/pfmea/register'],
  },
  {
    category: 'FMEA 등록',
    title: 'CFT 리스트 작성 가이드',
    content: 'CFT(Cross Functional Team)는 FMEA 프로젝트에 참여하는 다기능팀 멤버를 등록합니다.\n\n■ 역할 구성 (필수)\n  • Champion: 프로젝트 총괄 책임자 (1명)\n  • Technical Leader: 기술 총괄 (1명)\n  • Leader: 팀 리더 (1명)\n  • PM: 프로젝트 매니저 (1명)\n  • Moderator: 회의 진행자 (1명)\n  • CFT 팀원: 실무 참여자 (여러 명 가능)\n\n■ 입력 항목\n  성명, 부서, 직급, 담당업무, Email, 전화번호\n  • 🔍 돋보기 버튼으로 사용자 검색 가능\n\n■ 주의사항\n  • Champion~Moderator는 각 1명만 지정 가능\n  • CFT 팀원은 제한 없이 추가 가능\n  • 초기화 버튼으로 기본 7행 복원 가능',
    keywords: ['CFT', '팀', '멤버', '역할', 'Champion', 'Leader', 'Moderator', '팀원'],
    paths: ['/pfmea/register'],
  },
];

// ─── 영문 (요약) ───

const FMEA_EN_ITEMS: ManualItem[] = [
  {
    category: 'FMEA Type Definition',
    title: 'Master FMEA',
    content: 'The skeleton FMEA common to all product lines.\n\n• Purpose: Establish baseline process/failure/risk analysis for all products\n• Example: "Bicycle Common Master" — frame, welding, painting common to all bikes\n• Feature: Created once, inherited by Family/Part FMEAs\n• Hierarchy: [Master] → Family → Part (Master is top level)',
    keywords: ['master', 'M', 'common', 'skeleton', 'baseline'],
  },
  {
    category: 'FMEA Type Definition',
    title: 'Family FMEA',
    content: 'Group-specific FMEA for product families.\n\n• Purpose: Group-specialized process/failure analysis (mountain, city, racing, professional)\n• Example: "Mountain Bike Family" — mountain-specific suspension, reinforced frame\n• Feature: Based on Master FMEA with group-specific additions\n• Hierarchy: Master → [Family] → Part (middle level)',
    keywords: ['family', 'F', 'group', 'product line'],
  },
  {
    category: 'FMEA Type Definition',
    title: 'Part FMEA',
    content: 'Unique FMEA developed for specific customer specifications.\n\n• Purpose: Concrete FMEA analysis for actual production\n• Example: "Bike Frame Part" — specific to customer MTB-2026-A1 model\n• Feature: Based on Family FMEA with customer-specific items\n• Hierarchy: Master → Family → [Part] (bottom level)',
    keywords: ['part', 'P', 'customer', 'specification', 'unique'],
  },
];

export const FMEA_ITEMS_KO = [...FMEA_TYPE_ITEMS, ...FMEA_REGISTER_ITEMS];
export const FMEA_ITEMS_EN = FMEA_EN_ITEMS;
