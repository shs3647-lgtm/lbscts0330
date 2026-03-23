/**
 * @file SODMasterData.ts
 * @description SOD(심각도/발생도/검출도) 마스터 기본 데이터
 * P-FMEA 및 D-FMEA의 SOD 기준표 (AIAG VDA FMEA 1st Edition 기준)
 * @updated 2026-02-21 — PFMEA+DFMEA 최종본(정오표반영_최종.xlsx) 기반 전면 업데이트
 */

/**
 * SOD 데이터 버전 — 기준 변경 시 증가
 * v1: 초기 (FMEA 4판 혼재)
 * v2: AIAG VDA FMEA 1st Edition (2차 정오표) 전면 교체
 * v3: DFMEA SOD 기준 엑셀(DFMEA_SOD_AP_기준표_완성.xlsx) 기반 정밀 업데이트
 * v4: PFMEA+DFMEA 최종본(정오표반영_최종.xlsx) 기반 전면 업데이트, 정오표 도움말 추가
 */
export const SOD_DATA_VERSION = 4;
const SOD_VERSION_KEY = 'sod_data_version';

// 모듈 로드 시 자동 마이그레이션: localStorage 구 데이터 삭제 → defaults로 갱신
if (typeof window !== 'undefined') {
  try {
    const currentVersion = localStorage.getItem(SOD_VERSION_KEY);
    if (currentVersion !== String(SOD_DATA_VERSION)) {
      localStorage.removeItem('sod_master_data');
      localStorage.setItem(SOD_VERSION_KEY, String(SOD_DATA_VERSION));
    }
  } catch (e) {
    console.error('[SODMasterData] localStorage 마이그레이션 오류:', e);
  }
}

export interface SODItem {
  id: string;
  fmeaType: 'P-FMEA' | 'D-FMEA';
  category: 'S' | 'O' | 'D'; // Severity, Occurrence, Detection
  standard?: string; // 기준 표준 (AIAG&VDA, BMW, VW 등) - 미지정 시 DEFAULT_STANDARD
  rating: number; // 1-10
  levelKr: string; // 한글 레벨 (매우 높음, 높음, 중간, 낮음 등)
  levelEn: string; // 영문 레벨 (Very High, High, Moderate, Low 등)
  yourPlant?: string; // Your Plant 영향
  shipToPlant?: string; // Ship to Plant 영향
  endUser?: string; // End User 영향
  description?: string; // 추가 설명/발생빈도
  criteria?: string; // 기준 설명/검출방법 성숙도
  // 발생도(O) 전용 필드
  controlType?: string; // 관리유형 (Type of Control)
  preventionControl?: string; // 예방관리 (Prevention Controls)
  // 사례 필드 (S/O/D 각 카테고리별)
  severityExamples?: string; // 심각도 사례 — 향후 업종별 데이터 추가 예정
  occurrenceExamples?: string; // 발생도 사례 — 향후 업종별 데이터 추가 예정
  detectionExamples?: string; // 검출방법 사례 (계측기/장비) - 업종별 참조 또는 직접 입력
}

/** 사례 컬럼 표시 여부 — false=숨김, true=표시 (향후 데이터 추가 후 true로 전환) */
export const SHOW_EXAMPLES_COLUMN = false;

/** 기본 표준 (삭제 불가) */
export const DEFAULT_STANDARD = 'AIAG&VDA';

