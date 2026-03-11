/**
 * @file /components/ApprovalTestButton.tsx
 * @description 결재 이메일 발송 테스트 버튼 컴포넌트
 */

'use client';

import React, { useState } from 'react';

export default function ApprovalTestButton() {
  const [showModal, setShowModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    approverEmail: '',
    approverName: '',
    fmeaTitle: '자동차 도어 시스템 FMEA 분석',
    fmeaType: 'DFMEA',
    approvalType: 'review' as 'review' | 'approve',
    comments: '검토 요청드립니다.'
  });

  const handleSendTestEmail = async () => {
    if (!formData.approverEmail || !formData.approverName) {
      alert('결재자 이름과 이메일을 입력해주세요.');
      return;
    }

    setSending(true);
    try {
      const testData = {
        approvalId: 'TEST-' + Date.now(),
        fmeaType: formData.fmeaType,
        fmeaTitle: formData.fmeaTitle,
        requesterName: '테스트 요청자',
        requesterEmail: 'test@company.com',
        approverId: 'APPROVER-' + Date.now(),
        approverName: formData.approverName,
        approverEmail: formData.approverEmail,
        approvalType: formData.approvalType,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7일 후
        comments: formData.comments
      };

      const response = await fetch('/api/approval/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ 테스트 이메일이 ${formData.approverEmail}로 발송되었습니다.\n\n이메일에서 링크를 클릭하여 결재를 진행할 수 있습니다.`);
        setShowModal(false);
      } else {
        throw new Error(result.error || '이메일 발송 실패');
      }
    } catch (error) {
      alert(`❌ 이메일 발송 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}\n\nSMTP 설정을 확인해주세요.`);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        📧 결재 이메일 테스트
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">📧 결재 이메일 발송 테스트</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">결재자 이름</label>
                <input
                  type="text"
                  value={formData.approverName}
                  onChange={(e) => setFormData({ ...formData, approverName: e.target.value })}
                  placeholder="홍길동"
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">결재자 이메일</label>
                <input
                  type="email"
                  value={formData.approverEmail}
                  onChange={(e) => setFormData({ ...formData, approverEmail: e.target.value })}
                  placeholder="approver@company.com"
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">FMEA 유형</label>
                <select
                  value={formData.fmeaType}
                  onChange={(e) => setFormData({ ...formData, fmeaType: e.target.value })}
                  className="w-full p-2 border rounded"
                >
                  <option value="DFMEA">DFMEA (설계)</option>
                  <option value="PFMEA">PFMEA (공정)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">FMEA 제목</label>
                <input
                  type="text"
                  value={formData.fmeaTitle}
                  onChange={(e) => setFormData({ ...formData, fmeaTitle: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">결재 단계</label>
                <select
                  value={formData.approvalType}
                  onChange={(e) => setFormData({ ...formData, approvalType: e.target.value as 'review' | 'approve' })}
                  className="w-full p-2 border rounded"
                >
                  <option value="review">검토 요청</option>
                  <option value="approve">승인 요청</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">요청 메시지</label>
                <textarea
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  className="w-full p-2 border rounded h-20 resize-none"
                />
              </div>
            </div>

            <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
              <strong>📌 참고:</strong><br/>
              • SMTP 설정이 완료되어야 이메일이 발송됩니다.<br/>
              • 관리자 &gt; 설정 &gt; 결재 설정에서 SMTP를 설정하세요.<br/>
              • 발송된 이메일의 링크는 24시간 동안 유효합니다.
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleSendTestEmail}
                disabled={sending}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {sending ? '발송 중...' : '이메일 발송'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}