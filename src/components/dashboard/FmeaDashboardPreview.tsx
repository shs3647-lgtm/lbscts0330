/**
 * FMEA 대시보드 프리뷰 (홈 화면 Hero 섹션용)
 * - DB에서 실시간 FMEA 프로젝트 통계 표시
 * - PFMEA(M/F/P), DFMEA, BD, CP/PFD 연동 현황
 */
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

interface FmeaStats {
  total: number;
  pfmea: { master: number; family: number; part: number };
  dfmea: number;
  bd: number;
  linked: { cp: number; pfd: number };
}

const EMPTY: FmeaStats = { total: 0, pfmea: { master: 0, family: 0, part: 0 }, dfmea: 0, bd: 0, linked: { cp: 0, pfd: 0 } };

export function FmeaDashboardPreview() {
  const [stats, setStats] = useState<FmeaStats>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);

    fetch('/api/fmea/dashboard-stats', { signal: ctrl.signal })
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d.stats); })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') {
          console.error('[Dashboard] API 타임아웃 (5초)');
        } else {
          console.error('[Dashboard] 통계 로드 실패:', err);
        }
        setError(true);
      })
      .finally(() => {
        clearTimeout(timer);
        setLoading(false);
      });

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, []);

  const pfmeaTotal = stats.pfmea.master + stats.pfmea.family + stats.pfmea.part;
  const allTotal = pfmeaTotal + stats.dfmea;

  // 도넛 차트 비율 계산
  const circumference = 2 * Math.PI * 40; // ≈251.3
  const mPct = allTotal > 0 ? (stats.pfmea.master / allTotal) * 100 : 25;
  const fPct = allTotal > 0 ? (stats.pfmea.family / allTotal) * 100 : 25;
  const pPct = allTotal > 0 ? (stats.pfmea.part / allTotal) * 100 : 25;
  const dPct = allTotal > 0 ? (stats.dfmea / allTotal) * 100 : 25;

  const mDash = (mPct / 100) * circumference;
  const fDash = (fPct / 100) * circumference;
  const pDash = (pPct / 100) * circumference;
  const dDash = (dPct / 100) * circumference;

  const mOff = 0;
  const fOff = -(mDash);
  const pOff = -(mDash + fDash);
  const dOff = -(mDash + fDash + pDash);

  return (
    <Link href="/pfmea/list" className="card hero-right" style={{ cursor: 'pointer', textDecoration: 'none' }}>
      <div style={{
        width: '100%', height: '100%', minHeight: '280px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', padding: '20px',
        opacity: loading ? 0.6 : 1, transition: 'opacity 0.3s ease',
      }}>
        {(loading || error) && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10, pointerEvents: 'none',
          }}>
            <span style={{ color: error ? '#f87171' : '#94a3b8', fontSize: '13px', fontWeight: 600 }}>
              {error ? '데이터 로드 실패' : '데이터 로딩 중...'}
            </span>
          </div>
        )}
        {/* 배경 글로우 */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '300px', height: '300px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,88,122,0.2) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', zIndex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>📋</span> FMEA Dashboard
          </div>
          <div style={{ fontSize: '10px', color: '#22c55e', fontWeight: 700, background: 'rgba(34,197,94,0.2)', padding: '3px 8px', borderRadius: '10px' }}>
            ● LIVE
          </div>
        </div>

        {/* 메인 영역 */}
        <div style={{ flex: 1, display: 'flex', gap: '16px', zIndex: 1 }}>
          {/* 왼쪽: 도넛 차트 */}
          <div style={{ flex: '0 0 38%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: '110px', height: '110px' }}>
              <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}>
                <circle cx="50" cy="50" r="40" fill="none" stroke="#1e3a5f" strokeWidth="12" />
                {/* Master - teal */}
                <circle cx="50" cy="50" r="40" fill="none" stroke="#14b8a6" strokeWidth="12"
                  strokeDasharray={`${mDash} ${circumference - mDash}`} strokeDashoffset={mOff} strokeLinecap="round" />
                {/* Family - blue */}
                <circle cx="50" cy="50" r="40" fill="none" stroke="#3b82f6" strokeWidth="12"
                  strokeDasharray={`${fDash} ${circumference - fDash}`} strokeDashoffset={fOff} strokeLinecap="round" />
                {/* Part - amber */}
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" strokeWidth="12"
                  strokeDasharray={`${pDash} ${circumference - pDash}`} strokeDashoffset={pOff} strokeLinecap="round" />
                {/* DFMEA - purple */}
                <circle cx="50" cy="50" r="40" fill="none" stroke="#a855f7" strokeWidth="12"
                  strokeDasharray={`${dDash} ${circumference - dDash}`} strokeDashoffset={dOff} strokeLinecap="round" />
              </svg>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#fff' }}>{allTotal}</div>
                <div style={{ fontSize: '8px', color: '#64748b' }}>Projects</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '5px', marginTop: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ fontSize: '8px', color: '#14b8a6' }}>● Master</span>
              <span style={{ fontSize: '8px', color: '#3b82f6' }}>● Family</span>
              <span style={{ fontSize: '8px', color: '#f59e0b' }}>● Part</span>
              <span style={{ fontSize: '8px', color: '#a855f7' }}>● DFMEA</span>
            </div>
          </div>

          {/* 오른쪽: 모듈별 현황 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '7px' }}>
            {/* PFMEA 타입별 */}
            <StatBar label="Master (M)" value={stats.pfmea.master} max={Math.max(allTotal, 1)} color="#14b8a6" />
            <StatBar label="Family (F)" value={stats.pfmea.family} max={Math.max(allTotal, 1)} color="#3b82f6" />
            <StatBar label="Part (P)" value={stats.pfmea.part} max={Math.max(allTotal, 1)} color="#f59e0b" />
            <StatBar label="DFMEA" value={stats.dfmea} max={Math.max(allTotal, 1)} color="#a855f7" />

            {/* 구분선 */}
            <div style={{ borderTop: '1px solid #1e3a5f', margin: '2px 0' }} />

            {/* 연동 현황 */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <MiniStat label="BD" value={stats.bd} color="#06b6d4" />
              <MiniStat label="CP" value={stats.linked.cp} color="#22c55e" />
              <MiniStat label="PFD" value={stats.linked.pfd} color="#8b5cf6" />
            </div>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div style={{
          marginTop: '12px', padding: '10px 0',
          background: 'linear-gradient(135deg, #00587a 0%, #0e7490 100%)',
          borderRadius: '8px', textAlign: 'center',
          fontSize: '12px', color: '#fff', fontWeight: 800,
          boxShadow: '0 4px 20px rgba(0,88,122,0.4)', zIndex: 1,
        }}>
          📋 FMEA 프로젝트 열기
        </div>
      </div>
    </Link>
  );
}

/** 바 차트 행 */
function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const barWidth = value > 0 ? Math.max(pct, 8) : 0; // 최소 8% 보이게
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
        <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: '9px', color, fontWeight: 800 }}>{value}건</span>
      </div>
      <div style={{ height: '7px', background: '#1e3a5f', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{
          width: `${barWidth}%`, height: '100%',
          background: `linear-gradient(90deg, ${color}, ${color}99)`,
          borderRadius: '4px', boxShadow: `0 0 8px ${color}80`,
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  );
}

/** 하단 미니 통계 */
function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      flex: 1, background: '#0f172a', borderRadius: '6px',
      padding: '4px 8px', textAlign: 'center',
      border: '1px solid #1e3a5f',
    }}>
      <div style={{ fontSize: '8px', color: '#64748b', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: '14px', fontWeight: 900, color }}>{value}</div>
    </div>
  );
}
