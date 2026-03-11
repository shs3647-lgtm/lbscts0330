/**
 * @file excel-template.ts
 * @description PFMEA 기초정보 Excel 템플릿 생성 유틸리티 (다중 시트 방식)
 * @author AI Assistant
 * @created 2025-12-26
 * @updated 2025-12-26 - 다중 시트 방식으로 변경
 * 
 * 시트 구조:
 * A1: 공정번호 + 공정명
 * A3-A6: 공정번호 + 해당 항목
 * B1-B5: 공정번호 + 해당 항목
 * C1-C4: 구분(YOUR PLANT/SHIP TO PLANT/USER) + 해당 항목
 */

import ExcelJS from 'exceljs';

/** 시트 정의 - 헤더 색상은 디자인 표준에 따라 네이비 (#00587A) 통일 */
const HEADER_COLOR = '00587A';  // 디자인 표준 네이비 색상

const SHEET_DEFINITIONS = [
  { name: 'A1', headers: ['A1.공정번호', 'A2.공정명'], color: HEADER_COLOR, required: [true, true] },
  { name: 'A3', headers: ['A1.공정번호', 'A3.공정기능(설명)'], color: HEADER_COLOR, required: [true, false] },
  { name: 'A4', headers: ['A1.공정번호', 'A4.제품특성'], color: HEADER_COLOR, required: [true, false] },
  { name: 'A5', headers: ['A1.공정번호', 'A5.고장형태'], color: HEADER_COLOR, required: [true, false] },
  { name: 'A6', headers: ['A1.공정번호', 'A6.검출관리'], color: HEADER_COLOR, required: [true, false] },
  { name: 'B1', headers: ['A1.공정번호', 'B1.작업요소(설비)'], color: HEADER_COLOR, required: [true, false] },
  { name: 'B2', headers: ['A1.공정번호', 'B2.요소기능'], color: HEADER_COLOR, required: [true, false] },
  { name: 'B3', headers: ['A1.공정번호', 'B3.공정특성'], color: HEADER_COLOR, required: [true, false] },
  { name: 'B4', headers: ['A1.공정번호', 'B4.고장원인'], color: HEADER_COLOR, required: [true, false] },
  { name: 'B5', headers: ['A1.공정번호', 'B5.예방관리'], color: HEADER_COLOR, required: [true, false] },
  { name: 'C1', headers: ['C1.구분'], color: HEADER_COLOR, required: [true] },  // YOUR PLANT, SHIP TO PLANT, USER
  { name: 'C2', headers: ['C1.구분', 'C2.제품(반)기능'], color: HEADER_COLOR, required: [true, false] },
  { name: 'C3', headers: ['C1.구분', 'C3.제품(반)요구사항'], color: HEADER_COLOR, required: [true, false] },
  { name: 'C4', headers: ['C1.구분', 'C4.고장영향'], color: HEADER_COLOR, required: [true, false] },
];

/** 공통 셀 스타일 적용 */
function applyHeaderStyle(cell: ExcelJS.Cell, color: string) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
  cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = {
    top: { style: 'thin', color: { argb: '999999' } },
    left: { style: 'thin', color: { argb: '999999' } },
    bottom: { style: 'thin', color: { argb: '999999' } },
    right: { style: 'thin', color: { argb: '999999' } },
  };
}

function applyGuideStyle(cell: ExcelJS.Cell) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E0F2FB' } };
  cell.font = { italic: true, color: { argb: '666666' }, size: 9 };
  cell.alignment = { horizontal: 'center' };
  cell.border = {
    top: { style: 'thin', color: { argb: '999999' } },
    left: { style: 'thin', color: { argb: '999999' } },
    bottom: { style: 'thin', color: { argb: '999999' } },
    right: { style: 'thin', color: { argb: '999999' } },
  };
}

function applyDataStyle(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: 'thin', color: { argb: '999999' } },
    left: { style: 'thin', color: { argb: '999999' } },
    bottom: { style: 'thin', color: { argb: '999999' } },
    right: { style: 'thin', color: { argb: '999999' } },
  };
  // 가로세로 중앙정렬 추가
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
  cell.font = { name: '맑은 고딕', size: 10 };
}

