/**
 * @file accuracy-sample-zero-warnings.test.ts
 * @description 샘플 템플릿 SAMPLE_DATA → accuracy-validation 경고 0건 검증
 *
 * import_data_작성_오류_v2.md 규칙 전체 적용 확인
 * - A6 3요소 (장비+방법+빈도) 형식 검증
 * - B5↔A6 교차 혼입 방지
 * - B4 명사형 원인 검증
 * - B1 설비/재료/인원 고유명칭 검증
 *
 * @created 2026-03-14
 */

import { describe, it, expect } from 'vitest';
import {
  validateAccuracy,
  validateFCAccuracy,
  summarizeAccuracyWarnings,
} from '../../app/(fmea-core)/pfmea/import/utils/accuracy-validation';
import type { ImportedFlatData } from '../../app/(fmea-core)/pfmea/import/types';
import type { MasterFailureChain } from '../../app/(fmea-core)/pfmea/import/types/masterFailureChain';

/**
 * excel-template.ts SAMPLE_DATA에서 flatData + failureChains를 재구성
 * (직접 import하면 ExcelJS 의존성 문제가 생기므로 데이터만 인라인)
 */

// ── L3 통합(B1-B5) 샘플에서 B4 추출 ──
const B4_SAMPLES: Array<{ processNo: string; value: string }> = [
  { processNo: '01', value: '설비 가동률 저하' },
  { processNo: '01', value: '작업 숙련도 부족' },
  { processNo: '01', value: '자재 품질 부적합' },
  { processNo: '01', value: '온습도 제어 이탈' },
  { processNo: '01', value: '풍속 저하' },
  { processNo: '10', value: '측정 오차' },
  { processNo: '10', value: '판정 기준 오적용' },
  { processNo: '10', value: '자재 품질 부적합' },
  { processNo: '10', value: '환경 조건 이탈' },
  { processNo: '20', value: '정렬 센서 오작동' },
  { processNo: '20', value: '작업 숙련도 부족' },
  { processNo: '20', value: '자재 품질 부적합' },
  { processNo: '20', value: '환경 조건 이탈' },
  { processNo: '30', value: '노즐 막힘' },
  { processNo: '30', value: '작업 숙련도 부족' },
  { processNo: '30', value: 'DI Water 비저항 저하' },
  { processNo: '30', value: '환경 조건 이탈' },
  { processNo: '40', value: 'Power 변동' },
  { processNo: '40', value: '전압 변동' },
  { processNo: '40', value: '작업 숙련도 부족' },
  { processNo: '40', value: 'Target 소진' },
  { processNo: '40', value: 'Target 소진' },
  { processNo: '40', value: '진공 누설' },
  // ── 50 Scrubber2 ──
  { processNo: '50', value: '노즐 막힘' },
  { processNo: '50', value: '작업 숙련도 부족' },
  { processNo: '50', value: 'DI Water 비저항 저하' },
  { processNo: '50', value: '환경 조건 이탈' },
  // ── 60 PR Coating ──
  { processNo: '60', value: 'RPM 편차' },
  { processNo: '60', value: '작업 숙련도 부족' },
  { processNo: '60', value: 'PR 열화' },
  { processNo: '60', value: '환경 조건 이탈' },
  // ── 70 Exposure ──
  { processNo: '70', value: '에너지 편차' },
  { processNo: '70', value: '작업 숙련도 부족' },
  { processNo: '70', value: 'Mask 결함' },
  { processNo: '70', value: '환경 조건 이탈' },
  // ── 80 Develop ──
  { processNo: '80', value: '현상 시간 편차' },
  { processNo: '80', value: '작업 숙련도 부족' },
  { processNo: '80', value: '농도 편차' },
  { processNo: '80', value: '환경 조건 이탈' },
  { processNo: '90', value: 'Power 불안정' },
  { processNo: '90', value: '작업 숙련도 부족' },
  { processNo: '90', value: '자재 품질 부적합' },
  { processNo: '90', value: '환경 조건 이탈' },
  { processNo: '100', value: '전류밀도 편차' },
  { processNo: '100', value: '전류 변동' },
  { processNo: '100', value: '작업 숙련도 부족' },
  { processNo: '100', value: '농도 저하' },
  { processNo: '100', value: '환경 조건 이탈' },
  { processNo: '110', value: '온도 편차' },
  { processNo: '110', value: '작업 숙련도 부족' },
  { processNo: '110', value: '자재 품질 부적합' },
  { processNo: '110', value: '환경 조건 이탈' },
  { processNo: '120', value: '에칭 시간 편차' },
  { processNo: '120', value: '작업 숙련도 부족' },
  { processNo: '120', value: '자재 품질 부적합' },
  { processNo: '120', value: '환경 조건 이탈' },
  { processNo: '130', value: '온도 편차' },
  { processNo: '130', value: '작업 숙련도 부족' },
  { processNo: '130', value: '자재 품질 부적합' },
  { processNo: '130', value: '환경 조건 이탈' },
  { processNo: '140', value: '온도 과다/부족' },
  { processNo: '140', value: '작업 숙련도 부족' },
  { processNo: '140', value: '자재 품질 부적합' },
  { processNo: '140', value: '유량 부족' },
  { processNo: '150', value: '해상도 저하' },
  { processNo: '150', value: '측정 오차' },
  { processNo: '150', value: '판정 기준 오적용' },
  { processNo: '150', value: '자재 품질 부적합' },
  { processNo: '150', value: '환경 조건 이탈' },
  { processNo: '160', value: '노즐 막힘' },
  { processNo: '160', value: '작업 숙련도 부족' },
  { processNo: '160', value: '자재 품질 부적합' },
  { processNo: '160', value: '환경 조건 이탈' },
  { processNo: '170', value: '노즐 막힘' },
  { processNo: '170', value: '작업 숙련도 부족' },
  { processNo: '170', value: '자재 품질 부적합' },
  { processNo: '170', value: '환경 조건 이탈' },
  { processNo: '180', value: '정렬 센서 오작동' },
  { processNo: '180', value: '작업 숙련도 부족' },
  { processNo: '180', value: '자재 품질 부적합' },
  { processNo: '180', value: '환경 조건 이탈' },
  { processNo: '190', value: '해상도 저하' },
  { processNo: '190', value: '작업 숙련도 부족' },
  { processNo: '190', value: '자재 품질 부적합' },
  { processNo: '190', value: '환경 조건 이탈' },
  { processNo: '200', value: '진공 누설' },
  { processNo: '200', value: '체크리스트 누락' },
  { processNo: '200', value: '자재 품질 부적합' },
  { processNo: '200', value: '환경 조건 이탈' },
];

