/**
 * GAPAnalysis - 갭 분석 패널
 * 
 * FMEA 데이터 완성도 분석 표시
 */

'use client';

import React, { useMemo } from 'react';

interface GAPAnalysisProps {
  state: any;
}

interface GapItem {
  category: string;
  label: string;
  current: number;
  target: number;
  status: 'good' | 'warning' | 'error';
}

export default function GAPAnalysis({ state }: GAPAnalysisProps) {
  // 갭 분석 데이터 계산
  const gapData = useMemo(() => {
    const items: GapItem[] = [];

    // L1 구조 확인
    const l1Name = state?.l1?.name || '';
    const hasL1 = Boolean(l1Name && !l1Name.includes('클릭'));
    items.push({
      category: '구조분석',
      label: 'L1 완제품 공정명',
      current: hasL1 ? 1 : 0,
      target: 1,
      status: hasL1 ? 'good' : 'error',
    });

    // L2 공정 확인
    const l2Count = (state?.l2 || []).filter((p: any) => p.name && !p.name.includes('클릭')).length;
    items.push({
      category: '구조분석',
      label: 'L2 메인공정',
      current: l2Count,
      target: 3, // 최소 3개 권장
      status: l2Count >= 3 ? 'good' : l2Count > 0 ? 'warning' : 'error',
    });

    // L3 작업요소 확인
    let l3Count = 0;
    (state?.l2 || []).forEach((p: any) => {
      l3Count += (p.l3 || []).filter((we: any) => we.name && !we.name.includes('클릭')).length;
    });
    items.push({
      category: '구조분석',
      label: 'L3 작업요소',
      current: l3Count,
      target: l2Count * 2, // 공정당 2개 권장
      status: l3Count >= l2Count * 2 ? 'good' : l3Count > 0 ? 'warning' : 'error',
    });

    // L1 기능 확인
    let l1FuncCount = 0;
    (state?.l1?.types || []).forEach((t: any) => {
      (t.functions || []).forEach((f: any) => {
        if (f.name) l1FuncCount++;
      });
    });
    items.push({
      category: '기능분석',
      label: 'L1 기능',
      current: l1FuncCount,
      target: 3,
      status: l1FuncCount >= 3 ? 'good' : l1FuncCount > 0 ? 'warning' : 'error',
    });

    // 고장영향 확인
    const feCount = (state?.l1?.failureScopes || []).length;
    items.push({
      category: '고장분석',
      label: '고장영향 (FE)',
      current: feCount,
      target: l1FuncCount || 1,
      status: feCount >= (l1FuncCount || 1) ? 'good' : feCount > 0 ? 'warning' : 'error',
    });

    // 고장형태 확인
    let fmCount = 0;
    (state?.l2 || []).forEach((p: any) => {
      fmCount += (p.failureModes || []).filter((fm: any) => fm.name).length;
    });
    items.push({
      category: '고장분석',
      label: '고장형태 (FM)',
      current: fmCount,
      target: l2Count || 1,
      status: fmCount >= (l2Count || 1) ? 'good' : fmCount > 0 ? 'warning' : 'error',
    });

    // 고장원인 확인
    let fcCount = 0;
    (state?.l2 || []).forEach((p: any) => {
      fcCount += (p.failureCauses || []).filter((fc: any) => fc.name).length;
    });
    items.push({
      category: '고장분석',
      label: '고장원인 (FC)',
      current: fcCount,
      target: fmCount || 1,
      status: fcCount >= (fmCount || 1) ? 'good' : fcCount > 0 ? 'warning' : 'error',
    });

    // 고장연결 확인
    const linkCount = (state as any)?.failureLinks?.length || 0;
    items.push({
      category: '고장분석',
      label: '고장연결',
      current: linkCount,
      target: Math.min(fmCount, fcCount) || 1,
      status: linkCount > 0 ? 'good' : 'error',
    });

    return items;
  }, [state]);

  // 전체 완성도 계산
  const overallScore = useMemo(() => {
    const good = gapData.filter(g => g.status === 'good').length;
    return Math.round((good / gapData.length) * 100);
  }, [gapData]);

  // 카테고리별 그룹핑
  const groupedData = useMemo(() => {
    const groups: Record<string, GapItem[]> = {};
    gapData.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [gapData]);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 헤더 */}
      <div className="px-3 py-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white text-sm font-bold border-b">
        🔍 GAP 분석
      </div>

      {/* 전체 점수 */}
      <div className="p-3 bg-purple-50 border-b">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-purple-700">전체 완성도</span>
          <span className={`text-2xl font-black ${overallScore >= 80 ? 'text-green-600' :
              overallScore >= 50 ? 'text-orange-500' : 'text-red-600'
            }`}>
            {overallScore}%
          </span>
        </div>
        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${overallScore >= 80 ? 'bg-green-500' :
                overallScore >= 50 ? 'bg-orange-500' : 'bg-red-500'
              }`}
            style={{ width: `${overallScore}%` }}
          />
        </div>
      </div>

      {/* GAP 목록 */}
      <div className="flex-1 overflow-auto p-2 space-y-3">
        {Object.entries(groupedData).map(([category, items]) => (
          <div key={category}>
            <div className="text-xs font-bold text-gray-600 mb-1">{category}</div>
            <div className="space-y-1">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded border text-xs flex items-center justify-between ${item.status === 'good' ? 'bg-green-50 border-green-200' :
                      item.status === 'warning' ? 'bg-orange-50 border-orange-200' :
                        'bg-red-50 border-red-200'
                    }`}
                >
                  <span className="font-medium">{item.label}</span>
                  <span className={`font-bold ${item.status === 'good' ? 'text-green-600' :
                      item.status === 'warning' ? 'text-orange-600' :
                        'text-red-600'
                    }`}>
                    {item.current}/{item.target}
                    {item.status === 'good' && ' ✓'}
                    {item.status === 'error' && ' ✗'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 푸터 */}
      <div className="p-2 bg-gray-50 border-t text-[10px] text-gray-500 text-center">
        ✗ 항목은 필수 입력 권장
      </div>
    </div>
  );
}
