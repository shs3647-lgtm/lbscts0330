/**
 * @file AllViewTab.tsx
 * @description FMEA 전체보기 탭 (40열)
 * 구조분석(4) + 기능분석(8) + 고장분석(6) + 리스크분석(8) + 최적화(14) = 40열
 */

'use client';

import React from 'react';
import { WorksheetState } from '../constants';

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

const BORDER = '1px solid #b0bec5';

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
  return (
    <>
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
        {/* 구조분석 (3 서브그룹) */}
        <th colSpan={1} className="p-0.5 h-5 font-bold text-[9px] text-center border border-gray-400 bg-[#1976d2]">1. 완제품 공정명</th>
        <th colSpan={1} className="p-0.5 h-5 font-bold text-[9px] text-center border border-gray-400 bg-[#1976d2]">2. 메인 공정명</th>
        <th colSpan={2} className="p-0.5 h-5 font-bold text-[9px] text-center border border-gray-400 bg-[#1976d2]">3. 작업 요소명</th>
        <th colSpan={3} style={subH(COLORS.function.header)}>1. 완제품 공정기능/요구사항</th>
        <th colSpan={2} style={subH(COLORS.function.header)}>2. 메인공정기능 및 제품특성</th>
        <th colSpan={3} style={subH(COLORS.function.header)}>3. 작업요소의 기능 및 공정특성</th>
        <th colSpan={3} style={subH(COLORS.failure.header)}>1. 자사/고객/사용자 고장영향(FE)</th>
        <th colSpan={1} style={subH(COLORS.failure.header)}>2. 메인공정 고장형태(FM)</th>
        <th colSpan={2} style={subH(COLORS.failure.header)}>3. 작업요소 고장원인(FC)</th>
        <th colSpan={2} style={subH(COLORS.risk.prevention.header)}>현재 예방관리</th>
        <th colSpan={2} style={subH(COLORS.risk.detection.header)}>현재 검출관리</th>
        <th colSpan={4} style={subH(COLORS.risk.evaluation.header)}>리스크 평가</th>
        <th colSpan={4} style={subH(COLORS.opt.plan.header)}>계획</th>
        <th colSpan={3} style={subH(COLORS.opt.monitor.header)}>결과 모니터링</th>
        <th colSpan={7} style={subH(COLORS.opt.effect.header)}>효과 평가</th>
      </tr>

      {/* 3행: 컬럼명 */}
      <tr>
        {['완제품 공정명','NO+공정명','4M','작업요소'].map(t => <th key={t} style={colH(COLORS.structure.cell)}>{t}</th>)}
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
    </>
  );
}

// ============ 데이터 행 ============
function AllViewRow({ row, idx, l1Spans, l2Spans, zebraBg = '#fff' }: { row: FlatRow; idx: number; l1Spans: number[]; l2Spans: number[]; zebraBg?: string }) {
  const cellStyle = (bg: string, extra?: React.CSSProperties): React.CSSProperties => ({ 
    border: BORDER, padding: '2px 3px', fontSize: '8px', background: bg, ...extra 
  });
  
  return (
    <tr className={`h-[22px] ${zebraBg}`}>
      {/* 구조분석 4열 */}
      {l1Spans[idx] > 0 && <td rowSpan={l1Spans[idx]} style={cellStyle(COLORS.structure.cell)}>{row.l1Name}</td>}
      {l2Spans[idx] > 0 && <td rowSpan={l2Spans[idx]} style={cellStyle(COLORS.structure.cell)}>{row.l2No} {row.l2Name}</td>}
      <td className="text-center" style={cellStyle(COLORS.structure.cell)}>{row.m4}</td>
      <td style={cellStyle(COLORS.structure.cell)}>{row.l3Name}</td>
      {/* 기능분석 8열 */}
      {[...Array(8)].map((_, i) => <td key={`func-${i}`} style={cellStyle(COLORS.function.cell)}></td>)}
      {/* 고장분석 6열 */}
      {[...Array(6)].map((_, i) => <td key={`fail-${i}`} style={cellStyle(COLORS.failure.cell)}></td>)}
      {/* 리스크분석 8열 */}
      <td style={cellStyle(COLORS.risk.prevention.cell)}></td>
      <td style={cellStyle(COLORS.risk.prevention.cell)}></td>
      <td style={cellStyle(COLORS.risk.detection.cell)}></td>
      <td style={cellStyle(COLORS.risk.detection.cell)}></td>
      <td style={cellStyle(COLORS.risk.evaluation.cell)}></td>
      <td style={cellStyle(COLORS.risk.evaluation.cell)}></td>
      <td style={cellStyle(COLORS.risk.evaluation.cell)}></td>
      <td style={cellStyle(COLORS.risk.evaluation.cell)}></td>
      {/* 최적화 14열 */}
      <td style={cellStyle(COLORS.opt.plan.cell)}></td>
      <td style={cellStyle(COLORS.opt.plan.cell)}></td>
      <td style={cellStyle(COLORS.opt.plan.cell)}></td>
      <td style={cellStyle(COLORS.opt.plan.cell)}></td>
      <td style={cellStyle(COLORS.opt.monitor.cell)}></td>
      <td style={cellStyle(COLORS.opt.monitor.cell)}></td>
      <td style={cellStyle(COLORS.opt.monitor.cell)}></td>
      <td style={cellStyle(COLORS.opt.effect.cell)}></td>
      <td style={cellStyle(COLORS.opt.effect.cell)}></td>
      <td style={cellStyle(COLORS.opt.effect.cell)}></td>
      <td style={cellStyle(COLORS.opt.effect.cell)}></td>
      <td style={cellStyle(COLORS.opt.effect.cell)}></td>
      <td style={cellStyle(COLORS.opt.effect.cell)}></td>
      <td style={{ ...cellStyle, background: COLORS.opt.effect.cell }}></td>
    </tr>
  );
}

// ============ 메인 컴포넌트 ============
export default function AllViewTab({ rows, state, l1Spans, l2Spans }: AllViewTabProps) {
  return (
    <>
      <thead className="sticky top-0 z-20 bg-white">
        <AllViewHeader />
      </thead>
      
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={40} className="text-center p-10 text-[#999] text-xs">
              데이터가 없습니다. 구조분석부터 시작해주세요.
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
