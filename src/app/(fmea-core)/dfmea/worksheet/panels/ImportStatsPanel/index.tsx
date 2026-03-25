'use client';

/**
 * @file ImportStatsPanel.tsx
 * @description 워크시트 Import 통계 패널 — WorksheetState에서 A1~C4 항목별 카운트 산출
 * @created 2026-03-22
 */

import React, { useMemo, useState } from 'react';
import type { WorksheetState } from '../../constants';

interface Props {
  state: WorksheetState;
}

interface StatRow {
  level: string;
  code: string;
  label: string;
  raw: number;
  unique: number;
  dup: number;
}

interface C1Detail {
  no: number;
  category: string;
  funcCount: number;
  reqCount: number;
}

function countUnique(arr: string[]): number {
  return new Set(arr.filter(v => v.trim())).size;
}

function computeStats(state: WorksheetState): { rows: StatRow[]; c1Details: C1Detail[] } {
  const l2 = state.l2 || [];
  const l1 = state.l1;

  const a1Vals = l2.map(p => p.no).filter(Boolean);
  const a2Vals = l2.map(p => p.name).filter(Boolean);
  const a3Vals = l2.flatMap(p => (p.functions || []).map(f => f.name)).filter(Boolean);
  const a4Vals = l2.flatMap(p => (p.functions || []).flatMap(f => (f.productChars || []).map(pc => pc.name))).filter(Boolean);
  const a5Vals = l2.flatMap(p => (p.failureModes || []).map(fm => fm.name)).filter(Boolean);

  const b1Vals = l2.flatMap(p => (p.l3 || []).map(we => we.name)).filter(Boolean);
  const b2Vals = l2.flatMap(p => (p.l3 || []).flatMap(we => (we.functions || []).map(f => f.name))).filter(Boolean);
  const b3Vals = l2.flatMap(p => (p.l3 || []).flatMap(we => (we.functions || []).flatMap(f => (f.processChars || []).map(pc => pc.name)))).filter(Boolean);
  const b4Vals = l2.flatMap(p => (p.l3 || []).flatMap(we => (we.failureCauses || []).map(fc => fc.name))).filter(Boolean);

  const rd = (state.riskData || {}) as Record<string, unknown>;
  const riskKeys = Object.keys(rd);
  // detection-{fmId}-{fcId} = DC 텍스트, detection-opt-* = 최적화 (제외)
  const dcKeys = riskKeys.filter(k => k.startsWith('detection-') && !k.startsWith('detection-opt-') && !k.includes('-D'));
  const pcKeys = riskKeys.filter(k => k.startsWith('prevention-') && !k.startsWith('prevention-opt-'));
  const a6Vals = dcKeys.map(k => String(rd[k] || '')).filter(v => v.trim() && isNaN(Number(v)));
  const b5Vals = pcKeys.map(k => String(rd[k] || '')).filter(v => v.trim() && isNaN(Number(v)));

  const c1Vals = (l1?.types || []).map(t => t.name).filter(Boolean);
  const c2Vals = (l1?.types || []).flatMap(t => (t.functions || []).map(f => f.name)).filter(Boolean);
  const c3Vals = (l1?.types || []).flatMap(t => (t.functions || []).flatMap(f => (f.requirements || []).map(r => r.name || ''))).filter(Boolean);
  const c4Vals = (l1?.failureScopes || []).map(s => s.effect || s.name || '').filter(Boolean);

  const mk = (level: string, code: string, label: string, vals: string[]): StatRow => {
    const raw = vals.length;
    const unique = countUnique(vals);
    return { level, code, label, raw, unique, dup: raw - unique };
  };

  const rows: StatRow[] = [
    mk('L2', 'A1', '공정번호', a1Vals),
    mk('L2', 'A2', '공정명', a2Vals),
    mk('L2', 'A3', '설계기능', a3Vals),
    mk('L2', 'A4', '설계특성', a4Vals),
    mk('L2', 'A5', '고장형태', a5Vals),
    mk('L2', 'A6', '설계검증 검출', a6Vals),
    mk('L3', 'B1', '부품(컴포넌트)', b1Vals),
    mk('L3', 'B2', '요소기능', b2Vals),
    mk('L3', 'B3', '설계파라미터', b3Vals),
    mk('L3', 'B4', '고장원인', b4Vals),
    mk('L3', 'B5', '설계검증 예방', b5Vals),
    mk('L1', 'C1', '구분', c1Vals),
    mk('L1', 'C2', '제품기능', c2Vals),
    mk('L1', 'C3', '요구사항', c3Vals),
    mk('L1', 'C4', '고장영향', c4Vals),
  ];

  const c1Details: C1Detail[] = (l1?.types || []).map((t, i) => ({
    no: i + 1,
    category: t.name || `(구분 ${i + 1})`,
    funcCount: (t.functions || []).filter(f => f.name?.trim()).length,
    reqCount: (t.functions || []).reduce((sum, f) =>
      sum + (f.requirements || []).filter(r => (r.name || '').trim().length > 0).length, 0),
  }));

  return { rows, c1Details };
}

