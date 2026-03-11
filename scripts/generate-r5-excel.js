/**
 * R4 → R5 엑셀 변환 스크립트
 * - FA 시트에 DC추천1/DC추천2/PC추천1/PC추천2 컬럼 추가
 * - A6 시트에 FM 키워드 기반 추천 검출관리 행 추가
 * - B5 시트에 FC/FM 키워드 기반 추천 예방관리 행 추가
 *
 * 실행: node scripts/generate-r5-excel.js
 */

const XLSX = require('xlsx');
const path = require('path');

// =====================================================
// 경로 설정
// =====================================================
const INPUT_PATH = path.resolve('D:/00 SMART FMEA TUTOR/T&F/T&F_JG1_Import_전체시트_R4.xlsx');
const OUTPUT_PATH = path.resolve('D:/00 SMART FMEA TUTOR/T&F/T&F_JG1_Import_전체시트_R5.xlsx');

// =====================================================
// FM → DC 키워드 규칙 (detectionKeywordMap.ts와 동일)
// =====================================================
const FM_TO_DC_RULES = [
  { fmKeywords: ['사양', '품명', '품번', '규격', '버전', '모델', '식별', '라벨', '표시', '이종'], primaryMethods: ['바코드 스캐너', 'PDA 스캔검사', '버전 검사기'], secondaryMethods: ['육안검사'], priority: 1 },
  { fmKeywords: ['휘도', '점등', '영상', '암전류', '밝기', '광도', '발광', 'LED', '화면', '디스플레이'], primaryMethods: ['EOL 검사기', '휘도측정기', '영상검사'], secondaryMethods: ['육안검사'], priority: 2 },
  { fmKeywords: ['치수', '형상', 'PV값', 'PV', '변형', '편차', '공차', '두께', '높이', '폭', '길이', '간격', '갭'], primaryMethods: ['치수측정기', '3차원 측정기(CMM)', '캘리퍼/마이크로미터'], secondaryMethods: ['핀게이지', '육안검사'], priority: 3 },
  { fmKeywords: ['핀휨', '핀 휨', '핀', '단자', '커넥터 핀', '리드'], primaryMethods: ['핀휨 검사기', '비전검사'], secondaryMethods: ['육안검사'], priority: 4 },
  { fmKeywords: ['미작동', '오작동', '동작', '이음', '소음', '진동', '기능', '작동', 'NVH'], primaryMethods: ['기능검사기', 'EOL 검사기'], secondaryMethods: ['육안검사'], priority: 5 },
  { fmKeywords: ['도포', '그리스', '접착', '실란트', '도포량', '도포상태', '도포위치'], primaryMethods: ['중량측정(발란스)', '도포검사기'], secondaryMethods: ['육안검사'], priority: 6 },
  { fmKeywords: ['조립', '체결', '누락', '토크', '풀림', '미체결', '오삽입', '미삽입', '역삽입', '장착'], primaryMethods: ['토크검사', '체결검사기', '바코드 스캐너'], secondaryMethods: ['육안검사'], priority: 7 },
  { fmKeywords: ['외관', '파손', '이물', '스크래치', '긁힘', '찍힘', '흠집', '크랙', '균열', '덴트', '버'], primaryMethods: ['육안검사', '비전검사(카메라)'], secondaryMethods: ['확대경검사'], priority: 8 },
  { fmKeywords: ['균일도', '얼룩', '색상', '색차', '변색', '무라'], primaryMethods: ['비전검사(카메라)', 'EOL 검사기', '색차계'], secondaryMethods: ['육안검사'], priority: 9 },
  { fmKeywords: ['포장', '수량', '출하', '납품', '적재', '선입선출', 'FIFO'], primaryMethods: ['바코드 스캐너', '중량검사', '시스템 검증'], secondaryMethods: ['육안검사'], priority: 10 },
  { fmKeywords: ['산화', '습도', '오염', '온도', '결로', '부식', '녹', '환경'], primaryMethods: ['환경측정기(온습도계)', '육안검사'], secondaryMethods: ['시스템 검증'], priority: 11 },
  { fmKeywords: ['마스터', '미검출', '불량판정', '오판', '검출률', 'MSA'], primaryMethods: ['MSA 검증', 'Gage R&R'], secondaryMethods: ['검교정'], priority: 12 },
  { fmKeywords: ['용접', '너겟', '스패터', '비드', '용접강도', '접합', '인장'], primaryMethods: ['인장시험기', '비파괴검사'], secondaryMethods: ['육안검사'], priority: 13 },
  { fmKeywords: ['누설', '누유', '기밀', '리크', '누출'], primaryMethods: ['기밀시험기', '리크테스트'], secondaryMethods: ['육안검사'], priority: 14 },
  { fmKeywords: ['전압', '전류', '저항', '합선', '단선', '절연', '통전', '단락'], primaryMethods: ['절연저항계', '통전검사', 'EOL 검사기'], secondaryMethods: ['육안검사'], priority: 15 },
  { fmKeywords: ['압력', '유압', '공압', '에어압', '진공'], primaryMethods: ['압력게이지', '기밀시험기', '리크테스트'], secondaryMethods: ['체크리스트'], priority: 16 },
  { fmKeywords: ['설비이상', '파라미터', '조건이탈', '설정값'], primaryMethods: ['파라미터 모니터링(PLC)', '설비점검 체크리스트'], secondaryMethods: ['육안검사'], priority: 17 },
  { fmKeywords: ['경도', '강도', '물성', '인장강도', '피로', '경화', '취성'], primaryMethods: ['경도시험기', '인장시험기'], secondaryMethods: ['육안검사'], priority: 18 },
  // 산업 특화 (v2.7.0)
  { fmKeywords: ['HUD', '헤드업', '미러', '비구면', '렌즈', '커버렌즈'], primaryMethods: ['EOL 검사기(영상)', '비전검사(카메라)'], secondaryMethods: ['한도견본 비교'], priority: 20 },
  { fmKeywords: ['PCB', 'SMT', '솔더', '납땜', '실장', 'BGA', 'IC'], primaryMethods: ['AOI(자동광학검사)', 'X-ray 검사'], secondaryMethods: ['ICT(인서킷테스트)'], priority: 21 },
  { fmKeywords: ['사출', '프레스', '성형', '웰드라인', '싱크마크', '쇼트'], primaryMethods: ['초중종물 치수검사', '중량 측정'], secondaryMethods: ['외관 검사(한도견본)'], priority: 22 },
  { fmKeywords: ['도장', '코팅', '도막', '박리', '기포', '흘러내림', '오렌지필'], primaryMethods: ['도막두께 측정기', '부착력 테스트(Cross-cut)'], secondaryMethods: ['광택도 측정'], priority: 23 },
  { fmKeywords: ['열처리', '담금질', '뜨임', '침탄', '질화', '고주파'], primaryMethods: ['경도시험기', '금속조직 검사'], secondaryMethods: ['잔류응력 측정'], priority: 24 },
];

