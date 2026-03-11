/**
 * @file level-colors.ts
 * @description 레벨별 표준 색상 정의 (1L~3L 기능/고장 분석용)
 * 
 * 워크시트와 트리뷰에서 동일한 색상을 사용
 */

// ============ 1L 구분(Type) 색상 ============
// PFMEA: Your Plant / Ship to Plant / User (약어: YP, SP, User)
// DFMEA: 법규 / 기본 / 보조 / 관능 (영문: Regulation, Primary, Secondary, Sensory)
// ⭐ 표준 색상 v2.1 (2026-01-22 DFMEA 추가)
export const L1_TYPE_COLORS: Record<string, { bg: string; light: string; text: string; border: string; short: string }> = {
  // ============ PFMEA 구분 ============
  'YP': {
    bg: '#1976d2',      // 🔵 파란색 (자사)
    light: '#bbdefb',
    text: '#0d47a1',
    border: '#1976d2',
    short: 'YP'
  },
  'SP': {
    bg: '#f57c00',      // 🟠 주황색 (고객사)
    light: '#ffe0b2',
    text: '#e65100',
    border: '#f57c00',
    short: 'SP'
  },
  'User': {
    bg: '#7b1fa2',      // 🟣 보라색 (사용자)
    light: '#e1bee7',
    text: '#4a148c',
    border: '#7b1fa2',
    short: 'USER'
  },
  'USER': {
    bg: '#7b1fa2',      // 🟣 보라색 (사용자) - 대문자 별칭
    light: '#e1bee7',
    text: '#4a148c',
    border: '#7b1fa2',
    short: 'USER'
  },
  // ============ DFMEA 구분 (법규/기본/보조/관능) ============
  '법규': {
    bg: '#c62828',      // 🔴 빨간색 (Regulation - 안전/법규)
    light: '#ffcdd2',
    text: '#b71c1c',
    border: '#c62828',
    short: '법규'
  },
  'Regulation': {
    bg: '#c62828',      // 🔴 빨간색 - 영문
    light: '#ffcdd2',
    text: '#b71c1c',
    border: '#c62828',
    short: '법규'
  },
  '기본': {
    bg: '#1976d2',      // 🔵 파란색 (Primary - 핵심 기능)
    light: '#bbdefb',
    text: '#0d47a1',
    border: '#1976d2',
    short: '기본'
  },
  'Primary': {
    bg: '#1976d2',      // 🔵 파란색 - 영문
    light: '#bbdefb',
    text: '#0d47a1',
    border: '#1976d2',
    short: '기본'
  },
  '보조': {
    bg: '#388e3c',      // 🟢 녹색 (Secondary - 보조 기능)
    light: '#c8e6c9',
    text: '#1b5e20',
    border: '#388e3c',
    short: '보조'
  },
  'Secondary': {
    bg: '#388e3c',      // 🟢 녹색 - 영문
    light: '#c8e6c9',
    text: '#1b5e20',
    border: '#388e3c',
    short: '보조'
  },
  '관능': {
    bg: '#7b1fa2',      // 🟣 보라색 (Sensory - 감성 품질)
    light: '#e1bee7',
    text: '#4a148c',
    border: '#7b1fa2',
    short: '관능'
  },
  'Sensory': {
    bg: '#7b1fa2',      // 🟣 보라색 - 영문
    light: '#e1bee7',
    text: '#4a148c',
    border: '#7b1fa2',
    short: '관능'
  },
};

export const getL1TypeColor = (typeName: string) =>
  L1_TYPE_COLORS[typeName] || { bg: '#1976d2', light: '#bbdefb', text: '#0d47a1', border: '#1976d2', short: typeName };

// ============ 레벨별 헤더/배경 색상 ============

// 구조분석 (2단계) - 파란색 계열
export const STRUCTURE_COLORS = {
  header: '#1976d2',
  headerLight: '#42a5f5',
  cell: '#e3f2fd',
  cellAlt: '#bbdefb',
  text: '#0d47a1',
};

