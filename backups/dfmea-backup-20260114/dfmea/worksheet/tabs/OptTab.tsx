/**
 * @file OptTab.tsx
 * @description FMEA 워크시트 - 최적화(6단계) 탭
 * 14열: 계획(4) + 결과 모니터링(3) + 효과 평가(7)
 * 서브그룹별 다른 색상 적용
 */

'use client';

import React from 'react';
import { WorksheetState, COLORS as GLOBAL_COLORS } from '../constants';

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

// 컬럼 정의 (그룹별)
const PLAN_COLS = ['예방관리개선', '검출관리개선', '책임자성명', '목표완료일자'];
const MONITOR_COLS = ['상태', '개선결과근거', '완료일자'];
const EFFECT_COLS = ['심각도', '발생도', '검출도', '특별특성', 'AP', 'RPN', '비고'];

// 스타일 함수화 (인라인 스타일 중복 제거)
const mainHeaderStyle = (colSpan: number): React.CSSProperties => ({
  background: COLORS_OPT.main.bg, color: COLORS_OPT.main.text, border: BORDER,
  padding: '6px', height: '28px', fontWeight: 900, fontSize: '12px', textAlign: 'center'
});

const subHeaderStyle = (bg: string): React.CSSProperties => ({
  background: bg, border: BORDER, padding: '4px', height: '24px', fontWeight: 700, fontSize: '12px', textAlign: 'center'
});

const colHeaderStyle = (bg: string): React.CSSProperties => ({
  background: bg, border: BORDER, padding: '3px', height: '22px', fontWeight: 600, fontSize: '12px', textAlign: 'center', whiteSpace: 'nowrap'
});

const cellStyle = (bg: string, options?: { textAlign?: React.CSSProperties['textAlign'] }): React.CSSProperties => ({
  background: bg,
  border: BORDER,
  padding: '3px 4px',
  height: '24px',
  fontSize: '12px',
  textAlign: options?.textAlign || 'center',
  verticalAlign: 'middle',
});

const cellInputStyle = (bg: string): React.CSSProperties => ({
  ...cellStyle(bg, { textAlign: 'left' }),
  padding: '0',
});

const inputBaseStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  border: 'none',
  background: 'transparent',
  fontSize: '12px',
  textAlign: 'center',
  outline: 'none',
};

const rowBgStyle = (bg: string): React.CSSProperties => ({ background: bg });

/**
 * 최적화 헤더
 */
