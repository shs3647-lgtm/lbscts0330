#!/usr/bin/env node
/**
 * @file generate-p015-i15-sample.mjs
 * @description pfm26-p015-i15 Import Sample Excel 생성 (4시트, FC 100% 연결)
 *
 * 제품: PLP (Panel Level Package) Fan-Out 공정
 * 구성: 12공정, 15FM, 67FC, 76FL(chains), 14FE
 *
 * 출력:
 *   1. C:/Users/Administrator/Documents/00_lbscts0330/pfm26-p015-i15_import_sample.xlsx
 *   2. public/downloads/aubump_import_sample.xlsx (샘플 다운로드 교체)
 */
import { createRequire } from 'module';
import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const ExcelJS = require('exceljs');

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ─── 스타일 상수 ───
const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00587A' } };
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
const CELL_ALIGN = { horizontal: 'center', vertical: 'middle', wrapText: true };
const BORDER = {
  top: { style: 'thin' }, bottom: { style: 'thin' },
  left: { style: 'thin' }, right: { style: 'thin' },
};

function styleSheet(ws, dataRows, cols) {
  const hr = ws.getRow(1);
  hr.height = 32;
  for (let c = 1; c <= cols; c++) {
    const cell = hr.getCell(c);
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = CELL_ALIGN;
    cell.border = BORDER;
  }
  for (let r = 2; r <= dataRows + 1; r++) {
    for (let c = 1; c <= cols; c++) {
      const cell = ws.getRow(r).getCell(c);
      cell.alignment = CELL_ALIGN;
      cell.border = BORDER;
    }
  }
}

function calcAP(s, o, d) {
  const v = s * o * d;
  if (v >= 100) return 'H';
  if (v >= 40) return 'M';
  return 'L';
}

// ============================
// FE (고장영향) 정의 — 14개
// ============================
const FE = [
  /* 0  */ { scope: 'YP', text: 'Particle 오염으로 인한 RDL 패턴 불량', s: 5 },
  /* 1  */ { scope: 'YP', text: 'Seed Layer 두께 Spec Out으로 인한 전기적 특성 이상', s: 7 },
  /* 2  */ { scope: 'YP', text: 'Seed Layer 막질 이상으로 인한 접합 강도 저하', s: 6 },
  /* 3  */ { scope: 'YP', text: 'PR 두께 Spec Out으로 인한 패턴 형성 불량', s: 6 },
  /* 4  */ { scope: 'YP', text: 'CD Spec Out으로 인한 회로 Open/Short', s: 8 },
  /* 5  */ { scope: 'YP', text: 'Etch 불균일로 인한 패턴 결함', s: 7 },
  /* 6  */ { scope: 'YP', text: 'Cu Plating 두께 Spec Out으로 인한 전기적 특성 저하', s: 7 },
  /* 7  */ { scope: 'SP', text: 'Solder Ball Height Spec Out으로 인한 실장 불량', s: 7 },
  /* 8  */ { scope: 'SP', text: '외관 결함 유출로 인한 고객 Claim', s: 6 },
  /* 9  */ { scope: 'SP', text: 'Package Crack으로 인한 고객 불량 유출', s: 8 },
  /* 10 */ { scope: 'SP', text: 'Packing 부적합으로 인한 납품 Reject', s: 5 },
  /* 11 */ { scope: 'USER', text: '전기적 Open/Short으로 인한 고객 라인 정지', s: 9 },
  /* 12 */ { scope: 'USER', text: '유해물질 검출로 인한 리콜·법적 조치', s: 9 },
  /* 13 */ { scope: 'YP', text: 'Cu Plating 균일도 이상으로 인한 Bump 특성 불량', s: 6 },
];

// ============================
// 공정 정의 (12개)
// ============================
const PROC = {
  '01': '수입검사(IQA)',
  '10': 'Panel 세정',
  '20': 'Seed Sputter',
  '30': 'PR Coating',
  '40': 'Exposure',
  '50': 'Develop & Etch',
  '60': 'Cu Plating',
  '70': 'Solder Ball Mount',
  '80': 'Reflow',
  '90': 'Final Inspection',
  '100': 'Singulation',
  '110': 'Packing',
};

// ============================
// L1 정의 (C1-C4) — 14행
// [scope, productFunc, requirement, failureEffect]
// ============================
const L1_DATA = [
  ['YP', 'Panel 표면 청정도(파티클 수)가 공정 기준을 만족', '파티클 잔류 기준(≤50ea/panel)', 'Particle 오염으로 인한 RDL 패턴 불량'],
  ['YP', 'Seed Layer(Ti/Cu) 두께가 설계 규격을 만족', 'Seed Layer 두께(Ti:100±10nm, Cu:300±30nm)', 'Seed Layer 두께 Spec Out으로 인한 전기적 특성 이상'],
  ['YP', 'Seed Layer 막질 균일도가 설계 기준을 만족', 'Sheet Resistance 균일도(±5%)', 'Seed Layer 막질 이상으로 인한 접합 강도 저하'],
  ['YP', 'PR 패턴이 설계 치수를 만족', 'PR 두께 규격(10±1μm)', 'PR 두께 Spec Out으로 인한 패턴 형성 불량'],
  ['YP', 'Exposure CD가 설계 규격을 만족', 'CD 규격(L/S=10/10μm±0.5μm)', 'CD Spec Out으로 인한 회로 Open/Short'],
  ['YP', 'Etch 프로파일이 설계 기준을 만족', 'Etch 균일도 규격(±5%)', 'Etch 불균일로 인한 패턴 결함'],
  ['YP', 'Cu Plating 두께가 설계 규격을 만족', 'Cu Plating 두께(8±0.5μm)', 'Cu Plating 두께 Spec Out으로 인한 전기적 특성 저하'],
  ['YP', 'Cu Plating 균일도가 설계 기준을 만족', 'Cu 두께 균일도(±10%)', 'Cu Plating 균일도 이상으로 인한 Bump 특성 불량'],
  ['SP', 'Solder Ball 높이가 고객 규격을 만족', 'Ball Height 규격(250±15μm)', 'Solder Ball Height Spec Out으로 인한 실장 불량'],
  ['SP', 'Package 외관이 출하 기준을 만족', '외관 검사 기준(Crack/Chip/Scratch)', '외관 결함 유출로 인한 고객 Claim'],
  ['SP', 'Package 구조 건전성이 고객 기준을 만족', 'Package 강도 규격', 'Package Crack으로 인한 고객 불량 유출'],
  ['SP', 'Packing 상태가 고객 기준을 만족', 'Packing 기준(ESD, 습도 관리)', 'Packing 부적합으로 인한 납품 Reject'],
  ['USER', '제품의 전기적 신뢰성 확보', '전기적 특성(Continuity/Isolation)', '전기적 Open/Short으로 인한 고객 라인 정지'],
  ['USER', 'RoHS/환경 규제 만족', 'RoHS 규제 기준', '유해물질 검출로 인한 리콜·법적 조치'],
];

