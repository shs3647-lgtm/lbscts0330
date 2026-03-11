/**
 * @file defaultItems.ts
 * @description DataSelectModal에서 사용하는 기본 데이터 항목
 */

export interface DataItem {
  id: string;
  value: string;
  category?: string;
  belongsTo?: string;
  processNo?: string;
}

export const ITEM_CODE_LABELS: Record<string, { label: string; category: string; level: 'L1' | 'L2' | 'L3' }> = {
  C1: { label: '구분', category: 'C', level: 'L1' },
  C2: { label: '완제품 기능', category: 'C', level: 'L1' },
  C3: { label: '요구사항', category: 'C', level: 'L1' },
  C4: { label: '고장영향', category: 'C', level: 'L1' },
  A3: { label: '공정 기능', category: 'A', level: 'L2' },
  FE1: { label: 'FE 구분', category: 'FE', level: 'L1' },
  FE2: { label: '고장영향(FE)', category: 'FE', level: 'L1' },
  FM1: { label: '고장형태(FM)', category: 'FM', level: 'L2' },
  FC1: { label: '고장원인(FC)', category: 'FC', level: 'L3' },
  A4: { label: '제품특성', category: 'A', level: 'L2' },
  A5: { label: '고장형태', category: 'A', level: 'L2' },
  A6: { label: '검출관리', category: 'A', level: 'L2' },
  SP: { label: '특별특성', category: 'S', level: 'L2' },
  B2: { label: '작업요소 기능', category: 'B', level: 'L3' },
  B3: { label: '공정특성', category: 'B', level: 'L3' },
  B4: { label: '고장원인', category: 'B', level: 'L3' },
  B5: { label: '예방관리', category: 'B', level: 'L3' },
  B6: { label: '검출관리', category: 'B', level: 'L3' },
  SC: { label: '특별특성', category: 'S', level: 'L2' },
  S1: { label: '심각도', category: 'S', level: 'L1' },
};

export const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  '기본': { bg: '#e8f5e9', text: '#2e7d32' },
  '추가': { bg: '#fff3e0', text: '#e65100' },
  '워크시트': { bg: '#ffebee', text: '#c62828' },
};

// C1: 구분 (YP / SP / User) - 약어로 통일
const C1_ITEMS: DataItem[] = [
  { id: 'C1_1', value: 'YP', category: '기본', belongsTo: 'Your Plant' },
  { id: 'C1_2', value: 'SP', category: '기본', belongsTo: 'Ship to Plant' },
  { id: 'C1_3', value: 'User', category: '기본', belongsTo: 'User' },
];

// C2: 완제품 기능
const C2_ITEMS: DataItem[] = [
  { id: 'C2_1', value: '규격에 맞는 재료를 투입한다', category: '기본', belongsTo: 'Your Plant' },
  { id: 'C2_2', value: '일관된 배합 품질을 유지한다', category: '기본', belongsTo: 'Your Plant' },
  { id: 'C2_4', value: '차량에 장착 가능한 형상을 제공한다', category: '기본', belongsTo: 'Ship to Plant' },
  { id: 'C2_5', value: '규격 치수를 유지한다', category: '기본', belongsTo: 'Ship to Plant' },
  { id: 'C2_7', value: '주행 중 안전성을 확보한다', category: '기본', belongsTo: 'User' },
  { id: 'C2_8', value: '동력을 전달한다', category: '기본', belongsTo: 'User' },
];

// C3: 요구사항
const C3_ITEMS: DataItem[] = [
  { id: 'C3_1', value: '재료 규격 ±0.5mm 이내', category: '기본', belongsTo: 'Your Plant' },
  { id: 'C3_2', value: '배합비 오차 ±2% 이내', category: '기본', belongsTo: 'Your Plant' },
  { id: 'C3_3', value: '공정 온도 180±5℃', category: '기본', belongsTo: 'Your Plant' },
  { id: 'C3_5', value: '외경 치수 Ø50±0.1mm', category: '기본', belongsTo: 'Ship to Plant' },
  { id: 'C3_6', value: '표면 조도 Ra 1.6 이하', category: '기본', belongsTo: 'Ship to Plant' },
  { id: 'C3_8', value: '내구 수명 10만km 이상', category: '기본', belongsTo: 'User' },
  { id: 'C3_9', value: '안전 하중 500kgf 이상', category: '기본', belongsTo: 'User' },
];

