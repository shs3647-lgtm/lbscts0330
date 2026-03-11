/**
 * @file SODMasterData.ts
 * @description SOD(심각도/발생도/검출도) 마스터 기본 데이터
 * P-FMEA 및 D-FMEA의 SOD 기준표 (AIAG & VDA FMEA Handbook 기준)
 */

export interface SODItem {
  id: string;
  fmeaType: 'P-FMEA' | 'D-FMEA';
  category: 'S' | 'O' | 'D'; // Severity, Occurrence, Detection
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
}

// P-FMEA 심각도 기본 데이터 (AIAG & VDA FMEA Handbook 기준)
export const DEFAULT_PFMEA_SEVERITY: Omit<SODItem, 'id'>[] = [
  { 
    fmeaType: 'P-FMEA', category: 'S', rating: 10, levelKr: '매우 높음', levelEn: 'Very High', 
    yourPlant: '고장으로 제조/조립근로자의 건강 및/또는 안전 리스크 초래 가능 (Failure may result in health and/or safety risk for manufacturing or assembly worker)', 
    shipToPlant: '고장으로 제조/조립근로자의 건강 및/또는 안전 리스크 초래 가능 (Failure may result in health and/or safety risk for manufacturing or assembly worker)', 
    endUser: '차량 및/또는 다른 자동차의 안전운행, 운전자, 승객 또는 도로 사용자나 보행자의 건강에 영향을 미침 (Affects safe operation of the vehicle and/or other vehicles, the health of driver or passenger(s) or road users or pedestrians)' 
  },
  { 
    fmeaType: 'P-FMEA', category: 'S', rating: 9, levelKr: '매우 높음', levelEn: 'Very High', 
    yourPlant: '고장이 발생하면 공장내 규제 미준수로 이어질수 있음 (Failure may result in in-plant regulatory non-compliance)', 
    shipToPlant: '고장이 발생하면 공장내 규제 미준수로 이어질수 있음 (Failure may result in in-plant regulatory non-compliance)', 
    endUser: '규제사항 미준수 (Noncompliance with regulations)' 
  },
  { 
    fmeaType: 'P-FMEA', category: 'S', rating: 8, levelKr: '높음', levelEn: 'High', 
    yourPlant: '영향을 받은 생산제품의 100%가 폐기될 수 있음 (100% of production run affected may have to be scrapped)', 
    shipToPlant: '1 Shift 이상 라인중단; 출하중단 가능 (Line shutdown greater than full production shift)', 
    endUser: '기대되는 사용수명기간 동안 정상 주행에 필요한 자동차 주요 기능의 상실 (Loss of primary vehicle function necessary for normal driving during expected service life)' 
  },
  { 
    fmeaType: 'P-FMEA', category: 'S', rating: 7, levelKr: '높음', levelEn: 'High', 
    yourPlant: '① 제품을 선별하고 일부 폐기 할 수도 있음 ② 공정에서 기준이탈; 라인속도저하, 인력추가필요 (Product may have to be sorted and portion scrapped; deviation from primary process; decreased line speed or added manpower)', 
    shipToPlant: '1시간~1shift 라인중단; 출하중단 가능; 규정 미준수이외에 필드수리/교체 (Line shutdown from 1 hour up to full production shift; stop shipment possible)', 
    endUser: '기대되는 사용수명기간 동안 정상 주행에 필요한 자동차 주요 기능의 저하 (Degradation of primary vehicle function necessary for normal driving during expected service life)' 
  },
  { 
    fmeaType: 'P-FMEA', category: 'S', rating: 6, levelKr: '중간', levelEn: 'Moderate', 
    yourPlant: '100% 라인 밖에서 재작업 및 승인 (100% of production run may have to be reworked off line and accepted)', 
    shipToPlant: '최대 1시간 까지 라인 중단 (Impact to Ship-to-Plant when known)', 
    endUser: '자동차 보조 기능 상실 (Loss of secondary vehicle function)' 
  },
  { 
    fmeaType: 'P-FMEA', category: 'S', rating: 5, levelKr: '중간', levelEn: 'Moderate', 
    yourPlant: '일부 제품을 라인밖에서 재작업 및 승인 (A portion of the production run may have to be reworked offline and accepted)', 
    shipToPlant: '영향을 받은 제품 100%미만; 추가적인 제품결함 가능성; 선별필요; 라인중단 없음 (Less than 100% of product affected; strong possibility for additional defective product; sort required; no line shutdown)', 
    endUser: '매우 좋지않은 외관, 소리, 진동, 거친소리 또는 촉각 (Very objectionable appearance, sound, vibration, harshness, or haptics)' 
  },
  { 
    fmeaType: 'P-FMEA', category: 'S', rating: 4, levelKr: '중간', levelEn: 'Moderate', 
    yourPlant: '100% 스테이션에서 재작업 (100% of production run may have to be reworked in station before it is processed)', 
    shipToPlant: '제품결함으로 중대한 대응 계획 유발; 추가적인 제품결함 가능성 없음; 선별필요 없음 (Defective product triggers significant reaction plan; additional defective products not likely; sort not required)', 
    endUser: '매우 좋지않은 외관, 소리, 진동, 거친소리 또는 촉각 (Very objectionable appearance, sound, vibration, harshness, or haptics)' 
  },
  { 
    fmeaType: 'P-FMEA', category: 'S', rating: 3, levelKr: '낮음', levelEn: 'Low', 
    yourPlant: '일부 제품을 스테이션내 에서 재작업 (A portion of the production run may have to be reworked in-station before it is processed)', 
    shipToPlant: '제품결함으로 경미한 대응 계획 유발; 추가적인 제품결함 가능성 없음; 선별필요 없음 (Defective product triggers minor reaction plan; additional defective products not likely; sort not required)', 
    endUser: '중간정도의 좋지않은 외관, 소리, 진동, 거친소리 또는 촉각 (Moderately objectionable appearance, sound, vibration, harshness, or haptics)' 
  },
  { 
    fmeaType: 'P-FMEA', category: 'S', rating: 2, levelKr: '낮음', levelEn: 'Low', 
    yourPlant: '공정, 작업 또는 작업자에게 약간의 불편 함 (Slight inconvenience to process, operation, or operator)', 
    shipToPlant: '제품결함으로 대응 계획 유발 없음; 추가적인 제품결함 가능성 없음; 선별필요 없음. 공급자에게 피드백 요구 (Defective product triggers no reaction plan; additional defective products not likely; sort not required; requires feedback to supplier)', 
    endUser: '약간 좋지않은 외관, 소리, 진동, 거친소리 또는 촉각 (Slightly objectionable appearance, sound, vibration, harshness, or haptics)' 
  },
  { 
    fmeaType: 'P-FMEA', category: 'S', rating: 1, levelKr: '매우 낮음', levelEn: 'Very Low', 
    yourPlant: '식별 가능한 영향이 없거나 영향이 없음 (No discernible effect)', 
    shipToPlant: '식별 가능한 영향이 없거나 영향이 없음 (No discernible effect)', 
    endUser: '인지할 수 있는 영향 없음 (No discernible effect)' 
  },
];