// ============================
// L2 (FM) 정의 — 15행
// [processNo, processFunc(A3), productChar(A4), specialChar, failureMode(A5), detectionCtrl(A6)]
// ============================
const L2_DATA = [
  ['01', '수입 Panel의 두께/TTV/외관을 검사하여 규격 적합 판정', 'Panel TTV', '◇', 'Panel 두께/TTV 이상', 'Panel TTV 전수 측정 및 SPC 관리'],
  ['10', 'Panel 표면 Particle 및 유기물을 세정하여 청정도 확보', '표면 청정도(파티클 수)', '', 'Particle 잔류 이상', 'Particle Counter 측정 및 SPC 관리'],
  ['20', 'Seed Layer(Ti/Cu) 박막을 균일하게 증착하여 두께 확보', 'Seed Layer 두께(Ti/Cu)', '★', 'Seed Layer 두께 이상(과후/과박)', 'Seed 두께 In-line SPC 측정'],
  ['20', 'Seed Layer 막질 균일도를 확보하여 후공정 접합 보장', 'Sheet Resistance 균일도', '★', 'Seed Layer 막질 균일도 이상', 'Sheet Resistance 4-probe 측정'],
  ['30', 'PR을 균일하게 Coating하여 설계 두께 확보', 'PR 두께', '★', 'PR 두께 이상(과후/과박)', 'PR 두께 In-line 측정 및 SPC 관리'],
  ['40', 'Mask 패턴을 PR에 정확히 전사하여 CD 확보', 'CD(Critical Dimension)', '★', 'CD(Critical Dimension) 이상', 'CD In-line SPC 측정'],
  ['50', 'PR 현상으로 개구부를 정확히 형성', 'Opening 정확도', '', 'Develop 잔사 이상', 'Opening 크기 SPC 측정'],
  ['50', 'Etch 프로파일을 균일하게 형성하여 회로 정밀도 확보', 'Etch 균일도(%)', '', 'Etch Profile 이상', 'Etch Rate 모니터링 및 SPC 관리'],
  ['60', 'Cu를 균일하게 전해 도금하여 설계 두께 확보', 'Cu Plating 두께', '★', 'Cu Plating 두께 이상', 'Cu 두께 In-line 측정 및 SPC 관리'],
  ['70', 'Solder Ball을 정확한 위치에 배치하여 접합 준비', 'Ball 위치 정확도', '', 'Ball Missing/위치 이상', 'Ball 배치 Vision 검사'],
  ['80', 'Reflow 열처리로 Solder Ball 접합 완성', 'Ball Shear Force(gf)', '', 'Solder Joint 접합 불량', 'Ball Shear Test 및 SPC 관리'],
  ['90', 'Package 외관 결함을 검출하여 불량 유출 방지', '외관 결함 수', '◇', '외관 결함 미검출', '외관 AOI + Manual 검사'],
  ['90', 'Package 전기적 특성을 검증하여 기능 불량 유출 방지', '전기적 특성(Open/Short)', '◇', '전기적 특성 불량 미검출', '전기 테스트 100% 검사'],
  ['100', 'Dicing으로 개별 Package를 분리하여 제품 완성', 'Dicing 품질(Chipping)', '', 'Dicing 칩핑/크랙', 'Dicing 후 외관 검사 및 SPC 관리'],
  ['110', '출하 기준에 맞게 포장하여 제품 보호', '포장 상태(ESD/습도)', '◇', '포장 상태 부적합', '포장 상태 최종 확인'],
];

// DC lookup: (processNo|fm) → dc
const DC_MAP = new Map();
for (const r of L2_DATA) DC_MAP.set(r[0] + '|' + r[4], r[5]);

