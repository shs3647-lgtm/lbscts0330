/**
 * @file ImportModeMenuBar.tsx
 * @description Import 모드 고정 메뉴바 — 전처리 / 수동 / 기존데이터
 * @created 2026-02-26
 */

'use client';

import Link from 'next/link';

interface ImportModeMenuBarProps {
  activeMode: 'manual' | 'legacy';
  fmeaId?: string;
}

const MODES = [
  { key: 'manual', label: '수동/자동 Import', path: '/dfmea/import/manual' },
  { key: 'legacy', label: '기존데이터 Import', path: '/dfmea/import/legacy' },
] as const;

export default function ImportModeMenuBar({ activeMode, fmeaId }: ImportModeMenuBarProps) {
  const qs = fmeaId ? `?id=${encodeURIComponent(fmeaId)}` : '';

  return (
    <div className="flex items-center border-b border-blue-200 bg-blue-50/60 mb-2">
      {MODES.map(m => (
        <Link
          key={m.key}
          href={`${m.path}${qs}`}
          className={`flex-1 py-2 text-center text-[12px] font-bold cursor-pointer transition-colors ${
            activeMode === m.key
              ? 'text-blue-700 bg-white border-b-2 border-blue-600'
              : 'text-gray-400 border-b-2 border-transparent hover:text-gray-600 hover:bg-white/60'
          }`}
        >
          {m.label}
        </Link>
      ))}
    </div>
  );
}