// P-FMEA 심각도 기본 데이터 (AIAG & VDA FMEA Handbook 1st Edition, 2차 정오표 반영)
export const DEFAULT_PFMEA_SEVERITY: Omit<SODItem, 'id'>[] = [
  {
    fmeaType: 'P-FMEA', category: 'S', rating: 10, levelKr: '매우 높음', levelEn: 'Very High',
    yourPlant: '고장으로 제조/조립 근로자의 건강 및/또는 안전 리스크 초래 가능\n[Errata] Failure may result in an health and/or safety risk for the manufacturing or assembly worker',
    shipToPlant: '고장으로 제조/조립 근로자의 건강 및/또는 안전 리스크 초래 가능\n[Errata] Failure may result in an health and/or safety risk for the manufacturing or assembly worker',
    endUser: '차량 및/또는 다른 자동차의 안전 운행, 운전자, 승객 또는 도로 사용자나 보행자의 건강에 영향을 미침\nAffects safe operation of the vehicle and/or other vehicles, the health of driver or passenger(s) or road users or pedestrians.'
  },
  {
    fmeaType: 'P-FMEA', category: 'S', rating: 9, levelKr: '매우 높음', levelEn: 'Very High',
    yourPlant: '고장이 발생하면 공장 내 규제 미준수로 이어질 수 있음\nFailure may result in in-plant regulatory noncompliance',
    shipToPlant: '고장이 발생하면 공장 내 규제 미준수로 이어질 수 있음\nFailure may result in in-plant regulatory noncompliance',
    endUser: '규제사항 미준수\nNoncompliance with regulations.'
  },
  {
    fmeaType: 'P-FMEA', category: 'S', rating: 8, levelKr: '보통 높음', levelEn: 'High',
    yourPlant: '[정오표] 영향을 받은 생산 제품의 100%가 폐기될 수 있음\n[Errata] 100% of production run affected may have to be scrapped.',
    shipToPlant: '[정오표] 1 Shift 이상 라인 중단; 출하 중단 가능; 규정 미준수 이외에 필드 수리/교체\n[Errata] Line shutdown greater than full production shift; stop shipment possible; field repair or replacement required (Assembly to End User) other than for regulatory noncompliance.',
    endUser: '기대되는 사용 수명 기간 동안 정상 주행에 필요한 자동차 주요 기능의 상실\nLoss of primary vehicle function necessary for normal driving during expected service life.'
  },
  {
    fmeaType: 'P-FMEA', category: 'S', rating: 7, levelKr: '보통 높음', levelEn: 'High',
    yourPlant: '① 제품을 선별하고 일부(100% 미만) 폐기할 수도 있음\n② 공정에서 기준 이탈; 라인 속도 저하, 인력 추가 필요\n① Product may have to be sorted and a portion (less than 100%) scrapped;\n② deviation from primary process; decreased line speed or added manpower',
    shipToPlant: '1시간~1 Shift 라인 중단; 출하 중단 가능; 규정 미준수 이외에 필드 수리/교체\nLine shutdown from 1 hour up to full production shift; stop shipment possible; field repair or replacement required (Assembly to End User) other than for regulatory noncompliance',
    endUser: '기대되는 사용 수명 기간 동안 정상 주행에 필요한 자동차 주요 기능의 저하\nDegradation of primary vehicle function necessary for normal driving during expected service life.'
  },
  {
    fmeaType: 'P-FMEA', category: 'S', rating: 6, levelKr: '중간', levelEn: 'Moderate',
    yourPlant: '100% 라인 밖에서 재작업 및 승인\n100% of production run may have to be reworked off line and accepted',
    shipToPlant: '최대 1시간까지 라인 중단\nLine shutdown up to one hour',
    endUser: '자동차 보조 기능 상실\nLoss of secondary vehicle function.'
  },
  {
    fmeaType: 'P-FMEA', category: 'S', rating: 5, levelKr: '중간', levelEn: 'Moderate',
    yourPlant: '일부 제품을 라인 밖에서 재작업 및 승인\nA portion of the production run may have to be reworked off line and accepted',
    shipToPlant: '영향을 받은 제품 100% 미만; 추가적인 제품 결함 가능성; 선별 필요; 라인 중단 없음\nLess than 100% of product affected; strong possibility for additional defective product; sort required; no line shutdown',
    endUser: '자동차 보조 기능 저하\nDegradation of secondary vehicle function.'
  },
  {
    fmeaType: 'P-FMEA', category: 'S', rating: 4, levelKr: '중간', levelEn: 'Moderate',
    yourPlant: '100% 스테이션에서 재작업\n100% of production run may have to be reworked in station before it is processed',
    shipToPlant: '제품 결함으로 중대한 대응 계획 유발; 추가적인 제품 결함 가능성 없음; 선별 필요 없음\nDefective product triggers significant reaction plan; additional defective products not likely; sort not required',
    endUser: '매우 좋지 않은 외관, 소리, 진동, 거친소리 또는 촉각\nVery objectionable appearance, sound, vibration, harshness, or haptics.'
  },
  {
    fmeaType: 'P-FMEA', category: 'S', rating: 3, levelKr: '낮음', levelEn: 'Low',
    yourPlant: '일부 제품을 스테이션 내에서 재작업\nA portion of the production run may have to be reworked in-station before it is processed',
    shipToPlant: '제품 결함으로 경미한 대응 계획 유발; 추가적인 제품 결함 가능성 없음; 선별 필요 없음\nDefective product triggers minor reaction plan; additional defective products not likely; sort not required',
    endUser: '중간 정도의 좋지 않은 외관, 소리, 진동, 거친소리 또는 촉각\nModerately objectionable appearance, sound, vibration, harshness, or haptics.'
  },
  {
    fmeaType: 'P-FMEA', category: 'S', rating: 2, levelKr: '낮음', levelEn: 'Low',
    yourPlant: '공정, 작업 또는 작업자에게 약간의 불편함\nSlight inconvenience to process, operation, or operator',
    shipToPlant: '제품 결함으로 대응 계획 유발 없음; 추가적인 제품 결함 가능성 없음; 선별 필요 없음. 공급자에게 피드백 요구\nDefective product triggers no reaction plan; additional defective products not likely; sort not required; requires feedback to supplier',
    endUser: '약간 좋지 않은 외관, 소리, 진동, 거친소리 또는 촉각\nSlightly objectionable appearance, sound, vibration, harshness, or haptics.'
  },
  {
    fmeaType: 'P-FMEA', category: 'S', rating: 1, levelKr: '매우 낮음', levelEn: 'Very Low',
    yourPlant: '식별 가능한 영향이 없거나 영향이 없음\nNo discernible effect',
    shipToPlant: '식별 가능한 영향이 없거나 영향이 없음\nNo discernible effect or no effect',
    endUser: '인지할 수 있는 영향 없음\nNo discernible effect.'
  },
];