/** 빈 템플릿 다운로드 (다중 시트) */
export async function downloadEmptyTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FMEA Smart System';
  workbook.created = new Date();

  // 각 시트 생성
  SHEET_DEFINITIONS.forEach((def) => {
    const worksheet = workbook.addWorksheet(def.name, {
      properties: { tabColor: { argb: def.color } },
    });

    // 컬럼 설정
    worksheet.columns = def.headers.map((header, i) => ({
      header,
      key: `col${i}`,
      width: i === 0 ? 15 : 30,
    }));

    // 헤더 스타일
    const headerRow = worksheet.getRow(1);
    headerRow.height = 25;
    headerRow.eachCell((cell) => applyHeaderStyle(cell, def.color));

    // 안내 행 (2행)
    const guideRow = worksheet.addRow(def.required.map(r => r ? '(필수)' : '(선택)'));
    guideRow.eachCell((cell) => applyGuideStyle(cell));

    // 빈 데이터 행 10개
    for (let i = 0; i < 10; i++) {
      const row = worksheet.addRow(def.headers.map(() => ''));
      row.eachCell((cell) => applyDataStyle(cell));
    }

    // 열 고정
    worksheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 2 }];
  });

  // 파일 다운로드
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PFMEA_기초정보_템플릿_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

/** 샘플 데이터 (다중 시트용) - 타이어 제조 공정 기반 */
const SAMPLE_DATA: Record<string, string[][]> = {
  'A1': [
    ['10', '자재입고'],
    ['20', '수입검사'],
    ['30', 'MB Mixing'],
    ['40', 'FM Mixing'],
    ['50', '압출'],
    ['60', '압연'],
    ['70', '비드성형'],
    ['80', '성형'],
    ['90', '가류'],
    ['100', '완성검사'],
    ['110', '포장'],
    ['120', '출하'],
  ],
  'A3': [
    ['10', '입고된 원자재를 검수하여 지정된 창고로 입고'],
    ['20', '원부자재 샘플링 수입검사'],
    ['30', '컴파운드 종류에 맞는 마스터배치 조건에 따라 혼련'],
    ['40', '파이널믹싱 조건에 따라 혼련하여 고무시트 생산'],
    ['50', '고무 압출하여 TREAD, SIDE 등 반제품 생산'],
    ['60', '스틸코드, 패브릭코드에 고무를 코팅하여 반제품 생산'],
    ['70', '비드와이어에 고무를 코팅하여 비드 생산'],
    ['80', '그린타이어 부재료 반제품을 접착하여 그린타이어 생산'],
    ['90', '가류기에서 그린타이어를 가열/가압하여 완제품 생산'],
    ['100', '완성품의 외관, 균형, X-ray 검사'],
    ['110', '완성품 포장'],
    ['120', '완성품 출하'],
  ],
  'A4': [
    ['10', '이물질'],
    ['10', '보관상태'],
    ['20', 'Mooney Viscosity'],
    ['20', '인장강도'],
    ['30', 'Mooney Viscosity'],
    ['30', 'Scorch Time'],
    ['40', 'Rheometer'],
    ['50', 'Tread 폭'],
    ['50', 'Side Wall 두께'],
    ['60', 'Steel Cord 폭'],
    ['80', 'Bead To Bead 폭'],
    ['80', 'G/T 중량'],
    ['90', '가류도'],
    ['100', '외관'],
  ],
  'A5': [
    ['10', '이물입 오염'],
    ['10', '포장,제품 손상'],
    ['20', 'Mooney 불만족'],
    ['20', '인장강도 불만족'],
    ['30', 'Mooney 불만족'],
    ['40', 'Rheometer 불만족'],
    ['50', 'Tread 폭 불량'],
    ['60', 'Steel Cord 폭 불량'],
    ['80', 'Bead To Bead 폭 불만족'],
    ['80', 'G/T 중량 불만족'],
    ['90', '가류 불량'],
    ['100', '외관 불량'],
  ],
  'A6': [
    ['20', 'Mooney Viscometer'],
    ['20', '인장시험기'],
    ['30', 'Rheometer'],
    ['40', 'Rheometer'],
    ['50', '두께 측정'],
    ['60', '폭 측정'],
    ['80', '육안검사'],
    ['80', '자동중량'],
    ['90', '가류도 측정'],
    ['100', 'X-ray 검사'],
  ],
  'B1': [
    ['00', '셋업엔지니어'],
    ['00', '작업자'],
    ['00', '운반원'],
    ['00', '보전원'],
    ['00', '검사원'],
    ['10', '지게차'],
    ['10', '자동창고'],
    ['20', 'MOONEY VISCOMETER'],
    ['20', 'DBP ABSORPMETER'],
    ['30', 'MB 믹서'],
    ['40', 'FB 믹서'],
    ['50', '압출기'],
    ['60', '카렌다'],
    ['80', '카카스 드럼'],
    ['80', '비드 드럼'],
    ['90', '가류기'],
  ],
  'B2': [
    ['00', '설비 조건을 셋업하고 공정 파라미터를 설정하며 초기품을 승인한다'],
    ['00', '작업을 수행하고 기준서를 준수하며 생산품을 이송한다'],
    ['00', '자재 및 제품을 운반한다'],
    ['00', '설비를 유지보수한다'],
    ['00', '품질 검사를 수행한다'],
    ['10', '자재 운반 및 입고'],
    ['20', '점도 측정'],
    ['30', '고무 혼련 및 배합'],
    ['50', '고무 압출'],
    ['60', '고무 코팅'],
    ['80', '카카스 드럼 회전 및 반제품 부착'],
    ['90', '가열 가압'],
  ],
  'B3': [
    ['00', '설비 초기 조건 설정 정확도'],
    ['00', '표준작업방법 준수도'],
    ['30', '혼련 온도'],
    ['30', 'Drop Temp'],
    ['40', 'RPM'],
    ['50', '압출 온도'],
    ['50', '압출 속도'],
    ['60', 'EPI'],
    ['80', 'Center Deck 센터링'],
    ['80', '비드 압력'],
    ['90', '가류 온도'],
    ['90', '가류 시간'],
  ],
  'B4': [
    ['00', '작업 표준서 미숙지로 인한 절차 누락'],
    ['00', '과도한 작업속도로 인한 조립 불량'],
    ['00', '교육훈련 부족으로 인한 품질 이상'],
    ['30', '계량기 오류'],
    ['30', '온도 센서 오류'],
    ['50', '온도 설정 오류'],
    ['50', '속도 변동'],
    ['80', '장착Tool 규격 상이'],
    ['80', '작업지침서 미준수'],
    ['90', '온도 이탈'],
  ],
  'B5': [
    ['10', '입고품 점검 체크시트 운영'],
    ['20', '업체 성적서 검증'],
    ['30', '온도 모니터링'],
    ['40', '파라미터 확인'],
    ['50', '속도 모니터링'],
    ['80', '바코드 스캔'],
    ['80', 'PDA 확인'],
    ['90', '온도 기록계'],
  ],
  'C1': [
    ['Your Plant'],
    ['Ship to Plant'],
    ['User'],
  ],
  'C2': [
    ['Your Plant', '규격에 맞는 재료 투입과 배합 일관성을 확보할 수 있도록 기능을 제공한다'],
    ['Your Plant', '설비 조건 및 작업 수행 정확도를 유지할 수 있도록 기능을 제공한다'],
    ['Ship to Plant', '완제품 품질 및 성능을 확보할 수 있도록 기능을 제공한다'],
    ['User', '차량 운행 시 안전성과 내구성을 확보한다'],
  ],
  'C3': [
    ['Your Plant', '이종고무, 코드 투입, 셋업실수'],
    ['Your Plant', '설비, 작업자 실수'],
    ['Ship to Plant', '완제품 품질 규격'],
    ['User', '안전 기준, 내구 기준'],
  ],
  'C4': [
    ['Your Plant', '이종 재료 혼입, 물성 불균일, 접착 불량으로 일부 폐기'],
    ['Your Plant', '공정 조건 이탈, 품질 불균일로 일부 재작업'],
    ['Ship to Plant', '완제품 성능 불량, 반품'],
    ['User', '조기 마모, 안전 사고 위험'],
  ],
};

