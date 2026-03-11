/**
 * @file PmEquipmentDetailTab.tsx
 * @description WS 설비/TOOL 관리 모달 - 상세 정보 탭 컴포넌트
 * @version 1.0.0 - 2026-02-11: PmEquipmentModal.tsx에서 분리
 */

import React, { useRef } from 'react';
import { EquipmentItem } from '@/types/pm-main';
import { STATUS_CONFIG, CYCLE_CONFIG } from './PmEquipmentConstants';
import { calculateNextCheckDate } from './PmEquipmentUtils';

interface PmEquipmentDetailTabProps {
    selectedItem: EquipmentItem;
    showCheckHistory: boolean;
    setShowCheckHistory: React.Dispatch<React.SetStateAction<boolean>>;
    handleUpdate: (updated: EquipmentItem) => void;
    handleAddCheckRecord: () => void;
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
}

function PmEquipmentDetailTabInner({
    selectedItem,
    showCheckHistory,
    setShowCheckHistory,
    handleUpdate,
    handleAddCheckRecord,
    handleImageUpload,
    fileInputRef,
}: PmEquipmentDetailTabProps) {
    return (
        <div className="p-4 grid grid-cols-3 gap-4">
            {/* 좌측: 기본 정보 */}
            <div className="col-span-2 space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <span>📋</span> 기본 정보
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">설비/TOOL명 *</label>
                            <input
                                type="text"
                                value={selectedItem.name}
                                onChange={(e) => handleUpdate({ ...selectedItem, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="설비 또는 TOOL 이름"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">설비번호</label>
                            <input
                                type="text"
                                value={selectedItem.equipmentNo || ''}
                                onChange={(e) => handleUpdate({ ...selectedItem, equipmentNo: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="EQ-001"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">구분</label>
                            <select
                                value={selectedItem.type}
                                onChange={(e) => handleUpdate({ ...selectedItem, type: e.target.value as 'equipment' | 'tool' })}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                            >
                                <option value="equipment">설비</option>
                                <option value="tool">TOOL</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">상태</label>
                            <select
                                value={selectedItem.status}
                                onChange={(e) => handleUpdate({ ...selectedItem, status: e.target.value as any })}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                            >
                                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                    <option key={key} value={key}>{config.icon} {config.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">규격</label>
                            <input
                                type="text"
                                value={selectedItem.specification || ''}
                                onChange={(e) => handleUpdate({ ...selectedItem, specification: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="100mm x 50mm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">제조사</label>
                            <input
                                type="text"
                                value={selectedItem.manufacturer || ''}
                                onChange={(e) => handleUpdate({ ...selectedItem, manufacturer: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="제조사명"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">위치</label>
                            <input
                                type="text"
                                value={selectedItem.location || ''}
                                onChange={(e) => handleUpdate({ ...selectedItem, location: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="A동 2층 생산라인"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">비고</label>
                            <textarea
                                value={selectedItem.note || ''}
                                onChange={(e) => handleUpdate({ ...selectedItem, note: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                                rows={2}
                                placeholder="추가 메모"
                            />
                        </div>
                    </div>
                </div>

                {/* 점검 관리 */}
                <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <span>🔍</span> 점검 관리
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">점검 주기</label>
                            <select
                                value={selectedItem.checkCycle || ''}
                                onChange={(e) => handleUpdate({ ...selectedItem, checkCycle: e.target.value as any || undefined })}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 text-sm"
                            >
                                <option value="">선택 안함</option>
                                {Object.entries(CYCLE_CONFIG).map(([key, config]) => (
                                    <option key={key} value={key}>{config.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">최근 점검일</label>
                            <input
                                type="date"
                                value={selectedItem.lastCheckDate || ''}
                                onChange={(e) => {
                                    const lastDate = e.target.value;
                                    handleUpdate({
                                        ...selectedItem,
                                        lastCheckDate: lastDate,
                                        nextCheckDate: selectedItem.checkCycle
                                            ? calculateNextCheckDate(lastDate, selectedItem.checkCycle)
                                            : undefined
                                    });
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">다음 점검 예정일</label>
                            <input
                                type="date"
                                value={selectedItem.nextCheckDate || ''}
                                readOnly
                                className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-sm"
                            />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                        <button
                            onClick={handleAddCheckRecord}
                            className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors"
                        >
                            ✅ 점검 기록 추가
                        </button>
                        <button
                            onClick={() => setShowCheckHistory(!showCheckHistory)}
                            className="px-3 py-1.5 bg-gray-500 text-white rounded text-xs font-medium hover:bg-gray-600 transition-colors"
                        >
                            📜 점검 이력 {showCheckHistory ? '숨기기' : '보기'} ({selectedItem.checkHistory?.length || 0}건)
                        </button>
                    </div>
                    {showCheckHistory && selectedItem.checkHistory && selectedItem.checkHistory.length > 0 && (
                        <div className="mt-3 max-h-40 overflow-y-auto">
                            <table className="w-full text-xs border-collapse">
                                <thead className="bg-green-100 sticky top-0">
                                    <tr>
                                        <th className="border border-gray-300 px-2 py-1">점검일</th>
                                        <th className="border border-gray-300 px-2 py-1">점검자</th>
                                        <th className="border border-gray-300 px-2 py-1">결과</th>
                                        <th className="border border-gray-300 px-2 py-1">비고</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...selectedItem.checkHistory].reverse().map((record, idx) => (
                                        <tr key={idx} className="bg-white">
                                            <td className="border border-gray-300 px-2 py-1 text-center">{record.date}</td>
                                            <td className="border border-gray-300 px-2 py-1 text-center">{record.checker}</td>
                                            <td className="border border-gray-300 px-2 py-1 text-center">
                                                <span className={`px-1.5 py-0.5 rounded ${record.result === 'pass' ? 'bg-green-100 text-green-700' :
                                                    record.result === 'fail' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {record.result === 'pass' ? '합격' : record.result === 'fail' ? '불합격' : '조건부'}
                                                </span>
                                            </td>
                                            <td className="border border-gray-300 px-2 py-1">{record.note || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* 우측: 이미지 */}
            <div className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <span>📷</span> 설비 사진
                    </h4>
                    <div className="relative">
                        {selectedItem.image ? (
                            <div className="relative">
                                <img
                                    src={selectedItem.image}
                                    alt="설비 사진"
                                    className="w-full h-48 object-contain bg-white rounded border border-gray-200"
                                />
                                <div className="absolute bottom-2 right-2 flex gap-1">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-2 py-1 bg-blue-500/90 text-white rounded text-[10px] hover:bg-blue-600 transition-colors"
                                    >
                                        변경
                                    </button>
                                    <button
                                        onClick={() => handleUpdate({ ...selectedItem, image: undefined })}
                                        className="px-2 py-1 bg-red-500/90 text-white rounded text-[10px] hover:bg-red-600 transition-colors"
                                    >
                                        삭제
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="h-48 border-2 border-dashed border-blue-300 rounded-lg flex flex-col items-center justify-center bg-white hover:bg-blue-50 transition-colors cursor-pointer"
                            >
                                <span className="text-3xl mb-2">📷</span>
                                <span className="text-xs text-gray-500">클릭하여 사진 추가</span>
                            </div>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                        />
                    </div>
                </div>

                {/* 빠른 상태 */}
                <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-bold text-gray-700 mb-3">📊 상태 요약</h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">현재 상태:</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_CONFIG[selectedItem.status].color}`}>
                                {STATUS_CONFIG[selectedItem.status].icon} {STATUS_CONFIG[selectedItem.status].label}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">점검 이력:</span>
                            <span className="font-medium">{selectedItem.checkHistory?.length || 0}건</span>
                        </div>
                        {selectedItem.nextCheckDate && (
                            <div className="flex justify-between">
                                <span className="text-gray-500">다음 점검:</span>
                                <span className={`font-medium ${new Date(selectedItem.nextCheckDate) < new Date()
                                    ? 'text-red-600'
                                    : 'text-green-600'
                                    }`}>
                                    {selectedItem.nextCheckDate}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

const PmEquipmentDetailTab = React.memo(PmEquipmentDetailTabInner);
export default PmEquipmentDetailTab;