// =====================================================
// FC → PC 키워드 규칙 (preventionKeywordMap.ts와 동일)
// =====================================================
const FC_TO_PC_RULES = [
  { keywords: ['지그', '치구', '고정구', '클램프', '바이스', '척'], methods: ['지그 정기점검(마모/변형)', '지그 수명관리 및 교체주기'], priority: 1 },
  { keywords: ['금형', '다이', '몰드', '캐비티', '코어'], methods: ['금형 PM 주기 관리', '금형 타수 관리'], priority: 2 },
  { keywords: ['전동드라이버', '토크드라이버', '토크렌치', '임팩트', '체결공구', '너트러너'], methods: ['공구 교정(Calibration) 주기 관리', '토크 설정값 일일 확인'], priority: 3 },
  { keywords: ['도포기', '디스펜서', '노즐', '도포', '그리스', '접착제', '실란트'], methods: ['도포량 정량 관리(중량 체크)', '노즐 교체주기 관리'], priority: 4 },
  { keywords: ['압력', '에어압', 'AIR', '공압', '유압', '레귤레이터', '밸브', '실린더'], methods: ['압력게이지 교정 주기 관리', '에어 필터/레귤레이터 점검'], priority: 5 },
  { keywords: ['센서', '카메라', '비전', '검사기', 'EOL', '측정기', '게이지'], methods: ['센서 교정(Calibration) 주기 관리', '마스터 샘플 정기 검증'], priority: 6 },
  { keywords: ['모터', '서보', '스핀들', '베어링', '기어', '벨트', '체인'], methods: ['구동부 윤활 주기 관리', '베어링 진동/소음 측정'], priority: 7 },
  { keywords: ['용접', '스팟', '아크', 'MIG', 'TIG', '전극', '팁'], methods: ['용접팁 드레싱/교체 주기', '용접 전류/전압 파라미터 관리'], priority: 8 },
  { keywords: ['온도', '가열', '건조', '경화', '오븐', '히터'], methods: ['온도 프로파일 정기 확인', '온도센서 교정 주기 관리'], priority: 9 },
  { keywords: ['컨베이어', '이송', '로봇', '피더', '슈트', '호퍼'], methods: ['이송 설비 일상점검', '로봇 원점/위치 확인'], priority: 10 },
  { keywords: ['숙련도', '미숙', '작업자', '오조작', '실수', '부주의', '피로', '교대'], methods: ['작업자 교육/숙련도 평가', '작업표준서(WI) 교육'], priority: 11 },
  { keywords: ['오염', '이물', '세척', '청소', '먼지', '유분', '잔류물'], methods: ['세척/청소 주기 기준 관리', '에어블로우/집진 설비 점검'], priority: 12 },
  { keywords: ['보관', '습도', '산화', '부식', '결로', '환경', '온습도'], methods: ['보관 조건(온습도) 관리', '방습/방청 포장 관리'], priority: 13 },
  { keywords: ['선입선출', 'FIFO', 'LOT', '이종', '혼입', '오삽입'], methods: ['선입선출(FIFO) 시스템 운영', 'LOT 추적(바코드/QR)'], priority: 14 },
  { keywords: ['마모', '수명', '열화', '노후', '피로', '크랙', '파손', '변형'], methods: ['소모품 교체주기 관리', '마모량 정기 측정'], priority: 15 },
  { keywords: ['파라미터', '설정값', '조건', '레시피', '프로그램', 'PLC'], methods: ['공정 파라미터 관리표 운영', '설정값 변경 이력 관리'], priority: 16 },
  { keywords: ['스크류', '볼트', '너트', '체결', '풀림', '토크', '누락'], methods: ['토크 관리 기준 설정', '체결 순서/패턴 표준화'], priority: 17 },
];

