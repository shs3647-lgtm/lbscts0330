/**
 * @file RiskTab.tsx
 * @description FMEA 워크시트 - 리스크분석(5단계) 탭
 * 8열: 현재 예방관리(2) + 현재 검출관리(2) + 리스크 평가(4)
 * 
 * @version 2.0.0 - 인라인 스타일 제거, Tailwind CSS 적용
 */

'use client';

import React from 'react';
import { WorksheetState } from '../constants';
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
        <th colSpan={8} className={tw.mainHeader}><BiHeader ko="D-FMEA 리스크 분석" en="Risk Analysis (5ST)" /></th>
      </tr>

      {/* 2행: 서브그룹 */}
      <tr>
        <th colSpan={2} className={`${tw.subHeader} ${tw.preventionHeader}`}><BiHeader ko="현재 예방관리" en="Current Prevention" /></th>
        <th colSpan={2} className={`${tw.subHeader} ${tw.detectionHeader}`}><BiHeader ko="현재 검출관리" en="Current Detection" /></th>
        <th colSpan={4} className={`${tw.subHeader} ${tw.evaluationHeader}`}><BiHeader ko="리스크 평가" en="Risk Evaluation" /></th>
      </tr>

      {/* 3행: 컬럼명 */}
      <tr>
        <th className={`${tw.colHeader} ${tw.preventionCell}`}><BiHeader ko="예방관리" en="PC" /></th>
        <th className={`${tw.colHeader} ${tw.preventionCell}`}><BiHeader ko="발생도" en="Occurrence" /></th>
        <th className={`${tw.colHeader} ${tw.detectionCell}`}><BiHeader ko="검출관리" en="DC" /></th>
        <th className={`${tw.colHeader} ${tw.detectionCell}`}><BiHeader ko="검출도" en="Detection" /></th>
        <th
          onClick={onAPClick}
          className={`${tw.colHeader} ${tw.evaluationCell} ${onAPClick ? 'cursor-pointer hover:bg-pink-100' : ''}`}
        >
          AP 📊
        </th>
        <th className={`${tw.colHeader} ${tw.evaluationCell}`}>RPN</th>
        <th className={`${tw.colHeader} ${tw.evaluationCell}`}><BiHeader ko="특별특성" en="SC" /></th>
        <th className={`${tw.colHeader} ${tw.evaluationCell}`}><BiHeader ko="습득교훈" en="LLD" /></th>
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
              고장분석을 먼저 완료해주세요.(Complete Failure Analysis first.)
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
          <th colSpan={4} className={`${mainHeader} ${tw.structureMain}`}><BiHeader ko="D-FMEA 구조 분석" en="Structure (2ST)" /></th>
          <th colSpan={8} className={`${mainHeader} ${tw.functionMain}`}><BiHeader ko="D-FMEA 기능 분석" en="Function (3ST)" /></th>
          <th colSpan={6} className={`${mainHeader} ${tw.failureMain}`}><BiHeader ko="D-FMEA 고장 분석" en="Failure (4ST)" /></th>
          <th colSpan={8} className={`${mainHeader} bg-[#6a1b9a]`}><BiHeader ko="D-FMEA 리스크 분석" en="Risk Analysis (5ST)" /></th>
        </tr>

        {/* 2행: 서브그룹 */}
        <tr>
          <th colSpan={1} className={`${subHeader} ${tw.structureHeader}`}><BiHeader ko="1. 완제품 공정명" en="Product Process" /></th>
          <th colSpan={1} className={`${subHeader} ${tw.structureHeader}`}><BiHeader ko="2. 메인 공정명" en="Main Process" /></th>
          <th colSpan={2} className={`${subHeader} ${tw.structureHeader}`}><BiHeader ko="3. 작업 요소명" en="Work Element" /></th>
          <th colSpan={3} className={`${subHeader} ${tw.functionHeader}`}><BiHeader ko="1. 완제품 공정기능/요구사항" en="Function/Requirements" /></th>
          <th colSpan={2} className={`${subHeader} ${tw.functionHeader}`}><BiHeader ko="2. 메인공정기능 및 제품특성" en="Function & Product Char." /></th>
          <th colSpan={3} className={`${subHeader} ${tw.functionHeader}`}><BiHeader ko="3. 작업요소의 기능 및 공정특성" en="Function & Process Char." /></th>
          <th colSpan={3} className={`${subHeader} ${tw.failureHeader}`}><BiHeader ko="1. 고장영향" en="Failure Effect/FE" /></th>
          <th colSpan={1} className={`${subHeader} ${tw.failureHeader}`}><BiHeader ko="2. 고장형태" en="Failure Mode/FM" /></th>
          <th colSpan={2} className={`${subHeader} ${tw.failureHeader}`}><BiHeader ko="3. 고장원인" en="Failure Cause/FC" /></th>
          <th colSpan={2} className={`${subHeader} ${tw.preventionHeader}`}><BiHeader ko="현재 예방관리" en="Current Prevention" /></th>
          <th colSpan={2} className={`${subHeader} ${tw.detectionHeader}`}><BiHeader ko="현재 검출관리" en="Current Detection" /></th>
          <th colSpan={4} className={`${subHeader} ${tw.evaluationHeader}`}><BiHeader ko="리스크 평가" en="Risk Evaluation" /></th>
        </tr>

        {/* 3행: 컬럼명 */}
        <tr>
          <th className={`${baseHeader} ${tw.structureCell}`}><BiHeader ko="완제품공정명" en="Product" /></th>
          <th className={`${baseHeader} ${tw.structureCell}`}><BiHeader ko="NO+공정명" en="Process" /></th>
          <th className={`${baseHeader} ${tw.structureCell}`}>4M</th>
          <th className={`${baseHeader} ${tw.structureCell}`}><BiHeader ko="작업요소" en="Work Element" /></th>
          <th className={`${baseHeader} ${tw.functionCell}`}><BiHeader ko="구분" en="Type" /></th>
          <th className={`${baseHeader} ${tw.functionCell}`}><BiHeader ko="완제품기능" en="Product Func." /></th>
          <th className={`${baseHeader} ${tw.functionCell}`}><BiHeader ko="요구사항" en="Requirements" /></th>
          <th className={`${baseHeader} ${tw.functionCell}`}><BiHeader ko="공정기능" en="Process Func." /></th>
          <th className={`${baseHeader} ${tw.functionCell}`}><BiHeader ko="제품특성" en="Product Char." /></th>
          <th className={`${baseHeader} ${tw.functionCell}`}><BiHeader ko="작업요소" en="Work Element" /></th>
          <th className={`${baseHeader} ${tw.functionCell}`}><BiHeader ko="작업요소기능" en="WE Func." /></th>
          <th className={`${baseHeader} ${tw.functionCell}`}><BiHeader ko="공정특성" en="Process Char." /></th>
          <th className={`${baseHeader} ${tw.failureCell}`}><BiHeader ko="구분" en="Type" /></th>
          <th className={`${baseHeader} ${tw.failureCell}`}><BiHeader ko="고장영향" en="FE" /></th>
          <th className={`${baseHeader} ${tw.failureCell}`}><BiHeader ko="심각도" en="Severity" /></th>
          <th className={`${baseHeader} ${tw.failureCell}`}><BiHeader ko="고장형태" en="FM" /></th>
          <th className={`${baseHeader} ${tw.failureCell}`}><BiHeader ko="작업요소" en="WE" /></th>
          <th className={`${baseHeader} ${tw.failureCell}`}><BiHeader ko="고장원인" en="FC" /></th>
          <th className={`${baseHeader} ${tw.preventionCell}`}><BiHeader ko="예방관리" en="PC" /></th>
          <th className={`${baseHeader} ${tw.preventionCell}`}><BiHeader ko="발생도" en="Occurrence" /></th>
          <th className={`${baseHeader} ${tw.detectionCell}`}><BiHeader ko="검출관리" en="DC" /></th>
          <th className={`${baseHeader} ${tw.detectionCell}`}><BiHeader ko="검출도" en="Detection" /></th>
          <th onClick={onAPClick} className={`${baseHeader} ${tw.evaluationCell} cursor-pointer hover:bg-pink-100`}>AP 📊</th>
          <th className={`${baseHeader} ${tw.evaluationCell}`}>RPN</th>
          <th className={`${baseHeader} ${tw.evaluationCell}`}><BiHeader ko="특별특성" en="SC" /></th>
          <th className={`${baseHeader} ${tw.evaluationCell}`}><BiHeader ko="습득교훈" en="LLD" /></th>
        </tr>
      </thead>

      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={26} className={tw.emptyCell}>
              고장분석을 먼저 완료해주세요.(Complete Failure Analysis first.)
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
