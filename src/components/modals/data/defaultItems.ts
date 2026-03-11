/**
 * @file defaultItems.ts
 * @description DataSelectModal에서 사용하는 기본 데이터 항목 (DFMEA/PFMEA 분리)
 */

export interface DataItem {
  id: string;
  value: string;
  category?: string;
  belongsTo?: string;
  processNo?: string;
  sourceFmeaId?: string; // 원본 FMEA ID (템플릿 출처)
  icon?: string;         // SC 마스터 아이콘
  color?: string;        // SC 마스터 색상
  meaning?: string;      // SC 마스터 의미
}

export const ITEM_CODE_LABELS: Record<string, { label: string; category: string; level: 'L1' | 'L2' | 'L3' }> = {
  C1: { label: '구분', category: 'C', level: 'L1' },
  C2: { label: '완제품 기능', category: 'C', level: 'L1' },
  C3: { label: '요구사항', category: 'C', level: 'L1' },
  C4: { label: '고장영향', category: 'C', level: 'L1' },
  A3: { label: '공정 기능', category: 'A', level: 'L2' },
  FE1: { label: 'FE 구분', category: 'FE', level: 'L1' },
  FE2: { label: '고장영향(FE)', category: 'FE', level: 'L1' },
  FE3: { label: '초점요소 기능', category: 'FE', level: 'L2' },
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
  '법규': { bg: '#e3f2fd', text: '#1565c0' },
  '보조': { bg: '#f3e5f5', text: '#7b1fa2' },
  '관능': { bg: '#fffde7', text: '#fbc02d' },
  'YP': { bg: '#e0f2f1', text: '#00695c' },
  'SP': { bg: '#ede7f6', text: '#4527a0' },
  'USER': { bg: '#fce4ec', text: '#c2185b' },
};

// ============================================================
// [DFMEA] 전용 기본 데이터
// ============================================================

const DFMEA_C1: DataItem[] = [
  { id: 'C1_D1', value: '법규', category: 'DFMEA', belongsTo: 'DFMEA' },
  { id: 'C1_D2', value: '기본', category: 'DFMEA', belongsTo: 'DFMEA' },
  { id: 'C1_D3', value: '보조', category: 'DFMEA', belongsTo: 'DFMEA' },
  { id: 'C1_D4', value: '관능', category: 'DFMEA', belongsTo: 'DFMEA' },
];

const DFMEA_C2: DataItem[] = [
  { id: 'C2_R1', value: '주행 중 안전성을 확보한다', category: '법규', belongsTo: '법규' },
  { id: 'C2_R2', value: '동력을 전달한다', category: '법규', belongsTo: '법규' },
  { id: 'C2_R3', value: '법규 기준을 충족한다', category: '법규', belongsTo: '법규' },
  { id: 'C2_B1', value: '규격에 맞는 재료를 투입한다', category: '기본', belongsTo: '기본' },
  { id: 'C2_B2', value: '일관된 배합 품질을 유지한다', category: '기본', belongsTo: '기본' },
  { id: 'C2_B3', value: '규격 치수를 유지한다', category: '기본', belongsTo: '기본' },
  { id: 'C2_S1', value: '차량에 장착 가능한 형상을 제공한다', category: '보조', belongsTo: '보조' },
  { id: 'C2_S2', value: '조립 편의성을 제공한다', category: '보조', belongsTo: '보조' },
  { id: 'C2_S3', value: '운송 중 손상을 방지한다', category: '보조', belongsTo: '보조' },
  { id: 'C2_K1', value: '외관 품질을 확보한다', category: '관능', belongsTo: '관능' },
  { id: 'C2_K2', value: '소음/진동을 저감한다', category: '관능', belongsTo: '관능' },
  { id: 'C2_K3', value: '승차감을 향상한다', category: '관능', belongsTo: '관능' },
];

const DFMEA_C3: DataItem[] = [
  { id: 'C3_R1', value: '자동차 안전기준 충족', category: '법규', belongsTo: '법규' },
  { id: 'C3_R2', value: '배기가스 규제 기준 충족', category: '법규', belongsTo: '법규' },
  { id: 'C3_R3', value: '소음 규제 기준 충족', category: '법규', belongsTo: '법규' },
  { id: 'C3_R4', value: '도로교통법 준수', category: '법규', belongsTo: '법규' },
  { id: 'C3_B1', value: '재료 규격 ±0.5mm 이내', category: '기본', belongsTo: '기본' },
  { id: 'C3_B2', value: '배합비 오차 ±2% 이내', category: '기본', belongsTo: '기본' },
  { id: 'C3_B6', value: '내구 수명 10만km 이상', category: '기본', belongsTo: '기본' },
  { id: 'C3_B7', value: '안전 하중 500kgf 이상', category: '기본', belongsTo: '기본' },
  { id: 'C3_S1', value: '조립 치수 허용오차 ±1mm', category: '보조', belongsTo: '보조' },
  { id: 'C3_S2', value: '장착 편의성 확보', category: '보조', belongsTo: '보조' },
  { id: 'C3_K1', value: '외관 품질 기준 충족', category: '관능', belongsTo: '관능' },
  { id: 'C3_K2', value: '소음 레벨 70dB 이하', category: '관능', belongsTo: '관능' },
];

