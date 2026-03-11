/**
 * @file APSummaryChart.tsx
 * @description AP 개선 전/후 등급 분포 비교 막대 그래프
 */

'use client';

import React from 'react';

interface APSummaryChartProps {
    stats: {
        high: number;
        medium: number;
        low: number;
        // 개선 후 데이터를 위해 추가적인 계산이 필요할 수 있으나, 
        // 하위 호환성을 위해 props 구조를 유지하거나 내부에서 계산합니다.
    };
    data: any[]; // 전체 데이터를 받아 개선 후(AP6) 통계를 직접 계산
}

export default function APSummaryChart({ stats, data }: APSummaryChartProps) {
    // 개선 후(AP 후) 통계 계산
    const afterStats = {
        high: data.filter(d => d.ap6 === 'H').length,
        medium: data.filter(d => d.ap6 === 'M').length,
        low: data.filter(d => d.ap6 === 'L').length,
    };

    const categories = [
        { label: 'High', before: stats.high, after: afterStats.high, color: '#ef4444' },
        { label: 'Medium', before: stats.medium, after: afterStats.medium, color: '#f59e0b' },
        { label: 'Low', before: stats.low, after: afterStats.low, color: '#10b981' },
    ];

    const maxValue = Math.max(...categories.map(c => Math.max(c.before, c.after, 1)));

    return (
        <div className="bg-white rounded-lg border border-[#999] p-3 shadow-sm h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] font-bold text-[#00587a]">📊 AP 등급 분포 (개선 전 vs 개선 후)</h3>
                <div className="flex gap-3 text-[9px]">
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-[#00587a] opacity-40 rounded-sm"></span>
                        <span className="text-gray-500">개선 전 (AP 전)</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-[#00587a] rounded-sm"></span>
                        <span className="text-gray-500">개선 후 (AP 후)</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex items-end justify-around gap-4 px-2 pt-4 pb-2">
                {categories.map((cat, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                        <div className="flex items-end gap-1.5 h-24 w-full justify-center">
                            {/* 개선 전 막대 */}
                            <div className="relative flex flex-col items-center w-5">
                                <span className="text-[9px] font-bold text-gray-400 mb-1">{cat.before}</span>
                                <div
                                    className="w-full bg-[#00587a] opacity-40 rounded-t-sm transition-all duration-500"
                                    style={{ height: `${(cat.before / maxValue) * 100}%` }}
                                />
                            </div>
                            {/* 개선 후 막대 */}
                            <div className="relative flex flex-col items-center w-5">
                                <span className="text-[9px] font-bold text-[#00587a] mb-1">{cat.after}</span>
                                <div
                                    className="w-full bg-[#00587a] rounded-t-sm transition-all duration-500 shadow-sm"
                                    style={{ height: `${(cat.after / maxValue) * 100}%`, backgroundColor: cat.color }}
                                />
                            </div>
                        </div>
                        <span className="text-[10px] font-bold text-gray-600">{cat.label}</span>
                    </div>
                ))}
            </div>

            <div className="mt-2 text-[9px] text-center text-gray-400 border-t border-dashed pt-1">
                전체 대상 {data.length}건에 대한 AP 등급 이동 현황
            </div>
        </div>
    );
}