// P-FMEA 발생도 기본 데이터 (AIAG & VDA FMEA Handbook 1st Edition, 2차 정오표 반영)
export const DEFAULT_PFMEA_OCCURRENCE: Omit<SODItem, 'id'>[] = [
  {
    fmeaType: 'P-FMEA', category: 'O', rating: 10, levelKr: '극도로 높음', levelEn: 'Extremely High',
    controlType: '없음\nNone',
    preventionControl: '예방관리 없음\nNo prevention controls.',
    description: '≥100/1,000 (1/10)\n매번 (Every Time)'
  },
  {
    fmeaType: 'P-FMEA', category: 'O', rating: 9, levelKr: '매우 높음', levelEn: 'Very High',
    controlType: '행동적\nBehavioral',
    preventionControl: '예방관리는 고장 원인을 예방하는데 거의 효과가 없음\nPrevention controls will have little effect in preventing failure cause.',
    description: '50/1,000 (1/20)\n거의 매번 (Almost Every Time)'
  },
  {
    fmeaType: 'P-FMEA', category: 'O', rating: 8, levelKr: '매우 높음', levelEn: 'Very High',
    controlType: '행동적\nBehavioral',
    preventionControl: '예방관리는 고장 원인을 예방하는데 거의 효과가 없음\nPrevention controls will have little effect in preventing failure cause.',
    description: '20/1,000 (1/50)\n교대조당 한번 이상 (More than once per shift)'
  },
  {
    fmeaType: 'P-FMEA', category: 'O', rating: 7, levelKr: '높음', levelEn: 'High',
    controlType: '행동적 또는 기술적\nBehavioral or Technical',
    preventionControl: '예방관리는 고장 원인을 예방하는데 다소 효과적임\nPrevention controls somewhat effective in preventing failure cause.',
    description: '10/1,000 (1/100)\n하루에 한번 이상 (More than once per day)'
  },
  {
    fmeaType: 'P-FMEA', category: 'O', rating: 6, levelKr: '높음', levelEn: 'High',
    controlType: '행동적 또는 기술적\nBehavioral or Technical',
    preventionControl: '예방관리는 고장 원인을 예방하는데 다소 효과적임\nPrevention controls somewhat effective in preventing failure cause.',
    description: '2/1,000 (1/500)\n일주일에 한번 이상 (More than once per week)'
  },
  {
    fmeaType: 'P-FMEA', category: 'O', rating: 5, levelKr: '중간', levelEn: 'Moderate',
    controlType: '행동적 또는 기술적\nBehavioral or Technical',
    preventionControl: '예방관리는 고장 원인을 예방하는데 효과적임\nPrevention controls are effective in preventing failure cause.',
    description: '0.5/1,000 (1/2,000)\n월간 한번 이상 (More than once per month)'
  },
  {
    fmeaType: 'P-FMEA', category: 'O', rating: 4, levelKr: '중간', levelEn: 'Moderate',
    controlType: '행동적 또는 기술적\nBehavioral or Technical',
    preventionControl: '예방관리는 고장 원인을 예방하는데 효과적임\nPrevention controls are effective in preventing failure cause.',
    description: '0.1/1,000 (1/10,000)\n연간 한번 이상 (More than once per year)'
  },
  {
    fmeaType: 'P-FMEA', category: 'O', rating: 3, levelKr: '낮음', levelEn: 'Low',
    controlType: '모범사례: 행동적 또는 기술적\nBest Practices: Behavioral or Technical',
    preventionControl: '예방관리는 고장 원인을 예방하는데 매우 효과적임\nPrevention controls are highly effective in preventing failure cause.',
    description: '0.01/1,000 (1/100,000)\n1년에 한번 (Once per year)'
  },
  {
    fmeaType: 'P-FMEA', category: 'O', rating: 2, levelKr: '매우 낮음', levelEn: 'Very Low',
    controlType: '모범사례: 행동적 또는 기술적\nBest Practices: Behavioral or Technical',
    preventionControl: '예방관리는 고장 원인을 예방하는데 매우 효과적임\nPrevention controls are highly effective in preventing failure cause.',
    description: '<0.001/1,000 (1/1,000,000)\n연간 한번 미만 (Less than once per year)'
  },
  {
    fmeaType: 'P-FMEA', category: 'O', rating: 1, levelKr: '극도로 낮음', levelEn: 'Extremely Low',
    controlType: '기술적\nTechnical',
    preventionControl: '설계(부품 형상) 또는 공정(지그, 치공구)으로 고장 원인을 예방하는데 극도로 효과적임.\n예방관리 의도 - 고장 원인으로 인한 고장 형태를 물리적으로 생산할 수 없음.\nPrevention controls are extremely effective in preventing failure cause from occurring due to design (e.g. part geometry) or process (e.g. fixture or tooling design).\nIntent of prevention controls - Failure Mode cannot be physically produced due to the Failure Cause.',
    description: '예방관리를 통해 제거됨\nFailure eliminated through prevention control'
  },
];