// P-FMEA 발생도 기본 데이터 (AIAG & VDA FMEA Handbook 기준)
export const DEFAULT_PFMEA_OCCURRENCE: Omit<SODItem, 'id'>[] = [
  { 
    fmeaType: 'P-FMEA', category: 'O', rating: 10, levelKr: '극도로 높음', levelEn: 'Extremely High', 
    controlType: '없음\nNone',
    preventionControl: '예방관리 없음\nNo prevention controls.',
    description: '100개/1,000개, 매번\n1/10개' 
  },
  { 
    fmeaType: 'P-FMEA', category: 'O', rating: 9, levelKr: '매우 높음', levelEn: 'Very High', 
    controlType: '행동적\nBehavioral',
    preventionControl: '예방관리는 고장원인을 예방하는데 거의 효과가 없음\nPrevention controls will have little effect in preventing failure cause.',
    description: '50개/1,000개, 거의 매번\n1개/20개' 
  },
  { 
    fmeaType: 'P-FMEA', category: 'O', rating: 8, levelKr: '매우 높음', levelEn: 'Very High', 
    controlType: '행동적\nBehavioral',
    preventionControl: '예방관리는 고장원인을 예방하는데 거의 효과가 없음\nPrevention controls will have little effect in preventing failure cause.',
    description: '20개/1,000개, 교대당 1회 이상\n1개/50개' 
  },
  { 
    fmeaType: 'P-FMEA', category: 'O', rating: 7, levelKr: '높음', levelEn: 'High', 
    controlType: '행동적 또는 기술적\nBehavioral or Technical',
    preventionControl: '예방관리는 고장원인을 예방하는데 다소 효과적 임\nPrevention controls somewhat effective in preventing failure cause.',
    description: '10개/1,000개, 일일 1회 이상\n1개/50개' 
  },
  { 
    fmeaType: 'P-FMEA', category: 'O', rating: 6, levelKr: '높음', levelEn: 'High', 
    controlType: '행동적 또는 기술적\nBehavioral or Technical',
    preventionControl: '예방관리는 고장원인을 예방하는데 다소 효과적 임\nPrevention controls somewhat effective in preventing failure cause.',
    description: '2개/1,000개, 주간 1회 이상\n1개/500개' 
  },
  { 
    fmeaType: 'P-FMEA', category: 'O', rating: 5, levelKr: '중간', levelEn: 'Moderate', 
    controlType: '행동적 또는 기술적\nBehavioral or Technical',
    preventionControl: '예방관리는 고장원인을 예방하는데 효과적 임\nPrevention controls are effective in preventing failure cause.',
    description: '0.5개/1,000개, 월간 1회 이상\n1개/2,000개' 
  },
  { 
    fmeaType: 'P-FMEA', category: 'O', rating: 4, levelKr: '중간', levelEn: 'Moderate', 
    controlType: '행동적 또는 기술적\nBehavioral or Technical',
    preventionControl: '예방관리는 고장원인을 예방하는데 효과적 임\nPrevention controls are effective in preventing failure cause.',
    description: '0.1개/1,000개, 연간 1회 이상\n1개/10,000개' 
  },
  { 
    fmeaType: 'P-FMEA', category: 'O', rating: 3, levelKr: '낮음', levelEn: 'Low', 
    controlType: '모범사례; 행동적 또는 기술적\nBest Practice; Behavioral or Technical',
    preventionControl: '예방관리는 고장원인을 예방하는데 매우 효과적 임\nPrevention controls are highly effective in preventing failure cause.',
    description: '0.001개/1,000개, 1년에 1회\n1개/100,000개' 
  },
  { 
    fmeaType: 'P-FMEA', category: 'O', rating: 2, levelKr: '매우 낮음', levelEn: 'Very Low', 
    controlType: '기술적\nTechnical',
    preventionControl: '예방관리는 고장원인을 예방하는데 매우 효과적 임\nPrevention controls are effective in preventing failure cause.',
    description: '0.001개 미만/1,000개, 매년 1회 미만\n1개/1,000,000개' 
  },
  { 
    fmeaType: 'P-FMEA', category: 'O', rating: 1, levelKr: '극도로 낮음', levelEn: 'Extremely Low', 
    controlType: '기술적\nTechnical',
    preventionControl: '설계(부품형상) 또는 공정(지그,치공구)로 고장원인을 예방하는데 매우 효과적임\n예방관리 의도-고장원인으로 인한 고장 형태를 물리적으로 생산 할 수 없음\nPrevention controls are extremely effective in preventing failure cause from occurring due to design or process.\nIntent of Prevention Controls-Failure Mode cannot be physically produced due to the Failure Cause.',
    description: '예방관리를 통해 제거됨\nFailure is eliminated through prevention control' 
  },
];

