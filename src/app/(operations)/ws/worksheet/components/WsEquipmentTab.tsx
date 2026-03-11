/**
 * @file WsEquipmentTab.tsx
 * @description WS 설비/TOOL 관리 탭
 */

import React from 'react';
import { WSMainDocument } from '@/types/ws-main';

interface WsEquipmentTabProps {
    document: WSMainDocument;
    setDocument: React.Dispatch<React.SetStateAction<WSMainDocument>>;
}

function WsEquipmentTabInner({ document, setDocument }: WsEquipmentTabProps) {

    const handleAdd = () => {
        setDocument(prev => ({
            ...prev,
            equipmentTools: [...prev.equipmentTools, '']
        }));
    };

    const handleChange = (index: number, value: string) => {
        setDocument(prev => {
            const updated = [...prev.equipmentTools];
            updated[index] = value;
            return { ...prev, equipmentTools: updated };
        });
    };

    const handleDelete = (index: number) => {
        setDocument(prev => ({
            ...prev,
            equipmentTools: prev.equipmentTools.filter((_, i) => i !== index)
        }));
    };

    return (
        <div className="p-6 bg-gray-50 h-full overflow-auto">
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">🔧 설비, TOOL 관리</h2>
                        <p className="text-sm text-gray-500 mt-1">공정에 사용되는 설비 및 TOOL을 상세 관리합니다.</p>
                    </div>
                    <button
                        onClick={handleAdd}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                    >
                        <span>➕</span> 추가
                    </button>
                </div>

                <div className="p-0">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b">
                            <tr>
                                <th scope="col" className="px-6 py-4 w-20 text-center">NO</th>
                                <th scope="col" className="px-6 py-4">설비 / TOOL 명</th>
                                <th scope="col" className="px-6 py-4 w-24 text-center">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {document.equipmentTools.map((tool, index) => (
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

                            {document.equipmentTools.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center text-gray-400 bg-gray-50/50">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-2xl">🔧</span>
                                            <span>등록된 설비/TOOL이 없습니다.</span>
                                            <button onClick={handleAdd} className="text-blue-500 hover:underline text-sm mt-1">
                                                새 항목 추가하기
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg text-right text-xs text-gray-500">
                    총 {document.equipmentTools.length}건
                </div>
            </div>
        </div>
    );
}

const WsEquipmentTab = React.memo(WsEquipmentTabInner);
export default WsEquipmentTab;
