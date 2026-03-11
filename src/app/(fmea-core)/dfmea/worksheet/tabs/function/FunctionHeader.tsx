/**
 * @file FunctionHeader.tsx
 * @description 기능분석 탭 헤더 정의 (구조분석 열 포함)
 */

'use client';

import React from 'react';
import { COLORS } from '../../constants';
import { BiHeader } from '../shared/BaseWorksheetComponents';
import { stickyFirstColStyle } from './constants';

// 스타일 함수
const BORDER = `1px solid #ccc`;
const mainH = (bg: string): React.CSSProperties => ({ background: bg, color: 'white', border: BORDER, padding: '4px', height: '28px', fontWeight: 900, textAlign: 'center', fontSize: '12px' });
const subH = (bg: string): React.CSSProperties => ({ background: bg, border: BORDER, padding: '2px 4px', height: '24px', fontWeight: 700, fontSize: '12px' });

export default function FunctionHeader() {
  return (
    <>
      {/* 1행: 메인 그룹 헤더 */}
      <tr>
        <th colSpan={4} style={{ ...stickyFirstColStyle, zIndex: 25, ...mainH('#1976d2') }}><BiHeader ko="Step 1. 구조 분석" en="Structure (Link)" /></th>
        <th colSpan={3} style={mainH('#1b5e20')}><BiHeader ko="1. 완제품 기능 및 요구사항" en="L1 Function/Req." /></th>
        <th colSpan={2} style={mainH('#2e7d32')}><BiHeader ko="2. 메인공정 기능 및 제품특성" en="L2 Func. & Product Char." /></th>
        <th colSpan={2} style={mainH('#388e3c')}><BiHeader ko="3. 작업요소 기능 및 공정특성" en="L3 Func. & Process Char." /></th>
      </tr>

      {/* 2행: 세부 컬럼 헤더 */}
      <tr className="sticky top-7 z-20 bg-white">
        <th style={{ ...stickyFirstColStyle, zIndex: 25, ...subH('#e3f2fd') }}><BiHeader ko="완제품명" en="Product" /></th>
        <th style={subH('#e3f2fd')}><BiHeader ko="메인공정" en="Main Process" /></th>
        <th style={subH('#e3f2fd')}>4M</th>
        <th style={subH('#e3f2fd')}><BiHeader ko="작업요소" en="Work Element" /></th>
        <th style={subH('#c8e6c9')}><BiHeader ko="구분" en="Type" /></th>
        <th style={subH('#c8e6c9')}><BiHeader ko="완제품기능" en="Product Func." /></th>
        <th style={subH('#c8e6c9')}><BiHeader ko="요구사항" en="Requirements" /></th>
        <th style={subH('#c8e6c9')}><BiHeader ko="공정기능" en="Process Func." /></th>
        <th style={subH('#c8e6c9')}><BiHeader ko="제품특성" en="Product Char." /></th>
        <th style={subH('#c8e6c9')}><BiHeader ko="작업요소기능" en="WE Func." /></th>
        <th style={subH('#c8e6c9')}><BiHeader ko="공정특성" en="Process Char." /></th>
      </tr>
    </>
  );
}
