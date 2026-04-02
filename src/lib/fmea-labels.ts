/**
 * @file fmea-labels.ts
 * @description PFMEA/DFMEA 공용 라벨 설정 — 워크시트 탭 헤더 동적 전환용
 *
 * 사용법:
 *   import { getFmeaLabels } from '@/lib/fmea-labels';
 *   const lb = getFmeaLabels(isDfmea);
 *   // lb.prefix → "P-FMEA" or "D-FMEA"
 *   // lb.l1 → "완제품 공정명" or "최상위 시스템명"
 */

export interface FmeaLabels {
  /** "P-FMEA" or "D-FMEA" */
  prefix: string;

  // ── 구조분석 (2단계) ──
  /** L1 구조명 풀네임: "완제품 공정명" / "최상위 시스템명" */
  l1: string;
  /** L1 짧은 이름: "완제품공정명" / "시스템명" */
  l1Short: string;
  /** L1 영문: "Product Process" / "Top System" */
  l1En: string;
  /** L2 구조명: "메인 공정명" / "초점요소명" */
  l2: string;
  /** L2 NO+ 접두: "NO+공정명" / "NO+초점요소" */
  l2No: string;
  /** L2 짧은 이름: "메인공정" / "초점요소" */
  l2Short: string;
  /** L2 영문: "Main Process" / "Focus Element" */
  l2En: string;
  /** L3 구조명: "작업 요소명" / "부품(컴포넌트)명" */
  l3: string;
  /** L3 짧은 이름: "작업요소" / "부품" */
  l3Short: string;
  /** L3 영문: "Work Element" / "Component" */
  l3En: string;
  /** L3 속성: "4M" / "Type" */
  l3Attr: string;

  // ── 기능분석 (3단계) ──
  /** L1 기능그룹: "완제품 공정기능/요구사항" / "시스템 기능/요구사항" */
  l1FuncGroup: string;
  /** L1 기능그룹 영문 */
  l1FuncGroupEn: string;
  /** L2 기능그룹: "메인공정기능 및 제품특성" / "초점요소 기능 및 제품특성" */
  l2FuncGroup: string;
  /** L2 기능그룹 영문 */
  l2FuncGroupEn: string;
  /** L3 기능그룹: "작업요소의 기능 및 공정특성" / "부품 기능 및 설계특성" */
  l3FuncGroup: string;
  /** L3 기능그룹 영문 */
  l3FuncGroupEn: string;
  /** L1 기능 짧은: "완제품기능" / "시스템기능" */
  l1Func: string;
  /** L1 기능 영문 */
  l1FuncEn: string;
  /** L2 기능 짧은: "공정기능" / "초점요소기능" */
  l2Func: string;
  /** L2 기능 영문 */
  l2FuncEn: string;
  /** L3 기능 짧은: "작업요소기능" / "부품기능" */
  l3Func: string;
  /** L3 기능 영문 */
  l3FuncEn: string;
  /** L2 특성: "제품특성" / "요구사항" */
  l2Char: string;
  /** L2 특성 영문 */
  l2CharEn: string;
  /** L3 특성: "공정특성" / "설계특성" */
  l3Char: string;
  /** L3 특성 영문 */
  l3CharEn: string;

  // ── 고장분석 (4단계) ──
  /** L2 고장형태: "메인공정 고장형태(FM)" / "초점요소 고장형태(FM)" */
  l2Failure: string;
  /** L3 고장원인: "작업요소 고장원인(FC)" / "부품 고장원인(FC)" */
  l3Failure: string;

  // ── AllTabAtomic BR 형식 ──
  /** "1.완제품<br />공정명" / "1.시스템<br />명" */
  l1Br: string;
  /** "2.메인<br />공정명" / "2.초점<br />요소명" */
  l2Br: string;
  /** "3.작업<br />요소명" / "3.부품<br />(컴포넌트)명" */
  l3Br: string;
  /** "완제품<br />공정명" / "시스템<br />명" */
  l1CellBr: string;
  /** "NO+<br />공정명" / "NO+<br />초점요소" */
  l2CellBr: string;
  /** "작업<br />요소" / "부품" */
  l3CellBr: string;
  /** "1.완제품공정기능<br />/요구사항" / "1.시스템기능<br />/요구사항" */
  l1FuncBr: string;
  /** "2.메인공정기능<br />및 제품특성" / "2.초점요소기능<br />및 제품특성" */
  l2FuncBr: string;
  /** "3.작업요소기능<br />및 공정특성" / "3.부품기능<br />및 설계특성" */
  l3FuncBr: string;
  /** "완제품<br />기능" / "시스템<br />기능" */
  l1FuncCellBr: string;
  /** "공정<br />기능" / "초점요소<br />기능" */
  l2FuncCellBr: string;
  /** "작업요소<br />기능" / "부품<br />기능" */
  l3FuncCellBr: string;
  /** "공정<br />특성" / "설계<br />특성" */
  l3CharCellBr: string;
  /** "2.메인공정<br />고장형태(FM)" / "2.초점요소<br />고장형태(FM)" */
  l2FailureBr: string;
  /** "3.작업요소<br />고장원인(FC)" / "3.부품<br />고장원인(FC)" */
  l3FailureBr: string;
}