// ── B1 작업요소 샘플 ──
const B1_SAMPLES: Array<{ processNo: string; value: string }> = [
  { processNo: '01', value: '항온항습기' },
  { processNo: '01', value: '클린룸 담당자' },
  { processNo: '01', value: '필터 소모품' },
  { processNo: '01', value: '클린룸' },
  { processNo: '01', value: 'FFU' },
  { processNo: '10', value: '두께 측정기' },
  { processNo: '10', value: '검사원' },
  { processNo: '10', value: 'Wafer' },
  { processNo: '40', value: 'Sputter 장비' },
  { processNo: '40', value: 'DC Power Supply' },
  { processNo: '40', value: 'Sputter 작업자' },
  { processNo: '40', value: 'Ti Target' },
  { processNo: '40', value: 'Cu Target' },
  { processNo: '40', value: '진공 챔버' },
  { processNo: '100', value: 'Au Plating Tank' },
  { processNo: '100', value: '정류기(Rectifier)' },
  { processNo: '100', value: 'Au 도금액' },
  { processNo: '150', value: 'AVI 장비' },
  { processNo: '150', value: '높이 측정기' },
  { processNo: '150', value: '검사원' },
  { processNo: '200', value: '포장 장비' },
  { processNo: '200', value: '포장 작업자' },
  { processNo: '200', value: '포장재' },
];

