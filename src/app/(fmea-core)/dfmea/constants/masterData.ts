/**
 * DFMEA 마스터 기초정보
 * 
 * 출처: 설계FMEA(DFMEA) 기초정보(260108).xlsx
 * 생성일: 2026-01-21
 * 
 * 구조:
 * - 완제품 공정 (완제품 = 타이어)
 *   └── 메인공정 (A'SSY = Package)
 *       └── 작업요소 (부품 = Parts)
 */

// ============================================================
// 1. 완제품 공정 (완제품) - 타이어
// ============================================================
export const PRODUCT_INFO = {
  name: '타이어',
  description: 'Passenger Car Radial Tire',
};

// ============================================================
// 2. 완제품 공정 기능 (완제품 기능)
// ============================================================
export const PRODUCT_FUNCTIONS = [
  '내부 압력을 유지하며 구조적 파열을 방지하는 기능',
  '노면과의 마찰력을 통해 차량을 전진·후진시키는 기능',
  '조향 입력을 노면에 전달하여 차량 진행 방향을 제어하는 기능',
  '제동력을 노면에 전달하여 차량 속도를 감속·정지시키는 기능',
  '노면 입력을 흡수하여 차체 진동을 완화하는 기능',
  '주행 중 발생하는 소음을 억제하여 정숙성을 유지하는 기능',
  '회전 불균형을 억제하여 진동 발생을 저감하는 기능',
  '제품 외형을 유지하여 상품성과 식별성을 확보하는 기능',
] as const;

// ============================================================
// 3. 완제품 공정 요구사항 (완제품 품질특성)
// ============================================================
export const PRODUCT_REQUIREMENTS = [
  '내압 파열 압력',
  '파열 내구 수명',
  '접지계수',
  '구름저항 계수',
  '코너링 강성',
  '슬립각 특성',
  '제동력 계수',
  '제동 응답 시간',
  '수직 강성',
  '진동 전달률',
  '주행 소음 레벨',
  '패턴 소음 지수',
  '동적 불균형량',
  '라디얼 포스 변동',
  '외관 결함 발생률',
  '형상 편차',
] as const;

// ============================================================
// 4. 메인공정 (A'SSY = Package) 마스터 데이터
// ============================================================
export interface FocusElement {
  id: string;
  name: string;
  function: string;
  requirement: string;
  parts: string[];
}

export const FOCUS_ELEMENTS: FocusElement[] = [
  {
    id: 'FE-001',
    name: 'Tread Package',
    function: '노면과 직접 접촉하여 구동력·제동력·조향력을 전달하고, 마모 수명 및 소음·배수 성능을 확보하는 기능',
    requirement: '트레드 접지계수',
    parts: ['Cap Tread', 'Tread Cushion', 'Pattern'],
  },
  {
    id: 'FE-002',
    name: 'Sidewall Package',
    function: '주행 중 굴곡 변형을 허용하여 승차감과 내구성을 확보하고, 외부 충격으로부터 내부 구조를 보호하는 기능',
    requirement: '사이드월 굴곡 피로 수명',
    parts: ['Sidewall', 'Rim Stripe'],
  },
  {
    id: 'FE-003',
    name: 'Inner Liner Package',
    function: '타이어 내부 공기 누설을 방지하여 공기압을 유지하고 주행 안정성을 확보하는 기능',
    requirement: '공기 투과율',
    parts: ['Inner Liner'],
  },
  {
    id: 'FE-004',
    name: 'Bead Package',
    function: '림과 타이어를 견고하게 고정하여 공기압을 유지하고 구동·제동 시 이탈을 방지하는 기능',
    requirement: '비드 체결력',
    parts: ['Bead Wire', 'Bead Filler'],
  },
  {
    id: 'FE-005',
    name: 'Steel Belt Package',
    function: '트레드 하부를 보강하여 접지면 형상을 안정화하고 고속 주행 안정성 및 내마모성을 향상시키는 기능',
    requirement: '스틸벨트 인장 강도',
    parts: ['Steel Belt', 'Edge Tape'],
  },
  {
    id: 'FE-006',
    name: 'Capply Package',
    function: '스틸벨트 상부에서 원심력에 의한 벨트 팽창을 억제하여 고속 내구성과 균일성을 확보하는 기능',
    requirement: '캡플라이 장력',
    parts: ['Capply'],
  },
  {
    id: 'FE-007',
    name: 'Body Ply Package',
    function: '타이어 기본 골격을 형성하여 하중을 지지하고 전체 구조 강도 및 형상 안정성을 유지하는 기능',
    requirement: '바디플라이 인장 강도',
    parts: ['Body Ply'],
  },
];

