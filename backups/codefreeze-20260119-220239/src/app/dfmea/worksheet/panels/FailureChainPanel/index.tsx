// @ts-nocheck
/**
 * @file FailureChainPanel/index.tsx
 * @description ALL 탭 우측 패널 - 고장사슬(Failure Chain) 뷰어
 * 
 * FM(고장형태)를 선택하면 연결된 FE(고장영향), FC(고장원인)을 시각적으로 표시
 */

'use client';

import React, { useState, useMemo } from 'react';

interface FailureChainPanelProps {
  state: any;
  setState?: React.Dispatch<React.SetStateAction<any>>;
}

interface FMItem {
  id: string;
  fmNo: string;
  processName: string;
  text: string;
}

interface FEItem {
  id: string;
  feNo: string;
  scope: string;
  text: string;
  severity: number;
}

interface FCItem {
  id: string;
  fcNo: string;
  text: string;
  m4: string;
  workElem: string;
}

export default function FailureChainPanel({ state }: FailureChainPanelProps) {
  const [selectedFmId, setSelectedFmId] = useState<string | null>(null);
  
  // 고장연결 데이터 추출
  const failureLinks = useMemo(() => {
    return (state as any)?.failureLinks || [];
  }, [state]);
  
  // ========== 공정 순서 추출 (state.l2 기준) ==========
  const processOrder = useMemo(() => {
    const order = new Map<string, number>();
    (state?.l2 || []).forEach((proc: any, procIdx: number) => {
      // 공정 내 FM 순서도 추적
      (proc.failureModes || []).forEach((fm: any, fmIdx: number) => {
        if (fm.id) {
          // 공정인덱스 * 1000 + FM인덱스로 전체 순서 계산
          order.set(fm.id, procIdx * 1000 + fmIdx);
        }
      });
    });
    return order;
  }, [state?.l2]);
  
  // FM 목록 추출 (중복 제거 + 공정 순서 정렬)
  const fmList = useMemo(() => {
    const fmMap = new Map<string, FMItem & { sortOrder: number }>();
    
    failureLinks.forEach((link: any) => {
      if (link.fmId && link.fmText && !fmMap.has(link.fmId)) {
        // 공정 순서 가져오기
        const sortOrder = processOrder.get(link.fmId) ?? 999999;
        
        fmMap.set(link.fmId, {
          id: link.fmId,
          fmNo: '', // 정렬 후 재부여
          processName: link.fmProcess || '',
          text: link.fmText,
          sortOrder,
        });
      }
    });
    
    // 공정 순서대로 정렬
    const sorted = Array.from(fmMap.values()).sort((a, b) => a.sortOrder - b.sortOrder);
    
    // 정렬된 순서대로 번호 재부여
    return sorted.map((fm, idx) => ({
      ...fm,
      fmNo: `M${idx + 1}`,
    }));
  }, [failureLinks, processOrder]);
  
  // 선택된 FM에 연결된 FE, FC 추출
  const linkedData = useMemo(() => {
    if (!selectedFmId) return { fes: [], fcs: [] };
    
    const feMap = new Map<string, FEItem>();
    const fcMap = new Map<string, FCItem>();
    let feCounter = 1;
    let fcCounter = 1;
    
    failureLinks.forEach((link: any) => {
      if (link.fmId !== selectedFmId) return;
      
      // FE 추출
      if (link.feId && link.feText && !feMap.has(link.feId)) {
        feMap.set(link.feId, {
          id: link.feId,
          feNo: `Y${feCounter++}`,
          scope: link.feScope || 'Your Plant',
          text: link.feText,
          severity: link.severity || 0,
        });
      }
      
      // FC 추출
      if (link.fcId && link.fcText && !fcMap.has(link.fcId)) {
        fcMap.set(link.fcId, {
          id: link.fcId,
          fcNo: `C${fcCounter++}`,
          text: link.fcText,
          m4: link.fcM4 || '',
          workElem: link.fcWorkElem || '',
        });
      }
    });
    
    return {
      fes: Array.from(feMap.values()),
      fcs: Array.from(fcMap.values()),
    };
  }, [selectedFmId, failureLinks]);
  
  // 선택된 FM 정보
  const selectedFm = useMemo(() => {
    return fmList.find(fm => fm.id === selectedFmId);
  }, [selectedFmId, fmList]);
  
  // 자동으로 첫 번째 FM 선택
  React.useEffect(() => {
    if (!selectedFmId && fmList.length > 0) {
      setSelectedFmId(fmList[0].id);
    }
  }, [fmList, selectedFmId]);
  
  if (failureLinks.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 p-4">
        <div className="text-4xl mb-4">🔗</div>
        <div className="text-center text-sm">
          고장연결 데이터가 없습니다.<br/>
          고장연결 탭에서 먼저 연결을 완료하세요.
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 헤더 */}
      <div className="px-3 py-2 bg-gradient-to-r from-orange-600 to-orange-500 text-white text-sm font-bold border-b">
        🔗 고장사슬 (FM: {fmList.length}개)
      </div>
      
      {/* FM 선택 탭 */}
      <div className="flex flex-wrap gap-1 p-2 bg-white border-b max-h-[120px] overflow-y-auto">
        {fmList.map((fm, idx) => (
          <button
            key={fm.id}
            onClick={() => setSelectedFmId(fm.id)}
            className={`px-2 py-1 text-xs rounded border transition-all ${
              selectedFmId === fm.id
                ? 'bg-orange-500 text-white border-orange-600 font-bold'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-orange-50'
            }`}
            title={fm.text}
          >
            {fm.fmNo}
          </button>
        ))}
      </div>
      
      {/* 선택된 FM 정보 */}
      {selectedFm && (
        <div className="p-2 bg-orange-50 border-b">
          <div className="text-xs text-orange-600 font-bold mb-1">
            {selectedFm.fmNo} | {selectedFm.processName}
          </div>
          <div className="text-sm font-medium text-gray-800">
            {selectedFm.text}
          </div>
        </div>
      )}
      
      {/* 연결 다이어그램 */}
      <div className="flex-1 overflow-auto p-2">
        <div className="flex gap-2 min-h-full">
          {/* FE 컬럼 */}
          <div className="flex-1 flex flex-col gap-2">
            <div className="text-xs font-bold text-blue-600 text-center py-1 bg-blue-100 rounded">
              FE (고장영향: {linkedData.fes.length})
            </div>
            {linkedData.fes.map(fe => (
              <div
                key={fe.id}
                className="p-2 bg-blue-50 border border-blue-200 rounded text-xs"
              >
                <div className="font-bold text-blue-700 mb-1">
                  {fe.feNo} | S:{fe.severity}
                </div>
                <div className="text-gray-700">{fe.text}</div>
              </div>
            ))}
            {linkedData.fes.length === 0 && (
              <div className="text-xs text-gray-400 text-center py-4">
                연결된 FE 없음
              </div>
            )}
          </div>
          
          {/* 연결선 표시 영역 */}
          <div className="w-4 flex items-center justify-center">
            <div className="h-full w-0.5 bg-gray-300 relative">
              {/* 화살표 효과 */}
              <div className="absolute top-1/2 -left-1 w-3 h-3 border-t-2 border-r-2 border-gray-400 transform rotate-45 -translate-y-1/2"></div>
            </div>
          </div>
          
          {/* FC 컬럼 */}
          <div className="flex-1 flex flex-col gap-2">
            <div className="text-xs font-bold text-green-600 text-center py-1 bg-green-100 rounded">
              FC (고장원인: {linkedData.fcs.length})
            </div>
            {linkedData.fcs.map(fc => (
              <div
                key={fc.id}
                className="p-2 bg-green-50 border border-green-200 rounded text-xs"
              >
                <div className="font-bold text-green-700 mb-1">
                  {fc.fcNo} | {fc.m4}
                </div>
                <div className="text-gray-700">{fc.text}</div>
                {fc.workElem && (
                  <div className="text-[10px] text-gray-500 mt-1">
                    작업요소: {fc.workElem}
                  </div>
                )}
              </div>
            ))}
            {linkedData.fcs.length === 0 && (
              <div className="text-xs text-gray-400 text-center py-4">
                연결된 FC 없음
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* FM 네비게이션 */}
      <div className="flex justify-between p-2 bg-white border-t">
        <button
          onClick={() => {
            const idx = fmList.findIndex(fm => fm.id === selectedFmId);
            if (idx > 0) setSelectedFmId(fmList[idx - 1].id);
          }}
          disabled={!selectedFmId || fmList.findIndex(fm => fm.id === selectedFmId) === 0}
          className="px-3 py-1 text-xs bg-gray-100 rounded disabled:opacity-50 hover:bg-gray-200"
        >
          ◀ 이전 FM
        </button>
        <button
          onClick={() => {
            const idx = fmList.findIndex(fm => fm.id === selectedFmId);
            if (idx < fmList.length - 1) setSelectedFmId(fmList[idx + 1].id);
          }}
          disabled={!selectedFmId || fmList.findIndex(fm => fm.id === selectedFmId) === fmList.length - 1}
          className="px-3 py-1 text-xs bg-gray-100 rounded disabled:opacity-50 hover:bg-gray-200"
        >
          다음 FM ▶
        </button>
      </div>
    </div>
  );
}