// FM → PC 규칙
const FM_TO_PC_RULES = [
  { keywords: ['사양', '품명', '규격', '버전', '불일치', '이종', '라벨'], methods: ['바코드/QR 스캔 확인', '부품 식별표시 관리 강화'], priority: 1 },
  { keywords: ['외관', '파손', '스크래치', '찍힘', '긁힘', '크랙', '이물', '흠집'], methods: ['취급 주의 교육(운반/적재)', '보호 포장/간지 적용'], priority: 2 },
  { keywords: ['조립', '체결', '누락', '미삽입', '역삽입', '오삽입', '풀림'], methods: ['조립 순서 표준화(WI)', '실수방지(Poka-Yoke) 적용'], priority: 3 },
  { keywords: ['치수', '형상', 'PV값', '변형', '편차', '공차', '두께', '갭'], methods: ['공정능력(Cpk) 관리', 'SPC 관리도 운영'], priority: 4 },
  { keywords: ['도포', '도포량', '도포상태', '접착', '그리스', '도포위치'], methods: ['도포량 정량 관리(중량 체크)', '도포기 파라미터 관리'], priority: 5 },
  { keywords: ['휘도', '점등', '영상', '암전류', '미출력', '틀어짐', '균일도', '얼룩'], methods: ['부품 수입검사 강화', '조립 환경 관리(정전기)'], priority: 6 },
  { keywords: ['포장', '수량', '출하', '납품', '적재'], methods: ['포장 작업표준서 준수', '수량 카운트 시스템'], priority: 7 },
  { keywords: ['산화', '습도', '오염', '부식', '결로'], methods: ['보관 환경(온습도) 관리', '방습/방청 포장 적용'], priority: 8 },
  { keywords: ['미작동', '오작동', '기능', '이음', '소음', '진동', '동작'], methods: ['부품 기능검사 강화(수입검사)', '조립 후 기능 확인 절차'], priority: 9 },
  { keywords: ['선입선출', 'FIFO', '이종', '혼입'], methods: ['선입선출(FIFO) 시스템 운영', 'LOT 추적 바코드/QR'], priority: 10 },
  { keywords: ['마스터', '미검출', '오판', '불량판정', '검출률'], methods: ['마스터 샘플 정기 검증', 'MSA(측정시스템분석) 실시'], priority: 11 },
];

