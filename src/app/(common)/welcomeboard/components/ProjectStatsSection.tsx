/**
 * @file ProjectStatsSection.tsx
 * @description 프로젝트 상태 통계 컴포넌트
 * @author AI Assistant
 * @created 2026-01-03
 */

'use client';

import { ProjectStats } from '../types';

interface ProjectStatsSectionProps {
  stats: ProjectStats;
}

export default function ProjectStatsSection({ stats }: ProjectStatsSectionProps) {
  return (
    <section className="mb-4">
      <h2 className="text-white font-black text-lg mb-2">
        프로젝트 프리뷰 — My Projects Status
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 진행중 */}
        <div className="bg-[#0e1a33] border border-[#1d2a48] rounded-[14px] p-4 flex items-center justify-between shadow-lg">
          <div>
            <div className="text-[#a7b6d3] text-sm mb-1">진행중</div>
            <p className="text-3xl font-black text-white">{stats.inProgress}</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-extrabold text-white bg-[#22c55e]">
            OK
          </span>
        </div>
        
        {/* 완료 */}
        <div className="bg-[#0e1a33] border border-[#1d2a48] rounded-[14px] p-4 flex items-center justify-between shadow-lg">
          <div>
            <div className="text-[#a7b6d3] text-sm mb-1">완료</div>
            <p className="text-3xl font-black text-white">{stats.completed}</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-extrabold text-white bg-[#f59e0b]">
            DONE
          </span>
        </div>

        {/* 지연 */}
        <div className="bg-[#0e1a33] border border-[#1d2a48] rounded-[14px] p-4 flex items-center justify-between shadow-lg">
          <div>
            <div className="text-[#a7b6d3] text-sm mb-1">지연</div>
            <p className="text-3xl font-black text-white">{stats.delayed}</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-extrabold text-white bg-[#ef4444]">
            DELAY
          </span>
        </div>
      </div>
    </section>
  );
}





