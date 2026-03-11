/**
 * @file RiskTab.tsx
 * @description FMEA 워크시트 - 리스크분석(5단계) 탭
 * 8열: 현재 예방관리(2) + 현재 검출관리(2) + 리스크 평가(4)
 * 서브그룹별 다른 색상 적용
 */

'use client';

import React from 'react';
import { WorksheetState, COLORS as GLOBAL_COLORS } from '../constants';
import { 
  riskMainHeader, 
  riskSubHeader, 
  riskColHeader, 
  riskDataCell, 
  riskColStyle, 
  riskStickyHeader,
  riskFullMainHeader,
  riskFullSubHeader,
  riskFullColHeader,
  riskFullRowStyle,
  riskFullDataCell
} from './RiskTabStyles';

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

interface RiskTabProps {
  state: WorksheetState;
  rows: FlatRow[];
  l1Spans: number[];
  l2Spans: number[];
  onAPClick?: () => void;
}

const COLORS_RISK = {
  main: { bg: '#6a1b9a', text: '#fff' },
  prevention: { headerBg: '#c8e6c9', cellBg: '#e8f5e9' },
  detection: { headerBg: '#bbdefb', cellBg: '#e3f2fd' },
  evaluation: { headerBg: '#f8bbd9', cellBg: '#fce4ec' },
};

/**
 * 리스크분석 헤더
 */
export function RiskHeader({ onAPClick }: { onAPClick?: () => void }) {
  return (
    <>
      {/* 1행: 대분류 */}
      <tr>
        <th colSpan={8} style={riskMainHeader}>P-FMEA 리스크 분석(5단계)</th>
      </tr>

      {/* 2행: 서브그룹 */}
      <tr>
        <th colSpan={2} style={riskSubHeader(COLORS_RISK.prevention.headerBg)}>현재 예방관리</th>
        <th colSpan={2} style={riskSubHeader(COLORS_RISK.detection.headerBg)}>현재 검출관리</th>
        <th colSpan={4} style={riskSubHeader(COLORS_RISK.evaluation.headerBg)}>리스크 평가</th>
      </tr>

      {/* 3행: 컬럼명 */}
      <tr>
        {/* 현재 예방관리 (2열) */}
        <th style={riskColHeader(COLORS_RISK.prevention.cellBg)}>예방관리(PC)</th>
        <th style={riskColHeader(COLORS_RISK.prevention.cellBg)}>발생도</th>
        <th style={riskColHeader(COLORS_RISK.detection.cellBg)}>검출관리(DC)</th>
        <th style={riskColHeader(COLORS_RISK.detection.cellBg)}>검출도</th>
        <th onClick={onAPClick} style={riskColHeader(COLORS_RISK.evaluation.cellBg, { cursor: onAPClick ? 'pointer' : 'default' })}>AP 📊</th>
        <th style={riskColHeader(COLORS_RISK.evaluation.cellBg)}>RPN</th>
        <th style={riskColHeader(COLORS_RISK.evaluation.cellBg)}>특별특성</th>
        <th style={riskColHeader(COLORS_RISK.evaluation.cellBg)}>습득교훈</th>
      </tr>
    </>
  );
}

/**
 * 리스크분석 행
 */
export function RiskRow() {
  return (
    <>
      <td style={riskDataCell()}></td>
      <td style={riskDataCell({ textAlign: 'center' })}></td>
      <td style={riskDataCell()}></td>
      <td style={riskDataCell({ textAlign: 'center' })}></td>
      <td style={riskDataCell({ textAlign: 'center' })}></td>
      <td style={riskDataCell({ textAlign: 'center' })}></td>
      <td style={riskDataCell({ textAlign: 'center' })}></td>
      <td style={riskDataCell()}></td>
    </>
  );
}

/**
 * 리스크분석 탭 메인 컴포넌트
 */