// =====================================================
// 매칭 함수
// =====================================================

function matchDCRules(fmText) {
  if (!fmText) return { dc1: '', dc2: '' };
  const lower = fmText.toLowerCase();
  const matched = FM_TO_DC_RULES
    .filter(rule => rule.fmKeywords.some(kw => lower.includes(kw.toLowerCase())))
    .sort((a, b) => a.priority - b.priority);

  if (matched.length === 0) return { dc1: '', dc2: '' };

  const methods = [];
  const seen = new Set();
  for (const rule of matched) {
    for (const m of rule.primaryMethods) {
      if (!seen.has(m)) { seen.add(m); methods.push(m); }
    }
  }
  for (const rule of matched) {
    for (const m of rule.secondaryMethods) {
      if (!seen.has(m)) { seen.add(m); methods.push(m); }
    }
  }

  return {
    dc1: methods[0] || '',
    dc2: methods[1] || '',
  };
}

function matchPCRules(fcText, fmText) {
  if (!fcText && !fmText) return { pc1: '', pc2: '' };

  const methods = [];
  const seen = new Set();

  // FC 키워드 매칭
  if (fcText) {
    const fcLower = fcText.toLowerCase();
    const fcMatched = FC_TO_PC_RULES
      .filter(rule => rule.keywords.some(kw => fcLower.includes(kw.toLowerCase())))
      .sort((a, b) => a.priority - b.priority);
    for (const rule of fcMatched) {
      for (const m of rule.methods) {
        if (!seen.has(m)) { seen.add(m); methods.push(m); }
      }
    }
  }

  // FM 키워드 매칭 (보충)
  if (fmText) {
    const fmLower = fmText.toLowerCase();
    const fmMatched = FM_TO_PC_RULES
      .filter(rule => rule.keywords.some(kw => fmLower.includes(kw.toLowerCase())))
      .sort((a, b) => a.priority - b.priority);
    for (const rule of fmMatched) {
      for (const m of rule.methods) {
        if (!seen.has(m)) { seen.add(m); methods.push(m); }
      }
    }
  }

  return {
    pc1: methods[0] || '',
    pc2: methods[1] || '',
  };
}

// =====================================================
// ★ v2.7.3: O추천(발생도) / D추천(검출도) 자동 산출
// =====================================================

const PC_TYPE_KEYWORDS = {
  designPrevent: ['설계변경', '형상변경', '구조변경', '물리적 방지', '원인 제거'],
  bestPractice: ['SPC', '관리도', 'Cpk', '교정', 'PM', '예방유지보전', 'TPM', '지그설계', 'MSA', 'Gage R&R', '공정능력'],
  technical: ['센서', '자동', 'PLC', '모니터링', 'Poka-Yoke', '실수방지', '에러프루핑', '인터록', '자동정지', '바코드', '비전', '카메라'],
  behavioral: ['교육', '훈련', '숙련도', '작업자', 'OJT', '순회점검', '자주검사', '체크리스트', '확인', '점검', '기록'],
};
const O_BY_TYPE = { designPrevent: 1, bestPractice: 2, technical: 4, behavioral: 8, none: 10 };

