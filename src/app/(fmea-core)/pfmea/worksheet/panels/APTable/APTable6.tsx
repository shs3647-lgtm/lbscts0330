// CODEFREEZE
/**
 * APTable6 - 6단계 AP 테이블 (최적화)
 * 
 * 최적화 후 S/O/D 값에 따른 AP(H/M/L) 표시 및 해당 셀의 갯수 표시
 * H 셀 클릭 시 개선 제안 표시
 */

'use client';

import React, { useMemo, useState, lazy, Suspense } from 'react';
import { useLocale } from '@/lib/locale';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';
import { WorksheetState } from '../../constants';
import { RIGHT_PANEL_WIDTH } from '@/styles/layout';

const CIPManageModal = lazy(() => import('@/components/modals/CIPManageModal'));

// AP 테이블 데이터 (S, O 범위에 따른 D별 AP 결과)
const AP_TABLE_DATA: { s: string; sMin: number; sMax: number; o: string; oMin: number; oMax: number; d: ('H' | 'M' | 'L')[] }[] = [
  { s: '9-10', sMin: 9, sMax: 10, o: '8-10', oMin: 8, oMax: 10, d: ['H', 'H', 'H', 'H'] },
  { s: '9-10', sMin: 9, sMax: 10, o: '6-7', oMin: 6, oMax: 7, d: ['H', 'H', 'H', 'H'] },
  { s: '9-10', sMin: 9, sMax: 10, o: '4-5', oMin: 4, oMax: 5, d: ['H', 'H', 'H', 'M'] },
  { s: '9-10', sMin: 9, sMax: 10, o: '2-3', oMin: 2, oMax: 3, d: ['H', 'M', 'L', 'L'] },
  { s: '9-10', sMin: 9, sMax: 10, o: '1', oMin: 1, oMax: 1, d: ['L', 'L', 'L', 'L'] },
  { s: '7-8', sMin: 7, sMax: 8, o: '8-10', oMin: 8, oMax: 10, d: ['H', 'H', 'H', 'H'] },
  { s: '7-8', sMin: 7, sMax: 8, o: '6-7', oMin: 6, oMax: 7, d: ['H', 'H', 'H', 'M'] },
  { s: '7-8', sMin: 7, sMax: 8, o: '4-5', oMin: 4, oMax: 5, d: ['H', 'M', 'M', 'M'] },
  { s: '7-8', sMin: 7, sMax: 8, o: '2-3', oMin: 2, oMax: 3, d: ['M', 'M', 'L', 'L'] },
  { s: '7-8', sMin: 7, sMax: 8, o: '1', oMin: 1, oMax: 1, d: ['L', 'L', 'L', 'L'] },
  { s: '4-6', sMin: 4, sMax: 6, o: '8-10', oMin: 8, oMax: 10, d: ['H', 'H', 'M', 'M'] },
  { s: '4-6', sMin: 4, sMax: 6, o: '6-7', oMin: 6, oMax: 7, d: ['M', 'M', 'M', 'L'] },
  { s: '4-6', sMin: 4, sMax: 6, o: '4-5', oMin: 4, oMax: 5, d: ['M', 'L', 'L', 'L'] },
  { s: '4-6', sMin: 4, sMax: 6, o: '2-3', oMin: 2, oMax: 3, d: ['L', 'L', 'L', 'L'] },
  { s: '4-6', sMin: 4, sMax: 6, o: '1', oMin: 1, oMax: 1, d: ['L', 'L', 'L', 'L'] },
  { s: '2-3', sMin: 2, sMax: 3, o: '8-10', oMin: 8, oMax: 10, d: ['M', 'M', 'L', 'L'] },
  { s: '2-3', sMin: 2, sMax: 3, o: '6-7', oMin: 6, oMax: 7, d: ['L', 'L', 'L', 'L'] },
  { s: '2-3', sMin: 2, sMax: 3, o: '4-5', oMin: 4, oMax: 5, d: ['L', 'L', 'L', 'L'] },
  { s: '2-3', sMin: 2, sMax: 3, o: '2-3', oMin: 2, oMax: 3, d: ['L', 'L', 'L', 'L'] },
  { s: '2-3', sMin: 2, sMax: 3, o: '1', oMin: 1, oMax: 1, d: ['L', 'L', 'L', 'L'] },
];

