/**
 * @file WsMainTab.tsx
 * @description WS Main 탭 컴포넌트 (표준정보, 결재, 공정정보, 공정도 등)
 */

import React, { useState, useCallback } from 'react';
import { WSMainDocument, createSampleWSMainDocument, WorkStep, PartItem } from '@/types/ws-main';

interface WsMainTabProps {
    document: WSMainDocument;
    setDocument: React.Dispatch<React.SetStateAction<WSMainDocument>>;
    onSave: () => void;
    isSaving: boolean;
}

function WsMainTabInner({ document, setDocument, onSave, isSaving }: WsMainTabProps) {
    const [message, setMessage] = useState<string | null>(null);

    // 샘플 데이터 로드
    const handleLoadSample = () => {
        if (confirm('샘플 데이터를 로드하시겠습니까?')) {
            // 문서 ID 등 기본 정보는 유지하고 내용만 업데이트
            const sample = createSampleWSMainDocument();
            setDocument(prev => ({
                ...sample,
                documentId: prev.documentId,
                standardNo: prev.standardNo,
                establishDate: prev.establishDate,
                createdAt: prev.createdAt,
            }));
            setMessage('✅ 샘플 데이터 로드됨');
            setTimeout(() => setMessage(null), 2000);
        }
    };

    // 안전보호구 토글
    const handleSafetyToggle = (key: keyof WSMainDocument['safetyEquipment']) => {
        setDocument(prev => ({
            ...prev,
            safetyEquipment: {
                ...prev.safetyEquipment,
                [key]: !prev.safetyEquipment[key]
            }
        }));
    };

    return (
        <div className="p-4 bg-gray-50 overflow-auto h-full">
            {/* 툴바 */}
            <div className="flex items-center gap-3 mb-4 bg-white p-3 rounded-lg shadow-sm">
                <button
                    onClick={onSave}
                    disabled={isSaving}
                    className="px-3 py-1.5 bg-green-500 text-white rounded text-xs font-medium hover:bg-green-600"
                >
                    {isSaving ? '저장중...' : '💾 저장'}
                </button>
                <button
                    onClick={handleLoadSample}
                    className="px-3 py-1.5 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600"
                >
                    📋 샘플 데이터
                </button>
                {message && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded">{message}</span>
                )}
                <div className="flex-1" />
                <span className="text-gray-400 text-xs">ID: {document.documentId}</span>
            </div>

            <div className="max-w-[1400px] mx-auto bg-white rounded-lg shadow-sm">
                {/* ===== 헤더: 표준정보 ===== */}
                <div className="border-2 border-[#5A6C7D] rounded-t-lg overflow-hidden">
                    <div className="flex items-stretch h-[100px]">
                        {/* 1. 회사 로고 */}
                        <div className="w-[10%] border-r-2 border-gray-400 bg-gray-50 flex flex-col items-center justify-center p-2">
                            <div className="text-[10px] text-gray-500 mb-1">회사 로고</div>
                            <div className="w-14 h-14 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                                LOGO
                            </div>
                        </div>

                        {/* 2. 작업표준 */}
                        <div className="w-[30%] border-r-2 border-gray-400 bg-gradient-to-b from-[#4472C4] to-[#2F5597] flex items-center justify-center">
                            <h1 className="text-3xl font-bold text-white whitespace-nowrap">
                                조립 작업표준
                            </h1>
                        </div>

                        {/* 3. 표준정보 */}
                        <div className="w-[30%] border-r-2 border-gray-400 bg-white">
                            <table className="w-full h-full border-collapse">
                                <tbody>
                                    <tr className="h-1/2">
                                        <td className="border border-gray-300 bg-[#5A6C7D] text-white text-center text-[10px] font-bold w-[25%] px-1">표준번호</td>
                                        <td className="border border-gray-300 bg-white p-1 w-[25%]">
                                            <input type="text" value={document.standardNo} onChange={(e) => setDocument(prev => ({ ...prev, standardNo: e.target.value }))} className="w-full px-1 py-1 text-xs border-0 focus:outline-none" placeholder="WS-001" />
                                        </td>
                                        <td className="border border-gray-300 bg-[#5A6C7D] text-white text-center text-[10px] font-bold w-[25%] px-1">제정일자</td>
                                        <td className="border border-gray-300 bg-white p-1 w-[25%]">
                                            <input type="date" value={document.establishDate} onChange={(e) => setDocument(prev => ({ ...prev, establishDate: e.target.value }))} className="w-full px-1 py-1 text-xs border-0 focus:outline-none" />
                                        </td>
                                    </tr>
                                    <tr className="h-1/2">
                                        <td className="border border-gray-300 bg-[#5A6C7D] text-white text-center text-[10px] font-bold px-1">개정일자</td>
                                        <td className="border border-gray-300 bg-white p-1">
                                            <input type="date" value={document.revisionDate} onChange={(e) => setDocument(prev => ({ ...prev, revisionDate: e.target.value }))} className="w-full px-1 py-1 text-xs border-0 focus:outline-none" />
                                        </td>
                                        <td className="border border-gray-300 bg-[#5A6C7D] text-white text-center text-[10px] font-bold px-1">개정번호</td>
                                        <td className="border border-gray-300 bg-white p-1">
                                            <input type="text" value={document.revisionNo} onChange={(e) => setDocument(prev => ({ ...prev, revisionNo: e.target.value }))} className="w-full px-1 py-1 text-xs border-0 focus:outline-none" placeholder="Rev.00" />
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* 4. 결재란 */}
                        <div className="w-[30%] bg-white">
                            <table className="w-full h-full border-collapse">
                                <tbody>
                                    <tr className="h-1/3">
                                        <td className="border border-gray-300 bg-[#5A6C7D] text-white text-center text-[10px] font-bold">작성</td>
                                        <td className="border border-gray-300 bg-[#5A6C7D] text-white text-center text-[10px] font-bold">검토</td>
                                        <td className="border border-gray-300 bg-[#5A6C7D] text-white text-center text-[10px] font-bold">승인</td>
                                    </tr>
                                    <tr className="h-1/3">
                                        <td className="border border-gray-300 bg-white p-1">
                                            <input type="text" value={document.approval.author} onChange={(e) => setDocument(prev => ({ ...prev, approval: { ...prev.approval, author: e.target.value } }))} className="w-full px-1 py-1 text-xs text-center border-0 focus:outline-none" placeholder="작성자" />
                                        </td>
                                        <td className="border border-gray-300 bg-white p-1">
                                            <input type="text" value={document.approval.reviewer} onChange={(e) => setDocument(prev => ({ ...prev, approval: { ...prev.approval, reviewer: e.target.value } }))} className="w-full px-1 py-1 text-xs text-center border-0 focus:outline-none" placeholder="검토자" />
                                        </td>
                                        <td className="border border-gray-300 bg-white p-1">
                                            <input type="text" value={document.approval.approver} onChange={(e) => setDocument(prev => ({ ...prev, approval: { ...prev.approval, approver: e.target.value } }))} className="w-full px-1 py-1 text-xs text-center border-0 focus:outline-none" placeholder="승인자" />
                                        </td>
                                    </tr>
                                    <tr className="h-1/3">
                                        <td className="border border-gray-300 bg-white p-1"><input type="date" className="w-full px-1 text-[10px] border-0 focus:outline-none" /></td>
                                        <td className="border border-gray-300 bg-white p-1"><input type="date" className="w-full px-1 text-[10px] border-0 focus:outline-none" /></td>
                                        <td className="border border-gray-300 bg-white p-1"><input type="date" className="w-full px-1 text-[10px] border-0 focus:outline-none" /></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* ===== InfoBar + 안전보호구 ===== */}
                <div className="bg-gradient-to-b from-[#4472C4] to-[#2F5597] px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-6 flex-1">
                        <div className="flex items-center gap-2">
                            <label className="text-white text-xs font-bold">공정번호:</label>
                            <input type="text" value={document.processNo} onChange={(e) => setDocument(prev => ({ ...prev, processNo: e.target.value }))} className="px-2 py-1 text-xs border border-gray-300 rounded w-20" placeholder="J17" />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-white text-xs font-bold">공정명:</label>
                            <input type="text" value={document.processName} onChange={(e) => setDocument(prev => ({ ...prev, processName: e.target.value }))} className="px-2 py-1 text-xs border border-gray-300 rounded w-24" placeholder="조립" />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-white text-xs font-bold">품명:</label>
                            <input type="text" value={document.productName} onChange={(e) => setDocument(prev => ({ ...prev, productName: e.target.value }))} className="px-2 py-1 text-xs border border-gray-300 rounded w-32" placeholder="J18" />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-white text-xs font-bold">품번:</label>
                            <input type="text" value={document.partNo} onChange={(e) => setDocument(prev => ({ ...prev, partNo: e.target.value }))} className="px-2 py-1 text-xs border border-gray-300 rounded w-32" placeholder="MP-HD-001" />
                        </div>
                    </div>

                    {/* 안전보호구 */}
                    <div className="flex items-center gap-2 pl-4 border-l border-white/30">
                        {Object.entries(document.safetyEquipment).map(([key, value]) => (
                            <label key={key} className="flex items-center text-white hover:bg-white/20 px-1.5 py-0.5 rounded transition-colors cursor-pointer text-xs whitespace-nowrap">
                                <input type="checkbox" checked={value} onChange={() => handleSafetyToggle(key as keyof WSMainDocument['safetyEquipment'])} className="mr-1 accent-yellow-400" />
                                {key === 'gloves' && '장갑'}
                                {key === 'safetyShoes' && '안전화'}
                                {key === 'helmet' && '안전모'}
                                {key === 'mask' && '마스크'}
                                {key === 'earplugs' && '귀마개'}
                                {key === 'safetyGlasses' && '보안경'}
                            </label>
                        ))}
                    </div>
                </div>

                {/* ===== 메인 그리드 ===== */}
                <div className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                        {/* 작업 공정도 */}
                        <div className="border-2 border-gray-300 rounded-lg bg-white h-[220px]">
                            <div className="bg-[#4472C4] text-white text-sm font-bold px-3 py-2 rounded-t-lg">📸 작업 공정도</div>
                            <div className="p-3 h-[calc(100%-40px)]">
                                <div className="border-2 border-dashed border-[#4472C4]/30 rounded-lg h-full flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                                    <div className="text-4xl mb-2">📷</div>
                                    <p className="text-xs text-gray-600 mb-1">드래그 & 드롭 또는 클릭</p>
                                    <button className="px-3 py-1.5 bg-[#4472C4] text-white rounded-lg hover:bg-[#2F5597] transition-colors text-xs font-medium">📁 사진 선택</button>
                                </div>
                            </div>
                        </div>

                        {/* 작업 방법 */}
                        <div className="border-2 border-gray-300 rounded-lg bg-white h-[220px]">
                            <div className="bg-[#4472C4] text-white text-sm font-bold px-3 py-2 rounded-t-lg flex items-center justify-between">
                                <span>📝 작업 방법</span>
                                <button onClick={() => setDocument(prev => ({ ...prev, workMethod: [...prev.workMethod, { step: prev.workMethod.length + 1, content: '' }] }))} className="px-3 py-1 bg-[#70AD47] text-white rounded text-xs font-medium hover:bg-[#5a8c38]">➕ 추가</button>
                            </div>
                            <div className="overflow-y-auto h-[calc(100%-40px)]">
                                <table className="w-full text-xs border-collapse">
                                    <thead className="bg-gray-100 sticky top-0">
                                        <tr>
                                            <th className="border border-gray-300 px-1 py-2 text-center w-12">순서</th>
                                            <th className="border border-gray-300 px-1 py-2 text-center">작업 내용</th>
                                            <th className="border border-gray-300 px-1 py-2 text-center w-12">삭제</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {document.workMethod.map((step, index) => (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="border border-gray-300 text-center font-medium">{step.step}</td>
                                                <td className="border border-gray-300 p-0">
                                                    <input type="text" value={step.content} onChange={(e) => { const updated = [...document.workMethod]; updated[index].content = e.target.value; setDocument(prev => ({ ...prev, workMethod: updated })); }} placeholder="작업 내용" className="w-full h-full px-1 py-1 border-0 text-xs focus:outline-none bg-transparent" />
                                                </td>
                                                <td className="border border-gray-300 text-center">
                                                    <button onClick={() => setDocument(prev => ({ ...prev, workMethod: prev.workMethod.filter((_, i) => i !== index) }))} className="text-red-500 hover:text-red-700 font-bold text-xs">✕</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {document.workMethod.length === 0 && (
                                            <tr><td colSpan={3} className="border border-gray-300 px-2 py-4 text-center text-gray-400">작업 순서를 추가하세요</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* 설비, TOOL (미리보기) */}
                        <div className="border-2 border-gray-300 rounded-lg bg-white h-[200px]">
                            <div className="bg-[#4472C4] text-white text-sm font-bold px-3 py-2 rounded-t-lg flex items-center justify-between">
                                <span>🔧 설비, TOOL</span>
                                <span className="text-[10px] text-white/80">※ 상세 관리는 '설비/TOOL' 탭 이용</span>
                            </div>
                            <div className="p-3 overflow-y-auto h-[calc(100%-40px)]">
                                <table className="w-full text-xs border-collapse">
                                    <thead><tr className="bg-gray-100"><th className="border border-gray-300 px-1 py-2 text-center w-8">NO</th><th className="border border-gray-300 px-1 py-2 text-center">설비/TOOL명</th></tr></thead>
                                    <tbody>
                                        {document.equipmentTools.slice(0, 5).map((tool, index) => (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="border border-gray-300 text-center font-medium">{index + 1}</td>
                                                <td className="border border-gray-300 p-1">{tool}</td>
                                            </tr>
                                        ))}
                                        {document.equipmentTools.length > 5 && (
                                            <tr><td colSpan={2} className="text-center text-xs text-gray-500 py-1">... 외 {document.equipmentTools.length - 5}건</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* 부품 리스트 (미리보기) */}
                        <div className="border-2 border-gray-300 rounded-lg bg-white h-[200px]">
                            <div className="bg-[#4472C4] text-white text-sm font-bold px-3 py-2 rounded-t-lg flex items-center justify-between">
                                <span>📦 부품 리스트</span>
                                <span className="text-[10px] text-white/80">※ 상세 관리는 '부품 리스트' 탭 이용</span>
                            </div>
                            <div className="p-3 overflow-y-auto h-[calc(100%-40px)]">
                                <table className="w-full text-xs border-collapse">
                                    <thead><tr className="bg-gray-100"><th className="border border-gray-300 px-1 py-2 text-center w-8">NO</th><th className="border border-gray-300 px-1 py-2 text-center">부품명</th><th className="border border-gray-300 px-1 py-2 text-center w-12">수량</th></tr></thead>
                                    <tbody>
                                        {document.partsList.slice(0, 5).map((part, index) => (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="border border-gray-300 text-center font-medium">{part.no}</td>
                                                <td className="border border-gray-300 p-1">{part.partName}</td>
                                                <td className="border border-gray-300 text-center">{part.quantity}</td>
                                            </tr>
                                        ))}
                                        {document.partsList.length > 5 && (
                                            <tr><td colSpan={3} className="text-center text-xs text-gray-500 py-1">... 외 {document.partsList.length - 5}건</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const WsMainTab = React.memo(WsMainTabInner);
export default WsMainTab;
