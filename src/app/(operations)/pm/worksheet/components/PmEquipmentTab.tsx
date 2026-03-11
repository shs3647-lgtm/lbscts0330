/**
 * @file PmEquipmentTab.tsx
 * @description 설비/TOOL 관리 전용 탭 - 컴팩트 UI
 * @version 2.1.0 - 2026-02-03: 컴팩트한 레이아웃으로 개선
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { PMMainDocument, EquipmentItem, createEmptyEquipmentItem } from '@/types/pm-main';

interface PmEquipmentTabProps {
    document: PMMainDocument;
    setDocument: React.Dispatch<React.SetStateAction<PMMainDocument>>;
}

const STATUS_CONFIG = {
    normal: { label: '정상', color: 'bg-green-100 text-green-700', icon: '✅' },
    checking: { label: '점검중', color: 'bg-yellow-100 text-yellow-700', icon: '🔧' },
    broken: { label: '고장', color: 'bg-red-100 text-red-700', icon: '❌' },
    disposed: { label: '폐기', color: 'bg-gray-100 text-gray-500', icon: '🚫' },
};

const CYCLE_CONFIG = {
    daily: { label: '매일', days: 1 },
    weekly: { label: '매주', days: 7 },
    monthly: { label: '매월', days: 30 },
    quarterly: { label: '분기', days: 90 },
    yearly: { label: '매년', days: 365 },
};

function PmEquipmentTabInner({ document, setDocument }: PmEquipmentTabProps) {
    const [selectedItem, setSelectedItem] = useState<EquipmentItem | null>(null);
    const [showCheckHistory, setShowCheckHistory] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const equipmentList: EquipmentItem[] = document.equipmentList ||
        document.equipmentTools.map((name, idx) => ({
            id: `EQ-LEGACY-${idx}`, name, type: 'equipment' as const, status: 'normal' as const,
        }));

    const updateEquipmentList = useCallback((newList: EquipmentItem[]) => {
        setDocument(prev => ({
            ...prev, equipmentList: newList, equipmentTools: newList.map(item => item.name),
        }));
    }, [setDocument]);

    const handleAdd = useCallback(() => {
        const newItem = createEmptyEquipmentItem();
        updateEquipmentList([...equipmentList, newItem]);
        setSelectedItem(newItem);
    }, [equipmentList, updateEquipmentList]);

    const handleLoadSampleData = useCallback(() => {
        if (equipmentList.length > 0 && !confirm('기존 데이터를 샘플로 대체하시겠습니까?')) return;
        const sampleData: EquipmentItem[] = [
            { id: 'EQ-001', name: '유압 프레스', equipmentNo: 'HP-2024-001', type: 'equipment', specification: '200톤', manufacturer: '(주)한국프레스', location: 'A동 1층', status: 'normal', checkCycle: 'weekly', lastCheckDate: '2026-01-27', nextCheckDate: '2026-02-03', checkHistory: [{ date: '2026-01-27', checker: '김정비', result: 'pass', note: '정상' }] },
            { id: 'EQ-002', name: 'CNC 선반', equipmentNo: 'CNC-2023-015', type: 'equipment', specification: 'Φ300x1000L', manufacturer: '화천기계', location: 'B동 2층', status: 'normal', checkCycle: 'daily', lastCheckDate: '2026-02-03', nextCheckDate: '2026-02-04', checkHistory: [] },
            { id: 'EQ-003', name: '자동 용접기', equipmentNo: 'AW-2025-003', type: 'equipment', specification: '350A', manufacturer: '현대용접', location: 'C동 1층', status: 'checking', checkCycle: 'monthly', lastCheckDate: '2026-01-15', nextCheckDate: '2026-02-15', checkHistory: [] },
            { id: 'EQ-004', name: '컨베이어 벨트', equipmentNo: 'CB-2024-007', type: 'equipment', specification: '폭 600mm', manufacturer: '삼성물류', location: 'A동 2층', status: 'normal', checkCycle: 'quarterly', lastCheckDate: '2025-12-01', nextCheckDate: '2026-03-01', checkHistory: [] },
            { id: 'TOOL-001', name: '토크렌치', equipmentNo: 'TW-SET-01', type: 'tool', specification: '10-200 N·m', manufacturer: 'TOHNICHI', location: '공구실', status: 'normal', checkCycle: 'yearly', lastCheckDate: '2025-06-15', nextCheckDate: '2026-06-15', checkHistory: [] },
            { id: 'TOOL-002', name: '버니어 캘리퍼스', equipmentNo: 'VC-DIG-05', type: 'tool', specification: '0-300mm', manufacturer: 'Mitutoyo', location: '측정실', status: 'normal', checkCycle: 'monthly', lastCheckDate: '2026-01-10', nextCheckDate: '2026-02-10', checkHistory: [] },
            { id: 'TOOL-003', name: '전동 드라이버', equipmentNo: 'ED-2024-012', type: 'tool', specification: '0.1-2.0 N·m', manufacturer: 'HIOS', location: '조립라인', status: 'broken', checkCycle: 'weekly', lastCheckDate: '2026-01-28', nextCheckDate: '2026-02-04', checkHistory: [{ date: '2026-01-28', checker: '이조립', result: 'fail', note: '클러치 고장' }], note: '수리중' },
        ];
        updateEquipmentList(sampleData);
        alert('✅ 7건의 샘플 데이터가 로드되었습니다.');
    }, [equipmentList, updateEquipmentList]);

    const handleUpdate = useCallback((updated: EquipmentItem) => {
        updateEquipmentList(equipmentList.map(item => item.id === updated.id ? updated : item));
        setSelectedItem(updated);
    }, [equipmentList, updateEquipmentList]);

    const handleDelete = useCallback((id: string) => {
        if (confirm('삭제하시겠습니까?')) {
            updateEquipmentList(equipmentList.filter(item => item.id !== id));
            if (selectedItem?.id === id) setSelectedItem(null);
        }
    }, [equipmentList, updateEquipmentList, selectedItem]);

    const handleAddCheckRecord = useCallback(() => {
        if (!selectedItem) return;
        const checker = prompt('점검자:'); if (!checker) return;
        const resultStr = prompt('결과 (1:합격/2:불합격):');
        const result = resultStr === '2' ? 'fail' : 'pass';
        const today = new Date().toISOString().split('T')[0];
        const nextDate = selectedItem.checkCycle ? (() => {
            const d = new Date(today); d.setDate(d.getDate() + (CYCLE_CONFIG[selectedItem.checkCycle]?.days || 30)); return d.toISOString().split('T')[0];
        })() : undefined;
        handleUpdate({ ...selectedItem, lastCheckDate: today, nextCheckDate: nextDate, checkHistory: [...(selectedItem.checkHistory || []), { date: today, checker, result, note: '' }] });
        alert('✅ 점검 완료');
    }, [selectedItem, handleUpdate]);

    const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedItem || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (ev) => handleUpdate({ ...selectedItem, image: ev.target?.result as string });
        reader.readAsDataURL(file); e.target.value = '';
    }, [selectedItem, handleUpdate]);

    const overdueCount = equipmentList.filter(e => e.nextCheckDate && new Date(e.nextCheckDate) < new Date()).length;
    const normalCount = equipmentList.filter(e => e.status === 'normal').length;
    const checkingCount = equipmentList.filter(e => e.status === 'checking').length;
    const brokenCount = equipmentList.filter(e => e.status === 'broken' || e.status === 'disposed').length;

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
            {/* 상단 헤더 - 컴팩트 */}
            <div className="bg-white border-b px-4 py-2 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <h2 className="font-bold text-gray-800">🔧 설비/TOOL</h2>
                    {/* 인라인 상태 요약 */}
                    <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-0.5 bg-gray-100 rounded">전체 <b>{equipmentList.length}</b></span>
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">정상 <b>{normalCount}</b></span>
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">점검중 <b>{checkingCount}</b></span>
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded">고장 <b>{brokenCount}</b></span>
                        {overdueCount > 0 && (
                            <span className="px-2 py-0.5 bg-red-500 text-white rounded animate-pulse">⚠️ 점검초과 <b>{overdueCount}</b></span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleLoadSampleData} className="px-3 py-1.5 bg-purple-500 text-white rounded text-xs hover:bg-purple-600">📋 샘플</button>
                    <button onClick={handleAdd} className="px-3 py-1.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">➕ 추가</button>
                </div>
            </div>

            {/* 메인 영역 */}
            <div className="flex-1 flex overflow-hidden">
                {/* 좌측: 테이블 목록 */}
                <div className="flex-1 overflow-auto p-2">
                    <table className="w-full text-xs border-collapse bg-white rounded shadow-sm">
                        <thead className="bg-gray-100 sticky top-0">
                            <tr>
                                <th className="border px-2 py-1.5 w-8 text-center">#</th>
                                <th className="border px-2 py-1.5 w-12 text-center">구분</th>
                                <th className="border px-2 py-1.5 text-left">설비/TOOL명</th>
                                <th className="border px-2 py-1.5 w-24 text-center">설비번호</th>
                                <th className="border px-2 py-1.5 w-16 text-center">상태</th>
                                <th className="border px-2 py-1.5 w-16 text-center">주기</th>
                                <th className="border px-2 py-1.5 w-24 text-center">다음점검</th>
                                <th className="border px-2 py-1.5 w-20 text-center">위치</th>
                                <th className="border px-2 py-1.5 w-10 text-center">삭제</th>
                            </tr>
                        </thead>
                        <tbody>
                            {equipmentList.map((item, idx) => {
                                const isOverdue = item.nextCheckDate && new Date(item.nextCheckDate) < new Date();
                                return (
                                    <tr
                                        key={item.id}
                                        onClick={() => setSelectedItem(item)}
                                        className={`cursor-pointer hover:bg-blue-50 transition-colors ${selectedItem?.id === item.id ? 'bg-blue-100' : ''}`}
                                    >
                                        <td className="border px-2 py-1 text-center text-gray-500">{idx + 1}</td>
                                        <td className="border px-2 py-1 text-center">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${item.type === 'equipment' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                {item.type === 'equipment' ? '설비' : 'TOOL'}
                                            </span>
                                        </td>
                                        <td className="border px-2 py-1 font-medium">{item.name || '-'}</td>
                                        <td className="border px-2 py-1 text-center text-gray-500">{item.equipmentNo || '-'}</td>
                                        <td className="border px-2 py-1 text-center">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${STATUS_CONFIG[item.status].color}`}>
                                                {STATUS_CONFIG[item.status].label}
                                            </span>
                                        </td>
                                        <td className="border px-2 py-1 text-center text-gray-500">{item.checkCycle ? CYCLE_CONFIG[item.checkCycle].label : '-'}</td>
                                        <td className={`border px-2 py-1 text-center ${isOverdue ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                                            {item.nextCheckDate || '-'}{isOverdue && ' ⚠️'}
                                        </td>
                                        <td className="border px-2 py-1 text-center text-gray-500 truncate max-w-[80px]">{item.location || '-'}</td>
                                        <td className="border px-2 py-1 text-center">
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="text-red-400 hover:text-red-600">🗑️</button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {equipmentList.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="border px-4 py-8 text-center text-gray-400">
                                        등록된 설비/TOOL이 없습니다. <button onClick={handleLoadSampleData} className="text-purple-500 underline ml-2">샘플 로드</button>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 우측: 상세 패널 - 컴팩트 */}
                <div className="w-[320px] border-l bg-white overflow-y-auto p-3 space-y-3 shrink-0">
                    {selectedItem ? (
                        <>
                            {/* 기본 정보 */}
                            <div className="bg-gray-50 rounded p-3 text-xs space-y-2">
                                <div className="font-bold text-gray-700 border-b pb-1 mb-2">📋 기본 정보</div>
                                <div><label className="text-gray-500">이름</label><input type="text" value={selectedItem.name} onChange={(e) => handleUpdate({ ...selectedItem, name: e.target.value })} className="w-full px-2 py-1 border rounded mt-0.5" /></div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div><label className="text-gray-500">설비번호</label><input type="text" value={selectedItem.equipmentNo || ''} onChange={(e) => handleUpdate({ ...selectedItem, equipmentNo: e.target.value })} className="w-full px-2 py-1 border rounded mt-0.5" /></div>
                                    <div><label className="text-gray-500">구분</label><select value={selectedItem.type} onChange={(e) => handleUpdate({ ...selectedItem, type: e.target.value as any })} className="w-full px-2 py-1 border rounded mt-0.5"><option value="equipment">설비</option><option value="tool">TOOL</option></select></div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div><label className="text-gray-500">상태</label><select value={selectedItem.status} onChange={(e) => handleUpdate({ ...selectedItem, status: e.target.value as any })} className="w-full px-2 py-1 border rounded mt-0.5">
                                        {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                    </select></div>
                                    <div><label className="text-gray-500">위치</label><input type="text" value={selectedItem.location || ''} onChange={(e) => handleUpdate({ ...selectedItem, location: e.target.value })} className="w-full px-2 py-1 border rounded mt-0.5" /></div>
                                </div>
                                <div><label className="text-gray-500">규격</label><input type="text" value={selectedItem.specification || ''} onChange={(e) => handleUpdate({ ...selectedItem, specification: e.target.value })} className="w-full px-2 py-1 border rounded mt-0.5" /></div>
                            </div>

                            {/* 점검 관리 */}
                            <div className="bg-green-50 rounded p-3 text-xs space-y-2">
                                <div className="font-bold text-gray-700 border-b pb-1 mb-2">🔍 점검 관리</div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div><label className="text-gray-500">주기</label><select value={selectedItem.checkCycle || ''} onChange={(e) => handleUpdate({ ...selectedItem, checkCycle: e.target.value as any || undefined })} className="w-full px-2 py-1 border rounded mt-0.5">
                                        <option value="">-</option>{Object.entries(CYCLE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                    </select></div>
                                    <div><label className="text-gray-500">다음점검</label><input type="text" value={selectedItem.nextCheckDate || '-'} readOnly className="w-full px-2 py-1 border rounded mt-0.5 bg-gray-100" /></div>
                                </div>
                                <button onClick={handleAddCheckRecord} className="w-full px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700">✅ 점검 기록 추가</button>
                                {selectedItem.checkHistory && selectedItem.checkHistory.length > 0 && (
                                    <div className="bg-white rounded p-2 max-h-24 overflow-y-auto">
                                        {[...selectedItem.checkHistory].reverse().slice(0, 3).map((r, i) => (
                                            <div key={i} className="text-[10px] py-0.5 border-b last:border-0">
                                                <span className="text-gray-400">{r.date}</span> <span>{r.checker}</span>
                                                <span className={`ml-1 px-1 rounded ${r.result === 'pass' ? 'bg-green-100' : 'bg-red-100'}`}>{r.result === 'pass' ? '합격' : '불합격'}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 사진 */}
                            <div className="bg-blue-50 rounded p-3 text-xs">
                                <div className="font-bold text-gray-700 border-b pb-1 mb-2">📷 사진</div>
                                {selectedItem.image ? (
                                    <div className="relative">
                                        <img src={selectedItem.image} alt="" className="w-full h-24 object-contain bg-white rounded" />
                                        <button onClick={() => handleUpdate({ ...selectedItem, image: undefined })} className="absolute top-1 right-1 px-1 bg-red-500 text-white rounded text-[10px]">삭제</button>
                                    </div>
                                ) : (
                                    <div onClick={() => fileInputRef.current?.click()} className="h-16 border-2 border-dashed border-blue-300 rounded flex items-center justify-center bg-white cursor-pointer hover:bg-blue-50">
                                        <span className="text-gray-400">📷 클릭하여 추가</span>
                                    </div>
                                )}
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-8 text-gray-400 text-sm">
                            👈 좌측에서 항목 선택
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const PmEquipmentTab = React.memo(PmEquipmentTabInner);
export default PmEquipmentTab;
