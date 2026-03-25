/**
 * @file FailureChainCompare.tsx
 * @description Import 고장사슬 ↔ FMEA 연결표 대조 뷰
 *              FMEA FailureLinkTables와 동일 3패널(FE|FM|FC) 형태
 *              Import 데이터를 FMEA 형태로 표시 → 상호 검증 가능
 *
 * ★ Forge 프로세스 ② 성형: 동일 뷰로 대조
 * @created 2026-03-25
 */

'use client';

import React, { useMemo, useState } from 'react';
import type { MasterFailureChain } from '../types/masterFailureChain';
import { normalizeScope } from '@/lib/fmea/scope-constants';

// ─── FMEA 연결표 동일 색상 ───
const BORDER_FE = '1px solid #90caf9';
const BORDER_FM = '1px solid #ffcc80';
const BORDER_FC = '1px solid #a5d6a7';

const FC_PALETTE = [
  { light: '#e8f5e9', dark: '#c8e6c9' },
  { light: '#e3f2fd', dark: '#bbdefb' },
  { light: '#fff3e0', dark: '#ffe0b2' },
  { light: '#f3e5f5', dark: '#e1bee7' },
  { light: '#e0f7fa', dark: '#b2ebf2' },
];

const TH: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, color: '#fff',
  padding: '3px 6px', textAlign: 'center', whiteSpace: 'nowrap',
  position: 'sticky', top: 0, zIndex: 2,
};

interface Props {
  chains: MasterFailureChain[];
  isFullscreen?: boolean;
}

