/**
 * @file AllViewTab.tsx
 * @description FMEA 전체보기 탭 (40열)
 * 구조분석(4) + 기능분석(8) + 고장분석(6) + 리스크분석(8) + 최적화(14) = 40열
 */

'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { getFmeaLabels } from '@/lib/fmea-labels';
import { WorksheetState } from '../constants';
import { BiHeader } from './shared/BaseWorksheetComponents';

interface FlatRow {
  l1Id: string;
  l1Name: string;
  l1TypeId?: string;
  l1TypeName?: string;
  l2Id: string;
  l2No: string;
  l2Name: string;
  l3Id: string;
  m4: string;
  l3Name: string;
}

interface AllViewTabProps {
  rows: FlatRow[];
  state: WorksheetState;
  l1Spans: number[];
  l1TypeSpans?: number[];
  l1FuncSpans?: number[];
  l2Spans: number[];
}

const BORDER = '1px solid #60a5fa';

// 색상 정의
const COLORS = {
  structure: { main: '#1565c0', header: '#bbdefb', cell: '#e3f2fd' },
  function: { main: '#1b5e20', header: '#c8e6c9', cell: '#e8f5e9' },
  failure: { main: '#f57c00', header: '#ffe0b2', cell: '#fff3e0' },
  risk: { main: '#6a1b9a', prevention: { header: '#c8e6c9', cell: '#e8f5e9' }, detection: { header: '#bbdefb', cell: '#e3f2fd' }, evaluation: { header: '#f8bbd9', cell: '#fce4ec' } },
  opt: { main: '#2e7d32', plan: { header: '#bbdefb', cell: '#e3f2fd' }, monitor: { header: '#ffe0b2', cell: '#fff3e0' }, effect: { header: '#c8e6c9', cell: '#e8f5e9' } },
};

// 스타일 함수
const mainH = (bg: string): React.CSSProperties => ({ background: bg, color: '#fff', border: BORDER, padding: '4px', height: '24px', fontWeight: 900, fontSize: '12px', textAlign: 'center' });
const subH = (bg: string): React.CSSProperties => ({ background: bg, border: BORDER, padding: '2px', fontSize: '9px', textAlign: 'center' });
const colH = (bg: string): React.CSSProperties => ({ background: bg, border: BORDER, padding: '2px', fontSize: '8px', textAlign: 'center' });
const dataCell = (bg: string): React.CSSProperties => ({ border: BORDER, padding: '2px 3px', fontSize: '8px', background: bg });

