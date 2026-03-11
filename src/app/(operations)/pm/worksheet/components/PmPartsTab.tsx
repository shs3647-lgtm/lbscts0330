/**
 * @file PmPartsTab.tsx
 * @description WS 부품 리스트 관리 탭
 */

import React from 'react';
import { PMMainDocument, PartItem } from '@/types/pm-main';

interface PmPartsTabProps {
    document: PMMainDocument;
    setDocument: React.Dispatch<React.SetStateAction<PMMainDocument>>;
}

function PmPartsTabInner({ document, setDocument }: PmPartsTabProps) {

    const handleAdd = () => {
        setDocument(prev => ({
            ...prev,
            partsList: [
                ...prev.partsList,
                {
                    no: prev.partsList.length + 1,
                    partName: '',
                    quantity: 1
                }
            ]
        }));
    };

    const handleChange = (index: number, field: keyof PartItem, value: any) => {
        setDocument(prev => {
            const updated = [...prev.partsList];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, partsList: updated };
        });
    };

    const handleDelete = (index: number) => {
        setDocument(prev => {
            const filtered = prev.partsList.filter((_, i) => i !== index);
            // 번호 재정렬
            const reindexed = filtered.map((item, i) => ({ ...item, no: i + 1 }));
            return { ...prev, partsList: reindexed };
        });
    };

    return (
        <div className="p-6 bg-gray-50 h-full overflow-auto">
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">📦 부품 리스트 관리</h2>
                        <p className="text-sm text-gray-500 mt-1">공정에 소요되는 부품 목록 및 수량을 관리합니다.</p>
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
                                <th scope="col" className="px-6 py-4">부품명</th>
                                <th scope="col" className="px-6 py-4 w-32 text-center">수량</th>
                                <th scope="col" className="px-6 py-4 w-24 text-center">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {document.partsList.map((part, index) => (
                                <tr key={index} className="bg-white hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-center font-medium text-gray-500">
                                        {part.no}
                                    </td>
                                    <td className="px-6 py-4">
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                            value={part.partName}
                                            onChange={(e) => handleChange(index, 'partName', e.target.value)}
                                            placeholder="부품명을 입력하세요"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <input
                                            type="number"
                                            min="1"
                                            className="w-full px-3 py-2 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                            value={part.quantity}
                                            onChange={(e) => handleChange(index, 'quantity', parseInt(e.target.value) || 0)}
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

                            {document.partsList.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400 bg-gray-50/50">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-2xl">📦</span>
                                            <span>등록된 부품이 없습니다.</span>
                                            <button onClick={handleAdd} className="text-blue-500 hover:underline text-sm mt-1">
                                                새 부품 추가하기
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg text-right text-xs text-gray-500">
                    총 {document.partsList.length}건
                </div>
            </div>
        </div>
    );
}

const PmPartsTab = React.memo(PmPartsTabInner);
export default PmPartsTab;