// 기능분석 (3단계) - 녹색 계열
export const FUNCTION_COLORS = {
  // 1L 완제품
  l1Header: '#1b5e20',
  l1Cell: '#e8f5e9',
  // 2L 메인공정
  l2Header: '#2e7d32',
  l2Cell: '#e8f5e9',
  // 3L 작업요소
  l3Header: '#388e3c',
  l3Cell: '#e8f5e9',
  // 공통
  text: '#1b5e20',
};

// ⭐ 요구사항 색상 - 주황색 (2026-01-03 확정)
export const REQUIREMENT_COLORS = {
  bg: '#f57c00',          // 🟠 주황색 (배경)
  light: '#fff3e0',       // 연한 주황색 (셀 배경)
  text: '#e65100',        // 주황색 (텍스트)
  border: '#f57c00',      // 주황색 (테두리)
  zebra: '#ffe0b2',       // 홀수행 배경
};

// 고장분석 (4단계) - 주황/남색 계열
export const FAILURE_COLORS = {
  // 1L 고장영향 (FE)
  l1Header: '#1a237e',
  l1Cell: '#f5f6fc',
  // 2L 고장형태 (FM)
  l2Header: '#e65100',
  l2Cell: '#fff3e0',
  // 3L 고장원인 (FC)
  l3Header: '#e65100',
  l3Cell: '#fff3e0',
  // 공통
  text: '#1a237e',
};

// ============ Tailwind 클래스 버전 (v2.1 표준) ============
export const L1_TYPE_TW: Record<string, { bg: string; light: string; text: string; border: string }> = {
  // ============ PFMEA 구분 ============
  'YP': {
    bg: 'bg-blue-600',        // 🔵 파란색
    light: 'bg-blue-100',
    text: 'text-blue-900',
    border: 'border-blue-600'
  },
  'SP': {
    bg: 'bg-orange-600',      // 🟠 주황색
    light: 'bg-orange-100',
    text: 'text-orange-900',
    border: 'border-orange-600'
  },
  'User': {
    bg: 'bg-purple-700',      // 🟣 보라색
    light: 'bg-purple-100',
    text: 'text-purple-900',
    border: 'border-purple-700'
  },
  // ============ DFMEA 구분 (법규/기본/보조/관능) ============
  '법규': {
    bg: 'bg-red-700',         // 🔴 빨간색 (Regulation)
    light: 'bg-red-100',
    text: 'text-red-900',
    border: 'border-red-700'
  },
  'Regulation': {
    bg: 'bg-red-700',         // 🔴 빨간색 - 영문
    light: 'bg-red-100',
    text: 'text-red-900',
    border: 'border-red-700'
  },
  '기본': {
    bg: 'bg-blue-600',        // 🔵 파란색 (Primary)
    light: 'bg-blue-100',
    text: 'text-blue-900',
    border: 'border-blue-600'
  },
  'Primary': {
    bg: 'bg-blue-600',        // 🔵 파란색 - 영문
    light: 'bg-blue-100',
    text: 'text-blue-900',
    border: 'border-blue-600'
  },
  '보조': {
    bg: 'bg-green-600',       // 🟢 녹색 (Secondary)
    light: 'bg-green-100',
    text: 'text-green-900',
    border: 'border-green-600'
  },
  'Secondary': {
    bg: 'bg-green-600',       // 🟢 녹색 - 영문
    light: 'bg-green-100',
    text: 'text-green-900',
    border: 'border-green-600'
  },
  '관능': {
    bg: 'bg-purple-700',      // 🟣 보라색 (Sensory)
    light: 'bg-purple-100',
    text: 'text-purple-900',
    border: 'border-purple-700'
  },
  'Sensory': {
    bg: 'bg-purple-700',      // 🟣 보라색 - 영문
    light: 'bg-purple-100',
    text: 'text-purple-900',
    border: 'border-purple-700'
  },
};

// 요구사항 Tailwind 클래스
export const REQUIREMENT_TW = {
  bg: 'bg-orange-600',
  light: 'bg-orange-50',
  text: 'text-orange-700',
  border: 'border-orange-500',
};

export const getL1TypeTw = (typeName: string) =>
  L1_TYPE_TW[typeName] || { bg: 'bg-blue-600', light: 'bg-blue-100', text: 'text-blue-900', border: 'border-blue-600' };

// ============ 트리뷰 표준 색상 (공정명/기능/고장) ============

