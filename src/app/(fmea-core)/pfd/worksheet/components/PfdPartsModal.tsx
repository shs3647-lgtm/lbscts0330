/**
 * @file PfdPartsModal.tsx
 * @description PFD 부품 리스트 관리 모달 (컴팩트 디자인)
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PfdState } from '../types';

// 가상사례 데이터
const SAMPLE_PARTS: { name: string; quantity: number }[] = [
    { name: '강판 (SPCC)', quantity: 2 },
    { name: '볼트 M8x20', quantity: 12 },
    { name: '너트 M8', quantity: 12 },
    { name: '와셔 Ø8', quantity: 24 },
    { name: '브라켓 ASS\'Y', quantity: 1 },
    { name: '실리콘 패킹', quantity: 4 },
    { name: '스프링 핀 Ø3', quantity: 8 },
    { name: '고무 부싱', quantity: 6 },
];

interface PfdPartsModalProps {
    isOpen: boolean;
    onClose: () => void;
    pfdData: PfdState;
    setPfdData: React.Dispatch<React.SetStateAction<PfdState>>;
}

export default function PfdPartsModal({
    isOpen,
    onClose,
    pfdData,
    setPfdData,
}: PfdPartsModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // 모달 열릴 때 데이터 없으면 가상사례 자동 추가
    useEffect(() => {
        if (isOpen && (!pfdData.partItems || pfdData.partItems.length === 0)) {
            setPfdData(prev => ({ ...prev, partItems: [...SAMPLE_PARTS] }));
        }
    }, [isOpen, pfdData.partItems, setPfdData]);

    const handleAdd = () => {
        setPfdData(prev => ({
            ...prev,
            partItems: [...(prev.partItems || []), { name: '', quantity: 1 }]
        }));
    };

    const handleChange = (index: number, field: 'name' | 'quantity', value: string | number) => {
        setPfdData(prev => {
            const updated = [...(prev.partItems || [])];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, partItems: updated };
        });
    };

    const handleDelete = (index: number) => {
        setPfdData(prev => ({
            ...prev,
            partItems: (prev.partItems || []).filter((_, i) => i !== index)
        }));
    };

    if (!mounted || !isOpen) return null;

    const partsList = pfdData.partItems || [];

    const modalContent = (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-black/40">
            <div className="bg-white rounded-lg w-[90%] max-w-[700px] max-h-[80vh] flex flex-col shadow-2xl">
                {/* 헤더 - 컨트롤 통합 */}
                <div
                    className="text-white py-1.5 px-3 rounded-t-lg flex items-center justify-between"
                    style={{ background: '#2e7d32' }}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold whitespace-nowrap" title="Parts List (PFD)">📦 부품 리스트(Parts List) (PFD)</span>
                        <span className="text-[10px] opacity-70">{partsList.length}건</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={handleAdd}
                            className="px-2 py-0.5 bg-white/20 hover:bg-white/30 text-white rounded text-[10px] font-medium transition-colors"
                        >
                            + 추가(Add)
                        </button>
                        <button
                            onClick={onClose}
                            className="px-2 py-0.5 bg-white/20 hover:bg-white/30 text-white rounded text-[10px] font-medium transition-colors"
                        >
                            닫기(Close)
                        </button>
                    </div>
                </div>

                {/* 본문 */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-[10px]">
                        <thead className="text-[10px] text-gray-600 bg-gray-50 border-b sticky top-0 z-10">
                            <tr>
                                <th className="px-2 py-1 w-10 text-center bg-gray-50" title="Number">NO</th>
                                <th className="px-2 py-1 text-left bg-gray-50" title="Part Name">부품명(Part Name)</th>
                                <th className="px-2 py-1 w-16 text-center bg-gray-50" title="Quantity">수량(Qty)</th>
                                <th className="px-2 py-1 w-10 text-center bg-gray-50" title="Delete">삭제(Del)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {partsList.map((part, index) => (
                                <tr key={index} className="hover:bg-gray-50/50">
                                    <td className="px-2 py-0.5 text-center text-gray-400">
                                        {index + 1}
                                    </td>
                                    <td className="px-1 py-0.5">
                                        <input
                                            type="text"
                                            className="w-full px-1.5 py-0.5 border border-gray-200 rounded text-[10px] focus:ring-1 focus:ring-green-400 focus:border-green-400 outline-none"
                                            value={part.name}
                                            onChange={(e) => handleChange(index, 'name', e.target.value)}
                                            placeholder="부품명(Part Name)"
                                        />
                                    </td>
                                    <td className="px-1 py-0.5">
                                        <input
                                            type="number"
                                            className="w-full px-1.5 py-0.5 border border-gray-200 rounded text-[10px] text-center focus:ring-1 focus:ring-green-400 focus:border-green-400 outline-none"
                                            value={part.quantity}
                                            onChange={(e) => handleChange(index, 'quantity', Number(e.target.value))}
                                            min={1}
                                        />
                                    </td>
                                    <td className="px-1 py-0.5 text-center">
                                        <button
                                            onClick={() => handleDelete(index)}
                                            className="text-red-400 hover:text-red-600 text-xs"
                                            title="삭제(Delete)"
                                        >
                                            ✕
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {partsList.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-2 py-6 text-center text-gray-400 text-[10px]">
                                        등록된 부품이 없습니다.(No parts registered)
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