// P-FMEA 검출도 기본 데이터 (AIAG & VDA FMEA Handbook 1st Edition, 2차 정오표 반영)
export const DEFAULT_PFMEA_DETECTION: Omit<SODItem, 'id'>[] = [
  {
    fmeaType: 'P-FMEA', category: 'D', rating: 10, levelKr: '매우 낮음', levelEn: 'Very Low',
    criteria: '시험 또는 검사 방법이 수립되거나 알려지지 않음\nNo testing or inspection method has been established or is known.',
    description: '고장 형태가 검출되지 않거나 검출될 수 없음\nThe failure mode will not or cannot be detected.'
  },
  {
    fmeaType: 'P-FMEA', category: 'D', rating: 9, levelKr: '매우 낮음', levelEn: 'Very Low',
    criteria: '시험 또는 검사 방법이 고장 형태를 검출할 가능성이 낮음\nIt is unlikely that the testing or inspection method will detect the failure mode.',
    description: '고장 형태는 무작위 또는 산발적 심사를 통해 쉽게 검출되지 않음\nThe failure mode is not easily detected through random or sporadic audits.'
  },
  {
    fmeaType: 'P-FMEA', category: 'D', rating: 8, levelKr: '낮음', levelEn: 'Low',
    criteria: '시험 또는 검사 방법이 효과적이고 신뢰할 만한 것으로 입증되지 않음\n(예: 공장이 방법에 대한 경험이 거의 없거나, 비교 가능한 공정에서 게이지 R&R 결과가 한계적인 경우 등)\nTest or inspection method has not been proven to be effective and reliable (e.g. plant has little or no experience with method, gauge R&R results marginal on comparable process or this application, etc.)',
    description: '사람의 검사(시각, 촉각, 청각) 또는 고장 형태나 원인을 검출해야 하는 수동 게이지(계수형/계량형) 사용\nHuman inspection (visual, tactile, audible), or use of manual gauging (attribute or variable) that should detect the failure mode or failure cause.'
  },
  {
    fmeaType: 'P-FMEA', category: 'D', rating: 7, levelKr: '낮음', levelEn: 'Low',
    criteria: '시험 또는 검사 방법이 효과적이고 신뢰할 만한 것으로 입증되지 않음\nTest or inspection method has not been proven to be effective and reliable.',
    description: '기계기반 검출(자동/반자동, 조명·부저 알림 등) 또는 고장 형태나 원인을 검출해야 하는 3차원 측정기 같은 검사 장비 사용\nMachine-based detection (automated or semi-automated with notification by light, buzzer, etc.), or use of inspection equipment such as a coordinate measuring machine that should detect failure mode or failure cause.'
  },
  {
    fmeaType: 'P-FMEA', category: 'D', rating: 6, levelKr: '중간', levelEn: 'Moderate',
    criteria: '시험 또는 검사 방법이 효과적이고 신뢰할 수 있는 것으로 입증됨\n(예: 공장이 동일한 공정 또는 적용에 대한 경험이 있고, 게이지 R&R 결과가 수용 가능한 경우 등)\nTest or inspection method has been proven to be effective and reliable (e.g. plant has experience with method, gauge R&R results are acceptable on comparable process or this application, etc.)',
    description: '사람의 검사(시각, 촉각, 청각) 또는 고장 형태나 원인을 검출할 수 있는 수동 게이지(계수형/계량형) 사용\n(제품 샘플 검사 포함)\nHuman inspection (visual, tactile, audible), or use of manual gauging (attribute or variable) that will detect the failure mode or failure cause (including product sample checks).'
  },
  {
    fmeaType: 'P-FMEA', category: 'D', rating: 5, levelKr: '중간', levelEn: 'Moderate',
    criteria: '시험 또는 검사 방법이 효과적이고 신뢰할 수 있는 것으로 입증됨\nTest or inspection method has been proven to be effective and reliable.',
    description: '기계기반 검출(반자동, 조명·부저 알림 등) 또는 고장 형태나 원인을 검출할 수 있는 3차원 측정기 같은 검사 장비 사용\n(제품 샘플 검사 포함)\nMachine-based detection (semi-automated with notification by light, buzzer, etc.), or use of inspection equipment such as a coordinate measuring machine that will detect failure mode or failure cause (including product sample checks).'
  },
  {
    fmeaType: 'P-FMEA', category: 'D', rating: 4, levelKr: '높음', levelEn: 'High',
    criteria: '시스템이 효과적이고 신뢰할 수 있는 것으로 입증됨\n(예: 공장이 동일한 공정 또는 적용에 대한 경험이 있고, 게이지 R&R 결과가 수용 가능한 경우 등)\nSystem has been proven to be effective and reliable (e.g. plant has experience with method, gauge R&R results are acceptable, etc.)',
    description: '하류 부문에서 고장 형태를 검출하고 유출을 방지하는 기계기반 자동 검출 방법.\n불일치 제품은 시설에서 유출되지 않도록 강건한 시스템으로 관리됨.\nMachine-based automated detection method that will detect the failure mode downstream, prevent further processing or system will identify the product as discrepant.\nDiscrepant product controlled by robust system preventing outflow from the facility.'
  },
  {
    fmeaType: 'P-FMEA', category: 'D', rating: 3, levelKr: '높음', levelEn: 'High',
    criteria: '시스템이 효과적이고 신뢰할 수 있는 것으로 입증됨\nSystem has been proven to be effective and reliable.',
    description: '스테이션 내에서 고장 형태를 검출하고 유출을 방지하는 기계기반 자동 검출 방법.\n불일치 제품이 유출되지 않도록 강건한 시스템으로 관리됨.\nMachine-based automated detection method that will detect the failure mode in-station, prevent further processing.\nDiscrepant product controlled by robust system preventing outflow from the facility.'
  },
  {
    fmeaType: 'P-FMEA', category: 'D', rating: 2, levelKr: '높음', levelEn: 'High',
    criteria: '검출 방법은 효과적이고 신뢰할 수 있는 것으로 입증됨\n(예: 공장이 방법에 대한 경험이 있고, 실수방지 검증 등)\nDetection method has been proven to be effective and reliable (e.g. plant has experience with method, error-proofing verifications, etc.).',
    description: '원인을 검출하고 고장 형태(불일치 부품)가 생산되지 않도록 하는 기계기반 검출 방법\nMachine-based detection method that will detect the cause and prevent the failure mode (discrepant part) from being produced.'
  },
  {
    fmeaType: 'P-FMEA', category: 'D', rating: 1, levelKr: '매우 높음', levelEn: 'Very High',
    criteria: '고장 형태는 설계 또는 공정상 물리적으로 생산될 수 없거나, 항상 고장 형태 또는 고장 원인을 검출하는 것으로 입증된 검출 방법\nFailure mode cannot be physically produced as-designed or processed, or detection methods proven to always detect the failure mode or failure cause.',
    description: ''
  },
];