// ============ 40열 헤더 컴포넌트 ============
export function AllViewHeader() {
  const pathname = usePathname();
  const isDfmea = pathname?.includes('/dfmea/') ?? false;
  const lb = getFmeaLabels(isDfmea);

  return (
    <>
      {/* 1행: 단계 대분류 */}
      <tr>
        <th colSpan={4} style={mainH(COLORS.structure.main)} title="2nd Step Structure Analysis"><BiHeader ko={lb.prefix + ' 구조분석 (2ST)'} en="Structure Analysis" /></th>
        <th colSpan={8} style={mainH(COLORS.function.main)} title="3rd Step Function Analysis"><BiHeader ko={lb.prefix + ' 기능분석 (3ST)'} en="Function Analysis" /></th>
        <th colSpan={6} style={mainH('#f57c00')} title="4th Step Failure Analysis"><BiHeader ko={lb.prefix + ' 고장분석 (4ST)'} en="Failure Analysis" /></th>
        <th colSpan={8} style={mainH(COLORS.risk.main)} title="5th Step Risk Analysis"><BiHeader ko={lb.prefix + ' 리스크분석 (5ST)'} en="Risk Analysis" /></th>
        <th colSpan={14} style={mainH(COLORS.opt.main)} title="6th Step Optimization"><BiHeader ko={lb.prefix + ' 최적화 (6ST)'} en="Optimization" /></th>
      </tr>

      {/* 2행: 서브그룹 */}
      <tr>
        {/* 구조분석 (3 서브그룹) */}
        <th colSpan={1} className="p-0.5 h-5 font-bold text-xs text-center border border-[#ccc] bg-[#1976d2]"><BiHeader ko={'1. ' + lb.l1} en={lb.l1En} /></th>
        <th colSpan={1} className="p-0.5 h-5 font-bold text-xs text-center border border-[#ccc] bg-[#1976d2]"><BiHeader ko={'2. ' + lb.l2} en={lb.l2En} /></th>
        <th colSpan={2} className="p-0.5 h-5 font-bold text-xs text-center border border-[#ccc] bg-[#1976d2]"><BiHeader ko={'3. ' + lb.l3} en={lb.l3En} /></th>
        <th colSpan={3} style={subH(COLORS.function.header)}><BiHeader ko={'1. ' + lb.l1FuncGroup} en={lb.l1FuncGroupEn} /></th>
        <th colSpan={2} style={subH(COLORS.function.header)}><BiHeader ko={'2. ' + lb.l2FuncGroup} en={lb.l2FuncGroupEn} /></th>
        <th colSpan={3} style={subH(COLORS.function.header)}><BiHeader ko={'3. ' + lb.l3FuncGroup} en={lb.l3FuncGroupEn} /></th>
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
        {([[lb.l1Short, lb.l1En],[lb.l2No,'Process'],[lb.l3Attr,''],[lb.l3Short, lb.l3En]] as [string,string][]).map(([ko,en]) => <th key={ko} style={colH(COLORS.structure.cell)}>{en ? <BiHeader ko={ko} en={en} /> : ko}</th>)}
        {([['구분','Type'],[lb.l1Func, lb.l1FuncEn],['요구사항','Requirements'],[lb.l2Func, lb.l2FuncEn],['제품특성','Product Char.'],[lb.l3Short, lb.l3En],[lb.l3Func, lb.l3FuncEn],[lb.l3Char, lb.l3CharEn]] as [string,string][]).map(([ko,en]) => <th key={ko} style={colH(COLORS.function.cell)}><BiHeader ko={ko} en={en} /></th>)}
        {([['구분','Type'],['고장영향','FE'],['심각도','S'],['고장형태','FM'],[lb.l3Short + '2', lb.l3En],['고장원인','FC']] as [string,string][]).map(([ko,en]) => <th key={ko} style={colH(COLORS.failure.cell)}><BiHeader ko={ko} en={en} /></th>)}
        <th style={colH(COLORS.risk.prevention.cell)}><BiHeader ko="예방관리" en="PC" /></th>
        <th style={colH(COLORS.risk.prevention.cell)}><BiHeader ko="발생도" en="O" /></th>
        <th style={colH(COLORS.risk.detection.cell)}><BiHeader ko="검출관리" en="DC" /></th>
        <th style={colH(COLORS.risk.detection.cell)}><BiHeader ko="검출도" en="D" /></th>
        {(['AP', 'RPN'] as string[]).map(t => <th key={t} style={colH(COLORS.risk.evaluation.cell)}>{t}</th>)}
        <th style={colH(COLORS.risk.evaluation.cell)}><BiHeader ko="특별특성" en="SC" /></th>
        <th style={colH(COLORS.risk.evaluation.cell)}>LLD</th>
        {([['예방개선','Prev. Improve'],['검출개선','Det. Improve'],['책임자','Person'],['목표일','Target Date']] as [string,string][]).map(([ko,en]) => <th key={ko} style={colH(COLORS.opt.plan.cell)}><BiHeader ko={ko} en={en} /></th>)}
        {([['상태','Status'],['개선결과','Result'],['완료일','Completion']] as [string,string][]).map(([ko,en]) => <th key={ko} style={colH(COLORS.opt.monitor.cell)}><BiHeader ko={ko} en={en} /></th>)}
        {([['심각도','S'],['발생도','O'],['검출도','D'],['특별특성','SC']] as [string,string][]).map(([ko,en]) => <th key={ko+'-eff'} style={colH(COLORS.opt.effect.cell)}><BiHeader ko={ko} en={en} /></th>)}
        {(['AP', 'RPN'] as string[]).map(t => <th key={t+'-eff'} style={colH(COLORS.opt.effect.cell)}>{t}</th>)}
        <th style={colH(COLORS.opt.effect.cell)}><BiHeader ko="비고" en="Remark" /></th>
      </tr>
    </>
  );
}

// ============ 셀 스타일 캐시 (인라인 함수 제거 → 성능 최적화) ============
const cellStyleCache = new Map<string, React.CSSProperties>();
function getCellStyle(bg: string): React.CSSProperties {
  let cached = cellStyleCache.get(bg);
  if (!cached) {
    cached = { border: BORDER, padding: '2px 3px', fontSize: '8px', background: bg };
    cellStyleCache.set(bg, cached);
  }
  return cached;
}

