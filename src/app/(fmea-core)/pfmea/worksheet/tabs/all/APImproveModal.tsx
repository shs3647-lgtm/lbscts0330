/**
 * @file APImproveModal.tsx
 * @description AP(H/M) 셀 클릭 시 3방향 개선안 입력 모달
 * - ① 발생도 개선 (O only) → prevention-opt 저장
 * - ② 검출도 개선 (D only) → detection-opt 저장
 * - ③ 발생도 및 검출도 개선 (Both) → 양쪽 저장
 */
'use client';

import React, { useState, useMemo } from 'react';
import { calculateAP } from './apCalculator';
import { PLACEHOLDER_NA } from './allTabConstants';

const MIN_TARGET = 2;

type ImproveDirection = 'O_ONLY' | 'D_ONLY' | 'BOTH';

interface ImprovePath {
  targetO: number;
  targetD: number;
  changeO: number;
  changeD: number;
  totalChange: number;
  feasible: boolean;
}

export function getAllPaths(s: number, o: number, d: number) {
  const inf = (): ImprovePath => ({ targetO: o, targetD: d, changeO: 0, changeD: 0, totalChange: Infinity, feasible: false });

  let oOnly = inf();
  for (let newO = o - 1; newO >= MIN_TARGET; newO--) {
    if (calculateAP(s, newO, d) === 'L') {
      oOnly = { targetO: newO, targetD: d, changeO: o - newO, changeD: 0, totalChange: o - newO, feasible: true };
      break;
    }
  }

  let dOnly = inf();
  for (let newD = d - 1; newD >= MIN_TARGET; newD--) {
    if (calculateAP(s, o, newD) === 'L') {
      dOnly = { targetO: o, targetD: newD, changeO: 0, changeD: d - newD, totalChange: d - newD, feasible: true };
      break;
    }
  }

  let both = inf();
  let bestT = Infinity;
  for (let newO = o - 1; newO >= MIN_TARGET; newO--) {
    if ((o - newO) + 1 >= bestT) continue;
    for (let newD = d - 1; newD >= MIN_TARGET; newD--) {
      if (calculateAP(s, newO, newD) === 'L') {
        const t = (o - newO) + (d - newD);
        if (t < bestT || (t === bestT && (o - newO) < both.changeO)) {
          bestT = t;
          both = { targetO: newO, targetD: newD, changeO: o - newO, changeD: d - newD, totalChange: t, feasible: true };
        }
        break;
      }
    }
  }

  const feasible = [
    { key: 'O_ONLY' as const, path: oOnly },
    { key: 'D_ONLY' as const, path: dOnly },
    { key: 'BOTH' as const, path: both },
  ].filter(p => p.path.feasible).sort((a, b) => a.path.totalChange - b.path.totalChange);

  return { oOnly, dOnly, both, recommended: feasible[0]?.key as ImproveDirection | undefined };
}

export interface APImproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  s: number;
  o: number;
  d: number;
  ap: 'H' | 'M' | 'L';
  uniqueKey: string;
  failureMode?: string;
  currentPC?: string;
  currentDC?: string;
  onSave: (data: {
    uniqueKey: string;
    direction: ImproveDirection;
    preventionOpt?: string;
    detectionOpt?: string;
  }) => void;
}

