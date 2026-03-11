/**
 * @file /approval/review/page.tsx
 * @description 이메일 링크를 통한 결재 처리 페이지
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
  const type = searchParams.get('type'); // 'review' | 'approve'
  const action = searchParams.get('action'); // 'approve' | 'reject' | 'view'

  useEffect(() => {
    if (token) {
      loadApprovalData();
    }
  }, [token]);

  const loadApprovalData = async () => {
    try {
      // 토큰 디코드
      const decodedToken = atob(token!);
      const [approvalId, approverId, timestamp] = decodedToken.split(':');

      // 24시간 유효성 검증
      const tokenAge = Date.now() - parseInt(timestamp);
      if (tokenAge > 24 * 60 * 60 * 1000) {
        setError('결재 링크가 만료되었습니다. (24시간 초과)');
        setLoading(false);
        return;
      }

      // 실제로는 API를 통해 데이터를 가져와야 함
      // 여기서는 더미 데이터 사용
      setApprovalData({
        approvalId,
        approverId,
        fmeaType: 'DFMEA',
        fmeaTitle: '자동차 도어 시스템 FMEA 분석',
        projectName: '2026년 신차 프로젝트',
        requesterName: '김철수',
        requesterEmail: 'kim@company.com',
        requestDate: '2026-01-23',
        dueDate: '2026-01-30',
        status: 'pending',
        currentStep: type === 'review' ? '검토' : '승인',
        details: {
          totalItems: 45,
          highRiskItems: 5,
          mediumRiskItems: 12,
          lowRiskItems: 28,
          completionRate: 85
        }
      });
    } catch (error) {
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
      // API 호출 (실제 구현 필요)
      const response = await fetch('/api/approval/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalId: approvalData.approvalId,
          approverId: approvalData.approverId,
          decision,
          comments,
          type
        })
      });

      if (response.ok) {
        alert(decision === 'approve' ? '✅ 승인되었습니다.' : '❌ 반려되었습니다.');
        router.push('/approval/complete');
      } else {
        throw new Error('결재 처리 실패');
      }
    } catch (error) {
      alert('결재 처리 중 오류가 발생했습니다.');
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

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* 헤더 */}
        <div className="bg-[#00587a] text-white rounded-t-lg p-6">
          <h1 className="text-2xl font-bold">
            📋 FMEA {type === 'review' ? '검토' : '승인'} 요청
          </h1>
          <p className="text-sm mt-2 text-gray-200">
            이메일 링크를 통한 결재 처리
          </p>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="bg-white shadow-lg rounded-b-lg">
          {/* FMEA 정보 */}
          <div className="p-6 border-b">
            <h2 className="text-lg font-bold mb-4">📄 FMEA 정보</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">FMEA 유형</label>
                <p className="font-semibold">{approvalData.fmeaType}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">프로젝트</label>
                <p className="font-semibold">{approvalData.projectName}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">제목</label>
                <p className="font-semibold">{approvalData.fmeaTitle}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">요청자</label>
                <p className="font-semibold">
                  {approvalData.requesterName} ({approvalData.requesterEmail})
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">요청일</label>
                <p className="font-semibold">
                  {new Date(approvalData.requestDate).toLocaleDateString('ko-KR')}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">처리 기한</label>
                <p className="font-semibold text-red-600">
                  {new Date(approvalData.dueDate).toLocaleDateString('ko-KR')}
                </p>
              </div>
            </div>
          </div>

          {/* 분석 요약 */}
          <div className="p-6 border-b">
            <h2 className="text-lg font-bold mb-4">📊 분석 요약</h2>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded text-center">
                <p className="text-2xl font-bold text-gray-700">
                  {approvalData.details.totalItems}
                </p>
                <p className="text-sm text-gray-600">전체 항목</p>
              </div>
              <div className="bg-red-50 p-4 rounded text-center">
                <p className="text-2xl font-bold text-red-600">
                  {approvalData.details.highRiskItems}
                </p>
                <p className="text-sm text-gray-600">고위험</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {approvalData.details.mediumRiskItems}
                </p>
                <p className="text-sm text-gray-600">중위험</p>
              </div>
              <div className="bg-green-50 p-4 rounded text-center">
                <p className="text-2xl font-bold text-green-600">
                  {approvalData.details.lowRiskItems}
                </p>
                <p className="text-sm text-gray-600">저위험</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span>완성도</span>
                <span className="font-semibold">{approvalData.details.completionRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full"
                  style={{ width: `${approvalData.details.completionRate}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* 결재 의견 */}
          <div className="p-6 border-b">
            <h2 className="text-lg font-bold mb-4">💬 결재 의견</h2>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full p-3 border rounded-lg h-32 resize-none"
              placeholder={
                action === 'reject'
                  ? '반려 사유를 입력해주세요. (필수)'
                  : '검토 의견을 입력해주세요. (선택)'
              }
            />
          </div>

          {/* 결재 버튼 */}
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
            <button
              onClick={() => router.push(`/${approvalData.fmeaType.toLowerCase()}/worksheet`)}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg"
            >
              📄 상세보기
            </button>
          </div>

          {/* 안내 메시지 */}
          <div className="p-6 bg-yellow-50 border-t border-yellow-200">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ 주의사항:</strong><br/>
              • 결재 후에는 취소할 수 없으니 신중히 검토해주세요.<br/>
              • 반려 시에는 반드시 사유를 입력해야 합니다.<br/>
              • 이 링크는 24시간 후 자동으로 만료됩니다.
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