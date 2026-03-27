/**
 * LLDViewer - FMEA 문서 뷰어 패널
 * 
 * FMEA 구조를 계층형 트리로 표시
 */

'use client';

import React, { useMemo } from 'react';
import { SCOPE_LABEL_EN, SCOPE_YP } from '@/lib/fmea/scope-constants';

interface LLDViewerProps {
  state: any;
}

export default function LLDViewer({ state }: LLDViewerProps) {
  // L1 구조 추출
  const l1Structure = useMemo(() => {
    return {
      name: state?.l1?.name || '(미설정)',
      types: state?.l1?.types || [],
      failureScopes: state?.l1?.failureScopes || [],
    };
  }, [state?.l1]);

  // L2 공정 목록
  const l2Processes = useMemo(() => {
    return (state?.l2 || []).filter((p: any) => p.name?.trim());
  }, [state?.l2]);

  // 고장연결 수
  const failureLinkCount = (state as any)?.failureLinks?.length || 0;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 헤더 */}
      <div className="px-3 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-sm font-bold border-b">
        📚 FMEA 구조 뷰어
      </div>

      {/* 통계 */}
      <div className="p-2 bg-indigo-50 border-b flex gap-2 text-xs">
        <span className="bg-white px-2 py-1 rounded border">L2: {l2Processes.length}개</span>
        <span className="bg-white px-2 py-1 rounded border">연결: {failureLinkCount}건</span>
      </div>

      {/* 트리 뷰 */}
      <div className="flex-1 overflow-auto p-2 text-xs">
        {/* L1 (완제품) */}
        <div className="mb-3">
          <div className="flex items-center gap-1 text-indigo-700 font-bold mb-1">
            <span>📦</span>
            <span>L1: {l1Structure.name}</span>
          </div>

          {/* 구분 (YP, SP, U) */}
          {l1Structure.types.length > 0 ? (
            <div className="ml-4 border-l-2 border-indigo-200 pl-2">
              {l1Structure.types.map((type: any, idx: number) => (
                <div key={idx} className="mb-2">
                  <div className="font-semibold text-indigo-600">{type.name || SCOPE_LABEL_EN[SCOPE_YP]}</div>
                  <div className="ml-3 text-gray-600">
                    기능: {type.functions?.length || 0}개
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="ml-4 text-gray-400">구분 정보 없음</div>
          )}
        </div>

        {/* L2 (메인공정) */}
        <div className="mb-2">
          <div className="flex items-center gap-1 text-blue-700 font-bold mb-1">
            <span>🏭</span>
            <span>L2 공정 목록</span>
          </div>

          {l2Processes.length > 0 ? (
            <div className="ml-4 border-l-2 border-blue-200 pl-2 space-y-1">
              {l2Processes.map((proc: any, idx: number) => (
                <div key={proc.id || idx} className="flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    {proc.no || idx + 1}
                  </span>
                  <span className="text-gray-700">{proc.name}</span>
                  {(proc.l3?.length > 0) && (
                    <span className="text-gray-400">(L3: {proc.l3.length})</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="ml-4 text-gray-400">공정 없음</div>
          )}
        </div>

        {/* 고장영향 요약 */}
        {l1Structure.failureScopes.length > 0 && (
          <div className="mb-2">
            <div className="flex items-center gap-1 text-red-700 font-bold mb-1">
              <span>⚠️</span>
              <span>고장영향: {l1Structure.failureScopes.length}개</span>
            </div>
            <div className="ml-4 border-l-2 border-red-200 pl-2 space-y-1">
              {l1Structure.failureScopes.slice(0, 5).map((fs: any, idx: number) => (
                <div key={fs.id || idx} className="text-gray-600 truncate">
                  S{fs.severity || '?'}: {fs.effect || fs.name || '(미입력)'}
                </div>
              ))}
              {l1Structure.failureScopes.length > 5 && (
                <div className="text-gray-400">... 외 {l1Structure.failureScopes.length - 5}개</div>
              )}
            </div>
          </div>
        )}

        {/* 고장연결 요약 */}
        {failureLinkCount > 0 && (
          <div>
            <div className="flex items-center gap-1 text-green-700 font-bold mb-1">
              <span>🔗</span>
              <span>고장연결: {failureLinkCount}건</span>
            </div>
          </div>
        )}
      </div>

      {/* 푸터 */}
      <div className="p-2 bg-gray-50 border-t text-[10px] text-gray-500 text-center">
        FMEA 구조는 구조분석/기능분석 탭에서 편집
      </div>
    </div>
  );
}
