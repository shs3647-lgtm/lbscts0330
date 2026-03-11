'use client';

/**
 * @file FMEA4판 독립 페이지
 * @description PFMEA 7단계에서 FMEA 4판 형식으로 변환하여 표시
 */

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PFMEATopNav } from '@/components/layout';
import { WorksheetState, createInitialState } from '../worksheet/constants';
import { Fmea4Tab, convertToFmea4 } from '../worksheet/tabs/fmea4';

// 실제 컨텐츠 컴포넌트
function Fmea4Content() {
  const searchParams = useSearchParams();
  const fmeaId = searchParams.get('id');
  
  const [state, setState] = useState<WorksheetState>(createInitialState());
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setDirty] = useState(false);

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // localStorage에서 FMEA 데이터 로드
        const storageKeys = ['pfmea-projects', 'pfmea_projects', 'fmea-projects'];
        let loadedState: WorksheetState | null = null;

        for (const key of storageKeys) {
          const saved = localStorage.getItem(key);
          if (saved) {
            try {
              const projects = JSON.parse(saved);
              if (Array.isArray(projects) && projects.length > 0) {
                // ID로 찾거나 첫 번째 프로젝트 사용
                const project = fmeaId 
                  ? projects.find((p: { id?: string }) => p.id === fmeaId)
                  : projects[0];
                
                if (project?.worksheetData) {
                  loadedState = project.worksheetData;
                  break;
                }
              }
            } catch (e) {
              console.warn(`Failed to parse ${key}:`, e);
            }
          }
        }

        // 워크시트 데이터 직접 로드 시도
        if (!loadedState) {
          const worksheetData = localStorage.getItem('fmea-worksheet-data');
          if (worksheetData) {
            loadedState = JSON.parse(worksheetData);
          }
        }

        if (loadedState) {
          // 7단계 데이터를 4판으로 자동 변환
          const fmea4Rows = convertToFmea4(loadedState);
          console.log('✅ FMEA 4판 자동 변환 완료:', fmea4Rows.length, '행');
          
          setState({
            ...loadedState,
            fmea4Rows: fmea4Rows
          } as WorksheetState);
        }
      } catch (error) {
        console.error('데이터 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [fmeaId]);

  // 통계 계산
  const stats = useMemo(() => {
    const l2Count = state.l2?.length || 0;
    const l3Count = state.l2?.reduce((sum, proc) => sum + (proc.l3?.length || 0), 0) || 0;
    const fmCount = state.l2?.reduce((sum, proc) => 
      sum + (proc.failureModes?.length || 0), 0) || 0;
    
    return {
      l2Count,
      l3Count,
      fmCount,
    };
  }, [state]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">FMEA 4판 데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {/* TopNav */}
      <PFMEATopNav 
        selectedFmeaId={fmeaId || undefined}
      />

      {/* 헤더 */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-800 text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold">📊 FMEA 4판 (RPN 방식)</h1>
          <span className="text-xs text-blue-200">
            전통적인 S×O×D = RPN 방식의 FMEA 워크시트
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="bg-blue-600/50 px-2 py-1 rounded">
            공정: {stats.l2Count}
          </span>
          <span className="bg-blue-600/50 px-2 py-1 rounded">
            작업요소: {stats.l3Count}
          </span>
          <span className="bg-blue-600/50 px-2 py-1 rounded">
            FM: {stats.fmCount}
          </span>
          {isDirty && (
            <span className="bg-yellow-500/80 px-2 py-1 rounded text-yellow-100">
              ⚠️ 저장 필요
            </span>
          )}
        </div>
      </div>

      {/* FMEA 4판 탭 */}
      <div className="flex-1 overflow-hidden">
        <Fmea4Tab 
          state={state}
          setState={setState}
          setDirty={setDirty}
        />
      </div>

      {/* 상태 바 */}
      <div className="bg-gray-800 text-white px-4 py-1 text-xs flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span>FMEA 4판 (RPN 방식)</span>
          <span className="text-gray-400">|</span>
          <span>S×O×D = RPN</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-400">
            {new Date().toLocaleString('ko-KR')}
          </span>
        </div>
      </div>
    </div>
  );
}

// Suspense로 감싸서 export
export default function Fmea4Page() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    }>
      <Fmea4Content />
    </Suspense>
  );
}
