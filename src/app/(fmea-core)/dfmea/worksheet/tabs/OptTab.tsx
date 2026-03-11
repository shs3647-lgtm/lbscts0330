/**
 * @file OptTab.tsx
 * @description FMEA 워크시트 - 최적화(6단계) 탭
 * 14열: 계획(4) + 결과 모니터링(3) + 효과 평가(7)
 * 서브그룹별 다른 색상 적용
 */
/**
 * ██████████████████████████████████████████████████████████████
 * ██  CODEFREEZE v3.1.0 — 이 파일을 수정하지 마세요!          ██
 * ██                                                          ██
 * ██  상태: DB중심 고장연결 + v3.0 아키텍처 완성 (2026-02-28)  ██
 * ██  검증: 270테스트 PASS / tsc 에러 0개                      ██
 * ██                                                          ██
 * ██  수정이 필요하면:                                         ██
 * ██  1. 반드시 별도 브랜치에서 작업                            ██
 * ██  2. 270 골든 테스트 전체 통과 필수                         ██
 * ██  3. 사용자 승인 후 머지                                   ██
 * ██████████████████████████████████████████████████████████████
 */


'use client';

import React from 'react';
import { WorksheetState, COLORS as GLOBAL_COLORS } from '../constants';
import { BiHeader } from './shared/BaseWorksheetComponents';

interface FlatRow {
  l1Id: string;
  l1Name: string;
  l2Id: string;
  l2No: string;
  l2Name: string;
  l3Id: string;
  m4: string;
  l3Name: string;
}

interface OptTabProps {
  state: WorksheetState;
  rows: FlatRow[];
  l1Spans: number[];
  l2Spans: number[];
}

const BORDER = '1px solid #b0bec5';

// 서브그룹별 색상 정의
const COLORS_OPT = {
  main: { bg: '#2e7d32', text: '#fff' },
  plan: { headerBg: '#bbdefb', cellBg: '#e3f2fd' },
  monitor: { headerBg: '#ffe0b2', cellBg: '#fff3e0' },
  effect: { headerBg: '#c8e6c9', cellBg: '#e8f5e9' },
};

// 컬럼 정의 (그룹별) - BiHeader용 { ko, en } 배열
const PLAN_COL_DEFS = [
  { ko: '예방관리개선', en: 'Prev. Improve' }, { ko: '검출관리개선', en: 'Det. Improve' },
  { ko: '책임자성명', en: 'Person' }, { ko: '목표완료일자', en: 'Target Date' },
];
const MONITOR_COL_DEFS = [
  { ko: '상태', en: 'Status' }, { ko: '개선결과근거', en: 'Result' }, { ko: '완료일자', en: 'Completion' },
];
const EFFECT_COL_DEFS = [
  { ko: '심각도', en: 'Severity' }, { ko: '발생도', en: 'Occurrence' }, { ko: '검출도', en: 'Detection' },
  { ko: '특별특성', en: 'SC' }, { ko: 'AP', en: '' }, { ko: 'RPN', en: '' }, { ko: '비고', en: 'Remark' },
];
// 행 렌더링용 카운트 (기존 호환)
const PLAN_COLS = PLAN_COL_DEFS;
const MONITOR_COLS = MONITOR_COL_DEFS;
const EFFECT_COLS = EFFECT_COL_DEFS;

// 스타일 함수화 (인라인 스타일 중복 제거)
const mainHeaderStyle = (colSpan: number): React.CSSProperties => ({
  background: COLORS_OPT.main.bg, color: COLORS_OPT.main.text, border: BORDER,
  padding: '6px', height: '28px', fontWeight: 900, fontSize: '12px', textAlign: 'center'
});

const subHeaderStyle = (bg: string): React.CSSProperties => ({
  background: bg, border: BORDER, padding: '4px', height: '24px', fontWeight: 700, fontSize: '12px', textAlign: 'center'
});

