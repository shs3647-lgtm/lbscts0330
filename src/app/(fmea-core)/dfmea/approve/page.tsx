/**
 * @file /dfmea/approve/page.tsx
 * @description FMEA 결재 페이지 (이메일 링크에서 접속)
 * @created 2026-01-19
 */

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// ============================================================================
// 타입 정의
// ============================================================================

interface ApprovalPayload {
  fmeaId: string;
  revisionId: string;
  revisionNumber: string;
  approvalType: 'CREATE' | 'REVIEW' | 'APPROVE';
  approverEmail: string;
  approverName: string;
  requesterId: string;
  requesterName: string;
  createdAt: number;
  expiresAt: number;
}

// ============================================================================
// 결재 페이지 컴포넌트
// ============================================================================

function ApprovePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<ApprovalPayload | null>(null);
  const [processing, setProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [result, setResult] = useState<'APPROVED' | 'REJECTED' | null>(null);
  
  // 토큰 검증
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('결재 토큰이 없습니다. 이메일 링크를 다시 확인해주세요.');
        setLoading(false);
        return;
      }
      
      try {
        const res = await fetch(`/api/fmea/approval?token=${token}`);
        const data = await res.json();
        
        if (!data.success) {
          setError(data.error || '유효하지 않은 결재 요청입니다.');
        } else {
          setPayload(data.approval);
        }
      } catch (err) {
        setError('결재 정보를 확인하는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };
    
    verifyToken();
  }, [token]);
  
  // 결재 처리
  const handleApproval = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && !rejectReason.trim()) {
      alert('반려 사유를 입력해주세요.');
      return;
    }
    
    setProcessing(true);
    
    try {
      const res = await fetch('/api/fmea/approval', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action,
          rejectReason: action === 'reject' ? rejectReason : undefined,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setResult(action === 'approve' ? 'APPROVED' : 'REJECTED');
        setShowRejectModal(false);
      } else {
        alert(`결재 처리 실패: ${data.error}`);
      }
    } catch (err) {
      alert('결재 처리 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };
  
  // 로딩 중
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">결재 정보를 확인하고 있습니다...</p>
        </div>
      </div>
    );
  }
  
  // 에러
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">결재 오류</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/pfmea')}
            className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            메인으로 이동
          </button>
        </div>
      </div>
    );
  }
  
  // 결재 완료
  if (result) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">{result === 'APPROVED' ? '✅' : '❌'}</div>
          <h1 className={`text-2xl font-bold mb-4 ${result === 'APPROVED' ? 'text-green-600' : 'text-red-600'}`}>
            결재 {result === 'APPROVED' ? '승인' : '반려'} 완료
          </h1>
          <p className="text-gray-600 mb-6">
            {result === 'APPROVED' 
              ? '결재가 승인되었습니다. 관련자에게 알림이 발송됩니다.'
              : '결재가 반려되었습니다. 요청자에게 알림이 발송됩니다.'}
          </p>
          <div className="space-y-2">
            <button
              onClick={() => router.push(`/dfmea/revision?id=${payload?.fmeaId}`)}
              className="w-full px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              개정이력 보기
            </button>
            <button
              onClick={() => window.close()}
              className="w-full px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              창 닫기
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // 결재 화면
  const approvalTypeLabels = {
    CREATE: { label: '작성', color: 'bg-blue-500' },
    REVIEW: { label: '검토', color: 'bg-yellow-500' },
    APPROVE: { label: '승인', color: 'bg-green-500' },
  };
  
  const typeInfo = payload ? approvalTypeLabels[payload.approvalType] : { label: '', color: '' };
  
  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="bg-[#00587a] text-white rounded-t-lg p-6 text-center">
          <h1 className="text-2xl font-bold">📋 FMEA 결재 요청</h1>
          <p className="text-gray-200 mt-2">아래 내용을 확인하고 결재해주세요</p>
        </div>
        
        {/* 결재 정보 */}
        <div className="bg-white shadow-lg p-6">
          <table className="w-full">
            <tbody>
              <tr className="border-b">
                <td className="py-3 px-4 font-semibold text-gray-600 w-32">FMEA ID</td>
                <td className="py-3 px-4 font-mono text-blue-600">{payload?.fmeaId}</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4 font-semibold text-gray-600">개정번호</td>
                <td className="py-3 px-4">{payload?.revisionNumber}</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4 font-semibold text-gray-600">결재 유형</td>
                <td className="py-3 px-4">
                  <span className={`px-3 py-1 rounded text-white text-sm ${typeInfo.color}`}>
                    {typeInfo.label}
                  </span>
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4 font-semibold text-gray-600">요청자</td>
                <td className="py-3 px-4">{payload?.requesterName}</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4 font-semibold text-gray-600">결재자</td>
                <td className="py-3 px-4">{payload?.approverName}</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-gray-600">요청일시</td>
                <td className="py-3 px-4 text-gray-500">
                  {payload ? new Date(payload.createdAt).toLocaleString('ko-KR') : '-'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* 결재 버튼 */}
        <div className="bg-gray-50 rounded-b-lg p-6 flex gap-4 justify-center">
          <button
            onClick={() => handleApproval('approve')}
            disabled={processing}
            className="px-8 py-3 bg-green-500 text-white rounded-lg font-bold text-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {processing ? '처리 중...' : '✅ 승인'}
          </button>
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={processing}
            className="px-8 py-3 bg-red-500 text-white rounded-lg font-bold text-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            ❌ 반려
          </button>
        </div>
        
        {/* FMEA 상세 보기 링크 */}
        <div className="mt-4 text-center">
          <a
            href={`/dfmea/worksheet?id=${payload?.fmeaId}`}
            target="_blank"
            className="text-blue-600 hover:underline"
          >
            📄 FMEA 워크시트 상세 보기 →
          </a>
        </div>
      </div>
      
      {/* 반려 사유 모달 */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-red-600 mb-4">❌ 반려 사유 입력</h2>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="반려 사유를 입력해주세요..."
              className="w-full h-32 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => handleApproval('reject')}
                disabled={processing || !rejectReason.trim()}
                className="flex-1 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
              >
                {processing ? '처리 중...' : '반려 확정'}
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 메인 컴포넌트 (Suspense 래퍼)
// ============================================================================

export default function ApprovePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    }>
      <ApprovePageContent />
    </Suspense>
  );
}
