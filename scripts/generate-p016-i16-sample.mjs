#!/usr/bin/env node
/**
 * @file generate-p016-i16-sample.mjs
 * @description pfm26-p016-i16 Import Sample Excel 생성 (4시트, FC 100% 연결)
 *
 * 제품: 8inch Wafer Bumping (Au Stud Bump) 공정
 * 구성: 10공정, 12FM, 50FC, 57FL(chains), 12FE
 *
 * N:1:N 체인 패턴 포함:
 *   - 동일 FC가 다른 FE에 연결 (dual-FE chains) = 7건
 *   - FL(57) > FC(50) — 파서 N:1:N 완벽 대응 검증
 *
 * 출력:
 *   1. C:/Users/Administrator/Documents/00_lbscts0330/pfm26-p016-i16_import_sample.xlsx
 *   2. public/downloads/aubump_import_sample.xlsx (샘플 다운로드 교체)
 */
import { createRequire } from 'module';
import { existsSync, mkdirSync } from 'fs';
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
// FE (고장영향) 정의 — 12개
// ============================
const FE = [
  /* 0  */ { scope: 'YP', text: 'Wafer 표면 오염으로 인한 Bump Adhesion 불량', s: 6 },
  /* 1  */ { scope: 'YP', text: 'UBM 두께 Spec Out으로 인한 전기적 접촉 저항 증가', s: 7 },
  /* 2  */ { scope: 'YP', text: 'Au Wire 접합 강도 부족으로 인한 Open 불량', s: 8 },
  /* 3  */ { scope: 'YP', text: 'Bump Height Spec Out으로 인한 Flip Chip 실장 불량', s: 7 },
  /* 4  */ { scope: 'YP', text: 'Bump Coplanarity 이상으로 인한 Non-Wet 불량', s: 8 },
  /* 5  */ { scope: 'SP', text: 'Ball Shear Force 부족으로 인한 Field 불량', s: 8 },
  /* 6  */ { scope: 'SP', text: 'Wafer Crack으로 인한 수율 저하', s: 7 },
  /* 7  */ { scope: 'SP', text: '외관 결함 유출로 인한 고객 Claim', s: 6 },
  /* 8  */ { scope: 'SP', text: 'Packing 부적합으로 인한 납품 Reject', s: 5 },
  /* 9  */ { scope: 'USER', text: '전기적 Open/Short로 인한 고객 라인 정지', s: 9 },
  /* 10 */ { scope: 'USER', text: 'Bump 탈락으로 인한 현장 고장', s: 9 },
  /* 11 */ { scope: 'YP', text: 'PR 패턴 불량으로 인한 UBM 패터닝 실패', s: 6 },
];

// ============================
// 공정 정의 (10개)
// ============================
const PROC = {
  '05': '수입검사(IQA)',
  '10': 'Wafer 세정',
  '20': 'UBM Sputter',
  '30': 'PR Coating & Patterning',
  '40': 'Au Wire Bonding',
  '50': 'Encapsulation',
  '60': 'Ball Attach',
  '70': 'Final Test',
  '80': 'Singulation',
  '90': 'Packing & Shipping',
};

// ============================
// L1 정의 (C1-C4) — 12행
// ============================
const L1_DATA = [
  ['YP', 'Wafer 표면 청정도가 Bump 접합 기준을 만족', '파티클 잔류 기준(≤10ea/wafer)', 'Wafer 표면 오염으로 인한 Bump Adhesion 불량'],
  ['YP', 'UBM(Ti/Ni/Au) 두께가 설계 규격을 만족', 'UBM 두께(Ti:100nm, Ni:500nm, Au:50nm ±10%)', 'UBM 두께 Spec Out으로 인한 전기적 접촉 저항 증가'],
  ['YP', 'Au Wire 접합 강도가 설계 기준을 만족', 'Wire Pull Force(≥3.0gf)', 'Au Wire 접합 강도 부족으로 인한 Open 불량'],
  ['YP', 'Bump Height가 고객 규격을 만족', 'Bump Height(70±5μm)', 'Bump Height Spec Out으로 인한 Flip Chip 실장 불량'],
  ['YP', 'Bump Coplanarity가 고객 규격을 만족', 'Coplanarity(≤15μm)', 'Bump Coplanarity 이상으로 인한 Non-Wet 불량'],
  ['YP', 'PR 패턴이 설계 치수를 만족', 'PR Opening 규격(50±3μm)', 'PR 패턴 불량으로 인한 UBM 패터닝 실패'],
  ['SP', 'Ball Shear Force가 고객 신뢰성 기준을 만족', 'Ball Shear(≥30gf)', 'Ball Shear Force 부족으로 인한 Field 불량'],
  ['SP', 'Wafer 구조적 건전성이 공정 기준을 만족', 'Wafer 강도 규격', 'Wafer Crack으로 인한 수율 저하'],
  ['SP', '외관이 출하 기준을 만족', '외관 검사 기준(Scratch/Chip/Crack)', '외관 결함 유출로 인한 고객 Claim'],
  ['SP', 'Packing 상태가 고객 기준을 만족', 'ESD/습도 보호 기준', 'Packing 부적합으로 인한 납품 Reject'],
  ['USER', '제품의 전기적 신뢰성 확보', '전기적 특성(Continuity/Isolation)', '전기적 Open/Short로 인한 고객 라인 정지'],
  ['USER', 'Bump 기계적 신뢰성 확보', '기계적 강도(TCT 1000cy)', 'Bump 탈락으로 인한 현장 고장'],
];

