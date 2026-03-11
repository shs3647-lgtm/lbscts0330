// CODEFREEZE
/**
 * @file APResultModal.tsx
 * @description AP 결과 플로팅 윈도우 - 5단계(리스크분석) 또는 6단계(최적화) AP 결과 표시
 *
 * @version 3.0.0 - 비모달 플로팅 윈도우 전환
 */

'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';

interface APResultItem {
  id: string;
  processName: string;
  failureMode: string;
  failureCause: string;
  severity: number;
  occurrence: number;
  detection: number;
  ap: 'H' | 'M' | 'L';
}

interface APResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  stage: 5 | 6;
  data: APResultItem[];
}

/** AP 등급별 스타일 */
const AP_STYLES = {
  H: { bg: 'bg-red-400', text: 'text-red-900', border: 'border-black' },
  M: { bg: 'bg-yellow-300', text: 'text-yellow-900', border: 'border-black' },
  L: { bg: 'bg-green-300', text: 'text-green-900', border: 'border-black' },
};

/** 공통 스타일 */
const tw = {
  header: 'text-white py-3 px-4 flex justify-between items-center cursor-move shrink-0 rounded-t-lg',
  closeBtn: 'bg-transparent border-none text-white text-xl cursor-pointer leading-none hover:opacity-80',
  stats: 'p-4 bg-gray-100 border-b border-gray-300 flex justify-center gap-6 shrink-0',
  statItem: 'flex items-center gap-2.5',
  statBox: 'w-[50px] h-9 rounded-md border-2 border-black flex items-center justify-center font-bold text-base',
  statLabel: 'text-xs font-bold',
  content: 'flex-1 overflow-auto p-4',
  empty: 'text-center py-10 text-gray-500',
  table: 'w-full border-collapse text-[11px]',
  th: 'bg-[#1e3a5f] text-white p-2 border border-black text-center font-bold',
  td: 'p-1.5 border border-black',
  tdCenter: 'p-1.5 border border-black text-center font-bold',
};

