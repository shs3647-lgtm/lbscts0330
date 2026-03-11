/**
 * @file WsEquipmentModal.tsx
 * @description WS 설비/TOOL 관리 모달
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { WSMainDocument } from '@/types/ws-main';

interface WsEquipmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    wsData: WSMainDocument;
    setWsData: React.Dispatch<React.SetStateAction<WSMainDocument>>;
}

function WsEquipmentModalInner({
    isOpen,
    onClose,
    wsData,
    setWsData,
}: WsEquipmentModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleAdd = () => {
        setWsData(prev => ({
            ...prev,
            equipmentTools: [...prev.equipmentTools, '']
        }));
    };

    const handleChange = (index: number, value: string) => {
        setWsData(prev => {
            const updated = [...prev.equipmentTools];
            updated[index] = value;
            return { ...prev, equipmentTools: updated };
        });
    };

    const handleDelete = (index: number) => {
        setWsData(prev => ({
            ...prev,
            equipmentTools: prev.equipmentTools.filter((_, i) => i !== index)
        }));
    };

    if (!mounted || !isOpen) return null;

    const modalContent = (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-black/40">
            <div className="bg-white rounded-xl w-[90%] max-w-[800px] max-h-[80vh] flex flex-col shadow-2xl">
                {/* 헤더 */}
                <div
                    className="text-white py-3 px-5 rounded-t-xl flex justify-between items-center"
                    style={{ background: '#1e88e5' }}
                >
                    <div>
                        <h3 className="text-base font-bold m-0">🔧 설비 / TOOL 관리</h3>
                        <p className="text-xs opacity-80 mt-1">공정에 사용되는 설비 및 TOOL 목록을 관리합니다.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-gray-200 text-xl font-bold"
                    >
                        ✕
                    </button>
                </div>

                {/* 본문 */}
                <div className="flex-1 overflow-auto p-0">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b sticky top-0 z-10">
                            <tr>
                                <th scope="col" className="px-6 py-4 w-20 text-center bg-gray-100">NO</th>
                                <th scope="col" className="px-6 py-4 bg-gray-100">설비 / TOOL 명</th>
                                <th scope="col" className="px-6 py-4 w-24 text-center bg-gray-100">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {wsData.equipmentTools.map((tool, index) => (
                                <tr key={index} className="bg-white hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-center font-medium text-gray-500">
                                        {index + 1}
                                    </td>
                                    <td className="px-6 py-4">
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                            value={tool}
                                            onChange={(e) => handleChange(index, e.target.value)}
                                            placeholder="설비 또는 TOOL 이름을 입력하세요"
                                            autoFocus={tool === ''}
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => handleDelete(index)}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-full transition-colors"
                                            title="삭제"
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {wsData.equipmentTools.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center text-gray-400 bg-gray-50/50">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-2xl">🔧</span>
                                            <span>등록된 설비/TOOL이 없습니다.</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 푸터 */}
                <div className="py-3 px-5 bg-gray-100 rounded-b-xl flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                        총 {wsData.equipmentTools.length}건
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={handleAdd}
                            className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                        >
                            <span>➕</span> 항목 추가
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-500 text-white text-sm font-semibold rounded hover:bg-gray-600 transition"
                        >
                            닫기
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

const WsEquipmentModal = React.memo(WsEquipmentModalInner);
export default WsEquipmentModal;