// ============================
// L2 (FM) 정의 — 12행
// ============================
const L2_DATA = [
  ['05', 'Wafer 외관/치수를 검사하여 규격 적합 판정', 'Wafer TTV', '◇', 'Wafer TTV/Bow 이상', 'TTV 전수 측정 및 SPC 관리'],
  ['10', 'Wafer Particle 및 유기물을 세정하여 표면 청정도 확보', '표면 청정도(파티클 수)', '', 'Wafer 세정 불량', 'Particle Counter 측정 및 SPC 관리'],
  ['20', 'UBM(Ti/Ni/Au) 박막을 균일하게 증착', 'UBM 두께(Ti/Ni/Au)', '★', 'UBM 두께 이상(과후/과박)', 'UBM 두께 In-line 측정'],
  ['20', 'UBM 막질 균일도를 확보하여 접합 보장', 'UBM Sheet Resistance', '★', 'UBM 막질 균일도 이상', 'Sheet Resistance 4-probe 측정'],
  ['30', 'PR 패턴을 형성하여 UBM 영역 정의', 'PR Opening Size', '★', 'PR 패턴 불량(미개구/잔사)', 'PR Opening SPC 측정'],
  ['40', 'Au Wire를 Pad에 접합하여 Bump 형성', 'Wire Pull Force(gf)', '★', 'Au Wire 접합 불량', 'Wire Pull Test 및 SPC 관리'],
  ['50', 'Bump 주변을 보호재로 Encap하여 신뢰성 확보', 'Encap 높이', '', 'Encap 불량(기포/미충전)', 'Encap X-Ray 검사'],
  ['60', 'Solder Ball을 Bump 위에 접합', 'Ball Shear Force(gf)', '', 'Ball Attach 불량(Missing/Tilt)', 'Ball Shear Test SPC 관리'],
  ['70', '전기적 특성 및 외관을 최종 검사', '외관 결함 수', '◇', 'Final Test 미검출', '전기 Test 100% + AOI'],
  ['70', 'Bump 기계적 강도를 검증', 'Ball Shear Force(gf)', '◇', 'Shear Test Fail', 'Ball Shear 샘플 검사'],
  ['80', 'Dicing으로 개별 Die를 분리', 'Dicing 품질(Chipping)', '', 'Dicing 칩핑/크랙', 'Dicing 후 외관 검사'],
  ['90', '출하 기준에 맞게 포장하여 제품 보호', '포장 상태(ESD/습도)', '◇', '포장 상태 부적합', '포장 상태 최종 확인'],
];

// DC lookup: (processNo|fm) → dc
const DC_MAP = new Map();
for (const r of L2_DATA) DC_MAP.set(r[0] + '|' + r[4], r[5]);