// ============ 데이터 행 ============
const AllViewRow = React.memo(function AllViewRow({ row, idx, l1Spans, l2Spans, zebraBg = '#fff' }: { row: FlatRow; idx: number; l1Spans: number[]; l2Spans: number[]; zebraBg?: string }) {

  return (
    <tr className={`h-[22px] ${zebraBg}`}>
      {/* 구조분석 4열 */}
      {l1Spans[idx] > 0 && <td rowSpan={l1Spans[idx]} style={getCellStyle(COLORS.structure.cell)}>{row.l1Name}</td>}
      {l2Spans[idx] > 0 && <td rowSpan={l2Spans[idx]} style={getCellStyle(COLORS.structure.cell)}>{row.l2No} {row.l2Name}</td>}
      <td className="text-center" style={getCellStyle(COLORS.structure.cell)}>{row.m4}</td>
      <td style={getCellStyle(COLORS.structure.cell)}>{row.l3Name}</td>
      {/* 기능분석 8열 */}
      {[...Array(8)].map((_, i) => <td key={`func-${i}`} style={getCellStyle(COLORS.function.cell)}></td>)}
      {/* 고장분석 6열 */}
      {[...Array(6)].map((_, i) => <td key={`fail-${i}`} style={getCellStyle(COLORS.failure.cell)}></td>)}
      {/* 리스크분석 8열 */}
      <td style={getCellStyle(COLORS.risk.prevention.cell)}></td>
      <td style={getCellStyle(COLORS.risk.prevention.cell)}></td>
      <td style={getCellStyle(COLORS.risk.detection.cell)}></td>
      <td style={getCellStyle(COLORS.risk.detection.cell)}></td>
      <td style={getCellStyle(COLORS.risk.evaluation.cell)}></td>
      <td style={getCellStyle(COLORS.risk.evaluation.cell)}></td>
      <td style={getCellStyle(COLORS.risk.evaluation.cell)}></td>
      <td style={getCellStyle(COLORS.risk.evaluation.cell)}></td>
      {/* 최적화 14열 */}
      <td style={getCellStyle(COLORS.opt.plan.cell)}></td>
      <td style={getCellStyle(COLORS.opt.plan.cell)}></td>
      <td style={getCellStyle(COLORS.opt.plan.cell)}></td>
      <td style={getCellStyle(COLORS.opt.plan.cell)}></td>
      <td style={getCellStyle(COLORS.opt.monitor.cell)}></td>
      <td style={getCellStyle(COLORS.opt.monitor.cell)}></td>
      <td style={getCellStyle(COLORS.opt.monitor.cell)}></td>
      <td style={getCellStyle(COLORS.opt.effect.cell)}></td>
      <td style={getCellStyle(COLORS.opt.effect.cell)}></td>
      <td style={getCellStyle(COLORS.opt.effect.cell)}></td>
      <td style={getCellStyle(COLORS.opt.effect.cell)}></td>
      <td style={getCellStyle(COLORS.opt.effect.cell)}></td>
      <td style={getCellStyle(COLORS.opt.effect.cell)}></td>
      <td style={getCellStyle(COLORS.opt.effect.cell)}></td>
    </tr>
  );
});

// ============ 메인 컴포넌트 ============
export default function AllViewTab({ rows, state, l1Spans, l2Spans }: AllViewTabProps) {
  return (
    <>
      {/* 헤더 - 하단 2px 검은색 구분선 */}
      <thead className="sticky top-0 z-20 bg-white border-b border-blue-400">
        <AllViewHeader />
      </thead>

      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={40} className="text-center p-10 text-[#999] text-xs">
              데이터가 없습니다. 구조분석부터 시작해주세요.(No data. Start with Structure Analysis.)
            </td>
          </tr>
        ) : (
          rows.map((row, idx) => (
            <AllViewRow key={`all-${row.l1Id}-${row.l2Id}-${row.l3Id}-${idx}`} row={row} idx={idx} l1Spans={l1Spans} l2Spans={l2Spans} zebraBg={idx % 2 === 1 ? '#f5f5f5' : '#fff'} />
          ))
        )}
      </tbody>
    </>
  );
}