// ============================================================
// 5. 작업요소 (부품) 마스터 데이터
// ============================================================
export interface PartInfo {
  id: string;
  name: string;
  focusElementId: string;
  functions: string[];
  requirements: string[];
}

export const PARTS: PartInfo[] = [
  // Tread Package 부품
  {
    id: 'PT-001',
    name: 'Cap Tread',
    focusElementId: 'FE-001',
    functions: [
      '마모 수명, 접지력, 제동 성능 및 내열성을 만족하도록 규정된 고무 물성을 제공하는 기능',
      '설계된 접지 면적을 확보하여 균일한 접지 압력과 주행 안정성을 확보하는 기능',
      '중앙부 접지 안정성을 확보하여 직진 안정성과 편마모를 방지하는 기능',
      '마모 수명 및 내구성을 확보하고 과열을 방지하는 기능',
      '가류 후 규정 외경을 만족하여 조립성 및 균일성을 확보하는 기능',
      '회전 균형과 연비 성능을 저해하지 않도록 질량을 관리하는 기능',
    ],
    requirements: ['컴파운드', '전폭', 'Crown폭', '두께', '길이', '중량'],
  },
  {
    id: 'PT-002',
    name: 'Tread Cushion',
    focusElementId: 'FE-001',
    functions: [
      '트레드와 벨트층 사이의 응력을 완화하여 내구성을 향상시키는 기능',
      '충격 흡수 특성을 확보하여 승차감과 피로 내구성을 향상시키는 기능',
    ],
    requirements: ['두께', '물성'],
  },
  {
    id: 'PT-003',
    name: 'Pattern',
    focusElementId: 'FE-001',
    functions: [
      '배수 성능을 확보하여 수막현상을 방지하고 제동력을 확보하는 기능',
      '블록 강성을 조절하여 소음 저감과 접지력 향상을 확보하는 기능',
      '패턴 소음을 분산시켜 주행 소음 및 진동을 저감하는 기능',
    ],
    requirements: ['Groove', 'Kerf', 'Pitch 배열'],
  },
  // Sidewall Package 부품
  {
    id: 'PT-004',
    name: 'Sidewall',
    focusElementId: 'FE-002',
    functions: [
      '굴곡 변형 내구성을 확보하여 파손을 방지하는 기능',
      '외부 충격 및 하중으로부터 내부 구조를 보호하는 기능',
      '주행 중 변형을 허용하여 승차감을 확보하는 기능',
    ],
    requirements: ['두께', '강도', '유연성'],
  },
  {
    id: 'PT-005',
    name: 'Rim Stripe',
    focusElementId: 'FE-002',
    functions: [
      '림 접촉부를 보호하여 스크래치 및 마모를 방지하는 기능',
      '림 보호 기능이 정확히 발현되도록 외관 품질을 유지하는 기능',
    ],
    requirements: ['형상', '위치 정확도'],
  },
  // Inner Liner Package 부품
  {
    id: 'PT-006',
    name: 'Inner Liner',
    focusElementId: 'FE-003',
    functions: [
      '공기 누설을 방지하여 공기압을 유지하는 기능',
      '내압 성능을 확보하고 내구성을 유지하는 기능',
    ],
    requirements: ['기밀성', '두께'],
  },
  // Bead Package 부품
  {
    id: 'PT-007',
    name: 'Bead Wire',
    focusElementId: 'FE-004',
    functions: [
      '림과 타이어를 견고하게 고정하여 이탈을 방지하는 기능',
      '균일한 체결력을 확보하여 공기압 유지 성능을 확보하는 기능',
    ],
    requirements: ['강도', '권선 형상'],
  },
  {
    id: 'PT-008',
    name: 'Bead Filler',
    focusElementId: 'FE-004',
    functions: [
      '비드부 강성을 보강하여 조향 응답성을 향상시키는 기능',
      '비드부 하중 분산을 통해 주행 안정성을 확보하는 기능',
    ],
    requirements: ['강성', '형상'],
  },
  // Steel Belt Package 부품
  {
    id: 'PT-009',
    name: 'Steel Belt',
    focusElementId: 'FE-005',
    functions: [
      '트레드 하부를 보강하여 고속 주행 안정성을 확보하는 기능',
      '접지면 형상을 안정화하여 균일 마모를 확보하는 기능',
      '하중 분산을 통해 내구성과 직진 안정성을 확보하는 기능',
    ],
    requirements: ['강도', '각도', '배열'],
  },
  {
    id: 'PT-010',
    name: 'Edge Tape',
    focusElementId: 'FE-005',
    functions: [
      '스틸벨트 단부를 충분히 보호하여 손상을 방지하는 기능',
      '주행 중 박리를 방지하여 내구성을 확보하는 기능',
    ],
    requirements: ['폭', '접착력'],
  },
  // Capply Package 부품
  {
    id: 'PT-011',
    name: 'Capply',
    focusElementId: 'FE-006',
    functions: [
      '고속 회전 시 벨트 팽창을 억제하는 기능',
      '고속 주행 내구성과 균일성을 확보하는 기능',
    ],
    requirements: ['장력', '배열'],
  },
  // Body Ply Package 부품
  {
    id: 'PT-012',
    name: 'Body Ply',
    focusElementId: 'FE-007',
    functions: [
      '타이어의 기본 골격을 형성하여 하중을 지지하는 기능',
      '전체 구조 강도와 형상 안정성을 유지하는 기능',
    ],
    requirements: ['강도', '코드 배열'],
  },
];