// ============================
// 체인 정의 (62행) — FC 시트 + L3 파생
// [feIdx, pno, fm, m4, we, b2(elemFunc), b3(procChar), fc(B4), pc(B5), o, d]
//
// N:1:N dual-FE chains (7건):
//   Process 20: Sputter Power → FE1 + FE9  (전기접촉 + 고객라인정지)
//   Process 30: Develop 장비 → FE11 + FE4  (PR패턴 + Coplanarity)
//   Process 40: Capillary → FE2 + FE10     (접합강도 + Bump탈락)
//   Process 50: Dispenser → FE3 + FE5      (Height + Shear)
//   Process 60: Placement → FE4 + FE10     (Coplanarity + Bump탈락)
//   Process 70: Tester → FE9 + FE7         (고객라인정지 + 외관Claim)
//   Process 80: Dicing Saw → FE6 + FE9     (Crack + 고객라인정지)
// ============================
const CHAINS = [
  // ─── Process 05: IQA — FM: Wafer TTV/Bow 이상 — 4 FC, 4 chains ───
  [1, '05', 'Wafer TTV/Bow 이상', 'MC', '검사 장비', '검사 장비가 Wafer TTV를 정밀 측정', 'TTV 측정 정밀도(μm)', '측정 장비 교정 불량에 의한 TTV 오판정', '장비 정기 교정(월 1회)', 3, 4],
  [1, '05', 'Wafer TTV/Bow 이상', 'IM', '수입 Wafer', '수입 Wafer가 TTV 규격을 만족', 'Wafer TTV 규격(μm)', '공급사 Wafer TTV 편차 과대', '공급사 SPC 데이터 확인', 4, 4],
  [9, '05', 'Wafer TTV/Bow 이상', 'MN', '검사 작업자', '작업자가 검사 절차를 준수', '검사 절차 준수율(%)', '검사 기준 미숙지에 의한 오판정', '작업자 교육(분기 1회)', 3, 5],
  [1, '05', 'Wafer TTV/Bow 이상', 'EN', '검사 환경', '검사 환경이 측정 정밀도를 보장', '검사실 온습도(℃/RH%)', '온도 변동에 의한 측정값 편차', '항온항습 환경 유지(23±2℃)', 2, 3],

  // ─── Process 10: Wafer 세정 — FM: Wafer 세정 불량 — 4 FC, 4 chains ───
  [0, '10', 'Wafer 세정 불량', 'MC', '세정 장비', '세정 장비가 Wafer 표면 오염을 제거', 'Spray Pressure(kgf/cm²)', '세정 노즐 막힘에 의한 세정 불량', '노즐 정기 점검 및 교체', 3, 4],
  [0, '10', 'Wafer 세정 불량', 'IM', 'DI Water', 'DI Water가 세정 기준 순도를 만족', 'DI Water 저항율(MΩ·cm)', 'DI Water 오염에 의한 2차 오염', 'DI Water 저항율 실시간 모니터링', 2, 3],
  [0, '10', 'Wafer 세정 불량', 'MN', '세정 작업자', '작업자가 세정 레시피를 정확히 설정', '레시피 설정 정확도', '세정 시간/온도 설정 오류', '레시피 변경 승인 절차', 3, 5],
  [0, '10', 'Wafer 세정 불량', 'EN', 'Clean Room', 'Clean Room이 Class 기준을 유지', 'Clean Room Class', '외부 Particle 유입에 의한 오염', 'Clean Room 환경 모니터링', 2, 3],

  // ─── Process 20: UBM Sputter ───
  // FM1: UBM 두께 이상 — 5 FC, 6 chains (Sputter Power → FE1+FE9 dual)
  [1, '20', 'UBM 두께 이상(과후/과박)', 'MC', 'Sputter 챔버', 'Sputter 챔버가 UBM을 균일하게 증착', 'Target-Substrate 간격(mm)', '챔버 내 Erosion 불균일에 의한 막 두께 편차', 'Target 수명 관리 및 교체 주기 설정', 3, 3],
  [1, '20', 'UBM 두께 이상(과후/과박)', 'MC', 'Sputter Power', 'Sputter Power가 설계 증착률을 제공', 'DC Power 안정도(W)', 'Power 공급 불안정에 의한 증착률 변동', 'Power Supply 정기 점검', 3, 3],
  [9, '20', 'UBM 두께 이상(과후/과박)', 'MC', 'Sputter Power', 'Sputter Power가 설계 증착률을 제공', 'DC Power 안정도(W)', 'Power 공급 불안정에 의한 증착률 변동', 'Power Supply 정기 점검', 3, 4],
  [1, '20', 'UBM 두께 이상(과후/과박)', 'IM', 'UBM Target(Ti/Ni/Au)', 'Target이 규격 순도를 만족', 'Target 순도(%)', 'Target 소모에 의한 증착 속도 변화', 'Target 수명(kWh) 관리', 3, 3],
  [1, '20', 'UBM 두께 이상(과후/과박)', 'EN', '챔버 진공', '챔버 진공도가 공정 기준을 만족', '진공도(mTorr)', '진공 Leak에 의한 막질 이상', '진공도 실시간 모니터링', 2, 3],
  [1, '20', 'UBM 두께 이상(과후/과박)', 'MN', 'Sputter 작업자', '작업자가 Sputter 레시피를 정확히 설정', 'Ar Gas 유량(sccm)', 'Ar Gas 유량 설정 오류에 의한 증착 불균일', '레시피 승인 절차 및 작업 표준서', 3, 4],

  // FM2: UBM 막질 균일도 이상 — 4 FC, 4 chains
  [1, '20', 'UBM 막질 균일도 이상', 'MC', 'Magnetron', 'Magnetron이 플라즈마를 균일하게 생성', 'Magnetron 회전 속도(rpm)', 'Magnetron 불균일에 의한 Rs 편차', 'Magnetron 정기 점검', 3, 4],
  [1, '20', 'UBM 막질 균일도 이상', 'MC', '기판 Heater', 'Heater가 기판 온도를 균일하게 유지', '기판 온도(℃)', 'Heater 불균일에 의한 막질 변동', 'Heater 정기 교정', 3, 3],
  [9, '20', 'UBM 막질 균일도 이상', 'IM', 'Ar Gas', 'Ar Gas가 규격 순도를 만족', 'Ar 순도(99.999%)', 'Ar 불순물에 의한 막질 오염', 'Gas 분석 인증서 확인', 2, 3],
  [1, '20', 'UBM 막질 균일도 이상', 'EN', '챔버 온도', '챔버 온도가 공정 기준을 유지', '챔버 벽면 온도(℃)', '챔버 온도 변동에 의한 막질 불안정', '챔버 온도 실시간 모니터링', 2, 3],

  // ─── Process 30: PR Coating & Patterning — FM: PR 패턴 불량 — 5 FC, 6 chains (Develop 장비 → FE11+FE4 dual) ───
  [11, '30', 'PR 패턴 불량(미개구/잔사)', 'MC', 'Coater', 'Coater가 PR을 균일하게 도포', 'Spin Speed(rpm)', 'Coater 회전 속도 편차에 의한 PR 두께 불균일', 'Spin Speed SPC 모니터링', 3, 3],
  [11, '30', 'PR 패턴 불량(미개구/잔사)', 'MC', 'Develop 장비', 'Developer가 노광부 PR을 균일하게 제거', 'Develop Time(sec)', 'Develop 장비 노즐 막힘에 의한 현상 불균일', 'Developer 노즐 정기 세정', 3, 4],
  [4, '30', 'PR 패턴 불량(미개구/잔사)', 'MC', 'Develop 장비', 'Developer가 노광부 PR을 균일하게 제거', 'Develop Time(sec)', 'Develop 장비 노즐 막힘에 의한 현상 불균일', 'Developer 노즐 정기 세정', 3, 4],
  [11, '30', 'PR 패턴 불량(미개구/잔사)', 'IM', 'PR 용액', 'PR 용액이 점도 규격을 만족', 'PR 점도(cP)', 'PR 점도 변동에 의한 코팅 불균일', 'PR 점도 입고 검사 및 사용기한 관리', 3, 4],
  [11, '30', 'PR 패턴 불량(미개구/잔사)', 'MN', 'Exposure 작업자', '작업자가 노광 조건을 정확히 설정', '노광량(mJ/cm²)', '노광 조건 설정 오류에 의한 패턴 불량', '작업자 교육 및 조건 변경 승인 절차', 3, 5],
  [11, '30', 'PR 패턴 불량(미개구/잔사)', 'EN', 'Yellow Room', 'Yellow Room이 조도 기준을 유지', 'Yellow Light 파장(nm)', '외부 자외선 유입에 의한 PR 감광', 'Yellow Room 조도 정기 측정', 2, 3],

  // ─── Process 40: Au Wire Bonding — FM: Au Wire 접합 불량 — 5 FC, 6 chains (Capillary → FE2+FE10 dual) ───
  [2, '40', 'Au Wire 접합 불량', 'MC', 'Bonder', 'Bonder가 Au Wire를 Pad에 정밀 접합', 'Bonding Force(gf)', 'Bonder 진동에 의한 접합 위치 편차', 'Bonder 정기 점검 및 교정', 3, 3],
  [2, '40', 'Au Wire 접합 불량', 'MC', 'Capillary', 'Capillary가 Wire를 가이드하여 정밀 접합', 'Capillary 마모량(μm)', 'Capillary 마모에 의한 Wire 변형', 'Capillary 교체 주기 관리(5K bonding)', 3, 3],
  [10, '40', 'Au Wire 접합 불량', 'MC', 'Capillary', 'Capillary가 Wire를 가이드하여 정밀 접합', 'Capillary 마모량(μm)', 'Capillary 마모에 의한 Wire 변형', 'Capillary 교체 주기 관리(5K bonding)', 3, 4],
  [2, '40', 'Au Wire 접합 불량', 'IM', 'Au Wire', 'Au Wire가 직경/순도 규격을 만족', 'Wire 직경(μm)', 'Wire 직경 편차에 의한 Bump Height 불균일', 'Wire 입고 검사(직경/인장력)', 2, 3],
  [2, '40', 'Au Wire 접합 불량', 'MN', 'Bonding 작업자', '작업자가 Bonding 프로그램을 정확히 설정', 'Loop Height(μm)', 'Bonding 프로그램 설정 오류', '프로그램 검증 절차', 3, 5],
  [2, '40', 'Au Wire 접합 불량', 'EN', 'Bonding Room', 'Bonding Room이 온습도/ESD 기준을 유지', 'ESD 전위(V)', 'ESD에 의한 Wire 접합 불량', 'ESD 모니터링 및 접지 관리', 2, 3],

  // ─── Process 50: Encapsulation — FM: Encap 불량 — 4 FC, 5 chains (Dispenser → FE3+FE5 dual) ───
  [3, '50', 'Encap 불량(기포/미충전)', 'MC', 'Dispenser', 'Dispenser가 Underfill을 균일하게 충전', '토출량(mg)', 'Dispenser 노즐 막힘에 의한 미충전', 'Dispenser 토출량 정기 확인', 3, 3],
  [5, '50', 'Encap 불량(기포/미충전)', 'MC', 'Dispenser', 'Dispenser가 Underfill을 균일하게 충전', '토출량(mg)', 'Dispenser 노즐 막힘에 의한 미충전', 'Dispenser 토출량 정기 확인', 3, 4],
  [3, '50', 'Encap 불량(기포/미충전)', 'IM', 'Underfill 재료', 'Underfill이 점도/Tg 규격을 만족', '점도(cP)', 'Underfill 열화에 의한 기포 발생', 'Underfill 사용기한 관리', 3, 4],
  [3, '50', 'Encap 불량(기포/미충전)', 'MN', 'Encap 작업자', '작업자가 Encap 조건을 정확히 설정', 'Cure 온도(℃)', 'Cure 조건 설정 오류에 의한 경화 불량', '작업 표준서 준수', 3, 5],
  [3, '50', 'Encap 불량(기포/미충전)', 'EN', 'Encap Room', 'Encap Room이 온도 기준을 유지', 'Room 온도(℃)', '환경 온도 변동에 의한 점도 변화', '온도 관리(25±2℃)', 2, 3],

  // ─── Process 60: Ball Attach — FM: Ball Attach 불량 — 5 FC, 6 chains (Placement → FE4+FE10 dual) ───
  [4, '60', 'Ball Attach 불량(Missing/Tilt)', 'MC', 'Placement 장비', 'Placement가 Ball을 정위치에 배치', 'Placement 정밀도(μm)', 'Placement Head 마모에 의한 Ball 위치 편차', 'Placement Head 정기 교체', 3, 3],
  [10, '60', 'Ball Attach 불량(Missing/Tilt)', 'MC', 'Placement 장비', 'Placement가 Ball을 정위치에 배치', 'Placement 정밀도(μm)', 'Placement Head 마모에 의한 Ball 위치 편차', 'Placement Head 정기 교체', 3, 4],
  [4, '60', 'Ball Attach 불량(Missing/Tilt)', 'MC', 'Reflow Oven', 'Reflow Oven이 접합 온도 프로파일을 유지', 'Peak 온도(℃)', 'Oven 온도 편차에 의한 Ball Tilt', 'Reflow 프로파일 정기 측정(KIC)', 3, 3],
  [4, '60', 'Ball Attach 불량(Missing/Tilt)', 'IM', 'Solder Ball', 'Solder Ball이 직경/합금 규격을 만족', 'Ball 직경(μm)', 'Ball 크기 편차에 의한 Coplanarity 불량', 'Ball 입고 검사(직경/합금)', 2, 3],
  [4, '60', 'Ball Attach 불량(Missing/Tilt)', 'MN', 'Attach 작업자', '작업자가 Attach 프로그램을 정확히 설정', 'Flux 도포량(mg)', 'Flux 도포 과다/부족에 의한 Ball 미접합', 'Flux 도포량 정기 확인', 3, 5],
  [4, '60', 'Ball Attach 불량(Missing/Tilt)', 'EN', 'Attach Room', 'Attach Room이 정전기 기준을 유지', 'ESD 전위(V)', 'ESD에 의한 Ball 이탈', 'ESD 모니터링 및 접지 관리', 2, 3],

  // ─── Process 70: Final Test ───
  // FM1: Final Test 미검출 — 3 FC, 4 chains (Tester → FE9+FE7 dual)
  [9, '70', 'Final Test 미검출', 'MC', 'Tester', 'Tester가 Open/Short를 정확히 검출', 'Test Coverage(%)', 'Tester Probe 마모에 의한 접촉 불량', 'Tester Probe 정기 교체', 3, 3],
  [7, '70', 'Final Test 미검출', 'MC', 'Tester', 'Tester가 Open/Short를 정확히 검출', 'Test Coverage(%)', 'Tester Probe 마모에 의한 접촉 불량', 'Tester Probe 정기 교체', 3, 4],
  [9, '70', 'Final Test 미검출', 'MN', 'Test 작업자', '작업자가 Test 프로그램을 정확히 설정', 'Test Limit 설정', 'Test Limit 설정 오류에 의한 불량 Pass', 'Test 프로그램 검증 및 승인 절차', 3, 5],
  [9, '70', 'Final Test 미검출', 'EN', 'Test Room', 'Test Room이 ESD/온도 기준을 유지', 'Test Room 온도(℃)', 'ESD에 의한 테스트 오류', 'ESD 모니터링 및 온도 관리', 2, 3],

  // FM2: Shear Test Fail — 3 FC, 3 chains
  [5, '70', 'Shear Test Fail', 'MC', 'Shear Tester', 'Shear Tester가 Ball Shear Force를 정확히 측정', 'Shear Force 정밀도(gf)', 'Tester 로드셀 열화에 의한 측정 오차', 'Shear Tester 정기 교정', 3, 3],
  [5, '70', 'Shear Test Fail', 'MN', 'Test 작업자(Shear)', '작업자가 Shear Test 조건을 정확히 설정', 'Shear Speed(μm/s)', 'Shear 속도 설정 오류에 의한 측정값 편차', '작업 표준서 준수', 3, 5],
  [5, '70', 'Shear Test Fail', 'EN', 'Test 환경', 'Test 환경이 온도/진동 기준을 유지', '환경 온도(℃)', '온도 변동에 의한 Shear Force 편차', '항온 환경 유지(23±2℃)', 2, 3],

  // ─── Process 80: Singulation — FM: Dicing 칩핑/크랙 — 4 FC, 5 chains (Dicing Saw → FE6+FE9 dual) ───
  [6, '80', 'Dicing 칩핑/크랙', 'MC', 'Dicing Saw', 'Dicing Saw가 Die를 정밀 절단', 'Blade 마모량(μm)', 'Blade 마모에 의한 절단면 칩핑', 'Blade 사용 횟수 관리 및 교체', 3, 3],
  [9, '80', 'Dicing 칩핑/크랙', 'MC', 'Dicing Saw', 'Dicing Saw가 Die를 정밀 절단', 'Blade 마모량(μm)', 'Blade 마모에 의한 절단면 칩핑', 'Blade 사용 횟수 관리 및 교체', 3, 4],
  [6, '80', 'Dicing 칩핑/크랙', 'IM', 'Dicing Tape', 'Dicing Tape가 Wafer를 안정적으로 고정', 'Tape 접착력(gf/25mm)', 'Tape 접착력 부족에 의한 Die 이동', 'Dicing Tape 접착력 입고 검사', 3, 4],
  [6, '80', 'Dicing 칩핑/크랙', 'MN', 'Dicing 작업자', '작업자가 Dicing 조건을 정확히 설정', 'Blade 회전속도(rpm)', 'Dicing 속도 설정 오류에 의한 크랙 발생', '작업 표준서 및 조건 변경 승인', 3, 5],
  [6, '80', 'Dicing 칩핑/크랙', 'EN', 'Dicing Room', 'Dicing Room이 온도 기준을 유지', 'DI Water 유량(L/min)', '냉각수 부족에 의한 열 크랙', 'DI Water 유량 모니터링', 2, 3],

  // ─── Process 90: Packing & Shipping — FM: 포장 상태 부적합 — 4 FC, 4 chains ───
  [8, '90', '포장 상태 부적합', 'MC', '포장 장비', '포장 장비가 Tray에 제품을 안전하게 수납', 'Tray 치수 정밀도(mm)', '포장 장비 설정 오류에 의한 제품 손상', '포장 장비 정기 점검', 3, 4],
  [8, '90', '포장 상태 부적합', 'IM', '포장재(Tray/Tape)', '포장재가 ESD/습도 보호 규격을 만족', 'ESD 보호 수준(V)', '포장재 불량에 의한 ESD 손상', '포장재 입고 검사(ESD 측정)', 2, 3],
  [8, '90', '포장 상태 부적합', 'MN', '포장 작업자', '작업자가 포장 기준을 정확히 준수', '라벨 부착 정확도', '라벨 부착 오류에 의한 Lot 혼입', '라벨 바코드 자동 검증', 3, 5],
  [8, '90', '포장 상태 부적합', 'EN', '포장 환경', '포장 환경이 ESD/습도 기준을 유지', '포장실 습도(RH%)', '습도 초과에 의한 제품 산화', '포장실 온습도 관리(25±3℃, 40±10%RH)', 2, 3],
];

