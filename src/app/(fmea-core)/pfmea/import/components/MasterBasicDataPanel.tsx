/**
 * @file MasterBasicDataPanel.tsx
 * @description Master 기초정보(Basic Data) 사용 패널
 *   M(Master) 타입 FMEA의 기초정보를 현재 FMEA에 불러와 적용하는 기능
 * @created 2026-03-19
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { ImportedFlatData } from '../types';
import type { MasterFailureChain } from '../types/masterFailureChain';
import type { BdStatusItem, FMEAProject } from './ImportPageTypes';
import { loadDatasetByFmeaId } from '../utils/master-api';

interface MasterBasicDataPanelProps {
  selectedFmeaId: string;
  selectedFmeaType?: string;
  fmeaList: FMEAProject[];
  bdStatusList: BdStatusItem[];
  flatData: ImportedFlatData[];
  onApplyMasterData: (data: {
    flatData: ImportedFlatData[];
    failureChains: MasterFailureChain[];
    sourceFmeaId: string;
    sourceName: string;
  }) => void;
}

const TYPE_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  M: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', label: 'Master' },
  F: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300', label: 'Family' },
  P: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', label: 'Part' },
};

function TypeBadge({ type }: { type: string }) {
  const s = TYPE_STYLES[type] || TYPE_STYLES.P;
  return (
    <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${s.bg} ${s.text} ${s.border} border`}>
      {s.label}
    </span>
  );
}

interface MasterCandidate {
  fmeaId: string;
  fmeaName: string;
  fmeaType: string;
  processCount: number;
  itemCount: number;
  dataCount: number;
  fmCount: number;
  fcCount: number;
}

export function MasterBasicDataPanel({
  selectedFmeaId,
  selectedFmeaType,
  fmeaList,
  bdStatusList,
  flatData,
  onApplyMasterData,
}: MasterBasicDataPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState<MasterCandidate | null>(null);

  const masterCandidates = useMemo<MasterCandidate[]>(() => {
    return bdStatusList
      .filter(bd =>
        bd.fmeaId !== selectedFmeaId &&
        bd.isActive !== false &&
        bd.dataCount > 0
      )
      .sort((a, b) => {
        const typeOrder = { M: 0, F: 1, P: 2 };
        const ta = typeOrder[a.fmeaType as keyof typeof typeOrder] ?? 9;
        const tb = typeOrder[b.fmeaType as keyof typeof typeOrder] ?? 9;
        if (ta !== tb) return ta - tb;
        return b.dataCount - a.dataCount;
      })
      .map(bd => ({
        fmeaId: bd.fmeaId,
        fmeaName: bd.fmeaName || bd.bdId,
        fmeaType: bd.fmeaType,
        processCount: bd.processCount || 0,
        itemCount: bd.itemCount,
        dataCount: bd.dataCount,
        fmCount: bd.fmCount || 0,
        fcCount: bd.fcCount || 0,
      }));
  }, [bdStatusList, selectedFmeaId]);

  const handleApply = useCallback(async (candidate: MasterCandidate) => {
    setIsLoading(true);
    try {
      const loaded = await loadDatasetByFmeaId(candidate.fmeaId);
      if (!loaded.flatData || loaded.flatData.length === 0) {
        alert('Master 기초정보가 비어 있습니다.');
        return;
      }

      const inheritedData = loaded.flatData.map(item => ({
        ...item,
        id: `inh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        inherited: true,
        sourceId: item.id,
      }));

      const chains = (loaded.failureChains || []) as MasterFailureChain[];

      onApplyMasterData({
        flatData: inheritedData,
        failureChains: chains,
        sourceFmeaId: candidate.fmeaId,
        sourceName: candidate.fmeaName,
      });

      setShowConfirm(null);
    } catch (error) {
      console.error('Master 기초정보 로드 실패:', error);
      alert('Master 기초정보 로드 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [onApplyMasterData]);

  if (masterCandidates.length === 0) return null;

  return (
    <>
      <div className="mt-2 border border-blue-300 rounded-lg bg-blue-50 overflow-hidden">
        <div className="px-3 py-2 bg-blue-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">
              기초정보(Basic Data) 사용 ({masterCandidates.length})
            </span>
          </div>
          {flatData.length > 0 && (
            <span className="text-[10px] text-blue-200">
              현재 데이터가 있습니다 — 적용 시 대체됩니다
            </span>
          )}
        </div>

        <div className="p-2 space-y-1.5">
          {masterCandidates.map(c => (
            <div
              key={c.fmeaId}
              className="flex items-center justify-between px-3 py-2 bg-white border border-blue-200 rounded hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <TypeBadge type={c.fmeaType} />
                <span className="text-xs font-semibold text-gray-800">{c.fmeaName}</span>
                <span className="text-[10px] text-gray-500">
                  {c.processCount > 0 && `${c.processCount}공정`}
                  {c.fmCount > 0 && ` · FM ${c.fmCount}`}
                  {c.fcCount > 0 && ` · FC ${c.fcCount}`}
                  {c.dataCount > 0 && ` · ${c.dataCount}건`}
                </span>
              </div>
              <button
                onClick={() => setShowConfirm(c)}
                disabled={isLoading}
                className="px-3 py-1 text-[11px] font-bold bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? '로드 중...' : '사용'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 확인 모달 */}
      {showConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-2xl w-[460px] flex flex-col">
            <div className="bg-blue-600 text-white px-4 py-2.5 rounded-t-lg font-bold text-sm">
              기초정보(Basic Data) 사용 확인
            </div>
            <div className="p-4">
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
                <div className="flex items-center gap-2 mb-2">
                  <TypeBadge type={showConfirm.fmeaType} />
                  <span className="font-bold text-gray-800">{showConfirm.fmeaName}</span>
                </div>
                <table className="w-full text-xs">
                  <tbody>
                    <tr>
                      <td className="py-0.5 text-gray-500 w-20">공정 수</td>
                      <td className="py-0.5 font-semibold">{showConfirm.processCount}</td>
                      <td className="py-0.5 text-gray-500 w-20">데이터 수</td>
                      <td className="py-0.5 font-semibold">{showConfirm.dataCount}</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 text-gray-500">고장형태</td>
                      <td className="py-0.5 font-semibold">{showConfirm.fmCount}</td>
                      <td className="py-0.5 text-gray-500">고장원인</td>
                      <td className="py-0.5 font-semibold">{showConfirm.fcCount}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {flatData.length > 0 && (
                <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                  ⚠️ 현재 Import 데이터 ({flatData.length}건)가 Master 기초정보로 대체됩니다.
                </div>
              )}

              <p className="text-xs text-gray-600">
                선택한 FMEA의 기초정보(공정, 기능, 고장형태, 고장원인 등)를
                현재 FMEA에 적용합니다. 적용 후 편집이 가능합니다.
              </p>
            </div>
            <div className="px-4 py-2.5 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setShowConfirm(null)}
                className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded text-xs font-bold hover:bg-gray-300 cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={() => handleApply(showConfirm)}
                disabled={isLoading}
                className="px-4 py-1.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 disabled:bg-gray-400 cursor-pointer"
              >
                {isLoading ? '로드 중...' : '적용'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
