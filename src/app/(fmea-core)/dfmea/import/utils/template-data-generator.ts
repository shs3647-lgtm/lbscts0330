/**
 * @file template-data-generator.ts
 * @description 구조 기반 DFMEA 기초정보 템플릿 데이터 생성기
 * @created 2026-02-18
 *
 * ImportedFlatData[] 배열을 직접 생성한다 (Excel 파일이 아님).
 * 기존 ImportPreviewPanel에서 바로 미리보기/편집/저장 가능.
 *
 * 모드:
 * - generateManualTemplateData(): ② 수동 — 드랍다운 설정 → 빈 구조
 * - generateAutoTemplateData():   ③ 자동 — 수동 + 작업요소 입력 → B1 완성
 */

import { ImportedFlatData } from '../types';
import { M4_SORT_ORDER } from './excel-styles';

// ─── 타입 (excel-template-generator.ts와 동일) ───

export type ExampleIndustry = 'sample-001' | 'sample-002' | 'sample-003' | 'sample-004';

export const INDUSTRY_LABELS: Record<ExampleIndustry, string> = {
  'sample-001': '자전거 프레임',
  'sample-002': 'Micro Bump (Cu/SnAg)',
  'sample-003': 'Flip Chip (FCBGA)',
  'sample-004': '휠베어링 (자동차)',
};

export interface ManualTemplateConfig {
  processCount: number;
  processNaming: 'number' | 'alphabet';
  commonMN: number;
  commonEN: number;
  perProcessMN: number;
  perProcessMC: number;
  perProcessIM: number;
  perProcessEN: number;
  exampleIndustry: ExampleIndustry;
}

export interface WorkElementInput {
  id: string;
  processNo: string;
  processName: string;
  m4: 'MN' | 'MC' | 'IM' | 'EN';
  name: string;
}

export interface AutoTemplateConfig extends ManualTemplateConfig {
  workElements: WorkElementInput[];
  b2Multiplier: number;
  b3Multiplier: number;
  b4Multiplier: number;
  b5Multiplier: number;
}

// ─── 유틸 ───

/** 예시 데이터 m4별 최대 인덱스 — 초과 시 순환(idx % max) */
const EX_MAX: Record<string, number> = { MC: 6, MN: 1, EN: 1, IM: 2 };

