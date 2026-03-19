/**
 * @file page.tsx
 * @description Family FMEA 상세 페이지
 * - 탭: 기본정보, CP 목록, PFD 목록, 개정이력
 * - 상태별 액션 버튼 (검토요청, 승인, 반려, 새버전)
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { FixedLayout } from '@/components/layout';
import FamilyTopNav from '../components/FamilyTopNav';
import { toast } from '@/hooks/useToast';

// ─── 타입 ───

interface CpItem {
  id: string;
  cpNo: string;
  cpName: string;
  isPrimary: boolean;
  updatedAt: string;
}

interface PfdItem {
  id: string;
  pfdNo: string;
  pfdName: string;
  isPrimary: boolean;
  updatedAt: string;
}

interface RevisionItem {
  version: string;
  action: string;
  authorName: string;
  createdAt: string;
  description: string;
}

interface FamilyFmeaDetail {
  id: string;
  familyCode: string;
  processNo: string;
  processName: string;
  status: string;
  version: string;
  authorName: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  cpList: CpItem[];
  pfdList: PfdItem[];
  revisions: RevisionItem[];
}

// ─── 상수 ───

type TabKey = 'info' | 'cp' | 'pfd' | 'revision';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'info', label: '기본정보' },
  { key: 'cp', label: 'CP 목록' },
  { key: 'pfd', label: 'PFD 목록' },
  { key: 'revision', label: '개정이력' },
];

const STATUS_BG: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  REVIEW: 'bg-orange-100 text-orange-700',
  APPROVED: 'bg-green-100 text-green-700',
  SUPERSEDED: 'bg-red-100 text-red-700',
};

const ROW_HEIGHT = 28;

// ─── 상태 배지 ───

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_BG[status] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>
      {status}
    </span>
  );
}

// ─── 기본정보 탭 ───

function InfoTab({ detail }: { detail: FamilyFmeaDetail }) {
  const fields = [
    { label: '코드', value: detail.familyCode },
    { label: '공정번호', value: detail.processNo },
    { label: '공정명', value: detail.processName },
    { label: '상태', value: detail.status, badge: true },
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
                {f.badge ? <StatusBadge status={f.value} /> : f.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── CP 목록 탭 ───

function CpTab({ cpList }: { cpList: CpItem[] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-600">CP 목록 ({cpList.length}건)</span>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-2 py-1.5 text-left font-semibold text-gray-600 w-[5%]">No</th>
              <th className="px-2 py-1.5 text-left font-semibold text-gray-600 w-[15%]">CP No</th>
              <th className="px-2 py-1.5 text-left font-semibold text-gray-600 w-[35%]">CP 이름</th>
              <th className="px-2 py-1.5 text-center font-semibold text-gray-600 w-[10%]">Primary</th>
              <th className="px-2 py-1.5 text-left font-semibold text-gray-600 w-[15%]">수정일</th>
            </tr>
          </thead>
          <tbody>
            {cpList.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-6 text-gray-400">등록된 CP가 없습니다.</td></tr>
            ) : (
              cpList.map((cp, idx) => (
                <tr key={cp.id} className="border-b hover:bg-blue-50/50" style={{ height: ROW_HEIGHT }}>
                  <td className="px-2">{idx + 1}</td>
                  <td className="px-2 font-mono text-blue-700">{cp.cpNo}</td>
                  <td className="px-2">{cp.cpName}</td>
                  <td className="px-2 text-center">
                    {cp.isPrimary && (
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-semibold">
                        Primary
                      </span>
                    )}
                  </td>
                  <td className="px-2 text-gray-500">
                    {cp.updatedAt ? new Date(cp.updatedAt).toLocaleDateString('ko-KR') : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── PFD 목록 탭 ───

function PfdTab({ pfdList }: { pfdList: PfdItem[] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-600">PFD 목록 ({pfdList.length}건)</span>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-2 py-1.5 text-left font-semibold text-gray-600 w-[5%]">No</th>
              <th className="px-2 py-1.5 text-left font-semibold text-gray-600 w-[15%]">PFD No</th>
              <th className="px-2 py-1.5 text-left font-semibold text-gray-600 w-[35%]">PFD 이름</th>
              <th className="px-2 py-1.5 text-center font-semibold text-gray-600 w-[10%]">Primary</th>
              <th className="px-2 py-1.5 text-left font-semibold text-gray-600 w-[15%]">수정일</th>
            </tr>
          </thead>
          <tbody>
            {pfdList.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-6 text-gray-400">등록된 PFD가 없습니다.</td></tr>
            ) : (
              pfdList.map((pfd, idx) => (
                <tr key={pfd.id} className="border-b hover:bg-blue-50/50" style={{ height: ROW_HEIGHT }}>
                  <td className="px-2">{idx + 1}</td>
                  <td className="px-2 font-mono text-blue-700">{pfd.pfdNo}</td>
                  <td className="px-2">{pfd.pfdName}</td>
                  <td className="px-2 text-center">
                    {pfd.isPrimary && (
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-semibold">
                        Primary
                      </span>
                    )}
                  </td>
                  <td className="px-2 text-gray-500">
                    {pfd.updatedAt ? new Date(pfd.updatedAt).toLocaleDateString('ko-KR') : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 개정이력 탭 ───

function RevisionTab({ revisions }: { revisions: RevisionItem[] }) {
  return (
    <div>
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
    </div>
  );
}

// ─── 메인 페이지 ───

export default function FamilyFmeaDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [detail, setDetail] = useState<FamilyFmeaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/family-fmea/${id}`);
      if (!res.ok) throw new Error(`API 오류: ${res.status}`);
      const data = await res.json();
      setDetail(data);
    } catch (error) {
      console.error('Family FMEA 상세 로드 실패:', error);
      toast.error('Family FMEA 상세 정보를 불러오는데 실패했습니다.');
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
      const res = await fetch(`/api/family-fmea/${detail.id}/action`, {
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

  if (loading) {
    return (
      <FixedLayout>
        <FamilyTopNav />
        <div className="pt-10 flex items-center justify-center h-64 text-gray-400">로딩 중...</div>
      </FixedLayout>
    );
  }

  if (!detail) {
    return (
      <FixedLayout>
        <FamilyTopNav />
        <div className="pt-10 flex items-center justify-center h-64 text-gray-400">
          Family FMEA를 찾을 수 없습니다.
        </div>
      </FixedLayout>
    );
  }

  return (
    <FixedLayout>
      <FamilyTopNav />
      <div className="pt-10 px-4 pb-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { window.location.href = '/pfmea/family/list'; }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              &larr; 목록
            </button>
            <h1 className="text-lg font-bold text-gray-800">{detail.processName}</h1>
            <StatusBadge status={detail.status} />
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-1.5">
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
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
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
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 탭 컨텐츠 */}
        {activeTab === 'info' && <InfoTab detail={detail} />}
        {activeTab === 'cp' && <CpTab cpList={detail.cpList || []} />}
        {activeTab === 'pfd' && <PfdTab pfdList={detail.pfdList || []} />}
        {activeTab === 'revision' && <RevisionTab revisions={detail.revisions || []} />}
      </div>
    </FixedLayout>
  );
}