function recommendO(pcText) {
  if (!pcText) return 10;
  const lower = pcText.toLowerCase();
  for (const type of ['designPrevent', 'bestPractice', 'technical', 'behavioral']) {
    if (PC_TYPE_KEYWORDS[type].some(kw => lower.includes(kw.toLowerCase()))) return O_BY_TYPE[type];
  }
  return 8;
}

const DC_OPP_KEYWORDS = {
  designPrevent: ['설계방지', '물리적불가', '구조적방지'],
  causeBlock: ['Poka-Yoke', '실수방지', '에러프루핑', '인터록', '풀프루프', '자동정지'],
  autoInStation: ['인라인', '공정내', '자동검출', '실시간', 'PLC', 'ICT'],
  autoDownstream: ['EOL', '최종검사', '출하검사', '완성검사'],
  machineAssisted: ['비전검사', '카메라', 'CMM', '3차원', '자동측정', '센서', 'AOI', 'X-ray'],
  humanManual: ['육안검사', '육안', '수동', '캘리퍼', '마이크로미터', '핀게이지', '한도견본', '자주검사'],
  random: ['무작위', '산발적', '비정기'],
};
const D_BY_OPP = { designPrevent: 1, causeBlock: 2, autoInStation: 3, autoDownstream: 4, machineAssisted: 6, humanManual: 7, random: 9, none: 10 };

function recommendD(dcText) {
  if (!dcText) return 10;
  const lower = dcText.toLowerCase();
  for (const opp of ['designPrevent', 'causeBlock', 'autoInStation', 'autoDownstream', 'machineAssisted', 'humanManual', 'random']) {
    if (DC_OPP_KEYWORDS[opp].some(kw => lower.includes(kw.toLowerCase()))) return D_BY_OPP[opp];
  }
  return 7;
}

// =====================================================
// 메인 실행
// =====================================================

console.log('=== R4 → R5 엑셀 변환 시작 ===');
console.log(`입력: ${INPUT_PATH}`);
console.log(`출력: ${OUTPUT_PATH}`);

const wb = XLSX.readFile(INPUT_PATH);
console.log(`시트 수: ${wb.SheetNames.length}`);

// 1. FA 시트에 DC추천1/DC추천2/PC추천1/PC추천2 추가
const faSheetName = wb.SheetNames.find(n => n.includes('FA'));
if (faSheetName) {
  console.log(`\n--- FA 시트 처리: ${faSheetName} ---`);
  const faData = XLSX.utils.sheet_to_json(wb.Sheets[faSheetName]);
  console.log(`FA 행수: ${faData.length}`);

  let dcMatchCount = 0;
  let pcMatchCount = 0;

  faData.forEach(row => {
    const fmText = String(row['고장형태(A5)'] || '');
    const fcText = String(row['고장원인(B4)'] || '');

    // DC 추천
    const { dc1, dc2 } = matchDCRules(fmText);
    row['DC추천1'] = dc1;
    row['DC추천2'] = dc2;
    if (dc1) dcMatchCount++;

    // PC 추천
    const { pc1, pc2 } = matchPCRules(fcText, fmText);
    row['PC추천1'] = pc1;
    row['PC추천2'] = pc2;
    if (pc1) pcMatchCount++;

    // ★ v2.7.3: O추천 (PC 기반 발생도 추천) / D추천 (DC 기반 검출도 추천)
    const pcText = String(row['예방관리(B5)'] || pc1 || '');
    const dcText = String(row['검출관리(A6)'] || dc1 || '');
    row['O추천'] = pcText ? recommendO(pcText) : '';
    row['D추천'] = dcText ? recommendD(dcText) : '';
  });

  console.log(`DC 추천 매칭: ${dcMatchCount}/${faData.length}건 (${(dcMatchCount/faData.length*100).toFixed(1)}%)`);
  console.log(`PC 추천 매칭: ${pcMatchCount}/${faData.length}건 (${(pcMatchCount/faData.length*100).toFixed(1)}%)`);

  // FA 시트 교체
  const newFaSheet = XLSX.utils.json_to_sheet(faData);
  wb.Sheets[faSheetName] = newFaSheet;
}