// SP: 특별특성
const SP_ITEMS: DataItem[] = [
  { id: 'SP_1', value: 'CC (중요 특성)', category: '기본' },
  { id: 'SP_2', value: 'SC (안전 특성)', category: '기본' },
  { id: 'SP_3', value: 'HC (중점 관리)', category: '기본' },
  { id: 'SP_4', value: '-', category: '기본' },
];

// FE1: FE 구분 (YP / SP / User) - 약어로 통일
const FE1_ITEMS: DataItem[] = [
  { id: 'FE1_1', value: 'YP', category: '기본', belongsTo: 'Your Plant' },
  { id: 'FE1_2', value: 'SP', category: '기본', belongsTo: 'Ship to Plant' },
  { id: 'FE1_3', value: 'User', category: '기본', belongsTo: 'User' },
];

// FE2: 고장영향(FE)
const FE2_ITEMS: DataItem[] = [
  { id: 'FE2_1', value: '생산 지연', category: '기본', belongsTo: 'Your Plant' },
  { id: 'FE2_2', value: '재작업/폐기', category: '기본', belongsTo: 'Your Plant' },
  { id: 'FE2_4', value: '조립 불가', category: '기본', belongsTo: 'Ship to Plant' },
  { id: 'FE2_5', value: '라인 정지', category: '기본', belongsTo: 'Ship to Plant' },
  { id: 'FE2_7', value: '차량 정지 (안전)', category: '기본', belongsTo: 'User' },
  { id: 'FE2_8', value: '기능 작동 불능', category: '기본', belongsTo: 'User' },
];

// FM1: 고장형태(FM)
const FM1_ITEMS: DataItem[] = [
  { id: 'FM1_1', value: '규격 미달', category: '기본' },
  { id: 'FM1_2', value: '규격 초과', category: '기본' },
  { id: 'FM1_3', value: '변형', category: '기본' },
  { id: 'FM1_4', value: '파손', category: '기본' },
  { id: 'FM1_5', value: '누락', category: '기본' },
  { id: 'FM1_6', value: '오염', category: '기본' },
];

// FC1: 고장원인(FC)
const FC1_ITEMS: DataItem[] = [
  { id: 'FC1_1', value: '작업자 실수', category: '기본', belongsTo: 'MN' },
  { id: 'FC1_2', value: '교육 미흡', category: '기본', belongsTo: 'MN' },
  { id: 'FC1_4', value: '설비 마모', category: '기본', belongsTo: 'MC' },
  { id: 'FC1_5', value: '설비 고장', category: '기본', belongsTo: 'MC' },
  { id: 'FC1_7', value: '원자재 불량', category: '기본', belongsTo: 'IM' },
  { id: 'FC1_9', value: '온도 부적합', category: '기본', belongsTo: 'EN' },
];

// A3: 공정 기능 (L2 메인공정)
const A3_ITEMS: DataItem[] = [
  { id: 'A3_10', value: '입고된 원자재를 검수하여 창고 입고', category: '기본', processNo: '10' },
  { id: 'A3_20', value: '원부자재 샘플링 수입검사', category: '기본', processNo: '20' },
  { id: 'A3_30', value: 'MB조건에 따라 혼련', category: '기본', processNo: '30' },
  { id: 'A3_40', value: 'FM조건에 따라 혼련', category: '기본', processNo: '40' },
  { id: 'A3_50', value: '고무 압출하여 반제품 생산', category: '기본', processNo: '50' },
  { id: 'A3_60', value: '스틸코드에 고무 코팅', category: '기본', processNo: '60' },
  { id: 'A3_70', value: '부재를 조립하여 성형', category: '기본', processNo: '70' },
  { id: 'A3_80', value: '가류 조건에 따라 가류', category: '기본', processNo: '80' },
  { id: 'A3_90', value: '트리밍 및 외관 검사', category: '기본', processNo: '90' },
  { id: 'A3_100', value: '유니포미티 검사', category: '기본', processNo: '100' },
  { id: 'A3_110', value: '포장 및 출하', category: '기본', processNo: '110' },
  { id: 'A3_G1', value: '규격에 맞게 가공', category: '기본' },
  { id: 'A3_G2', value: '품질 검사 수행', category: '기본' },
  { id: 'A3_G3', value: '설비 조건 유지', category: '기본' },
  { id: 'A3_G4', value: '작업 표준 준수', category: '기본' },
  { id: 'A3_G5', value: '이물 유입 방지', category: '기본' },
];