// ============================================================
// 6. 고장 영향 (Failure Effects) - 최종사용자/차량수준
// ============================================================
export const FAILURE_EFFECTS = [
  { id: 'FE-S10', effect: '주행 중 파열', severity: 10 },
  { id: 'FE-S10-2', effect: '차량 제어 상실', severity: 10 },
  { id: 'FE-S7', effect: '가속 성능 저하', severity: 7 },
  { id: 'FE-S6', effect: '연비 저하', severity: 6 },
  { id: 'FE-S8', effect: '조향 응답성 저하', severity: 8 },
  { id: 'FE-S8-2', effect: '선회 안정성 저하', severity: 8 },
  { id: 'FE-S9', effect: '제동 성능 저하', severity: 9 },
  { id: 'FE-S9-2', effect: '제동 거리 증가', severity: 9 },
  { id: 'FE-S5', effect: '승차감 저하', severity: 5 },
  { id: 'FE-S5-2', effect: '차체 진동 증가', severity: 5 },
  { id: 'FE-S4', effect: '실내 소음 증가', severity: 4 },
  { id: 'FE-S4-2', effect: 'NVH 성능 저하', severity: 4 },
  { id: 'FE-S6-2', effect: '주행 진동 발생', severity: 6 },
  { id: 'FE-S6-3', effect: '조향 휠 진동', severity: 6 },
  { id: 'FE-S3', effect: '외관 품질 저하', severity: 3 },
  { id: 'FE-S3-2', effect: '상품성 저하', severity: 3 },
] as const;

// ============================================================
// 7. 고장 형태 (Failure Modes) - 부품수준
// ============================================================
export const FAILURE_MODES = [
  // 마찰/접지 관련
  { id: 'FM-001', mode: '저마찰', category: 'traction' },
  { id: 'FM-002', mode: '접지력저하', category: 'traction' },
  // 마모 관련
  { id: 'FM-003', mode: '조기마모', category: 'wear' },
  { id: 'FM-004', mode: '편마모', category: 'wear' },
  // 배수 관련
  { id: 'FM-005', mode: '수막현상', category: 'drainage' },
  { id: 'FM-006', mode: '배수저하', category: 'drainage' },
  // 소음 관련
  { id: 'FM-007', mode: '소음증가', category: 'nvh' },
  { id: 'FM-008', mode: '공명소음', category: 'nvh' },
  // 내구/파손 관련
  { id: 'FM-009', mode: '피로균열', category: 'durability' },
  { id: 'FM-010', mode: '파열', category: 'durability' },
  { id: 'FM-011', mode: '강도저하', category: 'durability' },
  { id: 'FM-012', mode: '인장파단', category: 'durability' },
  // 두께/형상 관련
  { id: 'FM-013', mode: '두께 비균일(Thickness Non-uniformity)', category: 'geometry' },
  { id: 'FM-014', mode: '국부응력', category: 'geometry' },
  // 기밀/압력 관련
  { id: 'FM-015', mode: '공기누설', category: 'sealing' },
  { id: 'FM-016', mode: '기밀저하', category: 'sealing' },
  { id: 'FM-017', mode: '내압저하', category: 'sealing' },
  { id: 'FM-018', mode: '압력손실', category: 'sealing' },
  { id: 'FM-019', mode: '라이너손상', category: 'sealing' },
  // 비드/체결 관련
  { id: 'FM-020', mode: '체결불량', category: 'bead' },
  { id: 'FM-021', mode: '슬립', category: 'bead' },
  { id: 'FM-022', mode: '와이어파단', category: 'bead' },
  { id: 'FM-023', mode: '비드이탈', category: 'bead' },
  { id: 'FM-024', mode: '시트손상', category: 'bead' },
  // 벨트 관련
  { id: 'FM-025', mode: '벨트파단', category: 'belt' },
  { id: 'FM-026', mode: '각도편차', category: 'belt' },
  { id: 'FM-027', mode: '접지변형', category: 'belt' },
  { id: 'FM-028', mode: '배열불균일', category: 'belt' },
  { id: 'FM-029', mode: '응력집중', category: 'belt' },
  // 캡플라이 관련
  { id: 'FM-030', mode: '장력불균일', category: 'capply' },
  { id: 'FM-031', mode: '진동발생', category: 'capply' },
  { id: 'FM-032', mode: '과다팽창', category: 'capply' },
  { id: 'FM-033', mode: '내구저하', category: 'capply' },
  { id: 'FM-034', mode: '배열편차', category: 'capply' },
  { id: 'FM-035', mode: '불균형', category: 'capply' },
  // 플라이 관련
  { id: 'FM-036', mode: '플라이파단', category: 'ply' },
  { id: 'FM-037', mode: '형상불안정', category: 'ply' },
  { id: 'FM-038', mode: '과도변형', category: 'ply' },
  { id: 'FM-039', mode: '구조붕괴', category: 'ply' },
] as const;

