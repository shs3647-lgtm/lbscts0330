/**
 * DFMEA 테스트 데이터 시딩 스크립트
 * dfm26-m001 (타이어개발) 프로젝트 생성
 * 3패키지 × 2부품 구조
 */

const DFMEA_PROJECT = {
  fmeaId: 'dfm26-m001',
  name: '타이어개발',
  type: 'DFMEA',
  status: 'draft',
  createdAt: new Date().toISOString(),
};

// 3패키지 × 2부품 구조
const WORKSHEET_DATA = {
  fmeaId: 'dfm26-m001',
  savedAt: new Date().toISOString(),
  tab: 'structure',
  
  // L1: 제품명 (다음상위수준)
  l1: {
    name: '타이어',
    functions: [
      '내부 압력을 유지하며 구조적 파열을 방지하는 기능',
      '노면과의 마찰력을 통해 차량을 전진·후진시키는 기능',
    ],
    requirements: ['내압 파열 압력', '접지계수'],
  },
  
  // L2: 3개 패키지 (초점요소/A'SSY)
  l2: [
    {
      id: 'assy-001',
      no: '1',
      name: 'Tread Package',
      function: '노면과 직접 접촉하여 구동력·제동력·조향력을 전달하는 기능',
      requirement: '트레드 접지계수',
      parts: [
        { id: 'part-001', name: 'Cap Tread', type: 'Part', function: '마모 수명, 접지력 제공', requirement: '컴파운드' },
        { id: 'part-002', name: 'Tread Cushion', type: 'Part', function: '트레드와 벨트층 사이 응력 완화', requirement: '두께' },
      ],
    },
    {
      id: 'assy-002',
      no: '2',
      name: 'Belt Package',
      function: '타이어 형상 유지 및 주행 안정성 확보',
      requirement: '벨트 강성',
      parts: [
        { id: 'part-003', name: 'Steel Belt 1', type: 'Part', function: '하중 지지 및 형상 유지', requirement: '코드 강도' },
        { id: 'part-004', name: 'Steel Belt 2', type: 'Part', function: '충격 흡수 및 내구성', requirement: '코드 각도' },
      ],
    },
    {
      id: 'assy-003',
      no: '3',
      name: 'Carcass Package',
      function: '타이어 골격 형성 및 내압 유지',
      requirement: '카카스 강도',
      parts: [
        { id: 'part-005', name: 'Body Ply', type: 'Part', function: '타이어 본체 구조 형성', requirement: '코드 밀도' },
        { id: 'part-006', name: 'Inner Liner', type: 'Part', function: '공기 투과 방지', requirement: '기밀성' },
      ],
    },
  ],
  
  // 고장 데이터
  failureEffects: [
    { id: 'fe-001', l2Id: 'assy-001', name: '주행 중 파열', severity: 10 },
    { id: 'fe-002', l2Id: 'assy-002', name: '타이어 변형', severity: 8 },
    { id: 'fe-003', l2Id: 'assy-003', name: '공기 누출', severity: 7 },
  ],
  failureModes: [
    { id: 'fm-001', feId: 'fe-001', l3Id: 'part-001', name: '저마찰', occurrence: 5 },
    { id: 'fm-002', feId: 'fe-001', l3Id: 'part-002', name: '접착 불량', occurrence: 4 },
    { id: 'fm-003', feId: 'fe-002', l3Id: 'part-003', name: '코드 파단', occurrence: 3 },
    { id: 'fm-004', feId: 'fe-002', l3Id: 'part-004', name: '코드 분리', occurrence: 3 },
    { id: 'fm-005', feId: 'fe-003', l3Id: 'part-005', name: '플라이 분리', occurrence: 2 },
    { id: 'fm-006', feId: 'fe-003', l3Id: 'part-006', name: '기밀성 저하', occurrence: 4 },
  ],
  failureCauses: [
    { id: 'fc-001', fmId: 'fm-001', name: '컴파운드 선정 편차', occurrence: 5 },
    { id: 'fc-002', fmId: 'fm-002', name: '가류 온도 편차', occurrence: 4 },
    { id: 'fc-003', fmId: 'fm-003', name: '코드 인장 과다', occurrence: 3 },
    { id: 'fc-004', fmId: 'fm-004', name: '접착제 도포 불균일', occurrence: 3 },
    { id: 'fc-005', fmId: 'fm-005', name: '고무 접착력 부족', occurrence: 2 },
    { id: 'fc-006', fmId: 'fm-006', name: '이너라이너 두께 부족', occurrence: 4 },
  ],
  
  // 고장연결
  failureLinks: [
    { fmId: 'fm-001', feIds: ['fe-001'], fcIds: ['fc-001'] },
    { fmId: 'fm-002', feIds: ['fe-001'], fcIds: ['fc-002'] },
    { fmId: 'fm-003', feIds: ['fe-002'], fcIds: ['fc-003'] },
    { fmId: 'fm-004', feIds: ['fe-002'], fcIds: ['fc-004'] },
    { fmId: 'fm-005', feIds: ['fe-003'], fcIds: ['fc-005'] },
    { fmId: 'fm-006', feIds: ['fe-003'], fcIds: ['fc-006'] },
  ],
  
  // 리스크 데이터
  preventionControls: [
    { id: 'pc-001', fcId: 'fc-001', name: '컴파운드 물성 검토', occurrence: 3 },
    { id: 'pc-002', fcId: 'fc-002', name: '가류 조건 검증', occurrence: 3 },
  ],
  detectionControls: [
    { id: 'dc-001', fcId: 'fc-001', name: '마찰계수 측정', detection: 4 },
    { id: 'dc-002', fcId: 'fc-002', name: '접착강도 시험', detection: 4 },
  ],
  
  // 확정 상태
  confirmedFlags: {
    structure: true,
    functionL1: true,
    functionL2: true,
    functionL3: true,
    failureL1: true,
    failureL2: true,
    failureL3: true,
  },
};

// localStorage에 저장할 형태로 변환
export function getProjectListData() {
  return [DFMEA_PROJECT];
}

export function getWorksheetData() {
  return WORKSHEET_DATA;
}

// 콘솔 출력용
console.log('DFMEA 테스트 데이터:');
console.log('- 프로젝트: dfm26-m001 (타이어개발)');
console.log('- 구조: 타이어 → 3패키지 → 6부품');
console.log('- 패키지: Tread Package, Belt Package, Carcass Package');
console.log('- 부품: Cap Tread, Tread Cushion, Steel Belt 1/2, Body Ply, Inner Liner');
