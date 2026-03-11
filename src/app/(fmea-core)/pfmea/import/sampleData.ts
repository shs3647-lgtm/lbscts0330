/**
 * @file sampleData.ts
 * @description PFMEA Import 페이지용 샘플 데이터 및 드롭다운 옵션
 * @updated 2026-03-09 — 자전거 프레임 제조공정 교육용 데모 (A4/A5/B3/B4 포함)
 */

import { ImportedFlatData } from './types';

// 샘플 데이터 (자전거 프레임 제조 공정 기반) — v5.1: FC 고장사슬 미리보기용 전체 데이터
// ★ A1~A5, B1~B4, C1~C4 전체 포함 → buildFailureChainsFromFlat()로 FC 자동 생성
export const SAMPLE_DATA: ImportedFlatData[] = [
  // ════════════════════════════════════════════════════════════════
  // A계열: L2 공정 레벨 (10 컷팅 ~ 60 검사)
  // ════════════════════════════════════════════════════════════════

  // ── 공정 10 - 컷팅 ──────────────────────────────────────────
  { id: '10-A1', processNo: '10', category: 'A', itemCode: 'A1', value: '10', createdAt: new Date() },
  { id: '10-A2', processNo: '10', category: 'A', itemCode: 'A2', value: '컷팅', createdAt: new Date() },
  { id: '10-A3', processNo: '10', category: 'A', itemCode: 'A3', value: '원자재를 도면에서 지정된 치수로 절단한다', createdAt: new Date() },
  { id: '10-A4a', processNo: '10', category: 'A', itemCode: 'A4', value: '소재 외경', createdAt: new Date() },
  { id: '10-A4b', processNo: '10', category: 'A', itemCode: 'A4', value: '소재 두께', createdAt: new Date() },
  { id: '10-A4c', processNo: '10', category: 'A', itemCode: 'A4', value: '소재 길이', createdAt: new Date() },
  { id: '10-A5a', processNo: '10', category: 'A', itemCode: 'A5', value: '소재 외경 부적합', createdAt: new Date() },
  { id: '10-A5b', processNo: '10', category: 'A', itemCode: 'A5', value: '소재 두께 부적합', createdAt: new Date() },
  { id: '10-A5c', processNo: '10', category: 'A', itemCode: 'A5', value: '소재 길이 부적합', createdAt: new Date() },

  // ── 공정 20 - 프레스 ────────────────────────────────────────
  { id: '20-A1', processNo: '20', category: 'A', itemCode: 'A1', value: '20', createdAt: new Date() },
  { id: '20-A2', processNo: '20', category: 'A', itemCode: 'A2', value: '프레스', createdAt: new Date() },
  { id: '20-A3', processNo: '20', category: 'A', itemCode: 'A3', value: '절단된 소재를 도면에 따라 성형 가공한다', createdAt: new Date() },
  { id: '20-A4a', processNo: '20', category: 'A', itemCode: 'A4', value: 'BURR', createdAt: new Date() },
  { id: '20-A4b', processNo: '20', category: 'A', itemCode: 'A4', value: '성형 치수', specialChar: '◇', createdAt: new Date() },
  { id: '20-A5a', processNo: '20', category: 'A', itemCode: 'A5', value: 'BURR 과다', createdAt: new Date() },
  { id: '20-A5b', processNo: '20', category: 'A', itemCode: 'A5', value: '성형 치수 부적합', createdAt: new Date() },

  // ── 공정 30 - 용접 ──────────────────────────────────────────
  { id: '30-A1', processNo: '30', category: 'A', itemCode: 'A1', value: '30', createdAt: new Date() },
  { id: '30-A2', processNo: '30', category: 'A', itemCode: 'A2', value: '용접', createdAt: new Date() },
  { id: '30-A3', processNo: '30', category: 'A', itemCode: 'A3', value: '가공된 부품을 도면에 따라 용접하여 접합한다', createdAt: new Date() },
  { id: '30-A4a', processNo: '30', category: 'A', itemCode: 'A4', value: '외관', createdAt: new Date() },
  { id: '30-A4b', processNo: '30', category: 'A', itemCode: 'A4', value: '용접강도', specialChar: '◇', createdAt: new Date() },
  { id: '30-A5a', processNo: '30', category: 'A', itemCode: 'A5', value: '외관 부적합', createdAt: new Date() },
  { id: '30-A5b', processNo: '30', category: 'A', itemCode: 'A5', value: '용접강도 미달', createdAt: new Date() },

  // ── 공정 40 - 도장 ──────────────────────────────────────────
  { id: '40-A1', processNo: '40', category: 'A', itemCode: 'A1', value: '40', createdAt: new Date() },
  { id: '40-A2', processNo: '40', category: 'A', itemCode: 'A2', value: '도장', createdAt: new Date() },
  { id: '40-A3', processNo: '40', category: 'A', itemCode: 'A3', value: '용접된 제품에 도장하여 표면을 보호한다', createdAt: new Date() },
  { id: '40-A4a', processNo: '40', category: 'A', itemCode: 'A4', value: '도막 두께', specialChar: '◇', createdAt: new Date() },
  { id: '40-A4b', processNo: '40', category: 'A', itemCode: 'A4', value: '도막 밀착성', createdAt: new Date() },
  { id: '40-A4c', processNo: '40', category: 'A', itemCode: 'A4', value: '외관', createdAt: new Date() },
  { id: '40-A5a', processNo: '40', category: 'A', itemCode: 'A5', value: '도막 두께 부적합', createdAt: new Date() },
  { id: '40-A5b', processNo: '40', category: 'A', itemCode: 'A5', value: '도막 박리', createdAt: new Date() },
  { id: '40-A5c', processNo: '40', category: 'A', itemCode: 'A5', value: '외관 부적합', createdAt: new Date() },

  // ── 공정 50 - 조립 ──────────────────────────────────────────
  { id: '50-A1', processNo: '50', category: 'A', itemCode: 'A1', value: '50', createdAt: new Date() },
  { id: '50-A2', processNo: '50', category: 'A', itemCode: 'A2', value: '조립', createdAt: new Date() },
  { id: '50-A3', processNo: '50', category: 'A', itemCode: 'A3', value: '도장된 부품을 조립하여 완제품을 구성한다', createdAt: new Date() },
  { id: '50-A4a', processNo: '50', category: 'A', itemCode: 'A4', value: '조립 토크', specialChar: '◇', createdAt: new Date() },
  { id: '50-A4b', processNo: '50', category: 'A', itemCode: 'A4', value: '체결 상태', createdAt: new Date() },
  { id: '50-A5a', processNo: '50', category: 'A', itemCode: 'A5', value: '조립 토크 부적합', createdAt: new Date() },
  { id: '50-A5b', processNo: '50', category: 'A', itemCode: 'A5', value: '체결 불량', createdAt: new Date() },

  // ── 공정 60 - 검사 ──────────────────────────────────────────
  { id: '60-A1', processNo: '60', category: 'A', itemCode: 'A1', value: '60', createdAt: new Date() },
  { id: '60-A2', processNo: '60', category: 'A', itemCode: 'A2', value: '검사', createdAt: new Date() },
  { id: '60-A3', processNo: '60', category: 'A', itemCode: 'A3', value: '완제품의 품질을 최종 검사한다', createdAt: new Date() },
  { id: '60-A4a', processNo: '60', category: 'A', itemCode: 'A4', value: '외관', createdAt: new Date() },
  { id: '60-A4b', processNo: '60', category: 'A', itemCode: 'A4', value: '치수 정밀도', specialChar: '◇', createdAt: new Date() },
  { id: '60-A4c', processNo: '60', category: 'A', itemCode: 'A4', value: '기능 시험', specialChar: '◇', createdAt: new Date() },
  { id: '60-A5a', processNo: '60', category: 'A', itemCode: 'A5', value: '외관 불량 미검출', createdAt: new Date() },
  { id: '60-A5b', processNo: '60', category: 'A', itemCode: 'A5', value: '치수 불량 미검출', createdAt: new Date() },
  { id: '60-A5c', processNo: '60', category: 'A', itemCode: 'A5', value: '기능 불량 미검출', createdAt: new Date() },

  // ════════════════════════════════════════════════════════════════
  // B계열: L3 작업요소 레벨 (01 공통 MN + 10~60 MC/IM)
  // ════════════════════════════════════════════════════════════════

  // ── 01 공통 (MN: 사람) ──────────────────────────────────────
  { id: '01-B1a', processNo: '01', category: 'B', itemCode: 'B1', value: '작업자', m4: 'MN', createdAt: new Date() },
  { id: '01-B2a', processNo: '01', category: 'B', itemCode: 'B2', value: '작업자가 작업표준을 준수하고 소재를 가공하여 생산품을 이송한다', m4: 'MN', createdAt: new Date() },
  { id: '01-B3a', processNo: '01', category: 'B', itemCode: 'B3', value: '작업표준 준수', m4: 'MN', belongsTo: '작업자', createdAt: new Date() },
  { id: '01-B4a', processNo: '01', category: 'B', itemCode: 'B4', value: '작업 실수', m4: 'MN', createdAt: new Date() },
  { id: '01-B1b', processNo: '01', category: 'B', itemCode: 'B1', value: '검사원', m4: 'MN', createdAt: new Date() },
  { id: '01-B2b', processNo: '01', category: 'B', itemCode: 'B2', value: '검사원이 검사결과를 확인하고 합부를 판정한다', m4: 'MN', createdAt: new Date() },
  { id: '01-B3b', processNo: '01', category: 'B', itemCode: 'B3', value: '판정 일관성', m4: 'MN', belongsTo: '검사원', createdAt: new Date() },
  { id: '01-B4b', processNo: '01', category: 'B', itemCode: 'B4', value: '판정 정확도 부족', m4: 'MN', createdAt: new Date() },

  // ── 10 컷팅 ─────────────────────────────────────────────────
  { id: '10-B1a', processNo: '10', category: 'B', itemCode: 'B1', value: '절단기', m4: 'MC', createdAt: new Date() },
  { id: '10-B2a', processNo: '10', category: 'B', itemCode: 'B2', value: '절단기가 지정 속도(RPM)로 소재를 절단하여 치수 정밀도를 제공한다', m4: 'MC', createdAt: new Date() },
  { id: '10-B3a', processNo: '10', category: 'B', itemCode: 'B3', value: '절단 속도(RPM)', m4: 'MC', belongsTo: '절단기', createdAt: new Date() },
  { id: '10-B4a', processNo: '10', category: 'B', itemCode: 'B4', value: '절단 속도 불균일', m4: 'MC', createdAt: new Date() },
  { id: '10-B1b', processNo: '10', category: 'B', itemCode: 'B1', value: '절단공구', m4: 'MC', createdAt: new Date() },
  { id: '10-B2b', processNo: '10', category: 'B', itemCode: 'B2', value: '절단공구가 절삭력을 제공하여 소재 절단면 품질을 확보한다', m4: 'MC', createdAt: new Date() },
  { id: '10-B3b', processNo: '10', category: 'B', itemCode: 'B3', value: '공구 교환주기', m4: 'MC', belongsTo: '절단공구', createdAt: new Date() },
  { id: '10-B4b', processNo: '10', category: 'B', itemCode: 'B4', value: '공구 교환주기 초과', m4: 'MC', createdAt: new Date() },

  // ── 20 프레스 ───────────────────────────────────────────────
  { id: '20-B1a', processNo: '20', category: 'B', itemCode: 'B1', value: '프레스', m4: 'MC', createdAt: new Date() },
  { id: '20-B2a', processNo: '20', category: 'B', itemCode: 'B2', value: '프레스가 설정 압력으로 성형하여 소재 형상을 제공한다', m4: 'MC', createdAt: new Date() },
  { id: '20-B3a', processNo: '20', category: 'B', itemCode: 'B3', value: '프레스 압력', m4: 'MC', belongsTo: '프레스', specialChar: '◆', createdAt: new Date() },
  { id: '20-B4a', processNo: '20', category: 'B', itemCode: 'B4', value: '프레스 압력 미달', m4: 'MC', createdAt: new Date() },
  { id: '20-B1b', processNo: '20', category: 'B', itemCode: 'B1', value: '금형/지그', m4: 'MC', createdAt: new Date() },
  { id: '20-B2b', processNo: '20', category: 'B', itemCode: 'B2', value: '금형이 소재를 정위치에 고정하여 성형 치수를 제공한다', m4: 'MC', createdAt: new Date() },
  { id: '20-B3b', processNo: '20', category: 'B', itemCode: 'B3', value: '금형 위치', m4: 'MC', belongsTo: '금형/지그', createdAt: new Date() },
  { id: '20-B4b', processNo: '20', category: 'B', itemCode: 'B4', value: '금형 위치 이탈', m4: 'MC', createdAt: new Date() },

  // ── 30 용접 ─────────────────────────────────────────────────
  { id: '30-B1a', processNo: '30', category: 'B', itemCode: 'B1', value: '용접기', m4: 'MC', createdAt: new Date() },
  { id: '30-B2a', processNo: '30', category: 'B', itemCode: 'B2', value: '용접기가 전압/전류를 인가하여 아크열로 소재 접합을 제공한다', m4: 'MC', createdAt: new Date() },
  { id: '30-B3a', processNo: '30', category: 'B', itemCode: 'B3', value: '용접전압', m4: 'MC', belongsTo: '용접기', specialChar: '◆', createdAt: new Date() },
  { id: '30-B3b', processNo: '30', category: 'B', itemCode: 'B3', value: '용접전류', m4: 'MC', belongsTo: '용접기', specialChar: '◆', createdAt: new Date() },
  { id: '30-B4a', processNo: '30', category: 'B', itemCode: 'B4', value: '용접 전압 불균일', m4: 'MC', createdAt: new Date() },
  { id: '30-B4b', processNo: '30', category: 'B', itemCode: 'B4', value: '용접 전류 불균일', m4: 'MC', createdAt: new Date() },
  { id: '30-B1b', processNo: '30', category: 'B', itemCode: 'B1', value: '용접봉/와이어', m4: 'IM', createdAt: new Date() },
  { id: '30-B2b', processNo: '30', category: 'B', itemCode: 'B2', value: '용접봉이 용융되어 모재와 접합부 충전재를 제공한다', m4: 'IM', createdAt: new Date() },
  { id: '30-B4c', processNo: '30', category: 'B', itemCode: 'B4', value: '용접봉 품질 부적합', m4: 'IM', createdAt: new Date() },

  // ── 40 도장 ─────────────────────────────────────────────────
  { id: '40-B1a', processNo: '40', category: 'B', itemCode: 'B1', value: '도장설비', m4: 'MC', createdAt: new Date() },
  { id: '40-B2a', processNo: '40', category: 'B', itemCode: 'B2', value: '도장설비가 설정 압력으로 도료를 분사하여 균일한 도막을 제공한다', m4: 'MC', createdAt: new Date() },
  { id: '40-B3a', processNo: '40', category: 'B', itemCode: 'B3', value: '도장 압력', m4: 'MC', belongsTo: '도장설비', createdAt: new Date() },
  { id: '40-B3b', processNo: '40', category: 'B', itemCode: 'B3', value: '도장 거리', m4: 'MC', belongsTo: '도장설비', createdAt: new Date() },
  { id: '40-B3c', processNo: '40', category: 'B', itemCode: 'B3', value: '건조 온도/시간', m4: 'MC', belongsTo: '도장설비', specialChar: '◆', createdAt: new Date() },
  { id: '40-B4a', processNo: '40', category: 'B', itemCode: 'B4', value: '도장 압력 불균일', m4: 'MC', createdAt: new Date() },
  { id: '40-B4b', processNo: '40', category: 'B', itemCode: 'B4', value: '도장 거리 편차', m4: 'MC', createdAt: new Date() },
  { id: '40-B4c', processNo: '40', category: 'B', itemCode: 'B4', value: '건조 조건 이탈', m4: 'MC', createdAt: new Date() },

  // ── 50 조립 ─────────────────────────────────────────────────
  { id: '50-B1a', processNo: '50', category: 'B', itemCode: 'B1', value: '체결공구', m4: 'MC', createdAt: new Date() },
  { id: '50-B2a', processNo: '50', category: 'B', itemCode: 'B2', value: '체결공구가 규정 토크를 인가하여 체결 상태를 제공한다', m4: 'MC', createdAt: new Date() },
  { id: '50-B3a', processNo: '50', category: 'B', itemCode: 'B3', value: '체결 토크', m4: 'MC', belongsTo: '체결공구', specialChar: '◆', createdAt: new Date() },
  { id: '50-B4a', processNo: '50', category: 'B', itemCode: 'B4', value: '체결 토크 미달/과다', m4: 'MC', createdAt: new Date() },
  { id: '50-B1b', processNo: '50', category: 'B', itemCode: 'B1', value: '조립공구', m4: 'MC', createdAt: new Date() },
  { id: '50-B2b', processNo: '50', category: 'B', itemCode: 'B2', value: '조립공구가 정위치 가이드를 제공하여 부품 조립 정확도를 확보한다', m4: 'MC', createdAt: new Date() },
  { id: '50-B3b', processNo: '50', category: 'B', itemCode: 'B3', value: '조립 순서', m4: 'MC', belongsTo: '조립공구', createdAt: new Date() },
  { id: '50-B4b', processNo: '50', category: 'B', itemCode: 'B4', value: '조립 순서 오류', m4: 'MC', createdAt: new Date() },

  // ── 60 검사 ─────────────────────────────────────────────────
  { id: '60-B1a', processNo: '60', category: 'B', itemCode: 'B1', value: '측정장비', m4: 'MC', createdAt: new Date() },
  { id: '60-B2a', processNo: '60', category: 'B', itemCode: 'B2', value: '측정장비가 측정값을 산출하여 외관/치수 합부 데이터를 제공한다', m4: 'MC', createdAt: new Date() },
  { id: '60-B3a', processNo: '60', category: 'B', itemCode: 'B3', value: '측정 정밀도', m4: 'MC', belongsTo: '측정장비', createdAt: new Date() },
  { id: '60-B4a', processNo: '60', category: 'B', itemCode: 'B4', value: '측정 오차', m4: 'MC', createdAt: new Date() },
  { id: '60-B1b', processNo: '60', category: 'B', itemCode: 'B1', value: '시험장비', m4: 'MC', createdAt: new Date() },
  { id: '60-B2b', processNo: '60', category: 'B', itemCode: 'B2', value: '시험장비가 기능시험을 수행하여 합부 결과를 제공한다', m4: 'MC', createdAt: new Date() },
  { id: '60-B3b', processNo: '60', category: 'B', itemCode: 'B3', value: '판정 기준', m4: 'MC', belongsTo: '시험장비', createdAt: new Date() },
  { id: '60-B4b', processNo: '60', category: 'B', itemCode: 'B4', value: '판정 기준 오적용', m4: 'MC', createdAt: new Date() },

  // ════════════════════════════════════════════════════════════════
  // C계열: L1 완제품 레벨 (YP/SP/USER)
  // ════════════════════════════════════════════════════════════════

  // ── YP (자사공장) ───────────────────────────────────────────
  { id: 'C1-YP', processNo: 'YP', category: 'C', itemCode: 'C1', value: 'YP', createdAt: new Date() },
  { id: 'C2-YPa', processNo: 'YP', category: 'C', itemCode: 'C2', value: '치수 정밀도를 유지한다', createdAt: new Date() },
  { id: 'C2-YPb', processNo: 'YP', category: 'C', itemCode: 'C2', value: '구조적 무결성을 확보한다', createdAt: new Date() },
  { id: 'C3-YPa', processNo: 'YP', category: 'C', itemCode: 'C3', value: '치수 공차 ±허용공차 이내 (소재 외경/두께/길이)', createdAt: new Date() },
  { id: 'C3-YPb', processNo: 'YP', category: 'C', itemCode: 'C3', value: '접합부 강도 기준값 이상 (용접강도 미달 방지)', createdAt: new Date() },
  { id: 'C3-YPc', processNo: 'YP', category: 'C', itemCode: 'C3', value: '작업 하중 한도 준수 (프레스 압력, 체결 토크)', createdAt: new Date() },
  { id: 'C3-YPd', processNo: 'YP', category: 'C', itemCode: 'C3', value: '외관 결함 부재 (BURR, 도막 불량, 스크래치)', createdAt: new Date() },
  { id: 'C4-YPa', processNo: 'YP', category: 'C', itemCode: 'C4', value: '조립 불능으로 인한 재작업/폐기', createdAt: new Date() },
  { id: 'C4-YPb', processNo: 'YP', category: 'C', itemCode: 'C4', value: '사용자 안전 사고 위험', createdAt: new Date() },
  { id: 'C4-YPc', processNo: 'YP', category: 'C', itemCode: 'C4', value: '주행 성능 상실', createdAt: new Date() },
  { id: 'C4-YPd', processNo: 'YP', category: 'C', itemCode: 'C4', value: '고객 불만 및 브랜드 신뢰도 하락', createdAt: new Date() },

  // ── SP (고객/후공정) ────────────────────────────────────────
  { id: 'C1-SP', processNo: 'SP', category: 'C', itemCode: 'C1', value: 'SP', createdAt: new Date() },
  { id: 'C2-SPa', processNo: 'SP', category: 'C', itemCode: 'C2', value: '표면 보호 및 심미성을 유지한다', createdAt: new Date() },
  { id: 'C2-SPb', processNo: 'SP', category: 'C', itemCode: 'C2', value: '법규 및 고객요구사항을 충족한다', createdAt: new Date() },
  { id: 'C3-SPa', processNo: 'SP', category: 'C', itemCode: 'C3', value: '도막 두께 규격 준수 (전착 도막 ≥ 기준값 μm)', createdAt: new Date() },
  { id: 'C3-SPb', processNo: 'SP', category: 'C', itemCode: 'C3', value: '유해물질 불검출 (RoHS/REACH 규제 준수)', createdAt: new Date() },
  { id: 'C4-SPa', processNo: 'SP', category: 'C', itemCode: 'C4', value: '내구성 저하 및 외관 손상', createdAt: new Date() },
  { id: 'C4-SPb', processNo: 'SP', category: 'C', itemCode: 'C4', value: '법적 규제위반으로 판매 중지 및 리콜 조치', createdAt: new Date() },

  // ── USER (사용자) ───────────────────────────────────────────
  { id: 'C1-USER', processNo: 'USER', category: 'C', itemCode: 'C1', value: 'USER', createdAt: new Date() },
  { id: 'C2-USERa', processNo: 'USER', category: 'C', itemCode: 'C2', value: '주행 안정성을 요구한다', createdAt: new Date() },
  { id: 'C2-USERb', processNo: 'USER', category: 'C', itemCode: 'C2', value: '내구성 및 안전성을 요구한다', createdAt: new Date() },
  { id: 'C3-USERa', processNo: 'USER', category: 'C', itemCode: 'C3', value: '내구성 기준 충족 — KS D ISO 4210 피로시험 합격', createdAt: new Date() },
  { id: 'C3-USERb', processNo: 'USER', category: 'C', itemCode: 'C3', value: '변형 미발생 — 주행 중 프레임 영구변형 없음', createdAt: new Date() },
  { id: 'C3-USERc', processNo: 'USER', category: 'C', itemCode: 'C3', value: '주행 안전성 확보 — 제동/조향/구동 기능 정상', createdAt: new Date() },
  { id: 'C3-USERd', processNo: 'USER', category: 'C', itemCode: 'C3', value: '안전 기준 KS D ISO 4210 자전거 안전요건 준수', createdAt: new Date() },
  { id: 'C3-USERe', processNo: 'USER', category: 'C', itemCode: 'C3', value: '환경 친화적 설계 (재활용 적합 재료 사용)', createdAt: new Date() },
  { id: 'C3-USERf', processNo: 'USER', category: 'C', itemCode: 'C3', value: '작업자 잠재적 오용 발생 시 안전 확보', createdAt: new Date() },
  { id: 'C4-USERa', processNo: 'USER', category: 'C', itemCode: 'C4', value: '제품 수명 단축 및 중도 파손', createdAt: new Date() },
  { id: 'C4-USERb', processNo: 'USER', category: 'C', itemCode: 'C4', value: '주행 불안정 및 안전성 위협', createdAt: new Date() },
];