// =====================================================
// D-FMEA 기본 데이터 (AIAG & VDA FMEA Handbook 기준)
// =====================================================

// D-FMEA 심각도 기본 데이터 (DFMEA_SOD_AP_기준표_완성.xlsx D1 시트 기준)
export const DEFAULT_DFMEA_SEVERITY: Omit<SODItem, 'id'>[] = [
  { fmeaType: 'D-FMEA', category: 'S', rating: 10, levelKr: '매우 높음', levelEn: 'Very High',
    endUser: '자동차 및/또는 다른 자동차의 안전 운행, 운전자, 승객 또는 도로 사용자나 보행자의 건강에 영향을 미침.\nAffects safe operation of the vehicle and/or other vehicles, the health of driver or passenger(s) or road users or pedestrians.' },
  { fmeaType: 'D-FMEA', category: 'S', rating: 9, levelKr: '매우 높음', levelEn: 'Very High',
    endUser: '규제사항 미준수.\nNoncompliance with regulations.' },
  { fmeaType: 'D-FMEA', category: 'S', rating: 8, levelKr: '높음', levelEn: 'High',
    endUser: '기대되는 사용 수명 기간 동안 정상 주행에 필요한 자동차 주요 기능의 상실.\nLoss of primary vehicle function necessary for normal driving during expected service life.' },
  { fmeaType: 'D-FMEA', category: 'S', rating: 7, levelKr: '높음', levelEn: 'High',
    endUser: '기대되는 사용 수명 기간 동안 정상 주행에 필요한 자동차 주요 기능의 저하.\nDegradation of primary vehicle function necessary for normal driving during expected service life.' },
  { fmeaType: 'D-FMEA', category: 'S', rating: 6, levelKr: '중간', levelEn: 'Moderate',
    endUser: '자동차 보조 기능 상실.\nLoss of secondary vehicle function.' },
  { fmeaType: 'D-FMEA', category: 'S', rating: 5, levelKr: '중간', levelEn: 'Moderate',
    endUser: '자동차 보조 기능 저하.\nDegradation of secondary vehicle function.' },
  { fmeaType: 'D-FMEA', category: 'S', rating: 4, levelKr: '중간', levelEn: 'Moderate',
    endUser: '매우 좋지 않은 외관, 소리, 진동, 거친소리(harshness) 또는 촉각(haptics).\nVery objectionable appearance, sound, vibration, harshness, or haptics.' },
  { fmeaType: 'D-FMEA', category: 'S', rating: 3, levelKr: '낮음', levelEn: 'Low',
    endUser: '중간 정도의 (좋지 않은) 외관, 소리, 진동, 거친 소리 또는 촉각.\nModerately objectionable appearance, sound, vibration, harshness, or haptics.' },
  { fmeaType: 'D-FMEA', category: 'S', rating: 2, levelKr: '낮음', levelEn: 'Low',
    endUser: '약간의 (좋지 않은) 외관, 소리, 진동, 거친 소리 또는 촉각.\nSlightly objectionable appearance, sound, vibration, harshness, or haptics.' },
  { fmeaType: 'D-FMEA', category: 'S', rating: 1, levelKr: '매우 낮음', levelEn: 'Very Low',
    endUser: '인지할 수 있는 영향 없음.\nNo discernible effect.' },
];