// P-FMEA 검출도 기본 데이터 (AIAG & VDA FMEA Handbook 기준)
export const DEFAULT_PFMEA_DETECTION: Omit<SODItem, 'id'>[] = [
  { 
    fmeaType: 'P-FMEA', category: 'D', rating: 10, levelKr: '매우 낮음', levelEn: 'Very Low', 
    criteria: '시험 또는 검사방법이 수립되거나 알려지지 않음 (No testing or inspection method has been established or is known.)', 
    description: '고장형태가 검출되지 않거나 검출될 수 없음 (The failure mode will not or cannot be detected.)' 
  },
  { 
    fmeaType: 'P-FMEA', category: 'D', rating: 9, levelKr: '매우 낮음', levelEn: 'Very Low', 
    criteria: '시험 또는 검사방법이 고장형태를 검출할 가능성이 낮음 (It is unlikely that the testing or inspection method will detect the failure mode.)', 
    description: '고장형태는 무작위 또는 산발적 심사를 통해 쉽게 검출되지 않음 (The failure mode is not easily detected through random or sporadic audits.)' 
  },
  { 
    fmeaType: 'P-FMEA', category: 'D', rating: 8, levelKr: '낮음', levelEn: 'Low', 
    criteria: '시험 또는 검사 방법이 효과적이며, 신뢰할 만한 것으로 입증되지 않음. 공장은 방법, 게이지 R&R 결과의 비교 가능한 공정 또는 적용에 경험이 없음 (Test or inspection method has not been proven to be effective and reliable. e.g. plant has little or no experience with method, gauge R&R results marginal on comparable process or this application etc)', 
    description: '사람의 검사(시각,촉각,청각) 또는 고장형태나 원인을 검출해야 하는 수동 게이지(속성/변동) 사용 (Human inspection (visual, tactile, audible), or use of manual gauging (attribute or variable) that should detect the failure mode or failure cause.)' 
  },
  { 
    fmeaType: 'P-FMEA', category: 'D', rating: 7, levelKr: '낮음', levelEn: 'Low', 
    criteria: '시험 또는 검사 방법이 효과적이며, 신뢰할 만한 것으로 입증되지 않음 (Test or inspection method has not been proven to be effective and reliable.)', 
    description: '기계기반 검출(조명,부저-자동/반자동) 또는 고장형태 또는 고장원인을 검출해야하는 3차원 측정기 같은 검사장비 사용 (Machine-based detection (automated or semi-automated with notification by light, buzzer, etc.), or use of inspection equipment such as a coordinate measuring machine that should detect failure mode or failure cause.)' 
  },
  { 
    fmeaType: 'P-FMEA', category: 'D', rating: 6, levelKr: '중간', levelEn: 'Moderate', 
    criteria: '시험 또는 검사방법이 효과적이고 신뢰할 수 있으며(공장이 동일한 공정 또는 적용에 대한 경험이 있음) 게이지 R&R 결과 수용이 가능하다는 등이 입증됨 (Test or inspection method has been proven to be effective and reliable. e.g. plant has experience with method, gauge R&R results are acceptable on comparable process or this application, etc.)', 
    description: '사람의 검사(시각, 촉각, 청각) 또는 고장형태나 고장원인을 검출 할 수 있는 수동게이지(계량형/계수형) 사용 (Human inspection (visual, tactile, audible), or use of manual gauging (attribute or variable) that will detect the failure mode or failure cause (including product sample checks).)' 
  },
  { 
    fmeaType: 'P-FMEA', category: 'D', rating: 5, levelKr: '중간', levelEn: 'Moderate', 
    criteria: '시험 또는 검사방법이 효과적이고 신뢰할 수 있으며(공장이 동일한 공정 또는 적용에 대한 경험이 있음) 게이지 R&R 결과 수용이 가능하다는 등이 입증됨 (Test or inspection method has been proven to be effective and reliable. gauge R&R results are acceptable on comparable process or this application, etc.)', 
    description: '기계기반 검출(조명,부저-반자동) 또는 고장형태 또는 고장원인을 검출하는 3차원 측정기 같은 검사장비 사용 (Machine-based detection (semi-automated with notification by light, buzzer, etc.), or use of inspection equipment such as a coordinate measuring machine that will detect failure mode or failure cause (including product sample checks).)' 
  },
  { 
    fmeaType: 'P-FMEA', category: 'D', rating: 4, levelKr: '높음', levelEn: 'High', 
    criteria: '시스템이 효과적이고 신뢰할 수 있으며(공장이 동일한 공정 또는 적용에 대한 경험이 있음) 게이지 R&R 결과 수용이 가능하다는 등이 입증됨 (System has been proven to be effective and reliable. Gauge R&R results are acceptable, etc.)', 
    description: '하류부문에서 고장형태를 검출하고 더 이상 유출을 방지하거나 시스템이 제품을 불일치로 식별하여 지정된 불합격 하적영역까지 자동으로 취출되도록 하는 기계기반 자동검출 방법. 서로 어긋나는 제품은 시설에서 제품이 유출되지 않도록 관리하는 강건한 시스템으로 관리 (Machine-based automated detection method that will detect the failure mode downstream, prevent further processing or system will identify the product as discrepant and allow it to automatically move forward in the process until the designated reject unload area. Discrepant product will be controlled by a robust system that will prevent outflow of the product from the facility.)' 
  },
  { 
    fmeaType: 'P-FMEA', category: 'D', rating: 3, levelKr: '높음', levelEn: 'High', 
    criteria: '시스템이 효과적이고 신뢰할 수 있으며(공장이 동일한 공정 또는 적용에 대한 경험이 있음) 게이지 R&R 결과 수용이 가능하다는 등이 입증됨 (System has been proven to be effective and reliable (e.g. plant has experience with method) on identical process or this application. Gauge R&R results are acceptable, etc.)', 
    description: '스테이션내에서 고장형태를 검출하고 더 이상 유출을 방지하거나 시스템이 제품을 불일치로 식별하여 지정된 불합격 하적영역까지 자동으로 취출되도록 하는 기계기반 자동검출 방법. 불일치 제품이 유출되지 않도록하는 견고한 시스템으로 관리 됨 (Machine-based automated detection method that will detect the failure mode in-station, prevent further processing or system will identify the product as discrepant and allow it to automatically move forward in the process until the designated reject unload area. Discrepant product will be controlled by a robust system that will prevent outflow of the product from the facility.)' 
  },
  { 
    fmeaType: 'P-FMEA', category: 'D', rating: 2, levelKr: '높음', levelEn: 'High', 
    criteria: '검출방법은 효과적으로 신뢰할 수 있음 (경험이 있고, 실수방지 검증 등) (Detection method has been proven to be effective and reliable (e.g. plant has experience with method, error-proofing verifications, etc.).)', 
    description: '원인을 검출하고 고장형태가 생산되지 않도록하는 기계기반 검출방법 (Machine-based detection method that will detect the cause and prevent the failure mode (discrepant part) from being produced.)' 
  },
  { 
    fmeaType: 'P-FMEA', category: 'D', rating: 1, levelKr: '매우 높음', levelEn: 'Very High', 
    criteria: '고장형태는 물리적으로 설계 또는 생산 될 수 없으며, 항상 고장형태 또는 고장원인을 검출하는 방법으로 입증 됨 (Failure mode cannot be physically produced as-designed or processed, or detection methods proven to always detect the failure mode or failure cause.)', 
    description: '' 
  },
];

