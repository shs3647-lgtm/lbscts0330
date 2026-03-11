/**
 * @file ProjectDashboardCharts.tsx
 * @description recharts 기반 차트 컴포넌트 (dynamic import 최적화용)
 * - 모듈별 진행현황 Stacked Bar Chart
 * - 상태별 프로젝트 수 Bar Chart
 * recharts 번들이 이 파일에만 포함되어 lazy-load됨
 */

'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, Cell } from 'recharts';

const STATUS_COLORS = {
  Open: '#6366f1',
  Progress: '#3B82F6',
  Complete: '#10B981',
  Delay: '#EF4444'
};

interface ModuleStatusItem {
  name: string;
  Open: number;
  Progress: number;
  Complete: number;
  Delay: number;
}

interface StatusChartItem {
  name: string;
  count: number;
  percent: string;
  color: string;
}

interface ProjectDashboardChartsProps {
  moduleStatusData: ModuleStatusItem[];
  statusChartData: StatusChartItem[];
  totalProjects: number;
  chartCardStyle: React.CSSProperties;
  chartTitleStyle: React.CSSProperties;
  chartContainerStyle: React.CSSProperties;
}

export default function ProjectDashboardCharts({
  moduleStatusData,
  statusChartData,
  totalProjects,
  chartCardStyle,
  chartTitleStyle,
  chartContainerStyle,
}: ProjectDashboardChartsProps) {
  return (
    <>
      {/* 📊 모듈별 진행현황 (Stacked Bar Chart) */}
      <div style={chartCardStyle}>
        <div style={chartTitleStyle}>
          📊 모듈별 진행현황
        </div>
        <div style={chartContainerStyle}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={moduleStatusData} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 600 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(255,255,255,0.95)',
                  border: '1px solid #ccc',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="Open" stackId="a" fill={STATUS_COLORS.Open} name="Open">
                <LabelList
                  dataKey="Open"
                  position="center"
                  content={({ x, y, width, height, value }: any) => {
                    if (!value || value === 0) return null;
                    const pct = totalProjects > 0 ? ((value / totalProjects) * 100).toFixed(0) : '0';
                    return (
                      <text
                        x={Number(x) + Number(width) / 2}
                        y={Number(y) + Number(height) / 2 + 4}
                        textAnchor="middle"
                        style={{ fontSize: 9, fontWeight: 'bold', fill: '#fff' }}
                      >
                        {value}({pct}%)
                      </text>
                    );
                  }}
                />
              </Bar>
              <Bar dataKey="Progress" stackId="a" fill={STATUS_COLORS.Progress} name="Progress">
                <LabelList
                  dataKey="Progress"
                  position="center"
                  content={({ x, y, width, height, value }: any) => {
                    if (!value || value === 0) return null;
                    const pct = totalProjects > 0 ? ((value / totalProjects) * 100).toFixed(0) : '0';
                    return (
                      <text
                        x={Number(x) + Number(width) / 2}
                        y={Number(y) + Number(height) / 2 + 4}
                        textAnchor="middle"
                        style={{ fontSize: 9, fontWeight: 'bold', fill: '#fff' }}
                      >
                        {value}({pct}%)
                      </text>
                    );
                  }}
                />
              </Bar>
              <Bar dataKey="Complete" stackId="a" fill={STATUS_COLORS.Complete} name="Complete">
                <LabelList
                  dataKey="Complete"
                  position="center"
                  content={({ x, y, width, height, value }: any) => {
                    if (!value || value === 0) return null;
                    const pct = totalProjects > 0 ? ((value / totalProjects) * 100).toFixed(0) : '0';
                    return (
                      <text
                        x={Number(x) + Number(width) / 2}
                        y={Number(y) + Number(height) / 2 + 4}
                        textAnchor="middle"
                        style={{ fontSize: 9, fontWeight: 'bold', fill: '#fff' }}
                      >
                        {value}({pct}%)
                      </text>
                    );
                  }}
                />
              </Bar>
              <Bar dataKey="Delay" stackId="a" fill={STATUS_COLORS.Delay} name="Delay">
                <LabelList
                  dataKey="Delay"
                  position="center"
                  content={({ x, y, width, height, value }: any) => {
                    if (!value || value === 0) return null;
                    const pct = totalProjects > 0 ? ((value / totalProjects) * 100).toFixed(0) : '0';
                    return (
                      <text
                        x={Number(x) + Number(width) / 2}
                        y={Number(y) + Number(height) / 2 + 4}
                        textAnchor="middle"
                        style={{ fontSize: 9, fontWeight: 'bold', fill: '#fff' }}
                      >
                        {value}({pct}%)
                      </text>
                    );
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 📈 상태별 프로젝트 수 (Bar Chart) */}
      <div style={chartCardStyle}>
        <div style={chartTitleStyle}>
          📈 상태별 프로젝트 수
        </div>
        <div style={chartContainerStyle}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusChartData} margin={{ top: 30, right: 20, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 600 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(255,255,255,0.95)',
                  border: '1px solid #ccc',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}
              />
              <Bar dataKey="count" name="프로젝트 수">
                {statusChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
                <LabelList
                  dataKey="count"
                  position="top"
                  content={({ x, y, width, value, index }: any) => {
                    const item = statusChartData[index];
                    return (
                      <text
                        x={Number(x) + Number(width) / 2}
                        y={Number(y) - 8}
                        textAnchor="middle"
                        style={{ fontSize: 11, fontWeight: 'bold', fill: '#333' }}
                      >
                        {value} ({item?.percent}%)
                      </text>
                    );
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