/** 샘플 데이터 템플릿 다운로드 (다중 시트) */
export async function downloadSampleTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FMEA Smart System';
  workbook.created = new Date();

  // 각 시트 생성
  SHEET_DEFINITIONS.forEach((def) => {
    const worksheet = workbook.addWorksheet(def.name, {
      properties: { tabColor: { argb: def.color } },
    });

    // 컬럼 설정
    worksheet.columns = def.headers.map((header, i) => ({
      header,
      key: `col${i}`,
      width: i === 0 ? 15 : 30,
    }));

    // 헤더 스타일
    const headerRow = worksheet.getRow(1);
    headerRow.height = 25;
    headerRow.eachCell((cell) => applyHeaderStyle(cell, def.color));

    // 안내 행 (2행)
    const guideRow = worksheet.addRow(def.required.map(r => r ? '(필수)' : '(선택)'));
    guideRow.eachCell((cell) => applyGuideStyle(cell));

    // 샘플 데이터 추가
    const sampleRows = SAMPLE_DATA[def.name] || [];
    sampleRows.forEach((data, idx) => {
      const row = worksheet.addRow(data);
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? 'FFFFFF' : 'E0F2FB' } };
        cell.border = {
          top: { style: 'thin', color: { argb: '999999' } },
          left: { style: 'thin', color: { argb: '999999' } },
          bottom: { style: 'thin', color: { argb: '999999' } },
          right: { style: 'thin', color: { argb: '999999' } },
        };
        // 가로세로 중앙정렬 추가
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: '맑은 고딕', size: 10 };
      });
    });

    // 열 고정
    worksheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 2 }];
  });

  // 파일 다운로드
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PFMEA_기초정보_샘플_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// =====================================================
// 관계형 템플릿 다운로드 함수들
// =====================================================

