// @ts-nocheck
/**
 * @file DocTab.tsx
 * @description FMEA 워크시트 - 문서화(7단계) 탭
 * @author AI Assistant
 * @created 2025-12-27
 */

'use client';

import React from 'react';
import { WorksheetState, COLORS } from '../constants';

// Tailwind CSS 클래스 (인라인 스타일 제거)
const tw = {
  mainHeader: 'border border-[#ccc] p-1 px-4 bg-[#e0e0e0] h-[25px] font-black text-xs text-center align-middle',
  subHeader: 'border border-[#ccc] p-1 px-4 bg-[#f5f5f5] h-[22px] font-bold text-xs align-middle',
  cell: 'border border-[#ccc] p-1 px-4 text-xs align-middle',
};

interface FlatRow {
  l1Id: string;
  l1Name: string;
  l2Id: string;
  l2Name: string; // DFMEA: l2No 제거됨
  l3Id: string;
  l3Name: string; // DFMEA: m4 제거됨
}

interface DocTabProps {
  state: WorksheetState;
  rows: FlatRow[];
  l1Spans: number[];
  l2Spans: number[];
}

/**
 * 문서화 탭 - 테이블 헤더
 */
export function DocHeader() {
  return (
    <>
      <tr>
        <th colSpan={5} className={`${tw.mainHeader} w-full`}>문서화 (7단계)</th>
      </tr>
      <tr>
        <th className={tw.subHeader}>고장형태</th>
        <th className={tw.subHeader}>고장원인</th>
        <th className={tw.subHeader}>현재관리</th>
        <th className={tw.subHeader}>권고조치</th>
        <th className={tw.subHeader}>비고</th>
      </tr>
    </>
  );
}

/**
 * 문서화 탭 - 테이블 행 (데이터 셀) - 개발예정
 */
export function DocRow({
  row,
  idx,
  l1Spans,
  l2Spans,
}: DocTabProps & { row: FlatRow; idx: number }) {
  return (
    <>
      {l1Spans[idx] > 0 && (
        <td rowSpan={l1Spans[idx]} className={`${tw.cell} text-center text-gray-400`}>{row.l1Name}</td>
      )}
      {l2Spans[idx] > 0 && (
        <td rowSpan={l2Spans[idx]} className={`${tw.cell} text-center text-gray-400`}>{row.l2Name}</td>
      )}
      <td className={`${tw.cell} text-gray-400`}>{row.l3Name}</td> {/* DFMEA: m4 제거됨 */}
      <td className="border border-[#ccc] p-1 text-xs align-middle bg-[#fafafa]"></td>
      <td className="border border-[#ccc] p-1 text-xs align-middle bg-[#fafafa]"></td>
    </>
  );
}

/**
 * 문서화 탭 - 전체 컴포넌트
 */
export default function DocTab(props: DocTabProps) {
  const { rows } = props;
  
  return (
    <>
      {/* 헤더 - 하단 2px 검은색 구분선 */}
      <thead className="sticky top-0 z-20 bg-white border-b-2 border-black">
        <DocHeader />
      </thead>
      
      <tbody>
        {rows.map((row, idx) => (
          <tr key={row.l3Id} className={`h-[25px] ${idx % 2 === 1 ? 'bg-gray-100' : 'bg-white'}`}>
            <DocRow {...props} row={row} idx={idx} />
          </tr>
        ))}
      </tbody>
    </>
  );
}