// ── FC 고장사슬 (v5.9: 장비+방법+빈도 3요소 DC) ──
const FC_CHAINS: MasterFailureChain[] = [
  { id: 'fc-1', processNo: '01', feScope: 'YP', feValue: 'Particle 오염', fmValue: '파티클 초과', fcValue: '풍속 저하', m4: 'EN', workElement: 'FFU', pcValue: 'FFU 풍속 정기점검', dcValue: '파티클 카운터 실시간 모니터링, 매lot 전수', occurrence: 4, detection: 3, ap: 'M' },
  { id: 'fc-2', processNo: '10', feScope: 'YP', feValue: '후공정 유출', fmValue: '두께 규격 이탈', fcValue: '측정 오차', m4: 'MC', workElement: '두께 측정기', pcValue: '측정기 정기 교정(MSA)', dcValue: 'Wafer 두께 측정기 전수검사, 매lot', occurrence: 3, detection: 3, ap: 'L' },
  { id: 'fc-3', processNo: '10', feScope: 'YP', feValue: '후공정 유출', fmValue: 'TTV 규격 초과', fcValue: '자재 품질 부적합', m4: 'IM', workElement: 'Wafer', pcValue: 'IQC COA 규격 관리, 입고 기준 강화', dcValue: 'Wafer 두께 측정기 전수검사, 매lot', occurrence: 3, detection: 3, ap: 'L' },
  { id: 'fc-4', processNo: '20', feScope: 'YP', feValue: 'Lot 혼입', fmValue: '정렬 불량', fcValue: '정렬 센서 오작동', m4: 'MC', workElement: 'Sorter 장비', pcValue: 'Sorter 일상점검, 센서 교정', dcValue: '비전 센서 정렬 전수 확인', occurrence: 3, detection: 3, ap: 'L' },
  { id: 'fc-5', processNo: '30', feScope: 'YP', feValue: 'Particle 오염', fmValue: '세정 불량', fcValue: '노즐 막힘', m4: 'MC', workElement: 'Scrubber 장비', pcValue: 'Scrubber PM(예방보전)', dcValue: 'KLA 파티클 카운터 전수검사', occurrence: 3, detection: 3, ap: 'L' },
  { id: 'fc-6', processNo: '30', feScope: 'YP', feValue: 'Particle 오염', fmValue: '세정 불량', fcValue: 'DI Water 비저항 저하', m4: 'IM', workElement: 'DI Water', pcValue: 'DI Water 비저항 실시간 모니터링', dcValue: 'KLA 파티클 카운터 전수검사', occurrence: 3, detection: 3, ap: 'L' },
  { id: 'fc-7', processNo: '40', feScope: 'YP', feValue: '전기적 Open/Short', fmValue: 'UBM 두께 부족', fcValue: 'Power 변동', m4: 'MC', workElement: 'Sputter 장비', pcValue: 'Sputter 장비 PM, Power 실시간 모니터링', dcValue: 'SEM 전수검사, 4-Point Probe 매lot 측정', occurrence: 3, detection: 4, ap: 'M' },
  { id: 'fc-8', processNo: '40', feScope: 'YP', feValue: '전기적 Open/Short', fmValue: 'UBM 두께 부족', fcValue: '전압 변동', m4: 'MC', workElement: 'DC Power Supply', pcValue: '정기 교정, UPS 운용', dcValue: 'SEM 전수검사, 4-Point Probe 매lot 측정', occurrence: 3, detection: 4, ap: 'M' },
  { id: 'fc-9', processNo: '40', feScope: 'YP', feValue: 'Bump Lift-off', fmValue: 'UBM 두께 부족', fcValue: '진공 누설', m4: 'EN', workElement: '진공 챔버', pcValue: '진공도 실시간 모니터링, Leak 점검', dcValue: 'SEM 전수검사, 4-Point Probe 매lot 측정', occurrence: 3, detection: 4, ap: 'M' },
  { id: 'fc-10', processNo: '40', feScope: 'YP', feValue: '전기적 Open/Short', fmValue: '막질 불균일', fcValue: 'Target 소진', m4: 'IM', workElement: 'Ti Target', pcValue: 'Target 사용량 카운터 관리', dcValue: 'SEM 전수검사, 4-Point Probe 매lot 측정', occurrence: 4, detection: 4, ap: 'M' },
  { id: 'fc-11', processNo: '60', feScope: 'YP', feValue: 'PR 패턴 불량', fmValue: 'PR 두께 불균일', fcValue: 'RPM 편차', m4: 'MC', workElement: 'Coater', pcValue: 'Coater PM, RPM 실시간 모니터링', dcValue: '막두께 측정기 전수검사', occurrence: 3, detection: 4, ap: 'M' },
  { id: 'fc-12', processNo: '70', feScope: 'YP', feValue: 'Bump간 Bridge', fmValue: 'CD 규격 이탈', fcValue: '에너지 편차', m4: 'MC', workElement: 'Stepper/Scanner', pcValue: 'Stepper 정기 교정, 에너지 실시간 모니터링', dcValue: 'CD SEM 전수측정', occurrence: 3, detection: 3, ap: 'M' },
  { id: 'fc-13', processNo: '70', feScope: 'YP', feValue: 'Bump간 Bridge', fmValue: 'CD 규격 이탈', fcValue: 'Mask 결함', m4: 'IM', workElement: 'Mask(Reticle)', pcValue: 'Mask 정기 세정, 결함 관리', dcValue: 'CD SEM 전수측정', occurrence: 3, detection: 3, ap: 'L' },
  { id: 'fc-14', processNo: '80', feScope: 'YP', feValue: 'CD Spec Out', fmValue: 'Under/Over develop', fcValue: '현상 시간 편차', m4: 'MC', workElement: 'Developer', pcValue: 'Developer PM, 시간 자동제어', dcValue: '광학현미경 샘플링 검사', occurrence: 3, detection: 4, ap: 'M' },
  { id: 'fc-15', processNo: '80', feScope: 'YP', feValue: 'CD Spec Out', fmValue: 'Under/Over develop', fcValue: '농도 편차', m4: 'IM', workElement: '현상액', pcValue: '농도 자동 보정 시스템', dcValue: '광학현미경 샘플링 검사', occurrence: 3, detection: 4, ap: 'M' },
  { id: 'fc-16', processNo: '90', feScope: 'YP', feValue: 'Au Bump 형성 불량', fmValue: 'PR 잔사 잔류', fcValue: 'Power 불안정', m4: 'MC', workElement: 'Descum 장비', pcValue: 'Descum PM, Power 모니터링', dcValue: '광학현미경 샘플링 검사', occurrence: 3, detection: 4, ap: 'M' },
  { id: 'fc-17', processNo: '100', feScope: 'YP', feValue: '전기적 Open/Short', fmValue: '높이 편차', fcValue: '전류밀도 편차', m4: 'MC', workElement: 'Au Plating Tank', pcValue: 'Plating Tank PM, 전류밀도 자동제어', dcValue: '높이 측정기 전수검사, 외관 샘플링 검사', occurrence: 3, detection: 4, ap: 'H' },
  { id: 'fc-18', processNo: '100', feScope: 'SP', feValue: 'IMC 과성장', fmValue: '순도 저하', fcValue: '농도 저하', m4: 'IM', workElement: 'Au 도금액', pcValue: '도금액 농도 자동분석, 보충', dcValue: 'XRF 분석기 매lot 분석', occurrence: 4, detection: 4, ap: 'H' },
  { id: 'fc-19', processNo: '120', feScope: 'YP', feValue: '균일도 Spec Out', fmValue: '에칭 부족/과다', fcValue: '에칭 시간 편차', m4: 'MC', workElement: 'Etch 장비', pcValue: 'Etch PM, 시간 자동제어', dcValue: 'SEM 전수검사', occurrence: 3, detection: 4, ap: 'M' },
  { id: 'fc-20', processNo: '140', feScope: 'SP', feValue: 'IMC 과성장', fmValue: 'IMC 과성장', fcValue: '온도 과다/부족', m4: 'MC', workElement: 'Anneal 장비', pcValue: 'Anneal 장비 PM, 온도 프로파일 모니터링', dcValue: 'Cross-section SEM 샘플링 검사', occurrence: 4, detection: 4, ap: 'H' },
  { id: 'fc-21', processNo: '150', feScope: 'USER', feValue: '고객 클레임', fmValue: '외관 불량', fcValue: '해상도 저하', m4: 'MC', workElement: 'AVI 장비', pcValue: 'AVI 정기 교정, 한도 견본 검증', dcValue: 'AVI 자동외관 전수검사', occurrence: 3, detection: 3, ap: 'M' },
  { id: 'fc-22', processNo: '150', feScope: 'USER', feValue: '고객 클레임', fmValue: '높이 규격 이탈', fcValue: '측정 오차', m4: 'MC', workElement: '높이 측정기', pcValue: '측정기 정기 교정(MSA)', dcValue: '높이 측정기 전수검사', occurrence: 3, detection: 3, ap: 'M' },
  { id: 'fc-23', processNo: '150', feScope: 'USER', feValue: '고객 신뢰도 하락', fmValue: '외관 불량', fcValue: '판정 기준 오적용', m4: 'MN', workElement: '검사원', pcValue: '검사원 정기 교육, 한도 견본 비치', dcValue: 'AVI 자동외관 전수검사', occurrence: 3, detection: 3, ap: 'M' },
  { id: 'fc-24', processNo: '190', feScope: 'SP', feValue: '외관 유출', fmValue: '외관 결함 미검출', fcValue: '해상도 저하', m4: 'MC', workElement: 'AVI 장비', pcValue: 'AVI 정기 교정', dcValue: 'AVI 전수 이중검사', occurrence: 3, detection: 3, ap: 'L' },
  { id: 'fc-25', processNo: '200', feScope: 'SP', feValue: '납품 Reject', fmValue: '포장 불량', fcValue: '진공 누설', m4: 'MC', workElement: '포장 장비', pcValue: '포장 장비 PM', dcValue: '포장 체크리스트 전수 확인', occurrence: 3, detection: 3, ap: 'L' },
];