// =====================================================
// D-FMEA 기본 데이터 (AIAG & VDA FMEA Handbook 기준)
// =====================================================

// D-FMEA 심각도 기본 데이터
export const DEFAULT_DFMEA_SEVERITY: Omit<SODItem, 'id'>[] = [
  { fmeaType: 'D-FMEA', category: 'S', rating: 10, levelKr: '매우 높음', levelEn: 'Very High', 
    endUser: '차량 및/또는 다른 자동차의 안전운행, 운전자, 승객 또는 도로 사용자나 보행자의 건강에 영향을 미침\nAffects safe operation of the vehicle and/or other vehicles, the health of driver or passenger(s) or road users or pedestrians.' },
  { fmeaType: 'D-FMEA', category: 'S', rating: 9, levelKr: '매우 높음', levelEn: 'Very High', 
    endUser: '규제사항 미준수\nNoncompliance with regulations.' },
  { fmeaType: 'D-FMEA', category: 'S', rating: 8, levelKr: '높음', levelEn: 'High', 
    endUser: '기대되는 사용수명기간 동안 정상 주행에 필요한 자동차 주요 기능의 상실\nLoss of primary vehicle function necessary for normal driving during expected service life.' },
  { fmeaType: 'D-FMEA', category: 'S', rating: 7, levelKr: '높음', levelEn: 'High', 
    endUser: '기대되는 사용수명기간 동안 정상 주행에 필요한 자동차 주요 기능의 저하\nDegradation of primary vehicle function necessary for normal driving during expected service life.' },
  { fmeaType: 'D-FMEA', category: 'S', rating: 6, levelKr: '중간', levelEn: 'Moderate', 
    endUser: '자동차 보조 기능 상실\nLoss of secondary vehicle function.' },
  { fmeaType: 'D-FMEA', category: 'S', rating: 5, levelKr: '중간', levelEn: 'Moderate', 
    endUser: '자동차 보조 기능 저하\nDegradation of secondary vehicle function.' },
  { fmeaType: 'D-FMEA', category: 'S', rating: 4, levelKr: '중간', levelEn: 'Moderate', 
    endUser: '매우 좋지않은 외관, 소리, 진동, 거친소리 또는 촉각\nVery objectionable appearance, sound, vibration, harshness, or haptics.' },
  { fmeaType: 'D-FMEA', category: 'S', rating: 3, levelKr: '낮음', levelEn: 'Low', 
    endUser: '중간정도의 좋지않은 외관, 소리, 진동, 거친소리 또는 촉각\nModerately objectionable appearance, sound, vibration, harshness, or haptics.' },
  { fmeaType: 'D-FMEA', category: 'S', rating: 2, levelKr: '낮음', levelEn: 'Low', 
    endUser: '약간 좋지않은 외관, 소리, 진동, 거친소리 또는 촉각\nSlightly objectionable appearance, sound, vibration, harshness, or haptics.' },
  { fmeaType: 'D-FMEA', category: 'S', rating: 1, levelKr: '매우 낮음', levelEn: 'Very Low', 
    endUser: '인지할 수 있는 영향 없음\nNo discernible effect.' },
];

