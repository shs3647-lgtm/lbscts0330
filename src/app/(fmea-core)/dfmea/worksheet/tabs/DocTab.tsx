/**
 * @file DocTab.tsx
 * @description FMEA 워크시트 - 문서화(7단계) 탭
 * @author AI Assistant
 * @created 2025-12-27
 */

'use client';

import React from 'react';
import { WorksheetState, COLORS } from '../constants';
import { BiHeader } from './shared/BaseWorksheetComponents';

// 스타일 함수
const BORDER = `1px solid #ccc`;
const cellBase: React.CSSProperties = { border: BORDER, padding: '1px 4px', verticalAlign: 'middle' };
const hdr = (bg: string): React.CSSProperties => ({ ...cellBase, background: bg, fontWeight: 700, fontSize: '12px' });
const mainHdr: React.CSSProperties = { ...cellBase, background: '#e0e0e0', fontWeight: 900, textAlign: 'center', fontSize: '12px', height: '25px' };

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
        <th colSpan={5} style={{ ...mainHdr, width: '100%' }}><BiHeader ko="문서화" en="Documentation (7ST)" /></th>
      </tr>
      <tr>
        <th style={{ ...hdr('#f5f5f5'), height: '22px' }}><BiHeader ko="고장형태" en="Failure Mode" /></th>
        <th style={{ ...hdr('#f5f5f5'), height: '22px' }}><BiHeader ko="고장원인" en="Failure Cause" /></th>
        <th style={{ ...hdr('#f5f5f5'), height: '22px' }}><BiHeader ko="현재관리" en="Current Control" /></th>
        <th style={{ ...hdr('#f5f5f5'), height: '22px' }}><BiHeader ko="권고조치" en="Recommended Action" /></th>
        <th style={{ ...hdr('#f5f5f5'), height: '22px' }}><BiHeader ko="비고" en="Remark" /></th>
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
        <td rowSpan={l1Spans[idx]} className="text-center text-xs text-gray-400" style={cellBase}>{row.l1Name}</td>
      )}
      {l2Spans[idx] > 0 && (
        <td rowSpan={l2Spans[idx]} className="text-center text-[10px] text-gray-400" style={cellBase}>{row.l2No} {row.l2Name}</td>
      )}
      <td className="text-xs text-gray-400" style={cellBase}>[{row.m4}] {row.l3Name}</td>
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
        {rows.length === 0 ? (
          <tr>
            <td colSpan={5} className="text-center py-8 text-gray-400 text-sm">
              문서관리 데이터가 없습니다. 구조분석을 먼저 완료하세요.(No data. Complete Structure Analysis first.)
            </td>
          </tr>
        ) : rows.map((row, idx) => (
          <tr key={row.l3Id} className={`h-[25px] ${idx % 2 === 1 ? 'bg-gray-100' : 'bg-white'}`}>
            <DocRow {...props} row={row} idx={idx} />
          </tr>
        ))}
      </tbody>
    </>
  );
}