// 2. A6 시트에 추천 검출관리 행 추가
const a6SheetName = wb.SheetNames.find(n => n.includes('A6'));
if (a6SheetName && faSheetName) {
  console.log(`\n--- A6 시트 확충 ---`);
  const a6Data = XLSX.utils.sheet_to_json(wb.Sheets[a6SheetName]);
  const originalCount = a6Data.length;
  const faData = XLSX.utils.sheet_to_json(wb.Sheets[faSheetName]);

  // 기존 A6 값 Set (processNo::value)
  const existingA6 = new Set();
  a6Data.forEach(row => {
    const pNo = String(row['L2-1.공정번호'] || '').trim();
    const val = String(row['L2-6.검출관리'] || '').trim();
    if (pNo && val) existingA6.add(`${pNo}::${val}`);
  });

  // FA에서 추천값 수집 → A6에 없는 것만 추가
  const newA6 = [];
  faData.forEach(row => {
    const pNo = String(row['공정No(A1)'] || '').trim();
    const dc1 = String(row['DC추천1'] || '').trim();
    const dc2 = String(row['DC추천2'] || '').trim();

    [dc1, dc2].forEach(val => {
      if (val && pNo) {
        const key = `${pNo}::${val}`;
        if (!existingA6.has(key)) {
          existingA6.add(key);
          newA6.push({ 'L2-1.공정번호': pNo, 'L2-6.검출관리': val });
        }
      }
    });
  });

  // 기존 + 신규 합쳐서 A6 시트 교체
  const mergedA6 = [...a6Data, ...newA6];
  console.log(`A6: ${originalCount}행 → ${mergedA6.length}행 (+${newA6.length} 추천 추가)`);

  const newA6Sheet = XLSX.utils.json_to_sheet(mergedA6);
  wb.Sheets[a6SheetName] = newA6Sheet;
}

// 3. B5 시트에 추천 예방관리 행 추가
const b5SheetName = wb.SheetNames.find(n => n.includes('B5'));
if (b5SheetName && faSheetName) {
  console.log(`\n--- B5 시트 확충 ---`);
  const b5Data = XLSX.utils.sheet_to_json(wb.Sheets[b5SheetName]);
  const originalCount = b5Data.length;
  const faData = XLSX.utils.sheet_to_json(wb.Sheets[faSheetName]);

  // 기존 B5 값 Set (processNo::m4::value)
  const existingB5 = new Set();
  b5Data.forEach(row => {
    const pNo = String(row['L2-1.공정번호'] || '').trim();
    const m4 = String(row['4M'] || '').trim();
    const val = String(row['L3-5.예방관리'] || '').trim();
    if (pNo && val) existingB5.add(`${pNo}::${m4}::${val}`);
  });

  // FA에서 추천값 수집 → B5에 없는 것만 추가
  const newB5 = [];
  faData.forEach(row => {
    const pNo = String(row['공정No(A1)'] || '').trim();
    const m4 = String(row['4M'] || '').trim();
    const pc1 = String(row['PC추천1'] || '').trim();
    const pc2 = String(row['PC추천2'] || '').trim();

    [pc1, pc2].forEach(val => {
      if (val && pNo) {
        const key = `${pNo}::${m4}::${val}`;
        if (!existingB5.has(key)) {
          existingB5.add(key);
          newB5.push({ 'L2-1.공정번호': pNo, '4M': m4, 'L3-5.예방관리': val });
        }
      }
    });
  });

  // 기존 + 신규 합쳐서 B5 시트 교체
  const mergedB5 = [...b5Data, ...newB5];
  console.log(`B5: ${originalCount}행 → ${mergedB5.length}행 (+${newB5.length} 추천 추가)`);

  const newB5Sheet = XLSX.utils.json_to_sheet(mergedB5);
  wb.Sheets[b5SheetName] = newB5Sheet;
}

// 4. 저장
XLSX.writeFile(wb, OUTPUT_PATH);
console.log(`\n=== R5 엑셀 저장 완료: ${OUTPUT_PATH} ===`);
