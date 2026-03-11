// CODEFREEZE
/**
 * @file CpPfmeaLinkModal.tsx
 * @description CP - PFMEA 연결 모달 (고장형태/영향/원인 연결)
 * @created 2026-01-24
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Link2, Unlink, ExternalLink, AlertTriangle } from 'lucide-react';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';

interface PfmeaLinkData {
    fmId: string;
    fmText: string;
    fmProcess: string;
    feId?: string;
    feText?: string;
    feScope?: string;
    severity?: number;
    fcId?: string;
    fcText?: string;
    fcProcess?: string;
    occurrence?: number;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    processNo: string;
    processName: string;
    selectedCpId: string;
    linkedPfmeaId?: string;
    linkedData?: PfmeaLinkData[];
    onLink: (processNo: string, pfmeaId: string, links: PfmeaLinkData[]) => void;
    onUnlink: (processNo: string) => void;
}

export function CpPfmeaLinkModal({
    isOpen,
    onClose,
    processNo,
    processName,
    selectedCpId,
    linkedPfmeaId,
    linkedData = [],
    onLink,
    onUnlink,
}: Props) {
    const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({ isOpen, width: 600, height: 500, minWidth: 400, minHeight: 280 });

    const [pfmeaId, setPfmeaId] = useState(linkedPfmeaId || '');
    const [availablePfmeas, setAvailablePfmeas] = useState<{ id: string; name: string }[]>([]);
    const [pfmeaData, setPfmeaData] = useState<PfmeaLinkData[]>([]);
    const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);

    // PFMEA 목록 로드
    useEffect(() => {
        if (isOpen) {
            loadPfmeaList();
            if (linkedPfmeaId) {
                setPfmeaId(linkedPfmeaId);
                loadPfmeaData(linkedPfmeaId);
            }
        }
    }, [isOpen, linkedPfmeaId]);

    // PFMEA 목록 로드
    const loadPfmeaList = async () => {
        try {
            // localStorage에서 PFMEA 프로젝트 목록 로드
            const storedProjects = localStorage.getItem('fmea-projects');
            if (storedProjects) {
                const projects = JSON.parse(storedProjects);
                const pfmeas = projects
                    .filter((p: any) => p.type === 'PFMEA' || p.id?.toLowerCase().startsWith('pfm'))
                    .map((p: any) => ({ id: p.id, name: p.projectName || p.subject || p.id }));
                setAvailablePfmeas(pfmeas);
            }
        } catch (e) {
            console.error('PFMEA 목록 로드 실패:', e);
        }
    };

    // PFMEA 데이터 로드
    const loadPfmeaData = async (id: string) => {
        setIsLoading(true);
        try {
            // localStorage에서 해당 PFMEA 워크시트 데이터 로드
            const worksheetData = localStorage.getItem(`pfmea_worksheet_${id}`);
            if (worksheetData) {
                const data = JSON.parse(worksheetData);
                const failureLinks = data.failureLinks || [];

                // 공정번호로 필터링
                const processLinks = failureLinks.filter((link: any) =>
                    link.fmProcess?.includes(processNo) ||
                    link.fcProcess?.includes(processNo) ||
                    link.fmProcess === processName
                );

                setPfmeaData(processLinks);

                // 기존 연결된 항목 선택
                if (linkedData.length > 0) {
                    setSelectedLinks(new Set(linkedData.map(l => l.fmId)));
                }
            } else {
                setPfmeaData([]);
            }
        } catch (e) {
            console.error('PFMEA 데이터 로드 실패:', e);
            setPfmeaData([]);
        } finally {
            setIsLoading(false);
        }
    };

    // PFMEA 선택 변경
    const handlePfmeaChange = (newId: string) => {
        setPfmeaId(newId);
        if (newId) {
            loadPfmeaData(newId);
        } else {
            setPfmeaData([]);
        }
    };

    // 링크 토글
    const toggleLink = (fmId: string) => {
        const newSet = new Set(selectedLinks);
        if (newSet.has(fmId)) {
            newSet.delete(fmId);
        } else {
            newSet.add(fmId);
        }
        setSelectedLinks(newSet);
    };

    // 저장
    const handleSave = () => {
        const selectedData = pfmeaData.filter(d => selectedLinks.has(d.fmId));
        onLink(processNo, pfmeaId, selectedData);
        onClose();
    };

    // 연결 해제
    const handleUnlink = () => {
        if (confirm(`공정 ${processNo}의 PFMEA 연결을 해제하시겠습니까?`)) {
            onUnlink(processNo);
            onClose();
        }
    };

    // 심각도 색상
    const getSeverityColor = (severity?: number) => {
        if (!severity) return 'bg-gray-100 text-gray-600';
        if (severity >= 9) return 'bg-red-500 text-white';
        if (severity >= 7) return 'bg-orange-500 text-white';
        if (severity >= 5) return 'bg-yellow-400 text-gray-800';
        return 'bg-green-400 text-gray-800';
    };

    if (!isOpen) return null;

    return typeof document === 'undefined' ? null : createPortal(
        <div className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
            style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}>
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-t-lg flex items-center justify-between cursor-move" onMouseDown={onDragStart}>
                <div className="flex items-center gap-2">
                    <Link2 className="w-5 h-5" />
                    <div>
                        <div className="font-bold text-sm">공정 {processNo} - {processName}</div>
                        <div className="text-[11px] text-blue-200">PFMEA 연결(PFMEA Link)</div>
                    </div>
                </div>
                <button onMouseDown={e => e.stopPropagation()} onClick={onClose} className="hover:bg-white/20 p-1 rounded transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

                {/* 본문 */}
                <div className="flex-1 overflow-y-auto p-4">
                    {/* PFMEA 선택 */}
                    <div className="mb-4">
                        <label className="text-sm font-bold text-gray-700 block mb-2">연결할 PFMEA 선택(Select PFMEA)</label>
                        <select
                            value={pfmeaId}
                            onChange={e => handlePfmeaChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">-- PFMEA 선택 --</option>
                            {availablePfmeas.map(p => (
                                <option key={p.id} value={p.id}>{p.id} - {p.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* 로딩 */}
                    {isLoading && (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-3 text-gray-600">PFMEA 데이터 로드 중...</span>
                        </div>
                    )}

                    {/* PFMEA 데이터 없음 */}
                    {!isLoading && pfmeaId && pfmeaData.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                            <AlertTriangle className="w-12 h-12 mb-3 text-yellow-500" />
                            <div className="text-sm font-bold">해당 공정의 PFMEA 데이터가 없습니다</div>
                            <div className="text-xs text-gray-400 mt-1">
                                PFMEA에서 공정 {processNo}({processName})을 먼저 분석해주세요
                            </div>
                        </div>
                    )}

                    {/* PFMEA 고장 데이터 목록 */}
                    {!isLoading && pfmeaData.length > 0 && (
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold text-gray-700">고장 분석 데이터(Failure Analysis Data)</span>
                                <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                                    {pfmeaData.length}건
                                </span>
                            </div>

                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <table className="w-full text-[11px]">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="p-2 border-b text-center w-[30px]" title="Select">선택</th>
                                            <th className="p-2 border-b text-left" title="Failure Mode">고장형태(FM)</th>
                                            <th className="p-2 border-b text-left" title="Failure Effect">고장영향(FE)</th>
                                            <th className="p-2 border-b text-center w-[40px]" title="Severity">S</th>
                                            <th className="p-2 border-b text-left" title="Failure Cause">고장원인(FC)</th>
                                            <th className="p-2 border-b text-center w-[40px]" title="Occurrence">O</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pfmeaData.map((link, i) => (
                                            <tr
                                                key={i}
                                                className={`hover:bg-blue-50 cursor-pointer transition-colors ${selectedLinks.has(link.fmId) ? 'bg-blue-100' : ''
                                                    }`}
                                                onClick={() => toggleLink(link.fmId)}
                                            >
                                                <td className="p-2 border-b text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedLinks.has(link.fmId)}
                                                        onChange={() => toggleLink(link.fmId)}
                                                        className="accent-blue-600"
                                                    />
                                                </td>
                                                <td className="p-2 border-b font-medium text-gray-800">
                                                    {link.fmText || '-'}
                                                </td>
                                                <td className="p-2 border-b text-gray-600">
                                                    {link.feText || '-'}
                                                    {link.feScope && (
                                                        <span className="ml-1 text-[9px] bg-gray-200 text-gray-600 px-1 rounded">
                                                            {link.feScope}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-2 border-b text-center">
                                                    <span className={`inline-block w-6 h-6 rounded ${getSeverityColor(link.severity)} text-xs font-bold leading-6`}>
                                                        {link.severity || '-'}
                                                    </span>
                                                </td>
                                                <td className="p-2 border-b text-gray-600">
                                                    {link.fcText || '-'}
                                                </td>
                                                <td className="p-2 border-b text-center">
                                                    <span className={`inline-block w-6 h-6 rounded ${getSeverityColor(link.occurrence)} text-xs font-bold leading-6`}>
                                                        {link.occurrence || '-'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* 선택된 연결 요약 */}
                    {selectedLinks.size > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-green-700">
                                <Check className="w-4 h-4" />
                                <span className="text-sm font-bold">{selectedLinks.size}개 항목이 연결됩니다</span>
                            </div>
                            <div className="text-[11px] text-green-600 mt-1">
                                연결된 고장형태/영향/원인이 CP 워크시트에 자동 반영됩니다
                            </div>
                        </div>
                    )}
                </div>

            {/* 푸터 */}
            <div className="border-t border-gray-200 px-4 py-3 flex justify-between bg-gray-50 rounded-b-lg">
                <div>
                    {linkedPfmeaId && (
                        <button
                            onClick={handleUnlink}
                            className="px-3 py-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors text-sm font-medium flex items-center gap-1"
                        >
                            <Unlink className="w-4 h-4" />
                            연결 해제(Unlink)
                        </button>
                    )}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!pfmeaId || selectedLinks.size === 0}
                        className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors text-sm font-medium flex items-center gap-1"
                    >
                        <Link2 className="w-4 h-4" />
                        연결 저장(Save Link)
                    </button>
                </div>
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

export default CpPfmeaLinkModal;
