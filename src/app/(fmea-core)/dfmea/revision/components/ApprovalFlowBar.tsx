/**
 * @file ApprovalFlowBar.tsx
 * @description 결재 진행 바 — 상신→검토→승인 3단계 온프레미스 결재 플로우
 * - 작성자: 상신 (검토자에게 이메일 발송)
 * - 검토자: 승인/반려 (승인자/작성자에게 이메일 발송)
 * - 승인자: 승인/반려 (작성자에게 이메일 발송)
 * @module pfmea/revision/components
 * @created 2026-02-19
 *
 * @status CODEFREEZE L4 (Gold) 🔒
 * @freeze_level L4 (Critical - Gold Test Passed)
 * @frozen_date 2026-03-02
 * @gold_tag v4.0.0-gold
 * @allowed_changes NONE — 사용자 명시적 승인 + full test pass 필수
 */

'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { RevisionRecord } from '../types';

interface ApprovalFlowBarProps {
  revisions: RevisionRecord[];
  updateField: (id: string, field: keyof RevisionRecord, value: string) => void;
  onSave: () => Promise<void>;
  onRequestSave?: () => void;  // ★ 렌더 완료 후 저장 보장 (stale closure 방지)
  onUserSelect?: (revisionId: string, type: 'create' | 'review' | 'approve') => void;
  onAddRevision?: () => void;
  onStartNewRevision?: () => void;
  fmeaId?: string;
  fmeaName?: string;
}

type ApprovalStep = 'create' | 'review' | 'approve';

const STEP_CONFIG: { key: ApprovalStep; label: string; actionLabel: string; statusField: keyof RevisionRecord; nameField: keyof RevisionRecord; positionField: keyof RevisionRecord; dateField: keyof RevisionRecord }[] = [
  { key: 'create', label: '작성(Author)', actionLabel: '상신(Submit)', statusField: 'createStatus', nameField: 'createName', positionField: 'createPosition', dateField: 'createDate' },
  { key: 'review', label: '검토(Review)', actionLabel: '검토 승인(Review Approve)', statusField: 'reviewStatus', nameField: 'reviewName', positionField: 'reviewPosition', dateField: 'reviewDate' },
  { key: 'approve', label: '승인(Approve)', actionLabel: '최종 승인(Final Approve)', statusField: 'approveStatus', nameField: 'approveName', positionField: 'approvePosition', dateField: 'approveDate' },
];

const STEP_ORDER: ApprovalStep[] = ['create', 'review', 'approve'];

