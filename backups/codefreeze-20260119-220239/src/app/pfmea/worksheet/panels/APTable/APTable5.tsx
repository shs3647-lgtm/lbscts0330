// @ts-nocheck
/**
 * APTable5 - 5단계 AP 테이블 (리스크분석)
 * 
 * S/O/D 값에 따른 AP(H/M/L) 표시 및 해당 셀의 갯수 표시
 * H 셀 클릭 시 개선 제안 표시
 */

'use client';

import React, { useMemo, useState } from 'react';
import { WorksheetState } from '../../constants';
import { RIGHT_PANEL_WIDTH } from '@/styles/layout';

// AP 테이블 데이터 (S, O 범위에 따른 D별 AP 결과)
const AP_TABLE_DATA: { s: string; sMin: number; sMax: number; o: string; oMin: number; oMax: number; d: ('H' | 'M' | 'L')[] }[] = [
  { s: '9-10', sMin: 9, sMax: 10, o: '8-10', oMin: 8, oMax: 10, d: ['H', 'H', 'H', 'H'] },
  { s: '9-10', sMin: 9, sMax: 10, o: '6-7', oMin: 6, oMax: 7, d: ['H', 'H', 'H', 'H'] },
  { s: '9-10', sMin: 9, sMax: 10, o: '4-5', oMin: 4, oMax: 5, d: ['H', 'H', 'L', 'L'] },
  { s: '9-10', sMin: 9, sMax: 10, o: '2-3', oMin: 2, oMax: 3, d: ['H', 'M', 'L', 'L'] },
  { s: '9-10', sMin: 9, sMax: 10, o: '1', oMin: 1, oMax: 1, d: ['H', 'L', 'L', 'L'] },
  { s: '7-8', sMin: 7, sMax: 8, o: '8-10', oMin: 8, oMax: 10, d: ['H', 'H', 'H', 'H'] },
  { s: '7-8', sMin: 7, sMax: 8, o: '6-7', oMin: 6, oMax: 7, d: ['H', 'H', 'M', 'H'] },
  { s: '7-8', sMin: 7, sMax: 8, o: '4-5', oMin: 4, oMax: 5, d: ['H', 'M', 'L', 'L'] },
  { s: '7-8', sMin: 7, sMax: 8, o: '2-3', oMin: 2, oMax: 3, d: ['M', 'L', 'L', 'L'] },
  { s: '7-8', sMin: 7, sMax: 8, o: '1', oMin: 1, oMax: 1, d: ['L', 'L', 'L', 'L'] },
  { s: '4-6', sMin: 4, sMax: 6, o: '8-10', oMin: 8, oMax: 10, d: ['H', 'H', 'M', 'L'] },
  { s: '4-6', sMin: 4, sMax: 6, o: '6-7', oMin: 6, oMax: 7, d: ['H', 'M', 'L', 'L'] },
  { s: '4-6', sMin: 4, sMax: 6, o: '4-5', oMin: 4, oMax: 5, d: ['H', 'M', 'L', 'L'] },
  { s: '4-6', sMin: 4, sMax: 6, o: '2-3', oMin: 2, oMax: 3, d: ['M', 'L', 'L', 'L'] },
  { s: '4-6', sMin: 4, sMax: 6, o: '1', oMin: 1, oMax: 1, d: ['L', 'L', 'L', 'L'] },
  { s: '2-3', sMin: 2, sMax: 3, o: '8-10', oMin: 8, oMax: 10, d: ['M', 'L', 'L', 'L'] },
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

interface APTable5Props {
  state: WorksheetState;
  setState?: React.Dispatch<React.SetStateAction<WorksheetState>>;
}

interface RiskItem {
  idx: number;
  s: number;
  o: number;
  d: number;
  ap: 'H' | 'M' | 'L';
  prevention?: string;
  detection?: string;
  failureMode?: string;  // ★ 고장형태명 추가
  uniqueKey?: string;    // ★ FM-FC 키 저장
}

function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/** L로 낮추기 위한 목표 점수 계산 */
function getTargetScore(current: number, type: 'O' | 'D'): number {
  // L을 달성하기 위한 목표 점수 (간단한 로직)
  if (current >= 7) return 3;
  if (current >= 5) return 2;
  if (current >= 3) return 1;
  return 1;
}

export default function APTable5({ state, setState }: APTable5Props) {
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [improvedItems, setImprovedItems] = useState<Set<string>>(new Set());
  
  // riskData에서 모든 리스크 항목 추출
  const riskItems = useMemo(() => {
    const items: RiskItem[] = [];
    const riskData = state.riskData || {};
    
    // ★★★ 근본 원인 수정: 모든 risk-*-O/D 패턴을 찾도록 개선 ★★★
    // 저장 시: risk-{fmId}-{fcId}-O 또는 risk-{숫자}-O 형식
    // 따라서 모든 uniqueKey를 추출해야 함
    const allUniqueKeys = new Set<string>();
    Object.keys(riskData).forEach(key => {
      // 패턴 1: risk-{숫자}-O/D (레거시)
      const numericMatch = key.match(/^risk-(\d+)-(O|D)$/);
      if (numericMatch) {
        allUniqueKeys.add(numericMatch[1]);
        return;
      }
      // 패턴 2: risk-{fmId}-{fcId}-O/D (새 형식)
      const compositeMatch = key.match(/^risk-(.+)-(O|D)$/);
      if (compositeMatch) {
        allUniqueKeys.add(compositeMatch[1]);
      }
    });
    
    console.log('[APTable5] 추출된 uniqueKey 수:', allUniqueKeys.size);
    console.log('[APTable5] uniqueKeys 샘플:', Array.from(allUniqueKeys).slice(0, 5));
    
    // ★★★ 심각도 계산 개선: riskData + l1.failureScopes + failureLinks 모두 확인 ★★★
    let maxSeverity = 0;
    
    // 1. riskData에서 S-fe-* 패턴 찾기
    Object.keys(riskData).forEach(key => {
      if (key.startsWith('S-fe-') || key.startsWith('S-fm-') || key.startsWith('S-')) {
        const val = Number(riskData[key]) || 0;
        if (val > maxSeverity) maxSeverity = val;
      }
    });
    
    // 2. l1.failureScopes에서 심각도 찾기
    (state.l1?.failureScopes || []).forEach((fs: any) => {
      const val = Number(fs.severity) || 0;
      if (val > maxSeverity) maxSeverity = val;
    });
    
    // 3. failureLinks에서 심각도 찾기
    ((state as any).failureLinks || []).forEach((link: any) => {
      const val = Number(link.feSeverity || link.severity) || 0;
      if (val > maxSeverity) maxSeverity = val;
    });
    
    console.log('[APTable5] 심각도 계산:', { maxSeverity, uniqueKeysCount: allUniqueKeys.size });
    
    // ★ 고장형태명 맵 생성 (fmId -> failureMode)
    const failureModeMap: Record<string, string> = {};
    
    // failureLinks에서 고장형태명 가져오기
    ((state as any).failureLinks || []).forEach((link: any) => {
      if (link.fmId && link.fmText) {
        failureModeMap[link.fmId] = link.fmText;
      }
    });
    
    // l2에서도 고장형태명 가져오기
    (state.l2 || []).forEach((proc: any) => {
      (proc.failureModes || []).forEach((fm: any) => {
        if (fm.id && fm.name) {
          failureModeMap[fm.id] = fm.name;
        }
      });
    });
    
    let idx = 0;
    allUniqueKeys.forEach(uniqueKey => {
      const o = Number(riskData[`risk-${uniqueKey}-O`]) || 0;
      const d = Number(riskData[`risk-${uniqueKey}-D`]) || 0;
      const s = maxSeverity;
      
      // ★ 고장형태명 추출 (uniqueKey가 fmId-fcId 형식인 경우)
      let failureMode = '';
      const parts = uniqueKey.split('-');
      if (parts.length >= 1) {
        const fmId = parts[0];  // FM ID 추출
        failureMode = failureModeMap[fmId] || failureModeMap[uniqueKey] || '';
      }
      
      console.log(`[APTable5] uniqueKey=${uniqueKey}: S=${s}, O=${o}, D=${d}, FM=${failureMode}`);
      
      if (s > 0 && o > 0 && d > 0) {
        // AP 계산
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
        
        items.push({
          idx: idx++,
          s,
          o,
          d,
          ap,
          prevention: riskData[`prevention-${uniqueKey}`] as string,
          detection: riskData[`detection-${uniqueKey}`] as string,
          failureMode,  // ★ 고장형태명 추가
          uniqueKey,    // ★ 키 저장
        });
      }
    });
    
    console.log('[APTable5] 리스크 항목:', items.length, '개');
    return items;
  }, [state.riskData, state.l1?.failureScopes, (state as any).failureLinks]);
  
  // 셀별 갯수 계산
  const cellCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    riskItems.forEach(item => {
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
  }, [riskItems]);
  
  // 선택된 셀의 항목들
  const selectedItems = useMemo(() => {
    if (!selectedCell) return [];
    const [rowIdx, dIdx] = selectedCell.split('-').map(Number);
    const row = AP_TABLE_DATA[rowIdx];
    if (!row) return [];
    
    return riskItems.filter(item => 
      isInRange(item.s, row.sMin, row.sMax) && 
      isInRange(item.o, row.oMin, row.oMax) &&
      isInRange(item.d, D_HEADERS[dIdx].min, D_HEADERS[dIdx].max)
    );
  }, [selectedCell, riskItems]);
  
  // H, M, L 갯수
  const { hCount, mCount, lCount } = useMemo(() => {
    let h = 0, m = 0, l = 0;
    riskItems.forEach(item => {
      if (item.ap === 'H') h++;
      else if (item.ap === 'M') m++;
      else l++;
    });
    return { hCount: h, mCount: m, lCount: l };
  }, [riskItems]);
  
  // 개선 적용
  const handleImprove = (idx: number, type: 'O' | 'D') => {
    const key = `${idx}-${type}`;
    setImprovedItems(prev => new Set([...prev, key]));
    
    // 실제 점수 변경 (setState가 있는 경우)
    if (setState) {
      const item = riskItems.find(i => i.idx === idx);
      if (item) {
        const current = type === 'O' ? item.o : item.d;
        const target = getTargetScore(current, type);
        setState(prev => ({
          ...prev,
          riskData: {
            ...(prev.riskData || {}),
            [`risk-${idx}-${type}`]: target,
          }
        }));
      }
    }
  };
  
  const getSeverityRowSpan = (s: string) => AP_TABLE_DATA.filter(r => r.s === s).length;
  const thStyle = 'border border-[#ccc] p-1 text-[10px] font-semibold';
  const tdStyle = 'border border-[#ccc] p-1 text-center text-[10px]';
  
  return (
    <div className="flex flex-col h-full" style={{ width: RIGHT_PANEL_WIDTH }}>
      {/* 헤더 */}
      <div className="bg-[#1e3a5f] text-white py-2 px-3 text-xs font-bold flex justify-between items-center">
        <span>📊 5AP 리스크분석</span>
        <span className="text-[10px] font-normal">
          <span className="text-red-300 cursor-pointer hover:underline" onClick={() => setSelectedCell(null)}>H:{hCount}</span>{' '}
          <span className="text-yellow-300">M:{mCount}</span>{' '}
          <span className="text-green-300">L:{lCount}</span>
        </span>
      </div>
      
      {/* 데이터 없음 안내 */}
      {riskItems.length === 0 && (
        <div className="bg-yellow-50 text-yellow-700 text-[10px] p-2 text-center">
          ⚠️ 리스크 데이터가 없습니다. All 탭에서 S/O/D를 입력하세요.
        </div>
      )}
      
      {/* 선택된 H 셀의 개선 제안 */}
      {selectedCell && selectedItems.length > 0 && (
        <div className="bg-orange-50 border-b border-orange-200 p-2 max-h-[200px] overflow-auto">
          <div className="text-[11px] font-bold text-orange-700 mb-2">
            🔧 H→L 개선 제안 ({selectedItems.length}건)
          </div>
          {selectedItems.map(item => {
            const oImproved = improvedItems.has(`${item.idx}-O`);
            const dImproved = improvedItems.has(`${item.idx}-D`);
            const targetO = getTargetScore(item.o, 'O');
            const targetD = getTargetScore(item.d, 'D');
            
            return (
              <div key={item.idx} className="bg-white rounded p-1.5 mb-1 text-[10px] border border-orange-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-[#1565c0]" title={item.failureMode || `항목 #${item.idx + 1}`}>
                    {item.failureMode ? (item.failureMode.length > 20 ? item.failureMode.slice(0, 20) + '...' : item.failureMode) : `항목 #${item.idx + 1}`}
                  </span>
                  <span className="text-gray-500 shrink-0">S:{item.s} O:{item.o} D:{item.d}</span>
                </div>
                <div className="flex gap-2">
                  {/* 예방관리 개선 */}
                  <button
                    onClick={() => handleImprove(item.idx, 'O')}
                    disabled={oImproved}
                    className={`flex-1 py-1 px-2 rounded text-[9px] font-semibold transition-all ${
                      oImproved 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-orange-400 text-white hover:bg-orange-500'
                    }`}
                  >
                    {oImproved ? '✓ 예방개선 완료' : `예방관리 O:${item.o}→${targetO}`}
                  </button>
                  {/* 검출관리 개선 */}
                  <button
                    onClick={() => handleImprove(item.idx, 'D')}
                    disabled={dImproved}
                    className={`flex-1 py-1 px-2 rounded text-[9px] font-semibold transition-all ${
                      dImproved 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-orange-400 text-white hover:bg-orange-500'
                    }`}
                  >
                    {dImproved ? '✓ 검출개선 완료' : `검출관리 D:${item.d}→${targetD}`}
                  </button>
                </div>
              </div>
            );
          })}
          <button 
            onClick={() => setSelectedCell(null)}
            className="w-full mt-1 py-1 bg-gray-200 text-gray-700 rounded text-[10px] hover:bg-gray-300"
          >
            닫기
          </button>
        </div>
      )}
      
      {/* 테이블 */}
      <div className="flex-1 overflow-auto p-2 bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className={thStyle}>S</th>
              <th className={thStyle}>O</th>
              {D_HEADERS.map(d => (
                <th key={d.label} className={thStyle}>D<br/>{d.label}</th>
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
                      className="border border-[#ccc] p-1 font-bold text-center bg-blue-100 text-[11px]"
                      style={{ writingMode: 'vertical-rl' }}
                    >
                      {row.s}
                    </td>
                  )}
                  <td className={`${tdStyle} bg-gray-100 font-semibold`}>{row.o}</td>
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
                        title={`${ap}: ${count}건 - 클릭하여 상세 보기`}
                        onClick={() => {
                          if (count > 0 && ap === 'H') {
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
      <div className="bg-slate-100 p-2 text-[10px] flex gap-3 justify-center border-t">
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-red-400 rounded-sm border border-red-500"></span>
          H (클릭)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-yellow-300 rounded-sm border border-yellow-400"></span>
          M
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-green-300 rounded-sm border border-green-400"></span>
          L
        </span>
      </div>
    </div>
  );
}
