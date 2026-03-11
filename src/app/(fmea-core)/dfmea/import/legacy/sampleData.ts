/**
 * @file sampleData.ts
 * @description 초기 샘플 데이터 — 자전거 프레임 (sample-001)
 * Legacy 모드 기본 미리보기용
 * @created 2026-02-26
 */

import type { ImportedFlatData } from '../types';

export const INITIAL_SAMPLE_DATA: ImportedFlatData[] = [
  // L2 (A카테고리) — 3공정: 파이프 절단 / 프레임 용접 / 도장
  { id: 's1', processNo: '10', category: 'A', itemCode: 'A1', value: '10', createdAt: new Date() },
  { id: 's2', processNo: '10', category: 'A', itemCode: 'A2', value: '파이프 절단(예시)', createdAt: new Date() },
  { id: 's3', processNo: '10', category: 'A', itemCode: 'A3', value: '알루미늄 파이프 규격별 정밀 절단(예시)', createdAt: new Date() },
  { id: 's4', processNo: '10', category: 'A', itemCode: 'A4', value: '절단 길이, 절단면 직각도(예시)', createdAt: new Date() },
  { id: 's5', processNo: '10', category: 'A', itemCode: 'A5', value: '길이 불량, 절단면 버(Burr)(예시)', createdAt: new Date() },
  { id: 's6', processNo: '10', category: 'A', itemCode: 'A6', value: '길이 측정, 외관검사(예시)', createdAt: new Date() },
  { id: 's7', processNo: '20', category: 'A', itemCode: 'A1', value: '20', createdAt: new Date() },
  { id: 's8', processNo: '20', category: 'A', itemCode: 'A2', value: '프레임 용접(예시)', createdAt: new Date() },
  { id: 's9', processNo: '20', category: 'A', itemCode: 'A3', value: '알루미늄 프레임 TIG 용접(예시)', createdAt: new Date() },
  { id: 's10', processNo: '20', category: 'A', itemCode: 'A4', value: '용접강도, 비드외관(예시)', createdAt: new Date() },
  { id: 's11', processNo: '20', category: 'A', itemCode: 'A5', value: '용접불량, 기공발생(예시)', createdAt: new Date() },
  { id: 's12', processNo: '20', category: 'A', itemCode: 'A6', value: '용접부 외관검사, X-ray(예시)', createdAt: new Date() },
  { id: 's13', processNo: '30', category: 'A', itemCode: 'A1', value: '30', createdAt: new Date() },
  { id: 's14', processNo: '30', category: 'A', itemCode: 'A2', value: '도장(예시)', createdAt: new Date() },
  { id: 's15', processNo: '30', category: 'A', itemCode: 'A3', value: '전처리 후 분체 도장(예시)', createdAt: new Date() },
  { id: 's16', processNo: '30', category: 'A', itemCode: 'A4', value: '도막 두께, 부착력(예시)', createdAt: new Date() },
  { id: 's17', processNo: '30', category: 'A', itemCode: 'A5', value: '도막 벗겨짐, 두께 부족(예시)', createdAt: new Date() },
  { id: 's18', processNo: '30', category: 'A', itemCode: 'A6', value: '도막 두께 측정, 부착력 시험(예시)', createdAt: new Date() },
  // L3 (B카테고리) — 공정별 4M+작업요소
  // 공정10: 파이프 절단 — MN(운전자) + MC(절단기)
  { id: 's19', processNo: '10', category: 'B', itemCode: 'B1', value: '절단기 운전자(예시)', m4: 'MN', createdAt: new Date() },
  { id: 's20', processNo: '10', category: 'B', itemCode: 'B2', value: '파이프를 도면에서 지정된 길이로 절단한다(예시)', m4: 'MN', createdAt: new Date() },
  { id: 's21', processNo: '10', category: 'B', itemCode: 'B3', value: '절단 길이(예시)', m4: 'MN', createdAt: new Date() },
  { id: 's22', processNo: '10', category: 'B', itemCode: 'B4', value: '절단 길이 오류(예시)', m4: 'MN', createdAt: new Date() },
  { id: 's23', processNo: '10', category: 'B', itemCode: 'B5', value: '작업표준서 교육(예시)', m4: 'MN', createdAt: new Date() },
  { id: 's36', processNo: '10', category: 'B', itemCode: 'B1', value: 'CNC 절단기(예시)', m4: 'MC', createdAt: new Date() },
  { id: 's37', processNo: '10', category: 'B', itemCode: 'B2', value: '파이프 정밀 절단(예시)', m4: 'MC', createdAt: new Date() },
  { id: 's38', processNo: '10', category: 'B', itemCode: 'B3', value: '절단 속도, 이송량(예시)', m4: 'MC', createdAt: new Date() },
  { id: 's39', processNo: '10', category: 'B', itemCode: 'B4', value: '절단 속도 이탈(예시)', m4: 'MC', createdAt: new Date() },
  { id: 's40', processNo: '10', category: 'B', itemCode: 'B5', value: '절단기 일상점검(예시)', m4: 'MC', createdAt: new Date() },
  // 공정20: 프레임 용접 — MN(용접사) + MC(용접기)
  { id: 's41', processNo: '20', category: 'B', itemCode: 'B1', value: '용접 작업자(예시)', m4: 'MN', createdAt: new Date() },
  { id: 's42', processNo: '20', category: 'B', itemCode: 'B2', value: '프레임 접합부를 TIG 용접한다(예시)', m4: 'MN', createdAt: new Date() },
  { id: 's43', processNo: '20', category: 'B', itemCode: 'B3', value: '용접전류(예시)', m4: 'MN', createdAt: new Date() },
  { id: 's44', processNo: '20', category: 'B', itemCode: 'B4', value: '용접전류 미설정(예시)', m4: 'MN', createdAt: new Date() },
  { id: 's45', processNo: '20', category: 'B', itemCode: 'B5', value: '용접사 자격 관리(예시)', m4: 'MN', createdAt: new Date() },
  { id: 's46', processNo: '20', category: 'B', itemCode: 'B1', value: 'TIG 용접기(예시)', m4: 'MC', createdAt: new Date() },
  { id: 's47', processNo: '20', category: 'B', itemCode: 'B2', value: '알루미늄 프레임 TIG 용접(예시)', m4: 'MC', createdAt: new Date() },
  { id: 's48', processNo: '20', category: 'B', itemCode: 'B3', value: '용접 비드 폭, 용입 깊이(예시)', m4: 'MC', createdAt: new Date() },
  { id: 's49', processNo: '20', category: 'B', itemCode: 'B4', value: '가스 유량 부족(예시)', m4: 'MC', createdAt: new Date() },
  { id: 's50', processNo: '20', category: 'B', itemCode: 'B5', value: '용접기 정기 보전(예시)', m4: 'MC', createdAt: new Date() },
  // 공정30: 도장 — MN(도장공) + MC(도장설비)
  { id: 's51', processNo: '30', category: 'B', itemCode: 'B1', value: '도장 작업자(예시)', m4: 'MN', createdAt: new Date() },
  { id: 's52', processNo: '30', category: 'B', itemCode: 'B2', value: '전처리 후 분체 도장을 실시한다(예시)', m4: 'MN', createdAt: new Date() },
  { id: 's53', processNo: '30', category: 'B', itemCode: 'B3', value: '도장 거리(예시)', m4: 'MN', createdAt: new Date() },
  { id: 's54', processNo: '30', category: 'B', itemCode: 'B4', value: '도장 거리 불균일(예시)', m4: 'MN', createdAt: new Date() },
  { id: 's55', processNo: '30', category: 'B', itemCode: 'B5', value: '도장 작업 교육(예시)', m4: 'MN', createdAt: new Date() },
  { id: 's56', processNo: '30', category: 'B', itemCode: 'B1', value: '분체 도장 설비(예시)', m4: 'MC', createdAt: new Date() },
  { id: 's57', processNo: '30', category: 'B', itemCode: 'B2', value: '분체 도료를 균일하게 도포한다(예시)', m4: 'MC', createdAt: new Date() },
  { id: 's58', processNo: '30', category: 'B', itemCode: 'B3', value: '도막 두께, 건조 온도(예시)', m4: 'MC', createdAt: new Date() },
  { id: 's59', processNo: '30', category: 'B', itemCode: 'B4', value: '도료 분사량 이상(예시)', m4: 'MC', createdAt: new Date() },
  { id: 's60', processNo: '30', category: 'B', itemCode: 'B5', value: '도장 설비 정기 점검(예시)', m4: 'MC', createdAt: new Date() },
  // L1 (C카테고리) — 완제품: YP/SP/USER
  { id: 's24', processNo: 'YP', category: 'C', itemCode: 'C1', value: 'YP', createdAt: new Date() },
  { id: 's25', processNo: 'SP', category: 'C', itemCode: 'C1', value: 'SP', createdAt: new Date() },
  { id: 's26', processNo: 'USER', category: 'C', itemCode: 'C1', value: 'USER', createdAt: new Date() },
  { id: 's27', processNo: 'YP', category: 'C', itemCode: 'C2', value: '프레임 강도 확보(예시)', createdAt: new Date() },
  { id: 's28', processNo: 'SP', category: 'C', itemCode: 'C2', value: '안전한 주행(예시)', createdAt: new Date() },
  { id: 's29', processNo: 'USER', category: 'C', itemCode: 'C2', value: '편안한 승차감(예시)', createdAt: new Date() },
  { id: 's30', processNo: 'YP', category: 'C', itemCode: 'C3', value: '용접강도 200MPa 이상(예시)', createdAt: new Date() },
  { id: 's31', processNo: 'SP', category: 'C', itemCode: 'C3', value: '내구성 5만km(예시)', createdAt: new Date() },
  { id: 's32', processNo: 'USER', category: 'C', itemCode: 'C3', value: '안전 기준 충족(예시)', createdAt: new Date() },
  { id: 's33', processNo: 'YP', category: 'C', itemCode: 'C4', value: '재작업, 폐기(예시)', createdAt: new Date() },
  { id: 's34', processNo: 'SP', category: 'C', itemCode: 'C4', value: '납기지연, 반품(예시)', createdAt: new Date() },
  { id: 's35', processNo: 'USER', category: 'C', itemCode: 'C4', value: '주행중 파손, 안전사고(예시)', createdAt: new Date() },
];
