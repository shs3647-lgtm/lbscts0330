/**
 * @file page.tsx
 * @description Part FMEA 상세 페이지
 * - 탭: 기본정보, CP, PFD, 개정이력
 * - FAMILY_REF: Master F/F 최신 반영 버튼
 * - 상태별 액션 버튼
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { FixedLayout } from '@/components/layout';
import PartFmeaTopNav from '../components/PartFmeaTopNav';
import { toast } from '@/hooks/useToast';

// ─── 타입 ───

interface CpItem {
  id: string;
  cpNo: string;
  cpName: string;
  updatedAt: string;
}

interface PfdItem {
  id: string;
  pfdNo: string;
  pfdName: string;
  updatedAt: string;
}

interface RevisionItem {
  version: string;
  action: string;
  authorName: string;
  createdAt: string;
  description: string;
}

interface PartFmeaDetail {
  id: string;
  partCode: string;
  customerName: string;
  productName: string;
  sourceType: string;
  status: string;
  version: string;
  authorName: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  cp: CpItem | null;
  pfd: PfdItem | null;
  revisions: RevisionItem[];
}

// ─── 상수 ───

type TabKey = 'info' | 'cp' | 'pfd' | 'revision';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'info', label: '기본정보' },
  { key: 'cp', label: 'CP' },
  { key: 'pfd', label: 'PFD' },
  { key: 'revision', label: '개정이력' },
];

const STATUS_BG: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  REVIEW: 'bg-orange-100 text-orange-700',
  APPROVED: 'bg-green-100 text-green-700',
  SUPERSEDED: 'bg-red-100 text-red-700',
};

const SOURCE_BG: Record<string, string> = {
  FAMILY_REF: 'bg-blue-100 text-blue-700',
  INDEPENDENT: 'bg-orange-100 text-orange-700',
};

const ROW_HEIGHT = 28;

// ─── 배지 ───

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_BG[status] || 'bg-gray-100 text-gray-600';
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>{status}</span>;
}

function SourceBadge({ sourceType }: { sourceType: string }) {
  const label = sourceType === 'FAMILY_REF' ? '참조모드' : '독립모드';
  const cls = SOURCE_BG[sourceType] || 'bg-gray-100 text-gray-600';
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>{label}</span>;
}

// ─── 기본정보 탭 ───

function InfoTab({ detail }: { detail: PartFmeaDetail }) {
  const fields = [
    { label: '코드', value: detail.partCode },
    { label: '고객사', value: detail.customerName },
    { label: '제품명', value: detail.productName },
    { label: '소스타입', value: detail.sourceType, sourceBadge: true },
    { label: '상태', value: detail.status, statusBadge: true },
    { label: '버전', value: detail.version },
    { label: '담당자', value: detail.authorName },
    { label: '설명', value: detail.description || '-' },
    { label: '생성일', value: detail.createdAt ? new Date(detail.createdAt).toLocaleDateString('ko-KR') : '-' },
    { label: '수정일', value: detail.updatedAt ? new Date(detail.updatedAt).toLocaleDateString('ko-KR') : '-' },
  ];

  return (
    <div className="max-w-xl">
      <table className="w-full text-xs">
        <tbody>
          {fields.map((f) => (
            <tr key={f.label} className="border-b" style={{ height: 32 }}>
              <td className="px-3 py-1 font-semibold text-gray-600 bg-gray-50 w-[30%]">{f.label}</td>
              <td className="px-3 py-1 text-gray-800">
                {f.statusBadge
                  ? <StatusBadge status={f.value} />
                  : f.sourceBadge
                    ? <SourceBadge sourceType={f.value} />
                    : f.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── CP 탭 ───

function CpTab({ cp }: { cp: CpItem | null }) {
  if (!cp) {
    return <div className="text-center py-8 text-xs text-gray-400">연결된 CP가 없습니다.</div>;
  }
  return (
    <div className="max-w-xl border rounded-lg overflow-hidden">
      <table className="w-full text-xs">
        <tbody>
          <tr className="border-b" style={{ height: ROW_HEIGHT }}>
            <td className="px-3 py-1 font-semibold text-gray-600 bg-gray-50 w-[30%]">CP No</td>
            <td className="px-3 py-1 font-mono text-blue-700">{cp.cpNo}</td>
          </tr>
          <tr className="border-b" style={{ height: ROW_HEIGHT }}>
            <td className="px-3 py-1 font-semibold text-gray-600 bg-gray-50">CP 이름</td>
            <td className="px-3 py-1">{cp.cpName}</td>
          </tr>
          <tr style={{ height: ROW_HEIGHT }}>
            <td className="px-3 py-1 font-semibold text-gray-600 bg-gray-50">수정일</td>
            <td className="px-3 py-1 text-gray-500">
              {cp.updatedAt ? new Date(cp.updatedAt).toLocaleDateString('ko-KR') : '-'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── PFD 탭 ───

function PfdTab({ pfd }: { pfd: PfdItem | null }) {
  if (!pfd) {
    return <div className="text-center py-8 text-xs text-gray-400">연결된 PFD가 없습니다.</div>;
  }
  return (
    <div className="max-w-xl border rounded-lg overflow-hidden">
      <table className="w-full text-xs">
        <tbody>
          <tr className="border-b" style={{ height: ROW_HEIGHT }}>
            <td className="px-3 py-1 font-semibold text-gray-600 bg-gray-50 w-[30%]">PFD No</td>
            <td className="px-3 py-1 font-mono text-blue-700">{pfd.pfdNo}</td>
          </tr>
          <tr className="border-b" style={{ height: ROW_HEIGHT }}>
            <td className="px-3 py-1 font-semibold text-gray-600 bg-gray-50">PFD 이름</td>
            <td className="px-3 py-1">{pfd.pfdName}</td>
          </tr>
          <tr style={{ height: ROW_HEIGHT }}>
            <td className="px-3 py-1 font-semibold text-gray-600 bg-gray-50">수정일</td>
            <td className="px-3 py-1 text-gray-500">
              {pfd.updatedAt ? new Date(pfd.updatedAt).toLocaleDateString('ko-KR') : '-'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── 개정이력 탭 ───

function RevisionTab({ revisions }: { revisions: RevisionItem[] }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="px-2 py-1.5 text-left font-semibold text-gray-600 w-[10%]">버전</th>
            <th className="px-2 py-1.5 text-left font-semibold text-gray-600 w-[12%]">액션</th>
            <th className="px-2 py-1.5 text-left font-semibold text-gray-600 w-[10%]">담당자</th>
            <th className="px-2 py-1.5 text-left font-semibold text-gray-600 w-[12%]">일자</th>
            <th className="px-2 py-1.5 text-left font-semibold text-gray-600">설명</th>
          </tr>
        </thead>
        <tbody>
          {revisions.length === 0 ? (
            <tr><td colSpan={5} className="text-center py-6 text-gray-400">개정이력이 없습니다.</td></tr>
          ) : (
            revisions.map((rev, idx) => (
              <tr key={idx} className="border-b" style={{ height: ROW_HEIGHT }}>
                <td className="px-2 font-mono">{rev.version}</td>
                <td className="px-2">{rev.action}</td>
                <td className="px-2">{rev.authorName}</td>
                <td className="px-2 text-gray-500">
                  {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('ko-KR') : '-'}
                </td>
                <td className="px-2 text-gray-600">{rev.description || '-'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── 메인 페이지 ───

export default function PartFmeaDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [detail, setDetail] = useState<PartFmeaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const [actionLoading, setActionLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/part-fmea/${id}`);
      if (!res.ok) throw new Error(`API 오류: ${res.status}`);
      const data = await res.json();
      setDetail(data);
    } catch (error) {
      console.error('Part FMEA 상세 로드 실패:', error);
      toast.error('Part FMEA 상세 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleAction = async (action: string) => {
    if (!detail) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/part-fmea/${detail.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `API 오류: ${res.status}`);
      }
      toast.success(`${action} 처리가 완료되었습니다.`);
      fetchDetail();
    } catch (error) {
      console.error(`${action} 처리 실패:`, error);
      toast.error(error instanceof Error ? error.message : `${action} 처리에 실패했습니다.`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSyncFromMaster = async () => {
    if (!detail) return;
    try {
      setSyncLoading(true);
      const res = await fetch(`/api/part-fmea/${detail.id}/sync-from-master`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `API 오류: ${res.status}`);
      }
      toast.success('Master F/F 최신 데이터가 반영되었습니다.');
      fetchDetail();
    } catch (error) {
      console.error('Master 동기화 실패:', error);
      toast.error(error instanceof Error ? error.message : 'Master 동기화에 실패했습니다.');
    } finally {
      setSyncLoading(false);
    }
  };

  if (loading) {
    return (
      <FixedLayout>
        <PartFmeaTopNav />
        <div className="pt-10 flex items-center justify-center h-64 text-gray-400">로딩 중...</div>
      </FixedLayout>
    );
  }

  if (!detail) {
    return (
      <FixedLayout>
        <PartFmeaTopNav />
        <div className="pt-10 flex items-center justify-center h-64 text-gray-400">
          Part FMEA를 찾을 수 없습니다.
        </div>
      </FixedLayout>
    );
  }

  return (
    <FixedLayout>
      <PartFmeaTopNav />
      <div className="pt-10 px-4 pb-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { window.location.href = '/part-fmea/list'; }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              &larr; 목록
            </button>
            <h1 className="text-lg font-bold text-gray-800">{detail.productName}</h1>
            <SourceBadge sourceType={detail.sourceType} />
            <StatusBadge status={detail.status} />
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-1.5">
            {detail.sourceType === 'FAMILY_REF' && (
              <button
                onClick={handleSyncFromMaster}
                disabled={syncLoading}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {syncLoading ? '동기화 중...' : 'Master F/F 최신 반영'}
              </button>
            )}
            {detail.status === 'DRAFT' && (
              <button
                onClick={() => handleAction('검토요청')}
                disabled={actionLoading}
                className="px-3 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-400 transition-colors"
              >
                검토요청
              </button>
            )}
            {detail.status === 'REVIEW' && (
              <>
                <button
                  onClick={() => handleAction('승인')}
                  disabled={actionLoading}
                  className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                >
                  승인
                </button>
                <button
                  onClick={() => handleAction('반려')}
                  disabled={actionLoading}
                  className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400 transition-colors"
                >
                  반려
                </button>
              </>
            )}
            {(detail.status === 'APPROVED' || detail.status === 'SUPERSEDED') && (
              <button
                onClick={() => handleAction('새버전')}
                disabled={actionLoading}
                className="px-3 py-1 text-xs bg-red-700 text-white rounded hover:bg-red-800 disabled:bg-gray-400 transition-colors"
              >
                새버전
              </button>
            )}
          </div>
        </div>

        {/* 탭 */}
        <div className="flex border-b mb-3">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 탭 컨텐츠 */}
        {activeTab === 'info' && <InfoTab detail={detail} />}
        {activeTab === 'cp' && <CpTab cp={detail.cp} />}
        {activeTab === 'pfd' && <PfdTab pfd={detail.pfd} />}
        {activeTab === 'revision' && <RevisionTab revisions={detail.revisions || []} />}
      </div>
    </FixedLayout>
  );
}
