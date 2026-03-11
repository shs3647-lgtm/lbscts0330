/**
 * ============================================================
 * ★ APQP 대시보드 프리뷰 (홈 화면용)
 * ============================================================
 *
 * [보관 목적]
 * - APQP 모듈 개발 완료 후 메인 페이지(page.tsx)에서 사용할 컴포넌트
 * - 현재 APQP는 개발 중이므로 FMEA Dashboard로 대체됨
 *
 * [사용 방법 - APQP 완성 시]
 * 1. src/app/page.tsx에서 import
 *    import { ApqpDashboardPreview } from '@/components/dashboard/ApqpDashboardPreview';
 * 2. hero 섹션의 FmeaDashboardPreview를 ApqpDashboardPreview로 교체
 *    <ApqpDashboardPreview isLoggedIn={isLoggedIn} />
 *
 * @created 2026-02-17
 * @status RESERVED (APQP 개발 완료 시 활성화)
 */

'use client';

import Link from 'next/link';

interface ApqpDashboardPreviewProps {
  isLoggedIn: boolean;
}

export function ApqpDashboardPreview({ isLoggedIn }: ApqpDashboardPreviewProps) {
  return (
    <Link href={isLoggedIn ? '/apqp/dashboard' : '/login'} className="card hero-right" style={{ cursor: 'pointer', textDecoration: 'none' }}>
      <div style={{
        width: '100%',
        height: '100%',
        minHeight: '280px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px'
      }}>
        {/* 배경 글로우 효과 */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}></div>

        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', zIndex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>📊</span> APQP Dashboard
          </div>
          <div style={{ fontSize: '10px', color: '#22c55e', fontWeight: 700, background: 'rgba(34,197,94,0.2)', padding: '3px 8px', borderRadius: '10px' }}>
            ● LIVE
          </div>
        </div>

        {/* 메인 그래프 영역 */}
        <div style={{ flex: 1, display: 'flex', gap: '12px', zIndex: 1 }}>
          {/* 왼쪽: 도넛 차트 */}
          <div style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: '100px', height: '100px' }}>
              <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}>
                <circle cx="50" cy="50" r="40" fill="none" stroke="#1e3a5f" strokeWidth="12" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#22c55e" strokeWidth="12" strokeDasharray="100 151" strokeLinecap="round" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#3b82f6" strokeWidth="12" strokeDasharray="70 181" strokeDashoffset="-100" strokeLinecap="round" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" strokeWidth="12" strokeDasharray="50 201" strokeDashoffset="-170" strokeLinecap="round" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#ef4444" strokeWidth="12" strokeDasharray="31 220" strokeDashoffset="-220" strokeLinecap="round" />
              </svg>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#fff' }}>87%</div>
                <div style={{ fontSize: '8px', color: '#64748b' }}>완료율</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ fontSize: '8px', color: '#22c55e' }}>● 완료</span>
              <span style={{ fontSize: '8px', color: '#3b82f6' }}>● 진행</span>
              <span style={{ fontSize: '8px', color: '#f59e0b' }}>● 대기</span>
              <span style={{ fontSize: '8px', color: '#ef4444' }}>● 지연</span>
            </div>
          </div>

          {/* 오른쪽: 바 차트 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px' }}>
            {[
              { label: 'FMEA', pct: 92, color: '#22c55e', glow: 'rgba(34,197,94,0.5)' },
              { label: 'CP', pct: 78, color: '#3b82f6', glow: 'rgba(59,130,246,0.5)' },
              { label: 'PFD', pct: 95, color: '#8b5cf6', glow: 'rgba(139,92,246,0.5)' },
              { label: 'WS', pct: 65, color: '#f59e0b', glow: 'rgba(245,158,11,0.5)' },
              { label: 'PM', pct: 88, color: '#ec4899', glow: 'rgba(236,72,153,0.5)' },
            ].map(bar => (
              <div key={bar.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700 }}>{bar.label}</span>
                  <span style={{ fontSize: '9px', color: bar.color, fontWeight: 800 }}>{bar.pct}%</span>
                </div>
                <div style={{ height: '8px', background: '#1e3a5f', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${bar.pct}%`, height: '100%', background: `linear-gradient(90deg, ${bar.color}, ${bar.color}99)`, borderRadius: '4px', boxShadow: `0 0 10px ${bar.glow}` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 하단 버튼 */}
        <div style={{
          marginTop: '12px',
          padding: '10px 0',
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          borderRadius: '8px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#fff',
          fontWeight: 800,
          boxShadow: '0 4px 20px rgba(59,130,246,0.4)',
          zIndex: 1
        }}>
          🚀 APQP 대시보드 열기
        </div>
      </div>
    </Link>
  );
}