/** 관계형 A (공정) 빈 템플릿 */
export async function downloadRelationAEmpty() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('A_공정');
  
  sheet.columns = [
    { header: 'A1 No', key: 'A1', width: 10 },
    { header: 'A2 공정명', key: 'A2', width: 15 },
    { header: 'A3 기능', key: 'A3', width: 25 },
    { header: 'A4 특성', key: 'A4', width: 15 },
    { header: 'A5 고장', key: 'A5', width: 15 },
    { header: 'A6 검출', key: 'A6', width: 15 },
  ];
  
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => applyHeaderStyle(cell, HEADER_COLOR));
  
  for (let i = 0; i < 20; i++) {
    const row = sheet.addRow(['', '', '', '', '', '']);
    row.eachCell((cell) => applyDataStyle(cell));
  }
  
  await downloadWorkbook(workbook, '관계형A_공정_빈템플릿');
}

/** 관계형 A (공정) 샘플 템플릿 */
export async function downloadRelationASample() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('A_공정');
  
  sheet.columns = [
    { header: 'A1 No', key: 'A1', width: 10 },
    { header: 'A2 공정명', key: 'A2', width: 15 },
    { header: 'A3 기능', key: 'A3', width: 30 },
    { header: 'A4 특성', key: 'A4', width: 15 },
    { header: 'A5 고장', key: 'A5', width: 15 },
    { header: 'A6 검출', key: 'A6', width: 15 },
  ];
  
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => applyHeaderStyle(cell, HEADER_COLOR));
  
  const data = [
    ['10', '자재입고', '입고된 원자재를 검수하여 창고 입고', '이물질', '이물입 오염', '육안검사'],
    ['20', '수입검사', '원부자재 샘플링 수입검사', 'Mooney', 'Mooney 불만족', 'Mooney Viscometer'],
    ['30', 'MB Mixing', 'MB조건에 따라 혼련', 'Mooney', 'Mooney 불만족', 'Rheometer'],
    ['40', 'FM Mixing', 'FM조건에 따라 혼련', 'Rheometer', 'Rheometer 불만족', 'Rheometer'],
    ['50', '압출', '고무 압출하여 반제품 생산', 'Tread 폭', '폭 불량', '두께 측정'],
    ['60', '압연', '스틸코드에 고무 코팅', 'Steel Cord 폭', '폭 불량', '폭 측정'],
    ['80', '성형', '그린타이어 생산', 'B2B 폭', 'B2B 불만족', '육안검사'],
    ['90', '가류', '가열/가압하여 완제품 생산', '가류도', '가류 불량', '가류도 측정'],
  ];
  
  data.forEach((row, idx) => {
    const r = sheet.addRow(row);
    r.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? 'FFFFFF' : 'E0F2FB' } };
      applyDataStyle(cell);
    });
  });
  
  await downloadWorkbook(workbook, '관계형A_공정_샘플');
}

/** 관계형 B (작업요소) 빈 템플릿 */
export async function downloadRelationBEmpty() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('B_작업요소');
  
  sheet.columns = [
    { header: 'A1 No', key: 'A1', width: 10 },
    { header: 'B1 작업요소', key: 'B1', width: 15 },
    { header: 'B2 기능', key: 'B2', width: 30 },
    { header: 'B3 특성', key: 'B3', width: 15 },
    { header: 'B4 원인', key: 'B4', width: 20 },
    { header: 'B5 예방', key: 'B5', width: 15 },
  ];
  
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => applyHeaderStyle(cell, HEADER_COLOR));
  
  for (let i = 0; i < 20; i++) {
    const row = sheet.addRow(['', '', '', '', '', '']);
    row.eachCell((cell) => applyDataStyle(cell));
  }
  
  await downloadWorkbook(workbook, '관계형B_작업요소_빈템플릿');
}