// 이메일 알림 발송 (비동기, 실패해도 결재 진행에 영향 없음)
async function sendEmailNotify(params: {
  type: 'submit' | 'review_approve' | 'final_approve' | 'reject';
  revisionNumber: string;
  fmeaName: string;
  fmeaId: string;
  fromName: string;
  fromPosition: string;
  toName: string;
  toPosition: string;
  reason?: string;
}): Promise<{ success: boolean; previewUrl?: string }> {
  try {
    const res = await fetch('/api/fmea/email-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await res.json();
  } catch {
    return { success: false };
  }
}

export function ApprovalFlowBar({ revisions, updateField, onSave, onRequestSave, onUserSelect, onAddRevision, onStartNewRevision, fmeaId, fmeaName }: ApprovalFlowBarProps) {
  const today = new Date().toISOString().split('T')[0];
  const [emailStatus, setEmailStatus] = useState<string>('');

  // ★ 저장 트리거: requestSave 우선 (렌더 후 저장 보장), 없으면 setTimeout 폴백
  const triggerSave = useCallback(() => {
    if (onRequestSave) {
      onRequestSave();
    } else {
      setTimeout(() => onSave(), 300);
    }
  }, [onRequestSave, onSave]);

  // 결재 대상 개정 — 우선순위: 진행중 > 최근승인(기록보존) > 첫 미완료
  const activeRevision = useMemo(() => {
    if (revisions.length === 0) return null;
    // 1. 진행 중(createStatus 있음)인 미완료 개정 우선
    const inProgress = revisions.filter(r => r.approveStatus !== '승인' && r.createStatus);
    if (inProgress.length > 0) return inProgress[0];
    // 2. ★ 최근 승인 완료된 개정 (승인일자/사유 기록 보존)
    const approved = revisions.filter(r => r.approveStatus === '승인');
    if (approved.length > 0) return approved[approved.length - 1];
    // 3. 첫 번째 미완료 개정
    const incomplete = revisions.filter(r => r.approveStatus !== '승인');
    if (incomplete.length > 0) return incomplete[0];
    return revisions[revisions.length - 1];
  }, [revisions]);

  // 현재 활성 단계 판별 — 반려 시 작성자 단계로 복귀
  const currentStep: ApprovalStep | 'done' = useMemo(() => {
    if (!activeRevision) return 'create';
    if (activeRevision.approveStatus === '승인') return 'done';
    // 승인 반려 → 작성자 재상신 필요
    if (activeRevision.approveStatus === '반려') return 'create';
    if (activeRevision.reviewStatus === '승인') return 'approve';
    // 검토 반려 → 작성자 재상신 필요
    if (activeRevision.reviewStatus === '반려') return 'create';
    // createStatus: '상신' 또는 '승인' (하위호환)
    if (activeRevision.createStatus === '상신' || activeRevision.createStatus === '승인') return 'review';
    return 'create';
  }, [activeRevision]);

  const isFullyApproved = activeRevision?.approveStatus === '승인';

  // ★ 상신 처리 (작성자 → 검토자에게 이메일 발송)
  const handleSubmit = useCallback(async () => {
    if (!activeRevision) return;
    const createName = activeRevision.createName as string;
    if (!createName) {
      alert('작성자를 먼저 지정해주세요.\n이름을 클릭하여 선택하세요.');
      return;
    }
    const reviewName = activeRevision.reviewName as string;
    if (!reviewName) {
      alert('검토자를 먼저 지정해주세요.\n이름을 클릭하여 선택하세요.');
      return;
    }

    // ★ 개정이력(개정사유) 미입력 시 상신 차단
    const currentHistory = (activeRevision.revisionHistory || '').trim();
    if (!currentHistory) {
      alert('개정사유를 먼저 입력해주세요.\n\n개정이력 테이블의 "개정이력" 칸에 개정사유를 입력한 후 상신하세요.');
      return;
    }

    const reason = prompt(`상신 사유를 입력하세요:\n(작성자: ${createName} → 검토자: ${reviewName})`);
    if (reason === null) return;

    updateField(activeRevision.id, 'createStatus', '상신');
    updateField(activeRevision.id, 'createDate', today);

    // 재상신 시 이전 반려 상태 초기화
    if (activeRevision.reviewStatus === '반려') {
      updateField(activeRevision.id, 'reviewStatus', '');
      updateField(activeRevision.id, 'reviewDate', '');
    }
    if (activeRevision.approveStatus === '반려') {
      updateField(activeRevision.id, 'approveStatus', '');
      updateField(activeRevision.id, 'approveDate', '');
    }

    triggerSave();

    // 이메일 발송 (검토자에게)
    setEmailStatus('발송 중...');
    const emailResult = await sendEmailNotify({
      type: 'submit',
      revisionNumber: activeRevision.revisionNumber,
      fmeaName: fmeaName || fmeaId || '',
      fmeaId: fmeaId || '',
      fromName: createName,
      fromPosition: activeRevision.createPosition as string || '',
      toName: reviewName,
      toPosition: activeRevision.reviewPosition as string || '',
      reason: reason || undefined,
    });

    if (emailResult.success && emailResult.previewUrl) {
      setEmailStatus('');
      if (confirm(`검토 요청 이메일 발송 완료!\n\n미리보기 URL을 열어 확인하시겠습니까?`)) {
        window.open(emailResult.previewUrl, '_blank');
      }
    } else {
      setEmailStatus(emailResult.success ? '발송 완료' : '발송 실패');
      setTimeout(() => setEmailStatus(''), 3000);
    }
  }, [activeRevision, updateField, triggerSave, today, fmeaId, fmeaName]);

  // ★ 회수 처리 (상신 취소 — 검토자 미처리 시에만)
  const handleRecall = useCallback(async () => {
    if (!activeRevision) return;
    if (!confirm('상신을 회수하시겠습니까?\n\n검토자가 아직 처리하지 않은 경우에만 회수 가능합니다.')) return;

    // API 호출 (PENDING → RECALLED) — 보조 수단, 실패해도 로컬 상태는 롤백
    try {
      const res = await fetch('/api/fmea/approval', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fmeaId, revisionId: activeRevision.id }),
      });
      const data = await res.json();
      if (!data.success) {
        console.warn('[회수] API 결과:', data.error);
      }
    } catch (err) {
      console.warn('[회수] API 호출 실패 (온프레미스 DB 미설정 가능):', err);
    }

    // 로컬 상태 롤백 (주 데이터 — API 성공 여부와 무관하게 항상 실행)
    updateField(activeRevision.id, 'createStatus', '진행');
    triggerSave();
    alert('상신이 회수되었습니다.');
  }, [activeRevision, updateField, triggerSave, fmeaId]);

  // ★ 검토자 회수 (검토 승인 후, 승인자 미처리 시에만)
  const handleReviewRecall = useCallback(() => {
    if (!activeRevision) return;
    if (!confirm('검토 승인을 회수하시겠습니까?\n\n승인자가 아직 처리하지 않은 경우에만 회수 가능합니다.')) return;

    updateField(activeRevision.id, 'reviewStatus', '');
    updateField(activeRevision.id, 'reviewDate', '');
    triggerSave();
    alert('검토 승인이 회수되었습니다.');
  }, [activeRevision, updateField, triggerSave]);

  // ★ 승인 처리 (검토/승인 단계 — 다음 단계에 이메일 발송)
  const handleApprove = useCallback(async (step: ApprovalStep) => {
    if (!activeRevision) return;
    const config = STEP_CONFIG.find(s => s.key === step)!;
    const name = activeRevision[config.nameField] as string;

    if (!name) {
      alert(`${config.label}자를 먼저 지정해주세요.\n이름을 클릭하여 선택하세요.`);
      return;
    }

    const reason = prompt(`${config.actionLabel} 사유를 입력하세요:\n(${config.label}자: ${name})`);
    if (reason === null) return;

    updateField(activeRevision.id, config.statusField, '승인');
    updateField(activeRevision.id, config.dateField, today);

    // 최종 승인 시 개정일자 확정 + 개정번호 승격 (0.XX → N.00)
    if (step === 'approve') {
      updateField(activeRevision.id, 'revisionDate', today);
      const approvedCount = revisions.filter(r => r.approveStatus === '승인').length;
      updateField(activeRevision.id, 'revisionNumber', `${approvedCount + 1}.00`);
    }
    triggerSave();

    // 이메일 발송
    setEmailStatus('발송 중...');
    let emailType: 'review_approve' | 'final_approve' = 'review_approve';
    let toName = '';
    let toPosition = '';

    if (step === 'review') {
      emailType = 'review_approve';
      toName = activeRevision.approveName as string || '';
      toPosition = activeRevision.approvePosition as string || '';
    } else if (step === 'approve') {
      emailType = 'final_approve';
      toName = activeRevision.createName as string || '';
      toPosition = activeRevision.createPosition as string || '';
    }

    if (toName) {
      const emailResult = await sendEmailNotify({
        type: emailType,
        revisionNumber: activeRevision.revisionNumber,
        fmeaName: fmeaName || fmeaId || '',
        fmeaId: fmeaId || '',
        fromName: name,
        fromPosition: activeRevision[config.positionField] as string || '',
        toName,
        toPosition,
        reason: reason || undefined,
      });

      if (emailResult.success && emailResult.previewUrl) {
        setEmailStatus('');
        const label = step === 'review' ? '승인 요청' : '결재 완료 알림';
        if (confirm(`${label} 이메일 발송 완료!\n\n미리보기 URL을 열어 확인하시겠습니까?`)) {
          window.open(emailResult.previewUrl, '_blank');
        }
      } else {
        setEmailStatus(emailResult.success ? '발송 완료' : '발송 실패');
        setTimeout(() => setEmailStatus(''), 3000);
      }
    } else {
      setEmailStatus('');
    }
  }, [activeRevision, updateField, triggerSave, today, fmeaId, fmeaName]);

  // ★ 반려 처리 — 반려 시 작성자 단계로 복귀 (createStatus='진행')
  const handleReject = useCallback(async (step: ApprovalStep) => {
    if (!activeRevision) return;
    const config = STEP_CONFIG.find(s => s.key === step)!;
    const name = activeRevision[config.nameField] as string;
    const reason = prompt(`${config.label} 반려 사유를 입력하세요:`);
    if (!reason) return;

    updateField(activeRevision.id, config.statusField, '반려');
    updateField(activeRevision.id, config.dateField, today);

    // 반려 시 작성자 상태를 '진행'으로 리셋 → 재상신 가능
    updateField(activeRevision.id, 'createStatus', '진행');
    updateField(activeRevision.id, 'createDate', '');
    triggerSave();

    // 반려 이메일 → 작성자에게
    const toName = activeRevision.createName as string || '';
    if (toName && name) {
      setEmailStatus('발송 중...');
      const emailResult = await sendEmailNotify({
        type: 'reject',
        revisionNumber: activeRevision.revisionNumber,
        fmeaName: fmeaName || fmeaId || '',
        fmeaId: fmeaId || '',
        fromName: name,
        fromPosition: activeRevision[config.positionField] as string || '',
        toName,
        toPosition: activeRevision.createPosition as string || '',
        reason,
      });

      if (emailResult.success && emailResult.previewUrl) {
        setEmailStatus('');
        if (confirm(`반려 알림 이메일 발송 완료!\n\n미리보기 URL을 열어 확인하시겠습니까?`)) {
          window.open(emailResult.previewUrl, '_blank');
        }
      } else {
        setEmailStatus(emailResult.success ? '발송 완료' : '발송 실패');
        setTimeout(() => setEmailStatus(''), 3000);
      }
    }
  }, [activeRevision, updateField, triggerSave, today, fmeaId, fmeaName]);

  // 단계별 상태 뱃지
  const getStepStatus = useCallback((step: ApprovalStep): { status: string; color: string } => {
    if (!activeRevision) return { status: '대기', color: 'bg-gray-300 text-gray-600' };
    const config = STEP_CONFIG.find(s => s.key === step)!;
    const status = activeRevision[config.statusField] as string;
    switch (status) {
      case '상신': return { status: '상신', color: 'bg-blue-500 text-white' };
      case '승인': return { status: '승인', color: 'bg-green-500 text-white' };
      case '반려': return { status: '반려', color: 'bg-red-500 text-white' };
      case '진행': return { status: '진행', color: 'bg-amber-400 text-white' };
      case '확정': return { status: '확정', color: 'bg-blue-500 text-white' };
      default: return { status: '대기', color: 'bg-gray-300 text-gray-600' };
    }
  }, [activeRevision]);

  if (!activeRevision) return null;

  return (
    <div className="rounded-lg overflow-hidden border border-gray-400 bg-white">
      {/* 헤더 바 — 결재 진행 + 개정번호 + 완료/이메일 상태 + 완료 시 버튼 */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#00587a] text-white">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold" title="Approval Progress">결재 진행(Approval)</span>
          <button
            onClick={() => alert(
              '📋 결재 진행 도움말\n\n' +
              '【 결재 3단계 】\n' +
              '1. 작성(상신): 작성자가 검토를 요청합니다\n' +
              '2. 검토(승인/반려): 검토자가 내용을 확인합니다\n' +
              '3. 승인(최종): 승인자가 최종 결재합니다\n\n' +
              '【 담당자 지정 】\n' +
              '• 각 단계의 이름을 클릭하여 담당자를 선택/변경\n' +
              '• 지정 후에도 다시 클릭하면 변경 가능\n\n' +
              '【 회수 】\n' +
              '• 상신 후 → 검토자 처리 전 회수 가능\n' +
              '• 검토 승인 후 → 승인자 처리 전 회수 가능\n\n' +
              '【 반려 시 】\n' +
              '• 작성자 단계로 복귀 → 수정 후 재상신\n\n' +
              '【 결재 완료 후 】\n' +
              '• "이력추가": 현재 개정에 변경 내역 추가\n' +
              '• "REV N+1": 새 개정 버전 시작'
            )}
            className="w-4 h-4 flex items-center justify-center text-[9px] bg-white/20 rounded-full hover:bg-white/30 cursor-pointer"
            title="결재 도움말(Approval Help)"
          >
            ?
          </button>
          <span className="text-[9px] px-1.5 py-0.5 bg-white/20 rounded">
            {activeRevision.revisionNumber}
          </span>
          {emailStatus && (
            <span className="text-[9px] px-1.5 py-0.5 bg-amber-400 text-amber-900 rounded animate-pulse">
              {emailStatus}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isFullyApproved && (
            <>
              <span className="text-[9px] px-2 py-0.5 bg-green-400 text-green-900 rounded-full font-bold">
                결재 완료(Approved)
              </span>
              {onAddRevision && (
                <button
                  onClick={onAddRevision}
                  className="px-2 py-0.5 text-[9px] font-bold bg-gray-100 text-gray-700 border border-gray-300 rounded hover:bg-gray-200 cursor-pointer"
                >
                  이력추가(Add History)
                </button>
              )}
              {onStartNewRevision && (
                <button
                  onClick={onStartNewRevision}
                  className="px-2 py-0.5 text-[9px] font-bold bg-blue-100 text-blue-700 border border-blue-300 rounded hover:bg-blue-200 cursor-pointer flex items-center gap-1"
                >
                  REV N+1
                  <span className="px-1 py-0 text-[7px] bg-green-500 text-white rounded leading-[12px]">적용(Apply)</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 결재 3단계 — 컴팩트 가로 레이아웃 */}
      <div className="px-2 py-1.5 flex items-stretch gap-1">
        {STEP_ORDER.map((step, idx) => {
          const config = STEP_CONFIG[idx];
          const { status, color } = getStepStatus(step);
          const isActive = currentStep === step;
          const isPast = STEP_ORDER.indexOf(step) < STEP_ORDER.indexOf(currentStep as ApprovalStep);
          const name = activeRevision[config.nameField] as string;
          const position = activeRevision[config.positionField] as string;
          const date = activeRevision[config.dateField] as string;
          const isStepDone = status === '승인' || status === '상신';

          return (
            <React.Fragment key={step}>
              {idx > 0 && (
                <div className="flex items-center">
                  <div className={`w-4 h-[2px] ${isPast || isActive ? 'bg-blue-400' : 'bg-gray-300'}`} />
                </div>
              )}
              <div className={`flex-1 rounded border px-2 py-1.5 transition-all ${
                isActive ? 'border-blue-500 bg-blue-50' :
                isPast || isStepDone ? 'border-green-300 bg-green-50' :
                'border-gray-200 bg-white'
              }`}>
                {/* 1줄: 단계명 + 상태 뱃지 */}
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-[10px] font-bold ${isActive ? 'text-blue-700' : 'text-gray-700'}`}>
                    {idx + 1}. {config.label}
                  </span>
                  <span className={`text-[8px] px-1.5 py-0 rounded-full font-bold leading-[16px] ${color}`}>
                    {status}
                  </span>
                </div>

                {/* 2줄: 직급/이름/일자 */}
                <div className="flex items-center gap-1 text-[9px] text-gray-600">
                  <span>{position || '-'}</span>
                  <span className="text-gray-300">|</span>
                  <span
                    className={`font-bold cursor-pointer hover:underline ${!name ? 'text-blue-500' : 'hover:text-blue-600'}`}
                    onClick={() => onUserSelect?.(activeRevision.id, step)}
                    title={name ? '클릭하여 변경(Click to change)' : '클릭하여 선택(Click to select)'}
                  >
                    {name || '선택(Select)'}
                  </span>
                  <span className="text-gray-300">|</span>
                  <span>{date || '-'}</span>
                </div>

                {/* 액션 버튼 — 표준 결재 프로세스 */}
                {(() => {
                  const reviewRejected = activeRevision.reviewStatus === '반려';
                  const approveRejected = activeRevision.approveStatus === '반려';
                  const isRejected = reviewRejected || approveRejected;

                  // 작성 단계: 상신 / 재상신 / 회수
                  if (step === 'create') {
                    // 반려 후 재상신
                    if (isRejected && (status === '진행' || status === '대기' || !status)) {
                      return (
                        <div className="flex gap-1 mt-1">
                          <button
                            onClick={handleSubmit}
                            className="flex-1 px-1.5 py-0.5 text-[9px] font-bold bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
                          >
                            재상신(Resubmit)
                          </button>
                        </div>
                      );
                    }
                    // 상신 전
                    if (isActive && !isStepDone) {
                      return (
                        <div className="flex gap-1 mt-1">
                          <button
                            onClick={handleSubmit}
                            className="flex-1 px-1.5 py-0.5 text-[9px] font-bold bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
                          >
                            상신(Submit)
                          </button>
                        </div>
                      );
                    }
                    // 상신 후 회수 (검토자 미처리 시만)
                    if (status === '상신' && activeRevision?.reviewStatus !== '승인') {
                      return (
                        <div className="flex gap-1 mt-1">
                          <button
                            onClick={handleRecall}
                            className="flex-1 px-1.5 py-0.5 text-[9px] font-bold bg-orange-500 text-white rounded hover:bg-orange-600 cursor-pointer"
                          >
                            회수(Recall)
                          </button>
                        </div>
                      );
                    }
                    return null;
                  }

                  // 검토 단계: 승인/반려 / 회수
                  if (step === 'review') {
                    // 검토 승인 후 회수 (승인자 미처리 시만)
                    if (status === '승인' && activeRevision.approveStatus !== '승인') {
                      return (
                        <div className="flex gap-1 mt-1">
                          <button
                            onClick={handleReviewRecall}
                            className="flex-1 px-1.5 py-0.5 text-[9px] font-bold bg-orange-500 text-white rounded hover:bg-orange-600 cursor-pointer"
                          >
                            회수(Recall)
                          </button>
                        </div>
                      );
                    }
                    // 검토 활성 (승인/반려 버튼)
                    if (isActive && !isStepDone && status !== '반려') {
                      return (
                        <div className="flex gap-1 mt-1">
                          <button
                            onClick={() => handleApprove(step)}
                            className="flex-1 px-1.5 py-0.5 text-[9px] font-bold bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer"
                          >
                            {config.actionLabel}
                          </button>
                          <button
                            onClick={() => handleReject(step)}
                            className="px-1.5 py-0.5 text-[9px] font-bold bg-red-500 text-white rounded hover:bg-red-600 cursor-pointer"
                          >
                            반려(Reject)
                          </button>
                        </div>
                      );
                    }
                    return null;
                  }

                  // 승인 단계: 최종승인/반려
                  if (step === 'approve') {
                    if (isActive && !isStepDone && status !== '반려') {
                      return (
                        <div className="flex gap-1 mt-1">
                          <button
                            onClick={() => handleApprove(step)}
                            className="flex-1 px-1.5 py-0.5 text-[9px] font-bold bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer"
                          >
                            {config.actionLabel}
                          </button>
                          <button
                            onClick={() => handleReject(step)}
                            className="px-1.5 py-0.5 text-[9px] font-bold bg-red-500 text-white rounded hover:bg-red-600 cursor-pointer"
                          >
                            반려(Reject)
                          </button>
                        </div>
                      );
                    }
                    return null;
                  }

                  return null;
                })()}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