export function FailureChainCompare({ chains, isFullscreen }: Props) {
  const maxH = isFullscreen ? 'calc(100vh - 200px)' : '360px';
  const [selectedFmKey, setSelectedFmKey] = useState<string | null>(null);

  // 3패널 데이터
  const { feList, fmList, fcList, fmToFe, fmToFc } = useMemo(() => {
    const feMap = new Map<string, { key: string; scope: string; text: string; s?: number }>();
    const fmMap = new Map<string, { key: string; pNo: string; text: string; feN: number; fcN: number }>();
    const fcMap = new Map<string, { key: string; pNo: string; m4: string; we: string; text: string }>();
    const _fmToFe = new Map<string, Set<string>>();
    const _fmToFc = new Map<string, Set<string>>();

    for (const c of chains) {
      const feKey = c.feValue ? `${normalizeScope(c.feScope || '')}|${c.feValue}` : '';
      const fmKey = c.fmValue ? `${c.processNo}|${c.fmValue}` : '';
      const fcKey = c.fcValue ? `${c.processNo}|${c.m4 || ''}|${c.fcValue}` : '';

      if (feKey && !feMap.has(feKey))
        feMap.set(feKey, { key: feKey, scope: normalizeScope(c.feScope || ''), text: c.feValue, s: c.severity });
      if (fmKey && !fmMap.has(fmKey))
        fmMap.set(fmKey, { key: fmKey, pNo: c.processNo, text: c.fmValue, feN: 0, fcN: 0 });
      if (fcKey && !fcMap.has(fcKey))
        fcMap.set(fcKey, { key: fcKey, pNo: c.processNo, m4: c.m4 || '', we: c.workElement || '', text: c.fcValue });

      if (fmKey && feKey) {
        if (!_fmToFe.has(fmKey)) _fmToFe.set(fmKey, new Set());
        _fmToFe.get(fmKey)!.add(feKey);
      }
      if (fmKey && fcKey) {
        if (!_fmToFc.has(fmKey)) _fmToFc.set(fmKey, new Set());
        _fmToFc.get(fmKey)!.add(fcKey);
      }
    }
    // FM 연결 건수
    for (const [k, fm] of fmMap) {
      fm.feN = _fmToFe.get(k)?.size || 0;
      fm.fcN = _fmToFc.get(k)?.size || 0;
    }

    return {
      feList: [...feMap.values()].sort((a, b) => a.scope.localeCompare(b.scope) || a.text.localeCompare(b.text)),
      fmList: [...fmMap.values()].sort((a, b) => a.pNo.localeCompare(b.pNo, undefined, { numeric: true })),
      fcList: [...fcMap.values()].sort((a, b) => a.pNo.localeCompare(b.pNo, undefined, { numeric: true }) || a.m4.localeCompare(b.m4)),
      fmToFe: _fmToFe, fmToFc: _fmToFc,
    };
  }, [chains]);

  const linkedFe = selectedFmKey ? (fmToFe.get(selectedFmKey) || new Set<string>()) : new Set<string>();
  const linkedFc = selectedFmKey ? (fmToFc.get(selectedFmKey) || new Set<string>()) : new Set<string>();

  if (chains.length === 0) return null;

  const scopeBg = (s: string, i: number) => {
    const c = s === 'SP' ? ['#fff3e0', '#ffe0b2'] : s === 'USER' ? ['#f3e5f5', '#e1bee7'] : ['#e3f2fd', '#bbdefb'];
    return i % 2 === 0 ? c[1] : c[0];
  };

  return (
    <div style={{ display: 'flex', gap: 3, maxHeight: maxH, overflow: 'hidden' }}>
      {/* FE */}
      <div style={{ flex: '1 1 33%', border: '2px solid #90caf9', borderRadius: 4, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ background: '#e3f2fd', padding: '2px 6px', borderBottom: BORDER_FE, fontSize: 10, fontWeight: 700, color: '#1565c0' }}>
          FE 고장영향 ({feList.length})
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
            <thead><tr>
              <th style={{ ...TH, background: '#1a3050', width: 26 }}>No</th>
              <th style={{ ...TH, background: '#1a3050', width: 30 }}>Cat</th>
              <th style={{ ...TH, background: '#1a3050' }}>FE</th>
              <th style={{ ...TH, background: '#1a3050', width: 22 }}>S</th>
            </tr></thead>
            <tbody>{feList.map((fe, i) => {
              const hl = linkedFe.has(fe.key);
              const bg = hl ? '#bbdefb' : scopeBg(fe.scope, i);
              return (<tr key={fe.key} style={hl ? { boxShadow: 'inset 0 0 0 2px #1976d2' } : {}}>
                <td style={{ background: hl ? '#1976d2' : '#5a7a9a', color: '#fff', textAlign: 'center', border: BORDER_FE, padding: '1px', fontSize: 9, fontWeight: 600 }}>{i + 1}</td>
                <td style={{ background: bg, textAlign: 'center', border: BORDER_FE, padding: '1px', fontSize: 9 }}>{fe.scope}</td>
                <td style={{ background: bg, border: BORDER_FE, padding: '2px 4px', lineHeight: 1.2 }}>
                  {hl && <span className="mr-1 text-blue-700 font-bold">▶</span>}{fe.text}
                </td>
                <td style={{ background: bg, textAlign: 'center', border: BORDER_FE, padding: '1px', fontSize: 9, fontWeight: 600, color: (fe.s || 0) >= 8 ? '#d32f2f' : '#333' }}>{fe.s || '-'}</td>
              </tr>);
            })}</tbody>
          </table>
        </div>
      </div>

      {/* FM */}
      <div style={{ flex: '1 1 28%', border: '2px solid #ffcc80', borderRadius: 4, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ background: '#fff3e0', padding: '2px 6px', borderBottom: BORDER_FM, fontSize: 10, fontWeight: 700, color: '#e65100' }}>
          FM 고장형태 ({fmList.length})
          <span className="ml-1 text-[8px] text-gray-500 font-normal">클릭→연결확인</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
            <thead><tr>
              <th style={{ ...TH, background: '#3a2a10', width: 26 }}>No</th>
              <th style={{ ...TH, background: '#3a2a10', width: 36 }}>공정</th>
              <th style={{ ...TH, background: '#3a2a10' }}>FM</th>
            </tr></thead>
            <tbody>{fmList.map((fm, i) => {
              const sel = selectedFmKey === fm.key;
              const ok = fm.feN > 0 && fm.fcN > 0;
              return (<tr key={fm.key} onClick={() => setSelectedFmKey(sel ? null : fm.key)}
                style={{ cursor: 'pointer', ...(sel ? { outline: '3px solid #1976d2', outlineOffset: -1 } : {}) }}>
                <td style={{ background: sel ? '#1976d2' : (ok ? '#2e7d32' : '#f57c00'), color: '#fff', textAlign: 'center', border: BORDER_FM, padding: '1px', fontSize: 9, fontWeight: 600 }}>{i + 1}</td>
                <td style={{ background: sel ? '#bbdefb' : (i % 2 ? '#ffe0b2' : '#fff3e0'), textAlign: 'center', border: BORDER_FM, padding: '1px', fontSize: 9, fontWeight: 600 }}>{fm.pNo}</td>
                <td style={{ background: sel ? '#bbdefb' : (i % 2 ? '#ffe0b2' : '#fff3e0'), border: BORDER_FM, padding: '2px 4px', lineHeight: 1.2, color: ok ? '#2e7d32' : '#333' }}>
                  {ok && <span className="mr-1 text-green-700">●</span>}
                  {sel && <span className="mr-1 text-blue-600 font-bold">▶</span>}
                  {fm.text}
                  <span className="ml-1 text-[8px] text-gray-400">(FE{fm.feN}/FC{fm.fcN})</span>
                </td>
              </tr>);
            })}</tbody>
          </table>
        </div>
      </div>

      {/* FC */}
      <div style={{ flex: '1 1 35%', border: '2px solid #a5d6a7', borderRadius: 4, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ background: '#e8f5e9', padding: '2px 6px', borderBottom: BORDER_FC, fontSize: 10, fontWeight: 700, color: '#2e7d32' }}>
          FC 고장원인 ({fcList.length})
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, tableLayout: 'fixed' }}>
            <thead><tr>
              <th style={{ ...TH, background: '#1a3520', width: 26 }}>No</th>
              <th style={{ ...TH, background: '#1a3520', width: 26 }}>4M</th>
              <th style={{ ...TH, background: '#1a3520', width: '20%' }}>WE</th>
              <th style={{ ...TH, background: '#1a3520' }}>FC</th>
            </tr></thead>
            <tbody>{(() => {
              const pMap = new Map<string, number>(); let ci = 0, pi = 0, pp = '';
              return fcList.map((fc, i) => {
                if (fc.pNo !== pp) { if (!pMap.has(fc.pNo)) { pMap.set(fc.pNo, ci++); } pi = 0; pp = fc.pNo; }
                const c = FC_PALETTE[(pMap.get(fc.pNo) || 0) % FC_PALETTE.length];
                const bg0 = pi++ % 2 === 0 ? c.dark : c.light;
                const hl = linkedFc.has(fc.key);
                const bg = hl ? '#bbdefb' : bg0;
                return (<tr key={fc.key} style={hl ? { boxShadow: 'inset 0 0 0 2px #1976d2' } : {}}>
                  <td style={{ background: hl ? '#1976d2' : '#5a8a5a', color: '#fff', textAlign: 'center', border: BORDER_FC, padding: '1px', fontSize: 9, fontWeight: 600 }}>{i + 1}</td>
                  <td style={{ background: bg, textAlign: 'center', border: BORDER_FC, padding: '1px', fontSize: 9 }}>{fc.m4}</td>
                  <td style={{ background: bg, border: BORDER_FC, padding: '1px 3px', fontSize: 9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={fc.we}>{fc.we}</td>
                  <td style={{ background: bg, border: BORDER_FC, padding: '2px 4px', lineHeight: 1.2 }}>
                    {hl && <span className="mr-1 text-blue-700 font-bold">▶</span>}{fc.text}
                  </td>
                </tr>);
              });
            })()}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default FailureChainCompare;