export default function APImproveModal({
  isOpen, onClose, s, o, d, ap, uniqueKey,
  failureMode, currentPC, currentDC, onSave,
}: APImproveModalProps) {
  const [selected, setSelected] = useState<ImproveDirection | null>(null);
  const [textO, setTextO] = useState('');
  const [textD, setTextD] = useState('');
  const [isDefaultO, setIsDefaultO] = useState(false);
  const [isDefaultD, setIsDefaultD] = useState(false);

  const paths = useMemo(() => getAllPaths(s, o, d), [s, o, d]);
  const pcClean = (currentPC || '').split('\n').map(l => l.replace(/^[PD]:/, '')).join(', ');
  const dcClean = (currentDC || '').split('\n').map(l => l.replace(/^[PD]:/, '')).join(', ');

  if (!isOpen) return null;

  const dirs: { key: ImproveDirection; label: string; path: ImprovePath; desc: string }[] = [
    { key: 'O_ONLY', label: '① 발생도 개선', path: paths.oOnly, desc: `O: ${o}→${paths.oOnly.targetO}` },
    { key: 'D_ONLY', label: '② 검출도 개선', path: paths.dOnly, desc: `D: ${d}→${paths.dOnly.targetD}` },
    { key: 'BOTH', label: '③ O+D 개선', path: paths.both, desc: `O: ${o}→${paths.both.targetO}, D: ${d}→${paths.both.targetD}` },
  ];

  const needsO = selected === 'O_ONLY' || selected === 'BOTH';
  const needsD = selected === 'D_ONLY' || selected === 'BOTH';

  const canSave = selected && (
    needsO && needsD ? !!(textO.trim() && textD.trim())
    : needsO ? !!textO.trim()
    : needsD ? !!textD.trim()
    : false
  );

  const getRecText = (dir: ImproveDirection) => {
    const p = dir === 'O_ONLY' ? paths.oOnly : dir === 'D_ONLY' ? paths.dOnly : paths.both;
    return {
      oText: (dir === 'O_ONLY' || dir === 'BOTH') && p.feasible ? `발생도 ${o}→${p.targetO} 개선` : '',
      dText: (dir === 'D_ONLY' || dir === 'BOTH') && p.feasible ? `검출도 ${d}→${p.targetD} 개선` : '',
    };
  };

  const handleSelectDirection = (dir: ImproveDirection) => {
    setSelected(dir);
    const rec = getRecText(dir);
    const showO = dir === 'O_ONLY' || dir === 'BOTH';
    const showD = dir === 'D_ONLY' || dir === 'BOTH';
    setTextO(showO ? rec.oText : '');
    setTextD(showD ? rec.dText : '');
    setIsDefaultO(showO && !!rec.oText);
    setIsDefaultD(showD && !!rec.dText);
  };

  const handleSave = () => {
    if (!selected || !canSave) return;
    onSave({
      uniqueKey,
      direction: selected,
      preventionOpt: needsO ? textO.trim() : PLACEHOLDER_NA,
      detectionOpt: needsD ? textD.trim() : PLACEHOLDER_NA,
    });
    setSelected(null); setTextO(''); setTextD('');
    setIsDefaultO(false); setIsDefaultD(false);
    onClose();
  };

  const handleClose = () => {
    setSelected(null); setTextO(''); setTextD('');
    setIsDefaultO(false); setIsDefaultD(false);
    onClose();
  };

  const headerColor = ap === 'H' ? 'bg-red-600' : 'bg-orange-500';

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center" onClick={handleClose}>
      <div className="fixed inset-0 bg-black/30" />
      <div className="relative bg-white rounded-lg shadow-2xl border border-gray-300 w-[460px] max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className={`${headerColor} text-white px-4 py-2 rounded-t-lg flex items-center justify-between`}>
          <h3 className="font-bold text-sm">AP {ap} → L 개선 방향 선택</h3>
          <button onClick={handleClose} className="text-white/70 hover:text-white text-xl leading-none">✕</button>
        </div>
        <div className="p-3 text-xs">
          {/* SOD 컨텍스트 */}
          <div className="flex gap-1.5 mb-2 flex-wrap">
            <span className="px-2 py-0.5 rounded font-bold" style={{ background: '#fee2e2', color: '#991b1b' }}>S={s}</span>
            <span className="px-2 py-0.5 rounded font-bold" style={{ background: '#dcfce7', color: '#166534' }}>O={o}</span>
            <span className="px-2 py-0.5 rounded font-bold" style={{ background: '#e0f2fe', color: '#1e40af' }}>D={d}</span>
            <span className="px-2 py-0.5 rounded font-bold" style={{ background: ap === 'H' ? '#fee2e2' : '#fef3c7', color: ap === 'H' ? '#991b1b' : '#92400e' }}>AP={ap}</span>
          </div>
          {failureMode && (
            <div className="mb-2 text-gray-500 truncate" title={failureMode}>
              <span className="font-semibold text-gray-700">고장형태:</span> {failureMode}
            </div>
          )}

          {/* 추천 개선 방향만 표시 */}
          <div className="flex flex-col gap-1 mb-3">
            {dirs.filter(dir => dir.path.feasible && paths.recommended === dir.key).map(dir => {
              const isSel = selected === dir.key;
              return (
                <button key={dir.key}
                  onClick={() => handleSelectDirection(dir.key)}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded border text-left text-[11px] transition-colors ${
                    isSel ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-400 font-semibold'
                    : 'bg-orange-50 border-orange-400 hover:bg-orange-100'
                  }`}>
                  <span className="flex-1">
                    <span className="font-semibold">{dir.label}</span>
                    <span className="ml-2 text-gray-600">{dir.desc} (Δ{dir.path.totalChange})</span>
                  </span>
                  <span className="text-orange-600 font-bold text-[10px]">★추천</span>
                </button>
              );
            })}
          </div>

          {/* 선택된 방향의 입력 폼 — 항상 양쪽 표시 */}
          {selected && (
            <div className="border-t pt-2">
              {/* 예방관리 개선안 */}
              <div className="mb-1 p-1.5 rounded" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <div className="truncate" title={pcClean}><span className="font-semibold text-green-700">현재 PC:</span> {pcClean || <span className="text-gray-400">미입력</span>}</div>
              </div>
              <label className="text-[10px] font-semibold text-green-700 mb-0.5 block">🛡️ 예방관리 개선안</label>
              {needsO ? (
                <textarea value={textO}
                  onChange={e => { setTextO(e.target.value); setIsDefaultO(false); }}
                  onFocus={() => { if (isDefaultO) { setTextO(''); setIsDefaultO(false); } }}
                  className="w-full border rounded p-2 text-xs resize-none focus:outline-none focus:ring-2 mb-2"
                  style={{ height: '48px', borderColor: '#86efac', color: isDefaultO ? '#9ca3af' : '#111', fontStyle: isDefaultO ? 'italic' : 'normal' }}
                  autoFocus />
              ) : (
                <div className="w-full border rounded p-2 text-xs mb-2"
                  style={{ height: '32px', background: '#f3f4f6', borderColor: '#d1d5db', color: '#9ca3af', fontStyle: 'italic' }}>
                  N/A (해당 방향 개선 불필요)
                </div>
              )}

              {/* 검출관리 개선안 */}
              <div className="mb-1 p-1.5 rounded" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <div className="truncate" title={dcClean}><span className="font-semibold text-blue-700">현재 DC:</span> {dcClean || <span className="text-gray-400">미입력</span>}</div>
              </div>
              <label className="text-[10px] font-semibold text-blue-700 mb-0.5 block">🔍 검출관리 개선안</label>
              {needsD ? (
                <textarea value={textD}
                  onChange={e => { setTextD(e.target.value); setIsDefaultD(false); }}
                  onFocus={() => { if (isDefaultD) { setTextD(''); setIsDefaultD(false); } }}
                  className="w-full border rounded p-2 text-xs resize-none focus:outline-none focus:ring-2"
                  style={{ height: '48px', borderColor: '#93c5fd', color: isDefaultD ? '#9ca3af' : '#111', fontStyle: isDefaultD ? 'italic' : 'normal' }}
                  autoFocus={selected === 'D_ONLY'} />
              ) : (
                <div className="w-full border rounded p-2 text-xs"
                  style={{ height: '32px', background: '#f3f4f6', borderColor: '#d1d5db', color: '#9ca3af', fontStyle: 'italic' }}>
                  N/A (해당 방향 개선 불필요)
                </div>
              )}

              <div className="flex justify-end gap-2 mt-2">
                <button onClick={handleClose} className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">취소<span className="text-[8px] opacity-70 ml-0.5">(Cancel)</span></button>
                <button onClick={handleSave} disabled={!canSave}
                  className="px-3 py-1 text-xs text-white rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50">저장<span className="text-[8px] opacity-70 ml-0.5">(Save)</span></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