// ─────────────────────────────────────────
// 데이터 파생
// ─────────────────────────────────────────

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
  console.log('=== pfm26-p016-i16 Import Sample 생성 ===\n');

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

  // 검증: FC시트 FE가 L1 C4에 모두 존재하는지
  const l1FEs = new Set(L1_DATA.map(r => r[3]));
  const chainFEs = new Set(CHAINS.map(c => FE[c[0]].text));
  const missingFEs = [...chainFEs].filter(fe => !l1FEs.has(fe));
  if (missingFEs.length > 0) {
    console.error(`\n❌ L1에 없는 FE: ${missingFEs.join(', ')}`);
    process.exit(1);
  }

  // 검증: L2의 FM이 체인에 모두 존재하는지
  const chainFMs = new Set(CHAINS.map(c => c[1] + '|' + c[2]));
  const l2FMs = new Set(L2_DATA.map(r => r[0] + '|' + r[4]));
  const missingFMs = [...l2FMs].filter(fm => !chainFMs.has(fm));
  if (missingFMs.length > 0) {
    console.error(`\n❌ 체인에 없는 FM: ${missingFMs.join(', ')}`);
    process.exit(1);
  }

  // 검증: DC 누락
  const missingDC = CHAINS.filter(c => !DC_MAP.has(c[1] + '|' + c[2]));
  if (missingDC.length > 0) {
    console.error(`\n❌ DC 없는 체인: ${missingDC.map(c => c[1] + '|' + c[2]).join(', ')}`);
    process.exit(1);
  }

  console.log('\n✅ 데이터 정합성 검증 통과\n');

  const wb = new ExcelJS.Workbook();
  wb.creator = 'PFMEA Import Generator (pfm26-p016-i16)';
  wb.created = new Date();

  addL1Sheet(wb);
  addL2Sheet(wb);
  addL3Sheet(wb);
  addFCSheet(wb);

  // 저장 경로
  const docDir = 'C:/Users/Administrator/Documents/00_lbscts0330';
  if (!existsSync(docDir)) mkdirSync(docDir, { recursive: true });

  const primaryPath = join(docDir, 'pfm26-p016-i16_import_sample.xlsx');
  const samplePath = join(ROOT, 'public', 'downloads', 'aubump_import_sample.xlsx');

  await wb.xlsx.writeFile(primaryPath);
  console.log(`✅ 저장: ${primaryPath}`);

  await wb.xlsx.writeFile(samplePath);
  console.log(`✅ 샘플 다운로드 교체: ${samplePath}`);

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
