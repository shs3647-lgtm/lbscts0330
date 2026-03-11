'use client';

/**
 * 대시보드 테스트 페이지
 * URL: http://localhost:3000/project/dashboard-test
 */

import React from 'react';
import ProjectDashboardTable from '../components/ProjectDashboardTable';

export default function DashboardTestPage() {
  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <h1 style={{ marginBottom: '20px', color: '#111' }}>🧪 대시보드 테스트 페이지</h1>
      
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        minHeight: '600px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <h2 style={{ marginBottom: '10px' }}>📊 Project Dashboard</h2>
        <p style={{ marginBottom: '20px', color: '#666' }}>일정준수율과 지연작업 컬럼이 표시되어야 합니다.</p>
        
        <div style={{ 
          flex: 1, 
          border: '1px solid #ddd',
          borderRadius: '4px',
          overflow: 'hidden',
          minHeight: '500px'
        }}>
          <ProjectDashboardTable
            onProjectClick={(projectId) => {
              alert(`프로젝트 클릭: ${projectId}`);
            }}
            onModuleClick={(projectId, moduleType) => {
              alert(`모듈 클릭: ${projectId} - ${moduleType}`);
            }}
            onGanttClick={(projectId) => {
              alert(`Gantt Chart로 이동: ${projectId}`);
            }}
          />
        </div>
      </div>

      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        backgroundColor: '#e3f2fd', 
        borderRadius: '8px',
        border: '1px solid #90caf9'
      }}>
        <h3 style={{ marginBottom: '10px', color: '#0d47a1' }}>✅ 확인 사항</h3>
        <ul style={{ marginLeft: '20px', color: '#1565c0' }}>
          <li>Handsontable이 정상적으로 로드되는가?</li>
          <li>"일정준수율" 컬럼이 표시되는가?</li>
          <li>"지연작업" 컬럼이 표시되는가?</li>
          <li>색상 코딩이 적용되는가? (초록/노랑/빨강)</li>
          <li>셀 클릭 시 이벤트가 발생하는가?</li>
        </ul>
      </div>
    </div>
  );
}

