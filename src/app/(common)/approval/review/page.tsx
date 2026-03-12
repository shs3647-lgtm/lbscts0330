/**
 * @file /approval/review/page.tsx
 * @description 이메일 링크를 통한 결재 처리 페이지 (실제 DB 연동)
 * @fixed 2026-03-12 — 더미 데이터 → /api/fmea/approval 실데이터 연동
 */

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function ApprovalReviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [approvalData, setApprovalData] = useState<any>(null);
  const [comments, setComments] = useState('');
  const [error, setError] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      loadApprovalData();
    } else {
      setError('결재 토큰이 없습니다.');
      setLoading(false);
    }
  }, [token]);

  const loadApprovalData = async () => {
    try {
      const res = await fetch(`/api/fmea/approval?token=${encodeURIComponent(token!)}`);
      const data = await res.json();

      if (!data.success || !data.approval) {
        setError(data.error || '결재 정보를 불러올 수 없습니다.');
        setLoading(false);
        return;
      }

      setApprovalData(data.approval);
    } catch (err) {
      console.error('[결재 리뷰] 데이터 로드 실패:', err);
      setError('결재 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (decision: 'approve' | 'reject') => {
    if (decision === 'reject' && !comments.trim()) {
      alert('반려 사유를 입력해주세요.');
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/fmea/approval', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action: decision, rejectReason: comments }),
      });

      const data = await response.json();

      if (data.success) {
        alert(decision === 'approve' ? '✅ 승인되었습니다.' : '❌ 반려되었습니다.');
        if (approvalData?.fmeaId) {
          router.push(`/pfmea/revision?id=${approvalData.fmeaId}`);
        } else {
          router.push('/welcomeboard');
        }
      } else {
        throw new Error(data.error || '결재 처리 실패');
      }
    } catch (err: any) {
      alert(`결재 처리 중 오류: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4">결재 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <div className="text-center">
            <span className="text-6xl">⚠️</span>
            <h2 className="text-xl font-bold text-red-600 mt-4">{error}</h2>
            <button
              onClick={() => router.push('/welcomeboard')}
              className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              메인으로 이동
            </button>
          </div>
        </div>
      </div>
    );
  }

  const approvalType = approvalData?.approvalType || '';
  const stepLabel = approvalType === 'CREATE' ? '작성 상신' : approvalType === 'REVIEW' ? '검토' : '최종 승인';

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-[#00587a] text-white rounded-t-lg p-6">
          <h1 className="text-2xl font-bold">📋 FMEA {stepLabel} 요청</h1>
          <p className="text-sm mt-2 text-gray-200">이메일 링크를 통한 결재 처리</p>
        </div>

        <div className="bg-white shadow-lg rounded-b-lg">
          <div className="p-6 border-b">
            <h2 className="text-lg font-bold mb-4">📄 결재 정보</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">FMEA ID</label>
                <p className="font-semibold">{approvalData?.fmeaId || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">개정번호</label>
                <p className="font-semibold">{approvalData?.revisionNumber || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">결재 단계</label>
                <p className="font-semibold">{stepLabel}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">요청자</label>
                <p className="font-semibold">{approvalData?.requesterName || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">결재자</label>
                <p className="font-semibold">{approvalData?.approverName || approvalData?.approverEmail || '-'}</p>
              </div>
            </div>
          </div>

          <div className="p-6 border-b">
            <h2 className="text-lg font-bold mb-4">💬 결재 의견</h2>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full p-3 border rounded-lg h-32 resize-none"
              placeholder="검토 의견을 입력해주세요. (반려 시 필수)"
            />
          </div>

          <div className="p-6 bg-gray-50 flex justify-center gap-4">
            <button
              onClick={() => handleApproval('approve')}
              disabled={processing}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold text-lg"
            >
              {processing ? '처리 중...' : '✅ 승인'}
            </button>
            <button
              onClick={() => handleApproval('reject')}
              disabled={processing}
              className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-semibold text-lg"
            >
              {processing ? '처리 중...' : '❌ 반려'}
            </button>
            {approvalData?.fmeaId && (
              <button
                onClick={() => router.push(`/pfmea/worksheet?id=${approvalData.fmeaId}`)}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg"
              >
                📄 상세보기
              </button>
            )}
          </div>

          <div className="p-6 bg-yellow-50 border-t border-yellow-200">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ 주의사항:</strong><br/>
              • 결재 후에는 취소할 수 없으니 신중히 검토해주세요.<br/>
              • 반려 시에는 반드시 사유를 입력해야 합니다.<br/>
              • 이 링크는 7일 후 자동으로 만료됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ApprovalReviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <ApprovalReviewContent />
    </Suspense>
  );
}
