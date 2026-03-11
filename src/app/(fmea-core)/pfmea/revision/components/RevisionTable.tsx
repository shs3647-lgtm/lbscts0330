/**
 * @file RevisionTable.tsx
 * @description 개정 이력 테이블 컴포넌트
 * @module pfmea/revision/components
 * @version 2.1.0
 * @updated 2026-02-05 지연 상태 감지, 사용자 선택 모달, 신규건 경고/승인건 수정불가 로직
 * 
 * @status CODEFREEZE L4 (Gold) 🔒
 * @freeze_level L4 (Critical - Gold Test Passed)
 * @frozen_date 2026-03-02
 * @gold_tag v4.0.0-gold
 * @allowed_changes NONE — 사용자 명시적 승인 + full test pass 필수
 *
 * ⚠️ 이 파일은 L4 코드프리즈 상태입니다. 절대 수정 금지.
 */

'use client';

import React from 'react';
import { RevisionRecord } from '../types';

interface RevisionTableProps {
    revisions: RevisionRecord[];
    selectedRows: Set<string>;
    selectedInfo: {
        fmeaId: string;
        fmeaName: string;
    };
    projectLabel: string;
    saveStatus: 'idle' | 'saved';
    targetDate?: string; // 목표완료일 (fmeaRevisionDate) - 지연 판정 기준
    toggleRow: (id: string) => void;
    toggleAllRows: () => void;
    updateField: (id: string, field: keyof RevisionRecord, value: string) => void;
    handleAddRevision: () => void;
    handleDeleteSelected: () => void;
    handleSave: () => void;
    getStatusColor: (status: string) => string;
    handleBackup?: (version: string) => void;
    handleRestore?: (version: string) => void;
    handleApprovalRequest?: (revision: RevisionRecord, type: 'CREATE' | 'REVIEW' | 'APPROVE') => void;
    // ★ 사용자 선택 모달 열기 핸들러
    onUserSelect?: (revisionId: string, type: 'create' | 'review' | 'approve') => void;
}