export function OptHeader() {
  return (
    <>
      {/* 1행: 대분류 */}
      <tr>
        <th colSpan={14} style={mainHeaderStyle(14)}>
          P-FMEA 최적화(6단계)
        </th>
      </tr>

      {/* 2행: 서브그룹 */}
      <tr>
        <th colSpan={4} style={subHeaderStyle(COLORS_OPT.plan.headerBg)}>계획</th>
        <th colSpan={3} style={subHeaderStyle(COLORS_OPT.monitor.headerBg)}>결과 모니터링</th>
        <th colSpan={7} style={subHeaderStyle(COLORS_OPT.effect.headerBg)}>효과 평가</th>
      </tr>

      {/* 3행: 컬럼명 */}
      <tr>
        {PLAN_COLS.map(col => <th key={col} style={colHeaderStyle(COLORS_OPT.plan.cellBg)}>{col}</th>)}
        {MONITOR_COLS.map(col => <th key={col} style={colHeaderStyle(COLORS_OPT.monitor.cellBg)}>{col}</th>)}
        {EFFECT_COLS.map(col => <th key={col} style={colHeaderStyle(COLORS_OPT.effect.cellBg)}>{col}</th>)}
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
      {PLAN_COLS.map((_, idx) => <td key={`plan-${idx}`} style={rowCellStyle}></td>)}
      {MONITOR_COLS.map((_, idx) => <td key={`monitor-${idx}`} style={rowCellStyle}></td>)}
      {EFFECT_COLS.map((_, idx) => <td key={`effect-${idx}`} style={rowCellCenterStyle}></td>)}
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
      
      <thead className="sticky top-0 z-20 bg-white">
        <OptHeader />
      </thead>
      
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={14} className="text-center p-10 text-gray-400 text-xs">
              리스크분석을 먼저 완료해주세요.
            </td>
          </tr>
        ) : (
          rows.map((row, idx) => {
            const zebraBg = idx % 2 === 1 ? '#f5f5f5' : '#fff';
            return (
              <tr
                key={`opt-${row.l3Id}-${idx}`}
                className="h-6"
                style={rowBgStyle(zebraBg)}
              >
                <OptRow row={row} />
              </tr>
            );
          })
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
  const mainH = (bg: string): React.CSSProperties => ({
    background: bg,
    color: '#fff',
    border: BORDER_FULL,
    padding: '4px',
    height: '24px',
    fontWeight: 900,
    fontSize: '12px',
    textAlign: 'center',
  });
  const subH = (bg: string): React.CSSProperties => ({
    background: bg,
    border: BORDER_FULL,
    padding: '2px',
    fontSize: '9px',
    textAlign: 'center',
  });
  const colH = (bg: string): React.CSSProperties => ({
    background: bg,
    border: BORDER_FULL,
    padding: '2px',
    fontSize: '8px',
    textAlign: 'center',
  });
  const dataCellBase = (
    bg: string,
    options?: { textAlign?: React.CSSProperties['textAlign'] }
  ): React.CSSProperties => ({
    border: BORDER_FULL,
    padding: '2px 3px',
    fontSize: '8px',
    background: bg,
    ...(options?.textAlign && { textAlign: options.textAlign }),
  });

  return (
    <>
      <thead className="sticky top-0 z-20 bg-white">
        {/* 1행: 단계 대분류 */}
        <tr>
          <th colSpan={4} style={mainH(COLORS.structure.main)}>P-FMEA 구조 분석(2단계)</th>
          <th colSpan={8} style={mainH(COLORS.function.main)}>P-FMEA 기능 분석(3단계)</th>
          <th colSpan={6} style={mainH('#f57c00')}>P-FMEA 고장 분석(4단계)</th>
          <th colSpan={8} style={mainH(COLORS.risk.main)}>P-FMEA 리스크 분석(5단계)</th>
          <th colSpan={14} style={mainH(COLORS.opt.main)}>P-FMEA 최적화(6단계)</th>
        </tr>

        {/* 2행: 서브그룹 */}
        <tr>
          <th colSpan={1} style={subH(COLORS.structure.header)}>1. 완제품 공정명</th>
          <th colSpan={1} style={subH(COLORS.structure.header)}>2. 메인 공정명</th>
          <th colSpan={2} style={subH(COLORS.structure.header)}>3. 작업 요소명</th>
          <th colSpan={3} style={subH(COLORS.function.header)}>1. 완제품 공정기능/요구사항</th>
          <th colSpan={2} style={subH(COLORS.function.header)}>2. 메인공정기능 및 제품특성</th>
          <th colSpan={3} style={subH(COLORS.function.header)}>3. 작업요소기능 및 공정특성</th>
          <th colSpan={3} style={subH(COLORS.failure.header)}>1. 고장영향(FE)</th>
          <th colSpan={1} style={subH(COLORS.failure.header)}>2. 고장형태(FM)</th>
          <th colSpan={2} style={subH(COLORS.failure.header)}>3. 고장원인(FC)</th>
          <th colSpan={2} style={subH(COLORS.risk.prevention.header)}>현재 예방관리</th>
          <th colSpan={2} style={subH(COLORS.risk.detection.header)}>현재 검출관리</th>
          <th colSpan={4} style={subH(COLORS.risk.evaluation.header)}>리스크 평가</th>
          <th colSpan={4} style={subH(COLORS.opt.plan.header)}>계획</th>
          <th colSpan={3} style={subH(COLORS.opt.monitor.header)}>결과 모니터링</th>
          <th colSpan={7} style={subH(COLORS.opt.effect.header)}>효과 평가</th>
        </tr>

        {/* 3행: 컬럼명 */}
        <tr>
          <th style={colH(COLORS.structure.cell)}>완제품공정명</th>
          <th style={colH(COLORS.structure.cell)}>NO+공정명</th>
          <th style={colH(COLORS.structure.cell)}>4M</th>
          <th style={colH(COLORS.structure.cell)}>작업요소</th>
          {['구분','완제품기능','요구사항','공정기능','제품특성','작업요소','작업요소기능','공정특성'].map(t => <th key={t} style={colH(COLORS.function.cell)}>{t}</th>)}
          {['구분','고장영향(FE)','심각도','고장형태(FM)','작업요소','고장원인(FC)'].map(t => <th key={t} style={colH(COLORS.failure.cell)}>{t}</th>)}
          <th style={colH(COLORS.risk.prevention.cell)}>예방관리(PC)</th>
          <th style={colH(COLORS.risk.prevention.cell)}>발생도</th>
          <th style={colH(COLORS.risk.detection.cell)}>검출관리(DC)</th>
          <th style={colH(COLORS.risk.detection.cell)}>검출도</th>
          {['AP','RPN','특별특성','습득교훈'].map(t => <th key={t} style={colH(COLORS.risk.evaluation.cell)}>{t}</th>)}
          {['예방관리개선','검출관리개선','책임자성명','목표완료일자'].map(t => <th key={t} style={colH(COLORS.opt.plan.cell)}>{t}</th>)}
          {['상태','개선결과근거','완료일자'].map(t => <th key={t} style={colH(COLORS.opt.monitor.cell)}>{t}</th>)}
          {['심각도','발생도','검출도','특별특성','AP','RPN','비고'].map(t => <th key={t} style={colH(COLORS.opt.effect.cell)}>{t}</th>)}
        </tr>
      </thead>
      
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={40} className="text-center p-10 text-gray-400 text-xs">리스크분석을 먼저 완료해주세요.</td>
          </tr>
        ) : (
          rows.map((row, idx) => {
            const zebraBg = idx % 2 === 1 ? '#f5f5f5' : '#fff';
            const dc = (bg: string, options?: { textAlign?: React.CSSProperties['textAlign'] }) =>
              dataCellBase(bg, options);
            return (
              <tr
                key={`opt-full-${row.l1Id}-${row.l2Id}-${row.l3Id}-${idx}`}
                className="h-[22px]"
                style={rowBgStyle(zebraBg)}
              >
                {l1Spans[idx] > 0 && <td rowSpan={l1Spans[idx]} style={dc(COLORS.structure.cell)}>{row.l1Name}</td>}
                {l2Spans[idx] > 0 && <td rowSpan={l2Spans[idx]} style={dc(COLORS.structure.cell)}>{row.l2No} {row.l2Name}</td>}
                <td style={dc(COLORS.structure.cell, { textAlign: 'center' })}>{row.m4}</td>
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