// ============================================================
// 8. 고장 원인 (Failure Causes) - 설계 오류
// ============================================================
export const FAILURE_CAUSES = [
  // 컴파운드/물성 관련
  { id: 'FC-001', cause: '컴파운드 선정 편차', category: 'material' },
  { id: 'FC-002', cause: '물성 예측범위 이탈', category: 'material' },
  // 치수 설계 관련
  { id: 'FC-003', cause: '전폭 설계치 산정 편차', category: 'dimension' },
  { id: 'FC-004', cause: '공차 정의 부적합', category: 'dimension' },
  { id: 'FC-005', cause: 'Crown 폭 설계치 산정 편차', category: 'dimension' },
  { id: 'FC-006', cause: '접지압 분포 해석 정확도 저하', category: 'analysis' },
  { id: 'FC-007', cause: '두께 설계치 산정 편차', category: 'dimension' },
  { id: 'FC-008', cause: '열발생 해석 정확도 저하', category: 'analysis' },
  { id: 'FC-009', cause: '길이 설계치 산정 편차', category: 'dimension' },
  { id: 'FC-010', cause: '가류 수축률 예측 오차', category: 'process' },
  { id: 'FC-011', cause: '중량 설계치 산정 편차', category: 'dimension' },
  { id: 'FC-012', cause: '질량 분포 해석 오차', category: 'analysis' },
  // 쿠션 관련
  { id: 'FC-013', cause: '쿠션 두께 설계치 산정 편차', category: 'cushion' },
  { id: 'FC-014', cause: '응력 완화 모델링 정확도 저하', category: 'analysis' },
  { id: 'FC-015', cause: '쿠션 물성 선정 편차', category: 'cushion' },
  { id: 'FC-016', cause: '계면 접착 거동 예측 오차', category: 'interface' },
  // 패턴 관련
  { id: 'FC-017', cause: 'Groove 형상 설계 편차', category: 'pattern' },
  { id: 'FC-018', cause: '유효 배수 단면 산정 오차', category: 'pattern' },
  { id: 'FC-019', cause: 'Kerf 형상 설계 편차', category: 'pattern' },
  { id: 'FC-020', cause: '블록 강성 예측 정확도 저하', category: 'analysis' },
  { id: 'FC-021', cause: 'Pitch 배열 설계 편차', category: 'pattern' },
  { id: 'FC-022', cause: 'NVH 예측 모델 정확도 저하', category: 'analysis' },
  // 사이드월 관련
  { id: 'FC-023', cause: '사이드월 두께 설계치 산정 편차', category: 'sidewall' },
  { id: 'FC-024', cause: '굴곡 피로 수명 예측 오차', category: 'analysis' },
  { id: 'FC-025', cause: '사이드월 강도 설계치 산정 편차', category: 'sidewall' },
  { id: 'FC-026', cause: '충격 하중 조건 가정 오차', category: 'analysis' },
  { id: 'FC-027', cause: '사이드월 탄성률 설계치 산정 편차', category: 'sidewall' },
  { id: 'FC-028', cause: '강성–승차감 상관 모델 오차', category: 'analysis' },
  // 림스트립 관련
  { id: 'FC-029', cause: '림스트립 형상 설계 편차', category: 'rimstripe' },
  { id: 'FC-030', cause: '보호 영역 커버리지 산정 오차', category: 'rimstripe' },
  { id: 'FC-031', cause: '림스트립 위치 기준 설정 편차', category: 'rimstripe' },
  { id: 'FC-032', cause: '금형 기준 좌표 정의 오차', category: 'tooling' },
  // 이너라이너 관련
  { id: 'FC-033', cause: '기밀 재질 선정 편차', category: 'innerliner' },
  { id: 'FC-034', cause: '공기 투과 거동 예측 오차', category: 'analysis' },
  { id: 'FC-035', cause: '이너라이너 두께 설계치 산정 편차', category: 'innerliner' },
  { id: 'FC-036', cause: '두께 비균일 허용범위 설정 부적합', category: 'tolerance' },
  // 비드 관련
  { id: 'FC-037', cause: '비드와이어 강도 등급 선정 편차', category: 'bead' },
  { id: 'FC-038', cause: '체결력 예측 모델 오차', category: 'analysis' },
  { id: 'FC-039', cause: '권선 형상 설계 편차', category: 'bead' },
  { id: 'FC-040', cause: '비드 시트 접촉 모델링 오차', category: 'analysis' },
  { id: 'FC-041', cause: '비드필러 강성 설계치 산정 편차', category: 'bead' },
  { id: 'FC-042', cause: '조향 응답 예측 정확도 저하', category: 'analysis' },
  { id: 'FC-043', cause: '비드필러 형상 설계 편차', category: 'bead' },
  { id: 'FC-044', cause: '응력 분산 형상 모델링 오차', category: 'analysis' },
  // 스틸벨트 관련
  { id: 'FC-045', cause: '스틸벨트 강도 등급 선정 편차', category: 'belt' },
  { id: 'FC-046', cause: '고속 내구 예측 모델 정확도 저하', category: 'analysis' },
  { id: 'FC-047', cause: '벨트 각도 설계치 산정 편차', category: 'belt' },
  { id: 'FC-048', cause: '코너링 강성 예측 오차', category: 'analysis' },
  { id: 'FC-049', cause: '벨트 배열 설계 편차', category: 'belt' },
  { id: 'FC-050', cause: '벨트 편심 허용범위 설정 부적합', category: 'tolerance' },
  // 엣지테이프 관련
  { id: 'FC-051', cause: '엣지테이프 폭 설계치 산정 편차', category: 'edgetape' },
  { id: 'FC-052', cause: '단부 보호 여유치 산정 오차', category: 'edgetape' },
  { id: 'FC-053', cause: '접착 강도 설계치 산정 편차', category: 'interface' },
  { id: 'FC-054', cause: '온도 의존 접착 거동 예측 오차', category: 'analysis' },
  // 캡플라이 관련
  { id: 'FC-055', cause: '캡플라이 장력 설계치 산정 편차', category: 'capply' },
  { id: 'FC-056', cause: '팽창 억제 거동 예측 오차', category: 'analysis' },
  { id: 'FC-057', cause: '캡플라이 배열 설계 편차', category: 'capply' },
  { id: 'FC-058', cause: '배열 균일도 허용범위 설정 부적합', category: 'tolerance' },
  // 바디플라이 관련
  { id: 'FC-059', cause: '바디플라이 강도 등급 선정 편차', category: 'bodyply' },
  { id: 'FC-060', cause: '하중 지지 거동 예측 오차', category: 'analysis' },
  { id: 'FC-061', cause: '코드 배열 각도 설계 편차', category: 'bodyply' },
  { id: 'FC-062', cause: '형상 안정 거동 예측 오차', category: 'analysis' },
] as const;

