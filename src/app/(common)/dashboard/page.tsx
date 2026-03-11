/**
 * @file page.tsx
 * @description FMEA Dashboard - FMEA 선택 시 통계 현황 표시
 * @version 3.0.0 - 좌: 그래프, 우: 테이블 레이아웃
 * @updated 2026-01-23
 */

'use client';

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useLocale } from '@/lib/locale';
import { useDashboardStats } from './hooks/useDashboardStats';
import { RefreshCw, Download, LayoutDashboard, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import APImprovement from '@/components/dashboard/APImprovement';

// chart.js 번들을 lazy-load (약 200KB+ 절감)
const ImprovementChart = dynamic(
  () => import('./components/DashboardCharts').then(mod => mod.ImprovementChart),
  { ssr: false, loading: () => <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">차트 로딩 중...</div> }
);
// RPN 파레토 차트 — 현재 비활성화
// const RpnParetoChart = dynamic(
//   () => import('./components/DashboardCharts').then(mod => mod.RpnParetoChart),
//   { ssr: false, loading: () => <div className="h-[350px] flex items-center justify-center text-slate-400 text-sm">차트 로딩 중...</div> }
// );

// 상단 네비게이션 메뉴
const TOP_NAV_ITEMS = [
  { label: '바로가기', href: '/', icon: '🏠' },
  { label: 'FMEA등록', href: '/pfmea/register', icon: '📝' },
  { label: 'FMEA 리스트', href: '/pfmea/list', icon: '📋' },
  { label: 'FMEA 작성화면', href: '/pfmea/worksheet', icon: '✏️' },
  { label: 'FMEA 개정관리', href: '/pfmea/revision', icon: '📑' },
  { label: 'LLD(필터코드)', href: '/pfmea/lld', icon: '📋' },
  { label: 'AP 개선관리', href: '/pfmea/ap-improvement', icon: '🚀' },
  { label: '대시보드', href: '/dashboard', icon: '📊', active: true },
];

// AP 상태 색상 (text keys are used with t() at render time)
const STATUS_COLORS = {
  completed: { bg: '#22c55e', text: '완료', badge: 'bg-green-100 text-green-700 border-green-200' },
  inProgress: { bg: '#3b82f6', text: '진행중', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  planned: { bg: '#facc15', text: '계획', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  delayed: { bg: '#ef4444', text: '지연', badge: 'bg-red-100 text-red-700 border-red-200' },
};

import { FixedLayout, PFMEATopNav } from '@/components/layout';

export default function DashboardPage() {
  const { t } = useLocale();
  const liveStats = useDashboardStats();
  const [fmeaType, setFmeaType] = useState<'PFMEA' | 'DFMEA'>('PFMEA');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

  // FMEA 목록 (API에서 가져오기 - 임시 데이터)
  const fmeaLists = {
    PFMEA: ['pfm26-m001', 'pfm26-p001', 'pfm26-p002', 'pfm26-f001'],
    DFMEA: ['dfm26-001', 'dfm26-002']
  };

  // ★ 온프레미스: fake 데이터 주입 금지 → 실 데이터만 표시
  const stats = liveStats;

  // 개선조치 데이터
  const improvementData = useMemo(() => {
    const { completed, inProgress, planned, delayed } = stats.improvementStatus;
    const total = completed + inProgress + planned + delayed || 1;
    return [
      { key: 'completed', label: t('완료'), value: completed, pct: Math.round((completed / total) * 100), color: STATUS_COLORS.completed.bg },
      { key: 'inProgress', label: t('진행중'), value: inProgress, pct: Math.round((inProgress / total) * 100), color: STATUS_COLORS.inProgress.bg },
      { key: 'planned', label: t('계획'), value: planned, pct: Math.round((planned / total) * 100), color: STATUS_COLORS.planned.bg },
      { key: 'delayed', label: t('지연'), value: delayed, pct: Math.round((delayed / total) * 100), color: STATUS_COLORS.delayed.bg },
    ];
  }, [stats.improvementStatus]);

  // AP 테이블 데이터 (mock)
  const apTableData = useMemo(() => [
    { id: 1, process: '조립', failureMode: '체결 불량', action: '토크렌치 교체', responsible: '김철수', targetDate: '2026-01-30', status: 'completed' },
    { id: 2, process: '용접', failureMode: '용접 크랙', action: '용접 조건 최적화', responsible: '이영희', targetDate: '2026-02-05', status: 'inProgress' },
    { id: 3, process: '도장', failureMode: '스크래치', action: '도장 부스 개선', responsible: '박민수', targetDate: '2026-02-10', status: 'planned' },
    { id: 4, process: '검사', failureMode: '이물 혼입', action: '세척 공정 추가', responsible: '최지원', targetDate: '2026-01-25', status: 'delayed' },
    { id: 5, process: '열처리', failureMode: '경도 부족', action: '온도 관리 강화', responsible: '정현우', targetDate: '2026-02-15', status: 'inProgress' },
  ], []);

  const cardStyle = "bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden";
  const headerStyle = "px-4 py-2 bg-gradient-to-r from-[#00587a] to-[#007a9e] text-white font-bold text-sm flex items-center gap-2";

  return (
    <FixedLayout
      topNav={<PFMEATopNav />}
      showSidebar={true}
      bgColor="#f0f2f5"
      contentPadding="p-0"
    >
      <div className="flex flex-col h-full font-['Malgun_Gothic',sans-serif]" style={{ paddingLeft: '5px' }}>
        {/* 헤더 바 */}
        <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-base font-bold text-[#00587a] flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5" /> {t('FMEA 통계 대시보드')}
            </h1>

            <div className="flex items-center gap-3 ml-4">
              {/* FMEA 구분 */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-600">{t('FMEA 구분')}:</span>
                <Select value={fmeaType} onValueChange={(v: 'PFMEA' | 'DFMEA') => { setFmeaType(v); setSelectedProjectId('all'); }}>
                  <SelectTrigger className="h-8 w-[100px] text-[11px] font-semibold border-slate-300 bg-slate-50">
                    <SelectValue placeholder={t('구분')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PFMEA" className="text-[11px]">PFMEA</SelectItem>
                    <SelectItem value="DFMEA" className="text-[11px]">DFMEA</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* FMEA 선택 */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-600">{t('FMEA 선택')}:</span>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger className="h-8 w-[200px] text-[11px] border-slate-300 bg-white">
                    <SelectValue placeholder={t('FMEA 선택')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-[11px] font-bold text-blue-600">📊 {t('전체 데이터 합계')}</SelectItem>
                    {fmeaLists[fmeaType].map(id => (
                      <SelectItem key={id} value={id} className="text-[11px]">📋 {id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-[11px] border-slate-300 bg-slate-50 hover:bg-white">
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> {t('새로고침')}
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-[11px] border-slate-300 bg-slate-50 hover:bg-white">
              <Download className="w-3.5 h-3.5 mr-1" /> Export
            </Button>
          </div>
        </div>

        {/* 선택된 FMEA 정보 표시 */}
        <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
          <div className="max-w-[1600px] mx-auto flex items-center gap-4">
            <span className="text-sm font-bold text-blue-800">📋 {t('분석 대상')}:</span>
            <span className="px-3 py-1 bg-blue-600 text-white text-sm font-bold rounded-full">
              {selectedProjectId === 'all' ? `${t('전체')} ${fmeaType}` : selectedProjectId}
            </span>
            <span className="text-sm text-slate-600">|</span>
            <span className="text-sm text-slate-700">{t('총')} <strong className="text-blue-700">{stats.totalItems}</strong>{t('건 분석 완료')}</span>
            <span className="text-sm text-slate-600">|</span>
            <span className="text-sm text-slate-700">{t('고위험 항목')}: <strong className="text-red-600">{stats.highRiskCount}</strong>{t('건')}</span>
          </div>
        </div>

        {/* 메인 콘텐츠 - 스크롤 가능 */}
        <div className="flex-1 p-4 overflow-auto">
          <div className="max-w-[1600px] mx-auto space-y-6">

            {/* ========== 섹션 1: AP 개선조치 현황 ========== */}
            <section>
              <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                1. {t('AP 개선조치 현황')}
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 좌측: 그래프 */}
                <div className={cardStyle}>
                  <div className={headerStyle}>
                    📊 {t('개선조치 진행 상태')}
                  </div>
                  <div className="p-4">
                    <div className="h-[300px]">
                      <ImprovementChart data={improvementData} />
                    </div>
                    {/* 요약 통계 */}
                    <div className="mt-4 grid grid-cols-4 gap-2">
                      {improvementData.map((d) => (
                        <div key={d.key} className="text-center p-2 rounded-lg" style={{ backgroundColor: `${d.color}15` }}>
                          <div className="text-2xl font-black" style={{ color: d.color }}>{d.value}</div>
                          <div className="text-xs text-slate-600 font-medium">{d.label}</div>
                          <div className="text-xs text-slate-400">{d.pct}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 우측: 테이블 */}
                <div className={cardStyle}>
                  <div className={headerStyle}>
                    📋 {t('AP 개선현황 테이블')}
                  </div>
                  <div className="p-3">
                    <div className="overflow-auto max-h-[380px]">
                      <table className="w-full text-[11px] border-collapse">
                        <thead className="bg-slate-100 sticky top-0 z-10">
                          <tr>
                            <th className="p-2 border border-slate-200 text-left font-bold">No</th>
                            <th className="p-2 border border-slate-200 text-left font-bold">{t('공정')}</th>
                            <th className="p-2 border border-slate-200 text-left font-bold">{t('고장모드')}</th>
                            <th className="p-2 border border-slate-200 text-left font-bold">{t('개선조치')}</th>
                            <th className="p-2 border border-slate-200 text-center font-bold">{t('담당자')}</th>
                            <th className="p-2 border border-slate-200 text-center font-bold">{t('목표일')}</th>
                            <th className="p-2 border border-slate-200 text-center font-bold">{t('상태')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {apTableData.map((row, idx) => (
                            <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-2 border border-slate-200 text-center font-bold text-slate-600">{idx + 1}</td>
                              <td className="p-2 border border-slate-200">{row.process}</td>
                              <td className="p-2 border border-slate-200 font-medium text-slate-700">{row.failureMode}</td>
                              <td className="p-2 border border-slate-200">{row.action}</td>
                              <td className="p-2 border border-slate-200 text-center">{row.responsible}</td>
                              <td className="p-2 border border-slate-200 text-center">{row.targetDate}</td>
                              <td className="p-2 border border-slate-200 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[row.status as keyof typeof STATUS_COLORS].badge}`}>
                                  {t(STATUS_COLORS[row.status as keyof typeof STATUS_COLORS].text)}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {apTableData.length === 0 && (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-slate-400">{t('데이터가 없습니다.')}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 섹션 2: Top 10 RPN 현황 — 현재 비활성화 */}

          </div>
        </div>

        {/* 푸터 */}
        <footer className="bg-slate-100 border-t border-slate-200 px-4 py-2 text-center text-xs text-slate-500">
          v3.0.0 · FMEA 통계 대시보드 · © AMP SYSTEM
        </footer>
      </div>
    </FixedLayout>
  );
}
