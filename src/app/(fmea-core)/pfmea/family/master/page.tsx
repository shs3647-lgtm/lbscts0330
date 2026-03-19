/**
 * @file page.tsx
 * @description Master-00 뷰 페이지
 * - FamilyMaster 및 산하 FamilyFmea 현황 표시
 * - 공정 카드 형태 상태 그리드
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FixedLayout } from '@/components/layout';
import FamilyTopNav from '../components/FamilyTopNav';
import { toast } from '@/hooks/useToast';

// ─── 타입 ───

interface FamilyMaster {
  id: string;
  name: string;
  version: string;
  updatedAt: string;
}

interface FamilyFmeaProcess {
  id: string;
  familyCode: string;
  processNo: string;
  processName: string;
  status: string;
  version: string;
  authorName: string;
  cpCount: number;
  pfdCount: number;
}

interface MasterData {
  master: FamilyMaster;
  processes: FamilyFmeaProcess[];
}

// ─── 상수 ───

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  DRAFT: { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-600' },
  REVIEW: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700' },
  APPROVED: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700' },
  SUPERSEDED: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700' },
};

// ─── 공정 카드 ───

function ProcessCard({ process }: { process: FamilyFmeaProcess }) {
  const style = STATUS_STYLES[process.status] || STATUS_STYLES.DRAFT;
  return (
    <div
      className={`rounded-lg border-2 p-3 cursor-pointer transition-all hover:shadow-md ${style.bg} ${style.border}`}
      onClick={() => { window.location.href = `/pfmea/family/${process.id}`; }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-gray-800">{process.processNo}</span>
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${style.text} ${style.bg}`}>
          {process.status}
        </span>
      </div>
      <div className="text-xs font-medium text-gray-700 mb-1 truncate">{process.processName}</div>
      <div className="text-[10px] text-gray-500 space-y-0.5">
        <div>코드: <span className="font-mono text-blue-600">{process.familyCode}</span></div>
        <div>버전: {process.version} | 담당: {process.authorName}</div>
        <div>CP: {process.cpCount ?? 0} | PFD: {process.pfdCount ?? 0}</div>
      </div>
    </div>
  );
}

// ─── 메인 페이지 ───

export default function FamilyFmeaMasterPage() {
  const [masters, setMasters] = useState<MasterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMasterIdx, setSelectedMasterIdx] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/family-fmea/master-overview');
      if (!res.ok) throw new Error(`API 오류: ${res.status}`);
      const data = await res.json();
      setMasters(data.masters || []);
    } catch (error) {
      console.error('Master-00 데이터 로드 실패:', error);
      toast.error('Master-00 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currentMaster = masters[selectedMasterIdx];

  return (
    <FixedLayout>
      <FamilyTopNav />
      <div className="pt-10 px-4 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-gray-800">Master-00 현황</h1>
          <button
            onClick={fetchData}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            새로고침
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">로딩 중...</div>
        ) : masters.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            등록된 Master FMEA가 없습니다.
          </div>
        ) : (
          <>
            {/* Master 선택 탭 */}
            {masters.length > 1 && (
              <div className="flex gap-1 mb-4 overflow-x-auto">
                {masters.map((m, idx) => (
                  <button
                    key={m.master.id}
                    onClick={() => setSelectedMasterIdx(idx)}
                    className={`px-3 py-1 text-xs rounded border whitespace-nowrap transition-colors ${
                      idx === selectedMasterIdx
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {m.master.name}
                  </button>
                ))}
              </div>
            )}

            {currentMaster && (
              <>
                {/* Master 정보 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-blue-800">{currentMaster.master.name}</div>
                      <div className="text-xs text-blue-600 mt-0.5">
                        버전: {currentMaster.master.version} | 수정일:{' '}
                        {currentMaster.master.updatedAt
                          ? new Date(currentMaster.master.updatedAt).toLocaleDateString('ko-KR')
                          : '-'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-800">{currentMaster.processes.length}</div>
                      <div className="text-[10px] text-blue-600">공정 수</div>
                    </div>
                  </div>
                </div>

                {/* 상태 요약 */}
                <div className="flex gap-3 mb-4">
                  {(['DRAFT', 'REVIEW', 'APPROVED', 'SUPERSEDED'] as const).map((status) => {
                    const count = currentMaster.processes.filter((p) => p.status === status).length;
                    const style = STATUS_STYLES[status];
                    return (
                      <div
                        key={status}
                        className={`flex-1 rounded-lg border p-2 text-center ${style.bg} ${style.border}`}
                      >
                        <div className={`text-lg font-bold ${style.text}`}>{count}</div>
                        <div className="text-[10px] text-gray-500">{status}</div>
                      </div>
                    );
                  })}
                </div>

                {/* 공정 카드 그리드 */}
                {currentMaster.processes.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    등록된 공정별 Family FMEA가 없습니다.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {currentMaster.processes.map((proc) => (
                      <ProcessCard key={proc.id} process={proc} />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </FixedLayout>
  );
}
