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
import { usePathname } from 'next/navigation';
import { WorksheetState, COLORS as GLOBAL_COLORS } from '../constants';
import { BiHeader } from './shared/BaseWorksheetComponents';
import { getFmeaLabels } from '@/lib/fmea-labels';

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
const PLAN_COLS: { ko: string; en: string }[] = [
  { ko: '예방관리개선', en: 'Prev. Control Improve' },
  { ko: '검출관리개선', en: 'Det. Control Improve' },
  { ko: '책임자성명', en: 'Person' },
  { ko: '목표완료일자', en: 'Target Date' },
];
const MONITOR_COLS: { ko: string; en: string }[] = [
  { ko: '상태', en: 'Status' },
  { ko: '개선결과근거', en: 'Improvement Result' },
  { ko: '완료일자', en: 'Completion Date' },
];
const EFFECT_COLS: { ko: string; en: string; plain?: boolean }[] = [
  { ko: '심각도', en: 'Severity/S' },
  { ko: '발생도', en: 'Occurrence/O' },
  { ko: '검출도', en: 'Detection/D' },
  { ko: '특별특성', en: 'SC' },
  { ko: 'AP', en: '', plain: true },
  { ko: 'RPN', en: '', plain: true },
  { ko: '비고', en: 'Remark' },
];

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
  const pathname = usePathname();
  const isDfmea = pathname?.includes('/dfmea/') ?? false;
  const lb = getFmeaLabels(isDfmea);

  return (
    <>
      {/* 1행: 대분류 */}
      <tr>
        <th colSpan={14} style={mainHeaderStyle(14)}>
          <BiHeader ko={`${lb.prefix} 최적화 (6단계)`} en="Optimization (Step 6)" />
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
        {PLAN_COLS.map(col => <th key={col.ko} style={colHeaderStyle(COLORS_OPT.plan.cellBg)}><BiHeader ko={col.ko} en={col.en} /></th>)}
        {MONITOR_COLS.map(col => <th key={col.ko} style={colHeaderStyle(COLORS_OPT.monitor.cellBg)}><BiHeader ko={col.ko} en={col.en} /></th>)}
        {EFFECT_COLS.map(col => <th key={col.ko} style={colHeaderStyle(COLORS_OPT.effect.cellBg)}>{col.plain ? col.ko : <BiHeader ko={col.ko} en={col.en} />}</th>)}
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

      {/* 헤더 - 하단 2px 검은색 구분선 */}
      <thead className="sticky top-0 z-20 bg-white border-b-2 border-black">
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
  const pathname = usePathname();
  const isDfmea = pathname?.includes('/dfmea/') ?? false;
  const lb = getFmeaLabels(isDfmea);

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
          <th colSpan={4} style={mainH(COLORS.structure.main)} title="2nd Step Structure Analysis"><BiHeader ko={`${lb.prefix} 구조분석`} en="Structure Analysis (2ST)" /></th>
          <th colSpan={8} style={mainH(COLORS.function.main)} title="3rd Step Function Analysis"><BiHeader ko={`${lb.prefix} 기능분석`} en="Function Analysis (3ST)" /></th>
          <th colSpan={6} style={mainH('#f57c00')} title="4th Step Failure Analysis"><BiHeader ko={`${lb.prefix} 고장분석`} en="Failure Analysis (4ST)" /></th>
          <th colSpan={8} style={mainH(COLORS.risk.main)} title="5th Step Risk Analysis"><BiHeader ko={`${lb.prefix} 리스크분석`} en="Risk Analysis (5ST)" /></th>
          <th colSpan={14} style={mainH(COLORS.opt.main)} title="6th Step Optimization"><BiHeader ko={`${lb.prefix} 최적화`} en="Optimization (6ST)" /></th>
        </tr>

        {/* 2행: 서브그룹 */}
        <tr>
          <th colSpan={1} style={subH(COLORS.structure.header)}><BiHeader ko={`1. ${lb.l1}`} en={lb.l1En} /></th>
          <th colSpan={1} style={subH(COLORS.structure.header)}><BiHeader ko={`2. ${lb.l2}`} en={lb.l2En} /></th>
          <th colSpan={2} style={subH(COLORS.structure.header)}><BiHeader ko={`3. ${lb.l3}`} en={lb.l3En} /></th>
          <th colSpan={3} style={subH(COLORS.function.header)}><BiHeader ko={`1. ${lb.l1FuncGroup}`} en={lb.l1FuncGroupEn} /></th>
          <th colSpan={2} style={subH(COLORS.function.header)}><BiHeader ko={`2. ${lb.l2FuncGroup}`} en={lb.l2FuncGroupEn} /></th>
          <th colSpan={3} style={subH(COLORS.function.header)}><BiHeader ko={`3. ${lb.l3FuncGroup}`} en={lb.l3FuncGroupEn} /></th>
          <th colSpan={3} style={subH(COLORS.failure.header)}><BiHeader ko="1. 고장영향" en="Failure Effect/FE" /></th>
          <th colSpan={1} style={subH(COLORS.failure.header)}><BiHeader ko="2. 고장형태" en="Failure Mode" /></th>
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
          <th style={colH(COLORS.structure.cell)}><BiHeader ko={lb.l1Short} en={lb.l1En} /></th>
          <th style={colH(COLORS.structure.cell)}><BiHeader ko={lb.l2No} en={lb.l2En} /></th>
          <th style={colH(COLORS.structure.cell)}>{lb.l3Attr}</th>
          <th style={colH(COLORS.structure.cell)}><BiHeader ko={lb.l3Short} en={lb.l3En} /></th>
          {[{ko:'구분',en:'Type'},{ko:lb.l1Func,en:lb.l1FuncEn},{ko:'요구사항',en:'Requirements'},{ko:lb.l2Func,en:lb.l2FuncEn},{ko:'제품특성',en:'Product Char.'},{ko:lb.l3Short,en:lb.l3En},{ko:lb.l3Func,en:lb.l3FuncEn},{ko:lb.l3Char,en:lb.l3CharEn}].map(c => <th key={c.ko} style={colH(COLORS.function.cell)}><BiHeader ko={c.ko} en={c.en} /></th>)}
          {[{ko:'구분',en:'Type'},{ko:'고장영향',en:'FE'},{ko:'심각도',en:'S'},{ko:'고장형태',en:'FM'},{ko:lb.l3Short,en:lb.l3En},{ko:'고장원인',en:'FC'}].map(c => <th key={c.ko} style={colH(COLORS.failure.cell)}><BiHeader ko={c.ko} en={c.en} /></th>)}
          <th style={colH(COLORS.risk.prevention.cell)}><BiHeader ko="예방관리" en="PC" /></th>
          <th style={colH(COLORS.risk.prevention.cell)}><BiHeader ko="발생도" en="O" /></th>
          <th style={colH(COLORS.risk.detection.cell)}><BiHeader ko="검출관리" en="DC" /></th>
          <th style={colH(COLORS.risk.detection.cell)}><BiHeader ko="검출도" en="D" /></th>
          {[{ko:'AP',plain:true},{ko:'RPN',plain:true},{ko:'특별특성',en:'SC'},{ko:'LLD',plain:true}].map(c => <th key={c.ko} style={colH(COLORS.risk.evaluation.cell)}>{c.plain ? c.ko : <BiHeader ko={c.ko} en={c.en!} />}</th>)}
          {[{ko:'예방개선',en:'Prev. Improve'},{ko:'검출개선',en:'Det. Improve'},{ko:'책임자',en:'Person'},{ko:'목표일',en:'Target Date'}].map(c => <th key={c.ko} style={colH(COLORS.opt.plan.cell)}><BiHeader ko={c.ko} en={c.en} /></th>)}
          {[{ko:'상태',en:'Status'},{ko:'개선결과',en:'Result'},{ko:'완료일',en:'Completion'}].map(c => <th key={c.ko} style={colH(COLORS.opt.monitor.cell)}><BiHeader ko={c.ko} en={c.en} /></th>)}
          {[{ko:'심각도',en:'S'},{ko:'발생도',en:'O'},{ko:'검출도',en:'D'},{ko:'특별특성',en:'SC'},{ko:'AP',plain:true},{ko:'RPN',plain:true},{ko:'비고',en:'Remark'}].map(c => <th key={c.ko} style={colH(COLORS.opt.effect.cell)}>{c.plain ? c.ko : <BiHeader ko={c.ko} en={c.en!} />}</th>)}
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