export default function RiskTab({ rows, onAPClick }: RiskTabProps) {
  return (
    <>
      <colgroup>
        {/* 예방관리 2열 */}
        <col style={riskColStyle('120px')} />
        <col style={riskColStyle('50px')} />
        {/* 검출관리 2열 */}
        <col style={riskColStyle('120px')} />
        <col style={riskColStyle('50px')} />
        {/* 리스크 평가 4열 */}
        <col style={riskColStyle('40px')} />
        <col style={riskColStyle('50px')} />
        <col style={riskColStyle('70px')} />
        <col style={riskColStyle('100px')} />
      </colgroup>
      
      <thead style={riskStickyHeader}>
        <RiskHeader onAPClick={onAPClick} />
      </thead>
      
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td 
              colSpan={8} 
              className="text-center p-10 text-gray-400 text-xs"
            >
              고장분석을 먼저 완료해주세요.
            </td>
          </tr>
        ) : (
          rows.map((row, idx) => (
            <tr key={`risk-${row.l3Id}-${idx}`} className={`h-6 ${idx % 2 === 1 ? 'bg-slate-100' : 'bg-white'}`}>
              <RiskRow />
            </tr>
          ))
        )}
      </tbody>
    </>
  );
}

// ============ RiskTabFull (구조~리스크 통합 화면) ============
export function RiskTabFull({ state, rows, l1Spans, l2Spans, onAPClick }: RiskTabProps) {
  // 색상 정의
  const COLORS = {
    structure: { main: '#1565c0', header: '#bbdefb', cell: '#e3f2fd' },
    function: { main: '#1b5e20', header: '#c8e6c9', cell: '#e8f5e9' },
    failure: { main: '#f57c00', header: '#ffe0b2', cell: '#fff3e0' },
    risk: {
      main: '#6a1b9a',
      prevention: { header: '#c8e6c9', cell: '#e8f5e9' },
      detection: { header: '#bbdefb', cell: '#e3f2fd' },
      evaluation: { header: '#f8bbd9', cell: '#fce4ec' },
    },
  };

  return (
    <>
      <thead style={riskStickyHeader}>
        {/* 1행: 단계 대분류 */}
        <tr>
          <th colSpan={4} style={riskFullMainHeader(COLORS.structure.main)}>P-FMEA 구조 분석(2단계)</th>
          <th colSpan={8} style={riskFullMainHeader(COLORS.function.main)}>P-FMEA 기능 분석(3단계)</th>
          <th colSpan={6} style={riskFullMainHeader('#f57c00')}>P-FMEA 고장 분석(4단계)</th>
          <th colSpan={8} style={riskFullMainHeader(COLORS.risk.main)}>P-FMEA 리스크 분석(5단계)</th>
        </tr>

        {/* 2행: 서브그룹 */}
        <tr>
          <th colSpan={1} style={riskFullSubHeader(COLORS.structure.header)}>1. 완제품 공정명</th>
          <th colSpan={1} style={riskFullSubHeader(COLORS.structure.header)}>2. 메인 공정명</th>
          <th colSpan={2} style={riskFullSubHeader(COLORS.structure.header)}>3. 작업 요소명</th>
          <th colSpan={3} style={riskFullSubHeader(COLORS.function.header)}>1. 완제품 공정기능/요구사항</th>
          <th colSpan={2} style={riskFullSubHeader(COLORS.function.header)}>2. 메인공정기능 및 제품특성</th>
          <th colSpan={3} style={riskFullSubHeader(COLORS.function.header)}>3. 작업요소의 기능 및 공정특성</th>
          <th colSpan={3} style={riskFullSubHeader(COLORS.failure.header)}>1. 고장영향(FE)</th>
          <th colSpan={1} style={riskFullSubHeader(COLORS.failure.header)}>2. 고장형태(FM)</th>
          <th colSpan={2} style={riskFullSubHeader(COLORS.failure.header)}>3. 고장원인(FC)</th>
          <th colSpan={2} style={riskFullSubHeader(COLORS.risk.prevention.header)}>현재 예방관리</th>
          <th colSpan={2} style={riskFullSubHeader(COLORS.risk.detection.header)}>현재 검출관리</th>
          <th colSpan={4} style={riskFullSubHeader(COLORS.risk.evaluation.header)}>리스크 평가</th>
        </tr>

        {/* 3행: 컬럼명 */}
        <tr>
          <th style={riskFullColHeader(COLORS.structure.cell)}>완제품공정명</th>
          <th style={riskFullColHeader(COLORS.structure.cell)}>NO+공정명</th>
          <th style={riskFullColHeader(COLORS.structure.cell)}>4M</th>
          <th style={riskFullColHeader(COLORS.structure.cell)}>작업요소</th>
          <th style={riskFullColHeader(COLORS.function.cell)}>구분</th>
          <th style={riskFullColHeader(COLORS.function.cell)}>완제품기능</th>
          <th style={riskFullColHeader(COLORS.function.cell)}>요구사항</th>
          <th style={riskFullColHeader(COLORS.function.cell)}>공정기능</th>
          <th style={riskFullColHeader(COLORS.function.cell)}>제품특성</th>
          <th style={riskFullColHeader(COLORS.function.cell)}>작업요소</th>
          <th style={riskFullColHeader(COLORS.function.cell)}>작업요소기능</th>
          <th style={riskFullColHeader(COLORS.function.cell)}>공정특성</th>
          <th style={riskFullColHeader(COLORS.failure.cell)}>구분</th>
          <th style={riskFullColHeader(COLORS.failure.cell)}>고장영향(FE)</th>
          <th style={riskFullColHeader(COLORS.failure.cell)}>심각도</th>
          <th style={riskFullColHeader(COLORS.failure.cell)}>고장형태(FM)</th>
          <th style={riskFullColHeader(COLORS.failure.cell)}>작업요소</th>
          <th style={riskFullColHeader(COLORS.failure.cell)}>고장원인(FC)</th>
          <th style={riskFullColHeader(COLORS.risk.prevention.cell)}>예방관리(PC)</th>
          <th style={riskFullColHeader(COLORS.risk.prevention.cell)}>발생도</th>
          <th style={riskFullColHeader(COLORS.risk.detection.cell)}>검출관리(DC)</th>
          <th style={riskFullColHeader(COLORS.risk.detection.cell)}>검출도</th>
          <th onClick={onAPClick} style={riskFullColHeader(COLORS.risk.evaluation.cell, { cursor: 'pointer' })}>AP 📊</th>
          <th style={riskFullColHeader(COLORS.risk.evaluation.cell)}>RPN</th>
          <th style={riskFullColHeader(COLORS.risk.evaluation.cell)}>특별특성</th>
          <th style={riskFullColHeader(COLORS.risk.evaluation.cell)}>습득교훈</th>
        </tr>
      </thead>
      
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={26} className="text-center p-10 text-gray-400 text-xs">
              고장분석을 먼저 완료해주세요.
            </td>
          </tr>
        ) : (
          rows.map((row, idx) => {
            const zebraBg = idx % 2 === 1 ? '#f5f5f5' : '#fff';
            return (
              <tr key={`risk-full-${row.l1Id}-${row.l2Id}-${row.l3Id}-${idx}`} style={riskFullRowStyle(zebraBg)}>
                {/* 구조분석 4열 */}
                {l1Spans[idx] > 0 && <td rowSpan={l1Spans[idx]} style={riskFullDataCell(COLORS.structure.cell)}>{row.l1Name}</td>}
                {l2Spans[idx] > 0 && <td rowSpan={l2Spans[idx]} style={riskFullDataCell(COLORS.structure.cell)}>{row.l2No} {row.l2Name}</td>}
                <td style={riskFullDataCell(COLORS.structure.cell, { textAlign: 'center' })}>{row.m4}</td>
                <td style={riskFullDataCell(COLORS.structure.cell)}>{row.l3Name}</td>
                {/* 기능분석 8열 */}
                {[...Array(8)].map((_, i) => <td key={`func-${i}`} style={riskFullDataCell(COLORS.function.cell)}></td>)}
                {/* 고장분석 6열 */}
                {[...Array(6)].map((_, i) => <td key={`fail-${i}`} style={riskFullDataCell(COLORS.failure.cell)}></td>)}
                {/* 리스크분석 8열 */}
                <td style={riskFullDataCell(COLORS.risk.prevention.cell)}></td>
                <td style={riskFullDataCell(COLORS.risk.prevention.cell)}></td>
                <td style={riskFullDataCell(COLORS.risk.detection.cell)}></td>
                <td style={riskFullDataCell(COLORS.risk.detection.cell)}></td>
                <td style={riskFullDataCell(COLORS.risk.evaluation.cell)}></td>
                <td style={riskFullDataCell(COLORS.risk.evaluation.cell)}></td>
                <td style={riskFullDataCell(COLORS.risk.evaluation.cell)}></td>
                <td style={riskFullDataCell(COLORS.risk.evaluation.cell)}></td>
              </tr>
            );
          })
        )}
      </tbody>
    </>
  );
}
