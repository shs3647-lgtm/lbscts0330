'use client';

import React, { useEffect, useState } from 'react';

interface FmeaProject {
  id: string;
  name?: string;
  fmeaInfo?: { subject?: string };
}

interface FmeaSelectorProps {
  label: string;
  value: string;
  onChange: (fmeaId: string) => void;
  disabled?: boolean;
}

export function FmeaSelector({ label, value, onChange, disabled }: FmeaSelectorProps) {
  const [list, setList] = useState<FmeaProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/fmea/projects?type=P');
        const data = await res.json();
        const raw = Array.isArray(data) ? data : data?.projects ?? data?.data ?? [];
        if (!cancelled && Array.isArray(raw)) {
          setList(raw);
        }
      } catch (e) {
        console.error('[FmeaSelector]', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <label className="flex items-center gap-2 text-[11px] text-slate-700">
      <span className="font-semibold text-slate-600 shrink-0">{label}</span>
      <select
        className="max-w-[min(280px,40vw)] rounded border border-slate-300 bg-white px-2 py-1 text-[11px]"
        value={value}
        disabled={disabled || loading}
        onChange={(e) => onChange(e.target.value)}
      >
        {loading && <option value="">— 로딩 —</option>}
        {!loading && list.length === 0 && <option value="">— 프로젝트 없음 —</option>}
        {list.map((p) => (
          <option key={p.id} value={p.id}>
            {p.id} {p.fmeaInfo?.subject ?? p.name ?? ''}
          </option>
        ))}
      </select>
    </label>
  );
}