// D 범위 헤더
const D_HEADERS = [
  { label: '7-10', min: 7, max: 10 },
  { label: '5-6', min: 5, max: 6 },
  { label: '2-4', min: 2, max: 4 },
  { label: '1', min: 1, max: 1 },
];

// AP 색상
const AP_COLORS: Record<'H' | 'M' | 'L', { bg: string; text: string }> = {
  H: { bg: '#f87171', text: '#7f1d1d' },
  M: { bg: '#fde047', text: '#713f12' },
  L: { bg: '#86efac', text: '#14532d' },
};

interface APTable6Props {
  state: WorksheetState;
  setState?: React.Dispatch<React.SetStateAction<WorksheetState>>;
}

interface OptItem {
  idx: number;
  uniqueKey: string;   // ★ riskData 키 식별자 (숫자 또는 fmId-fcId 복합키)
  s: number;
  o: number;
  d: number;
  ap: 'H' | 'M' | 'L';
  action?: string;
  failureMode?: string; // ★ 고장형태명
}

function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/** AP 계산 함수 */
function calcAP(s: number, o: number, d: number): 'H' | 'M' | 'L' {
  for (const row of AP_TABLE_DATA) {
    if (isInRange(s, row.sMin, row.sMax) && isInRange(o, row.oMin, row.oMax)) {
      for (let i = 0; i < D_HEADERS.length; i++) {
        if (isInRange(d, D_HEADERS[i].min, D_HEADERS[i].max)) {
          return row.d[i];
        }
      }
    }
  }
  return 'L';
}

/** 최적 개선 경로 계산 결과 */
interface OptimalPath {
  type: 'O_ONLY' | 'D_ONLY' | 'BOTH';
  targetO: number;
  targetD: number;
  changeO: number;
  changeD: number;
  totalChange: number;
}

/** L로 낮추기 위한 최적 경로 계산 */
function getOptimalPath(s: number, o: number, d: number): OptimalPath {
  let best: OptimalPath = { type: 'BOTH', targetO: 1, targetD: 1, changeO: o - 1, changeD: d - 1, totalChange: Infinity };

  // 1) D만 개선 (O 고정)
  for (let newD = d; newD >= 1; newD--) {
    if (calcAP(s, o, newD) === 'L') {
      const change = d - newD;
      if (change < best.totalChange) {
        best = { type: 'D_ONLY', targetO: o, targetD: newD, changeO: 0, changeD: change, totalChange: change };
      }
      break;
    }
  }

  // 2) O만 개선 (D 고정)
  for (let newO = o; newO >= 1; newO--) {
    if (calcAP(s, newO, d) === 'L') {
      const change = o - newO;
      if (change < best.totalChange) {
        best = { type: 'O_ONLY', targetO: newO, targetD: d, changeO: change, changeD: 0, totalChange: change };
      }
      break;
    }
  }

  // 3) D & O 둘 다 개선
  for (let newO = o; newO >= 1; newO--) {
    for (let newD = d; newD >= 1; newD--) {
      if (calcAP(s, newO, newD) === 'L') {
        const change = (o - newO) + (d - newD);
        if (change < best.totalChange) {
          best = { type: 'BOTH', targetO: newO, targetD: newD, changeO: o - newO, changeD: d - newD, totalChange: change };
        }
        break;
      }
    }
  }

  return best;
}