export const DFMEA_DEFAULT_ITEMS: Record<string, DataItem[]> = {
  C1: DFMEA_C1,
  C2: DFMEA_C2,
  C3: DFMEA_C3,
  FE1: DFMEA_C1, // 동일 구분 사용
  FE2: [
    { id: 'FE2_1', value: '생산 지연', category: '기본' },
    { id: 'FE2_2', value: '재작업/폐기', category: '기본' },
    { id: 'FE2_7', value: '차량 정지 (안전)', category: '기본' },
  ],
  FE3: [
    { id: 'FE3_1', value: '하중을 지지한다', category: '기본' },
    { id: 'FE3_2', value: '회전 운동을 전달한다', category: '기본' },
  ],
  FM1: [
    { id: 'FM1_1', value: '규격 미달', category: '기본' },
    { id: 'FM1_4', value: '파손', category: '기본' },
  ],
  FC1: [
    { id: 'FC1_1', value: '설계 하중 산정 오류', category: '기본' },
    { id: 'FC1_2', value: '재질 선정 부적합', category: '기본' },
  ],
};

// ============================================================
// [PFMEA] 전용 기본 데이터
// ============================================================

const PFMEA_C1: DataItem[] = [
  { id: 'C1_P1', value: 'YP', category: 'PFMEA', belongsTo: 'PFMEA' },
  { id: 'C1_P2', value: 'SP', category: 'PFMEA', belongsTo: 'PFMEA' },
  { id: 'C1_P3', value: 'USER', category: 'PFMEA', belongsTo: 'PFMEA' },
];

const PFMEA_C2: DataItem[] = [
  { id: 'C2_P1_1', value: '원활한 후속 공정 진행을 지원한다', category: 'YP', belongsTo: 'YP' },
  { id: 'C2_P1_2', value: '공정 내 불량을 최소화한다', category: 'YP', belongsTo: 'YP' },
  { id: 'C2_P2_1', value: '고객사 조립 라인 정지를 방지한다', category: 'SP', belongsTo: 'SP' },
  { id: 'C2_P2_2', value: '고객사 수입 검사 합격 품질을 제공한다', category: 'SP', belongsTo: 'SP' },
  { id: 'C2_P3_1', value: '최종 사용자의 안전 운행을 보장한다', category: 'USER', belongsTo: 'USER' },
];

const PFMEA_C3: DataItem[] = [
  // Your Plant 요구사항
  { id: 'C3_P1', value: '후속 공정 장착성 확보', category: 'YP', belongsTo: 'YP' },
  { id: 'C3_P1_2', value: '공정 내 불량률 1% 이하', category: 'YP', belongsTo: 'YP' },
  { id: 'C3_P1_3', value: '라인 정지 0건', category: 'YP', belongsTo: 'YP' },
  { id: 'C3_P1_4', value: '후속 공정 재작업 0건', category: 'YP', belongsTo: 'YP' },
  { id: 'C3_P1_5', value: '공정 Cycle Time 준수', category: 'YP', belongsTo: 'YP' },
  // Ship to Plant 요구사항
  { id: 'C3_P3', value: '외관 불량 0%', category: 'SP', belongsTo: 'SP' },
  { id: 'C3_P3_2', value: '고객사 수입검사 합격', category: 'SP', belongsTo: 'SP' },
  { id: 'C3_P3_3', value: '납기 준수율 100%', category: 'SP', belongsTo: 'SP' },
  { id: 'C3_P3_4', value: '고객사 라인 정지 0건', category: 'SP', belongsTo: 'SP' },
  { id: 'C3_P3_5', value: '포장 손상 0건', category: 'SP', belongsTo: 'SP' },
  // User 요구사항
  { id: 'C3_P5', value: '필드 클레임 0건', category: 'USER', belongsTo: 'USER' },
  { id: 'C3_P5_2', value: '안전 사고 0건', category: 'USER', belongsTo: 'USER' },
  { id: 'C3_P5_3', value: '법규 기준 충족', category: 'USER', belongsTo: 'USER' },
  { id: 'C3_P5_4', value: '내구 수명 보증', category: 'USER', belongsTo: 'USER' },
  { id: 'C3_P5_5', value: '소음/진동 기준 충족', category: 'USER', belongsTo: 'USER' },
];

const PFMEA_FAILURE_EFFECTS: DataItem[] = [
  { id: 'FE_P1', value: '라인 정지', category: 'YP' },
  { id: 'FE_P2', value: '전수 선별', category: 'YP' },
  { id: 'FE_P3', value: '고객사 클레임', category: 'SP' },
];

export const PFMEA_DEFAULT_ITEMS: Record<string, DataItem[]> = {
  C1: PFMEA_C1,
  C2: PFMEA_C2,
  C3: PFMEA_C3,
  FE1: PFMEA_C1,
  FE2: PFMEA_FAILURE_EFFECTS,
  A3: [
    { id: 'A3_G1', value: '규격에 맞게 가공', category: '기본' },
    { id: 'A3_G2', value: '품질 검사 수행', category: '기본' },
  ],
  A4: [
    { id: 'A4_G1', value: '치수', category: '기본' },
    { id: 'A4_G2', value: '외관', category: '기본' },
  ],
  B2: [
    { id: 'B2_MN1', value: '작업 표준에 따라 작업 수행', category: '기본', belongsTo: 'MN' },
  ],
  B3: [
    { id: 'B3_MC1', value: '설비 압력', category: '기본', belongsTo: 'MC' },
  ],
  B4: [
    { id: 'B4_MN1', value: '작업자 실수', category: '기본', belongsTo: 'MN' },
  ],
  B5: [
    { id: 'B5_1', value: '작업 표준서 교육', category: '기본' },
  ],
  B6: [
    { id: 'B6_1', value: '육안 검사', category: '기본' },
  ],
};

// 하위 호완성 유지 (기존 DEFAULT_ITEMS는 DFMEA 위주 또는 섞인 상태이므로 점진적 폐기 권장)
export const DEFAULT_ITEMS: Record<string, DataItem[]> = DFMEA_DEFAULT_ITEMS;