export function RevisionTable({
    revisions,
    selectedRows,
    selectedInfo,
    projectLabel,
    saveStatus,
    toggleRow,
    toggleAllRows,
    updateField,
    handleAddRevision,
    handleDeleteSelected,
    handleSave,
    getStatusColor,
    handleBackup,
    handleRestore,
    handleApprovalRequest,
    onUserSelect,  // ★ 사용자 선택 모달 핸들러
    targetDate: projectTargetDate,  // 목표완료일
}: RevisionTableProps) {
    // ★ 날짜 초과 확인 함수 (목표완료일 기준 지연 여부)
    const isDelayed = (status: string): boolean => {
        if (!projectTargetDate || status === '승인' || status === '상신' || status === '완료') return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(projectTargetDate);
        return target < today;
    };

    // ★ 상태 표시 함수 (목표완료일 초과 시 지연)
    const getDisplayStatus = (status: string): string => {
        if (status && status !== '승인' && status !== '상신' && status !== '완료' && isDelayed(status)) return '지연';
        return status;
    };

    // ★ 지연 포함 상태 색상
    const getStatusColorWithDelay = (status: string): string => {
        const displayStatus = getDisplayStatus(status);
        if (displayStatus === '지연') return 'bg-red-500 text-white font-bold';
        return getStatusColor(status);
    };

    // ★ 상태 변경 핸들러 (반려 시 사유 입력, 작성자는 상신)
    const handleStatusChange = (revisionId: string, field: keyof RevisionRecord, value: string, revision: RevisionRecord) => {
        if (value === '반려') {
            const stepLabel = field === 'createStatus' ? '작성' : field === 'reviewStatus' ? '검토' : '승인';
            const reason = prompt(`${stepLabel} 반려 사유를 입력하세요:`);
            if (!reason) return;
            updateField(revisionId, field, value);
            const today = new Date().toISOString().split('T')[0];
            const dateField = field === 'createStatus' ? 'createDate' : field === 'reviewStatus' ? 'reviewDate' : 'approveDate';
            updateField(revisionId, dateField as keyof RevisionRecord, today);
        } else if (value === '상신') {
            // ★ 개정이력 미입력 시 상신 차단
            if (!(revision.revisionHistory || '').trim()) {
                alert('개정사유를 먼저 입력해주세요.\n\n"개정이력" 칸에 개정사유를 입력한 후 상신하세요.');
                return;
            }
            const reason = prompt('상신 사유를 입력하세요:');
            if (reason === null) return;
            updateField(revisionId, field, value);
            const today = new Date().toISOString().split('T')[0];
            updateField(revisionId, 'createDate', today);
        } else if (value === '승인') {
            const stepLabel = field === 'reviewStatus' ? '검토' : '승인';
            const reason = prompt(`${stepLabel} 승인 사유를 입력하세요:`);
            if (reason === null) return;
            updateField(revisionId, field, value);
            const today = new Date().toISOString().split('T')[0];
            const dateField = field === 'reviewStatus' ? 'reviewDate' : 'approveDate';
            updateField(revisionId, dateField as keyof RevisionRecord, today);
            if (field === 'approveStatus') {
                updateField(revisionId, 'revisionDate', today);
                const approvedCount = revisions.filter(r => r.approveStatus === '승인').length;
                updateField(revisionId, 'revisionNumber', `${approvedCount + 1}.00`);
            }
        } else {
            updateField(revisionId, field, value);
        }
    };

    return (
        <div className="rounded-lg overflow-hidden border border-gray-400 bg-white">
            {/* 테이블 헤더 바 */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#00587a] text-white">
                <span className="text-sm font-bold">📝 개정 이력 관리(Revision History) - {projectLabel}</span>
                <div className="flex gap-2 items-center">
                    <button
                        onClick={handleAddRevision}
                        className="px-3 py-1.5 bg-green-100 border border-green-500 text-green-700 text-xs rounded hover:bg-green-200 cursor-pointer"
                    >
                        + 추가(Add)
                    </button>
                    <button
                        onClick={handleDeleteSelected}
                        disabled={selectedRows.size === 0}
                        className="px-3 py-1.5 bg-red-100 border border-red-400 text-red-600 text-xs rounded hover:bg-red-200 disabled:opacity-50 cursor-pointer"
                    >
                        − 삭제(Delete)
                    </button>
                    {/* 자동저장 상태 (저장 버튼 축소) */}
                    {saveStatus === 'saved' ? (
                        <span className="text-[10px] text-green-300 font-semibold px-2">자동저장됨(Saved)</span>
                    ) : (
                        <button
                            onClick={handleSave}
                            className="px-2 py-1 text-[10px] text-white/60 hover:text-white rounded cursor-pointer"
                            title="수동 저장(Manual Save)"
                        >
                            💾 저장(Save)
                        </button>
                    )}
                </div>
            </div>

            {/* HTML 테이블 - 1행 헤더로 단순화 (스크롤 오버플로우 해결) */}
            <div className="overflow-y-auto h-[175px]">
                <table className="w-full border-collapse text-xs">
                    <thead className="sticky top-0 z-10 bg-[#00587a]">
                        <tr className="bg-[#00587a] text-white h-[28px] text-[9px]">
                            <th className="border border-white px-1 py-1 text-center align-middle w-5 bg-[#00587a]">
                                <input
                                    type="checkbox"
                                    checked={revisions.length > 0 && selectedRows.size === revisions.length}
                                    onChange={toggleAllRows}
                                    className="w-3 h-3"
                                />
                            </th>
                            <th className="border border-white px-1 py-1 text-center align-middle w-9 bg-[#00587a]" title="Revision Number">개정<br /><span className="text-[7px] font-normal opacity-70">Rev</span></th>
                            <th className="border border-white px-1 py-1 text-center align-middle w-16 bg-[#00587a]" title="Revision Date">개정일자<br /><span className="text-[7px] font-normal opacity-70">Date</span></th>
                            <th className="border border-white px-1 py-1 text-center align-middle w-20 bg-[#00587a]" title="FMEA Name">FMEA명<br /><span className="text-[7px] font-normal opacity-70">Name</span></th>
                            <th className="border border-white px-1 py-1 text-center align-middle w-52 bg-[#00587a]" title="Revision History">개정이력<br /><span className="text-[7px] font-normal opacity-70">History</span></th>
                            <th className="border border-white px-1 py-1 text-center align-middle w-10 bg-[#00587a]" title="Author Position">작성<br /><span className="text-[7px] font-normal opacity-70">직급</span></th>
                            <th className="border border-white px-1 py-1 text-center align-middle w-14 bg-[#00587a]" title="Author Name">작성자<br /><span className="text-[7px] font-normal opacity-70">Author</span></th>
                            <th className="border border-white px-1 py-1 text-center align-middle w-20 bg-[#00587a]" title="Author Date">작성일<br /><span className="text-[7px] font-normal opacity-70">Date</span></th>
                            <th className="border border-white px-1 py-1 text-center align-middle w-10 bg-[#00587a]" title="Author Status">작성<br /><span className="text-[7px] font-normal opacity-70">상태</span></th>
                            <th className="border border-white px-1 py-1 text-center align-middle w-10 bg-[#00587a]" title="Reviewer Position">검토<br /><span className="text-[7px] font-normal opacity-70">직급</span></th>
                            <th className="border border-white px-1 py-1 text-center align-middle w-14 bg-[#00587a]" title="Reviewer Name">검토자<br /><span className="text-[7px] font-normal opacity-70">Reviewer</span></th>
                            <th className="border border-white px-1 py-1 text-center align-middle w-20 bg-[#00587a]" title="Review Date">검토일<br /><span className="text-[7px] font-normal opacity-70">Date</span></th>
                            <th className="border border-white px-1 py-1 text-center align-middle w-10 bg-[#00587a]" title="Review Status">검토<br /><span className="text-[7px] font-normal opacity-70">상태</span></th>
                            <th className="border border-white px-1 py-1 text-center align-middle w-10 bg-[#00587a]" title="Approver Position">승인<br /><span className="text-[7px] font-normal opacity-70">직급</span></th>
                            <th className="border border-white px-1 py-1 text-center align-middle w-14 bg-[#00587a]" title="Approver Name">승인자<br /><span className="text-[7px] font-normal opacity-70">Approver</span></th>
                            <th className="border border-white px-1 py-1 text-center align-middle w-20 bg-[#00587a]" title="Approval Date">승인일<br /><span className="text-[7px] font-normal opacity-70">Date</span></th>
                            <th className="border border-white px-1 py-1 text-center align-middle w-10 bg-[#00587a]" title="Approval Status">승인<br /><span className="text-[7px] font-normal opacity-70">상태</span></th>
                            {(handleBackup || handleRestore || handleApprovalRequest) && (
                                <th className="border border-white px-1 py-1 text-center align-middle w-14 bg-[#00587a]" title="Management Actions">관리(Mgmt)</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {revisions.map((revision, index) => (
                            <tr key={revision.id} className={`h-[20px] hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`}>
                                <td className="border border-gray-400 px-[1px] py-[1px] text-center align-middle">
                                    {/* ✅ 디폴트(1.00) + 승인완료 개정은 삭제 불가 → 체크박스 비활성화 */}
                                    {(() => {
                                        const isDefault = index === 0;
                                        const isApproved = revision.approveStatus === '승인';
                                        const isProtected = isDefault || isApproved;
                                        return (
                                            <input
                                                type="checkbox"
                                                checked={selectedRows.has(revision.id)}
                                                onChange={() => toggleRow(revision.id)}
                                                disabled={isProtected}
                                                title={isDefault ? '디폴트 개정은 삭제할 수 없습니다(Default revision cannot be deleted)' : isApproved ? '승인된 개정은 삭제할 수 없습니다(Approved revision cannot be deleted)' : ''}
                                                className={`w-3 h-3 ${isProtected ? 'opacity-30 cursor-not-allowed' : ''}`}
                                            />
                                        );
                                    })()}
                                </td>
                                <td className="border border-gray-400 px-[1px] py-[1px] text-center align-middle font-bold text-green-600 text-[10px]">
                                    {revision.revisionNumber}
                                </td>
                                <td className="border border-gray-400 px-[1px] py-[1px] text-center align-middle">
                                    <input
                                        type="date"
                                        value={revision.revisionDate || ''}
                                        onChange={(e) => updateField(revision.id, 'revisionDate', e.target.value)}
                                        className="w-full h-[18px] px-0 text-[9px] text-center border-0 bg-transparent focus:outline-none focus:bg-blue-50"
                                        style={{ colorScheme: 'light' }}
                                    />
                                </td>
                                <td className="border border-gray-400 px-[1px] py-[1px] text-center align-middle text-[8px]">
                                    {selectedInfo.fmeaName || '-'}
                                </td>
                                <td className="border border-gray-400 px-[1px] py-[1px] text-center align-middle">
                                    {/*
                                      ★ 개정이력 로직:
                                      - 최초작성(index 0): 일반 텍스트
                                      - R1 이후(index > 0): 위첨자 N) + 파란색 개정내용
                                      - 승인된 건 → 수정 불가 (disabled)
                                    */}
                                    {(() => {
                                        const isNewEntry = !revision.createDate && !revision.reviewDate && !revision.approveDate;
                                        const needsInput = isNewEntry && !revision.revisionHistory;
                                        const isApproved = revision.approveStatus === '승인';
                                        const isRevision = index > 0; // 최초작성 이후 = 개정
                                        const SUPERSCRIPTS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
                                        const toSuperscript = (n: number): string =>
                                            String(n).split('').map(d => SUPERSCRIPTS[parseInt(d)]).join('');

                                        return (
                                            <div className="flex items-center h-[18px]">
                                                {isRevision && (
                                                    <span className="text-[10px] font-bold text-blue-600 flex-shrink-0 pl-0.5" title={`개정 ${index}차`}>
                                                        {toSuperscript(index)}⁾
                                                    </span>
                                                )}
                                                <input
                                                    type="text"
                                                    value={revision.revisionHistory}
                                                    onChange={(e) => updateField(revision.id, 'revisionHistory', e.target.value)}
                                                    placeholder={needsInput ? "⚠️ 개정사유를 입력하세요(Enter revision reason)" : ""}
                                                    disabled={isApproved}
                                                    title={isApproved ? "승인된 개정은 수정할 수 없습니다(Approved revision is read-only)" : revision.revisionHistory || ""}
                                                    className={`w-full h-[18px] px-[1px] text-[9px] border-0 focus:outline-none ${isApproved
                                                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                                        : needsInput
                                                            ? 'bg-orange-50 placeholder:text-orange-500 placeholder:font-bold focus:bg-blue-50'
                                                            : 'bg-transparent focus:bg-blue-50'
                                                        } ${isRevision ? 'text-blue-600 font-medium' : 'text-center'}`}
                                                />
                                            </div>
                                        );
                                    })()}
                                </td>
                                {/* 작성 */}
                                <td className="border border-gray-400 px-[1px] py-[1px]">
                                    <input
                                        type="text"
                                        value={revision.createPosition}
                                        onChange={(e) => updateField(revision.id, 'createPosition', e.target.value)}
                                        placeholder="직급(Pos.)"
                                        className="w-full h-[18px] px-[1px] text-[9px] text-center border-0 bg-transparent focus:outline-none focus:bg-blue-50"
                                    />
                                </td>
                                <td className="border border-gray-400 px-[1px] py-[1px]">
                                    <div
                                        className="w-full h-[18px] px-[1px] text-[9px] text-center bg-transparent cursor-pointer hover:bg-blue-100 flex items-center justify-center"
                                        onClick={() => onUserSelect?.(revision.id, 'create')}
                                        title="클릭하여 작성자 선택(Click to select Author)"
                                    >
                                        {revision.createName || <span className="text-gray-400">클릭선택(Select)</span>}
                                    </div>
                                </td>
                                <td className="border border-gray-400 px-[1px] py-[1px]">
                                    <input
                                        type="date"
                                        value={revision.createDate}
                                        onChange={(e) => updateField(revision.id, 'createDate', e.target.value)}
                                        className="w-full h-[18px] px-0 text-[9px] text-center border-0 bg-transparent focus:outline-none focus:bg-blue-50"
                                        style={{ colorScheme: 'light' }}
                                    />
                                </td>
                                <td className="border border-gray-400 px-[1px] py-[1px]">
                                    <select
                                        value={getDisplayStatus(revision.createStatus)}
                                        onChange={(e) => handleStatusChange(revision.id, 'createStatus', e.target.value, revision)}
                                        className={`w-full h-[18px] px-0 text-[9px] text-center border-0 rounded appearance-none cursor-pointer ${getStatusColorWithDelay(revision.createStatus)}`}
                                    >
                                        <option value="">-</option>
                                        <option value="진행">진행(Progress)</option>
                                        <option value="상신">상신(Submit)</option>
                                        <option value="지연">지연(Delayed)</option>
                                    </select>
                                </td>
                                {/* 검토 */}
                                <td className="border border-gray-400 px-[1px] py-[1px]">
                                    <input
                                        type="text"
                                        value={revision.reviewPosition}
                                        onChange={(e) => updateField(revision.id, 'reviewPosition', e.target.value)}
                                        placeholder="직급(Pos.)"
                                        className="w-full h-[18px] px-[1px] text-[9px] text-center border-0 bg-transparent focus:outline-none focus:bg-blue-50"
                                    />
                                </td>
                                <td className="border border-gray-400 px-[1px] py-[1px]">
                                    <div
                                        className="w-full h-[18px] px-[1px] text-[9px] text-center bg-transparent cursor-pointer hover:bg-blue-100 flex items-center justify-center"
                                        onClick={() => onUserSelect?.(revision.id, 'review')}
                                        title="클릭하여 검토자 선택(Click to select Reviewer)"
                                    >
                                        {revision.reviewName || <span className="text-gray-400">클릭선택(Select)</span>}
                                    </div>
                                </td>
                                <td className="border border-gray-400 px-[1px] py-[1px]">
                                    <input
                                        type="date"
                                        value={revision.reviewDate}
                                        onChange={(e) => updateField(revision.id, 'reviewDate', e.target.value)}
                                        className="w-full h-[18px] px-0 text-[9px] text-center border-0 bg-transparent focus:outline-none focus:bg-blue-50"
                                        style={{ colorScheme: 'light' }}
                                    />
                                </td>
                                <td className="border border-gray-400 px-[1px] py-[1px]">
                                    <select
                                        value={getDisplayStatus(revision.reviewStatus)}
                                        onChange={(e) => handleStatusChange(revision.id, 'reviewStatus', e.target.value, revision)}
                                        className={`w-full h-[18px] px-0 text-[9px] text-center border-0 rounded appearance-none cursor-pointer ${getStatusColorWithDelay(revision.reviewStatus)}`}
                                    >
                                        <option value="">-</option>
                                        <option value="진행">진행(Progress)</option>
                                        <option value="승인">승인(Approve)</option>
                                        <option value="반려">반려(Reject)</option>
                                        <option value="지연">지연(Delayed)</option>
                                    </select>
                                </td>
                                {/* 승인 */}
                                <td className="border border-gray-400 px-[1px] py-[1px]">
                                    <input
                                        type="text"
                                        value={revision.approvePosition}
                                        onChange={(e) => updateField(revision.id, 'approvePosition', e.target.value)}
                                        placeholder="직급(Pos.)"
                                        className="w-full h-[18px] px-[1px] text-[9px] text-center border-0 bg-transparent focus:outline-none focus:bg-blue-50"
                                    />
                                </td>
                                <td className="border border-gray-400 px-[1px] py-[1px]">
                                    <div
                                        className="w-full h-[18px] px-[1px] text-[9px] text-center bg-transparent cursor-pointer hover:bg-blue-100 flex items-center justify-center"
                                        onClick={() => onUserSelect?.(revision.id, 'approve')}
                                        title="클릭하여 승인자 선택(Click to select Approver)"
                                    >
                                        {revision.approveName || <span className="text-gray-400">클릭선택(Select)</span>}
                                    </div>
                                </td>
                                <td className="border border-gray-400 px-[1px] py-[1px]">
                                    <input
                                        type="date"
                                        value={revision.approveDate}
                                        onChange={(e) => updateField(revision.id, 'approveDate', e.target.value)}
                                        className="w-full h-[18px] px-0 text-[9px] text-center border-0 bg-transparent focus:outline-none focus:bg-blue-50"
                                        style={{ colorScheme: 'light' }}
                                    />
                                </td>
                                <td className="border border-gray-400 px-[1px] py-[1px]">
                                    <select
                                        value={getDisplayStatus(revision.approveStatus)}
                                        onChange={(e) => handleStatusChange(revision.id, 'approveStatus', e.target.value, revision)}
                                        className={`w-full h-[18px] px-0 text-[9px] text-center border-0 rounded appearance-none cursor-pointer ${getStatusColorWithDelay(revision.approveStatus)}`}
                                    >
                                        <option value="">-</option>
                                        <option value="진행">진행(Progress)</option>
                                        <option value="승인">승인(Approve)</option>
                                        <option value="반려">반려(Reject)</option>
                                        <option value="지연">지연(Delayed)</option>
                                    </select>
                                </td>
                                {/* 관리 버튼 */}
                                {(handleBackup || handleRestore || handleApprovalRequest) && (
                                    <td className="border border-gray-400 px-[1px] py-[1px] text-center align-middle">
                                        <div className="flex gap-1 justify-center">
                                            {handleBackup && (
                                                <button
                                                    onClick={() => handleBackup(revision.revisionNumber)}
                                                    className="px-1 py-0.5 text-[8px] bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                                    title="백업(Backup)"
                                                >
                                                    📦
                                                </button>
                                            )}
                                            {handleRestore && (
                                                <button
                                                    onClick={() => handleRestore(revision.revisionNumber)}
                                                    className="px-1 py-0.5 text-[8px] bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
                                                    title="복구(Restore)"
                                                >
                                                    ↩
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
