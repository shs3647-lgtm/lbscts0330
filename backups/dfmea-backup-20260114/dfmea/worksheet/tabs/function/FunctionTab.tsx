/**
 * @file FunctionTab.tsx
 * @description 기능분석 탭 - 레벨별 직접 렌더링 (서브메뉴 없음)
 */

'use client';

import React from 'react';
import { FunctionTabProps } from './types';
import FunctionL1Tab from './FunctionL1Tab';
import FunctionL2Tab from './FunctionL2Tab';
import FunctionL3Tab from './FunctionL3Tab';

export default function FunctionTab(props: FunctionTabProps) {
  const { state } = props;
  
  // 메인 탭에서 직접 레벨 결정
  if (state.tab === 'function-l2') {
    return <FunctionL2Tab {...props} />;
  }
  
  if (state.tab === 'function-l3') {
    return <FunctionL3Tab {...props} />;
  }
  
  // 기본: L1 완제품 기능분석
  return <FunctionL1Tab {...props} />;
}
