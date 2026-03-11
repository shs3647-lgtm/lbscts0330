// CODEFREEZE
/**
 * @file LinkageModal.tsx
 * @description 표준 연동 모달 컴포넌트 (v2.0)
 * @version 2.0.0
 * @created 2026-01-28
 * @updated 2026-01-29 - 자동 ID 생성 + 선택 화면 분리
 * 
 * ★ 변경사항 (v2.0):
 * 1. 기본 화면: 자동 생성된 ID만 표시 + 연동 ON/OFF 토글
 * 2. "+ 추가" 버튼: 새 ID 자동 생성 (L02, S01 등 순차 번호)
 * 3. "기존 문서에 연결" 두 번째 화면으로 분리 (고급 옵션)
 * 4. 기존 문서 연동 시 경고 메시지 + 확인
 * 
 * 사용처: APQP, PFMEA, PFD, CP 등록화면
 */

'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';
import {
    LinkageModalProps,
    LinkedDocItem,
    TargetModule,
    isLinked,
    extractLinkGroupNo,
} from './types';

// =====================================================
// 자동 ID 생성 유틸
// =====================================================

/**
 * 소스 ID에서 연동 대상 ID 자동 생성
 * - PFMEA → PFD: pfm → pfd
 * - PFMEA → CP: pfm → cp
 * - PFD → CP: pfd → cpl (Link 접두사)
 */
function generateLinkedId(sourceId: string, targetModule: TargetModule, groupNo: number = 1): string {
    const lowerSourceId = sourceId.toLowerCase();
    let baseId = '';

    // ID 변환 규칙
    if (targetModule === 'pfd') {
        baseId = lowerSourceId.replace(/^(p|d)fm/i, 'pfd');
    } else if (targetModule === 'cp') {
        // PFD에서 생성한 CP는 cpl 접두사
        if (lowerSourceId.startsWith('pfd')) {
            baseId = lowerSourceId.replace(/^pfd/i, 'cpl');
        } else {
            baseId = lowerSourceId.replace(/^(p|d)fm/i, 'cp');
        }
    } else if (targetModule === 'pfm') {
        // DFMEA → PFMEA: dfm → pfm
        baseId = lowerSourceId.replace(/^dfm/i, 'pfm');
    } else {
        baseId = lowerSourceId;
    }

    // 그룹 번호 suffix 추가 (L01, L02, S01 등)
    if (groupNo > 1) {
        // 기존에 -l01 등 suffix가 있으면 제거하고 새로 추가
        const basePart = baseId.replace(/-[lsLStT]\d{2}$/i, '');
        return `${basePart}-l${String(groupNo).padStart(2, '0')}`;
    }

    return baseId;
}

/**
 * 다음 그룹 번호 계산
 */
function getNextGroupNo(docs: LinkedDocItem[]): number {
    if (docs.length === 0) return 1;
    const maxGroup = Math.max(...docs.map(d => d.linkGroupNo || extractLinkGroupNo(d.id) || 0));
    return maxGroup + 1;
}

// =====================================================
// 토글 스위치 컴포넌트
// =====================================================

