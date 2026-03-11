/**
 * @file page.tsx
 * @description 웰컴보드 페이지 - 다크 테마 + 표준 테이블 디자인 (모듈화 버전)
 * @author AI Assistant
 * @created 2026-01-03
 * @version 2.0.0
 * @benchmark 
 *   - welcome-v0.76.1.html (다크 테마)
 *   - table-design-reference.html (표준 테이블)
 *   - AP Improvement 모듈 구조 (분리된 컴포넌트)
 * 
 * 모듈화 구조:
 * - types.ts: 타입 정의
 * - mock-data.ts: 샘플 데이터
 * - utils.ts: 유틸리티 함수
 * - components/: UI 컴포넌트
 */

'use client';

// 모듈화된 데이터 및 유틸리티 import
import { projectStats, quickLinks, apSummaryData } from './mock-data';
import { calculateAPStats } from './utils';

// 모듈화된 컴포넌트 import
import {
  Header,
  HeroSection,
  ProjectStatsSection,
  QuickLinksSection,
  APSummaryTable,
} from './components';

export default function WelcomeBoardPage() {
  // AP 통계 계산
  const apStats = calculateAPStats(apSummaryData);

  return (
    <div 
      className="min-h-screen p-4"
      style={{
        background: 'radial-gradient(1200px 700px at 70% -10%, #162a56 0%, #0d1830 45%, #0b1426 100%)',
      }}
    >
      {/* 상단 헤더: 중앙 Smart System | 우측 접속자 ID */}
      <Header />

      {/* Hero 배너 */}
      <HeroSection />

      {/* 프로젝트 프리뷰 — My Projects Status */}
      <ProjectStatsSection stats={projectStats} />

      {/* 바로가기 - 양쪽맞춤 균등배분 */}
      <QuickLinksSection links={quickLinks} />

      {/* AP Improvement 진행상태 - 표준 테이블 디자인 */}
      <APSummaryTable data={apSummaryData} stats={apStats} />

      {/* 푸터 */}
      <footer className="mt-3 text-center text-[#a7b6d3] text-xs">
        v2.0.0 · FMEA Smart System · © AMP SYSTEM
      </footer>
    </div>
  );
}
