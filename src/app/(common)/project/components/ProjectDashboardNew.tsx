/**
 * PROJECT DASHBOARD 메인 컴포넌트 (벤치마크 HTML 기반)
 * 
 * 상단: 통계 카드 + 모듈별 진행현황 바 차트 + 상태별 프로젝트 수 바 차트
 * 하단: Project Status 테이블
 */

'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import ProjectDashboardTable from './ProjectDashboardTable';
import { useProjectLinkage } from '@/hooks/useProjectLinkage';
import { SAMPLE_PROJECTS } from '@/core/project-dashboard-data';

// recharts 번들을 lazy-load (약 300KB+ 절감)
const ProjectDashboardCharts = dynamic(
  () => import('./ProjectDashboardCharts'),
  {
    ssr: false,
    loading: () => (
      <>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.95)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '13px' }}>차트 로딩 중...</div>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.95)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '13px' }}>차트 로딩 중...</div>
      </>
    )
  }
);

interface ProjectDashboardNewProps {
  onClose?: () => void;
  onNavigateToModule?: (projectId: string, moduleType: 'PFD' | 'FMEA' | 'CP' | 'WS' | 'PM') => void;
  onGanttClick?: (projectId: string) => void;
}

const STATUS_COLORS = {
  Open: '#6366f1',
  Progress: '#3B82F6',
  Complete: '#10B981',
  Delay: '#EF4444'
};

// 🔥 차트 카드 공통 스타일
const chartCardStyle: React.CSSProperties = {
  flex: 1,
  background: 'rgba(255, 255, 255, 0.95)',
  borderRadius: '8px',
  padding: '12px',
  boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
  display: 'flex',
  flexDirection: 'column',
  minWidth: '300px',
};

const chartTitleStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  color: '#1e3a8a',
  marginBottom: '12px',
  textAlign: 'center',
  paddingTop: '4px',
};

const chartContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '280px',  // 🔥 고정 높이로 변경 (flex 대신)
  minWidth: '200px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export default function ProjectDashboardNew({ onClose, onNavigateToModule, onGanttClick }: ProjectDashboardNewProps) {
  const [isMounted, setIsMounted] = useState(false);
  const { actions } = useProjectLinkage();
  const projects = SAMPLE_PROJECTS;

  // 통계 계산
  const totalProjects = projects.length;
  const completedProjects = projects.filter(p => p.overallStatus === 'Complete').length;
  const inProgressProjects = projects.filter(p => p.overallStatus === 'Progress').length;
  const delayedProjects = projects.filter(p => p.overallStatus === 'Delay').length;
  const openProjects = projects.filter(p => p.overallStatus === 'Open').length;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 🔥 모듈별 진행현황 데이터 (FMEA, CP, PFD, WS, PM)
  const moduleStatusData = [
    {
      name: 'FMEA',
      Open: projects.filter(p => p.fmeaStatus === 'Open').length,
      Progress: projects.filter(p => p.fmeaStatus === 'Progress').length,
      Complete: projects.filter(p => p.fmeaStatus === 'Complete').length,
      Delay: projects.filter(p => p.fmeaStatus === 'Delay').length,
    },
    {
      name: 'CP',
      Open: projects.filter(p => p.cpStatus === 'Open').length,
      Progress: projects.filter(p => p.cpStatus === 'Progress').length,
      Complete: projects.filter(p => p.cpStatus === 'Complete').length,
      Delay: projects.filter(p => p.cpStatus === 'Delay').length,
    },
    {
      name: 'PFD',
      Open: projects.filter(p => p.pfdStatus === 'Open').length,
      Progress: projects.filter(p => p.pfdStatus === 'Progress').length,
      Complete: projects.filter(p => p.pfdStatus === 'Complete').length,
      Delay: projects.filter(p => p.pfdStatus === 'Delay').length,
    },
    {
      name: 'WS',
      Open: projects.filter(p => p.wsStatus === 'Open').length,
      Progress: projects.filter(p => p.wsStatus === 'Progress').length,
      Complete: projects.filter(p => p.wsStatus === 'Complete').length,
      Delay: projects.filter(p => p.wsStatus === 'Delay').length,
    },
    {
      name: 'PM',
      Open: projects.filter(p => p.pmStatus === 'Open').length,
      Progress: projects.filter(p => p.pmStatus === 'Progress').length,
      Complete: projects.filter(p => p.pmStatus === 'Complete').length,
      Delay: projects.filter(p => p.pmStatus === 'Delay').length,
    },
  ];


  // 🔥 상태별 프로젝트 수 데이터 (+ 퍼센트)
  const statusChartData = [
    { name: 'Open', count: openProjects, percent: totalProjects > 0 ? ((openProjects / totalProjects) * 100).toFixed(1) : '0.0', color: STATUS_COLORS.Open },
    { name: 'Progress', count: inProgressProjects, percent: totalProjects > 0 ? ((inProgressProjects / totalProjects) * 100).toFixed(1) : '0.0', color: STATUS_COLORS.Progress },
    { name: 'Complete', count: completedProjects, percent: totalProjects > 0 ? ((completedProjects / totalProjects) * 100).toFixed(1) : '0.0', color: STATUS_COLORS.Complete },
    { name: 'Delay', count: delayedProjects, percent: totalProjects > 0 ? ((delayedProjects / totalProjects) * 100).toFixed(1) : '0.0', color: STATUS_COLORS.Delay },
  ];

  const handleProjectClick = (projectId: string) => {
    actions.selectProject(projectId);
  };

  const handleModuleClick = (projectId: string, moduleType: 'PFD' | 'FMEA' | 'CP' | 'WS' | 'PM') => {
    actions.selectModule(projectId, moduleType);
    if (onNavigateToModule) {
      onNavigateToModule(projectId, moduleType);
    }
  };

  return (
    <div
      data-testid="project-dashboard"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'white',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      {/* 헤더 */}
      <div style={{
        height: '50px',
        background: 'linear-gradient(135deg, #2E5CB8 0%, #5B9BF5 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        borderBottom: '2px solid #1e40af',
        flexShrink: 0,
      }}>
        <h1 style={{
          fontSize: '18px',
          fontWeight: '700',
          color: 'white',
          margin: 0
        }}>
          PROJECT DASHBOARD
        </h1>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            닫기
          </button>
        )}
      </div>

      {/* 상단 차트 대시보드 */}
      <div style={{
        flexShrink: 0,
        background: 'linear-gradient(135deg, #2E5CB8 0%, #5B9BF5 100%)',
        padding: '16px 12px',
        display: 'flex',
        gap: '12px',
        borderBottom: '2px solid #1e40af',
        height: '420px',
      }}>
        {/* 📋 Project Status 통계 카드 */}
        <div style={chartCardStyle}>
          <div style={chartTitleStyle}>
            📋 Project Status
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '8px', flex: 1, marginTop: '8px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #a5b4fc',
            }}>
              <div style={{ fontSize: '11px', color: '#1e3a8a', fontWeight: 700, marginBottom: '4px' }}>
                📊 총 프로젝트
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#2E5CB8' }}>
                {totalProjects}
              </div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                (100.0%)
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #86efac',
            }}>
              <div style={{ fontSize: '11px', color: '#166534', fontWeight: 700, marginBottom: '4px' }}>
                ✅ 완료
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#22c55e' }}>
                {completedProjects}
              </div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                ({totalProjects > 0 ? ((completedProjects / totalProjects) * 100).toFixed(1) : '0.0'}%)
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #fcd34d',
            }}>
              <div style={{ fontSize: '11px', color: '#92400e', fontWeight: 700, marginBottom: '4px' }}>
                🔄 진행중
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b' }}>
                {inProgressProjects}
              </div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                ({totalProjects > 0 ? ((inProgressProjects / totalProjects) * 100).toFixed(1) : '0.0'}%)
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #fca5a5',
            }}>
              <div style={{ fontSize: '11px', color: '#991b1b', fontWeight: 700, marginBottom: '4px' }}>
                ⚠️ 지연
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#ef4444' }}>
                {delayedProjects}
              </div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                ({totalProjects > 0 ? ((delayedProjects / totalProjects) * 100).toFixed(1) : '0.0'}%)
              </div>
            </div>
          </div>
        </div>

        {/* 📊 모듈별 진행현황 + 📈 상태별 프로젝트 수 (recharts lazy-loaded) */}
        <ProjectDashboardCharts
          moduleStatusData={moduleStatusData}
          statusChartData={statusChartData}
          totalProjects={totalProjects}
          chartCardStyle={chartCardStyle}
          chartTitleStyle={chartTitleStyle}
          chartContainerStyle={chartContainerStyle}
        />
      </div>

      {/* 하단 테이블 */}
      <div style={{
        flexGrow: 1,
        overflow: 'hidden',
        padding: '20px',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <h2 style={{
          fontSize: '16px',
          fontWeight: '700',
          color: '#333',
          marginBottom: '12px',
          textAlign: 'center',
        }}>
          📋 프로젝트 상세 리스트 ({totalProjects}개)
        </h2>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ProjectDashboardTable
            onProjectClick={handleProjectClick}
            onModuleClick={handleModuleClick}
            onGanttClick={onGanttClick}
          />
        </div>
      </div>
    </div>
  );
}
