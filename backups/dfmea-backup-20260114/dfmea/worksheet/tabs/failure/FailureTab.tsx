/**
 * @file FailureTab.tsx
 * @description 고장분석 탭 - 레벨별 직접 렌더링 (서브메뉴 없음)
 */

'use client';

import React from 'react';
import { FailureTabProps } from './types';
import FailureL1Tab from './FailureL1Tab';
import FailureL2Tab from './FailureL2Tab';
import FailureL3Tab from './FailureL3Tab';
import FailureLinkTab from './FailureLinkTab';

export default function FailureTab(props: FailureTabProps) {
  const { state } = props;
  
  // 메인 탭에서 직접 레벨 결정
  if (state.tab === 'failure-l2') {
    return <FailureL2Tab {...props} />;
  }
  
  if (state.tab === 'failure-l3') {
    return <FailureL3Tab {...props} />;
  }
  
  if (state.tab === 'failure-link') {
    return <FailureLinkTab {...props} />;
  }
  
  // 기본: L1 고장영향 분석
  return <FailureL1Tab {...props} />;
}