// D-FMEA 발생도 기본 데이터 (DFMEA_SOD_AP_기준표_완성.xlsx D2 시트 기준)
export const DEFAULT_DFMEA_OCCURRENCE: Omit<SODItem, 'id'>[] = [
  { fmeaType: 'D-FMEA', category: 'O', rating: 10, levelKr: '극도로 높음', levelEn: 'Extremely High',
    criteria: '운행 경험이 없거나 및/또는 통제되지 않는 운행 조건 하에 어디서든(업계 전체에서) 새로운 기술을 처음으로 적용한다. 제품 검증 및/또는 실현성확인/타당성확인 경험이 없다.\n표준은 존재하지 않으며 모범 사례는 아직 결정되지 않았다.\n예방관리가 필드 성능을 예측할 수 없거나 존재하지 않는다.\nFirst application of new technology anywhere without operating experience and/or under uncontrolled operating conditions. No product verification and/or validation experience.\nStandards do not exist and best practices have not yet been determined.\nPrevention controls not able to predict field performance or do not exist.',
    description: '≥100/1,000\n(1/10)' },
  { fmeaType: 'D-FMEA', category: 'O', rating: 9, levelKr: '매우 높음', levelEn: 'Very High',
    criteria: '회사 내에서 기술 혁신이나 재료로 설계를 처음 사용한다. Duty cycle/운행 조건의 새로운 적용 또는 변경. 제품 검증 및/또는 실현성확인/타당성확인 경험이 없다.\n예방관리는 특정 요구사항에 대한 성능을 식별하기 위해 목표로 하지 않는다.\nFirst use of design with technical innovations or materials within the company. New application, or change in duty cycle/operating conditions. No product verification and/or validation experience.\nPrevention controls not targeted to identify performance to specific requirements.',
    description: '50/1,000\n(1/20)' },
  { fmeaType: 'D-FMEA', category: 'O', rating: 8, levelKr: '매우 높음', levelEn: 'Very High',
    criteria: '새로운 적용에 대한 기술적 혁신이나 재료로 설계를 처음 사용한다. Duty cycle/운행 조건의 새로운 적용 또는 변경. 제품 검증 및/또는 실현성확인/타당성확인 경험이 없다.\n기존 표준 및 모범 사례가 거의 없으며, 이 설계에 직접 적용할 수 없다.\n예방관리는 필드 성능에 대해 신뢰할 수 있는 지표가 아니다.\nFirst use of design with technical innovations or materials on a new application. New application, or change in duty cycle/operating conditions. No product verification and/or validation experience.\nFew existing standards and best practices, not directly applicable for this design.\nPrevention controls not a reliable indicator of field performance.',
    description: '20/1,000\n(1/50)' },
  { fmeaType: 'D-FMEA', category: 'O', rating: 7, levelKr: '높음', levelEn: 'High',
    criteria: '유사한 기술과 재료를 기반으로 한 새로운 설계. Duty cycle/운행 조건의 새로운 적용 또는 변경. 제품 검증 및/또는 실현성확인/타당성확인 경험이 없음.\n표준, 모범 사례 및 설계 규칙은 기본 설계에 적용되지만, 혁신에는 적용되지 않는다. 예방관리는 성능에 대한 제한된 지표를 제공한다.\nNew design based on similar technology and materials. New application, or change in duty cycle/operating conditions. No product verification and/or validation experience.\nStandards, best practices, and design rules apply to the baseline design, but not the innovations. Prevention controls not a reliable indicator of field performance.',
    description: '10/1,000\n(1/100)' },
  { fmeaType: 'D-FMEA', category: 'O', rating: 6, levelKr: '높음', levelEn: 'High',
    criteria: '기존 기술과 재료를 사용하여 이전 설계와 유사하다. Duty cycle 또는 운행 조건의 변경이 있는 유사한 적용. 이전 시험 또는 필드 경험.\n표준 및 설계 규칙이 존재하지만 고장 원인이 발생하지 않도록 보장하기에는 불충분하다. 예방관리는 고장 원인을 예방할 수 있는 일부 능력을 제공한다.\nSimilar to previous designs, using existing technology and materials. Similar application with changes in duty cycle or operating conditions. Previous testing or field experience.\nStandards and design rules exist but are insufficient to ensure that the failure cause will not occur. Prevention controls provide some ability to prevent a failure cause.',
    description: '2/1,000\n(1/500)' },
  { fmeaType: 'D-FMEA', category: 'O', rating: 5, levelKr: '중간', levelEn: 'Moderate',
    criteria: '입증된 기술과 재료를 사용하여 이전 설계에 대한 세부사항을 변경한다. 유사한 적용, duty cycle 또는 운행 조건. 이전 시험 또는 필드 경험이나 고장과 관련된 일부 시험 경험이 있는 새로운 설계.\n설계는 이전 설계로부터 얻은 학습 교훈을 다룬다. 모범 사례는 이 설계에 대해 재평가되었지만 아직 입증되지 않았다.\n예방관리는 고장 원인과 관련된 제품의 결함을 찾아내고, 일부 성능 지표를 제공할 수 있다.\nDetail changes to previous design using proven technology and materials. Similar application, duty cycle or operating conditions. Previous testing or field experience, or new design with some test experience related to the failure.\nDesign addresses lessons learned from previous designs. Best Practices re-evaluated for this design, but have not yet been proven.\nPrevention controls capable of finding deficiencies in the product related to the failure cause and provide some indication of performance.',
    description: '0.5/1,000\n(1/2,000)' },
  { fmeaType: 'D-FMEA', category: 'O', rating: 4, levelKr: '중간', levelEn: 'Moderate',
    criteria: '단기적 필드 노출과 거의 동일한 설계. Duty cycle 또는 운행 조건을 약간 변경한 유사한 적용. 이전 시험 또는 필드 경험.\n새로운 설계의 선행 설계 및 변경은 모범 사례, 표준 및 시방에 부합한다.\n예방관리는 고장 원인과 관련된 제품의 결함을 찾아내고, 설계 적합성을 나타낼 수 있다.\nAlmost identical design with short-term field exposure. Similar application, with minor change in duty cycle or operating conditions. Previous testing or field experience.\nPredecessor design and changes for new design conform to best practices, standards, and specifications.\nPrevention controls capable of finding deficiencies in the product related to the failure cause, and indicate likely design conformance.',
    description: '0.1/1,000\n(1/10,000)' },
  { fmeaType: 'D-FMEA', category: 'O', rating: 3, levelKr: '낮음', levelEn: 'Low',
    criteria: '비교 가능한 운행 조건 하에서 알려진 설계(duty cycle 이나 운행 조건의 약간의 변경을 갖는 동일 적용)에 대한 세부사항 변경 및 시험 또는 필드 경험.\n또는 시험 절차가 성공적으로 완료된 새로운 설계.\n이전 설계로부터의 학습 교훈을 고려하여, 표준 및 모범 사례에 적합할 것으로 기대되는 설계.\n예방관리는 고장 원인과 관련된 제품의 결함을 찾고, 생산 설계의 적합성을 예측할 수 있다.\nDetail changes to known design (same application with minor change in duty cycle or operating conditions) and testing or field experience under comparable operating conditions, or new design with successfully completed test procedure.\nDesign expected to conform to Standards and Best Practices considering Lessons Learned.\nPrevention controls capable of finding deficiencies in the product related to the failure cause and predict conformance of production design.',
    description: '0.01/1,000\n(1/100,000)' },
  { fmeaType: 'D-FMEA', category: 'O', rating: 2, levelKr: '매우 낮음', levelEn: 'Very Low',
    criteria: '장기적인 필드 노출과 거의 동일한 성숙한 설계. 비교 가능한 duty cycle 및 운행 조건을 갖는 동일한 적용.\n이전 설계의 학습 교훈을 고려하여, 상당한 신뢰를 갖고 표준 및 모범 사례에 적합할 것으로 기대되는 설계.\n예방관리는 고장 원인과 관련된 제품의 결함을 찾고, 설계 적합성에 대한 확신을 나타낼 수 있다.\nAlmost identical mature design with long term field exposure. Same application, with comparable duty cycle and operating conditions.\nDesign expected to conform to Standards and Best Practices considering Lessons Learned from previous designs with significant margin of confidence.\nPrevention controls capable of finding deficiencies and indicate confidence in design conformance.',
    description: '<0.001/1,000\n(1/1,000,000)' },
  { fmeaType: 'D-FMEA', category: 'O', rating: 1, levelKr: '극도로 낮음', levelEn: 'Extremely Low',
    criteria: '예방관리를 통해 고장이 제거되며, 고장 원인은 설계상 발생이 불가능하다.\nFailure eliminated through prevention control and failure cause is not possible by design.',
    description: '예방관리를 통해 제거됨\nFailure eliminated through prevention control' },
];

