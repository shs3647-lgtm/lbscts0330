/**
 * @file FunctionColgroup.tsx
 * @description 기능분석 탭 컬럼 정의 (구조분석 열 포함)
 * @version 2.0.0 - 인라인 스타일 제거, Tailwind CSS 적용
 */

'use client';

import React from 'react';

export default function FunctionColgroup() {
  // 구조분석(4열): 완제품명, 공정명, 4M, 작업요소
  // 기능분석(7열): L1구분, 완제품기능, 요구사항, 공정기능, 제품특성, 작업요소기능, 공정특성
  return (
    <colgroup>
      <col className="w-[100px]" />
      <col className="w-[120px]" />
      <col className="w-[80px]" />
      <col className="w-[100px]" />
      <col className="w-[80px]" />
      <col className="w-[180px]" />
      <col className="w-[150px]" />
      <col className="w-[150px]" />
      <col className="w-[120px]" />
      <col className="w-[150px]" />
      <col className="w-[120px]" />
    </colgroup>
  );
}