// ============================================================
// 9. 예방관리 (Prevention Controls) - 설계 검증
// ============================================================
export const PREVENTION_CONTROLS = [
  // 컴파운드/물성 관련
  { id: 'PC-001', control: '표준 컴파운드 물성 DB 기반 설계 승인 절차 적용', category: 'design_std' },
  { id: 'PC-002', control: '실차·실험 데이터 기반 물성 예측 모델 보정', category: 'model_validation' },
  // 치수 설계 관련
  { id: 'PC-003', control: '차량 하중·림 규격 반영 설계 계산식 표준화', category: 'design_std' },
  { id: 'PC-004', control: '전폭 공차 기준서 및 설계 리뷰 체크리스트 적용', category: 'design_review' },
  { id: 'PC-005', control: '접지압 분포 해석 결과 반영 설계 검증', category: 'cae_verification' },
  { id: 'PC-006', control: '해석 모델–실차 시험 상관성 검증 수행', category: 'model_validation' },
  { id: 'PC-007', control: '마모·내구 목표 연계 두께 설계 기준 적용', category: 'design_std' },
  { id: 'PC-008', control: '열-내구 연성 해석 모델 검증 및 보정', category: 'cae_verification' },
  { id: 'PC-009', control: '가류 후 외경 목표 기반 길이 산정 기준 적용', category: 'design_std' },
  { id: 'PC-010', control: '공정별 수축률 데이터 피드백 반영', category: 'process_feedback' },
  { id: 'PC-011', control: '중량 목표 관리 시트 및 설계 단계 중량 계산 검증', category: 'design_review' },
  { id: 'PC-012', control: '회전 밸런스 해석 모델 검증 및 시험 상관 확인', category: 'model_validation' },
  // 쿠션 관련
  { id: 'PC-013', control: '응력 완화 목적별 쿠션 두께 설계 가이드 적용', category: 'design_std' },
  { id: 'PC-014', control: '응력 분포 해석 결과와 내구 시험 상관 검증', category: 'cae_verification' },
  { id: 'PC-015', control: '쿠션 전용 물성 사양서 및 승인 프로세스 적용', category: 'material_spec' },
  { id: 'PC-016', control: '계면 박리 시험 결과 기반 설계 검증', category: 'test_feedback' },
  // 패턴 관련
  { id: 'PC-017', control: '배수 성능 기준 반영 패턴 설계 규칙 적용', category: 'design_std' },
  { id: 'PC-018', control: 'CFD 해석 기반 배수 성능 검증 수행', category: 'cae_verification' },
  { id: 'PC-019', control: '블록 강성 목표 반영 Kerf 설계 가이드 적용', category: 'design_std' },
  { id: 'PC-020', control: '강성 해석–제동 시험 상관성 검증', category: 'model_validation' },
  { id: 'PC-021', control: '소음 분산 알고리즘 적용 설계 검증', category: 'design_std' },
  { id: 'PC-022', control: '실차 NVH 시험 결과 기반 모델 보정', category: 'test_feedback' },
  // 사이드월 관련
  { id: 'PC-023', control: '굴곡 피로 목표 반영 두께 설계 기준 적용', category: 'design_std' },
  { id: 'PC-024', control: '굴곡 피로 시험 데이터 기반 수명 모델 보정', category: 'model_validation' },
  { id: 'PC-025', control: '충격 하중 조건 반영 강도 설계 검증', category: 'cae_verification' },
  { id: 'PC-026', control: '실차 충격 시험 결과 설계 반영', category: 'test_feedback' },
  { id: 'PC-027', control: '승차감 목표 연계 탄성률 설계 가이드 적용', category: 'design_std' },
  { id: 'PC-028', control: '승차감 평가 시험과 해석 상관 검증', category: 'model_validation' },
  // 림스트립 관련
  { id: 'PC-029', control: '림 보호 범위 기준 반영 형상 설계 검증', category: 'design_std' },
  { id: 'PC-030', control: '림 접촉 위치 분석 결과 설계 반영', category: 'cae_verification' },
  { id: 'PC-031', control: '금형 기준점 설계 표준 적용', category: 'design_std' },
  { id: 'PC-032', control: '3D CAD 기준 좌표 일관성 검증', category: 'design_review' },
  // 이너라이너 관련
  { id: 'PC-033', control: '기밀 전용 재질 승인 목록 운영', category: 'material_spec' },
  { id: 'PC-034', control: '투과율 시험 데이터 기반 예측 모델 보정', category: 'model_validation' },
  { id: 'PC-035', control: '내압 유지 목표 반영 두께 설계 기준 적용', category: 'design_std' },
  { id: 'PC-036', control: '두께 편차 허용 기준 및 설계 리뷰 강화', category: 'design_review' },
  // 비드 관련
  { id: 'PC-037', control: '림 체결력 시험 결과 기반 강도 등급 선정', category: 'test_feedback' },
  { id: 'PC-038', control: '체결력 해석–시험 상관 검증', category: 'model_validation' },
  { id: 'PC-039', control: '비드 시트 형상 기준 반영 설계 가이드 적용', category: 'design_std' },
  { id: 'PC-040', control: '접촉 해석 모델 검증 및 보정', category: 'cae_verification' },
  { id: 'PC-041', control: '조향 응답 목표 연계 강성 설계 기준 적용', category: 'design_std' },
  { id: 'PC-042', control: '조향 응답 시험 데이터 기반 모델 보정', category: 'model_validation' },
  { id: 'PC-043', control: '응력 분산 목적 형상 설계 가이드 적용', category: 'design_std' },
  { id: 'PC-044', control: '국부 응력 해석 결과 설계 검증', category: 'cae_verification' },
  // 스틸벨트 관련
  { id: 'PC-045', control: '고속 내구 시험 결과 기반 강도 등급 선정', category: 'test_feedback' },
  { id: 'PC-046', control: '고속 내구 해석–시험 상관 검증', category: 'model_validation' },
  { id: 'PC-047', control: '코너링 성능 목표 반영 각도 설계 기준 적용', category: 'design_std' },
  { id: 'PC-048', control: '조향 성능 시험 결과 설계 피드백', category: 'test_feedback' },
  { id: 'PC-049', control: '접지 형상 안정 기준 반영 배열 설계 가이드 적용', category: 'design_std' },
  { id: 'PC-050', control: '편심 허용 기준 재정의 및 설계 리뷰 강화', category: 'design_review' },
  // 엣지테이프 관련
  { id: 'PC-051', control: '벨트 단부 보호 기준 반영 폭 설계 검증', category: 'design_std' },
  { id: 'PC-052', control: '단부 박리 시험 결과 설계 반영', category: 'test_feedback' },
  { id: 'PC-053', control: '접착 강도 사양 기준서 적용', category: 'material_spec' },
  { id: 'PC-054', control: '고온·저온 접착 시험 결과 모델 보정', category: 'model_validation' },
  // 캡플라이 관련
  { id: 'PC-055', control: '고속 팽창 억제 목표 연계 장력 설계 기준 적용', category: 'design_std' },
  { id: 'PC-056', control: '고속 팽창 시험 결과 해석 반영', category: 'test_feedback' },
  { id: 'PC-057', control: '균일도 기준 반영 배열 설계 가이드 적용', category: 'design_std' },
  { id: 'PC-058', control: '배열 편차 허용 기준 재정의', category: 'design_review' },
  // 바디플라이 관련
  { id: 'PC-059', control: '하중 지지 시험 결과 기반 강도 등급 선정', category: 'test_feedback' },
  { id: 'PC-060', control: '하중–변형 해석 모델 검증', category: 'model_validation' },
  { id: 'PC-061', control: '형상 안정 목표 반영 배열 각도 설계 기준 적용', category: 'design_std' },
  { id: 'PC-062', control: '형상 안정 시험 결과 설계 피드백', category: 'test_feedback' },
] as const;

