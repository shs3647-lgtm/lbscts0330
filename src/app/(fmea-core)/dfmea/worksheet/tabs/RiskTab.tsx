/**
 * @file RiskTab.tsx
 * @description FMEA 워크시트 - 리스크분석(5단계) 탭
 * 8열: 현재 설계검증 예방(2) + 현재 설계검증 검출(2) + 리스크 평가(4)
 * 
 * @version 2.0.0 - 인라인 스타일 제거, Tailwind CSS 적용
 */

'use client';

import React from 'react';
import { WorksheetState } from '../constants';

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

/** 공통 스타일 클래스 */
const tw = {
  // 헤더 - 표준 구분선 #ccc
  mainHeader: 'bg-[#6a1b9a] text-white border border-[#ccc] p-1.5 h-7 font-black text-xs text-center',
  subHeader: 'border border-[#ccc] p-1 h-6 font-bold text-xs text-center',
  colHeader: 'border border-[#ccc] p-0.5 h-5 font-semibold text-xs text-center whitespace-nowrap border-b-2 border-b-[#2196f3]',

  // 셀 - 표준 구분선 #ccc
  cell: 'border border-[#ccc] px-1 py-0.5 text-xs bg-[#fafafa]',
  cellCenter: 'border border-[#ccc] px-1 py-0.5 text-xs bg-[#fafafa] text-center',

  // 색상
  preventionHeader: 'bg-green-200',
  preventionCell: 'bg-green-50',
  detectionHeader: 'bg-blue-100',
  detectionCell: 'bg-blue-50',
  evaluationHeader: 'bg-pink-200',
  evaluationCell: 'bg-pink-50',

  // 구조/기능/고장
  structureMain: 'bg-[#1565c0] text-white',
  structureHeader: 'bg-blue-100',
  structureCell: 'bg-blue-50',
  functionMain: 'bg-[#1b5e20] text-white',
  functionHeader: 'bg-green-200',
  functionCell: 'bg-green-50',
  failureMain: 'bg-[#f57c00] text-white',
  failureHeader: 'bg-orange-200',
  failureCell: 'bg-orange-50',

  // 테이블 - 하단 2px 검은색 구분선
  thead: 'sticky top-0 z-20 bg-white border-b-2 border-black',
  emptyCell: 'text-center p-10 text-gray-500 text-xs',
  zebraOdd: 'bg-white',
  zebraEven: 'bg-gray-100',
};

/**
 * 리스크분석 헤더
 */
export function RiskHeader({ onAPClick }: { onAPClick?: () => void }) {
  return (
    <>
      {/* 1행: 대분류 */}
      <tr>
        <th colSpan={8} className={tw.mainHeader}>P-FMEA 리스크 분석(5단계)</th>
      </tr>

      {/* 2행: 서브그룹 */}
      <tr>
        <th colSpan={2} className={`${tw.subHeader} ${tw.preventionHeader}`}>현재 설계검증 예방</th>
        <th colSpan={2} className={`${tw.subHeader} ${tw.detectionHeader}`}>현재 설계검증 검출</th>
        <th colSpan={4} className={`${tw.subHeader} ${tw.evaluationHeader}`}>리스크 평가</th>
      </tr>

      {/* 3행: 컬럼명 */}
      <tr>
        <th className={`${tw.colHeader} ${tw.preventionCell}`}>설계검증 예방(PC)</th>
        <th className={`${tw.colHeader} ${tw.preventionCell}`} title="Occurrence">발생도(O)</th>
        <th className={`${tw.colHeader} ${tw.detectionCell}`} title="Detection Control">설계검증 검출(DC)</th>
        <th className={`${tw.colHeader} ${tw.detectionCell}`} title="Detection">검출도(D)</th>
        <th
          onClick={onAPClick}
          className={`${tw.colHeader} ${tw.evaluationCell} ${onAPClick ? 'cursor-pointer hover:bg-pink-100' : ''}`}
        >
          AP 📊
        </th>
        <th className={`${tw.colHeader} ${tw.evaluationCell}`}>RPN</th>
        <th className={`${tw.colHeader} ${tw.evaluationCell}`} title="Special Characteristic">특별특성(SC)</th>
        <th className={`${tw.colHeader} ${tw.evaluationCell}`} title="Lessons Learned Database">LLD</th>
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
      <td className={tw.cell}></td>
      <td className={tw.cellCenter}></td>
      <td className={tw.cell}></td>
      <td className={tw.cellCenter}></td>
      <td className={tw.cellCenter}></td>
      <td className={tw.cellCenter}></td>
      <td className={tw.cellCenter}></td>
      <td className={tw.cell}></td>
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
        <col className="w-[120px]" />
        <col className="w-[50px]" />
        <col className="w-[120px]" />
        <col className="w-[50px]" />
        <col className="w-[40px]" />
        <col className="w-[50px]" />
        <col className="w-[70px]" />
        <col className="w-[100px]" />
      </colgroup>

      <thead className={tw.thead}>
        <RiskHeader onAPClick={onAPClick} />
      </thead>

      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={8} className={tw.emptyCell}>
              고장분석을 먼저 완료해주세요.
            </td>
          </tr>
        ) : (
          rows.map((row, idx) => (
            <tr key={`risk-${row.l3Id}-${idx}`} className={`h-6 ${idx % 2 === 1 ? tw.zebraEven : tw.zebraOdd}`}>
              <RiskRow />
            </tr>
          ))
        )}
      </tbody>
    </>
  );
}