// D-FMEA 검출도 기본 데이터 (DFMEA_SOD_AP_기준표_완성.xlsx D3 시트 기준)
export const DEFAULT_DFMEA_DETECTION: Omit<SODItem, 'id'>[] = [
  { fmeaType: 'D-FMEA', category: 'D', rating: 10, levelKr: '매우 낮음', levelEn: 'Very Low',
    criteria: '아직 개발되지 않은 시험 절차.\nTest procedure yet to be developed.',
    description: '시험 방법이 정의되지 않음\nTest method not defined' },
  { fmeaType: 'D-FMEA', category: 'D', rating: 9, levelKr: '매우 낮음', levelEn: 'Very Low',
    criteria: '고장 형태 또는 원인을 검출하도록 구체적으로 설계되지 않은 시험 방법.\nTest method not designed specifically to detect failure mode or cause.',
    description: '합격-불합격, 불합격 시험, 저하 시험\nPass-Fail, Test-to-Fail, Degradation Testing' },
  { fmeaType: 'D-FMEA', category: 'D', rating: 8, levelKr: '낮음', levelEn: 'Low',
    criteria: '새로운 시험 방법; 입증되지 않음.\nNew test method; not proven.',
    description: '합격-불합격, 불합격 시험, 저하 시험\nPass-Fail, Test-to-Fail, Degradation Testing' },
  { fmeaType: 'D-FMEA', category: 'D', rating: 7, levelKr: '낮음', levelEn: 'Low',
    criteria: '새로운 시험방법; 양산승인 전 양산 툴 변경을 위한 시간이 충분하지 못함.\nNew test method; not proven; planned timing is not sufficient to modify production tools before release for production.',
    description: '합격-불합격 시험\nPass-Fail Testing' },
  { fmeaType: 'D-FMEA', category: 'D', rating: 6, levelKr: '중간', levelEn: 'Moderate',
    criteria: '기능 검증 또는 성능, 품질, 신뢰성 및 내구성의 유효성확인을 위한 입증된 시험방법; 시험실패로 인한 재설계 및/또는 재 툴링을 위한 생산 지연이 발생할 수 있는 제품개발 사이클의 후반부에 계획됨.\nProven test method for verification of functionality or validation of performance, quality, reliability and durability; planned timing is later in the product development cycle such that test failures may result in production delays for re-design and/or re-tooling.',
    description: '불합격 시험\nTest-to-Failure' },
  { fmeaType: 'D-FMEA', category: 'D', rating: 5, levelKr: '중간', levelEn: 'Moderate',
    criteria: '기능 검증 또는 성능, 품질, 신뢰성 및 내구성의 유효성확인을 위한 입증된 시험방법; 시험실패로 인한 재설계 및/또는 재 툴링을 위한 생산 지연이 발생할 수 있는 제품개발 사이클의 후반부에 계획됨.\nProven test method for verification of functionality or validation of performance, quality, reliability and durability; planned timing is later in the product development cycle such that test failures may result in production delays for re-design and/or re-tooling.',
    description: '저하 시험 (성능저하/열화)\nDegradation Testing' },
  { fmeaType: 'D-FMEA', category: 'D', rating: 4, levelKr: '높음', levelEn: 'High',
    criteria: '성능, 품질, 신뢰성 및 내구성의 기능검증 또는 실현성확인/타당성확인을 위한 입증된 시험방법; 계획된 타이밍은 불출 전에 생산 도구를 수정하기에 충분하다.\nProven test method for verification of functionality or validation of performance, quality, reliability and durability; planned timing is sufficient to modify production tools before release for production.',
    description: '합격-불합격, 불합격 시험\nPass-Fail, Test-to-Failure' },
  { fmeaType: 'D-FMEA', category: 'D', rating: 3, levelKr: '높음', levelEn: 'High',
    criteria: '성능, 품질, 신뢰성 및 내구성의 기능검증 또는 실현성확인/타당성확인을 위한 입증된 시험방법; 계획된 타이밍은 불출 전에 생산 도구를 수정하기에 충분하다.\nProven test method for verification of functionality or validation of performance, quality, reliability and durability; planned timing is sufficient to modify production tools before release for production.',
    description: '불합격 시험\nTest-to-Failure' },
  { fmeaType: 'D-FMEA', category: 'D', rating: 2, levelKr: '높음', levelEn: 'High',
    criteria: '성능, 품질, 신뢰성 및 내구성의 기능검증 또는 실현성확인/타당성확인을 위한 입증된 시험방법; 계획된 타이밍은 불출 전에 생산 도구를 수정하기에 충분하다.\nProven test method for verification of functionality or validation of performance, quality, reliability and durability; planned timing is sufficient to modify production tools before release for production.',
    description: '저하 시험 (성능저하/열화)\nDegradation Testing' },
  { fmeaType: 'D-FMEA', category: 'D', rating: 1, levelKr: '매우 높음', levelEn: 'Very High',
    criteria: '시험 전에 고장 형태 또는 원인이 발생할 수 없음을 확인하거나, 고장 형태 또는 고장 원인을 항상 검출하는 것으로 입증된 검출 방법을 확인한다.\nPrior testing confirmed that failure mode or cause cannot occur, or detection methods proven to always detect the failure mode or failure cause.',
    description: '' },
];