// ============================================================
// 10. 검출관리 (Detection Controls) - 설계 검증 시험
// ============================================================
export const DETECTION_CONTROLS = [
  // 성능 시험
  { id: 'DC-001', control: '마찰계수 시험(드라이·웨트 제동 시험)', category: 'performance' },
  { id: 'DC-002', control: '실차 가속·제동 성능 평가', category: 'vehicle_test' },
  { id: 'DC-003', control: '실차 내구 주행 마모 시험', category: 'vehicle_test' },
  { id: 'DC-004', control: '편마모 패턴 분석 및 정렬 시험', category: 'performance' },
  { id: 'DC-005', control: '수막 저항(Hydroplaning) 시험', category: 'performance' },
  { id: 'DC-006', control: 'CFD 기반 배수 성능 시뮬레이션', category: 'cae_analysis' },
  // NVH 시험
  { id: 'DC-007', control: '실차 패스바이 소음 시험', category: 'nvh' },
  { id: 'DC-008', control: 'NVH 주파수 분석 시험', category: 'nvh' },
  // 내구/강도 시험
  { id: 'DC-009', control: '굴곡 피로 내구 시험', category: 'durability' },
  { id: 'DC-010', control: '고속 내구 및 파열 시험', category: 'durability' },
  { id: 'DC-011', control: '인장 강도 시험', category: 'strength' },
  { id: 'DC-012', control: '충격 파손 시험(커브 임팩트)', category: 'durability' },
  // 검사/측정
  { id: 'DC-013', control: 'X-ray 두께 분포 검사', category: 'inspection' },
  { id: 'DC-014', control: '구조 해석(FEA) 응력 집중 분석', category: 'cae_analysis' },
  // 기밀 시험
  { id: 'DC-015', control: '공기 투과율 시험', category: 'sealing' },
  { id: 'DC-016', control: '기밀성 누설 시험', category: 'sealing' },
  { id: 'DC-017', control: '장기 내압 유지 시험', category: 'sealing' },
  { id: 'DC-018', control: '압력 감쇠 모니터링 시험', category: 'sealing' },
  { id: 'DC-019', control: '단면 절단 두께 측정', category: 'inspection' },
  { id: 'DC-020', control: 'X-ray 내부 결함 검사', category: 'inspection' },
  // 비드 시험
  { id: 'DC-021', control: '비드 체결력 시험', category: 'bead' },
  { id: 'DC-022', control: '림 슬립 시험', category: 'bead' },
  { id: 'DC-023', control: '비드 인장 강도 시험', category: 'strength' },
  { id: 'DC-024', control: '파단 하중 시험', category: 'strength' },
  { id: 'DC-025', control: '비드 이탈 시험', category: 'bead' },
  { id: 'DC-026', control: '림 시트 접촉 손상 평가', category: 'inspection' },
  // 벨트 시험
  { id: 'DC-027', control: '벨트 인장 파단 시험', category: 'strength' },
  { id: 'DC-028', control: '고속 내구 시험', category: 'durability' },
  { id: 'DC-029', control: 'X-ray 벨트 각도 측정', category: 'inspection' },
  { id: 'DC-030', control: '접지면 압력 분포 측정', category: 'performance' },
  { id: 'DC-031', control: 'X-ray 배열 균일도 검사', category: 'inspection' },
  { id: 'DC-032', control: '구조 해석(FEA) 응력 집중 검증', category: 'cae_analysis' },
  // 캡플라이 시험
  { id: 'DC-033', control: '캡플라이 장력 측정 시험', category: 'strength' },
  { id: 'DC-034', control: '고속 회전 진동 시험', category: 'nvh' },
  { id: 'DC-035', control: '고속 팽창 시험', category: 'durability' },
  { id: 'DC-036', control: 'X-ray 캡플라이 배열 검사', category: 'inspection' },
  { id: 'DC-037', control: '동적 밸런스 시험', category: 'nvh' },
  // 플라이 시험
  { id: 'DC-038', control: '플라이 인장 파단 시험', category: 'strength' },
  { id: 'DC-039', control: '정적 하중 시험', category: 'strength' },
  { id: 'DC-040', control: 'X-ray 코드 각도 검사', category: 'inspection' },
  { id: 'DC-041', control: '형상 안정성 시험', category: 'performance' },
  { id: 'DC-042', control: '정적 변형 시험', category: 'performance' },
  { id: 'DC-043', control: '파괴 하중 시험', category: 'strength' },
] as const;