let _idCounter = 0;
function genId(): string {
  _idCounter++;
  return `tpl-${Date.now()}-${_idCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateProcessNumbers(count: number, naming: 'number' | 'alphabet'): string[] {
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(naming === 'number' ? String((i + 1) * 10) : String.fromCharCode(65 + i));
  }
  return result;
}

function makeItem(
  processNo: string,
  category: 'A' | 'B' | 'C',
  itemCode: string,
  value: string,
  m4?: string,
): ImportedFlatData {
  return {
    id: genId(),
    processNo,
    category,
    itemCode,
    value,
    m4,
    createdAt: new Date(),
  };
}

// ─── 업종별 예시 데이터 (3개 공정 기준) ───
// 키 규칙: A시리즈=A2_0,A2_1,A2_2  B시리즈=B1_MC_0~5  C시리즈=C2_YP 등

type ExampleData = Record<string, string>;

const EXAMPLE_BUMP: ExampleData = {
  // ★ Cu/SnAg Micro Bump — 3개 공정: UBM Sputtering / Cu Pillar Plating / SnAg Reflow
  A2_0: 'UBM Sputtering(예시)', A2_1: 'Cu Pillar Plating(예시)', A2_2: 'SnAg Reflow(예시)',
  A3_0: 'Ti/Cu UBM 증착으로 Bump 접합층 형성(예시)', A3_1: 'Cu Pillar 전해도금으로 Bump Core 형성(예시)', A3_2: 'SnAg Solder Cap Reflow로 접합부 완성(예시)',
  A4_0: 'UBM 두께, 막질 균일도(예시)', A4_1: 'Cu Pillar 높이, 직경(예시)', A4_2: 'Solder 형상, IMC 두께(예시)',
  A5_0: '막질 불균일, 접착력 불량(예시)', A5_1: '높이 편차, 도금 불량(예시)', A5_2: '브릿지, Solder 미형성(예시)',
  A6_0: 'SEM 검사, 4-Point Probe(예시)', A6_1: '높이 측정기, 외관검사(예시)', A6_2: 'X-ray 검사, 외관검사(예시)',
  // B — MN(공통1), EN(공통1), MC(공정별2×3=6)
  B1_MN_0: 'Sputter 장비 운전자(예시)', B1_EN_0: '클린룸 온습도(예시)',
  B1_IM_0: 'Flux(예시)', B1_IM_1: 'DI Water(예시)',
  B1_MC_0: 'Sputter 장비(예시)', B1_MC_1: 'DC Power Supply(예시)',
  B1_MC_2: 'Cu Plating Tank(예시)', B1_MC_3: '정류기(Rectifier)(예시)',
  B1_MC_4: 'Reflow Oven(예시)', B1_MC_5: 'N₂ 공급장치(예시)',
  B2_MN_0: 'Ti/Cu 타겟 증착 수행(예시)', B2_EN_0: '클린룸 환경 유지(예시)',
  B2_IM_0: 'Flux 도포(예시)', B2_IM_1: '웨이퍼 세척(예시)',
  B2_MC_0: '웨이퍼 UBM 증착(예시)', B2_MC_1: 'Power 인가(예시)',
  B2_MC_2: 'Cu 전해 도금(예시)', B2_MC_3: '전류밀도 제어(예시)',
  B2_MC_4: 'Solder Reflow(예시)', B2_MC_5: '질소 분위기 유지(예시)',
  B3_MN_0: '장비 운전 숙련도(예시)', B3_EN_0: '클린룸 온도(예시)',
  B3_IM_0: 'Flux 도포량(예시)', B3_IM_1: 'DI Water 순도(예시)',
  B3_MC_0: 'Sputter Power, 증착시간(예시)', B3_MC_1: 'DC Voltage(예시)',
  B3_MC_2: '전류밀도, 도금시간(예시)', B3_MC_3: '전류 안정성(예시)',
  B3_MC_4: 'Reflow 온도, 시간(예시)', B3_MC_5: 'N₂ 유량(예시)',
  B4_MN_0: '운전 미숙으로 막질 불량(예시)', B4_EN_0: '온도 변동으로 막질 이상(예시)',
  B4_IM_0: 'Flux 과다/부족(예시)', B4_IM_1: '세척 불량(예시)',
  B4_MC_0: 'Power 편차로 두께 불균일(예시)', B4_MC_1: 'Voltage 이상(예시)',
  B4_MC_2: '전류밀도 편차로 높이 불량(예시)', B4_MC_3: '전류 불안정(예시)',
  B4_MC_4: '온도 편차로 Solder 미형성(예시)', B4_MC_5: 'N₂ 유량 부족으로 산화(예시)',
  B5_MN_0: '운전자 정기 교육(예시)', B5_EN_0: '온습도 자동 제어(예시)',
  B5_IM_0: 'Flux 도포량 SPC(예시)', B5_IM_1: 'DI Water 순도 모니터링(예시)',
  B5_MC_0: '장비 PM 일정 관리(예시)', B5_MC_1: 'Power 모니터링(예시)',
  B5_MC_2: '전류밀도 SPC 관리(예시)', B5_MC_3: '정류기 교정(예시)',
  B5_MC_4: '온도 프로파일 관리(예시)', B5_MC_5: 'N₂ 유량 모니터링(예시)',
  C2_YP: 'Bump 전기적 연결 확보(예시)', C2_SP: '패키지 신뢰성 확보(예시)', C2_USER: '고객 수율 요구 충족(예시)',
  C3_YP: 'Bump Height 10±1μm(예시)', C3_SP: 'TCT 1000cycle 이상(예시)', C3_USER: '수율 99.5% 이상(예시)',
  C4_YP: '전기적 Open/Short(예시)', C4_SP: '필드 불량, 반품(예시)', C4_USER: '고객 라인 정지, 클레임(예시)',
};

const EXAMPLE_FLIPCHIP: ExampleData = {
  // ★ FCBGA — 3개 공정: Wafer Bumping / Flip Chip Bonding / Underfill Dispense
  A2_0: 'Wafer Bumping(예시)', A2_1: 'Flip Chip Bonding(예시)', A2_2: 'Underfill Dispense(예시)',
  A3_0: '웨이퍼 범핑으로 솔더볼 형성(예시)', A3_1: '칩-기판 Thermo-compression 접합(예시)', A3_2: '언더필 주입으로 접합부 보강(예시)',
  A4_0: 'Ball 높이, Coplanarity(예시)', A4_1: '접합강도, Bump 전기저항(예시)', A4_2: 'Void율, 경화도(예시)',
  A5_0: 'Ball 높이 편차, Missing Ball(예시)', A5_1: '접합 불량, 전기적 Open(예시)', A5_2: 'Void 과다, 미충전(예시)',
  A6_0: '3D 측정, 외관검사(예시)', A6_1: 'X-ray 검사, SAT 검사(예시)', A6_2: 'SAT 검사, 단면분석(예시)',
  B1_MN_0: 'Bumping 장비 운전자(예시)', B1_EN_0: '클린룸 온습도(예시)',
  B1_IM_0: 'Flux(예시)', B1_IM_1: '세척액(예시)',
  B1_MC_0: 'Ball Mounter(예시)', B1_MC_1: 'Reflow Oven(예시)',
  B1_MC_2: 'TC Bonder(예시)', B1_MC_3: 'Alignment Camera(예시)',
  B1_MC_4: 'Dispenser(예시)', B1_MC_5: 'Cure Oven(예시)',
  B2_MN_0: 'Ball Mounting 수행(예시)', B2_EN_0: '클린룸 환경 유지(예시)',
  B2_IM_0: 'Flux 도포(예시)', B2_IM_1: '기판 세척(예시)',
  B2_MC_0: '솔더볼 배치(예시)', B2_MC_1: 'Ball Reflow(예시)',
  B2_MC_2: '기판 위 칩 접합(예시)', B2_MC_3: '칩 위치 정렬(예시)',
  B2_MC_4: '언더필 재료 주입(예시)', B2_MC_5: '언더필 경화(예시)',
  B3_MN_0: '장비 운전 숙련도(예시)', B3_EN_0: '클린룸 온도(예시)',
  B3_IM_0: 'Flux 도포량, 점도(예시)', B3_IM_1: '세척액 농도(예시)',
  B3_MC_0: 'Ball 배치 정확도(예시)', B3_MC_1: 'Reflow 온도 프로파일(예시)',
  B3_MC_2: 'Bonding 온도, 압력, 시간(예시)', B3_MC_3: 'Alignment 정밀도(예시)',
  B3_MC_4: '토출량, 토출속도(예시)', B3_MC_5: '경화 온도, 시간(예시)',
  B4_MN_0: '운전 미숙으로 배치 틀어짐(예시)', B4_EN_0: '온도 변동으로 접합 이상(예시)',
  B4_IM_0: 'Flux 잔사(예시)', B4_IM_1: '세척 잔사(예시)',
  B4_MC_0: 'Ball 누락, 위치 편차(예시)', B4_MC_1: '온도 프로파일 이탈(예시)',
  B4_MC_2: '온도/압력 편차로 접합불량(예시)', B4_MC_3: '정렬 오차(예시)',
  B4_MC_4: '토출량 과부족(예시)', B4_MC_5: '경화 부족(예시)',
  B5_MN_0: '운전자 정기 교육(예시)', B5_EN_0: '온습도 자동 제어(예시)',
  B5_IM_0: 'Flux 도포 관리(예시)', B5_IM_1: '세척액 관리(예시)',
  B5_MC_0: 'Ball Mounter PM 관리(예시)', B5_MC_1: '온도 프로파일 SPC 관리(예시)',
  B5_MC_2: 'Bonding 조건 모니터링(예시)', B5_MC_3: 'Camera 교정(예시)',
  B5_MC_4: '토출량 SPC 관리(예시)', B5_MC_5: '경화 프로파일 관리(예시)',
  C2_YP: '칩-기판 전기적 연결(예시)', C2_SP: '패키지 장기 신뢰성(예시)', C2_USER: '고객 실장 수율(예시)',
  C3_YP: 'Shear Strength ≥50gf(예시)', C3_SP: 'HTOL 1000hr Pass(예시)', C3_USER: '실장 수율 99.9%(예시)',
  C4_YP: '전기적 Open/Short(예시)', C4_SP: '필드 반품, 리콜(예시)', C4_USER: '고객 라인 정지(예시)',
};

const EXAMPLE_BEARING: ExampleData = {
  // ★ 자동차용 휠베어링 — 3개 공정: 단조 / 선삭 / 내륜 연삭
  A2_0: '열간 단조(예시)', A2_1: 'CNC 선삭(예시)', A2_2: '내륜 연삭(예시)',
  A3_0: '강재 가열 후 프레스 단조로 내외륜 성형(예시)', A3_1: 'CNC 선반으로 내외륜 절삭 가공(예시)', A3_2: '내륜 궤도면 정밀 연삭(예시)',
  A4_0: '단조 치수, 표면결함(예시)', A4_1: '내외경 치수, 진원도(예시)', A4_2: '궤도면 진원도, 표면조도(예시)',
  A5_0: '치수 불량, 크랙 발생(예시)', A5_1: '치수 초과, 진원도 불량(예시)', A5_2: '진원도 불량, 조도 초과(예시)',
  A6_0: 'CMM 측정, 자분탐상(예시)', A6_1: 'CNC 인프로세스 측정(예시)', A6_2: '진원도 측정, 조도 검사(예시)',
  B1_MN_0: '단조 프레스 운전자(예시)', B1_EN_0: '작업장 온도(예시)',
  B1_IM_0: '절삭유(예시)', B1_IM_1: '세척액(예시)',
  B1_MC_0: '열간 단조 프레스(예시)', B1_MC_1: '가열로(Furnace)(예시)',
  B1_MC_2: 'CNC 선반(예시)', B1_MC_3: '절삭공구(Insert)(예시)',
  B1_MC_4: 'CNC 내면연삭기(예시)', B1_MC_5: '연삭숫돌(예시)',
  B2_MN_0: '단조 성형 수행(예시)', B2_EN_0: '항온 환경 유지(예시)',
  B2_IM_0: '절삭 윤활(예시)', B2_IM_1: '부품 세척(예시)',
  B2_MC_0: '강재 프레스 성형(예시)', B2_MC_1: '강재 가열(예시)',
  B2_MC_2: '내외륜 절삭 가공(예시)', B2_MC_3: '절삭 수행(예시)',
  B2_MC_4: '내륜 내경 연삭(예시)', B2_MC_5: '궤도면 연삭(예시)',
  B3_MN_0: '장비 운전 숙련도(예시)', B3_EN_0: '실내 온도(예시)',
  B3_IM_0: '절삭유 농도(예시)', B3_IM_1: '세척액 농도(예시)',
  B3_MC_0: '프레스 압력, 속도(예시)', B3_MC_1: '가열 온도, 시간(예시)',
  B3_MC_2: '절삭 이송속도, 절입량(예시)', B3_MC_3: '공구 마모도(예시)',
  B3_MC_4: '연삭 이송속도, 절입량(예시)', B3_MC_5: '숫돌 입도, 드레싱 주기(예시)',
  B4_MN_0: '운전 미숙으로 치수 불량(예시)', B4_EN_0: '온도 변동으로 치수 변화(예시)',
  B4_IM_0: '절삭유 농도 부족(예시)', B4_IM_1: '세척 불량(예시)',
  B4_MC_0: '프레스 압력 이탈(예시)', B4_MC_1: '가열 온도 편차(예시)',
  B4_MC_2: '이송속도 편차(예시)', B4_MC_3: '공구 마모로 치수 불량(예시)',
  B4_MC_4: '이송속도 편차로 조도 불량(예시)', B4_MC_5: '숫돌 마모로 정밀도 저하(예시)',
  B5_MN_0: '운전자 정기 교육(예시)', B5_EN_0: '항온항습 관리(예시)',
  B5_IM_0: '절삭유 농도 관리(예시)', B5_IM_1: '세척액 관리(예시)',
  B5_MC_0: '프레스 일상점검(예시)', B5_MC_1: '가열로 온도 모니터링(예시)',
  B5_MC_2: 'CNC 일상점검(예시)', B5_MC_3: '공구 수명 관리(예시)',
  B5_MC_4: '연삭기 일상점검(예시)', B5_MC_5: '숫돌 드레싱 관리(예시)',
  C2_YP: '베어링 회전 정밀도 확보(예시)', C2_SP: '주행 안정성 확보(예시)', C2_USER: '소음/진동 없는 승차감(예시)',
  C3_YP: '진원도 ≤2μm(예시)', C3_SP: '내구수명 20만km(예시)', C3_USER: 'NVH 기준 충족(예시)',
  C4_YP: '회전 소음, 진동(예시)', C4_SP: '주행중 베어링 파손(예시)', C4_USER: '차량 리콜, 안전사고(예시)',
};

const EXAMPLE_BICYCLE: ExampleData = {
  // ★ 자전거 프레임 — 3개 공정: 파이프 절단 / 프레임 용접 / 도장
  A2_0: '파이프 절단(예시)', A2_1: '프레임 용접(예시)', A2_2: '도장(예시)',
  A3_0: '알루미늄 파이프 규격별 정밀 절단(예시)', A3_1: '알루미늄 프레임 TIG 용접(예시)', A3_2: '전처리 후 분체 도장(예시)',
  A4_0: '절단 길이, 절단면 직각도(예시)', A4_1: '용접강도, 비드외관(예시)', A4_2: '도막 두께, 부착력(예시)',
  A5_0: '길이 불량, 절단면 버(Burr)(예시)', A5_1: '용접불량, 기공발생(예시)', A5_2: '도막 벗겨짐, 두께 부족(예시)',
  A6_0: '길이 측정, 외관검사(예시)', A6_1: '용접부 외관검사, X-ray(예시)', A6_2: '도막 두께 측정, 부착력 시험(예시)',
  B1_MN_0: '절단기 운전자(예시)', B1_EN_0: '작업장 온습도(예시)',
  B1_IM_0: '용접봉(예시)', B1_IM_1: '세척액(예시)',
  B1_MC_0: 'CNC 절단기(예시)', B1_MC_1: '절단 블레이드(예시)',
  B1_MC_2: 'TIG 용접기(예시)', B1_MC_3: '용접 지그(Jig)(예시)',
  B1_MC_4: '분체도장 부스(예시)', B1_MC_5: '건조로(예시)',
  B2_MN_0: '파이프 절단 수행(예시)', B2_EN_0: '온습도 유지(예시)',
  B2_IM_0: '용접 접합재 공급(예시)', B2_IM_1: '부품 세척(예시)',
  B2_MC_0: '파이프 정밀 절단(예시)', B2_MC_1: '절단면 가공(예시)',
  B2_MC_2: '프레임 접합(예시)', B2_MC_3: '용접 위치 고정(예시)',
  B2_MC_4: '분체 도료 도포(예시)', B2_MC_5: '도막 경화(예시)',
  B3_MN_0: '장비 운전 숙련도(예시)', B3_EN_0: '실내 온도(예시)',
  B3_IM_0: '용접봉 규격, 재질(예시)', B3_IM_1: '세척액 농도(예시)',
  B3_MC_0: '절단 속도, 이송량(예시)', B3_MC_1: '블레이드 마모도(예시)',
  B3_MC_2: '용접전류, 속도(예시)', B3_MC_3: '지그 고정력(예시)',
  B3_MC_4: '도장 두께, 분사압(예시)', B3_MC_5: '건조 온도, 시간(예시)',
  B4_MN_0: '운전 미숙으로 절단불량(예시)', B4_EN_0: '습도 초과로 도장 불량(예시)',
  B4_IM_0: '용접봉 규격 오류(예시)', B4_IM_1: '세척액 농도 부족(예시)',
  B4_MC_0: '절단 속도 이탈(예시)', B4_MC_1: '블레이드 마모(예시)',
  B4_MC_2: '용접기 전류편차(예시)', B4_MC_3: '지그 변형(예시)',
  B4_MC_4: '분사압 편차(예시)', B4_MC_5: '건조 온도 이탈(예시)',
  B5_MN_0: '운전자 정기 교육(예시)', B5_EN_0: '온습도 모니터링(예시)',
  B5_IM_0: '용접봉 입고검사(예시)', B5_IM_1: '세척액 농도 관리(예시)',
  B5_MC_0: '절단기 일상점검(예시)', B5_MC_1: '블레이드 수명 관리(예시)',
  B5_MC_2: '용접기 일상점검(예시)', B5_MC_3: '지그 정기 교정(예시)',
  B5_MC_4: '도장 부스 점검(예시)', B5_MC_5: '건조로 온도 관리(예시)',
  C2_YP: '프레임 강도 확보(예시)', C2_SP: '안전한 주행(예시)', C2_USER: '편안한 승차감(예시)',
  C3_YP: '용접강도 200MPa 이상(예시)', C3_SP: '내구성 5만km(예시)', C3_USER: '안전 기준 충족(예시)',
  C4_YP: '재작업, 폐기(예시)', C4_SP: '납기지연, 반품(예시)', C4_USER: '주행중 파손, 안전사고(예시)',
};

const EXAMPLES: Record<ExampleIndustry, ExampleData> = {
  'sample-001': EXAMPLE_BICYCLE,
  'sample-002': EXAMPLE_BUMP,
  'sample-003': EXAMPLE_FLIPCHIP,
  'sample-004': EXAMPLE_BEARING,
};

function getExample(config: ManualTemplateConfig): ExampleData {
  return EXAMPLES[config.exampleIndustry] || EXAMPLE_BICYCLE;
}

// ─── 4M 행 구조 생성 ───

interface M4Row {
  processNo: string;
  processName: string;
  m4: string;
}

function generateM4Rows(config: ManualTemplateConfig, processNumbers: string[]): M4Row[] {
  const rows: M4Row[] = [];

  // 공통(00) — MN, EN 순서
  for (let i = 0; i < config.commonMN; i++) rows.push({ processNo: '00', processName: '공통', m4: 'MN' });
  for (let i = 0; i < config.commonEN; i++) rows.push({ processNo: '00', processName: '공통', m4: 'EN' });

  // 공정별 — MN→MC→IM→EN 순서 고정
  processNumbers.forEach(pNo => {
    for (let i = 0; i < config.perProcessMN; i++) rows.push({ processNo: pNo, processName: '', m4: 'MN' });
    for (let i = 0; i < config.perProcessMC; i++) rows.push({ processNo: pNo, processName: '', m4: 'MC' });
    for (let i = 0; i < config.perProcessIM; i++) rows.push({ processNo: pNo, processName: '', m4: 'IM' });
    for (let i = 0; i < config.perProcessEN; i++) rows.push({ processNo: pNo, processName: '', m4: 'EN' });
  });

  return rows;
}

// ─── ② 수동 템플릿 ───

export function generateManualTemplateData(config: ManualTemplateConfig): ImportedFlatData[] {
  const items: ImportedFlatData[] = [];
  const EX = getExample(config);
  const processNumbers = generateProcessNumbers(config.processCount, config.processNaming);
  const m4Rows = generateM4Rows(config, processNumbers);

  // A1 (공정번호) + A2 (공정명) — 인덱스 기반 예시 (3개 순환)
  processNumbers.forEach((pNo, idx) => {
    items.push(makeItem(pNo, 'A', 'A1', pNo));
    items.push(makeItem(pNo, 'A', 'A2', EX[`A2_${idx % 3}`] || ''));
  });

  // A3~A6 — 인덱스 기반 예시 (3개 순환: 예시 데이터가 3개 공정분만 존재)
  processNumbers.forEach((pNo, idx) => items.push(makeItem(pNo, 'A', 'A3', EX[`A3_${idx % 3}`] || '')));
  processNumbers.forEach((pNo, idx) => items.push(makeItem(pNo, 'A', 'A4', EX[`A4_${idx % 3}`] || '')));
  processNumbers.forEach((pNo, idx) => items.push(makeItem(pNo, 'A', 'A5', EX[`A5_${idx % 3}`] || '')));
  processNumbers.forEach((pNo, idx) => items.push(makeItem(pNo, 'A', 'A6', EX[`A6_${idx % 3}`] || '')));

  // B1~B5 — m4 타입별 발생 카운트 기반 예시 (순환: MC=6개, MN/EN=1개)
  for (const bCode of ['B1', 'B2', 'B3', 'B4', 'B5'] as const) {
    const count: Record<string, number> = {};
    m4Rows.forEach(r => {
      const rawIdx = count[r.m4] || 0;
      count[r.m4] = rawIdx + 1;
      const maxEx = EX_MAX[r.m4] || 1;
      const val = EX[`${bCode}_${r.m4}_${rawIdx % maxEx}`] || '';
      items.push(makeItem(r.processNo, 'B', bCode, val, r.m4));
    });
  }

  // C1~C4 — YP/SP/USER 예시 데이터
  const categories = ['YP', 'SP', 'USER'];
  categories.forEach(cat => items.push(makeItem(cat, 'C', 'C1', cat)));
  categories.forEach(cat => items.push(makeItem(cat, 'C', 'C2', EX[`C2_${cat}`] || '')));
  categories.forEach(cat => items.push(makeItem(cat, 'C', 'C3', EX[`C3_${cat}`] || '')));
  categories.forEach(cat => items.push(makeItem(cat, 'C', 'C4', EX[`C4_${cat}`] || '')));

  return items;
}

// ─── ③ 자동 템플릿 ───

export function generateAutoTemplateData(config: AutoTemplateConfig): ImportedFlatData[] {
  const items: ImportedFlatData[] = [];
  const EX = getExample(config);

  // 작업요소에서 공정번호 추출 (순서 유지)
  const processNumbers = [...new Set(config.workElements.map(w => w.processNo))];
  const processNameMap = new Map<string, string>();
  config.workElements.forEach(w => {
    if (w.processName) processNameMap.set(w.processNo, w.processName);
  });

  // 작업요소를 4M 순서로 정렬
  const sortedElements = [...config.workElements].sort((a, b) => {
    const pCmp = processNumbers.indexOf(a.processNo) - processNumbers.indexOf(b.processNo);
    if (pCmp !== 0) return pCmp;
    return (M4_SORT_ORDER[a.m4] ?? 9) - (M4_SORT_ORDER[b.m4] ?? 9);
  });

  // A1 + A2 — 공통('00')은 작업요소(B)에만 사용, 공정(A) 행에서 제외
  const aProcessNumbers = processNumbers.filter(pNo => pNo !== '00');
  aProcessNumbers.forEach((pNo, idx) => {
    items.push(makeItem(pNo, 'A', 'A1', pNo));
    items.push(makeItem(pNo, 'A', 'A2', processNameMap.get(pNo) || EX[`A2_${idx % 3}`] || ''));
  });

  // A3~A6 — 인덱스 기반 예시 (공통 제외, 3개 순환)
  aProcessNumbers.forEach((pNo, idx) => items.push(makeItem(pNo, 'A', 'A3', EX[`A3_${idx % 3}`] || '')));
  aProcessNumbers.forEach((pNo, idx) => items.push(makeItem(pNo, 'A', 'A4', EX[`A4_${idx % 3}`] || '')));
  aProcessNumbers.forEach((pNo, idx) => items.push(makeItem(pNo, 'A', 'A5', EX[`A5_${idx % 3}`] || '')));
  aProcessNumbers.forEach((pNo, idx) => items.push(makeItem(pNo, 'A', 'A6', EX[`A6_${idx % 3}`] || '')));

  // B1 — 작업요소 완성
  sortedElements.forEach(w => {
    items.push(makeItem(w.processNo, 'B', 'B1', w.name, w.m4));
  });

  // B2~B5 — m4 타입별 발생 카운트 기반 예시 (순환: MC=6개, MN/EN=1개)
  const bMultipliers: Record<string, number> = {
    B2: config.b2Multiplier, B3: config.b3Multiplier,
    B4: config.b4Multiplier, B5: config.b5Multiplier,
  };
  for (const bCode of ['B2', 'B3', 'B4', 'B5'] as const) {
    const count: Record<string, number> = {};
    sortedElements.forEach(w => {
      for (let i = 0; i < bMultipliers[bCode]; i++) {
        const rawIdx = count[w.m4] || 0;
        count[w.m4] = rawIdx + 1;
        const maxEx = EX_MAX[w.m4] || 1;
        const val = EX[`${bCode}_${w.m4}_${rawIdx % maxEx}`] || '';
        items.push(makeItem(w.processNo, 'B', bCode, val, w.m4));
      }
    });
  }

  // C1~C4 — YP/SP/USER 예시 데이터
  const categories = ['YP', 'SP', 'USER'];
  categories.forEach(cat => items.push(makeItem(cat, 'C', 'C1', cat)));
  categories.forEach(cat => items.push(makeItem(cat, 'C', 'C2', EX[`C2_${cat}`] || '')));
  categories.forEach(cat => items.push(makeItem(cat, 'C', 'C3', EX[`C3_${cat}`] || '')));
  categories.forEach(cat => items.push(makeItem(cat, 'C', 'C4', EX[`C4_${cat}`] || '')));

  return items;
}