/** 관계형 B (작업요소) 샘플 템플릿 */
export async function downloadRelationBSample() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('B_작업요소');
  
  sheet.columns = [
    { header: 'A1 No', key: 'A1', width: 10 },
    { header: 'B1 작업요소', key: 'B1', width: 15 },
    { header: 'B2 기능', key: 'B2', width: 35 },
    { header: 'B3 특성', key: 'B3', width: 15 },
    { header: 'B4 원인', key: 'B4', width: 25 },
    { header: 'B5 예방', key: 'B5', width: 15 },
  ];
  
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => applyHeaderStyle(cell, HEADER_COLOR));
  
  const data = [
    ['00', '셋업엔지니어', '설비 조건 셋업 및 파라미터 설정', '설정 정확도', '표준서 미숙지', '교육훈련'],
    ['00', '작업자', '작업 수행 및 기준서 준수', '작업 준수도', '작업속도 과다', '작업표준서'],
    ['10', '지게차', '자재 운반 및 입고', '운반 정확도', '오배송', '바코드 스캔'],
    ['20', 'Mooney계', '점도 측정', '측정 정확도', '센서 오류', '정기 교정'],
    ['30', 'MB 믹서', '고무 혼련 및 배합', '혼련 온도', '온도 이탈', '온도 모니터링'],
    ['50', '압출기', '고무 압출', '압출 속도', '속도 변동', '속도 모니터링'],
    ['80', '카카스 드럼', '드럼 회전 및 반제품 부착', '센터링', '규격 상이', '바코드 스캔'],
    ['90', '가류기', '가열 가압', '가류 온도', '온도 이탈', '온도 기록계'],
  ];
  
  data.forEach((row, idx) => {
    const r = sheet.addRow(row);
    r.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? 'FFFFFF' : 'E8F5E9' } };
      applyDataStyle(cell);
    });
  });
  
  await downloadWorkbook(workbook, '관계형B_작업요소_샘플');
}

/** 관계형 C (완제품) 빈 템플릿 */
export async function downloadRelationCEmpty() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('C_완제품');
  
  sheet.columns = [
    { header: 'No', key: 'No', width: 8 },
    { header: 'C1 구분', key: 'C1', width: 15 },
    { header: 'C2 기능', key: 'C2', width: 35 },
    { header: 'C3 요구', key: 'C3', width: 20 },
    { header: 'C4 영향', key: 'C4', width: 25 },
  ];
  
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => applyHeaderStyle(cell, HEADER_COLOR));
  
  for (let i = 0; i < 10; i++) {
    const row = sheet.addRow(['', '', '', '', '']);
    row.eachCell((cell) => applyDataStyle(cell));
  }
  
  await downloadWorkbook(workbook, '관계형C_완제품_빈템플릿');
}

/** 관계형 C (완제품) 샘플 템플릿 */
export async function downloadRelationCSample() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('C_완제품');
  
  sheet.columns = [
    { header: 'No', key: 'No', width: 8 },
    { header: 'C1 구분', key: 'C1', width: 15 },
    { header: 'C2 기능', key: 'C2', width: 40 },
    { header: 'C3 요구', key: 'C3', width: 20 },
    { header: 'C4 영향', key: 'C4', width: 30 },
  ];
  
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => applyHeaderStyle(cell, HEADER_COLOR));
  
  const data = [
    ['1', 'Your Plant', '재료 투입과 배합 일관성 확보', '이종고무 투입', '물성 불균일, 접착 불량'],
    ['2', 'Your Plant', '설비 조건 및 작업 수행 정확도 유지', '설비/작업자 실수', '공정 조건 이탈'],
    ['3', 'Ship to Plant', '완제품 품질 및 성능 확보', '완제품 규격', '성능 불량, 반품'],
    ['4', 'User', '차량 운행 시 안전성과 내구성 확보', '안전/내구 기준', '조기 마모, 안전 사고'],
  ];
  
  data.forEach((row, idx) => {
    const r = sheet.addRow(row);
    r.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? 'FFFFFF' : 'FFEBEE' } };
      applyDataStyle(cell);
    });
  });
  
  await downloadWorkbook(workbook, '관계형C_완제품_샘플');
}

/** 공통 다운로드 헬퍼 */
async function downloadWorkbook(workbook: ExcelJS.Workbook, fileName: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

