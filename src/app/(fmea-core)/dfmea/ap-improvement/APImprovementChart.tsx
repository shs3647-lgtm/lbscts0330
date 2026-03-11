/**
 * @file APImprovementChart.tsx
 * @description AP 개선 전후 비교 그래프 (RPN ID 직사각형 그래프 스타일 적용)
 */

'use client';

import React from 'react';
import { APItem } from './types';

interface APImprovementChartProps {
    data: APItem[];
}

export default function APImprovementChart({ data }: APImprovementChartProps) {
    // AP 등급별 카운트 계산
    const ap5Stats = {
        H: data.filter((d) => d.ap5 === 'H').length,
        M: data.filter((d) => d.ap5 === 'M').length,
        L: data.filter((d) => d.ap5 === 'L').length,
    };

    const ap6Stats = {
        H: data.filter((d) => d.ap6 === 'H').length,
        M: data.filter((d) => d.ap6 === 'M').length,
        L: data.filter((d) => d.ap6 === 'L').length,
    };

    const chartData = [
        { label: 'High AP', before: ap5Stats.H, after: ap6Stats.H, color: '#dc2626' },
        { label: 'Medium AP', before: ap5Stats.M, after: ap6Stats.M, color: '#eab308' },
        { label: 'Low AP', before: ap5Stats.L, after: ap6Stats.L, color: '#16a34a' },
    ];

    const maxValue = Math.max(
        ...chartData.map((d) => Math.max(d.before, d.after, 1))
    );

    return (
        <div className="bg-white rounded-lg border border-[#999] p-4 shadow-sm">
            <div className="flex justify-between items-end mb-4 border-b pb-2">
                <div>
                    <h2 className="text-sm font-bold text-[#00587a]">📊 AP 개선 현황 (AP Improvement Status)</h2>
                    <p className="text-[10px] text-gray-500">좌측: AP (개선전) · 중앙: 등급 · 우측: AP (개선후)</p>
                </div>
                <div className="flex gap-3 text-[10px] font-medium">
                    <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 bg-blue-600 rounded-sm"></span>
                        <span>AP (개선전)</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 bg-green-600 rounded-sm"></span>
                        <span>AP (개선후)</span>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {chartData.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_80px_1fr] gap-4 items-center">
                        {/* 좌측: AP5 */}
                        <div className="flex items-center justify-end gap-2">
                            <span className="text-[11px] font-bold text-gray-600 min-w-[20px] text-right">{item.before}</span>
                            <div className="relative flex-1 h-5 bg-gray-100 rounded-sm overflow-hidden border border-gray-200">
                                <div
                                    className="absolute right-0 top-0 h-full bg-blue-600 transition-all duration-500"
                                    style={{ width: `${(item.before / maxValue) * 100}%` }}
                                />
                            </div>
                        </div>

                        {/* 중앙: 라벨 */}
                        <div className="text-center">
                            <div className="text-[11px] font-bold text-[#333] leading-tight">{item.label}</div>
                            <div className="text-[8px] text-gray-400 font-medium">RANK</div>
                        </div>

                        {/* 우측: AP6 */}
                        <div className="flex items-center justify-start gap-2">
                            <div className="relative flex-1 h-5 bg-gray-100 rounded-sm overflow-hidden border border-gray-200">
                                <div
                                    className="absolute left-0 top-0 h-full bg-green-600 transition-all duration-500"
                                    style={{ width: `${(item.after / maxValue) * 100}%` }}
                                />
                            </div>
                            <span className="text-[11px] font-bold text-gray-600 min-w-[20px]">{item.after}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 pt-2 border-t border-dashed">
                <div className="grid grid-cols-2 gap-4 text-[10px] text-gray-500 px-2">
                    <div className="text-right">Total AP (개선전) Items: {data.length}</div>
                    <div className="text-left">Total AP (개선후) Items: {data.length}</div>
                </div>
            </div>
        </div>
    );
}
