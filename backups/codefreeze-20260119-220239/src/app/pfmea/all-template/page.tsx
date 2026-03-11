/**
 * @file page.tsx
 * @description P-FMEA ALL 화면 + 최적화 화면 템플릿 테스트 페이지
 * 
 * URL: /pfmea/all-template
 * 
 * 화면정의서 v2.2 기준
 * - ALL: 35/37컬럼
 * - 최적화: 13/14컬럼
 */

'use client';

import React, { useState } from 'react';
import AllTabEmpty from '../worksheet/tabs/all/AllTabEmpty';
import OptimizationTab from '../worksheet/tabs/optimization/OptimizationTab';

type ViewMode = 'all' | 'optimization';

export default function AllTemplatePage() {
  const [showRPN, setShowRPN] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  
  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* 헤더 */}
      <header className="bg-indigo-900 text-white px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-lg font-bold">FMEA명:</span>
          <span className="bg-gray-700 px-3 py-1 rounded text-sm">새로 작성</span>
          <span className="text-green-400 text-sm">✓ 저장됨</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-600">Import ▼</button>
          <button className="bg-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-600">Export</button>
          <button className="bg-pink-600 px-3 py-1 rounded text-sm hover:bg-pink-500">★특별특성</button>
          <button className="bg-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-600">SOD</button>
          <button className="bg-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-600">5AP</button>
          <button className="bg-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-600">6AP</button>
          <button
            onClick={() => setShowRPN(!showRPN)}
            className={`px-3 py-1 rounded text-sm font-semibold ${
              showRPN 
                ? 'bg-yellow-500 text-black' 
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            RPN
          </button>
          <button className="bg-blue-600 px-3 py-1 rounded text-sm hover:bg-blue-500">4관</button>
          <button className="bg-green-600 px-3 py-1 rounded text-sm hover:bg-green-500">CP</button>
          <button className="bg-orange-600 px-3 py-1 rounded text-sm hover:bg-orange-500">LLD</button>
        </div>
      </header>
      
      {/* 탭 메뉴 */}
      <nav className="bg-gray-800 px-6 py-2 flex items-center gap-2 shrink-0">
        <button className="bg-gray-700 text-white px-4 py-1.5 rounded text-sm hover:bg-gray-600">구조분석</button>
        <button className="bg-gray-700 text-white px-4 py-1.5 rounded text-sm hover:bg-gray-600">1L기능</button>
        <button className="bg-gray-700 text-white px-4 py-1.5 rounded text-sm hover:bg-gray-600">2L기능</button>
        <button className="bg-gray-700 text-white px-4 py-1.5 rounded text-sm hover:bg-gray-600">3L기능</button>
        <button className="bg-gray-700 text-white px-4 py-1.5 rounded text-sm hover:bg-gray-600">1L영향</button>
        <button className="bg-gray-700 text-white px-4 py-1.5 rounded text-sm hover:bg-gray-600">2L형태</button>
        <button className="bg-gray-700 text-white px-4 py-1.5 rounded text-sm hover:bg-gray-600">3L원인</button>
        <button className="bg-gray-700 text-white px-4 py-1.5 rounded text-sm hover:bg-gray-600">고장연결</button>
        <span className="mx-2 text-gray-500">|</span>
        <button className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm">2ST</button>
        <button className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm">3ST</button>
        <button className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm">4ST</button>
        <button className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm">5ST</button>
        <button className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm">6ST</button>
        {/* ALL 탭 */}
        <button 
          onClick={() => setViewMode('all')}
          className={`px-3 py-1.5 rounded text-sm font-bold ${
            viewMode === 'all' 
              ? 'bg-amber-500 text-black' 
              : 'bg-gray-700 text-white hover:bg-gray-600'
          }`}
        >
          ALL
        </button>
        {/* 최적화 탭 */}
        <button 
          onClick={() => setViewMode('optimization')}
          className={`px-3 py-1.5 rounded text-sm font-bold ${
            viewMode === 'optimization' 
              ? 'bg-green-500 text-black' 
              : 'bg-gray-700 text-white hover:bg-gray-600'
          }`}
        >
          최적화
        </button>
        <span className="mx-2 text-gray-500">|</span>
        <button className="bg-gray-600 text-white px-3 py-1.5 rounded text-sm">5ST확정</button>
        <button className="bg-gray-600 text-white px-3 py-1.5 rounded text-sm">6ST확정</button>
        <button className="bg-gray-500 text-white px-3 py-1.5 rounded text-sm">승인</button>
      </nav>
      
      {/* 정보 바 */}
      <div className="bg-gray-700 px-6 py-1.5 text-xs text-gray-300 shrink-0 flex items-center gap-4">
        {viewMode === 'all' ? (
          <>
            <span>구조분석 <b className="text-cyan-300">4열</b></span>
            <span>기능분석 <b className="text-green-300">7열</b></span>
            <span>고장분석 <b className="text-orange-300">4열</b></span>
            <span>리스크분석 <b className="text-yellow-300">{showRPN ? '8열' : '7열'}</b></span>
            <span>최적화 <b className="text-lime-300">{showRPN ? '14열' : '13열'}</b></span>
            <span className="ml-auto font-bold text-white">
              합계: {showRPN ? '37' : '35'}컬럼 {showRPN ? '(RPN 포함)' : '(RPN 제외)'}
            </span>
          </>
        ) : (
          <>
            <span>계획 <b className="text-green-300">5열</b></span>
            <span>결과 모니터링 <b className="text-green-200">2열</b></span>
            <span>효과 평가 <b className="text-lime-300">{showRPN ? '6열' : '5열'}</b></span>
            <span>비고 <b className="text-gray-200">1열</b></span>
            <span className="ml-auto font-bold text-white">
              합계: {showRPN ? '14' : '13'}컬럼 {showRPN ? '(RPN 포함)' : '(RPN 제외)'}
            </span>
          </>
        )}
      </div>
      
      {/* 워크시트 영역 - 좌우/상하 스크롤 */}
      <main 
        className="flex-1"
        style={{ 
          overflow: 'auto',
          minHeight: 0,  /* flex-1에서 스크롤 가능하게 */
        }}
      >
        {viewMode === 'all' ? (
          <AllTabEmpty rowCount={50} showRPN={showRPN} />
        ) : (
          <OptimizationTab rowCount={50} showRPN={showRPN} />
        )}
      </main>
    </div>
  );
}