function buildFlatData(): ImportedFlatData[] {
  const items: ImportedFlatData[] = [];
  let idx = 0;

  // B4 items
  for (const b4 of B4_SAMPLES) {
    items.push({
      id: `b4-${idx++}`,
      processNo: b4.processNo,
      category: 'B',
      itemCode: 'B4',
      value: b4.value,
      createdAt: new Date(),
    });
  }

  // B1 items
  for (const b1 of B1_SAMPLES) {
    items.push({
      id: `b1-${idx++}`,
      processNo: b1.processNo,
      category: 'B',
      itemCode: 'B1',
      value: b1.value,
      createdAt: new Date(),
    });
  }

  return items;
}

describe('SAMPLE_DATA 작성정확도 검증', () => {

  it('flatData 항목별 검증 — 경고 0건', () => {
    const flatData = buildFlatData();
    const warnings = validateAccuracy(flatData);

    if (warnings.length > 0) {
      console.log('=== flatData 경고 상세 ===');
      warnings.forEach(w => console.log(`  [${w.ruleId}] ${w.processNo} ${w.itemCode}: ${w.message}`));
    }

    expect(warnings.length, `flatData 경고 ${warnings.length}건`).toBe(0);
  });

  it('FC 고장사슬 검증 — 경고 0건', () => {
    const flatData = buildFlatData();
    const warnings = validateFCAccuracy(flatData, FC_CHAINS);

    if (warnings.length > 0) {
      console.log('=== FC 경고 상세 ===');
      warnings.forEach(w => console.log(`  [${w.ruleId}] ${w.processNo} ${w.itemCode}: ${w.message}`));
    }

    expect(warnings.length, `FC 경고 ${warnings.length}건`).toBe(0);
  });

  it('전체 검증 합산 — 경고 0건', () => {
    const flatData = buildFlatData();
    const accWarnings = validateAccuracy(flatData);
    const fcWarnings = validateFCAccuracy(flatData, FC_CHAINS);
    const allWarnings = [...accWarnings, ...fcWarnings];
    const summary = summarizeAccuracyWarnings(allWarnings);

    if (summary.total > 0) {
      console.log(`\n=== 전체 경고 ${summary.total}건 ===`);
      console.log('규칙별:', summary.byRule);
      console.log('항목별:', summary.byCode);
      allWarnings.forEach(w => console.log(`  [${w.ruleId}] ${w.processNo} ${w.itemCode}: ${w.message}`));
    }

    expect(summary.total, `전체 경고 ${summary.total}건 — 0건 목표`).toBe(0);
  });

  it('A6 DC 3요소 전수 검증 — FMT_A6_3ELEM 0건', () => {
    const flatData = buildFlatData();
    const warnings = validateFCAccuracy(flatData, FC_CHAINS);
    const a6Warnings = warnings.filter(w => w.ruleId === 'FMT_A6_3ELEM');

    if (a6Warnings.length > 0) {
      console.log('=== FMT_A6_3ELEM 경고 ===');
      a6Warnings.forEach(w => console.log(`  ${w.processNo}: "${w.value}" — ${w.message}`));
    }

    expect(a6Warnings.length, `FMT_A6_3ELEM ${a6Warnings.length}건`).toBe(0);
  });

  it('B5↔A6 교차 혼입 0건 — MIX_B5_A6', () => {
    const flatData = buildFlatData();
    const warnings = validateFCAccuracy(flatData, FC_CHAINS);
    const mixWarnings = warnings.filter(w => w.ruleId === 'MIX_B5_A6');

    if (mixWarnings.length > 0) {
      console.log('=== MIX_B5_A6 경고 ===');
      mixWarnings.forEach(w => console.log(`  ${w.processNo} ${w.itemCode}: "${w.value}" — ${w.message}`));
    }

    expect(mixWarnings.length, `MIX_B5_A6 ${mixWarnings.length}건`).toBe(0);
  });
});