// =====================================================
// 정오표 (Errata) — AIAG & VDA FMEA Handbook 1st Edition, Version 2 (2020-06-02)
// SOD/AP 기준표 관련 항목만 발췌 — 도움말 표시용
// =====================================================
export const SOD_ERRATA_NOTES: { page: string; section: string; target: string; original: string; corrected: string }[] = [
  {
    page: '108', section: '3.5.6 Table P1 S=10', target: 'PFMEA 심각도',
    original: 'Failure may result in an acute health and/or safety risk...',
    corrected: '"acute"(급성) 삭제 → Your Plant, Ship-to-Plant 양쪽 모두 적용'
  },
  {
    page: '108', section: '3.5.6 Table P1 S=8', target: 'PFMEA 심각도',
    original: 'Your Plant: ...regulatory noncompliance or chronic health/safety risk / Ship-to: 동일',
    corrected: '규제 미준수/만성 건강·안전 리스크 문구 삭제 (YP, SP 양쪽)'
  },
  {
    page: '67', section: '2.5.9 Table D3 D=7', target: 'DFMEA 검출도',
    original: 'Proven test method; planned timing is later in the product development cycle...',
    corrected: '→ New test method; not proven; planned timing is not sufficient to modify production tools before release for production.\n("입증된 시험방법"에서 "새로운(입증되지 않은) 시험방법"으로 전면 교체)'
  },
  {
    page: '65/111/197', section: 'Table D2/P2 비고', target: 'DFMEA·PFMEA 발생도',
    original: 'Note: O = 10, 9, 8, 7 can drop based on product validation activities.',
    corrected: '→ Occurrence can drop based on product validation activities.\n(특정 등급(10,9,8,7)이 아닌 모든 발생도 등급으로 확대)'
  },
  {
    page: '190-191', section: 'C1.3.2 DFMEA 대안2', target: 'DFMEA 발생도',
    original: 'Table C1.3.2 – Alternative DFMEA Occurrence (O) for Time Based Failure Prediction',
    corrected: '→ 테이블 전체 삭제 (DFMEA 대안2 시간기반 고장 예측 제거)'
  },
];

// P7+: canonical uid 기반 SOD 전용 ID (crypto.getRandomValues)
import { uid as _coreUid } from '@/app/(fmea-core)/pfmea/worksheet/schema/utils/uid';
export const uid = () => 'sod' + _coreUid().slice(2); // id_ → sod_ 프리픽스 교체

/** H→L 최단거리 목표값 (시뮬레이션용) */
export const getSODTargetRating = (current: number): number => {
  if (current >= 6) return 3;
  if (current >= 4) return 2;
  return 1;
};

/**
 * SOD 개선 추천 데이터 조회
 * 현재 발생도/검출도에서 개선목표 등급의 SOD 기준 항목을 반환
 */
export function getSODRecommendation(
  fmeaType: 'P-FMEA' | 'D-FMEA',
  category: 'O' | 'D',
  targetRating: number,
): SODItem | null {
  if (typeof window === 'undefined') return null;

  const activeStd = localStorage.getItem('sod_active_standard') || DEFAULT_STANDARD;
  const savedData = localStorage.getItem('sod_master_data');

  let items: SODItem[] = [];
  if (savedData) {
    try { items = JSON.parse(savedData); } catch { /* ignore */ }
  }

  // localStorage에 데이터가 없으면 기본 데이터 사용
  if (items.length === 0) {
    const defaults = category === 'O'
      ? (fmeaType === 'P-FMEA' ? DEFAULT_PFMEA_OCCURRENCE : DEFAULT_DFMEA_OCCURRENCE)
      : (fmeaType === 'P-FMEA' ? DEFAULT_PFMEA_DETECTION : DEFAULT_DFMEA_DETECTION);
    const found = defaults.find(d => d.rating === targetRating);
    return found ? { ...found, id: uid() } as SODItem : null;
  }

  // localStorage 데이터에서 매칭
  const match = items.find(item =>
    (item.standard || DEFAULT_STANDARD) === activeStd &&
    item.fmeaType === fmeaType &&
    item.category === category &&
    item.rating === targetRating
  );

  return match || null;
}


