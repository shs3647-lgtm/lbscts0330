/**
 * @file FunctionHeader.tsx
 * @description 기능분석 탭 헤더 정의 (구조분석 열 포함)
 */

'use client';

import React from 'react';
import { COLORS } from '../../constants';
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
        <th colSpan={4} style={{ ...stickyFirstColStyle, zIndex: 25, ...mainH('#1976d2') }}>Step 1. 구조 분석 (연계)</th>
        <th colSpan={3} style={mainH('#1b5e20')}>1. 완제품 기능 및 요구사항 (L1)</th>
        <th colSpan={2} style={mainH('#2e7d32')}>2. 서브시스템 기능 및 설계특성 (L2)</th>
        <th colSpan={2} style={mainH('#388e3c')}>3. 부품(컴포넌트) 기능 및 설계파라미터 (L3)</th>
      </tr>
      
      {/* 2행: 세부 컬럼 헤더 */}
      <tr className="sticky top-7 z-20 bg-white">
        <th style={{ ...stickyFirstColStyle, zIndex: 25, ...subH('#e3f2fd') }}>완제품명</th>
        <th style={subH('#e3f2fd')}>서브시스템</th>
        <th style={subH('#e3f2fd')}>4M</th>
        <th style={subH('#e3f2fd')}>부품(컴포넌트)</th>
        <th style={subH('#c8e6c9')}>구분</th>
        <th style={subH('#c8e6c9')}>완제품기능</th>
        <th style={subH('#c8e6c9')}>요구사항</th>
        <th style={subH('#c8e6c9')}>설계기능</th>
        <th style={subH('#c8e6c9')}>설계특성</th>
        <th style={subH('#c8e6c9')}>부품(컴포넌트)기능</th>
        <th style={subH('#c8e6c9')}>설계파라미터</th>
      </tr>
    </>
  );
}