export default function APResultModal({ isOpen, onClose, stage, data }: APResultModalProps) {
  const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({
    isOpen, width: 900, height: 600, minWidth: 600, minHeight: 400
  });

  if (!isOpen) return null;

  const hCount = data.filter(d => d.ap === 'H').length;
  const mCount = data.filter(d => d.ap === 'M').length;
  const lCount = data.filter(d => d.ap === 'L').length;
  const totalCount = data.length;

  const hItems = data.filter(d => d.ap === 'H');
  const mItems = data.filter(d => d.ap === 'M');
  const lItems = data.filter(d => d.ap === 'L');

  const stageLabel = stage === 5 ? '리스크분석 (5단계)' : '최적화 (6단계)';
  const headerBg = stage === 5 ? 'bg-red-600' : 'bg-orange-500';

  return createPortal(
    <div
      className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
    >
      {/* 헤더 */}
      <div className={`${tw.header} ${headerBg}`} onMouseDown={onDragStart}>
        <span className="font-bold text-sm" title="AP Result">📊 AP 결과(AP Result) - {stageLabel}</span>
        <button onClick={onClose} onMouseDown={e => e.stopPropagation()} className={tw.closeBtn}>×</button>
      </div>

      {/* 통계 요약 */}
      <div className={tw.stats}>
        <div className={tw.statItem}>
          <div className={`${tw.statBox} ${AP_STYLES.H.bg} ${AP_STYLES.H.text}`}>{hCount}</div>
          <span className={`${tw.statLabel} text-red-900`}>High (즉시 조치)</span>
        </div>
        <div className={tw.statItem}>
          <div className={`${tw.statBox} ${AP_STYLES.M.bg} ${AP_STYLES.M.text}`}>{mCount}</div>
          <span className={`${tw.statLabel} text-yellow-900`}>Medium (권고)</span>
        </div>
        <div className={tw.statItem}>
          <div className={`${tw.statBox} ${AP_STYLES.L.bg} ${AP_STYLES.L.text}`}>{lCount}</div>
          <span className={`${tw.statLabel} text-green-900`}>Low (유지)</span>
        </div>
        <div className={`${tw.statItem} ml-4 pl-4 border-l-2 border-gray-300`}>
          <div className={`${tw.statBox} bg-gray-300 text-gray-800`}>{totalCount}</div>
          <span className={`${tw.statLabel} text-gray-800`}>Total</span>
        </div>
      </div>

      {/* 상세 테이블 */}
      <div className={tw.content}>
        {totalCount === 0 ? (
          <div className={tw.empty}>
            <div className="text-3xl mb-2">📋</div>
            <div>AP 결과 데이터가 없습니다.</div>
            <div className="text-[11px] mt-2">리스크분석(5단계)을 먼저 진행해주세요.</div>
          </div>
        ) : (
          <table className={tw.table}>
            <thead>
              <tr>
                <th className={tw.th} title="Action Priority">AP</th>
                <th className={tw.th} title="Process Name"><div className="leading-tight"><div>공정명</div><div className="text-[8px] font-normal opacity-60">(Process)</div></div></th>
                <th className={tw.th} title="Failure Mode"><div className="leading-tight"><div>고장형태</div><div className="text-[8px] font-normal opacity-60">(FM)</div></div></th>
                <th className={tw.th} title="Failure Cause"><div className="leading-tight"><div>고장원인</div><div className="text-[8px] font-normal opacity-60">(FC)</div></div></th>
                <th className={`${tw.th} w-[50px]`}>S</th>
                <th className={`${tw.th} w-[50px]`}>O</th>
                <th className={`${tw.th} w-[50px]`}>D</th>
              </tr>
            </thead>
            <tbody>
              {/* High 항목 */}
              {hItems.map((item, idx) => (
                <tr key={`h-${idx}`}>
                  <td className={`${tw.tdCenter} ${AP_STYLES.H.bg} ${AP_STYLES.H.text} text-[13px]`}>H</td>
                  <td className={tw.td}>{item.processName}</td>
                  <td className={tw.td}>{item.failureMode}</td>
                  <td className={tw.td}>{item.failureCause}</td>
                  <td className={`${tw.tdCenter} ${item.severity >= 8 ? 'text-red-700' : ''}`}>{item.severity}</td>
                  <td className={tw.tdCenter}>{item.occurrence}</td>
                  <td className={tw.tdCenter}>{item.detection}</td>
                </tr>
              ))}
              {/* Medium 항목 */}
              {mItems.map((item, idx) => (
                <tr key={`m-${idx}`}>
                  <td className={`${tw.tdCenter} ${AP_STYLES.M.bg} ${AP_STYLES.M.text} text-[13px]`}>M</td>
                  <td className={tw.td}>{item.processName}</td>
                  <td className={tw.td}>{item.failureMode}</td>
                  <td className={tw.td}>{item.failureCause}</td>
                  <td className={tw.tdCenter}>{item.severity}</td>
                  <td className={tw.tdCenter}>{item.occurrence}</td>
                  <td className={tw.tdCenter}>{item.detection}</td>
                </tr>
              ))}
              {/* Low 항목 */}
              {lItems.map((item, idx) => (
                <tr key={`l-${idx}`}>
                  <td className={`${tw.tdCenter} ${AP_STYLES.L.bg} ${AP_STYLES.L.text} text-[13px]`}>L</td>
                  <td className={tw.td}>{item.processName}</td>
                  <td className={tw.td}>{item.failureMode}</td>
                  <td className={tw.td}>{item.failureCause}</td>
                  <td className={tw.tdCenter}>{item.severity}</td>
                  <td className={tw.tdCenter}>{item.occurrence}</td>
                  <td className={tw.tdCenter}>{item.detection}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 리사이즈 핸들 */}
      <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={onResizeStart} title="크기 조절">
        <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 opacity-60">
          <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
    </div>,
    document.body
  );
}
