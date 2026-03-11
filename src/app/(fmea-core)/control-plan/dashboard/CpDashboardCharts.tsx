/**
 * @file CpDashboardCharts.tsx
 * @description recharts 기반 CP 대시보드 차트 (dynamic import 최적화용)
 * - CP 종류별 도넛 차트 (PieChart)
 * - 기밀수준별 바 차트 (BarChart)
 */

'use client';

import React from 'react';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList
} from 'recharts';

interface TypePieItem {
  name: string;
  value: number;
  color: string;
}

interface ConfItem {
  name: string;
  count: number;
  color: string;
}

interface CpDashboardChartsProps {
  typePieData: TypePieItem[];
  confidentialityData: ConfItem[];
}

export default function CpDashboardCharts({ typePieData, confidentialityData }: CpDashboardChartsProps) {
  return (
    <>
      {/* CP 종류별 현황 도넛 차트 */}
      <div
        className="rounded-xl p-3 border border-gray-700"
        style={{ background: 'rgba(255, 255, 255, 0.05)' }}
      >
        <h2 className="text-xs font-semibold text-white text-center mb-2">📊 CP 종류별 현황(Type)</h2>
        {/* 범례 */}
        <div className="flex justify-center gap-3 mb-2">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded mr-1" style={{ backgroundColor: '#14b8a6' }}></div>
            <span className="text-[10px] text-gray-300">Prototype</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded mr-1" style={{ backgroundColor: '#0d9488' }}></div>
            <span className="text-[10px] text-gray-300">Pre-Launch</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded mr-1" style={{ backgroundColor: '#0f766e' }}></div>
            <span className="text-[10px] text-gray-300">Production</span>
          </div>
        </div>
        {/* 도넛 차트 */}
        <div style={{ height: 130 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={typePieData.length > 0 ? typePieData : [{ name: '없음', value: 1, color: '#374151' }]}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={55}
                paddingAngle={2}
                dataKey="value"
                label={({ value, percent }) => `${value}건 (${((percent ?? 0) * 100).toFixed(0)}%)`}
                labelLine={false}
              >
                {(typePieData.length > 0 ? typePieData : [{ name: '없음', value: 1, color: '#374151' }]).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value}건`, '']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CP 종류/분류별 바 차트 */}
      <div
        className="col-span-2 rounded-xl p-3 border border-gray-700"
        style={{ background: 'rgba(255, 255, 255, 0.03)' }}
      >
        <h2 className="text-sm font-semibold text-white mb-2">📊 CP 분류별 현황(Category)</h2>
        <div style={{ height: 180 }}>
          {confidentialityData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={confidentialityData} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" tick={{ fill: '#9ca3af' }} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#9ca3af' }} width={80} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {confidentialityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                  <LabelList dataKey="count" position="right" fill="#fff" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">
              데이터가 없습니다
            </div>
          )}
        </div>
      </div>
    </>
  );
}