const colHeaderStyle = (bg: string): React.CSSProperties => ({
  background: bg, border: BORDER, padding: '3px', height: '22px', fontWeight: 600, fontSize: '12px', textAlign: 'center', whiteSpace: 'nowrap', boxShadow: 'inset 0 -2px 0 #2196f3'
});

const cellStyle = (bg: string): React.CSSProperties => ({
  background: bg, border: BORDER, padding: '3px 4px', height: '24px', fontSize: '12px', textAlign: 'center', verticalAlign: 'middle'
});

const cellInputStyle = (bg: string): React.CSSProperties => ({
  ...cellStyle(bg), padding: '0', textAlign: 'left'
});

const inputBaseStyle: React.CSSProperties = {
  width: '100%', height: '100%', border: 'none', background: 'transparent', fontSize: '12px', textAlign: 'center', outline: 'none'
};

/**
 * 최적화 헤더
 */
export function OptHeader() {
  return (
    <>
      {/* 1행: 대분류 */}
      <tr>
        <th colSpan={14} style={mainHeaderStyle(14)}>
          <BiHeader ko="D-FMEA 최적화" en="Optimization (6ST)" />
        </th>
      </tr>

      {/* 2행: 서브그룹 */}
      <tr>
        <th colSpan={4} style={subHeaderStyle(COLORS_OPT.plan.headerBg)}><BiHeader ko="계획" en="Plan" /></th>
        <th colSpan={3} style={subHeaderStyle(COLORS_OPT.monitor.headerBg)}><BiHeader ko="결과 모니터링" en="Result Monitoring" /></th>
        <th colSpan={7} style={subHeaderStyle(COLORS_OPT.effect.headerBg)}><BiHeader ko="효과 평가" en="Effect Evaluation" /></th>
      </tr>

      {/* 3행: 컬럼명 */}
      <tr>
        {PLAN_COL_DEFS.map(col => <th key={col.ko} style={colHeaderStyle(COLORS_OPT.plan.cellBg)}>{col.en ? <BiHeader ko={col.ko} en={col.en} /> : col.ko}</th>)}
        {MONITOR_COL_DEFS.map(col => <th key={col.ko} style={colHeaderStyle(COLORS_OPT.monitor.cellBg)}>{col.en ? <BiHeader ko={col.ko} en={col.en} /> : col.ko}</th>)}
        {EFFECT_COL_DEFS.map(col => <th key={col.ko} style={colHeaderStyle(COLORS_OPT.effect.cellBg)}>{col.en ? <BiHeader ko={col.ko} en={col.en} /> : col.ko}</th>)}
      </tr>
    </>
  );
}

// 행 셀 스타일
const rowCellStyle: React.CSSProperties = { border: BORDER, padding: '2px 4px', fontSize: '12px', background: '#fafafa' };
const rowCellCenterStyle: React.CSSProperties = { ...rowCellStyle, textAlign: 'center' };

/**
 * 최적화 행
 */
export function OptRow({ row }: { row: FlatRow }) {
  return (
    <>
      {PLAN_COL_DEFS.map((_, idx) => <td key={`plan-${idx}`} style={rowCellStyle}></td>)}
      {MONITOR_COL_DEFS.map((_, idx) => <td key={`monitor-${idx}`} style={rowCellStyle}></td>)}
      {EFFECT_COL_DEFS.map((_, idx) => <td key={`effect-${idx}`} style={rowCellCenterStyle}></td>)}
    </>
  );
}

/**
 * 최적화 탭 메인 컴포넌트
 */
