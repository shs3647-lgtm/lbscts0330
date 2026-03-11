// CODEFREEZE
/**
 * @file DocumentLinkModal.tsx
 * @description 문서 연동 관리 플로팅 윈도우 (표준화된 공통 컴포넌트)
 * @version 2.0.0 - 비모달 플로팅 윈도우 전환
 * @created 2026-01-27
 *
 * 사용처:
 * - PFD 등록 화면: PFD → CP 연동
 * - CP 등록 화면: CP → PFD 연동
 * - PFMEA 등록 화면: PFMEA → PFD 연동
 */

'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';
import type { LinkedItem, DocumentType, DocumentLevel, DocumentLinkModalProps } from '@/types/document-link-types';

// Re-export 타입들 (편의성)
export type { LinkedItem, DocumentType, DocumentLevel, DocumentLinkModalProps };

export default function DocumentLinkModal({
    isOpen,
    onClose,
    sourceType,
    sourceId,
    sourceDocType,
    targetType,
    linkedItems,
    onLinkedItemsChange,
    generateLinkedId,
}: DocumentLinkModalProps) {
    const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({
        isOpen, width: 650, height: 450, minWidth: 500, minHeight: 300
    });

    // 초기화: 목록이 비어있으면 자동 생성 항목 추가
    useEffect(() => {
        if (isOpen && linkedItems.length === 0 && sourceId) {
            const autoId = generateLinkedId(sourceId, []);
            onLinkedItemsChange([{
                id: autoId,
                type: sourceDocType,
                status: 'auto',
                sourceId,
            }]);
        }
    }, [isOpen, sourceId, sourceDocType, linkedItems.length, generateLinkedId, onLinkedItemsChange]);

    // 연동 항목 추가
    const handleAdd = () => {
        if (!sourceId) return;

        const existingIds = linkedItems.map(item => item.id);
        const newId = generateLinkedId(sourceId, existingIds);

        onLinkedItemsChange([...linkedItems, {
            id: newId,
            type: sourceDocType,
            status: 'pending',
            sourceId,
        }]);
    };

    // 연동 항목 삭제
    const handleRemove = (itemId: string) => {
        const item = linkedItems.find(i => i.id === itemId);

        if (item?.status === 'auto') {
            alert('자동 생성된 기본 항목은 삭제할 수 없습니다.');
            return;
        }

        if (item?.status === 'linked') {
            if (!confirm('이미 연동된 항목입니다. 연동을 해제하시겠습니까?')) return;
        }

        onLinkedItemsChange(linkedItems.filter(i => i.id !== itemId));
    };

    // 유형별 색상
    const getTypeColor = (type: DocumentLevel) => {
        switch (type) {
            case 'M': return 'bg-purple-500';
            case 'F': return 'bg-blue-500';
            case 'P': return 'bg-green-500';
        }
    };

    // 상태별 표시
    const getStatusDisplay = (status: LinkedItem['status']) => {
        switch (status) {
            case 'auto': return <span className="text-[10px] font-bold text-teal-600">자동생성</span>;
            case 'linked': return <span className="text-[10px] font-bold text-orange-600">🔗 연동됨</span>;
            case 'pending': return <span className="text-[10px] font-bold text-gray-400">미연동</span>;
        }
    };

    // 모달 제목 및 색상
    const getModalConfig = () => {
        switch (targetType) {
            case 'CP':
                return { title: '🔗 문서 연결(Document Link) - CP', color: 'bg-teal-500', labelColor: 'text-teal-700' };
            case 'PFD':
                return { title: '🔗 문서 연결(Document Link) - PFD', color: 'bg-violet-500', labelColor: 'text-violet-700' };
            case 'PFMEA':
                return { title: '🔗 문서 연결(Document Link) - PFMEA', color: 'bg-yellow-500', labelColor: 'text-yellow-700' };
        }
    };

    if (!isOpen) return null;

    const config = getModalConfig();

    return createPortal(
        <div
            className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
            style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
        >
            {/* 헤더 */}
            <div
                className={`flex items-center justify-between px-4 py-2 ${config.color} text-white rounded-t-lg cursor-move shrink-0`}
                onMouseDown={onDragStart}
            >
                <h3 className="text-sm font-bold" title="Document Link">{config.title}</h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleAdd}
                        onMouseDown={e => e.stopPropagation()}
                        className="px-2 py-0.5 text-[10px] bg-white text-gray-700 rounded hover:bg-gray-100 font-bold"
                    >
                        추가<span className="text-[7px] opacity-70 ml-0.5">(Add)</span>
                    </button>
                    <button onClick={onClose} onMouseDown={e => e.stopPropagation()} className="text-white hover:text-gray-200">✕</button>
                </div>
            </div>

            {/* 테이블 */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
                <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 bg-gray-100">
                        <tr>
                            <th className="border px-2 py-0.5 w-32 bg-gray-200"><div className="leading-tight"><div className="text-[10px]">현재 {sourceType} ID</div><div className="text-[7px] font-normal opacity-60">(Source)</div></div></th>
                            <th className="border px-2 py-0.5 w-12"><div className="leading-tight"><div className="text-[10px]">유형</div><div className="text-[7px] font-normal opacity-60">(Type)</div></div></th>
                            <th className="border px-2 py-0.5 bg-gray-200"><div className="leading-tight"><div className="text-[10px]">연동 {targetType} ID</div><div className="text-[7px] font-normal opacity-60">(Target)</div></div></th>
                            <th className="border px-2 py-0.5 w-12"><div className="leading-tight"><div className="text-[10px]">유형</div><div className="text-[7px] font-normal opacity-60">(Type)</div></div></th>
                            <th className="border px-2 py-0.5 w-20"><div className="leading-tight"><div className="text-[10px]">상태</div><div className="text-[7px] font-normal opacity-60">(Status)</div></div></th>
                            <th className="border px-2 py-0.5 w-12"><div className="leading-tight"><div className="text-[10px]">삭제</div><div className="text-[7px] font-normal opacity-60">(Del)</div></div></th>
                        </tr>
                    </thead>
                    <tbody>
                        {linkedItems.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="border px-2 py-4 text-center text-gray-400">
                                    연동할 {targetType}가 없습니다. [+ 추가] 버튼을 클릭하세요.
                                </td>
                            </tr>
                        ) : (
                            linkedItems.map((item, idx) => (
                                <tr key={item.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                    <td className="border px-2 py-1 text-center font-mono text-gray-700">{sourceId}</td>
                                    <td className="border px-2 py-1 text-center">
                                        <span className={`px-1 py-0.5 rounded text-[10px] font-bold text-white ${getTypeColor(sourceDocType)}`}>
                                            {sourceDocType}
                                        </span>
                                    </td>
                                    <td className={`border px-2 py-1 text-center font-mono font-bold ${config.labelColor}`}>{item.id}</td>
                                    <td className="border px-2 py-1 text-center">
                                        <span className={`px-1 py-0.5 rounded text-[10px] font-bold text-white ${getTypeColor(item.type)}`}>
                                            {item.type}
                                        </span>
                                    </td>
                                    <td className="border px-2 py-1 text-center">
                                        {getStatusDisplay(item.status)}
                                    </td>
                                    <td className="border px-2 py-1 text-center">
                                        {item.status !== 'auto' ? (
                                            <button
                                                onClick={() => handleRemove(item.id)}
                                                className="text-red-500 hover:text-red-700 text-[10px]"
                                            >
                                                ✕
                                            </button>
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* 푸터 */}
            <div className="px-4 py-2 border-t bg-gray-50 flex justify-between items-center shrink-0 rounded-b-lg">
                <span className="text-[10px] text-gray-500">※ 자동생성 항목은 삭제할 수 없습니다</span>
                <button
                    onClick={onClose}
                    className="px-3 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                >
                    닫기<span className="text-[8px] opacity-70 ml-0.5">(Close)</span>
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