// ============================
// 체인 정의 (76행) — FC 시트 + L3 파생
// [feIdx, pno, fm, m4, we, b2(elemFunc), b3(procChar), fc(B4), pc(B5), o, d]
// ============================
const CHAINS = [
  // ─── Process 01: 수입검사(IQA) — FM: Panel 두께/TTV 이상 — 5 FC, 5 chains ───
  [1, '01', 'Panel 두께/TTV 이상', 'MC', '검사 장비', '검사 장비가 Panel TTV를 정밀 측정', 'TTV 측정 정밀도(μm)', '측정 장비 교정 불량에 의한 TTV 오판정', '장비 정기 교정(월 1회)', 3, 4],
  [1, '01', 'Panel 두께/TTV 이상', 'MC', '측정 Probe', '측정 Probe가 Panel 두께를 정확히 측정', 'Probe 측정 재현성(R&R%)', 'Probe 마모에 의한 두께 측정 오차', 'Probe 교체 주기 관리', 2, 3],
  [11, '01', 'Panel 두께/TTV 이상', 'IM', '수입 Panel', '수입 Panel이 두께 규격을 만족', 'Panel 두께 규격(μm)', '공급사 Panel 두께 편차 과대', '공급사 규격 관리 및 수입검사', 4, 4],
  [11, '01', 'Panel 두께/TTV 이상', 'MN', '검사 작업자', '작업자가 검사 절차를 준수', '검사 절차 준수율(%)', '검사 기준 미숙지에 의한 오판정', '작업자 교육(분기 1회)', 3, 5],
  [1, '01', 'Panel 두께/TTV 이상', 'EN', '검사 환경', '검사 환경이 측정 정밀도를 보장', '검사실 온습도(℃/RH%)', '온도 변동에 의한 측정값 편차', '항온항습 환경 유지(23±2℃)', 2, 3],

  // ─── Process 10: Panel 세정 — FM: Particle 잔류 이상 — 4 FC, 4 chains ───
  [0, '10', 'Particle 잔류 이상', 'MC', '세정 장비', '세정 장비가 Panel 표면 Particle을 제거', 'Spray Pressure(kgf/cm²)', '세정 노즐 막힘에 의한 Spray 압력 저하', '노즐 정기 점검 및 교체', 3, 4],
  [0, '10', 'Particle 잔류 이상', 'IM', 'DI Water', 'DI Water가 세정 기준 순도를 만족', 'DI Water 저항율(MΩ·cm)', 'DI Water 오염에 의한 세정 불량', 'DI Water 저항율 실시간 모니터링', 2, 3],
  [0, '10', 'Particle 잔류 이상', 'MN', '세정 작업자', '작업자가 세정 레시피를 정확히 설정', '레시피 설정 정확도', '세정 시간/온도 설정 오류', '레시피 변경 승인 절차', 3, 5],
  [0, '10', 'Particle 잔류 이상', 'EN', 'Clean Room', 'Clean Room이 Class 기준을 유지', 'Clean Room Class', '외부 Particle 유입에 의한 오염', 'Clean Room 환경 모니터링', 2, 3],

  // ─── Process 20: Seed Sputter ───
  // FM1: Seed Layer 두께 이상(과후/과박) — 5 FC, 6 chains (DC Power → FE1+FE6 dual)
  [1, '20', 'Seed Layer 두께 이상(과후/과박)', 'MC', 'Sputter 챔버', 'Sputter 챔버가 Seed Layer를 균일하게 증착', 'Target-Substrate 간격(mm)', '챔버 내 Erosion 불균일에 의한 막 두께 편차', 'Target 수명 관리 및 교체 주기 설정', 3, 3],
  [1, '20', 'Seed Layer 두께 이상(과후/과박)', 'MC', 'DC Power Supply', 'DC Power가 설계 증착률을 제공', 'DC Power 안정도(W)', 'Power 공급 불안정에 의한 증착률 변동', 'Power Supply 정기 점검', 3, 3],
  [6, '20', 'Seed Layer 두께 이상(과후/과박)', 'MC', 'DC Power Supply', 'DC Power가 설계 증착률을 제공', 'DC Power 안정도(W)', 'Power 공급 불안정에 의한 증착률 변동', 'Power Supply 정기 점검', 3, 4],
  [1, '20', 'Seed Layer 두께 이상(과후/과박)', 'IM', 'Sputter Target(Ti/Cu)', 'Target이 규격 순도를 만족', 'Target 순도(%)', 'Target 소모에 의한 증착 속도 변화', 'Target 수명(kWh) 관리', 3, 3],
  [1, '20', 'Seed Layer 두께 이상(과후/과박)', 'EN', '챔버 진공', '챔버 진공도가 공정 기준을 만족', '진공도(mTorr)', '진공 Leak에 의한 막질 이상', '진공도 실시간 모니터링', 2, 3],
  [1, '20', 'Seed Layer 두께 이상(과후/과박)', 'MN', 'Sputter 작업자', '작업자가 Sputter 레시피를 정확히 설정', 'Ar Gas 유량(sccm)', 'Ar Gas 유량 설정 오류에 의한 증착 불균일', '레시피 승인 절차 및 작업 표준서', 3, 4],

  // FM2: Seed Layer 막질 균일도 이상 — 4 FC, 4 chains
  [2, '20', 'Seed Layer 막질 균일도 이상', 'MC', 'Magnetron', 'Magnetron이 플라즈마를 균일하게 생성', 'Magnetron 회전 속도(rpm)', 'Magnetron 불균일에 의한 Sheet Resistance 편차', 'Magnetron 정기 점검', 3, 4],
  [2, '20', 'Seed Layer 막질 균일도 이상', 'MC', '기판 Heater', 'Heater가 기판 온도를 균일하게 유지', '기판 온도(℃)', 'Heater 불균일에 의한 막질 변동', 'Heater 정기 교정', 3, 3],
  [11, '20', 'Seed Layer 막질 균일도 이상', 'IM', 'Ar Gas', 'Ar Gas가 규격 순도를 만족', 'Ar 순도(99.999%)', 'Ar 불순물에 의한 막질 오염', 'Gas 분석 인증서 확인', 2, 3],
  [2, '20', 'Seed Layer 막질 균일도 이상', 'EN', '챔버 온도', '챔버 온도가 공정 기준을 유지', '챔버 벽면 온도(℃)', '챔버 온도 변동에 의한 막질 불안정', '챔버 온도 실시간 모니터링', 2, 3],

  // ─── Process 30: PR Coating — FM: PR 두께 이상 — 5 FC, 6 chains (Bake Plate → FE3+FE4 dual) ───
  [3, '30', 'PR 두께 이상(과후/과박)', 'MC', 'Coater', 'Coater가 PR을 균일하게 도포', 'Spin Speed(rpm)', 'Coater 회전 속도 편차에 의한 PR 두께 불균일', 'Spin Speed SPC 모니터링', 3, 3],
  [3, '30', 'PR 두께 이상(과후/과박)', 'MC', 'Bake Plate', 'Bake Plate가 PR 건조 온도를 균일하게 유지', 'Bake 온도(℃)', 'Bake 온도 편차에 의한 PR 두께 변동', 'Bake Plate 온도 균일도 점검', 3, 3],
  [4, '30', 'PR 두께 이상(과후/과박)', 'MC', 'Bake Plate', 'Bake Plate가 PR 건조 온도를 균일하게 유지', 'Bake 온도(℃)', 'Bake 온도 편차에 의한 PR 두께 변동', 'Bake Plate 온도 균일도 점검', 3, 4],
  [3, '30', 'PR 두께 이상(과후/과박)', 'IM', 'PR 용액', 'PR 용액이 점도 규격을 만족', 'PR 점도(cP)', 'PR 점도 변동에 의한 코팅 두께 이상', 'PR 점도 입고 검사 및 사용기한 관리', 3, 4],
  [3, '30', 'PR 두께 이상(과후/과박)', 'MN', 'Coating 작업자', '작업자가 Coating 레시피를 정확히 설정', '토출량 설정(ml)', '토출량 설정 오류에 의한 두께 이상', '레시피 변경 승인 절차', 3, 5],
  [3, '30', 'PR 두께 이상(과후/과박)', 'EN', 'Coating Room', 'Coating Room이 온습도 기준을 유지', 'Room 온습도(℃/RH%)', '습도 변동에 의한 PR 건조 불균일', 'Coating Room 온습도 관리(23±1℃, 45±5%RH)', 2, 3],

  // ─── Process 40: Exposure — FM: CD 이상 — 5 FC, 6 chains (UV Lamp → FE4+FE11 dual) ───
  [4, '40', 'CD(Critical Dimension) 이상', 'MC', 'Aligner', 'Aligner가 Mask와 Panel을 정밀 정렬', 'Overlay 정밀도(μm)', '정렬 오차에 의한 CD 편차', 'Overlay 측정 및 SPC 관리', 3, 3],
  [4, '40', 'CD(Critical Dimension) 이상', 'MC', 'UV Lamp', 'UV Lamp가 설계 노광량을 균일하게 조사', '노광량(mJ/cm²)', 'Lamp 열화에 의한 노광량 부족', 'Lamp 사용시간 관리 및 교체 주기 설정', 3, 3],
  [11, '40', 'CD(Critical Dimension) 이상', 'MC', 'UV Lamp', 'UV Lamp가 설계 노광량을 균일하게 조사', '노광량(mJ/cm²)', 'Lamp 열화에 의한 노광량 부족', 'Lamp 사용시간 관리 및 교체 주기 설정', 3, 4],
  [4, '40', 'CD(Critical Dimension) 이상', 'IM', 'Photo Mask', 'Mask가 설계 패턴을 정확히 보유', 'Mask CD 정밀도(μm)', 'Mask 결함/오염에 의한 패턴 전사 불량', 'Mask 입고 검사 및 정기 세정', 2, 3],
  [4, '40', 'CD(Critical Dimension) 이상', 'MN', 'Exposure 작업자', '작업자가 노광 조건을 정확히 설정', 'Focus Offset(μm)', 'Focus 설정 오류에 의한 CD 변동', '작업자 교육 및 조건 변경 승인 절차', 3, 5],
  [4, '40', 'CD(Critical Dimension) 이상', 'EN', 'Yellow Room', 'Yellow Room이 조도 기준을 유지', 'Yellow Light 파장(nm)', '외부 자외선 유입에 의한 PR 감광', 'Yellow Room 조도 정기 측정', 2, 3],

  // ─── Process 50: Develop & Etch ───
  // FM1: Develop 잔사 이상 — 4 FC, 5 chains (Developer → FE5+FE4 dual)
  [5, '50', 'Develop 잔사 이상', 'MC', 'Developer 장비', 'Developer가 노광부 PR을 균일하게 용해 제거', 'Develop Time(sec)', 'Developer 노즐 막힘에 의한 현상 불균일', 'Developer 노즐 정기 세정', 3, 4],
  [4, '50', 'Develop 잔사 이상', 'MC', 'Developer 장비', 'Developer가 노광부 PR을 균일하게 용해 제거', 'Develop Time(sec)', 'Developer 노즐 막힘에 의한 현상 불균일', 'Developer 노즐 정기 세정', 3, 4],
  [5, '50', 'Develop 잔사 이상', 'IM', 'Developer 용액', 'Developer 용액이 농도 규격을 만족', 'Developer 농도(wt%)', 'Developer 농도 변동에 의한 현상 부족', 'Developer 농도 실시간 모니터링', 3, 3],
  [5, '50', 'Develop 잔사 이상', 'MN', 'Develop 작업자', '작업자가 현상 레시피를 정확히 설정', '현상 온도(℃)', '현상 시간 설정 오류에 의한 잔사 발생', '레시피 변경 승인 절차', 3, 5],
  [5, '50', 'Develop 잔사 이상', 'EN', '현상실 환경', '현상실이 온도 기준을 유지', '현상실 온도(℃)', '환경 온도 변동에 의한 현상 속도 변화', '현상실 온도 관리(23±1℃)', 2, 3],

  // FM2: Etch Profile 이상 — 5 FC, 5 chains
  [5, '50', 'Etch Profile 이상', 'MC', 'Etcher', 'Etcher가 금속층을 균일하게 식각', 'Etch Rate(nm/min)', 'Etcher 전극 열화에 의한 Etch Rate 변동', 'Etcher 전극 정기 교체', 3, 3],
  [5, '50', 'Etch Profile 이상', 'MC', 'Etch 챔버', 'Etch 챔버가 균일한 플라즈마를 형성', 'Etch 균일도(%)', '챔버 내 잔류물에 의한 Etch 불균일', '챔버 정기 세정(PM)', 3, 3],
  [11, '50', 'Etch Profile 이상', 'IM', 'Etchant', 'Etchant가 규격 농도를 만족', 'Etchant 농도(wt%)', 'Etchant 열화에 의한 식각 속도 이탈', 'Etchant 농도 정기 분석 및 교체', 3, 4],
  [5, '50', 'Etch Profile 이상', 'MN', 'Etch 작업자', '작업자가 Etch 조건을 정확히 설정', 'Over-Etch Time(sec)', 'Over-Etch 시간 설정 오류에 의한 회로 손상', '작업 표준서 준수 및 교육', 3, 5],
  [5, '50', 'Etch Profile 이상', 'EN', 'Etch Room', 'Etch Room이 배기 기준을 유지', 'Etch Room 배기량(CFM)', '배기 부족에 의한 Etchant 증기 축적', 'Etch Room 배기 모니터링', 2, 3],

  // ─── Process 60: Cu Plating — FM: Cu Plating 두께 이상 — 5 FC, 6 chains (Rectifier → FE6+FE13 dual) ───
  [6, '60', 'Cu Plating 두께 이상', 'MC', 'Plating Cell', 'Plating Cell이 Cu를 균일하게 전해 도금', '전류 밀도(ASD)', 'Plating Cell 내 전류 분포 불균일', 'Plating Cell Anode 정기 점검', 3, 3],
  [6, '60', 'Cu Plating 두께 이상', 'MC', 'Rectifier', 'Rectifier가 안정된 DC 전류를 공급', 'Rectifier 출력 안정도(A)', 'Rectifier 출력 변동에 의한 도금 속도 이탈', 'Rectifier 정기 교정', 3, 3],
  [13, '60', 'Cu Plating 두께 이상', 'MC', 'Rectifier', 'Rectifier가 안정된 DC 전류를 공급', 'Rectifier 출력 안정도(A)', 'Rectifier 출력 변동에 의한 도금 속도 이탈', 'Rectifier 정기 교정', 3, 4],
  [6, '60', 'Cu Plating 두께 이상', 'IM', 'Plating 용액', 'Plating 용액이 Cu 이온 농도 규격을 만족', 'Cu 이온 농도(g/L)', 'Cu 이온 소모에 의한 도금 두께 부족', 'Plating 용액 분석 및 보충(일 1회)', 3, 4],
  [6, '60', 'Cu Plating 두께 이상', 'MN', 'Plating 작업자', '작업자가 Plating 조건을 정확히 설정', 'Plating Time(min)', 'Plating 시간 설정 오류에 의한 두께 이상', '작업 표준서 및 조건 변경 승인', 3, 5],
  [6, '60', 'Cu Plating 두께 이상', 'EN', 'Plating Room', 'Plating Room이 온도 기준을 유지', '도금액 온도(℃)', '도금액 온도 변동에 의한 도금 속도 변화', '도금액 온도 실시간 모니터링', 2, 3],

  // ─── Process 70: Solder Ball Mount — FM: Ball Missing/위치 이상 — 5 FC, 6 chains (Flux → FE7+FE11 dual) ───
  [7, '70', 'Ball Missing/위치 이상', 'MC', 'Ball Mounter', 'Ball Mounter가 Solder Ball을 정위치에 배치', 'Placement 정밀도(μm)', 'Mounter Head 마모에 의한 Ball 배치 오차', 'Mounter Head 정기 교체', 3, 3],
  [7, '70', 'Ball Missing/위치 이상', 'MC', 'Flux Dispenser', 'Flux Dispenser가 균일하게 Flux를 도포', 'Flux 도포량(mg)', 'Flux 부족에 의한 Ball 미접합', 'Flux 도포량 정기 확인', 3, 4],
  [11, '70', 'Ball Missing/위치 이상', 'MC', 'Flux Dispenser', 'Flux Dispenser가 균일하게 Flux를 도포', 'Flux 도포량(mg)', 'Flux 부족에 의한 Ball 미접합', 'Flux 도포량 정기 확인', 3, 4],
  [7, '70', 'Ball Missing/위치 이상', 'IM', 'Solder Ball', 'Solder Ball이 규격 크기/합금을 만족', 'Ball 직경(μm)', 'Ball 크기 편차에 의한 Height 불균일', 'Ball 입고 검사(직경/합금 분석)', 2, 3],
  [7, '70', 'Ball Missing/위치 이상', 'MN', 'Mount 작업자', '작업자가 Mount 프로그램을 정확히 설정', 'Nozzle 흡착력(kPa)', 'Mount 프로그램 설정 오류에 의한 위치 이상', 'Mount 프로그램 검증 절차', 3, 5],
  [7, '70', 'Ball Missing/위치 이상', 'EN', 'Mount Room', 'Mount Room이 정전기 기준을 유지', 'ESD 전위(V)', 'ESD에 의한 Ball 이탈/위치 변동', 'ESD 모니터링 및 접지 관리', 2, 3],

  // ─── Process 80: Reflow — FM: Solder Joint 접합 불량 — 5 FC, 6 chains (Oven → FE7+FE9 dual) ───
  [7, '80', 'Solder Joint 접합 불량', 'MC', 'Reflow Oven', 'Reflow Oven이 설계 온도 프로파일을 유지', 'Peak 온도(℃)', 'Oven 온도 편차에 의한 과열/미접합', 'Reflow 프로파일 정기 측정(KIC)', 3, 3],
  [9, '80', 'Solder Joint 접합 불량', 'MC', 'Reflow Oven', 'Reflow Oven이 설계 온도 프로파일을 유지', 'Peak 온도(℃)', 'Oven 온도 편차에 의한 과열/미접합', 'Reflow 프로파일 정기 측정(KIC)', 3, 4],
  [7, '80', 'Solder Joint 접합 불량', 'MC', 'N₂ Generator', 'N₂ Generator가 Inert 분위기를 유지', 'N₂ 농도(%)', 'N₂ 농도 부족에 의한 산화 접합 불량', 'N₂ 농도 실시간 모니터링', 2, 3],
  [7, '80', 'Solder Joint 접합 불량', 'IM', 'Flux', 'Flux가 산화막을 제거하여 접합 촉진', 'Flux 활성도', 'Flux 열화에 의한 접합력 저하', 'Flux 사용기한 관리', 3, 4],
  [7, '80', 'Solder Joint 접합 불량', 'MN', 'Reflow 작업자', '작업자가 Reflow 프로파일을 정확히 설정', 'Ramp Rate(℃/sec)', 'Reflow 프로파일 설정 오류', '프로파일 변경 승인 절차', 3, 5],
  [7, '80', 'Solder Joint 접합 불량', 'EN', 'Reflow Zone', 'Reflow Zone이 배기 기준을 유지', 'Zone 배기량(CFM)', '배기 부족에 의한 Flux 잔사 증가', 'Reflow Zone 배기 점검', 2, 3],

  // ─── Process 90: Final Inspection ───
  // FM1: 외관 결함 미검출 — 4 FC, 4 chains
  [8, '90', '외관 결함 미검출', 'MC', 'AOI 장비', 'AOI 장비가 외관 결함을 자동 검출', 'AOI 검출율(%)', 'AOI 알고리즘 미설정에 의한 결함 미검출', 'AOI 검출율 정기 검증(Golden Sample)', 3, 3],
  [8, '90', '외관 결함 미검출', 'MC', '현미경', '현미경으로 미세 결함을 확인', '현미경 배율(X)', '현미경 광학계 열화에 의한 미세 결함 누락', '현미경 정기 교정', 3, 4],
  [8, '90', '외관 결함 미검출', 'MN', '검사 작업자(외관)', '작업자가 외관 검사를 정확히 수행', '검사 능력(Kappa)', '작업자 피로/숙련도 부족에 의한 검출 누락', '검사원 자격 인증 및 정기 교육', 4, 5],
  [8, '90', '외관 결함 미검출', 'EN', '검사 환경', '검사 환경이 조도/진동 기준을 유지', '검사대 조도(Lux)', '조도 부족에 의한 결함 미인식', '검사대 조도 정기 측정', 2, 3],

  // FM2: 전기적 특성 불량 미검출 — 3 FC, 4 chains (Tester → FE11+FE8 dual)
  [11, '90', '전기적 특성 불량 미검출', 'MC', 'Tester', 'Tester가 Open/Short를 정확히 검출', 'Test Coverage(%)', 'Tester Probe 마모에 의한 접촉 불량', 'Tester Probe 정기 교체', 3, 3],
  [8, '90', '전기적 특성 불량 미검출', 'MC', 'Tester', 'Tester가 Open/Short를 정확히 검출', 'Test Coverage(%)', 'Tester Probe 마모에 의한 접촉 불량', 'Tester Probe 정기 교체', 3, 4],
  [11, '90', '전기적 특성 불량 미검출', 'MN', 'Test 작업자', '작업자가 Test 프로그램을 정확히 설정', 'Test Limit 설정', 'Test Limit 설정 오류에 의한 불량 Pass', 'Test 프로그램 검증 및 승인 절차', 3, 5],
  [11, '90', '전기적 특성 불량 미검출', 'EN', 'Test Room', 'Test Room이 정전기/온도 기준을 유지', 'Test Room 온도(℃)', 'ESD에 의한 테스트 오류', 'ESD 모니터링 및 온도 관리', 2, 3],

  // ─── Process 100: Singulation — FM: Dicing 칩핑/크랙 — 4 FC, 5 chains (Saw → FE9+FE11 dual) ───
  [9, '100', 'Dicing 칩핑/크랙', 'MC', 'Dicing Saw', 'Dicing Saw가 Package를 정밀 절단', 'Blade 마모량(μm)', 'Blade 마모에 의한 절단면 칩핑', 'Blade 사용 횟수 관리 및 교체', 3, 3],
  [11, '100', 'Dicing 칩핑/크랙', 'MC', 'Dicing Saw', 'Dicing Saw가 Package를 정밀 절단', 'Blade 마모량(μm)', 'Blade 마모에 의한 절단면 칩핑', 'Blade 사용 횟수 관리 및 교체', 3, 4],
  [9, '100', 'Dicing 칩핑/크랙', 'IM', 'Dicing Tape', 'Dicing Tape가 Panel을 안정적으로 고정', 'Tape 접착력(gf/25mm)', 'Tape 접착력 부족에 의한 Package 이동', 'Dicing Tape 접착력 입고 검사', 3, 4],
  [9, '100', 'Dicing 칩핑/크랙', 'MN', 'Dicing 작업자', '작업자가 Dicing 조건을 정확히 설정', 'Blade 회전속도(rpm)', 'Dicing 속도 설정 오류에 의한 크랙 발생', '작업 표준서 및 조건 변경 승인', 3, 5],
  [9, '100', 'Dicing 칩핑/크랙', 'EN', 'Dicing Room', 'Dicing Room이 진동/온도 기준을 유지', 'DI Water 유량(L/min)', '냉각수 부족에 의한 열 크랙', 'DI Water 유량 모니터링', 2, 3],

  // ─── Process 110: Packing — FM: 포장 상태 부적합 — 4 FC, 4 chains ───
  [10, '110', '포장 상태 부적합', 'MC', '포장 장비', '포장 장비가 Tray/Tape에 제품을 안전하게 수납', 'Tray 치수 정밀도(mm)', '포장 장비 설정 오류에 의한 제품 손상', '포장 장비 정기 점검', 3, 4],
  [10, '110', '포장 상태 부적합', 'IM', '포장재(Tray/Tape)', '포장재가 ESD/습도 보호 규격을 만족', 'ESD 보호 수준(V)', '포장재 불량에 의한 ESD 손상', '포장재 입고 검사(ESD 측정)', 2, 3],
  [10, '110', '포장 상태 부적합', 'MN', '포장 작업자', '작업자가 포장 기준을 정확히 준수', '라벨 부착 정확도', '라벨 부착 오류에 의한 Lot 혼입', '라벨 바코드 자동 검증', 3, 5],
  [10, '110', '포장 상태 부적합', 'EN', '포장 환경', '포장 환경이 ESD/습도 기준을 유지', '포장실 습도(RH%)', '습도 초과에 의한 제품 산화', '포장실 온습도 관리(25±3℃, 40±10%RH)', 2, 3],
];