// A4: 제품특성 (L2 메인공정)
const A4_ITEMS: DataItem[] = [
  { id: 'A4_10', value: '이물질', category: '기본', processNo: '10' },
  { id: 'A4_20', value: 'Mooney', category: '기본', processNo: '20' },
  { id: 'A4_30', value: 'Mooney', category: '기본', processNo: '30' },
  { id: 'A4_40', value: 'Rheometer', category: '기본', processNo: '40' },
  { id: 'A4_50', value: 'Tread 폭', category: '기본', processNo: '50' },
  { id: 'A4_60', value: 'Steel Cord 폭', category: '기본', processNo: '60' },
  { id: 'A4_70', value: '조인트 위치', category: '기본', processNo: '70' },
  { id: 'A4_80', value: '가류 시간', category: '기본', processNo: '80' },
  { id: 'A4_90', value: '외관 품질', category: '기본', processNo: '90' },
  { id: 'A4_100', value: 'RFV/LFV', category: '기본', processNo: '100' },
  { id: 'A4_110', value: '포장 상태', category: '기본', processNo: '110' },
  { id: 'A4_G1', value: '치수', category: '기본' },
  { id: 'A4_G2', value: '외관', category: '기본' },
  { id: 'A4_G3', value: '경도', category: '기본' },
  { id: 'A4_G4', value: '중량', category: '기본' },
];

// B2: 작업요소 기능 (L3 작업요소) - 4M별
const B2_ITEMS: DataItem[] = [
  { id: 'B2_MN1', value: '작업 표준에 따라 작업 수행', category: '기본', belongsTo: 'MN' },
  { id: 'B2_MN2', value: '설비 조건 설정 및 확인', category: '기본', belongsTo: 'MN' },
  { id: 'B2_MN3', value: '품질 검사 수행', category: '기본', belongsTo: 'MN' },
  { id: 'B2_MN4', value: '이상 발생 시 조치', category: '기본', belongsTo: 'MN' },
  { id: 'B2_MC1', value: '규정된 조건으로 가동', category: '기본', belongsTo: 'MC' },
  { id: 'B2_MC2', value: '정밀도 유지', category: '기본', belongsTo: 'MC' },
  { id: 'B2_MC3', value: '안정적 운전 수행', category: '기본', belongsTo: 'MC' },
  { id: 'B2_MC4', value: '설정값 유지', category: '기본', belongsTo: 'MC' },
  { id: 'B2_IM1', value: '규격 자재 투입', category: '기본', belongsTo: 'IM' },
  { id: 'B2_IM2', value: '자재 상태 확인', category: '기본', belongsTo: 'IM' },
  { id: 'B2_IM3', value: '선입선출 관리', category: '기본', belongsTo: 'IM' },
  { id: 'B2_EN1', value: '작업 환경 조건 유지', category: '기본', belongsTo: 'EN' },
  { id: 'B2_EN2', value: '온도/습도 관리', category: '기본', belongsTo: 'EN' },
  { id: 'B2_EN3', value: '청정도 유지', category: '기본', belongsTo: 'EN' },
];

// B3: 공정특성 (L3 작업요소) - 4M별
const B3_ITEMS: DataItem[] = [
  { id: 'B3_MN1', value: '작업 숙련도', category: '기본', belongsTo: 'MN' },
  { id: 'B3_MN2', value: '작업 속도', category: '기본', belongsTo: 'MN' },
  { id: 'B3_MN3', value: '검사 정확도', category: '기본', belongsTo: 'MN' },
  { id: 'B3_MC1', value: '설비 압력', category: '기본', belongsTo: 'MC' },
  { id: 'B3_MC2', value: '설비 온도', category: '기본', belongsTo: 'MC' },
  { id: 'B3_MC3', value: '설비 속도', category: '기본', belongsTo: 'MC' },
  { id: 'B3_MC4', value: '설비 정밀도', category: '기본', belongsTo: 'MC' },
  { id: 'B3_IM1', value: '자재 규격', category: '기본', belongsTo: 'IM' },
  { id: 'B3_IM2', value: '자재 유효기간', category: '기본', belongsTo: 'IM' },
  { id: 'B3_IM3', value: '자재 상태', category: '기본', belongsTo: 'IM' },
  { id: 'B3_EN1', value: '작업장 온도', category: '기본', belongsTo: 'EN' },
  { id: 'B3_EN2', value: '작업장 습도', category: '기본', belongsTo: 'EN' },
  { id: 'B3_EN3', value: '조도', category: '기본', belongsTo: 'EN' },
];

