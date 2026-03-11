/**
 * @file PfdEquipmentModal.tsx
 * @description PFD 설비/TOOL 관리 모달 (컴팩트 디자인)
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PfdState } from '../types';

// 가상사례 데이터
const SAMPLE_EQUIPMENT: string[] = [
    '프레스 기계 (200T)',
    '용접기 (CO2)',
    '측정기 (CMM)',
    '조립 지그 (JIG-01)',
    '토크 렌치 (T-50)',
    '검사 고정구 (FIX-03)',
    '컨베이어 (CV-100)',
    '열처리로 (HT-200)',
];

interface PfdEquipmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    pfdData: PfdState;
    setPfdData: React.Dispatch<React.SetStateAction<PfdState>>;
}

export default function PfdEquipmentModal({
    isOpen,
    onClose,
    pfdData,
    setPfdData,
}: PfdEquipmentModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // 모달 열릴 때 데이터 없으면 가상사례 자동 추가
    useEffect(() => {
        if (isOpen && (!pfdData.equipmentTools || pfdData.equipmentTools.length === 0)) {
            setPfdData(prev => ({ ...prev, equipmentTools: [...SAMPLE_EQUIPMENT] }));
        }
    }, [isOpen, pfdData.equipmentTools, setPfdData]);

    const handleAdd = () => {
        setPfdData(prev => ({
            ...prev,
            equipmentTools: [...(prev.equipmentTools || []), '']
        }));
    };

    const handleChange = (index: number, value: string) => {
        setPfdData(prev => {
            const updated = [...(prev.equipmentTools || [])];
            updated[index] = value;
            return { ...prev, equipmentTools: updated };
        });
    };

    const handleDelete = (index: number) => {
        setPfdData(prev => ({
            ...prev,
            equipmentTools: (prev.equipmentTools || []).filter((_, i) => i !== index)
        }));
    };

    if (!mounted || !isOpen) return null;

    const equipmentList = pfdData.equipmentTools || [];

    const modalContent = (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-black/40">
            <div className="bg-white rounded-lg w-[90%] max-w-[700px] max-h-[80vh] flex flex-col shadow-2xl">
                {/* 헤더 - 컨트롤 통합 */}
                <div
                    className="text-white py-1.5 px-3 rounded-t-lg flex items-center justify-between"
                    style={{ background: '#1e88e5' }}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold whitespace-nowrap" title="Equipment / TOOL (PFD)">🔧 설비 / TOOL(Equipment) (PFD)</span>
                        <span className="text-[10px] opacity-70">{equipmentList.length}건</span>
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
                                <th className="px-2 py-1 text-left bg-gray-50" title="Equipment / TOOL Name">설비 / TOOL 명(Name)</th>
                                <th className="px-2 py-1 w-10 text-center bg-gray-50" title="Delete">삭제(Del)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {equipmentList.map((tool, index) => (
                                <tr key={index} className="hover:bg-gray-50/50">
                                    <td className="px-2 py-0.5 text-center text-gray-400">
                                        {index + 1}
                                    </td>
                                    <td className="px-1 py-0.5">
                                        <input
                                            type="text"
                                            className="w-full px-1.5 py-0.5 border border-gray-200 rounded text-[10px] focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none"
                                            value={tool}
                                            onChange={(e) => handleChange(index, e.target.value)}
                                            placeholder="설비/TOOL 명(Equipment Name)"
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

                            {equipmentList.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-2 py-6 text-center text-gray-400 text-[10px]">
                                        등록된 설비/TOOL이 없습니다.(No equipment registered)
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