export default function ImportStatsPanel({ state }: Props) {
  const [showC1, setShowC1] = useState(true);
  const { rows, c1Details } = useMemo(() => computeStats(state), [state]);

  const totalRaw = rows.reduce((s, r) => s + r.raw, 0);
  const totalUnique = rows.reduce((s, r) => s + r.unique, 0);
  const totalDup = rows.reduce((s, r) => s + r.dup, 0);
  const flCount = (state.failureLinks || []).length;

  return (
    <div className="p-2 text-[10px] overflow-auto h-full">
      <h3 className="font-bold text-[11px] text-indigo-800 mb-1">워크시트 통계</h3>

      <table className="w-full border-collapse text-[9px]">
        <thead>
          <tr className="bg-indigo-100">
            <th className="border border-indigo-200 px-1 py-0.5 text-left">레벨</th>
            <th className="border border-indigo-200 px-1 py-0.5 text-left">코드</th>
            <th className="border border-indigo-200 px-1 py-0.5 text-left">항목</th>
            <th className="border border-indigo-200 px-1 py-0.5 text-center">원본</th>
            <th className="border border-indigo-200 px-1 py-0.5 text-center">고유</th>
            <th className="border border-indigo-200 px-1 py-0.5 text-center">중복</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.code}
              className={r.level === 'L1' ? 'bg-yellow-50' : r.level === 'L2' ? 'bg-blue-50' : 'bg-green-50'}
            >
              <td className="border border-indigo-200 px-1 py-0.5">{r.level}</td>
              <td className="border border-indigo-200 px-1 py-0.5 font-mono font-bold">{r.code}</td>
              <td className="border border-indigo-200 px-1 py-0.5">{r.label}</td>
              <td className="border border-indigo-200 px-1 py-0.5 text-center">{r.raw}</td>
              <td className="border border-indigo-200 px-1 py-0.5 text-center">{r.unique}</td>
              <td className={`border border-indigo-200 px-1 py-0.5 text-center ${r.dup > 0 ? 'text-red-600 font-bold' : ''}`}>
                {r.dup}
              </td>
            </tr>
          ))}
          <tr className="bg-indigo-200 font-bold">
            <td colSpan={3} className="border border-indigo-300 px-1 py-0.5">합계</td>
            <td className="border border-indigo-300 px-1 py-0.5 text-center">{totalRaw}</td>
            <td className="border border-indigo-300 px-1 py-0.5 text-center">{totalUnique}</td>
            <td className={`border border-indigo-300 px-1 py-0.5 text-center ${totalDup > 0 ? 'text-red-600' : ''}`}>
              {totalDup}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 고장사슬 */}
      <div className="mt-1 px-1 py-0.5 bg-purple-50 border border-purple-200 rounded text-[9px]">
        <span className="font-semibold text-purple-800">고장사슬(FL):</span>{' '}
        <span className="font-bold text-purple-900">{flCount}</span>건
        {' / '}
        <span className="font-semibold text-purple-800">DC:</span>{' '}
        <span className="font-bold">{rows.find(r => r.code === 'A6')?.raw || 0}</span>
        {' / '}
        <span className="font-semibold text-purple-800">PC:</span>{' '}
        <span className="font-bold">{rows.find(r => r.code === 'B5')?.raw || 0}</span>
      </div>

      {/* C1 상세 통계 */}
      <div className="mt-2">
        <button
          onClick={() => setShowC1(v => !v)}
          className="text-[9px] text-indigo-700 hover:text-indigo-900 font-semibold cursor-pointer"
        >
          {showC1 ? '▼' : '▶'} C1 구분별 상세
        </button>
        {showC1 && c1Details.length > 0 && (
          <table className="w-full border-collapse text-[9px] mt-1">
            <thead>
              <tr className="bg-yellow-100">
                <th className="border border-yellow-200 px-1 py-0.5 text-left">No</th>
                <th className="border border-yellow-200 px-1 py-0.5 text-left">C1 구분</th>
                <th className="border border-yellow-200 px-1 py-0.5 text-center">C2 제품기능</th>
                <th className="border border-yellow-200 px-1 py-0.5 text-center">C3 요구사항</th>
              </tr>
            </thead>
            <tbody>
              {c1Details.map((d) => (
                <tr key={d.no} className="bg-yellow-50">
                  <td className="border border-yellow-200 px-1 py-0.5">{d.no}</td>
                  <td className="border border-yellow-200 px-1 py-0.5 font-semibold">{d.category}</td>
                  <td className="border border-yellow-200 px-1 py-0.5 text-center">{d.funcCount}</td>
                  <td className="border border-yellow-200 px-1 py-0.5 text-center">{d.reqCount}</td>
                </tr>
              ))}
              <tr className="bg-yellow-200 font-bold">
                <td colSpan={2} className="border border-yellow-300 px-1 py-0.5">합계</td>
                <td className="border border-yellow-300 px-1 py-0.5 text-center">
                  {c1Details.reduce((s, d) => s + d.funcCount, 0)}
                </td>
                <td className="border border-yellow-300 px-1 py-0.5 text-center">
                  {c1Details.reduce((s, d) => s + d.reqCount, 0)}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