export default function APTable6({ state, setState }: APTable6Props) {
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [improvedItems, setImprovedItems] = useState<Set<string>>(new Set());
  const [inputModal, setInputModal] = useState<{ idx: number; uniqueKey: string; type: 'O' | 'D'; target: number } | null>(null);

  // Floating window hook
  const { pos: inputPos, size: inputSize, onDragStart: inputDragStart, onResizeStart: inputResizeStart } = useFloatingWindow({ isOpen: !!inputModal, width: 320, height: 300 });
  const [inputText, setInputText] = useState('');

  // CIP modal state
  const [cipModalOpen, setCipModalOpen] = useState(false);
  const [cipPrefill, setCipPrefill] = useState<{
    uniqueKey: string; apLevel: string; failureMode: string;
    cause?: string; s?: number; o?: number; d?: number;
  } | undefined>(undefined);

  // riskData에서 모든 최적화 항목 추출
  // ★★★ 2026-03-02: 숫자 인덱스 + UUID 복합키(fmId-fcId) 모두 매칭 ★★★
  const optItems = useMemo(() => {
    const items: OptItem[] = [];
    const riskData = state.riskData || {};

    // ★ opt-{uniqueKey}-(S|O|D) 패턴의 모든 uniqueKey 추출
    const allUniqueKeys = new Set<string>();
    Object.keys(riskData).forEach(key => {
      if (!key.startsWith('opt-')) return;
      const lastDash = key.lastIndexOf('-');
      if (lastDash <= 3) return;
      const suffix = key.substring(lastDash + 1);
      if (suffix === 'S' || suffix === 'O' || suffix === 'D') {
        allUniqueKeys.add(key.substring(4, lastDash));
      }
    });

    // ★ 심각도: riskData + failureScopes + failureLinks에서 최대값
    let maxSeverity = 0;
    Object.keys(riskData).forEach(key => {
      if (key.startsWith('S-fe-') || key.startsWith('S-fm-') || (key.startsWith('risk-') && key.endsWith('-S'))) {
        const val = Number(riskData[key]) || 0;
        if (val > maxSeverity) maxSeverity = val;
      }
    });
    (state.l1?.failureScopes || []).forEach((fs: any) => {
      const val = Number(fs.severity) || 0;
      if (val > maxSeverity) maxSeverity = val;
    });
    ((state as any).failureLinks || []).forEach((link: any) => {
      const val = Number(link.feSeverity || link.severity) || 0;
      if (val > maxSeverity) maxSeverity = val;
    });

    // ★ 고장형태명 맵 (fmId → name)
    const failureModeMap: Record<string, string> = {};
    ((state as any).failureLinks || []).forEach((link: any) => {
      if (link.fmId && link.fmText) failureModeMap[link.fmId] = link.fmText;
    });
    (state.l2 || []).forEach((proc: any) => {
      (proc.failureModes || []).forEach((fm: any) => {
        if (fm.id && fm.name) failureModeMap[fm.id] = fm.name;
      });
    });

    let idx = 0;
    allUniqueKeys.forEach(uniqueKey => {
      // S: opt → risk → 전역 최대 심각도
      const baseKey = uniqueKey.replace(/#\d+$/, '');
      const s = Number(riskData[`opt-${uniqueKey}-S`])
        || Number(riskData[`risk-${baseKey}-S`])
        || maxSeverity;
      const o = Number(riskData[`opt-${uniqueKey}-O`]) || 0;
      const d = Number(riskData[`opt-${uniqueKey}-D`]) || 0;

      if (s > 0 && o > 0 && d > 0) {
        let ap: 'H' | 'M' | 'L' = 'L';
        AP_TABLE_DATA.forEach(row => {
          if (isInRange(s, row.sMin, row.sMax) && isInRange(o, row.oMin, row.oMax)) {
            D_HEADERS.forEach((dHeader, dIdx) => {
              if (isInRange(d, dHeader.min, dHeader.max)) {
                ap = row.d[dIdx];
              }
            });
          }
        });

        // ★ 고장형태명 추출
        let failureMode = '';
        for (const [fmId, fmName] of Object.entries(failureModeMap)) {
          if (baseKey === fmId || baseKey.startsWith(fmId + '-')) {
            failureMode = fmName;
            break;
          }
        }

        items.push({
          idx: idx++,
          uniqueKey,
          s, o, d, ap,
          action: riskData[`opt-action-${uniqueKey}`] as string,
          failureMode,
        });
      }
    });

    return items;
  }, [state.riskData, state.l1?.failureScopes, (state as any).failureLinks]);

  // 셀별 갯수 계산
  const cellCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    optItems.forEach(item => {
      AP_TABLE_DATA.forEach((row, rowIdx) => {
        if (isInRange(item.s, row.sMin, row.sMax) && isInRange(item.o, row.oMin, row.oMax)) {
          D_HEADERS.forEach((dHeader, dIdx) => {
            if (isInRange(item.d, dHeader.min, dHeader.max)) {
              const key = `${rowIdx}-${dIdx}`;
              counts[key] = (counts[key] || 0) + 1;
            }
          });
        }
      });
    });
    return counts;
  }, [optItems]);

  // 선택된 셀의 항목들
  const selectedItems = useMemo(() => {
    if (!selectedCell) return [];
    const [rowIdx, dIdx] = selectedCell.split('-').map(Number);
    const row = AP_TABLE_DATA[rowIdx];
    if (!row) return [];

    return optItems.filter(item =>
      isInRange(item.s, row.sMin, row.sMax) &&
      isInRange(item.o, row.oMin, row.oMax) &&
      isInRange(item.d, D_HEADERS[dIdx].min, D_HEADERS[dIdx].max)
    );
  }, [selectedCell, optItems]);

  // H, M, L 갯수
  const { hCount, mCount, lCount } = useMemo(() => {
    let h = 0, m = 0, l = 0;
    optItems.forEach(item => {
      if (item.ap === 'H') h++;
      else if (item.ap === 'M') m++;
      else l++;
    });
    return { hCount: h, mCount: m, lCount: l };
  }, [optItems]);

  // 개선 버튼 클릭 시 모달 열기
  const handleImproveClick = (idx: number, type: 'O' | 'D', target: number) => {
    const item = optItems.find(i => i.idx === idx);
    if (item) {
      setInputModal({ idx, uniqueKey: item.uniqueKey, type, target });
      const existingText = (state.riskData || {})[`improvement-opt-${item.uniqueKey}-${type}`] as string || '';
      setInputText(existingText);
    }
  };

  // 개선안 저장
  const handleSaveImprovement = () => {
    if (!inputModal || !setState) return;
    const { uniqueKey, type, target } = inputModal;
    setImprovedItems(prev => new Set([...prev, `${uniqueKey}-${type}`]));

    setState(prev => ({
      ...prev,
      riskData: {
        ...(prev.riskData || {}),
        [`opt-${uniqueKey}-${type}`]: target,
        [`improvement-opt-${uniqueKey}-${type}`]: inputText,
      }
    }));

    setInputModal(null);
    setInputText('');
  };

  const getSeverityRowSpan = (s: string) => AP_TABLE_DATA.filter(r => r.s === s).length;
  const thStyle = 'border border-[#ccc] p-1 text-[10px] font-semibold';
  const tdStyle = 'border border-[#ccc] p-1 text-center text-[10px]';

  return (
    <div className="flex flex-col h-full" style={{ width: RIGHT_PANEL_WIDTH }}>
      {/* 헤더 */}
      <div className="bg-[#2e7d32] text-white py-2 px-3 text-xs font-bold flex justify-between items-center">
        <span>✅ 6AP 최적화</span>
        <div className="flex items-center gap-2" style={{ marginRight: 24 }}>
          <button
            onClick={() => { setCipPrefill(undefined); setCipModalOpen(true); }}
            className="px-1.5 py-0.5 bg-blue-500 hover:bg-blue-400 text-white text-[9px] font-bold rounded"
          >
            CIP
          </button>
          <span className="text-[10px] font-normal">
            <span className="text-red-300 cursor-pointer hover:underline" onClick={() => setSelectedCell(null)}>H:{hCount}</span>{' '}
            <span className="text-yellow-300">M:{mCount}</span>{' '}
            <span className="text-green-300">L:{lCount}</span>
          </span>
        </div>
      </div>

      {/* 데이터 없음 안내 */}
      {optItems.length === 0 && (
        <div className="bg-yellow-50 text-yellow-700 text-[10px] p-2 text-center">
          ⚠️ 최적화 데이터가 없습니다. All 탭에서 6단계 S/O/D를 입력하세요.
        </div>
      )}

      {/* 선택된 셀의 개선 제안 - H/M/L 모든 항목 */}
      {selectedCell && selectedItems.length > 0 && (
        <div className="bg-green-50 border-b border-green-200 p-1">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold text-green-700">
              {selectedItems[0]?.ap === 'L'
                ? `📋 AP L 항목 (${selectedItems.length}건)`
                : `🔧 H/M→L 최적화 제안 (${selectedItems.length}건)`
              }
            </span>
            <button onClick={() => setSelectedCell(null)} className="text-[9px] px-2 py-0.5 bg-gray-200 rounded hover:bg-gray-300">닫기</button>
          </div>
          {/* 테이블 헤더 (고정) */}
          <table className="w-full border-collapse text-[9px] table-fixed">
            <thead className="bg-green-100">
              <tr>
                <th className="border border-green-200 p-0.5" style={{ width: '30%' }}>항목</th>
                <th className="border border-green-200 p-0.5" style={{ width: '10%' }}>AP</th>
                <th className="border border-green-200 p-0.5" style={{ width: '10%' }}>S:O:D</th>
                <th className="border border-green-200 p-0.5" style={{ width: '20%' }}>예방관리</th>
                <th className="border border-green-200 p-0.5" style={{ width: '20%' }}>검출관리</th>
                <th className="border border-green-200 p-0.5" style={{ width: '10%' }}>CIP</th>
              </tr>
            </thead>
          </table>
          {/* 테이블 본문 (스크롤) */}
          <div className="max-h-[140px] overflow-auto scrollbar-hide">
            <table className="w-full border-collapse text-[9px] table-fixed">
              <tbody>
                {selectedItems.map(item => {
                  const isLow = item.ap === 'L';
                  const path = !isLow ? getOptimalPath(item.s, item.o, item.d) : null;
                  const oImproved = improvedItems.has(`${item.uniqueKey}-O`);
                  const dImproved = improvedItems.has(`${item.uniqueKey}-D`);
                  const oNeeded = path ? (path.type === 'O_ONLY' || path.type === 'BOTH') : false;
                  const dNeeded = path ? (path.type === 'D_ONLY' || path.type === 'BOTH') : false;
                  return (
                    <tr key={item.uniqueKey} className="bg-white hover:bg-green-50">
                      <td className="border border-green-200 p-0.5 text-[9px] truncate" style={{ width: '30%' }} title={item.failureMode || `#${item.idx + 1}`}>{item.failureMode || `#${item.idx + 1}`}</td>
                      <td className="border border-green-200 p-0.5 text-center" style={{ width: '10%' }}>
                        <span className="px-1 py-0 rounded text-[8px] font-bold" style={{ background: AP_COLORS[item.ap].bg, color: AP_COLORS[item.ap].text }}>{item.ap}</span>
                      </td>
                      <td className="border border-green-200 p-0.5 text-center text-gray-500" style={{ width: '10%' }}>{item.s}:{item.o}:{item.d}</td>
                      <td className="border border-green-200 p-0.5" style={{ width: '20%' }}>
                        {oNeeded && path ? (
                          <button
                            onClick={() => handleImproveClick(item.idx, 'O', path.targetO)}
                            disabled={oImproved}
                            className={`w-full py-0.5 rounded text-[8px] font-semibold ${oImproved ? 'bg-green-200 text-green-600' : 'bg-green-500 text-white hover:bg-green-600'}`}
                          >
                            {oImproved ? '✓완료' : `O:${item.o}→${path.targetO}`}
                          </button>
                        ) : (
                          <span className="text-gray-400 text-[8px] block text-center">-</span>
                        )}
                      </td>
                      <td className="border border-green-200 p-0.5" style={{ width: '20%' }}>
                        {dNeeded && path ? (
                          <button
                            onClick={() => handleImproveClick(item.idx, 'D', path.targetD)}
                            disabled={dImproved}
                            className={`w-full py-0.5 rounded text-[8px] font-semibold ${dImproved ? 'bg-blue-200 text-blue-600' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                          >
                            {dImproved ? '✓완료' : `D:${item.d}→${path.targetD}`}
                          </button>
                        ) : (
                          <span className="text-gray-400 text-[8px] block text-center">-</span>
                        )}
                      </td>
                      <td className="border border-green-200 p-0.5 text-center" style={{ width: '10%' }}>
                        <button
                          onClick={() => {
                            setCipPrefill({
                              uniqueKey: item.uniqueKey,
                              apLevel: item.ap,
                              failureMode: item.failureMode || '',
                              s: item.s, o: item.o, d: item.d,
                            });
                            setCipModalOpen(true);
                          }}
                          className="px-1 py-0 bg-blue-500 text-white text-[7px] rounded hover:bg-blue-600 font-bold"
                        >
                          +CIP
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 테이블 */}
      <div className="flex-1 overflow-auto p-2 bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-green-100">
              <th className={thStyle}>S</th>
              <th className={thStyle}>O</th>
              {D_HEADERS.map(d => (
                <th key={d.label} className={thStyle}>D{d.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AP_TABLE_DATA.map((row, rowIdx) => {
              const isFirstOfSeverity = rowIdx === 0 || AP_TABLE_DATA[rowIdx - 1].s !== row.s;
              return (
                <tr key={rowIdx}>
                  {isFirstOfSeverity && (
                    <td
                      rowSpan={getSeverityRowSpan(row.s)}
                      className="border border-[#ccc] p-1 font-bold text-center bg-green-100 text-[11px]"
                      style={{ writingMode: 'vertical-rl' }}
                    >
                      {row.s}
                    </td>
                  )}
                  <td className={`${tdStyle} bg-green-50 font-semibold`}>{row.o}</td>
                  {row.d.map((ap, dIdx) => {
                    const cellKey = `${rowIdx}-${dIdx}`;
                    const count = cellCounts[cellKey] || 0;
                    const isSelected = selectedCell === cellKey;

                    return (
                      <td
                        key={dIdx}
                        className={`${tdStyle} font-bold cursor-pointer hover:opacity-80 ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                        style={{
                          background: AP_COLORS[ap].bg,
                          color: AP_COLORS[ap].text
                        }}
                        title={`${ap}: ${count}건 - 클릭하여 개선관리`}
                        onClick={() => {
                          if (count > 0) {
                            setSelectedCell(isSelected ? null : cellKey);
                          }
                        }}
                      >
                        {count > 0 ? count : ''}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 범례 */}
      <div className="bg-green-50 p-2 text-[10px] flex gap-3 justify-center border-t">
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-red-400 rounded-sm border border-red-500"></span>
          H
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-yellow-300 rounded-sm border border-yellow-400"></span>
          M
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-green-300 rounded-sm border border-green-400"></span>
          L
        </span>
        <span className="text-gray-400">|</span>
        <span className="text-[9px] text-blue-600 font-semibold">셀 클릭 → CIP</span>
      </div>

      {/* 개선안 입력 모달 */}
      {inputModal && (
        <div className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
          style={{ left: inputPos.x, top: inputPos.y, width: inputSize.w, height: inputSize.h }}>
          <div className={`${inputModal.type === 'O' ? 'bg-green-600' : 'bg-blue-600'} text-white px-4 py-3 rounded-t-lg flex items-center justify-between cursor-move`} onMouseDown={inputDragStart}>
            <h3 className="font-bold text-sm">
              {inputModal.type === 'O' ? '🛡️ 예방관리 개선안' : '🔍 검출관리 개선안'}
            </h3>
            <button onClick={() => setInputModal(null)} className="text-white/70 hover:text-white text-xl">✕</button>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            <p className="text-xs text-gray-600 mb-2">
              {(() => {
                const modalItem = optItems.find(i => i.uniqueKey === inputModal.uniqueKey);
                const label = modalItem?.failureMode || `#${inputModal.idx + 1}`;
                return inputModal.type === 'O'
                  ? `[${label}] 발생도(O)를 ${modalItem?.o || '?'}에서 ${inputModal.target}로 낮추기 위한 개선안을 입력하세요.`
                  : `[${label}] 검출도(D)를 ${modalItem?.d || '?'}에서 ${inputModal.target}로 낮추기 위한 개선안을 입력하세요.`;
              })()}
            </p>
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="개선안을 입력하세요..."
              className="w-full border rounded p-2 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setInputModal(null)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
              >
                취소
              </button>
              <button
                onClick={handleSaveImprovement}
                className={`px-3 py-1.5 text-sm text-white rounded ${inputModal.type === 'O' ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'}`}
              >
                저장
              </button>
            </div>
          </div>
          <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={inputResizeStart} title="크기 조절">
            <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 opacity-60">
              <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
        </div>
      )}

      {/* CIP Modal */}
      <Suspense fallback={null}>
        {cipModalOpen && (
          <CIPManageModal
            isOpen={cipModalOpen}
            onClose={() => setCipModalOpen(false)}
            fmeaId={(state as any).fmeaId || ''}
            prefill={cipPrefill}
          />
        )}
      </Suspense>
    </div>
  );
}