// D-FMEA 발생도 기본 데이터 (AIAG & VDA FMEA Handbook 기준)
export const DEFAULT_DFMEA_OCCURRENCE: Omit<SODItem, 'id'>[] = [
  { fmeaType: 'D-FMEA', category: 'O', rating: 10, levelKr: '극도로 높음', levelEn: 'Extremely High', 
    criteria: '① 운행경험 및/또는 통제되지 않은 운행조건하에서 새로운 기술을 처음으로 적용한다.\n② 제품검증 및/또는 타당성 확인 경험이 없다\n③ 표준은 존재하지 않으며, 모범사례는 아직 결정되지 않았다.\n④ 예방관리가 필드성능을 예측할 수 없거나, 존재하지 않는다.\n① First application of new technology anywhere without operating experience and/or under uncontrolled operating conditions.\n② No product verification and/or validation experience.\n③ Standards do not exist and best practices have not yet been determined.\n④ Prevention controls not able to predict field performance or do not exist.',
    description: '100개/1,000개\n1/10개' },
  { fmeaType: 'D-FMEA', category: 'O', rating: 9, levelKr: '매우 높음', levelEn: 'Very High', 
    criteria: '① 회사 내에서 기술혁신이나 재료로 설계를 처음 사용한다.\n② 새로운 적용 또는 부품 수명의 변경 / 운행(자동차 사용) 조건 변화.\n③ 제품검증 및/또는 타당성 확인 경험이 없다.\n④ 예방관리는 특정 요구사항에 대한 성능을 식별하기 위해 목표로 하지 않는다.\n① First use of design with technical innovations or materials within the company.\n② New application, or change in duty cycle / operating conditions.\n③ No product verification and/or validation experience.\n④ Prevention controls not targeted to identify performance to specific requirements.',
    description: '50개/1,000개\n1개/20개' },
  { fmeaType: 'D-FMEA', category: 'O', rating: 8, levelKr: '매우 높음', levelEn: 'Very High', 
    criteria: '① 새로운 적용 분야에 기술혁신이나 재료를 설계에 처음 사용\n② 새로운 어플리케이션 또는 듀티 사이클 / 운행조건\n③ 제품 검증 및 / 또는 유효성 검사 경험이 없음.\n④ 설계에 직접 적용 할 있는 표준이나 모범사례가 거의 없음.\n⑤ 예방관리가 필드성능에 대해 신뢰할 만한 지표가 아님.\n① First use of design with technical innovations or materials on a new application.\n② New application, or change in duty cycle/operating conditions.\n③ No product verification and/or validation experience.\n④ Few existing standards and best practices, not directly applicable for this design.\n⑤ Prevention controls not a reliable indicator of field performance.',
    description: '20개/1,000개\n1개/20개' },
  { fmeaType: 'D-FMEA', category: 'O', rating: 7, levelKr: '높음', levelEn: 'High', 
    criteria: '① 유사한 기술과 재료를 바탕으로 한 새로운 설계\n② 새로운 어플리케이션 또는 듀티 사이클 / 운행조건\n③ 제품 검증 및 / 또는 유효성 검사 경험이 없음.\n④ 표준이나 모범사례가 기본설계에 적용되지만, 혁신은 적용되지 않음\n⑤ 예방관리가 필드성능에 대해 신뢰할 만한 지표가 아님.\n① New design based on similar technology and materials.\n② New application, or change in duty cycle/operating conditions.\n③ No product verification and/or validation experience.\n④ Standards, best practices, and design rules apply to the baseline design, but not the innovations.\n⑤ Prevention controls not a reliable indicator of field performance.',
    description: '10개/1,000개\n1개/100개' },
  { fmeaType: 'D-FMEA', category: 'O', rating: 6, levelKr: '높음', levelEn: 'High', 
    criteria: '① 기존 기술과 재료를 사용한 이전 설계와 유사함.\n② 유사한 애플리케이션 또는 듀티 사이클 / 운행조건\n③ 제품 검증 및 / 또는 유효성 검증 경험 있음.\n④ 표준과 설계는 존재하지만 필드고장을 원인을 예방하기에는 불충분 함.\n⑤ 예방관리가 고장 원인을 예방할 수 있는 일부능력을 제공함\n① Similar to previous designs, using existing technology and materials.\n② Similar application with changes in duty cycle or operating conditions.\n③ Previous testing or field experience.\n④ Standards and design rules exist but are insufficient to ensure that the failure cause will not occur.\n⑤ Prevention controls provide some ability to prevent a failure cause.',
    description: '2개/1,000개\n1개/500개' },
  { fmeaType: 'D-FMEA', category: 'O', rating: 5, levelKr: '중간', levelEn: 'Moderate', 
    criteria: '① 입증된 재료를 사용한 이전 설계와 세부사항 변경.\n② 유사한 적용, 듀티 사이클 / 운행조건\n③ 이전 시험 또는 필드경험 또는 새로운 설계에 대한 시험 경험 있음.\n④ 이전 설계로 부터 학습교훈을 적용, 설계에 대한 모범사례가 재평가 되었지만, 아직 입증되지 않음.\n⑤ 예방관리은 일부 고장 원인과 관련된 결함을 찾아내고, 일부성능지표를 제공함\n① Detail changes to previous design using proven technology and materials.\n② Similar application, duty cycle or operating conditions.\n③ Previous testing or field experience, or new design with some test experience related to the failure.\n④ Design addresses lessons learned from previous designs. Best Practices re-evaluated for this design, but have not yet been proven.\n⑤ Prevention controls capable of finding deficiencies in the product related to the failure cause and provide some indication of performance.',
    description: '0.5개/1,000개\n1개/2000개' },
  { fmeaType: 'D-FMEA', category: 'O', rating: 4, levelKr: '중간', levelEn: 'Moderate', 
    criteria: '① 단기적 필드 노출과 거의 동일한 설계\n② 유사한 적용, 듀티 사이클 / 운행조건에서 약간의 변경\n③ 이전 시험 또는 필드경험.\n④ 새로운 설계의 선행설계 및 변경은 모범사례, 표준 및 시방을 준수 함.\n⑤ 예방관리은 고장 원인과 관련된 결함을 찾아내고, 설계 적합성을 나타낼 수 있음.\n① Almost identical design with short-term field exposure.\n② Similar application, with minor change in duty cycle or operating conditions.\n③ Previous testing or field experience. Predecessor design and changes for new design conform to best practices standards, and specifications.\n④ Design addresses lessons learned from previous designs. Best Practices re-evaluated for this design, but have not yet been proven.\n⑤ Prevention controls capable of finding deficiencies in the product related to the failure cause, and indicate likely design conformance.',
    description: '0.1개/1,000개\n1개/10,000개' },
  { fmeaType: 'D-FMEA', category: 'O', rating: 3, levelKr: '낮음', levelEn: 'Low', 
    criteria: '① 알려진 설계에서 세부사항 변경\n② 동일한 적용, 듀티 사이클 / 운행조건에서 약간의 변경\n③ 비교 가능한 운행조건 하에서 시험 및 필드 경험 있음.\n④ 새로운 설계에 대한 성공적으로 수행된 시험 절차 보유\n⑤ 예방관리은 고장 원인과 관련된 결함을 찾아내고, 생산 설계 적합성을 나타낼 수 있음.\n① Detail changes to known design.\n② Same application with minor change in duty cycle or operating conditions.\n③ and testing or field experience under comparable operating conditions.\n④ or new design with successfully completed test procedure.\n⑤ Prevention controls capable of finding deficiencies in the product related to the failure cause and predict conformance of production design.',
    description: '0.01개/1,000개\n1개/100,000개' },
  { fmeaType: 'D-FMEA', category: 'O', rating: 2, levelKr: '매우낮음', levelEn: 'Very Low', 
    criteria: '① 장기적인 필드 노출로 거의 동일한 성숙된 설계\n② 듀티 싸이클, 운행조건의 약간의 변경을 갖는 동일 적용\n③ 비교 가능한 운행조건에서 시험 및 필드 경험 보유\n④ 신뢰할 만한 이전 설계로 부터 표준, 학습교훈이 고려된 모범사례에 적합한 설계\n⑤ 예방관리은 고장 원인과 관련된 결함을 찾아내고, 설계 적합성에 신뢰성이 있음.\n① Almost identical mature design with long term field exposure.\n② Same application, with comparable duty cycle and operating conditions.\n③ Testing or field experience under comparable operating conditions.\n④ Design expected to conform to Standards and Best Practices considering Lessons Learned from previous designs with significant margin of confidence.\n⑤ Prevention controls capable of finding deficiencies in the product related to the failure cause and indicate confidence in design conformance.',
    description: '0.001개미만/1,000개\n1개/1,000,000개' },
  { fmeaType: 'D-FMEA', category: 'O', rating: 1, levelKr: '극도로 낮음', levelEn: 'Extremely Low', 
    criteria: '고장은 예방관리를 통해 제거되고, 고장원인은 설계에 의해 발생이 불가능 함.\nFailure eliminated through prevention control and failure cause is not possible by design.',
    description: '예방관리를 통해 제거됨\nFailure is eliminated through prevention control' },
];

