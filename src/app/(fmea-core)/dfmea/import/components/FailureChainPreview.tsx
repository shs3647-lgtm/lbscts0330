/**
 * @file FailureChainPreview.tsx
 * @description FC(Failure Chain) 미리보기 — 고장사슬 (FE↔FM↔FC) 테이블
 * 기존데이터 탭의 두 번째 서브탭
 * @created 2026-02-21
 */
/**
 * ██████████████████████████████████████████████████████████████
 * ██  CODEFREEZE v3.1.0 — 이 파일을 수정하지 마세요!          ██
 * ██                                                          ██
 * ██  상태: DB중심 고장연결 + v3.0 아키텍처 완성 (2026-02-28)  ██
 * ██  검증: 270테스트 PASS / tsc 에러 0개                      ██
 * ██                                                          ██
 * ██  수정이 필요하면:                                         ██
 * ██  1. 반드시 별도 브랜치에서 작업                            ██
 * ██  2. 270 골든 테스트 전체 통과 필수                         ██
 * ██  3. 사용자 승인 후 머지                                   ██
 * ██████████████████████████████████████████████████████████████
 */


'use client';

import React, { useMemo } from 'react';
import type { MasterFailureChain } from '../types/masterFailureChain';

// ─── 스타일 상수 ───

const TH = 'border border-gray-300 px-1 py-0.5 text-[9px] font-semibold text-center bg-blue-50 whitespace-nowrap text-blue-700';
const TD = 'border border-gray-200 px-1 py-0.5 text-[9px] leading-tight';
const TD_NO = 'border border-gray-200 px-0.5 py-0.5 text-[8px] text-center text-gray-400 bg-gray-50/50';

const M4_BADGE: Record<string, string> = {
  MN: 'bg-red-50 text-red-600',
  MC: 'bg-blue-50 text-blue-600',
  IM: 'bg-amber-50 text-amber-600',
  EN: 'bg-pink-50 text-pink-600',
};

const AP_BADGE: Record<string, string> = {
  H: 'bg-red-100 text-red-700 border-red-300',
  M: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  L: 'bg-green-100 text-green-700 border-green-300',
};

// ─── Props ───

interface Props {
  chains: MasterFailureChain[];
  isFullscreen?: boolean;
  hideStats?: boolean;
}

// ─── 컴포넌트 ───

export function FailureChainPreview({ chains, isFullscreen, hideStats }: Props) {
  const tableMaxH = isFullscreen ? 'max-h-[calc(100vh-180px)]' : 'max-h-[280px]';

  // 공정번호별 그룹
  const grouped = useMemo(() => {
    const map = new Map<string, MasterFailureChain[]>();
    for (const c of chains) {
      const arr = map.get(c.processNo) || [];
      arr.push(c);
      map.set(c.processNo, arr);
    }
    return Array.from(map.entries()).sort((a, b) => {
      const na = parseInt(a[0]) || 0;
      const nb = parseInt(b[0]) || 0;
      return na - nb || a[0].localeCompare(b[0]);
    });
  }, [chains]);

  const stats = useMemo(() => {
    const hasSod = chains.filter(c => c.severity && c.occurrence && c.detection).length;
    const hasAp = chains.filter(c => c.ap).length;
    const uniqueFM = new Set(chains.map(c => c.fmValue).filter(Boolean)).size;
    const uniqueFC = new Set(chains.map(c => c.fcValue).filter(Boolean)).size;
    const uniqueFE = new Set(chains.map(c => c.feValue).filter(Boolean)).size;
    return { total: chains.length, processes: grouped.length, hasSod, hasAp, uniqueFM, uniqueFC, uniqueFE };
  }, [chains, grouped]);

  if (chains.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400 text-[11px] border border-dashed border-gray-300 rounded">
        고장사슬 데이터 없음 — 기초정보에 A5(고장형태), B4(고장원인), C4(고장영향) 데이터가 필요합니다
      </div>
    );
  }

  return (
    <div>
      {/* 통계 바 — hideStats 시 숨김 (부모 액션바에 통합) */}
      {!hideStats && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-[11px]">
            <b className="text-blue-700">{stats.total}</b><span className="text-blue-500">체인</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-[11px]">
            <b className="text-blue-700">{stats.processes}</b><span className="text-blue-500">공정</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 border border-gray-200 rounded text-[11px]">
            <span className="text-gray-500">FM</span><b className="text-gray-700">{stats.uniqueFM}</b>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 border border-gray-200 rounded text-[11px]">
            <span className="text-gray-500">FC</span><b className="text-gray-700">{stats.uniqueFC}</b>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 border border-gray-200 rounded text-[11px]">
            <span className="text-gray-500">FE</span><b className="text-gray-700">{stats.uniqueFE}</b>
          </span>
        </div>
      )}

      {/* 테이블 */}
      <div className={`overflow-y-auto ${tableMaxH} border border-gray-200 rounded`}>
        <table className="w-full border-collapse text-[9px]">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className={TH} style={{ width: 24 }}>No</th>
              <th className={TH} style={{ width: 38 }}>공정</th>
              <th className={TH} style={{ width: 28 }}>4M</th>
              <th className={TH}>FC 고장원인(B4)</th>
              <th className={TH}>FM 고장형태(A5)</th>
              <th className={TH}>FE 고장영향(C4)</th>
              <th className={TH}>PC 예방관리(B5)</th>
              <th className={TH}>DC 검출관리(A6)</th>
            </tr>
          </thead>
          <tbody>
            {chains.slice(0, 200).map((c, i) => (
              <tr key={c.id} className={i % 2 ? 'bg-gray-50/50' : ''}>
                <td className={TD_NO}>{i + 1}</td>
                <td className={`${TD} text-center font-mono`}>{c.processNo}</td>
                <td className={`${TD} text-center`}>
                  {c.m4 && <span className={`text-[7px] px-0.5 rounded font-bold ${M4_BADGE[c.m4] || ''}`}>{c.m4}</span>}
                </td>
                <td className={TD}>{c.fcValue || <span className="text-gray-300">-</span>}</td>
                <td className={TD}>{c.fmValue || <span className="text-gray-300">-</span>}</td>
                <td className={TD}>{c.feValue || <span className="text-gray-300">-</span>}</td>
                <td className={TD}>{c.pcValue || <span className="text-gray-300">-</span>}</td>
                <td className={TD}>{c.dcValue || <span className="text-gray-300">-</span>}</td>
              </tr>
            ))}
            {chains.length > 200 && (
              <tr><td colSpan={8} className="text-center text-gray-400 text-[9px] py-0.5">
                ... 외 {chains.length - 200}건
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default FailureChainPreview;