export default function OptTab({ rows }: OptTabProps) {
  return (
    <>
      <colgroup>
        <col className="w-[90px]" /><col className="w-[90px]" /><col className="w-[70px]" /><col className="w-[80px]" />
        <col className="w-[50px]" /><col className="w-[100px]" /><col className="w-[70px]" />
        <col className="w-[45px]" /><col className="w-[45px]" /><col className="w-[45px]" /><col className="w-[60px]" /><col className="w-[35px]" /><col className="w-[40px]" /><col className="w-[80px]" />
      </colgroup>

      {/* 헤더 - 하단 2px 검은색 구분선 */}
      <thead className="sticky top-0 z-20 bg-white border-b-2 border-black">
        <OptHeader />
      </thead>

      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={14} className="text-center p-10 text-gray-400 text-xs">
              리스크분석을 먼저 완료해주세요.(Complete Risk Analysis first.)
            </td>
          </tr>
        ) : (
          rows.map((row, idx) => (
            <tr key={`opt-${row.l3Id}-${idx}`} className={`h-6 ${idx % 2 === 1 ? "bg-[#f5f5f5]" : "bg-white"}`}>
              <OptRow row={row} />
            </tr>
          ))
        )}
      </tbody>
    </>
  );
}

// ============ OptTabFull (구조~최적화 통합 40열 화면) ============
export function OptTabFull({ state, rows, l1Spans, l2Spans }: OptTabProps) {
  const BORDER_FULL = '1px solid #b0bec5';

  const COLORS = {
    structure: { main: '#1565c0', header: '#bbdefb', cell: '#e3f2fd' },
    function: { main: '#1b5e20', header: '#c8e6c9', cell: '#e8f5e9' },
    failure: { main: '#f57c00', header: '#ffe0b2', cell: '#fff3e0' },
    risk: { main: '#6a1b9a', prevention: { header: '#c8e6c9', cell: '#e8f5e9' }, detection: { header: '#bbdefb', cell: '#e3f2fd' }, evaluation: { header: '#f8bbd9', cell: '#fce4ec' } },
    opt: { main: '#2e7d32', plan: { header: '#bbdefb', cell: '#e3f2fd' }, monitor: { header: '#ffe0b2', cell: '#fff3e0' }, effect: { header: '#c8e6c9', cell: '#e8f5e9' } },
  };

  // 스타일 함수
  const mainH = (bg: string): React.CSSProperties => ({ background: bg, color: '#fff', border: BORDER_FULL, padding: '4px', height: '24px', fontWeight: 900, fontSize: '12px', textAlign: 'center' });
  const subH = (bg: string): React.CSSProperties => ({ background: bg, border: BORDER_FULL, padding: '2px', fontSize: '9px', textAlign: 'center' });
  const colH = (bg: string): React.CSSProperties => ({ background: bg, border: BORDER_FULL, padding: '2px', fontSize: '8px', textAlign: 'center' });
  const dataCellBase = (bg: string): React.CSSProperties => ({ border: BORDER_FULL, padding: '2px 3px', fontSize: '8px', background: bg });

  return (
    <>
      {/* 헤더 - 하단 2px 검은색 구분선 */}
      <thead className="sticky top-0 z-20 bg-white border-b-2 border-black">
        {/* 1행: 단계 대분류 */}
        <tr>
          <th colSpan={4} style={mainH(COLORS.structure.main)}><BiHeader ko="D-FMEA 구조 분석" en="Structure (2ST)" /></th>
          <th colSpan={8} style={mainH(COLORS.function.main)}><BiHeader ko="D-FMEA 기능 분석" en="Function (3ST)" /></th>
          <th colSpan={6} style={mainH('#f57c00')}><BiHeader ko="D-FMEA 고장 분석" en="Failure (4ST)" /></th>
          <th colSpan={8} style={mainH(COLORS.risk.main)}><BiHeader ko="D-FMEA 리스크 분석" en="Risk Analysis (5ST)" /></th>
          <th colSpan={14} style={mainH(COLORS.opt.main)}><BiHeader ko="D-FMEA 최적화" en="Optimization (6ST)" /></th>
        </tr>

        {/* 2행: 서브그룹 */}
        <tr>
          <th colSpan={1} style={subH(COLORS.structure.header)}><BiHeader ko="1. 완제품 공정명" en="Product Process" /></th>
          <th colSpan={1} style={subH(COLORS.structure.header)}><BiHeader ko="2. 메인 공정명" en="Main Process" /></th>
          <th colSpan={2} style={subH(COLORS.structure.header)}><BiHeader ko="3. 작업 요소명" en="Work Element" /></th>
          <th colSpan={3} style={subH(COLORS.function.header)}><BiHeader ko="1. 완제품 공정기능/요구사항" en="Function/Requirements" /></th>
          <th colSpan={2} style={subH(COLORS.function.header)}><BiHeader ko="2. 메인공정기능 및 제품특성" en="Function & Product Char." /></th>
          <th colSpan={3} style={subH(COLORS.function.header)}><BiHeader ko="3. 작업요소기능 및 공정특성" en="WE Func. & Process Char." /></th>
          <th colSpan={3} style={subH(COLORS.failure.header)}><BiHeader ko="1. 고장영향" en="Failure Effect/FE" /></th>
          <th colSpan={1} style={subH(COLORS.failure.header)}><BiHeader ko="2. 고장형태" en="Failure Mode/FM" /></th>
          <th colSpan={2} style={subH(COLORS.failure.header)}><BiHeader ko="3. 고장원인" en="Failure Cause/FC" /></th>
          <th colSpan={2} style={subH(COLORS.risk.prevention.header)}><BiHeader ko="현재 예방관리" en="Current Prevention" /></th>
          <th colSpan={2} style={subH(COLORS.risk.detection.header)}><BiHeader ko="현재 검출관리" en="Current Detection" /></th>
          <th colSpan={4} style={subH(COLORS.risk.evaluation.header)}><BiHeader ko="리스크 평가" en="Risk Evaluation" /></th>
          <th colSpan={4} style={subH(COLORS.opt.plan.header)}><BiHeader ko="계획" en="Plan" /></th>
          <th colSpan={3} style={subH(COLORS.opt.monitor.header)}><BiHeader ko="결과 모니터링" en="Result Monitoring" /></th>
          <th colSpan={7} style={subH(COLORS.opt.effect.header)}><BiHeader ko="효과 평가" en="Effect Evaluation" /></th>
        </tr>

        {/* 3행: 컬럼명 */}
        <tr>
          <th style={colH(COLORS.structure.cell)}><BiHeader ko="완제품공정명" en="Product" /></th>
          <th style={colH(COLORS.structure.cell)}><BiHeader ko="NO+공정명" en="Process" /></th>
          <th style={colH(COLORS.structure.cell)}>4M</th>
          <th style={colH(COLORS.structure.cell)}><BiHeader ko="작업요소" en="Work Element" /></th>
          {[{ko:'구분',en:'Type'},{ko:'완제품기능',en:'Product Func.'},{ko:'요구사항',en:'Requirements'},{ko:'공정기능',en:'Process Func.'},{ko:'제품특성',en:'Product Char.'},{ko:'작업요소',en:'WE'},{ko:'작업요소기능',en:'WE Func.'},{ko:'공정특성',en:'Process Char.'}].map(t => <th key={t.ko} style={colH(COLORS.function.cell)}><BiHeader ko={t.ko} en={t.en} /></th>)}
          {[{ko:'구분',en:'Type'},{ko:'고장영향',en:'FE'},{ko:'심각도',en:'Severity'},{ko:'고장형태',en:'FM'},{ko:'작업요소',en:'WE'},{ko:'고장원인',en:'FC'}].map(t => <th key={t.ko} style={colH(COLORS.failure.cell)}><BiHeader ko={t.ko} en={t.en} /></th>)}
          <th style={colH(COLORS.risk.prevention.cell)}><BiHeader ko="예방관리" en="PC" /></th>
          <th style={colH(COLORS.risk.prevention.cell)}><BiHeader ko="발생도" en="Occurrence" /></th>
          <th style={colH(COLORS.risk.detection.cell)}><BiHeader ko="검출관리" en="DC" /></th>
          <th style={colH(COLORS.risk.detection.cell)}><BiHeader ko="검출도" en="Detection" /></th>
          {[{ko:'AP',en:''},{ko:'RPN',en:''},{ko:'특별특성',en:'SC'},{ko:'습득교훈',en:'LLD'}].map(t => <th key={t.ko} style={colH(COLORS.risk.evaluation.cell)}>{t.en ? <BiHeader ko={t.ko} en={t.en} /> : t.ko}</th>)}
          {[{ko:'예방관리개선',en:'Prev.'},{ko:'검출관리개선',en:'Det.'},{ko:'책임자성명',en:'Person'},{ko:'목표완료일자',en:'Target'}].map(t => <th key={t.ko} style={colH(COLORS.opt.plan.cell)}><BiHeader ko={t.ko} en={t.en} /></th>)}
          {[{ko:'상태',en:'Status'},{ko:'개선결과근거',en:'Result'},{ko:'완료일자',en:'Completion'}].map(t => <th key={t.ko} style={colH(COLORS.opt.monitor.cell)}><BiHeader ko={t.ko} en={t.en} /></th>)}
          {[{ko:'심각도',en:'Severity'},{ko:'발생도',en:'Occurrence'},{ko:'검출도',en:'Detection'},{ko:'특별특성',en:'SC'},{ko:'AP',en:''},{ko:'RPN',en:''},{ko:'비고',en:'Remark'}].map(t => <th key={t.ko} style={colH(COLORS.opt.effect.cell)}>{t.en ? <BiHeader ko={t.ko} en={t.en} /> : t.ko}</th>)}
        </tr>
      </thead>

      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={40} className="text-center p-10 text-gray-400 text-xs">리스크분석을 먼저 완료해주세요.(Complete Risk Analysis first.)</td>
          </tr>
        ) : (
          rows.map((row, idx) => {
            const zebraBg = idx % 2 === 1 ? '#f5f5f5' : '#fff';
            const dc = (bg: string) => dataCellBase(bg);
            return (
              <tr key={`opt-full-${row.l1Id}-${row.l2Id}-${row.l3Id}-${idx}`} className={`h-[22px] ${zebraBg}`}>
                {l1Spans[idx] > 0 && <td rowSpan={l1Spans[idx]} style={dc(COLORS.structure.cell)}>{row.l1Name}</td>}
                {l2Spans[idx] > 0 && <td rowSpan={l2Spans[idx]} style={dc(COLORS.structure.cell)}>{row.l2No} {row.l2Name}</td>}
                <td style={{ ...dc(COLORS.structure.cell), textAlign: 'center' }}>{row.m4}</td>
                <td style={dc(COLORS.structure.cell)}>{row.l3Name}</td>
                {[...Array(8)].map((_, i) => <td key={`func-${i}`} style={dc(COLORS.function.cell)}></td>)}
                {[...Array(6)].map((_, i) => <td key={`fail-${i}`} style={dc(COLORS.failure.cell)}></td>)}
                <td style={dc(COLORS.risk.prevention.cell)}></td><td style={dc(COLORS.risk.prevention.cell)}></td>
                <td style={dc(COLORS.risk.detection.cell)}></td><td style={dc(COLORS.risk.detection.cell)}></td>
                {[...Array(4)].map((_, i) => <td key={`eval-${i}`} style={dc(COLORS.risk.evaluation.cell)}></td>)}
                {[...Array(4)].map((_, i) => <td key={`plan-${i}`} style={dc(COLORS.opt.plan.cell)}></td>)}
                {[...Array(3)].map((_, i) => <td key={`mon-${i}`} style={dc(COLORS.opt.monitor.cell)}></td>)}
                {[...Array(7)].map((_, i) => <td key={`eff-${i}`} style={dc(COLORS.opt.effect.cell)}></td>)}
              </tr>
            );
          })
        )}
      </tbody>
    </>
  );
}
