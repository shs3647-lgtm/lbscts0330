// CODEFREEZE
/**
 * APTable5 - 5단계 AP 테이블 (리스크분석)
 * 
 * S/O/D 값에 따른 AP(H/M/L) 표시 및 해당 셀의 갯수 표시
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

interface AllPaths {
  oOnly: ImprovePath;
  dOnly: ImprovePath;
  both: ImprovePath;
  recommended: ImproveDirection;
  best: ImprovePath;
}

function getAllPaths(s: number, o: number, d: number): AllPaths {
  const infeasible = (): ImprovePath => ({
    targetO: o, targetD: d, changeO: 0, changeD: 0, totalChange: Infinity, feasible: false,
  });

  let oOnly = infeasible();
  for (let newO = o - 1; newO >= MIN_TARGET; newO--) {
    if (calcAP(s, newO, d) === 'L') {
      oOnly = { targetO: newO, targetD: d, changeO: o - newO, changeD: 0, totalChange: o - newO, feasible: true };
      break;
    }
  }

  let dOnly = infeasible();
  for (let newD = d - 1; newD >= MIN_TARGET; newD--) {
    if (calcAP(s, o, newD) === 'L') {
      dOnly = { targetO: o, targetD: newD, changeO: 0, changeD: d - newD, totalChange: d - newD, feasible: true };
      break;
    }
  }

  let both = infeasible();
  let bestBothTotal = Infinity;
  for (let newO = o - 1; newO >= MIN_TARGET; newO--) {
    const minPossibleTotal = (o - newO) + 1;
    if (minPossibleTotal >= bestBothTotal) continue;
    for (let newD = d - 1; newD >= MIN_TARGET; newD--) {
      if (calcAP(s, newO, newD) === 'L') {
        const total = (o - newO) + (d - newD);
        if (total < bestBothTotal ||
            (total === bestBothTotal && (o - newO) < both.changeO)) {
          bestBothTotal = total;
          both = { targetO: newO, targetD: newD, changeO: o - newO, changeD: d - newD, totalChange: total, feasible: true };
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

  const recommended = feasible.length > 0 ? feasible[0].key : 'BOTH';
  const best = feasible.length > 0 ? feasible[0].path : infeasible();

  return { oOnly, dOnly, both, recommended, best };
}

interface OptimalPath {
  type: ImproveDirection;
  targetO: number;
  targetD: number;
  changeO: number;
  changeD: number;
  totalChange: number;
}

function getOptimalPath(s: number, o: number, d: number): OptimalPath {
  const paths = getAllPaths(s, o, d);
  return {
    type: paths.recommended,
    targetO: paths.best.targetO,
    targetD: paths.best.targetD,
    changeO: paths.best.changeO,
    changeD: paths.best.changeD,
    totalChange: paths.best.totalChange,
  };
}

export default function APTable5({ state, setState }: APTable5Props) {
  const { locale, t } = useLocale();
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [improvedItems, setImprovedItems] = useState<Set<string>>(new Set());
  const [inputModal, setInputModal] = useState<{
    idx: number; direction: ImproveDirection; targetO: number; targetD: number;
  } | null>(null);

  const { pos: inputPos, size: inputSize, onDragStart: inputDragStart, onResizeStart: inputResizeStart } = useFloatingWindow({ isOpen: !!inputModal, width: 420, height: 400 });
  const [inputText, setInputText] = useState('');
  const [inputTextD, setInputTextD] = useState('');

  // CIP modal state
  const [cipModalOpen, setCipModalOpen] = useState(false);
  const [cipPrefill, setCipPrefill] = useState<{
    uniqueKey: string; apLevel: string; failureMode: string;
    cause?: string; s?: number; o?: number; d?: number;
    currentPC?: string; currentDC?: string;
  } | undefined>(undefined);

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
      // TODO: 각 FM-FC별 개별 심각도 매핑 필요 (현재는 전체 최대 심각도를 공통 적용)
      const s = maxSeverity;

      // ★ 고장형태명 추출 (UUID 안전 파싱 - failureModeMap 키로 prefix 매칭)
      let failureMode = '';
      for (const [fmId, fmName] of Object.entries(failureModeMap)) {
        if (uniqueKey === fmId || uniqueKey.startsWith(fmId + '-')) {
          failureMode = fmName;
          break;
        }
      }

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

  // ★★★ 2026-02-19: H/M 항목의 개선 목표 셀 계산 (녹색 점 표시용) ★★★
  const targetCells = useMemo(() => {
    const targets: Record<string, number> = {}; // cellKey → 목표 항목 수
    riskItems.forEach(item => {
      if (item.ap !== 'H' && item.ap !== 'M') return;
      const path = getOptimalPath(item.s, item.o, item.d);
      // 목표 위치를 AP 테이블 셀로 매핑
      AP_TABLE_DATA.forEach((row, rowIdx) => {
        if (isInRange(item.s, row.sMin, row.sMax) && isInRange(path.targetO, row.oMin, row.oMax)) {
          D_HEADERS.forEach((dH, dIdx) => {
            if (isInRange(path.targetD, dH.min, dH.max)) {
              const key = `${rowIdx}-${dIdx}`;
              targets[key] = (targets[key] || 0) + 1;
            }
          });
        }
      });
    });
    return targets;
  }, [riskItems]);

  const findSuggestion = (idx: number, type: 'O' | 'D', target: number): string => {
    const riskData = state.riskData || {};
    for (const otherItem of riskItems) {
      if (otherItem.idx === idx || (otherItem.ap !== 'H' && otherItem.ap !== 'M')) continue;
      const otherText = riskData[`improvement-${otherItem.idx}-${type}`] as string || '';
      if (otherText) {
        const otherPaths = getAllPaths(otherItem.s, otherItem.o, otherItem.d);
        const otherTarget = type === 'O' ? otherPaths.best.targetO : otherPaths.best.targetD;
        if (otherTarget === target) return otherText;
      }
    }
    return '';
  };

  const handleImproveClick = (idx: number, direction: ImproveDirection, targetO: number, targetD: number) => {
    const item = riskItems.find(i => i.idx === idx);
    if (!item) return;
    setInputModal({ idx, direction, targetO, targetD });
    const riskData = state.riskData || {};
    const existO = riskData[`improvement-${idx}-O`] as string || '';
    const existD = riskData[`improvement-${idx}-D`] as string || '';
    if (direction === 'O_ONLY') {
      setInputText(existO || findSuggestion(idx, 'O', targetO));
      setInputTextD('');
    } else if (direction === 'D_ONLY') {
      setInputText(existD || findSuggestion(idx, 'D', targetD));
      setInputTextD('');
    } else {
      setInputText(existO || findSuggestion(idx, 'O', targetO));
      setInputTextD(existD || findSuggestion(idx, 'D', targetD));
    }
  };

  const handleSaveImprovement = () => {
    if (!inputModal || !setState) return;
    const { idx, direction } = inputModal;
    const item = riskItems.find(i => i.idx === idx);
    const uniqueKey = item?.uniqueKey || String(idx);
    const updates: Record<string, string | number> = {};

    if (direction === 'O_ONLY') {
      setImprovedItems(prev => new Set([...prev, `${idx}-O`]));
      updates[`improvement-${idx}-O`] = inputText;
      updates[`prevention-opt-${uniqueKey}`] = inputText;
    } else if (direction === 'D_ONLY') {
      setImprovedItems(prev => new Set([...prev, `${idx}-D`]));
      updates[`improvement-${idx}-D`] = inputText;
      updates[`detection-opt-${uniqueKey}`] = inputText;
    } else {
      setImprovedItems(prev => new Set([...prev, `${idx}-O`, `${idx}-D`]));
      updates[`improvement-${idx}-O`] = inputText;
      updates[`prevention-opt-${uniqueKey}`] = inputText;
      updates[`improvement-${idx}-D`] = inputTextD;
      updates[`detection-opt-${uniqueKey}`] = inputTextD;
    }

    setState(prev => ({ ...prev, riskData: { ...(prev.riskData || {}), ...updates } }));
    setInputModal(null);
    setInputText('');
    setInputTextD('');
  };

  const getSeverityRowSpan = (s: string) => AP_TABLE_DATA.filter(r => r.s === s).length;
  const thStyle = 'border border-[#ccc] p-1 text-[10px] font-semibold';
  const tdStyle = 'border border-[#ccc] p-1 text-center text-[10px]';

  return (
    <div className="flex flex-col h-full" style={{ width: RIGHT_PANEL_WIDTH }}>
      {/* 헤더 */}
      <div className="bg-[#1e3a5f] text-white py-2 px-3 text-xs font-bold flex justify-between items-center">
        <span>📊 {t('5AP 리스크분석')}</span>
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
      {riskItems.length === 0 && (
        <div className="bg-yellow-50 text-yellow-700 text-[10px] p-2 text-center">
          {t('리스크 데이터가 없습니다. All 탭에서 S/O/D를 입력하세요.')}
        </div>
      )}

      {/* 선택된 셀의 개선 제안 - H/M/L 모든 항목 */}
      {selectedCell && selectedItems.length > 0 && (
        <div className="bg-orange-50 border-b border-orange-200 p-1">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold text-orange-700">
              {selectedItems[0]?.ap === 'L'
                ? `📋 ${t('AP L 항목')} (${selectedItems.length}${locale === 'en' ? '' : '건'})`
                : `🔧 ${t('H/M→L 개선 방향')} (${selectedItems.length}${locale === 'en' ? '' : '건'})`
              }
            </span>
            <button onClick={() => setSelectedCell(null)} className="text-[9px] px-2 py-0.5 bg-gray-200 rounded hover:bg-gray-300">{t('닫기')}</button>
          </div>
          <div className="max-h-[200px] overflow-auto scrollbar-hide">
            {selectedItems.map(item => {
              const isLow = item.ap === 'L';
              const paths = !isLow ? getAllPaths(item.s, item.o, item.d) : null;
              const dirs = paths ? [
                { key: 'O_ONLY' as ImproveDirection, label: t('① O개선'), path: paths.oOnly,
                  desc: `O:${item.o}→${paths.oOnly.targetO}` },
                { key: 'D_ONLY' as ImproveDirection, label: t('② D개선'), path: paths.dOnly,
                  desc: `D:${item.d}→${paths.dOnly.targetD}` },
                { key: 'BOTH' as ImproveDirection, label: t('③ O+D'), path: paths.both,
                  desc: `O:${item.o}→${paths.both.targetO} D:${item.d}→${paths.both.targetD}` },
              ] : [];
              return (
                <div key={item.idx} className="border border-orange-200 rounded mb-1 bg-white p-1">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="px-1 py-0 rounded text-[8px] font-bold" style={{ background: AP_COLORS[item.ap].bg, color: AP_COLORS[item.ap].text }}>{item.ap}</span>
                    <span className="font-semibold text-[9px] truncate flex-1" title={item.failureMode || `#${item.idx + 1}`}>
                      {item.failureMode || `#${item.idx + 1}`}
                    </span>
                    <span className="text-gray-500 text-[8px] flex-shrink-0">S{item.s} O{item.o} D{item.d}</span>
                    <button
                      onClick={() => {
                        setCipPrefill({
                          uniqueKey: item.uniqueKey || String(item.idx),
                          apLevel: item.ap,
                          failureMode: item.failureMode || '',
                          s: item.s, o: item.o, d: item.d,
                          currentPC: item.prevention, currentDC: item.detection,
                        });
                        setCipModalOpen(true);
                      }}
                      className="px-1 py-0 bg-blue-500 text-white text-[7px] rounded hover:bg-blue-600 font-bold flex-shrink-0"
                    >
                      +CIP
                    </button>
                  </div>
                  {/* H/M: show improvement directions */}
                  {!isLow && paths && (
                    <div className="flex flex-col gap-0.5">
                      {dirs.filter(dir => dir.path.feasible && paths.recommended === dir.key).map(dir => {
                        const done = dir.key === 'BOTH'
                          ? improvedItems.has(`${item.idx}-O`) && improvedItems.has(`${item.idx}-D`)
                          : improvedItems.has(`${item.idx}-${dir.key === 'O_ONLY' ? 'O' : 'D'}`);
                        return (
                          <div key={dir.key} className="flex items-center gap-1">
                            <span className="text-[8px] w-[42px] flex-shrink-0 text-gray-600 font-medium">{dir.label}</span>
                            <button
                              onClick={() => handleImproveClick(item.idx, dir.key, dir.path.targetO, dir.path.targetD)}
                              disabled={done}
                              className={`flex-1 py-0.5 rounded text-[8px] font-semibold text-left px-1 ${
                                done ? 'bg-green-100 text-green-600'
                                : 'bg-orange-500 text-white hover:bg-orange-600'
                              }`}
                            >
                              {done ? (locale === 'en' ? 'Done' : '✓ 완료') : `${dir.desc} (Δ${dir.path.totalChange}) ${locale === 'en' ? 'Rec.' : '★추천'}`}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 테이블 */}
      <div className="flex-1 overflow-auto p-0 bg-white">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-100">
              <th className={thStyle} style={{ background: '#f1f5f9' }}>S</th>
              <th className={thStyle} style={{ background: '#f1f5f9' }}>O</th>
              {D_HEADERS.map(d => (
                <th key={d.label} className={thStyle} style={{ background: '#f1f5f9' }}>D{d.label}</th>
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
                    const isTarget = (targetCells[cellKey] || 0) > 0;
                    // ★ H/M 셀에 개선 방향 화살표 계산
                    let arrow = '';
                    if (count > 0 && (ap === 'H' || ap === 'M')) {
                      // 이 셀의 항목들의 평균 개선 방향 결정
                      const cellItems = riskItems.filter(item =>
                        isInRange(item.s, row.sMin, row.sMax) &&
                        isInRange(item.o, row.oMin, row.oMax) &&
                        isInRange(item.d, D_HEADERS[dIdx].min, D_HEADERS[dIdx].max) &&
                        (item.ap === 'H' || item.ap === 'M')
                      );
                      if (cellItems.length > 0) {
                        const path = getOptimalPath(cellItems[0].s, cellItems[0].o, cellItems[0].d);
                        const needO = path.changeO > 0;
                        const needD = path.changeD > 0;
                        if (needO && needD) arrow = '↘';
                        else if (needD) arrow = '→';
                        else if (needO) arrow = '↓';
                      }
                    }

                    return (
                      <td
                        key={dIdx}
                        className={`${tdStyle} font-bold cursor-pointer hover:opacity-80 ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                        style={{
                          background: isTarget ? undefined : AP_COLORS[ap].bg,
                          color: AP_COLORS[ap].text,
                          position: 'relative',
                          ...(isTarget ? { backgroundImage: `radial-gradient(circle at center, #86efac 40%, ${AP_COLORS[ap].bg} 40%)` } : {}),
                        }}
                        title={locale === 'en'
                          ? `${ap}: ${count}${count > 0 ? ' - Click to view/manage' : ''}${isTarget ? ` | Target ${targetCells[cellKey]}` : ''}`
                          : `${ap}: ${count}건${count > 0 ? ' - 클릭하여 개선관리' : ''}${isTarget ? ` | 개선 목표 ${targetCells[cellKey]}건` : ''}`}
                        onClick={() => {
                          if (count > 0) {
                            setSelectedCell(isSelected ? null : cellKey);
                          }
                        }}
                      >
                        {count > 0 ? (
                          <span>{count}{arrow && <span style={{ fontSize: '8px', marginLeft: '1px' }}>{arrow}</span>}</span>
                        ) : isTarget ? (
                          <span style={{ color: '#16a34a', fontSize: '12px' }}>●</span>
                        ) : ''}
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
        <span className="text-[9px] text-blue-600 font-semibold">{locale === 'en' ? 'Click cell → CIP' : '셀 클릭 → CIP'}</span>
      </div>

      {/* 개선안 입력 모달 */}
      {inputModal && (() => {
        const modalItem = riskItems.find(i => i.idx === inputModal.idx);
        const { direction, targetO, targetD } = inputModal;
        const currentPC = modalItem?.prevention || '';
        const currentDC = modalItem?.detection || '';
        const pcClean = currentPC.split('\n').map(l => l.replace(/^[PD]:/, '')).join(', ');
        const dcClean = currentDC.split('\n').map(l => l.replace(/^[PD]:/, '')).join(', ');
        const dirLabel = direction === 'O_ONLY' ? t('① 발생도 개선')
          : direction === 'D_ONLY' ? t('② 검출도 개선') : t('③ 발생도 및 검출도 개선');
        const headerColor = direction === 'D_ONLY' ? 'bg-blue-600'
          : direction === 'BOTH' ? 'bg-purple-600' : 'bg-green-600';
        const canSave = direction === 'BOTH'
          ? !!(inputText.trim() && inputTextD.trim()) : !!inputText.trim();
        const txH = direction === 'BOTH' ? '50px' : '70px';
        return (
        <div className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
          style={{ left: inputPos.x, top: inputPos.y, width: inputSize.w, minWidth: 420, maxHeight: '90vh' }}>
          <div className={`${headerColor} text-white px-4 py-2 rounded-t-lg flex items-center justify-between cursor-move`} onMouseDown={inputDragStart}>
            <h3 className="font-bold text-sm">{dirLabel}</h3>
            <button onClick={() => setInputModal(null)} className="text-white/70 hover:text-white text-xl leading-none">✕</button>
          </div>
          <div className="p-3 overflow-y-auto text-xs">
            <div className="flex gap-1.5 mb-2 flex-wrap">
              <span className="px-2 py-0.5 rounded font-bold" style={{ background: '#fee2e2', color: '#991b1b' }}>S={modalItem?.s || '?'}</span>
              {(direction === 'O_ONLY' || direction === 'BOTH') && (
                <span className="px-2 py-0.5 rounded font-bold" style={{ background: '#dcfce7', color: '#166534' }}>O={modalItem?.o}→{targetO}</span>
              )}
              {(direction === 'D_ONLY' || direction === 'BOTH') && (
                <span className="px-2 py-0.5 rounded font-bold" style={{ background: '#e0f2fe', color: '#1e40af' }}>D={modalItem?.d}→{targetD}</span>
              )}
              <span className="px-2 py-0.5 rounded font-bold" style={{ background: '#f3f4f6', color: '#374151' }}>AP={modalItem?.ap}→L</span>
            </div>
            {modalItem?.failureMode && (
              <div className="mb-1.5 text-gray-500 truncate" title={modalItem.failureMode}>
                <span className="font-semibold text-gray-700">{t('고장형태:')}</span> {modalItem.failureMode}
              </div>
            )}
            {(direction === 'O_ONLY' || direction === 'BOTH') && (
              <>
                <div className="mb-1 p-1.5 rounded" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <div className="truncate" title={pcClean}><span className="font-semibold text-green-700">{t('현재 PC:')}</span> {pcClean || <span className="text-gray-400">{t('미입력')}</span>}</div>
                </div>
                <label className="text-[10px] font-semibold text-green-700 mb-0.5 block">🛡️ {t('예방관리 개선안')}</label>
                <textarea value={inputText} onChange={e => setInputText(e.target.value)}
                  placeholder="예: Poka-Yoke 적용, SPC 관리도 도입, 설비 PM 강화 등"
                  className="w-full border rounded p-2 text-xs resize-none focus:outline-none focus:ring-2 mb-2"
                  style={{ height: txH, borderColor: '#86efac' }} autoFocus />
              </>
            )}
            {(direction === 'D_ONLY' || direction === 'BOTH') && (
              <>
                <div className="mb-1 p-1.5 rounded" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                  <div className="truncate" title={dcClean}><span className="font-semibold text-blue-700">{t('현재 DC:')}</span> {dcClean || <span className="text-gray-400">{t('미입력')}</span>}</div>
                </div>
                <label className="text-[10px] font-semibold text-blue-700 mb-0.5 block">🔍 {t('검출관리 개선안')}</label>
                <textarea
                  value={direction === 'D_ONLY' ? inputText : inputTextD}
                  onChange={e => direction === 'D_ONLY' ? setInputText(e.target.value) : setInputTextD(e.target.value)}
                  placeholder="예: 자동검사 설비 도입, 비전검사 추가, CMM 측정 등"
                  className="w-full border rounded p-2 text-xs resize-none focus:outline-none focus:ring-2"
                  style={{ height: txH, borderColor: '#93c5fd' }} autoFocus={direction === 'D_ONLY'} />
              </>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => setInputModal(null)} className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">{t('취소')}</button>
              <button onClick={handleSaveImprovement} disabled={!canSave}
                className={`px-3 py-1 text-xs text-white rounded ${
                  direction === 'D_ONLY' ? 'bg-blue-500 hover:bg-blue-600'
                  : direction === 'BOTH' ? 'bg-purple-500 hover:bg-purple-600'
                  : 'bg-green-500 hover:bg-green-600'} disabled:opacity-50`}>{t('저장')}</button>
            </div>
          </div>
          <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={inputResizeStart} title={t('크기 조절')}>
            <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 opacity-60">
              <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
        </div>
        );
      })()}

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