// B4: 고장원인 (L3 작업요소) - 4M별
const B4_ITEMS: DataItem[] = [
  { id: 'B4_MN1', value: '작업자 실수', category: '기본', belongsTo: 'MN' },
  { id: 'B4_MN2', value: '교육 미흡', category: '기본', belongsTo: 'MN' },
  { id: 'B4_MN3', value: '피로/부주의', category: '기본', belongsTo: 'MN' },
  { id: 'B4_MC1', value: '설비 마모', category: '기본', belongsTo: 'MC' },
  { id: 'B4_MC2', value: '설비 고장', category: '기본', belongsTo: 'MC' },
  { id: 'B4_MC3', value: '설정값 오류', category: '기본', belongsTo: 'MC' },
  { id: 'B4_IM1', value: '원자재 불량', category: '기본', belongsTo: 'IM' },
  { id: 'B4_IM2', value: '자재 혼입', category: '기본', belongsTo: 'IM' },
  { id: 'B4_IM3', value: '유효기간 초과', category: '기본', belongsTo: 'IM' },
  { id: 'B4_EN1', value: '온도 부적합', category: '기본', belongsTo: 'EN' },
  { id: 'B4_EN2', value: '습도 부적합', category: '기본', belongsTo: 'EN' },
  { id: 'B4_EN3', value: '이물 유입', category: '기본', belongsTo: 'EN' },
];

// B5: 예방관리
const B5_ITEMS: DataItem[] = [
  { id: 'B5_1', value: '작업 표준서 교육', category: '기본' },
  { id: 'B5_2', value: '일상 점검', category: '기본' },
  { id: 'B5_3', value: '정기 점검', category: '기본' },
  { id: 'B5_4', value: '설비 PM', category: '기본' },
  { id: 'B5_5', value: '자재 입고 검사', category: '기본' },
  { id: 'B5_6', value: '환경 모니터링', category: '기본' },
  { id: 'B5_7', value: 'Fool Proof 설치', category: '기본' },
  { id: 'B5_8', value: 'Poka-Yoke', category: '기본' },
];

// B6: 검출관리
const B6_ITEMS: DataItem[] = [
  { id: 'B6_1', value: '육안 검사', category: '기본' },
  { id: 'B6_2', value: '측정기 검사', category: '기본' },
  { id: 'B6_3', value: '자동 센서 검출', category: '기본' },
  { id: 'B6_4', value: 'SPC 관리', category: '기본' },
  { id: 'B6_5', value: 'Go/No-Go 게이지', category: '기본' },
  { id: 'B6_6', value: '초중종품 검사', category: '기본' },
  { id: 'B6_7', value: '전수 검사', category: '기본' },
  { id: 'B6_8', value: '샘플링 검사', category: '기본' },
];

// SC: 특별특성
const SC_ITEMS: DataItem[] = [
  { id: 'SC_1', value: 'CC (Critical Characteristic)', category: '기본' },
  { id: 'SC_2', value: 'SC (Significant Characteristic)', category: '기본' },
  { id: 'SC_3', value: 'HC (High Impact Characteristic)', category: '기본' },
  { id: 'SC_4', value: '-', category: '기본' },
];

// 기본 옵션 정의 (통합)
export const DEFAULT_ITEMS: Record<string, DataItem[]> = {
  C1: C1_ITEMS,
  C2: C2_ITEMS,
  C3: C3_ITEMS,
  SP: SP_ITEMS,
  FE1: FE1_ITEMS,
  FE2: FE2_ITEMS,
  FM1: FM1_ITEMS,
  FC1: FC1_ITEMS,
  A3: A3_ITEMS,
  A4: A4_ITEMS,
  B2: B2_ITEMS,
  B3: B3_ITEMS,
  B4: B4_ITEMS,
  B5: B5_ITEMS,
  B6: B6_ITEMS,
  SC: SC_ITEMS,
};