// ============ RiskTabFull (구조~리스크 통합 화면) ============
export function RiskTabFull({ rows, l1Spans, l2Spans, onAPClick }: RiskTabProps) {
  // 표준화: 구분선 #ccc, 폰트 text-xs (12px)
  const baseCell = 'border border-[#ccc] px-0.5 py-0.5 text-xs';
  const baseHeader = 'border border-[#ccc] p-0.5 text-xs text-center';
  const mainHeader = 'border border-[#ccc] p-1 h-6 font-black text-xs text-center text-white';
  const subHeader = 'border border-[#ccc] p-0.5 text-xs text-center';

  return (
    <>
      <thead className={tw.thead}>
        {/* 1행: 단계 대분류 */}
        <tr>
          <th colSpan={4} className={`${mainHeader} ${tw.structureMain}`} title="2nd Step Structure Analysis">P-FMEA 구조분석(2ST)</th>
          <th colSpan={8} className={`${mainHeader} ${tw.functionMain}`} title="3rd Step Function Analysis">P-FMEA 기능분석(3ST)</th>
          <th colSpan={6} className={`${mainHeader} ${tw.failureMain}`} title="4th Step Failure Analysis">P-FMEA 고장분석(4ST)</th>
          <th colSpan={8} className={`${mainHeader} bg-[#6a1b9a]`} title="5th Step Risk Analysis">P-FMEA 리스크분석(5ST)</th>
        </tr>

        {/* 2행: 서브그룹 */}
        <tr>
          <th colSpan={1} className={`${subHeader} ${tw.structureHeader}`}>1. 완제품 공정명</th>
          <th colSpan={1} className={`${subHeader} ${tw.structureHeader}`}>2. 메인 공정명</th>
          <th colSpan={2} className={`${subHeader} ${tw.structureHeader}`}>3. 작업 요소명</th>
          <th colSpan={3} className={`${subHeader} ${tw.functionHeader}`}>1. 완제품 설계기능/요구사항</th>
          <th colSpan={2} className={`${subHeader} ${tw.functionHeader}`}>2. 서브시스템기능 및 설계특성</th>
          <th colSpan={3} className={`${subHeader} ${tw.functionHeader}`}>3. 부품(컴포넌트)의 기능 및 설계파라미터</th>
          <th colSpan={3} className={`${subHeader} ${tw.failureHeader}`}>1. 고장영향(FE)</th>
          <th colSpan={1} className={`${subHeader} ${tw.failureHeader}`}>2. 고장형태(FM)</th>
          <th colSpan={2} className={`${subHeader} ${tw.failureHeader}`}>3. 고장원인(FC)</th>
          <th colSpan={2} className={`${subHeader} ${tw.preventionHeader}`}>현재 설계검증 예방</th>
          <th colSpan={2} className={`${subHeader} ${tw.detectionHeader}`}>현재 설계검증 검출</th>
          <th colSpan={4} className={`${subHeader} ${tw.evaluationHeader}`}>리스크 평가</th>
        </tr>

        {/* 3행: 컬럼명 */}
        <tr>
          <th className={`${baseHeader} ${tw.structureCell}`}>완제품공정명</th>
          <th className={`${baseHeader} ${tw.structureCell}`}>NO+공정명</th>
          <th className={`${baseHeader} ${tw.structureCell}`}>4M</th>
          <th className={`${baseHeader} ${tw.structureCell}`}>부품(컴포넌트)</th>
          <th className={`${baseHeader} ${tw.functionCell}`}>구분</th>
          <th className={`${baseHeader} ${tw.functionCell}`}>완제품기능</th>
          <th className={`${baseHeader} ${tw.functionCell}`}>요구사항</th>
          <th className={`${baseHeader} ${tw.functionCell}`}>설계기능</th>
          <th className={`${baseHeader} ${tw.functionCell}`}>설계특성</th>
          <th className={`${baseHeader} ${tw.functionCell}`}>부품(컴포넌트)</th>
          <th className={`${baseHeader} ${tw.functionCell}`}>부품(컴포넌트)기능</th>
          <th className={`${baseHeader} ${tw.functionCell}`}>설계파라미터</th>
          <th className={`${baseHeader} ${tw.failureCell}`}>구분</th>
          <th className={`${baseHeader} ${tw.failureCell}`}>고장영향(FE)</th>
          <th className={`${baseHeader} ${tw.failureCell}`} title="Severity">심각도(S)</th>
          <th className={`${baseHeader} ${tw.failureCell}`}>고장형태(FM)</th>
          <th className={`${baseHeader} ${tw.failureCell}`}>부품(컴포넌트)</th>
          <th className={`${baseHeader} ${tw.failureCell}`}>고장원인(FC)</th>
          <th className={`${baseHeader} ${tw.preventionCell}`}>설계검증 예방(PC)</th>
          <th className={`${baseHeader} ${tw.preventionCell}`} title="Occurrence">발생도(O)</th>
          <th className={`${baseHeader} ${tw.detectionCell}`} title="Detection Control">설계검증 검출(DC)</th>
          <th className={`${baseHeader} ${tw.detectionCell}`} title="Detection">검출도(D)</th>
          <th onClick={onAPClick} className={`${baseHeader} ${tw.evaluationCell} cursor-pointer hover:bg-pink-100`}>AP 📊</th>
          <th className={`${baseHeader} ${tw.evaluationCell}`}>RPN</th>
          <th className={`${baseHeader} ${tw.evaluationCell}`} title="Special Characteristic">특별특성(SC)</th>
          <th className={`${baseHeader} ${tw.evaluationCell}`} title="Lessons Learned Database">LLD</th>
        </tr>
      </thead>

      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={26} className={tw.emptyCell}>
              고장분석을 먼저 완료해주세요.
            </td>
          </tr>
        ) : (
          rows.map((row, idx) => {
            const zebra = idx % 2 === 1 ? 'bg-gray-100' : 'bg-white';
            return (
              <tr key={`risk-full-${row.l1Id}-${row.l2Id}-${row.l3Id}-${idx}`} className={`h-5 ${zebra}`}>
                {/* 구조분석 4열 */}
                {l1Spans[idx] > 0 && (
                  <td rowSpan={l1Spans[idx]} className={`${baseCell} ${tw.structureCell}`}>{row.l1Name}</td>
                )}
                {l2Spans[idx] > 0 && (
                  <td rowSpan={l2Spans[idx]} className={`${baseCell} ${tw.structureCell}`} style={{ fontSize: '10px' }}>{row.l2No} {row.l2Name}</td>
                )}
                <td className={`${baseCell} ${tw.structureCell} text-center`}>{row.m4}</td>
                <td className={`${baseCell} ${tw.structureCell}`}>{row.l3Name}</td>
                {/* 기능분석 8열 */}
                {[...Array(8)].map((_, i) => (
                  <td key={`func-${i}`} className={`${baseCell} ${tw.functionCell}`}></td>
                ))}
                {/* 고장분석 6열 */}
                {[...Array(6)].map((_, i) => (
                  <td key={`fail-${i}`} className={`${baseCell} ${tw.failureCell}`}></td>
                ))}
                {/* 리스크분석 8열 */}
                <td className={`${baseCell} ${tw.preventionCell}`}></td>
                <td className={`${baseCell} ${tw.preventionCell}`}></td>
                <td className={`${baseCell} ${tw.detectionCell}`}></td>
                <td className={`${baseCell} ${tw.detectionCell}`}></td>
                <td className={`${baseCell} ${tw.evaluationCell}`}></td>
                <td className={`${baseCell} ${tw.evaluationCell}`}></td>
                <td className={`${baseCell} ${tw.evaluationCell}`}></td>
                <td className={`${baseCell} ${tw.evaluationCell}`}></td>
              </tr>
            );
          })
        )}
      </tbody>
    </>
  );
}
