/**
 * @file StatsSummary.tsx
 * @description 대시보드 상단 통계 요약 카드
 */

'use client';

import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  trend?: { value: number; isUp: boolean };
  color: string;
  bgGradient: string;
}

function StatCard({ label, value, icon, trend, color, bgGradient }: StatCardProps) {
  return (
    <div 
      className="relative overflow-hidden rounded-lg px-4 py-2 text-white shadow-md transition-transform hover:scale-[1.01]"
      style={{ background: bgGradient }}
    >
      {/* 배경 패턴 */}
      <div className="absolute -right-2 -top-2 text-4xl opacity-20">
        {icon}
      </div>
      
      <div className="relative z-10 flex items-center gap-3">
        <div>
          <p className="text-xs font-medium opacity-80">{label}</p>
          <p className="text-2xl font-black tracking-tight">{value}</p>
        </div>
        {trend && (
          <p className={`text-[10px] flex items-center gap-0.5 ${trend.isUp ? 'text-green-200' : 'text-red-200'}`}>
            <span>{trend.isUp ? '▲' : '▼'}</span>
            <span>{Math.abs(trend.value)}%</span>
          </p>
        )}
      </div>
    </div>
  );
}

interface StatsSummaryProps {
  totalItems: number;
  highRiskCount: number;
  avgRPN: number;
  improvementRate: number;
}

export function StatsSummary({ totalItems, highRiskCount, avgRPN, improvementRate }: StatsSummaryProps) {
  return (
    <div className="grid grid-cols-4 gap-3 mb-3">
      <StatCard
        label="전체 항목"
        value={totalItems}
        icon="📊"
        color="#0ea5e9"
        bgGradient="linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)"
      />
      <StatCard
        label="High Risk (AP:H)"
        value={highRiskCount}
        icon="⚠️"
        trend={{ value: 15, isUp: false }}
        color="#ef4444"
        bgGradient="linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
      />
      <StatCard
        label="평균 RPN"
        value={avgRPN}
        icon="📈"
        trend={{ value: 8, isUp: false }}
        color="#f59e0b"
        bgGradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
      />
      <StatCard
        label="개선 완료율"
        value={`${improvementRate}%`}
        icon="✅"
        trend={{ value: 12, isUp: true }}
        color="#22c55e"
        bgGradient="linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
      />
    </div>
  );
}