// 구조분석 - 검정 글씨
export const TREE_STRUCTURE = {
  procBg: '#546e7a',        // 공정명 배경 (청회색)
  procText: '#ffffff',      // 공정명 글씨 (흰색)
  itemBg: '#eceff1',        // 하위 아이템 배경 (연회색)
  itemText: '#263238',      // 하위 아이템 글씨 (검정)
  border: '#546e7a',
};

// 기능분석 1L/2L - 녹색 글씨
export const TREE_FUNCTION = {
  procBg: '#2e7d32',        // 공정명 배경 (녹색)
  procText: '#ffffff',      // 공정명 글씨 (흰색)
  itemBg: '#c8e6c9',        // 하위 아이템 배경 (연녹색)
  itemText: '#1b5e20',      // 하위 아이템 글씨 (진녹색)
  border: '#2e7d32',
};

// 기능분석 3L - 주황색 글씨 (공정특성/특별특성)
export const TREE_FUNCTION_L3 = {
  procBg: '#f57c00',        // 공정명 배경 (주황색)
  procText: '#ffffff',      // 공정명 글씨 (흰색)
  itemBg: '#fff3e0',        // 하위 아이템 배경 (연주황색)
  itemBg2: '#ffe0b2',       // 홀수행 배경 (진한 주황색)
  itemText: '#e65100',      // 하위 아이템 글씨 (주황색)
  border: '#f57c00',
};

// 고장분석 - 주황색 글씨
export const TREE_FAILURE = {
  procBg: '#e65100',        // 공정명 배경 (주황색)
  procText: '#ffffff',      // 공정명 글씨 (흰색)
  itemBg: '#ffe0b2',        // 하위 아이템 배경 (연주황색)
  itemText: '#e65100',      // 하위 아이템 글씨 (주황색)
  border: '#e65100',
};

// ========== 줄무늬 색상 표준화 시스템 (v2.0 - 2026-01-05) ==========
/**
 * 🎨 FMEA 워크시트 글로벌 줄무늬 규칙
 * ==========================================
 * 
 * ✅ 적용 원칙:
 * 1. 모든 워크시트 행은 인덱스 기준으로 줄무늬 자동 적용
 * 2. 짝수 행(0,2,4...) = dark 색상 / 홀수 행(1,3,5...) = light 색상
 * 3. rowSpan 병합 셀도 첫 행의 인덱스 기준으로 색상 결정
 * 4. 셀 내부 input/select는 bg-transparent 사용하여 줄무늬 상속
 * 
 * ✅ 색상 타입 (열별 적용):
 * - structure (파란색): 완제품공정명, 메인공정명, 4M, 작업요소
 * - function (녹색): 기능, 공정기능, 작업요소기능
 * - failure (주황색): 요구사항, 제품특성, 공정특성, 고장영향/형태/원인
 * 
 * ✅ 사용법:
 * 1. 행 인덱스 캡처: const rowIdx = globalRowIdx++;
 * 2. 줄무늬 색상 가져오기: const zebra = getZebraColors(rowIdx);
 * 3. 행 스타일: <tr style={{ background: zebra.function }}>
 * 4. 셀 스타일: style={{ background: zebra.structure }}
 * 5. SelectableCell: bgColor={zebra.function}
 * 6. input 태그: className="bg-transparent" (줄무늬 상속)
 * 
 * ✅ 필수 패턴 (각 탭에서 준수):
 * ```tsx
 * let globalRowIdx = 0;
 * return items.map((item, idx) => {
 *   const rowIdx = globalRowIdx++; // 행 인덱스 캡처
 *   const zebra = getZebraColors(rowIdx);
 *   return (
 *     <tr key={item.id} style={{ background: zebra.function }}>
 *       <td style={{ background: zebra.structure }}>...</td>
 *       <SelectableCell bgColor={zebra.function} />
 *     </tr>
 *   );
 * });
 * ```
 */

