/**
 * @file CPChangeHistoryTable.tsx
 * @description CP 변경 히스토리 테이블 컴포넌트
 * @version 1.0.0
 * @created 2026-01-25
 */

'use client';

import React, { useEffect, useState, useMemo } from 'react';

// ============================================================================
// Props & Types
// ============================================================================

interface CPChangeHistoryTableProps {
    cpId: string;
    cpName?: string;
}

interface ChangeHistoryRecord {
    id: string;
    timestamp: string;
    user: string;
    cpId?: string;
    cpName?: string;
    changes: { field: string; oldValue: string; newValue: string }[];
    description: string;
}

// ============================================================================
// CP 변경 히스토리 테이블 컴포넌트
// ============================================================================

export default function CPChangeHistoryTable({ cpId, cpName }: CPChangeHistoryTableProps) {
    const [changeHistories, setChangeHistories] = useState<ChangeHistoryRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // 변경 이력 로드
    const loadChangeHistories = () => {
        setIsLoading(true);
        try {
            const key = `cp_change_history_${cpId?.toLowerCase()}`;
            const stored = localStorage.getItem(key);
            if (stored) {
                setChangeHistories(JSON.parse(stored));
            }
        } catch (e) {
            console.error('CP 변경 이력 로드 실패:', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (cpId) {
            loadChangeHistories();
        }
    }, [cpId]);

    // 날짜 포맷
    const formatDate = (date: string): string => {
        const d = new Date(date);
        return d.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
    };

    // 표시용 ID/이름
    const displayCpId = cpId?.toLowerCase() || '-';
    const displayCpName = cpName || '-';

    // 7행 기본 표시
    const displayRows = useMemo(() => {
        if (changeHistories.length === 0) {
            return Array.from({ length: 7 }, (_, idx) => ({
                id: `empty-${idx}`,
                version: `1.${idx.toString().padStart(2, '0')}`,
                timestamp: '-',
                user: 'admin',
                cpId: displayCpId,
                cpName: displayCpName,
                description: '-',
                isEmpty: true,
            }));
        }
        return changeHistories.map((h, idx) => ({
            id: h.id,
            version: `1.${idx.toString().padStart(2, '0')}`,
            timestamp: formatDate(h.timestamp),
            user: h.user || 'admin',
            cpId: h.cpId?.toLowerCase() || displayCpId,
            cpName: h.cpName || displayCpName,
            description: h.description,
            isEmpty: false,
        }));
    }, [changeHistories, displayCpId, displayCpName]);

    return (
        <div className="rounded-lg border border-gray-400 bg-white">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#00587a] text-white">
                <span className="text-sm font-bold">
                    📝 변경 히스토리 (Change History)
                </span>
                <button
                    onClick={loadChangeHistories}
                    className="px-2 py-1 text-xs bg-blue-700 hover:bg-blue-800 rounded transition-colors"
                    disabled={isLoading}
                >
                    {isLoading ? '로딩...' : '🔄 새로고침'}
                </button>
            </div>

            {/* 테이블 - 5행 고정 높이, 헤더 고정, 휠 스크롤 */}
            <div className="overflow-y-auto h-[196px]">
                <table className="w-full border-collapse text-[10px]">
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-[#ccfbf1] text-gray-800 h-[25px]">
                            <th className="border border-gray-300 px-1 py-0 text-center font-semibold w-10" title="Version">버전(Ver.)</th>
                            <th className="border border-gray-300 px-1 py-0 text-center font-semibold w-24" title="Date/Time">일시(Date)</th>
                            <th className="border border-gray-300 px-1 py-0 text-center font-semibold w-14" title="Changed By">변경자(By)</th>
                            <th className="border border-gray-300 px-1 py-0 text-center font-semibold w-24" title="Control Plan ID">CP ID</th>
                            <th className="border border-gray-300 px-1 py-0 text-center font-semibold w-28" title="CP Name">CP명(Name)</th>
                            <th className="border border-gray-300 px-1 py-0 text-center font-semibold" title="Change Description">변경내용(Description)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr className="h-[25px]">
                                <td colSpan={6} className="px-2 py-0 text-center text-gray-500">
                                    로딩 중...
                                </td>
                            </tr>
                        ) : (
                            displayRows.map((row) => (
                                <tr key={row.id} className="h-[25px] hover:bg-gray-50">
                                    <td className="border border-gray-300 px-1 py-0 text-center">
                                        <span className="font-mono text-blue-600">{row.version}</span>
                                    </td>
                                    <td className="border border-gray-300 px-1 py-0 text-center text-gray-600">
                                        {row.timestamp}
                                    </td>
                                    <td className="border border-gray-300 px-1 py-0 text-center">
                                        {row.user}
                                    </td>
                                    <td className="border border-gray-300 px-1 py-0 text-center text-blue-500 font-mono">
                                        {row.cpId}
                                    </td>
                                    <td className="border border-gray-300 px-1 py-0 truncate" title={row.cpName}>
                                        {row.cpName}
                                    </td>
                                    <td className="border border-gray-300 px-1 py-0">
                                        {row.isEmpty ? (
                                            <span className="text-gray-400">-</span>
                                        ) : (
                                            <span className="px-1 py-0 rounded text-white text-[9px] bg-blue-500">
                                                등록정보: {row.description}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* 푸터 */}
            {changeHistories.length > 0 && (
                <div className="px-4 py-1 bg-gray-50 text-[10px] text-gray-600 border-t border-gray-300">
                    총 {changeHistories.length}건의 변경 이력
                </div>
            )}
        </div>
    );
}