// ============================================================
// 11. 헬퍼 함수들
// ============================================================

/**
 * 메인공정ID로 해당 메인공정 조회
 */
export function getFocusElementById(id: string): FocusElement | undefined {
  return FOCUS_ELEMENTS.find(fe => fe.id === id);
}

/**
 * 메인공정명으로 해당 메인공정 조회
 */
export function getFocusElementByName(name: string): FocusElement | undefined {
  return FOCUS_ELEMENTS.find(fe => fe.name === name);
}

/**
 * 메인공정에 속한 부품 목록 조회
 */
export function getPartsByFocusElement(focusElementId: string): PartInfo[] {
  return PARTS.filter(p => p.focusElementId === focusElementId);
}

/**
 * 부품명으로 해당 부품 조회
 */
export function getPartByName(name: string): PartInfo | undefined {
  return PARTS.find(p => p.name === name);
}

/**
 * 부품ID로 해당 부품 조회
 */
export function getPartById(id: string): PartInfo | undefined {
  return PARTS.find(p => p.id === id);
}

/**
 * 카테고리별 고장형태 조회
 */
export function getFailureModesByCategory(category: string): typeof FAILURE_MODES[number][] {
  return FAILURE_MODES.filter(fm => fm.category === category);
}

/**
 * 카테고리별 고장원인 조회
 */
export function getFailureCausesByCategory(category: string): typeof FAILURE_CAUSES[number][] {
  return FAILURE_CAUSES.filter(fc => fc.category === category);
}

/**
 * 카테고리별 예방관리 조회
 */
export function getPreventionControlsByCategory(category: string): typeof PREVENTION_CONTROLS[number][] {
  return PREVENTION_CONTROLS.filter(pc => pc.category === category);
}

/**
 * 카테고리별 검출관리 조회
 */
export function getDetectionControlsByCategory(category: string): typeof DETECTION_CONTROLS[number][] {
  return DETECTION_CONTROLS.filter(dc => dc.category === category);
}

// ============================================================
// 12. 기본 Export
// ============================================================
export default {
  PRODUCT_INFO,
  PRODUCT_FUNCTIONS,
  PRODUCT_REQUIREMENTS,
  FOCUS_ELEMENTS,
  PARTS,
  FAILURE_EFFECTS,
  FAILURE_MODES,
  FAILURE_CAUSES,
  PREVENTION_CONTROLS,
  DETECTION_CONTROLS,
};