function LinkageToggle({
    checked,
    onChange,
    disabled = false,
}: {
    checked: boolean;
    onChange: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            onClick={() => !disabled && onChange()}
            disabled={disabled}
            className={`
                relative inline-flex h-5 w-10 items-center rounded-full transition-colors
                ${checked ? 'bg-teal-500' : 'bg-gray-300'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
        >
            <span
                className={`
                    inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                    ${checked ? 'translate-x-5' : 'translate-x-1'}
                `}
            />
        </button>
    );
}

// =====================================================
// 연동 리스트 테이블 (기본 화면)
// =====================================================

function LinkageTable({
    title,
    icon,
    docs,
    onToggle,
    onRemove,
    onAdd,
    onOpenSelectModal,
    colorClass,
    sourceId,
    targetModule,
}: {
    title: string;
    icon: string;
    docs: LinkedDocItem[];
    onToggle: (docId: string, isLinked: boolean) => void;
    onRemove: (docId: string) => void;
    onAdd: () => void;
    onOpenSelectModal: () => void;
    colorClass: string;
    sourceId: string;
    targetModule: TargetModule;
}) {
    return (
        <div className="mb-4">
            <div className={`flex items-center justify-between px-3 py-1 ${colorClass} rounded-t`}>
                <span className="text-sm font-bold text-white">{icon} {title}</span>
                <button
                    onClick={onAdd}
                    className="px-2 py-0.5 text-[10px] bg-white text-gray-700 rounded hover:bg-gray-100 font-bold"
                    title="새 연동 문서 자동 생성"
                >
                    + 추가
                </button>
            </div>
            <table className="w-full text-xs border-collapse border border-gray-300">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="border border-gray-300 px-2 py-1 w-40">ID (자동생성)</th>
                        <th className="border border-gray-300 px-2 py-1 w-16">유형</th>
                        <th className="border border-gray-300 px-2 py-1">상태</th>
                        <th className="border border-gray-300 px-2 py-1 w-16">연동</th>
                        <th className="border border-gray-300 px-2 py-1 w-16">그룹</th>
                        <th className="border border-gray-300 px-2 py-1 w-12">삭제</th>
                    </tr>
                </thead>
                <tbody>
                    {docs.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="border border-gray-300 px-2 py-3 text-center text-gray-400">
                                <div className="flex flex-col items-center gap-1">
                                    <span>연동 문서가 없습니다.</span>
                                    <button
                                        onClick={onAdd}
                                        className="text-teal-500 hover:text-teal-700 underline text-[10px]"
                                    >
                                        + 새 연동 문서 자동 생성
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        docs.map((doc, idx) => {
                            const linked = doc.status === 'linked' || isLinked(doc.id);
                            const groupNo = doc.linkGroupNo || extractLinkGroupNo(doc.id);
                            const isMain = groupNo === 1 || idx === 0; // 첫 번째 항목은 메인

                            return (
                                <tr key={doc.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="border border-gray-300 px-2 py-1 font-mono text-xs">
                                        <span className={linked ? 'text-teal-700 font-bold' : 'text-gray-500'}>
                                            {doc.id}
                                        </span>
                                        {isMain && (
                                            <span className="ml-1 px-1 py-0 text-[8px] bg-yellow-200 text-yellow-800 rounded">메인</span>
                                        )}
                                    </td>
                                    <td className="border border-gray-300 px-2 py-1 text-center">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${doc.docType === 'M' ? 'bg-purple-500' :
                                            doc.docType === 'F' ? 'bg-blue-500' :
                                                doc.docType === 'T' ? 'bg-orange-500' :
                                                    doc.docType === 'L' ? 'bg-cyan-500' :
                                                        doc.docType === 'S' ? 'bg-pink-500' :
                                                            'bg-green-500'
                                            }`}>
                                            {doc.docType || 'P'}
                                        </span>
                                    </td>
                                    <td className="border border-gray-300 px-2 py-1 text-gray-600">
                                        {linked ? (
                                            <span className="text-teal-600 text-[10px]">✅ 연동됨 (등록정보 동기화)</span>
                                        ) : (
                                            <span className="text-gray-400 text-[10px]">⏸️ 연동 해제됨</span>
                                        )}
                                    </td>
                                    <td className="border border-gray-300 px-2 py-1 text-center">
                                        <LinkageToggle
                                            checked={linked}
                                            onChange={() => onToggle(doc.id, !linked)}
                                        />
                                    </td>
                                    <td className="border border-gray-300 px-2 py-1 text-center font-mono">
                                        {groupNo > 0 ? (
                                            <span className="text-teal-600 font-bold text-[10px]">L{String(groupNo).padStart(2, '0')}</span>
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )}
                                    </td>
                                    <td className="border border-gray-300 px-2 py-1 text-center">
                                        {!isMain ? (
                                            <button
                                                onClick={() => {
                                                    if (confirm(`${doc.id} 연동을 삭제하시겠습니까?\n(문서 자체는 유지됩니다)`)) {
                                                        onRemove(doc.id);
                                                    }
                                                }}
                                                className="text-red-500 hover:text-red-700 text-sm"
                                            >
                                                ✕
                                            </button>
                                        ) : (
                                            <span className="text-gray-300 text-[10px]" title="메인 연동은 삭제 불가">-</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>

            {/* 고급 옵션: 기존 문서에 연결 */}
            <div className="mt-2 text-right">
                <button
                    onClick={onOpenSelectModal}
                    className="text-[10px] text-gray-400 hover:text-gray-600 underline"
                    title="기존 문서에 연결 (고급 기능)"
                >
                    📎 기존 문서에 연결...
                </button>
            </div>
        </div>
    );
}

// =====================================================
// 기존 문서 선택 모달 (두 번째 화면)
// =====================================================

function ExistingDocSelectModal({
    isOpen,
    onClose,
    targetModule,
    currentLinkedId,
    onSelect,
}: {
    isOpen: boolean;
    onClose: () => void;
    targetModule: TargetModule;
    currentLinkedId: string;
    onSelect: (docId: string) => void;
}) {
    const [search, setSearch] = useState('');
    const [existingDocs, setExistingDocs] = useState<{ id: string; subject: string; linkedTo: string | null }[]>([]);
    const [loading, setLoading] = useState(false);
    const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({
        isOpen, width: 500, height: 500, minWidth: 400, minHeight: 350, initialY: 80
    });

    // 데이터 로드
    const loadExistingDocs = async () => {
        setLoading(true);
        try {
            const apiUrl = targetModule === 'pfd' ? '/api/pfd' : '/api/control-plan';
            const res = await fetch(apiUrl);
            const data = await res.json();
            const docs = data.data || data.projects || [];
            setExistingDocs(docs.map((d: any) => ({
                id: d.pfdNo || d.cpNo || d.id,
                subject: d.subject || d.pfdNo || d.cpNo || '',
                linkedTo: d.fmeaId || d.parentFmeaId || null,
            })));
        } catch (e) {
            console.error('기존 문서 로드 실패:', e);
        } finally {
            setLoading(false);
        }
    };

    // 모달 열릴 때 데이터 로드
    if (isOpen && existingDocs.length === 0 && !loading) {
        loadExistingDocs();
    }

    if (!isOpen) return null;

    const filteredDocs = existingDocs.filter(d =>
        d.id.toLowerCase().includes(search.toLowerCase()) ||
        d.subject.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (docId: string, linkedTo: string | null) => {
        if (linkedTo) {
            // 이미 다른 곳에 연동됨
            if (!confirm(`⚠️ 이 문서는 이미 "${linkedTo}"에 연동되어 있습니다.\n\n현재 연동을 해제하고 이 문서에 연결하시겠습니까?\n(데이터가 덮어씌워질 수 있습니다)`)) {
                return;
            }
        } else {
            if (!confirm(`"${docId}"를 연동하시겠습니까?`)) {
                return;
            }
        }
        onSelect(docId);
        onClose();
    };

    return createPortal(
        <div
            className="fixed z-[10000] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
            style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
        >
                {/* 헤더 */}
                <div className="flex items-center justify-between px-4 py-2 bg-orange-500 text-white rounded-t-lg cursor-move shrink-0" onMouseDown={onDragStart}>
                    <h3 className="text-sm font-bold">📎 기존 문서에 연결 (고급)</h3>
                    <button onClick={onClose} onMouseDown={e => e.stopPropagation()} className="text-white hover:text-gray-200 text-lg">✕</button>
                </div>

                {/* 경고 */}
                <div className="px-4 py-2 bg-orange-50 border-b border-orange-200">
                    <div className="flex items-start gap-2 text-[11px] text-orange-800">
                        <span className="text-lg">⚠️</span>
                        <div>
                            <p className="font-bold">주의: 기존 문서에 연동하면 데이터가 덮어씌워질 수 있습니다.</p>
                            <p className="text-orange-600">일반적으로는 "자동 생성" 기능을 사용하세요.</p>
                        </div>
                    </div>
                </div>

                {/* 현재 연동 정보 */}
                <div className="px-4 py-2 bg-gray-50 border-b text-xs">
                    <span className="text-gray-500">현재 연동:</span>
                    <span className="ml-2 font-bold text-teal-600">{currentLinkedId || '없음'}</span>
                </div>

                {/* 검색 */}
                <div className="px-4 py-2 border-b">
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="🔍 문서 ID 또는 제목으로 검색..."
                        className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                </div>

                {/* 문서 목록 */}
                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="text-center py-4 text-gray-400">로딩 중...</div>
                    ) : filteredDocs.length === 0 ? (
                        <div className="text-center py-4 text-gray-400">검색 결과가 없습니다.</div>
                    ) : (
                        <table className="w-full text-xs border-collapse">
                            <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                    <th className="border border-gray-300 px-2 py-1">ID</th>
                                    <th className="border border-gray-300 px-2 py-1">제목</th>
                                    <th className="border border-gray-300 px-2 py-1 w-24">상태</th>
                                    <th className="border border-gray-300 px-2 py-1 w-16">선택</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDocs.map((doc, idx) => (
                                    <tr key={doc.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="border border-gray-300 px-2 py-1 font-mono">{doc.id}</td>
                                        <td className="border border-gray-300 px-2 py-1 text-gray-600">
                                            {doc.subject || <span className="text-gray-300">-</span>}
                                        </td>
                                        <td className="border border-gray-300 px-2 py-1 text-center">
                                            {doc.linkedTo ? (
                                                <span className="text-orange-500 text-[10px]">🔗 {doc.linkedTo}</span>
                                            ) : (
                                                <span className="text-green-500 text-[10px]">✅ 사용가능</span>
                                            )}
                                        </td>
                                        <td className="border border-gray-300 px-2 py-1 text-center">
                                            <button
                                                onClick={() => handleSelect(doc.id, doc.linkedTo)}
                                                className="px-2 py-0.5 text-[10px] bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                                            >
                                                선택
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* 푸터 */}
                <div className="px-4 py-2 border-t bg-gray-50 flex justify-end rounded-b-lg shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300 font-medium"
                    >
                        취소
                    </button>
                </div>

                {/* 리사이즈 핸들 */}
                <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={onResizeStart} title="크기 조절">
                    <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 opacity-60">
                        <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                </div>
        </div>,
        document.body
    );
}

// =====================================================
// 메인 모달 컴포넌트
// =====================================================

export function LinkageModal({
    isOpen,
    onClose,
    sourceInfo,
    linkedPfdList,
    linkedCpList,
    linkedPfmeaList = [],  // ★ DFMEA → PFMEA 연동
    onAddLinkedDoc,
    onRemoveLinkedDoc,
    onToggleLinkage,
    showPfdSection = true,
    showCpSection = true,
    showPfmeaSection = false,  // ★ DFMEA에서만 표시
}: LinkageModalProps) {
    const [selectModalOpen, setSelectModalOpen] = useState(false);
    const [selectModalTarget, setSelectModalTarget] = useState<TargetModule>('cp');
    const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({
        isOpen, width: 700, height: 600, minWidth: 550, minHeight: 400
    });

    if (!isOpen) return null;

    // ★ 새로운 onAddLinkedDoc: 자동 ID 생성
    const handleAddLinkedDoc = (targetModule: TargetModule) => {
        const docs = targetModule === 'pfd' ? linkedPfdList :
            targetModule === 'cp' ? linkedCpList : linkedPfmeaList;
        const nextGroupNo = getNextGroupNo(docs);
        const newId = generateLinkedId(sourceInfo.id, targetModule, nextGroupNo);

        // 확인 메시지
        if (confirm(`새 연동 문서를 생성합니다:\n\nID: ${newId}\nGroup: L${String(nextGroupNo).padStart(2, '0')}\n\n계속하시겠습니까?`)) {
            onAddLinkedDoc(targetModule, newId);
        }
    };

    // 기존 문서 선택 모달 열기
    const handleOpenSelectModal = (targetModule: TargetModule) => {
        setSelectModalTarget(targetModule);
        setSelectModalOpen(true);
    };

    // 기존 문서 선택 완료
    const handleSelectExistingDoc = (docId: string) => {
        onAddLinkedDoc(selectModalTarget, docId);
    };

    return (
        <>
            {createPortal(
            <div
                className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
                style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
            >
                    {/* 헤더 */}
                    <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-t-lg cursor-move shrink-0" onMouseDown={onDragStart}>
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🔗</span>
                            <h3 className="text-sm font-bold">연동 문서 관리</h3>
                            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded">
                                {sourceInfo.id}
                            </span>
                        </div>
                        <button onClick={onClose} onMouseDown={e => e.stopPropagation()} className="text-white hover:text-gray-200 text-lg">✕</button>
                    </div>

                    {/* 현재 문서 정보 */}
                    <div className="px-4 py-2 bg-gray-50 border-b text-xs shrink-0">
                        <div className="flex items-center gap-4">
                            <span className="text-gray-500">현재 문서:</span>
                            <span className="font-bold text-gray-700">{sourceInfo.subject}</span>
                            <span className="text-gray-400">|</span>
                            <span className="text-gray-500">고객:</span>
                            <span className="text-gray-700">{sourceInfo.customerName || '-'}</span>
                        </div>
                    </div>

                    {/* 안내 메시지 */}
                    <div className="px-4 py-2 bg-blue-50 border-b text-[11px] text-blue-700 shrink-0">
                        <span className="font-bold">💡 자동 연동:</span> "+추가" 버튼으로 새 문서 ID가 자동 생성됩니다. 연동 ON/OFF로 동기화를 제어하세요.
                    </div>

                    {/* 본문 - 스크롤 영역 */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {/* PFD 연동 섹션 */}
                        {showPfdSection && (
                            <LinkageTable
                                title="연동 PFD 목록"
                                icon="📄"
                                docs={linkedPfdList}
                                onToggle={(docId, linked) => onToggleLinkage(docId, linked, 'pfd')}
                                onRemove={(docId) => onRemoveLinkedDoc(docId, 'pfd')}
                                onAdd={() => handleAddLinkedDoc('pfd')}
                                onOpenSelectModal={() => handleOpenSelectModal('pfd')}
                                colorClass="bg-violet-500"
                                sourceId={sourceInfo.id}
                                targetModule="pfd"
                            />
                        )}

                        {/* CP 연동 섹션 */}
                        {showCpSection && (
                            <LinkageTable
                                title="연동 CP 목록"
                                icon="📋"
                                docs={linkedCpList}
                                onToggle={(docId, linked) => onToggleLinkage(docId, linked, 'cp')}
                                onRemove={(docId) => onRemoveLinkedDoc(docId, 'cp')}
                                onAdd={() => handleAddLinkedDoc('cp')}
                                onOpenSelectModal={() => handleOpenSelectModal('cp')}
                                colorClass="bg-teal-500"
                                sourceId={sourceInfo.id}
                                targetModule="cp"
                            />
                        )}

                        {/* ★★★ PFMEA 연동 섹션 (DFMEA 전용) ★★★ */}
                        {showPfmeaSection && (
                            <LinkageTable
                                title="연동 PFMEA 목록"
                                icon="📄"
                                docs={linkedPfmeaList}
                                onToggle={(docId, linked) => onToggleLinkage(docId, linked, 'pfm')}
                                onRemove={(docId) => onRemoveLinkedDoc(docId, 'pfm')}
                                onAdd={() => handleAddLinkedDoc('pfm')}
                                onOpenSelectModal={() => handleOpenSelectModal('pfm')}
                                colorClass="bg-yellow-500"
                                sourceId={sourceInfo.id}
                                targetModule="pfm"
                            />
                        )}
                    </div>

                    {/* 푸터 */}
                    <div className="px-4 py-2 border-t bg-gray-50 flex justify-between items-center rounded-b-lg shrink-0">
                        <div className="text-[10px] text-gray-500 flex items-center gap-2">
                            <span>✅ 연동 ON: 등록정보 자동 동기화</span>
                            <span className="text-gray-300">|</span>
                            <span>⏸️ 연동 OFF: 독립 문서로 분리</span>
                        </div>
                        <button
                            onClick={onClose}
                            className="px-4 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300 font-medium"
                        >
                            닫기
                        </button>
                    </div>

                    {/* 리사이즈 핸들 */}
                    <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={onResizeStart} title="크기 조절">
                        <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 opacity-60">
                            <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                    </div>
            </div>,
            document.body
            )}

            {/* 기존 문서 선택 모달 (두 번째 화면) */}
            <ExistingDocSelectModal
                isOpen={selectModalOpen}
                onClose={() => setSelectModalOpen(false)}
                targetModule={selectModalTarget}
                currentLinkedId={(selectModalTarget === 'pfd' ? linkedPfdList : linkedCpList)[0]?.id || ''}
                onSelect={handleSelectExistingDoc}
            />
        </>
    );
}

export default LinkageModal;