// ─────────────────────────────────────────
// 데이터 파생
// ─────────────────────────────────────────

// L3 (unique by pno|m4|we|fc) — one row per unique FC
function deriveL3() {
  const seen = new Set();
  const rows = [];
  for (const c of CHAINS) {
    const key = `${c[1]}|${c[3]}|${c[4]}|${c[7]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      processNo: c[1], m4: c[3], workElement: c[4],
      elementFunc: c[5], processChar: c[6], specialChar: '',
      failureCause: c[7], preventionCtrl: c[8],
    });
  }
  return rows;
}

// FC sheet rows (13-column format with PC, DC, SOD, AP)
function deriveFCRows() {
  return CHAINS.map(c => {
    const fe = FE[c[0]];
    const dc = DC_MAP.get(c[1] + '|' + c[2]) || '';
    const s = fe.s;
    const o = c[9];
    const d = c[10];
    return {
      feScope: fe.scope, fe: fe.text,
      processNo: c[1], fm: c[2],
      m4: c[3], we: c[4], fc: c[7],
      pc: c[8], dc,
      s, o, d, ap: calcAP(s, o, d),
    };
  });
}

// ─────────────────────────────────────────
// 시트 생성
// ─────────────────────────────────────────

function addL1Sheet(wb) {
  const ws = wb.addWorksheet('L1 통합(C1-C4)');
  ws.addRow(['구분(C1)', '제품기능(C2)', '요구사항(C3)', '고장영향(C4)']);
  ws.columns = [{ width: 10 }, { width: 50 }, { width: 45 }, { width: 50 }];
  for (const r of L1_DATA) ws.addRow(r);
  styleSheet(ws, L1_DATA.length, 4);
}

function addL2Sheet(wb) {
  const ws = wb.addWorksheet('L2 통합(A1-A6)');
  ws.addRow(['A1.공정번호', 'A2.공정명', 'A3.공정기능', 'A4.제품특성', '특별특성', 'A5.고장형태', 'A6.검출관리']);
  ws.columns = [{ width: 12 }, { width: 22 }, { width: 50 }, { width: 30 }, { width: 8 }, { width: 35 }, { width: 45 }];
  // sort by processNo
  const sorted = [...L2_DATA].sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
  for (const r of sorted) ws.addRow([r[0], PROC[r[0]], r[1], r[2], r[3], r[4], r[5]]);
  styleSheet(ws, sorted.length, 7);
}

function addL3Sheet(wb) {
  const ws = wb.addWorksheet('L3 통합(B1-B5)');
  ws.addRow(['공정번호', '4M', '작업요소(B1)', '요소기능(B2)', '공정특성(B3)', '특별특성', '고장원인(B4)', '예방관리(B5)']);
  ws.columns = [{ width: 12 }, { width: 6 }, { width: 22 }, { width: 50 }, { width: 30 }, { width: 8 }, { width: 40 }, { width: 45 }];
  const rows = deriveL3();
  const sorted = rows.sort((a, b) => parseInt(a.processNo) - parseInt(b.processNo));
  for (const r of sorted) {
    ws.addRow([r.processNo, r.m4, r.workElement, r.elementFunc, r.processChar, r.specialChar, r.failureCause, r.preventionCtrl]);
  }
  styleSheet(ws, sorted.length, 8);
}

function addFCSheet(wb) {
  const ws = wb.addWorksheet('FC 고장사슬');
  ws.addRow(['FE구분', 'FE(고장영향)', 'L2-1.공정번호', 'FM(고장형태)', '4M', 'WE(작업요소)', 'FC(고장원인)', 'B5.예방관리', 'A6.검출관리', 'S', 'O', 'D', 'AP']);
  ws.columns = [
    { width: 8 }, { width: 48 }, { width: 12 }, { width: 35 },
    { width: 6 }, { width: 22 }, { width: 40 },
    { width: 45 }, { width: 45 },
    { width: 5 }, { width: 5 }, { width: 5 }, { width: 5 },
  ];
  const rows = deriveFCRows();
  const sorted = rows.sort((a, b) => parseInt(a.processNo) - parseInt(b.processNo));
  for (const r of sorted) {
    ws.addRow([r.feScope, r.fe, r.processNo, r.fm, r.m4, r.we, r.fc, r.pc, r.dc, r.s, r.o, r.d, r.ap]);
  }
  styleSheet(ws, sorted.length, 13);
}

// ─────────────────────────────────────────
// 메인
// ─────────────────────────────────────────

async function main() {
  console.log('=== pfm26-p015-i15 Import Sample 생성 ===\n');

  // ─── 검증 ───
  const fmSet = new Set(CHAINS.map(c => c[1] + '|' + c[2]));
  const fcSet = new Set(CHAINS.map(c => c[1] + '|' + c[3] + '|' + c[4] + '|' + c[7]));
  const weSet = new Set(CHAINS.map(c => c[1] + '|' + c[3] + '|' + c[4]));
  const feSet = new Set(CHAINS.map(c => c[0]));
  const pnoSet = new Set(CHAINS.map(c => c[1]));

  console.log(`공정 수: ${pnoSet.size}`);
  console.log(`FM (고장형태): ${fmSet.size}`);
  console.log(`FC (고장원인, unique): ${fcSet.size}`);
  console.log(`FL (체인/FailureLink): ${CHAINS.length}`);
  console.log(`WE (작업요소): ${weSet.size}`);
  console.log(`FE (고장영향): ${feSet.size} (used of ${FE.length})`);
  console.log(`L1 rows: ${L1_DATA.length}`);
  console.log(`L2 rows: ${L2_DATA.length}`);

  // FC 시트 FE 텍스트가 L1 C4에 모두 존재하는지 검증
  const l1FEs = new Set(L1_DATA.map(r => r[3]));
  const chainFEs = new Set(CHAINS.map(c => FE[c[0]].text));
  const missingFEs = [...chainFEs].filter(fe => !l1FEs.has(fe));
  if (missingFEs.length > 0) {
    console.error(`\n❌ L1에 없는 FE: ${missingFEs.join(', ')}`);
    process.exit(1);
  }

  // L2의 FM이 체인에 모두 존재하는지 검증
  const chainFMs = new Set(CHAINS.map(c => c[1] + '|' + c[2]));
  const l2FMs = new Set(L2_DATA.map(r => r[0] + '|' + r[4]));
  const missingFMs = [...l2FMs].filter(fm => !chainFMs.has(fm));
  if (missingFMs.length > 0) {
    console.error(`\n❌ 체인에 없는 FM: ${missingFMs.join(', ')}`);
    process.exit(1);
  }

  // DC 누락 체크
  const missingDC = CHAINS.filter(c => !DC_MAP.has(c[1] + '|' + c[2]));
  if (missingDC.length > 0) {
    console.error(`\n❌ DC 없는 체인: ${missingDC.map(c => c[1] + '|' + c[2]).join(', ')}`);
    process.exit(1);
  }

  console.log('\n✅ 데이터 정합성 검증 통과\n');

  // ─── 엑셀 생성 ───
  const wb = new ExcelJS.Workbook();
  wb.creator = 'PFMEA Import Generator (pfm26-p015-i15)';
  wb.created = new Date();

  addL1Sheet(wb);
  addL2Sheet(wb);
  addL3Sheet(wb);
  addFCSheet(wb);

  // ─── 저장 경로 ───
  const docDir = 'C:/Users/Administrator/Documents/00_lbscts0330';
  if (!existsSync(docDir)) mkdirSync(docDir, { recursive: true });

  const primaryPath = join(docDir, 'pfm26-p015-i15_import_sample.xlsx');
  const samplePath = join(ROOT, 'public', 'downloads', 'aubump_import_sample.xlsx');

  await wb.xlsx.writeFile(primaryPath);
  console.log(`✅ 저장: ${primaryPath}`);

  await wb.xlsx.writeFile(samplePath);
  console.log(`✅ 샘플 다운로드 교체: ${samplePath}`);

  // ─── 최종 요약 ───
  console.log('\n=== 최종 요약 ===');
  console.log(`L1 통합(C1-C4): ${L1_DATA.length}행 (${new Set(L1_DATA.map(r => r[0])).size}구분, ${new Set(L1_DATA.map(r => r[3])).size} FE)`);
  console.log(`L2 통합(A1-A6): ${L2_DATA.length}행 (${pnoSet.size}공정, ${fmSet.size} FM)`);
  console.log(`L3 통합(B1-B5): ${fcSet.size}행 (${weSet.size} WE, ${fcSet.size} FC)`);
  console.log(`FC 고장사슬: ${CHAINS.length}행 (${CHAINS.length} FL = FailureLink)`);
  console.log(`\n기대 Import 결과:`);
  console.log(`  L2Structure: ${pnoSet.size}`);
  console.log(`  L3Structure (WE): ${weSet.size}`);
  console.log(`  FailureMode (FM): ${fmSet.size}`);
  console.log(`  FailureCause (FC): ${fcSet.size}`);
  console.log(`  FailureEffect (FE): ${chainFEs.size}`);
  console.log(`  FailureLink (FL): ${CHAINS.length}`);
  console.log(`  RiskAnalysis: ${CHAINS.length}`);
  console.log(`  DC NULL: 0`);
  console.log(`  PC NULL: 0`);
}

main().catch(e => {
  console.error('오류:', e);
  process.exit(1);
});