// 테이블 줄무늬용 색상을 한 곳에서 관리
// ★★★ 2026-01-26 업데이트: 색상 단순화 ★★★
// 1L(완제품)=파란색, 2L(메인공정)=녹색, 3L(작업요소)=주황색
export const ZEBRA_COLORS = {
  // ★ 레벨별 줄무늬 (구조분석 기준)
  L1: { light: '#f0f7ff', dark: '#e3f2fd' },        // 1레벨: 파란색 (완제품)
  L2: { light: '#f1f9f2', dark: '#e8f5e9' },        // 2레벨: 녹색 (메인공정)
  L3: { light: '#fffaf5', dark: '#fff3e0' },        // 3레벨: 주황색 (작업요소/4M)
  // ★ 하위 호환용 (기존 코드에서 사용)
  structure: { light: '#f0f7ff', dark: '#e3f2fd' },  // = L1 (파란색)
  function: { light: '#f1f9f2', dark: '#e8f5e9' },   // = L2 (녹색)
  failure: { light: '#fffaf5', dark: '#fff3e0' },    // = L3 (주황색)
  requirement: { light: '#faf4fc', dark: '#f3e5f5' }, // ★ 보라색 (요구사항 전용)
} as const;

export type ZebraType = keyof typeof ZEBRA_COLORS;

// 인덱스 기반 줄무늬 색상 반환 함수 (모든 타입 한번에)
export const getZebraColors = (idx: number) => ({
  // 레벨별
  L1: idx % 2 === 0 ? ZEBRA_COLORS.L1.dark : ZEBRA_COLORS.L1.light,
  L2: idx % 2 === 0 ? ZEBRA_COLORS.L2.dark : ZEBRA_COLORS.L2.light,
  L3: idx % 2 === 0 ? ZEBRA_COLORS.L3.dark : ZEBRA_COLORS.L3.light,
  // 하위 호환
  structure: idx % 2 === 0 ? ZEBRA_COLORS.structure.dark : ZEBRA_COLORS.structure.light,
  function: idx % 2 === 0 ? ZEBRA_COLORS.function.dark : ZEBRA_COLORS.function.light,
  failure: idx % 2 === 0 ? ZEBRA_COLORS.failure.dark : ZEBRA_COLORS.failure.light,
  requirement: idx % 2 === 0 ? ZEBRA_COLORS.requirement.dark : ZEBRA_COLORS.requirement.light,
});

// 특정 타입의 줄무늬 색상만 반환
export const getZebra = (type: ZebraType, idx: number) =>
  idx % 2 === 0 ? ZEBRA_COLORS[type].dark : ZEBRA_COLORS[type].light;

// Tailwind 클래스 버전 (CSS 클래스로 줄무늬 적용 시 사용)
export const getZebraTw = (type: ZebraType, idx: number) => {
  const map: Record<ZebraType, { even: string; odd: string }> = {
    // 레벨별
    L1: { even: 'bg-blue-200', odd: 'bg-blue-50' },
    L2: { even: 'bg-green-200', odd: 'bg-green-50' },
    L3: { even: 'bg-orange-200', odd: 'bg-orange-50' },
    // 하위 호환
    structure: { even: 'bg-blue-200', odd: 'bg-blue-50' },
    function: { even: 'bg-green-200', odd: 'bg-green-50' },
    failure: { even: 'bg-orange-200', odd: 'bg-orange-50' },
    requirement: { even: 'bg-purple-200', odd: 'bg-purple-50' }, // 보라색
  };
  return idx % 2 === 0 ? map[type].even : map[type].odd;
};

// CSS 변수로 줄무늬 색상 정의 (globals.css에 추가 권장)
export const ZEBRA_CSS_VARS = `
  :root {
    --zebra-structure-light: #e3f2fd;
    --zebra-structure-dark: #bbdefb;
    --zebra-function-light: #e8f5e9;
    --zebra-function-dark: #c8e6c9;
    --zebra-failure-light: #fff3e0;
    --zebra-failure-dark: #ffe0b2;
  }
`;

// 행 컴포넌트에서 사용할 줄무늬 스타일 객체 생성
export const getZebraRowStyle = (idx: number, type: ZebraType = 'function'): React.CSSProperties => ({
  background: getZebra(type, idx),
});

// 셀 컴포넌트에서 사용할 줄무늬 스타일 객체 생성
export const getZebraCellStyle = (idx: number, type: ZebraType): React.CSSProperties => ({
  background: getZebra(type, idx),
});

