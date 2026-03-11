/**
 * @file PfmeaDashboardCharts.tsx
 * @description recharts 기반 PFMEA 대시보드 차트 (dynamic import 최적화용)
 * - 상태별 현황 도넛 차트 (PieChart)
 * - 단계별 진행 현황 바 차트 (BarChart)
 * recharts 번들이 이 파일에만 포함되어 lazy-load됨
 */

'use client';

import React from 'react';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList
} from 'recharts';

interface StatusPieItem {
  name: string;
  value: number;
  color: string;
}

interface StepProgressItem {
  name: string;
  count: number;
  color: string;
}

interface PfmeaDashboardChartsProps {
  statusPieData: StatusPieItem[];
  stepProgressData: StepProgressItem[];
}

export default function PfmeaDashboardCharts({ statusPieData, stepProgressData }: PfmeaDashboardChartsProps) {
  return (
    <>
      {/* 상태별 현황 도넛 차트 */}
      <div
        className="rounded-xl p-3 border border-gray-700"
        style={{ background: 'rgba(255, 255, 255, 0.05)' }}
      >
        <h2 className="text-xs font-semibold text-white text-center mb-2">📊 상태별 현황</h2>
        {/* 범례 */}
        <div className="flex justify-center gap-3 mb-2">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded mr-1" style={{ backgroundColor: '#22c55e' }}></div>
            <span className="text-[10px] text-gray-300">완료</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded mr-1" style={{ backgroundColor: '#3b82f6' }}></div>
            <span className="text-[10px] text-gray-300">진행중</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded mr-1" style={{ backgroundColor: '#eab308' }}></div>
            <span className="text-[10px] text-gray-300">지연</span>
          </div>
        </div>
        {/* 도넛 차트 */}
        <div style={{ height: 130 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusPieData.length > 0 ? statusPieData : [{ name: '없음', value: 1, color: '#374151' }]}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={55}
                paddingAngle={2}
                dataKey="value"
                label={({ value, percent }) => `${value}건 (${((percent ?? 0) * 100).toFixed(0)}%)`}
                labelLine={false}
              >
                {(statusPieData.length > 0 ? statusPieData : [{ name: '없음', value: 1, color: '#374151' }]).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value}건`, '']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 단계별 진행 현황 바 차트 */}
      <div
        className="col-span-2 rounded-xl p-3 border border-gray-700"
        style={{ background: 'rgba(255, 255, 255, 0.03)' }}
      >
        <h2 className="text-sm font-semibold text-white mb-2">📊 단계별 진행 현황</h2>
        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stepProgressData} layout="vertical" margin={{ left: 10, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" tick={{ fill: '#9ca3af' }} />
              <YAxis dataKey="name" type="category" tick={{ fill: '#9ca3af' }} width={60} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {stepProgressData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
                <LabelList dataKey="count" position="right" fill="#fff" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