const PFMEA_LABELS: FmeaLabels = {
  prefix: 'P-FMEA',

  l1: '완제품 공정명',
  l1Short: '완제품공정명',
  l1En: 'Product Process',
  l2: '메인 공정명',
  l2Short: '메인공정',
  l2No: 'NO+공정명',
  l2En: 'Main Process',
  l3: '작업 요소명',
  l3Short: '작업요소',
  l3En: 'Work Element',
  l3Attr: '4M',

  l1FuncGroup: '완제품 공정기능/요구사항',
  l1FuncGroupEn: 'Function/Requirements',
  l2FuncGroup: '메인공정기능 및 제품특성',
  l2FuncGroupEn: 'Function & Product Char.',
  l3FuncGroup: '작업요소의 기능 및 공정특성',
  l3FuncGroupEn: 'Function & Process Char.',
  l1Func: '완제품기능',
  l1FuncEn: 'Product Function',
  l2Func: '공정기능',
  l2FuncEn: 'Process Function',
  l3Func: '작업요소기능',
  l3FuncEn: 'Work Element Function',
  l2Char: '제품특성',
  l2CharEn: 'Product Char.',
  l3Char: '공정특성',
  l3CharEn: 'Process Char.',

  l2Failure: '메인공정 고장형태(FM)',
  l3Failure: '작업요소 고장원인(FC)',

  l1Br: '1.완제품<br />공정명',
  l2Br: '2.메인<br />공정명',
  l3Br: '3.작업<br />요소명',
  l1CellBr: '완제품<br />공정명',
  l2CellBr: 'NO+<br />공정명',
  l3CellBr: '작업<br />요소',
  l1FuncBr: '1.완제품공정기능<br />/요구사항',
  l2FuncBr: '2.메인공정기능<br />및 제품특성',
  l3FuncBr: '3.작업요소기능<br />및 공정특성',
  l1FuncCellBr: '완제품<br />기능',
  l2FuncCellBr: '공정<br />기능',
  l3FuncCellBr: '작업요소<br />기능',
  l3CharCellBr: '공정<br />특성',
  l2FailureBr: '2.메인공정<br />고장형태(FM)',
  l3FailureBr: '3.작업요소<br />고장원인(FC)',
};

const DFMEA_LABELS: FmeaLabels = {
  prefix: 'D-FMEA',

  l1: '다음 상위수준',
  l1Short: '제품명',
  l1En: 'Next Higher Level',
  l2: '초점 요소',
  l2Short: '초점요소',
  l2No: '초점요소',
  l2En: 'Focus Element',
  l3: '다음 하위수준',
  l3Short: '부품',
  l3En: 'Next Lower Level',
  l3Attr: '타입',

  l1FuncGroup: '다음상위수준 기능',
  l1FuncGroupEn: 'Next Higher Level Function',
  l2FuncGroup: '초점요소 기능 및 요구사항',
  l2FuncGroupEn: 'Focus Element Function & Requirements',
  l3FuncGroup: '다음하위수준/특성유형',
  l3FuncGroupEn: 'Next Lower Level / Char. Type',
  l1Func: '제품 기능',
  l1FuncEn: 'Product Function',
  l2Func: '초점요소 기능',
  l2FuncEn: 'Focus Element Function',
  l3Func: '부품 기능 또는 특성',
  l3FuncEn: 'Component Function or Char.',
  l2Char: '요구사항',
  l2CharEn: 'Requirements',
  l3Char: '요구사항',
  l3CharEn: 'Requirements',

  l2Failure: '초점요소 고장 형태(FM)',
  l3Failure: '다음하위 수준 고장원인(FC)',

  l1Br: '1.다음 상위<br />수준',
  l2Br: '2.초점<br />요소',
  l3Br: '3.다음 하위<br />수준',
  l1CellBr: '제품<br />명',
  l2CellBr: '초점<br />요소',
  l3CellBr: '부품',
  l1FuncBr: '1.다음상위수준<br />기능',
  l2FuncBr: '2.초점요소기능<br />및 요구사항',
  l3FuncBr: '3.다음하위수준<br />/특성유형',
  l1FuncCellBr: '제품<br />기능',
  l2FuncCellBr: '초점요소<br />기능',
  l3FuncCellBr: '부품 기능<br />또는 특성',
  l3CharCellBr: '요구<br />사항',
  l2FailureBr: '2.초점요소<br />고장형태(FM)',
  l3FailureBr: '3.다음하위 수준<br />고장원인(FC)',
};

/** isDfmea 플래그에 따라 PFMEA/DFMEA 라벨 반환 */
export function getFmeaLabels(isDfmea: boolean): FmeaLabels {
  return isDfmea ? DFMEA_LABELS : PFMEA_LABELS;
}
