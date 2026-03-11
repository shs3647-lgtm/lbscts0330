'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useState, useEffect, useRef, useCallback } from 'react';

// ★ 대시보드 프리뷰 lazy 로드 — 초기 번들에서 분리
const FmeaDashboardPreview = dynamic(
  () => import('@/components/dashboard/FmeaDashboardPreview').then(m => ({ default: m.FmeaDashboardPreview })),
  {
    loading: () => (
      <div className="card hero-right" style={{
        minHeight: '280px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '14px',
      }}>
        <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 600 }}>Dashboard 로딩...</span>
      </div>
    ),
    ssr: false,
  }
);

export default function WelcomePage() {
  const router = useRouter();
  // API에서 가져온 MY JOB 통계
  const [stats, setStats] = useState({ total: 0, inprogress: 0, done: 0, delayed: 0 });
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 이미지 리사이즈 (정사각형 중앙 크롭 → 150x150, 60% 품질)
  const resizeImage = useCallback((file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const size = 150;
          const canvas = document.createElement('canvas');
          canvas.width = size; canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('Canvas error');
          // 정사각형 중앙 크롭
          const min = Math.min(img.width, img.height);
          const sx = (img.width - min) / 2;
          const sy = (img.height - min) / 2;
          ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = () => reject('Image load error');
        img.src = ev.target?.result as string;
      };
      reader.onerror = () => reject('Read error');
      reader.readAsDataURL(file);
    });
  }, []);

  // DB + localStorage 저장
  const savePhotoAll = useCallback(async (base64: string | null) => {
    setUserPhoto(base64);
    if (base64) {
      localStorage.setItem('fmea_user_photo', base64);
    } else {
      localStorage.removeItem('fmea_user_photo');
    }
    // 세션 업데이트
    const session = localStorage.getItem('user_session');
    if (session) {
      const user = JSON.parse(session);
      user.photoUrl = base64;
      localStorage.setItem('user_session', JSON.stringify(user));
      localStorage.setItem('fmea-user', JSON.stringify(user));
      // DB 저장
      if (user.email) {
        try {
          await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: { ...user, photoUrl: base64 } }),
          });
        } catch (e) { console.error('[프로필 사진 저장] 오류:', e); }
      }
    }
    setShowPhotoMenu(false);
  }, []);

  // 파일 업로드 핸들러
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await resizeImage(file);
      await savePhotoAll(base64);
    } catch (err) { console.error('사진 업로드 실패:', err); }
    e.target.value = '';
  }, [resizeImage, savePhotoAll]);

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    if (!showPhotoMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowPhotoMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPhotoMenu]);

  useEffect(() => {
    // ★ 미로그인 시 로그인 화면으로 리다이렉트
    const checkLogin = async () => {
      try {
        const userSession = localStorage.getItem('user_session');
        if (!userSession) {
          router.replace('/login');
          return;
        }
        if (userSession) {
          const user = JSON.parse(userSession);
          setIsLoggedIn(true);
          setUserName(user.name || '');

          // 사진 우선순위: 세션 > localStorage > API
          let photo = user.photoUrl || localStorage.getItem('fmea_user_photo');

          // 사진이 없으면 API에서 가져오기
          if (!photo && user.id) {
            try {
              const res = await fetch(`/api/admin/users?id=${user.id}`);
              if (res.ok) {
                const data = await res.json();
                if (data.user?.photoUrl) {
                  photo = data.user.photoUrl;
                  // 세션 업데이트
                  const updatedUser = { ...user, photoUrl: photo };
                  localStorage.setItem('user_session', JSON.stringify(updatedUser));
                }
              }
            } catch (e) {
              console.error('[프로필 사진 API 조회] 오류:', e);
            }
          }

          setUserPhoto(photo);
        }
      } catch (e) {
        console.error('[로그인 상태 확인] 오류:', e);
      }
    };
    checkLogin();

    const fetchStats = async () => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      try {
        const res = await fetch('/api/myjob/stats', { signal: ctrl.signal });
        clearTimeout(timer);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        clearTimeout(timer);
        if (error instanceof DOMException && error.name === 'AbortError') {
          console.error('MY JOB 통계 로드 타임아웃 (5초)');
        } else {
          console.error('MY JOB 통계 로드 실패:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="welcome-body">
      <style jsx global>{`
        :root {
          --bg1: #0d1830; --bg2: #0b1426; --panel: #0e1a33; --text: #eaf0ff; --muted: #a7b6d3;
          --brand: #5ba9ff; --brand-2: #88c0ff; --ok: #22c55e; --done: #f59e0b; --delay: #ef4444;
          --stroke: #1d2a48; --shadow: 0 12px 28px rgba(0,0,0,.35); --radius: 14px;
        }
        .welcome-body {
          min-height: 100vh;
          margin: 0;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans KR", Arial, sans-serif;
          color: var(--text);
          background: radial-gradient(1200px 700px at 70% -10%, #162a56 0%, var(--bg1) 45%, var(--bg2) 100%) fixed;
        }
        /* Top bar */
        .topbar {
          display: flex; align-items: center; justify-content: space-between; padding: 14px 22px;
          position: sticky; top: 0; z-index: 10;
          background: transparent;
        }
        .brand { display: flex; align-items: center; gap: 10px; font-weight: 800; }
        .logo {
          width: 32px; height: 32px; border-radius: 7px;
          object-fit: contain;
          box-shadow: 0 6px 16px rgba(91,169,255,.35);
          background: #fff;
        }
        .icons a {
          color: var(--muted); text-decoration: none; margin-left: 16px; font-size: 14px;
          padding: 6px 10px; border-radius: 10px; border: 1px solid transparent;
        }
        .icons a:hover { color: var(--text); border-color: var(--stroke); background: rgba(255,255,255,.06); }
        
        /* Layout */
        .wrap { max-width: 1200px; margin: 26px auto 34px; padding: 0 18px; }
        .hero { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
        @media (max-width: 980px) { .hero { grid-template-columns: 1fr; } }
        
        .card {
          background: var(--panel); border: 1px solid var(--stroke);
          border-radius: var(--radius); box-shadow: var(--shadow);
        }
        
        /* Left hero */
        .hero-left { padding: 0; overflow: hidden; position: relative; }
        .hero-header { padding: 10px 18px; font-size: 13px; font-weight: 800; color: #9cc5ff; }
        .hero-banner {
          margin: 0 18px 16px; background: #1b5e7a; border-radius: 8px; color: #fff;
          padding: 18px; display: flex; align-items: center; justify-content: center;
          text-align: center; font-weight: 900; font-size: 20px; letter-spacing: .2px;
        }
        .hero-desc { color: var(--muted); font-size: 13px; padding: 0 18px 14px; }
        
        /* Right hero */
        .hero-right { padding: 0; overflow: hidden; position: relative; height: 100%; min-height: 280px; }
        .yt-wrap {
          width: 100%; height: 100%; border-radius: 0; overflow: hidden; border: none;
          background: linear-gradient(135deg, #1e3a5f 0%, #0d2137 100%);
        }
        
        /* Section & Status */
        .section-title { margin: 18px 0 10px; font-weight: 900; font-size: 16px; }
        .status-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
        .status-card { padding: 16px 18px; display: flex; align-items: center; justify-content: space-between; }
        .status-title { color: var(--muted); font-size: 13px; margin: 0 0 6px; }
        .status-num { font-size: 30px; font-weight: 900; margin: 0; }
        .chip { padding: 4px 10px; border-radius: 999px; font-size: 12px; color: #fff; font-weight: 800; }
        .chip.ok { background: var(--ok); } .chip.done { background: var(--done); } .chip.delay { background: var(--delay); }
        
        /* Quick links - 3열 균형 */
        .quick-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        @media (max-width: 980px) { .quick-grid { grid-template-columns: repeat(2, 1fr); } }
        
        .mini {
          padding: 14px 16px; cursor: pointer; transition: .18s ease; text-decoration: none; display: block; color: inherit;
          position: relative;
        }
        .mini:hover { transform: translateY(-2px); border-color: var(--brand); }
        .mini h4 { margin: 0 0 6px; font-size: 14px; font-weight: 900; }
        .mini p { margin: 0; color: var(--muted); font-size: 12px; }
        .badge {
          display: inline-block; padding: 2px 7px; border-radius: 999px; font-size: 12px;
          color: #fff; background: linear-gradient(135deg, var(--brand), var(--brand-2)); margin-left: 6px;
        }
        .lock-badge {
          position: absolute; top: 8px; right: 8px; font-size: 18px; opacity: 0.6;
        }
        
        /* Links (2-column grid layout: 60:40 ratio) */
        .links { display: grid; grid-template-columns: 60% 40%; gap: 30px; }
        .links-col h3 { margin: 0 0 10px; font-size: 14px; font-weight: 900; color: #b9cff3; }
        .link-row { display: flex; flex-wrap: nowrap; gap: 10px; }
        @media (max-width: 768px) { 
          .links { grid-template-columns: 1fr; } 
          .link-row { flex-wrap: wrap; }
        }
        .site-pill {
          display: inline-flex; align-items: center; gap: 8px; padding: 7px 12px;
          border: 1px solid var(--stroke); border-radius: 999px; background: rgba(255,255,255,.05);
          text-decoration: none; color: var(--text); font-size: 12px; font-weight: 800;
        }
        .site-pill:hover { background: rgba(255,255,255,.10); border-color: var(--brand); }
        .dot { width: 8px; height: 8px; border-radius: 50%; background: linear-gradient(135deg, var(--brand), var(--brand-2)); }
        
        .footer { margin: 18px 0 8px; color: var(--muted); font-size: 12px; text-align: center; }
      `}</style>

      {/* Top Bar */}
      <header className="topbar">
        <Link href="/" className="brand" style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
          <img src="/amp-logo.png?v=5" alt="AMP SYSTEM" className="logo" />
          <div>Smart System</div>
        </Link>
        <nav className="icons">
          {isLoggedIn ? (
            <div ref={menuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* 숨겨진 파일 입력 */}
              <input ref={photoInputRef} type="file" accept="image/*" onChange={handleFileUpload}
                style={{ display: 'none' }} />

              {/* 프로필 아바타 - 클릭으로 메뉴 토글 */}
              <div
                onClick={() => setShowPhotoMenu(v => !v)}
                style={{ cursor: 'pointer', position: 'relative' }}
              >
                {userPhoto ? (
                  <img src={userPhoto} alt={userName}
                    style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover',
                      boxShadow: '0 4px 12px rgba(91,169,255,.3)', border: '2px solid rgba(255,255,255,0.3)' }} />
                ) : (
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--brand), var(--brand-2))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                    boxShadow: '0 4px 12px rgba(91,169,255,.3)', border: '2px solid rgba(255,255,255,0.3)' }}>
                    👤
                  </div>
                )}
                {/* 카메라 뱃지 */}
                <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '14px', height: '14px',
                  borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '8px', border: '1.5px solid #0d1830' }}>
                  📷
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>{userName}</span>
                <span style={{ fontSize: '10px', color: 'var(--muted)' }}>AMPSYSTEM</span>
              </div>

              {/* 사진 등록 드롭다운 메뉴 */}
              {showPhotoMenu && (
                <div style={{
                  position: 'absolute', top: '56px', right: '0', width: '200px', zIndex: 100,
                  background: '#1e293b', border: '1px solid #334155', borderRadius: '10px',
                  boxShadow: '0 12px 28px rgba(0,0,0,0.5)', overflow: 'hidden',
                }}>
                  <div style={{ padding: '10px 12px 6px', fontSize: '10px', color: '#64748b', fontWeight: 700 }}>
                    프로필 사진 변경
                  </div>
                  {/* 파일 업로드 */}
                  <button onClick={() => photoInputRef.current?.click()}
                    style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none',
                      color: '#e2e8f0', fontSize: '12px', textAlign: 'left', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '8px' }}
                    onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                    onMouseOut={e => (e.currentTarget.style.background = 'none')}>
                    <span style={{ fontSize: '14px' }}>📁</span> 파일에서 선택
                  </button>
                  {/* 삭제 */}
                  {userPhoto && (
                    <button onClick={() => savePhotoAll(null)}
                      style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none',
                        color: '#ef4444', fontSize: '12px', textAlign: 'left', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid #334155' }}
                      onMouseOver={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                      onMouseOut={e => (e.currentTarget.style.background = 'none')}>
                      <span style={{ fontSize: '14px' }}>🗑️</span> 사진 삭제
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: 'linear-gradient(135deg, var(--brand), var(--brand-2))',
              borderRadius: '10px',
              color: '#fff',
              fontWeight: '800',
              textDecoration: 'none',
              border: '1px solid transparent',
              boxShadow: '0 4px 12px rgba(91,169,255,.3)'
            }}>
              🔒 로그인
            </Link>
          )}
        </nav>
      </header>

      <main className="wrap">
        {/* Hero Section */}
        <section className="hero">
          {/* Left Banner */}
          <div className="card hero-left">
            <div className="hero-header">Welcome ! Smart System !</div>
            <div className="hero-banner">
              Smart System으로<br />프리미엄 자동차 시장에 진출하세요 !
            </div>
            <div className="hero-desc">
              IATF 최신 표준에 근거한 APQP 3<sup>rd</sup>, FMEA 4<sup>th</sup>, CP 1<sup>st</sup>, PFD 자동연동 시스템 !
              <br />
              <span style={{ color: 'var(--brand)', fontWeight: '800', marginTop: '8px', display: 'block' }}>
                ⚡ 모듈 사용을 원하시면 우측 상단 Sign In 버튼을 클릭하세요
              </span>
            </div>
          </div>

          {/* Right Preview - FMEA Dashboard (실시간 DB 통계) */}
          {/* ★ APQP 개발 완료 시 ApqpDashboardPreview로 교체 → src/components/dashboard/ApqpDashboardPreview.tsx */}
          <FmeaDashboardPreview />
        </section>

        {/* Family Selection — 모듈 선택 (숨김 처리) */}

        {/* Status Section - MY JOB */}
        <h2 className="section-title">MY JOB Status — 나의 업무 현황</h2>
        <div className="status-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <Link href="/myjob?filter=all" className="card status-card" style={{ transition: 'transform 0.2s', cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}>
            <div>
              <div className="status-title">총 업무</div>
              <p className="status-num">{stats.total}</p>
            </div>
            <span className="chip" style={{ background: 'var(--brand)' }}>ALL</span>
          </Link>
          <Link href="/myjob?filter=inprogress" className="card status-card" style={{ transition: 'transform 0.2s', cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}>
            <div>
              <div className="status-title">진행중</div>
              <p className="status-num">{stats.inprogress}</p>
            </div>
            <span className="chip ok">OK</span>
          </Link>
          <Link href="/myjob?filter=done" className="card status-card" style={{ transition: 'transform 0.2s', cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}>
            <div>
              <div className="status-title">완료</div>
              <p className="status-num">{stats.done}</p>
            </div>
            <span className="chip done">DONE</span>
          </Link>
          <Link href="/myjob?filter=delayed" className="card status-card" style={{ transition: 'transform 0.2s', cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}>
            <div>
              <div className="status-title">지연</div>
              <p className="status-num">{stats.delayed}</p>
            </div>
            <span className="chip delay">DELAY</span>
          </Link>
        </div>

        {/* Quick Links Section */}
        <h2 className="section-title">
          바로가기 — {isLoggedIn ? `${userName}님 환영합니다` : '로그인 후 이용 가능'}
        </h2>
        <div className="quick-grid">
          {/* 1열: 대시보드, PFMEA리스트, AP개선관리, LLD */}
          <Link href={isLoggedIn ? "/pfmea/dashboard" : "/login"} className="card mini">
            <span className="lock-badge">📊</span>
            <h4>대시보드<span className="badge">NEW</span></h4>
            <p>PFMEA 대시보드</p>
          </Link>
<Link href={isLoggedIn ? "/pfmea/list" : "/login"} className="card mini">
            <span className="lock-badge">📋</span>
            <h4>PFMEA리스트</h4>
            <p>PFMEA 리스트</p>
          </Link>
          <Link href={isLoggedIn ? "/pfmea/ap-improvement" : "/login"} className="card mini">
            <span className="lock-badge">🚀</span>
            <h4>AP 개선관리</h4>
            <p>Action Priority</p>
          </Link>
          <Link href={isLoggedIn ? "/pfmea/lld" : "/login"} className="card mini">
            <span className="lock-badge">📋</span>
            <h4>LLD(필터코드)</h4>
            <p>Lessons Learned</p>
          </Link>
          {/* 2열: CP, PFD */}
          <Link href={isLoggedIn ? "/control-plan/list" : "/login"} className="card mini">
            <span className="lock-badge">✅</span>
            <h4>CP</h4>
            <p>Control Plan</p>
          </Link>
          <Link href={isLoggedIn ? "/pfd/list" : "/login"} className="card mini">
            <span className="lock-badge">🔀</span>
            <h4>PFD</h4>
            <p>공정흐름도</p>
          </Link>
        </div>

        {/* External Links Section */}
        <h2 className="section-title">관련 사이트</h2>
        <div className="links">
          {/* Left Column: AMP System */}
          <div className="links-col">
            <h3>AMP 시스템</h3>
            <div className="link-row">
              <a className="site-pill" href="http://ampbiz.co.kr" target="_blank" rel="noopener noreferrer">
                <span className="dot"></span>ampbiz.co.kr
              </a>
              <a className="site-pill" href="http://ampbiz.co.kr/page/inquiry.php" target="_blank" rel="noopener noreferrer">
                <span className="dot"></span>AMP 문의하기
              </a>
              <a className="site-pill" href="https://cafe.naver.com/ampqm" target="_blank" rel="noopener noreferrer">
                <span className="dot"></span>AMP 카페
              </a>
              <a className="site-pill" href="https://www.youtube.com/@AMPTV1stauto" target="_blank" rel="noopener noreferrer">
                <span className="dot"></span>YouTube AMPTV
              </a>
            </div>
          </div>

          {/* Right Column: Related Organizations */}
          <div className="links-col">
            <h3>관련기관 사이트</h3>
            <div className="link-row">
              <a className="site-pill" href="https://www.aiag.org" target="_blank" rel="noopener noreferrer">
                <span className="dot"></span>AIAG
              </a>
              <a className="site-pill" href="https://vdaqmc.de/en/" target="_blank" rel="noopener noreferrer">
                <span className="dot"></span>VDA QMC
              </a>
              <a className="site-pill" href="https://www.iso.org" target="_blank" rel="noopener noreferrer">
                <span className="dot"></span>ISO
              </a>
              <a className="site-pill" href="https://www.iatfglobaloversight.org" target="_blank" rel="noopener noreferrer">
                <span className="dot"></span>IATF Oversight
              </a>
            </div>
          </div>
        </div>

        <p className="footer">v2.0.0 (On-Premise) · FMEA Smart System · © AMP SYSTEM</p>
      </main>
    </div>
  );
}