// 드롭다운 항목 (L2: 공정/고장형태, L3: 작업요소/고장원인, L1: 완제품/고장영향)
/**
 * 미리보기 옵션 - value는 내부 코드(A1~C4), label은 신규 시트명(L1-1~L3-5)
 *
 * sheetName: 템플릿 다운로드 시 생성되는 실제 Excel 시트 이름
 * colIndex: 해당 시트에서 데이터가 위치하는 열 인덱스 (1-based)
 * - A1(공정번호)과 A2(공정명)은 'L2-1(A1) 공정번호' 시트에 함께 있음 (1열, 2열)
 */
// v3.0: A6(검출관리), B5(예방관리) IMPORT 제외 → 리스크 탭에서 입력
export const PREVIEW_OPTIONS = [
  // L2 레벨 (공정) - 시트명: L2-1 ~ L2-3 (수동모드: 구조+기능까지)
  { value: 'A1', label: 'L2-1(A1) 공정번호', sheetName: 'L2-1(A1) 공정번호', colIndex: 1 },
  { value: 'A2', label: 'L2-2(A2) 공정명', sheetName: 'L2-1(A1) 공정번호', colIndex: 2 },  // A1 시트 2열에 포함
  { value: 'A3', label: 'L2-3(A3) 공정기능', sheetName: 'L2-3(A3) 공정기능', colIndex: 2 },
  // L3 레벨 (작업요소) - 시트명: L3-1 ~ L3-2 (수동모드: 구조+기능까지)
  { value: 'B1', label: 'L3-1(B1) 작업요소', sheetName: 'L3-1(B1) 작업요소', colIndex: 2 },
  { value: 'B2', label: 'L3-2(B2) 요소기능', sheetName: 'L3-2(B2) 요소기능', colIndex: 2 },
  // L1 레벨 (완제품) - 시트명: L1-1 ~ L1-4 (고장영향까지)
  { value: 'C1', label: 'L1-1(C1) 구분', sheetName: 'L1-1(C1) 구분', colIndex: 1 },  // YOUR PLANT, SHIP TO PLANT, USER
  { value: 'C2', label: 'L1-2(C2) 제품기능', sheetName: 'L1-2(C2) 제품기능', colIndex: 2 },
  { value: 'C3', label: 'L1-3(C3) 요구사항', sheetName: 'L1-3(C3) 요구사항', colIndex: 2 },
  { value: 'C4', label: 'L1-4(C4) 고장영향', sheetName: 'L1-4(C4) 고장영향', colIndex: 2 },
];