// D-FMEA 검출도 기본 데이터 (AIAG & VDA FMEA Handbook 기준)
export const DEFAULT_DFMEA_DETECTION: Omit<SODItem, 'id'>[] = [
  { fmeaType: 'D-FMEA', category: 'D', rating: 10, levelKr: '매우 낮음', levelEn: 'Very Low', 
    criteria: '아직 개발되지 않은 시험 절차.\nTest procedure yet to be developed.',
    description: '시험방법이 정의되지 않음\nPass-Fail, Test-to-Fail, Degradation Testing' },
  { fmeaType: 'D-FMEA', category: 'D', rating: 9, levelKr: '매우 낮음', levelEn: 'Very Low', 
    criteria: '고장형태 또는 원인을 검출하도록 구체적으로 설계되지 않은 시험 방법.\nTest method not designed specifically to detect failure mode or cause.',
    description: '합격-불합격 시험, 불합격 시험, 성능저하(열화)시험\nPass-Fail, Test-to-Fail, Degradation Testing' },
  { fmeaType: 'D-FMEA', category: 'D', rating: 8, levelKr: '낮음', levelEn: 'Low', 
    criteria: '새로운 시험방법 : 입증되지 않음\nNew test method; not proven.',
    description: '합격-불합격 시험, 불합격 시험, 성능저하(열화)시험\nPass-Fail, Test-to-Fail, Degradation Testing' },
  { fmeaType: 'D-FMEA', category: 'D', rating: 7, levelKr: '낮음', levelEn: 'Low', 
    criteria: '새로운 시험방법 : 양산승인 전 양산 툴 변경을 위한 시간이 충분하지 못함.\nNew test method; not proven; planned timing is sufficient to modify production tools before release for production.',
    description: '합격-불합격 시험\nPass-Fail Testing' },
  { fmeaType: 'D-FMEA', category: 'D', rating: 6, levelKr: '중간', levelEn: 'Moderate', 
    criteria: '기능 검증 또는 성능, 품질, 신뢰성 및 내구성의 유효성확인을 위한 입증된 시험방법; 시험실패로 인한 재 설계 및/또는 재 툴링을 위한 생산 지연이 발생할 수 있는 제품개발 사이클의 후반부에 계획 됨.\nProven test method for verification of functionality or validation of performance, quality, reliability and durability; planned timing is later in the product development cycle such that test failures may result in production delays for re-design and/or re-tooling.',
    description: '불합격 시험\nTest-to-Failure' },
  { fmeaType: 'D-FMEA', category: 'D', rating: 5, levelKr: '중간', levelEn: 'Moderate', 
    criteria: 'Proven test method for verification of functionality or validation of performance, quality, reliability and durability; planned timing is later in the product development cycle such that test failures may result in production delays for re-design and/or re-tooling.',
    description: '성능저하(열화)시험\nDegradation Testing' },
  { fmeaType: 'D-FMEA', category: 'D', rating: 4, levelKr: '높음', levelEn: 'High', 
    criteria: '성능, 품질, 신뢰성 및 내구성의 기능검증 또는 실현성 확인/타당성 확인을 위한 입증된 시험방법; 계획된 시험일정이 양산을 위한 불출 전에 생산 툴을 수정하기에 충분하다.\nProven test method for verification of functionality or validation of performance, quality, reliability and durability; planned timing is sufficient to modify production tools before release for production.',
    description: '합격-불합격 시험\nPass-Fail' },
  { fmeaType: 'D-FMEA', category: 'D', rating: 3, levelKr: '높음', levelEn: 'High', 
    criteria: 'Proven test method for verification of functionality or validation of performance, quality, reliability and durability; planned timing is sufficient to modify production tools before release for production.',
    description: '불합격 시험\nTest-to-Failure' },
  { fmeaType: 'D-FMEA', category: 'D', rating: 2, levelKr: '높음', levelEn: 'High', 
    criteria: 'Proven test method for verification of functionality or validation of performance, quality, reliability and durability; planned timing is sufficient to modify production tools before release for production.',
    description: '성능저하(열화)시험\nDegradation Testing' },
  { fmeaType: 'D-FMEA', category: 'D', rating: 1, levelKr: '매우 높음', levelEn: 'Very High', 
    criteria: '시험 전에 고장형태 또는 원인이 발생할 수 없음을 확인하거나, 고장형태 또는 고장원인을 항상 검출하는 것으로 입증된 검출방법을 확인 한다\nPrior testing confirmed that failure mode or cause cannot occur, or detection methods proven to always detect the failure mode or failure cause.',
    description: '' },
];

// ID 생성 함수
export const uid = () => 'sod_' + Math.random().toString(16).slice(2) + '_' + Date.now().toString(16);


