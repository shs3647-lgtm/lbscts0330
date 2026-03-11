/**
 * @file PmEquipmentModal.tsx
 * @description WS 설비/TOOL 관리 모달 (상세 정보 및 점검 관리 포함)
 * @version 2.1.0 - 2026-02-11: 상수/유틸/상세탭 분리 리팩토링
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PMMainDocument, EquipmentItem, createEmptyEquipmentItem } from '@/types/pm-main';
import { STATUS_CONFIG, CYCLE_CONFIG } from './PmEquipmentConstants';
import { calculateNextCheckDate } from './PmEquipmentUtils';
import PmEquipmentDetailTab from './PmEquipmentDetailTab';

interface PmEquipmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    wsData: PMMainDocument;
    setWsData: React.Dispatch<React.SetStateAction<PMMainDocument>>;
}

function PmEquipmentModalInner({
    isOpen,
    onClose,
    wsData,
    setWsData,
}: PmEquipmentModalProps) {
    const [mounted, setMounted] = useState(false);
    const [selectedItem, setSelectedItem] = useState<EquipmentItem | null>(null);
    const [showCheckHistory, setShowCheckHistory] = useState(false);
    const [activeTab, setActiveTab] = useState<'list' | 'detail'>('list');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // 설비 목록 가져오기 (신규 또는 구버전 호환)
    const equipmentList: EquipmentItem[] = wsData.equipmentList ||
        wsData.equipmentTools.map((name, idx) => ({
            id: `EQ-LEGACY-${idx}`,
            name,
            type: 'equipment' as const,
            status: 'normal' as const,
        }));

    // 설비 목록 업데이트
    const updateEquipmentList = useCallback((newList: EquipmentItem[]) => {
        setWsData(prev => ({
            ...prev,
            equipmentList: newList,
            // 구버전 호환을 위해 이름 목록도 동기화
            equipmentTools: newList.map(item => item.name),
        }));
    }, [setWsData]);

    // 항목 추가
    const handleAdd = useCallback(() => {
        const newItem = createEmptyEquipmentItem();
        updateEquipmentList([...equipmentList, newItem]);
        setSelectedItem(newItem);
        setActiveTab('detail');
    }, [equipmentList, updateEquipmentList]);

    // 샘플 데이터 로드
    const handleLoadSampleData = useCallback(() => {
        if (equipmentList.length > 0 && !confirm('기존 데이터가 있습니다. 샘플 데이터로 대체하시겠습니까?')) {
            return;
        }

        const sampleData: EquipmentItem[] = [
            {
                id: 'EQ-001',
                name: '유압 프레스 (Hydraulic Press)',
                equipmentNo: 'HP-2024-001',
                type: 'equipment',
                specification: '200톤, 스트로크 300mm',
                manufacturer: '(주)한국프레스',
                location: 'A동 1층 프레스라인',
                status: 'normal',
                checkCycle: 'weekly',
                lastCheckDate: '2026-01-27',
                nextCheckDate: '2026-02-03',
                checkHistory: [
                    { date: '2026-01-27', checker: '김정비', result: 'pass', note: '오일 레벨 정상' },
                    { date: '2026-01-20', checker: '이점검', result: 'pass', note: '' },
                    { date: '2026-01-13', checker: '김정비', result: 'conditional', note: '필터 교체 필요' },
                ],
                note: '주간 점검 필수, 오일 레벨 확인',
            },
            {
                id: 'EQ-002',
                name: 'CNC 선반 (CNC Lathe)',
                equipmentNo: 'CNC-2023-015',
                type: 'equipment',
                specification: 'MAX Φ300 x 1000L, 주축 15kW',
                manufacturer: '화천기계',
                location: 'B동 2층 CNC가공실',
                status: 'normal',
                checkCycle: 'daily',
                lastCheckDate: '2026-02-03',
                nextCheckDate: '2026-02-04',
                checkHistory: [
                    { date: '2026-02-03', checker: '박기술', result: 'pass', note: '윤활유 보충 완료' },
                    { date: '2026-02-02', checker: '박기술', result: 'pass', note: '' },
                ],
                note: '매일 시작 전 윤활유 점검',
            },
            {
                id: 'EQ-003',
                name: '자동 용접기 (Auto Welder)',
                equipmentNo: 'AW-2025-003',
                type: 'equipment',
                specification: 'CO2/MAG 겸용, 350A',
                manufacturer: '현대용접기',
                location: 'C동 1층 용접라인',
                status: 'checking',
                checkCycle: 'monthly',
                lastCheckDate: '2026-01-15',
                nextCheckDate: '2026-02-15',
                checkHistory: [
                    { date: '2026-01-15', checker: '최용접', result: 'pass', note: '토치 팁 교체' },
                ],
                note: '용접봉 재고 확인, 가스 잔량 체크',
            },
            {
                id: 'EQ-004',
                name: '항온항습기 (Temp/Humidity Chamber)',
                equipmentNo: 'TH-2022-008',
                type: 'equipment',
                specification: '온도 -40~150℃, 습도 20~98%RH',
                manufacturer: '삼성클린테크',
                location: 'D동 품질시험실',
                status: 'normal',
                checkCycle: 'quarterly',
                lastCheckDate: '2025-12-01',
                nextCheckDate: '2026-03-01',
                checkHistory: [
                    { date: '2025-12-01', checker: '정품질', result: 'pass', note: '교정 완료' },
                ],
                note: '분기별 교정 필수',
            },
            {
                id: 'TOOL-001',
                name: '토크렌치 (Torque Wrench)',
                equipmentNo: 'TW-SET-01',
                type: 'tool',
                specification: '10-200 N·m, 디지털',
                manufacturer: 'TOHNICHI',
                location: 'A동 공구실',
                status: 'normal',
                checkCycle: 'yearly',
                lastCheckDate: '2025-06-15',
                nextCheckDate: '2026-06-15',
                checkHistory: [
                    { date: '2025-06-15', checker: '외부업체', result: 'pass', note: '교정성적서 발급' },
                ],
                note: '연 1회 외부 교정 필수',
            },
            {
                id: 'TOOL-002',
                name: '버니어 캘리퍼스 (Vernier Caliper)',
                equipmentNo: 'VC-DIG-05',
                type: 'tool',
                specification: '0-300mm, 분해능 0.01mm',
                manufacturer: 'Mitutoyo',
                location: 'B동 측정실',
                status: 'normal',
                checkCycle: 'monthly',
                lastCheckDate: '2026-01-10',
                nextCheckDate: '2026-02-10',
                checkHistory: [
                    { date: '2026-01-10', checker: '김측정', result: 'pass', note: '' },
                ],
                note: '월 1회 마스터 게이지로 점검',
            },
            {
                id: 'TOOL-003',
                name: '전동 드라이버 (Electric Screwdriver)',
                equipmentNo: 'ED-2024-012',
                type: 'tool',
                specification: '0.1-2.0 N·m, 클러치 조절',
                manufacturer: 'HIOS',
                location: 'A동 조립라인',
                status: 'broken',
                checkCycle: 'weekly',
                lastCheckDate: '2026-01-28',
                nextCheckDate: '2026-02-04',
                checkHistory: [
                    { date: '2026-01-28', checker: '이조립', result: 'fail', note: '클러치 고장 - 수리 의뢰' },
                ],
                note: '수리 중 - 예비품 사용',
            },
            {
                id: 'EQ-005',
                name: '컨베이어 벨트 (Conveyor Belt)',
                equipmentNo: 'CB-LINE-02',
                type: 'equipment',
                specification: '폭 600mm, 길이 20m, 속도 가변',
                manufacturer: '대한벨트',
                location: 'A동 1층 조립라인',
                status: 'normal',
                checkCycle: 'monthly',
                lastCheckDate: '2026-01-20',
                nextCheckDate: '2026-02-20',
                checkHistory: [
                    { date: '2026-01-20', checker: '강설비', result: 'pass', note: '벨트 장력 조정' },
                ],
                note: '벨트 마모 상태 확인',
            },
        ];

        updateEquipmentList(sampleData);
        alert('✅ 8건의 샘플 데이터가 로드되었습니다.\n- 설비 5건 (프레스, CNC선반, 용접기, 항온항습기, 컨베이어)\n- TOOL 3건 (토크렌치, 캘리퍼스, 전동드라이버)');
    }, [equipmentList, updateEquipmentList]);

    // 항목 수정
    const handleUpdate = useCallback((updated: EquipmentItem) => {
        const newList = equipmentList.map(item =>
            item.id === updated.id ? updated : item
        );
        updateEquipmentList(newList);
        setSelectedItem(updated);
    }, [equipmentList, updateEquipmentList]);

    // 항목 삭제
    const handleDelete = useCallback((id: string) => {
        if (confirm('이 항목을 삭제하시겠습니까?')) {
            const newList = equipmentList.filter(item => item.id !== id);
            updateEquipmentList(newList);
            if (selectedItem?.id === id) {
                setSelectedItem(null);
                setActiveTab('list');
            }
        }
    }, [equipmentList, updateEquipmentList, selectedItem]);

    // 점검 기록 추가
    const handleAddCheckRecord = useCallback(() => {
        if (!selectedItem) return;

        const checker = prompt('점검자 이름을 입력하세요:');
        if (!checker) return;

        const resultStr = prompt('점검 결과를 입력하세요 (1: 합격, 2: 불합격, 3: 조건부합격):');
        const resultMap: { [key: string]: 'pass' | 'fail' | 'conditional' } = {
            '1': 'pass', '2': 'fail', '3': 'conditional'
        };
        const result = resultMap[resultStr || '1'] || 'pass';

        const note = prompt('비고 (선택사항):') || '';

        const today = new Date().toISOString().split('T')[0];
        const newHistory = {
            date: today,
            checker,
            result,
            note,
        };

        const updated: EquipmentItem = {
            ...selectedItem,
            lastCheckDate: today,
            nextCheckDate: selectedItem.checkCycle
                ? calculateNextCheckDate(today, selectedItem.checkCycle)
                : undefined,
            checkHistory: [...(selectedItem.checkHistory || []), newHistory],
        };

        handleUpdate(updated);
        alert('✅ 점검 기록이 추가되었습니다.');
    }, [selectedItem, handleUpdate]);

    // 이미지 업로드
    const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedItem) return;

        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드 가능합니다.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = ev.target?.result as string;
            handleUpdate({ ...selectedItem, image: base64 });
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    }, [selectedItem, handleUpdate]);

    if (!mounted || !isOpen) return null;

    const modalContent = (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-black/40">
            <div className="bg-white rounded-xl w-[95%] max-w-[1200px] max-h-[85vh] flex flex-col shadow-2xl">
                {/* 헤더 */}
                <div
                    className="text-white py-3 px-5 rounded-t-xl flex justify-between items-center"
                    style={{ background: 'linear-gradient(135deg, #1e88e5 0%, #1565c0 100%)' }}
                >
                    <div>
                        <h3 className="text-lg font-bold m-0">🔧 설비 / TOOL 관리</h3>
                        <p className="text-xs opacity-80 mt-1">공정에 사용되는 설비 및 TOOL을 상세하게 관리합니다.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                            총 {equipmentList.length}건
                        </span>
                        <button
                            onClick={onClose}
                            className="text-white hover:text-gray-200 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* 탭 메뉴 */}
                <div className="flex border-b border-gray-200 bg-gray-50">
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'list'
                            ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-600 hover:text-blue-600 hover:bg-white/50'
                            }`}
                    >
                        📋 목록 보기
                    </button>
                    <button
                        onClick={() => setActiveTab('detail')}
                        disabled={!selectedItem}
                        className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'detail'
                            ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                            : selectedItem
                                ? 'text-gray-600 hover:text-blue-600 hover:bg-white/50'
                                : 'text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        📝 상세 정보 {selectedItem && `(${selectedItem.name || '새 항목'})`}
                    </button>
                </div>

                {/* 본문 */}
                <div className="flex-1 overflow-auto">
                    {activeTab === 'list' ? (
                        /* ========== 목록 탭 - 카드 기반 직관적 UI ========== */
                        <div className="p-4">
                            {/* 상태별 요약 카드 */}
                            <div className="grid grid-cols-4 gap-3 mb-4">
                                {[
                                    { key: 'all', label: '전체', count: equipmentList.length, color: 'bg-gray-100 text-gray-700', icon: '📊' },
                                    { key: 'normal', label: '정상', count: equipmentList.filter(e => e.status === 'normal').length, color: 'bg-green-100 text-green-700', icon: '✅' },
                                    { key: 'checking', label: '점검중', count: equipmentList.filter(e => e.status === 'checking').length, color: 'bg-yellow-100 text-yellow-700', icon: '🔧' },
                                    { key: 'broken', label: '고장/폐기', count: equipmentList.filter(e => e.status === 'broken' || e.status === 'disposed').length, color: 'bg-red-100 text-red-700', icon: '❌' },
                                ].map((stat) => (
                                    <div key={stat.key} className={`${stat.color} rounded-xl p-3 text-center transition-transform hover:scale-105 cursor-pointer`}>
                                        <div className="text-2xl mb-1">{stat.icon}</div>
                                        <div className="text-2xl font-bold">{stat.count}</div>
                                        <div className="text-xs font-medium">{stat.label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* 긴급 알럿 - 점검 기한 초과 */}
                            {equipmentList.filter(e => e.nextCheckDate && new Date(e.nextCheckDate) < new Date()).length > 0 && (
                                <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-xl flex items-center gap-3">
                                    <span className="text-3xl animate-pulse">🚨</span>
                                    <div>
                                        <div className="font-bold text-red-700">점검 기한 초과 알림!</div>
                                        <div className="text-sm text-red-600">
                                            {equipmentList.filter(e => e.nextCheckDate && new Date(e.nextCheckDate) < new Date()).length}건의 설비/TOOL이 점검 예정일을 초과했습니다.
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 설비/TOOL 카드 그리드 */}
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                {equipmentList.map((item) => {
                                    const isOverdue = item.nextCheckDate && new Date(item.nextCheckDate) < new Date();
                                    const daysUntilCheck = item.nextCheckDate
                                        ? Math.ceil((new Date(item.nextCheckDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                                        : null;

                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => {
                                                setSelectedItem(item);
                                                setActiveTab('detail');
                                            }}
                                            className={`relative bg-white rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 ${item.status === 'broken' ? 'border-red-300 bg-red-50/50' :
                                                    item.status === 'checking' ? 'border-yellow-300 bg-yellow-50/50' :
                                                        isOverdue ? 'border-red-400 bg-red-50' :
                                                            'border-gray-200 hover:border-blue-400'
                                                }`}
                                        >
                                            {/* 상태 배지 (우상단) */}
                                            <div className="absolute top-2 right-2">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${STATUS_CONFIG[item.status].color}`}>
                                                    {STATUS_CONFIG[item.status].icon} {STATUS_CONFIG[item.status].label}
                                                </span>
                                            </div>

                                            {/* 타입 아이콘 + 이름 */}
                                            <div className="flex items-start gap-3 mb-3">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${item.type === 'equipment' ? 'bg-blue-100' : 'bg-purple-100'
                                                    }`}>
                                                    {item.type === 'equipment' ? '⚙️' : '🔨'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-gray-800 truncate pr-16">
                                                        {item.name || '(이름 없음)'}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {item.equipmentNo || 'ID 미등록'} · {item.type === 'equipment' ? '설비' : 'TOOL'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 정보 그리드 */}
                                            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                                <div className="bg-gray-50 rounded-lg p-2">
                                                    <div className="text-gray-400 mb-0.5">위치</div>
                                                    <div className="font-medium text-gray-700 truncate">{item.location || '-'}</div>
                                                </div>
                                                <div className="bg-gray-50 rounded-lg p-2">
                                                    <div className="text-gray-400 mb-0.5">점검주기</div>
                                                    <div className="font-medium text-gray-700">
                                                        {item.checkCycle ? CYCLE_CONFIG[item.checkCycle].label : '-'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 다음 점검일 */}
                                            {item.nextCheckDate && (
                                                <div className={`rounded-lg p-2 text-center ${isOverdue ? 'bg-red-100' :
                                                        daysUntilCheck !== null && daysUntilCheck <= 7 ? 'bg-yellow-100' : 'bg-green-50'
                                                    }`}>
                                                    <div className={`text-xs ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                                                        다음 점검
                                                    </div>
                                                    <div className={`font-bold ${isOverdue ? 'text-red-700' :
                                                            daysUntilCheck !== null && daysUntilCheck <= 7 ? 'text-yellow-700' : 'text-green-700'
                                                        }`}>
                                                        {item.nextCheckDate}
                                                        {isOverdue && <span className="ml-1 animate-pulse">⚠️ 초과!</span>}
                                                        {!isOverdue && daysUntilCheck !== null && daysUntilCheck <= 7 && (
                                                            <span className="ml-1">({daysUntilCheck}일 후)</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* 점검 이력 수 */}
                                            {item.checkHistory && item.checkHistory.length > 0 && (
                                                <div className="mt-2 text-xs text-gray-400 text-right">
                                                    📋 점검이력 {item.checkHistory.length}건
                                                </div>
                                            )}

                                            {/* 삭제 버튼 */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(item.id);
                                                }}
                                                className="absolute bottom-2 right-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                title="삭제"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    );
                                })}

                                {/* 새 항목 추가 카드 */}
                                <div
                                    onClick={handleAdd}
                                    className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-4 cursor-pointer transition-all hover:border-blue-400 hover:bg-blue-50 flex flex-col items-center justify-center min-h-[200px]"
                                >
                                    <div className="text-4xl mb-2">➕</div>
                                    <div className="font-bold text-gray-600">새 항목 추가</div>
                                    <div className="text-xs text-gray-400 mt-1">클릭하여 설비/TOOL 등록</div>
                                </div>
                            </div>

                            {/* 빈 상태 */}
                            {equipmentList.length === 0 && (
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4">🔧</div>
                                    <div className="text-xl font-bold text-gray-600 mb-2">등록된 설비/TOOL이 없습니다</div>
                                    <div className="text-gray-400 mb-4">새 항목을 추가하거나 샘플 데이터를 로드하세요</div>
                                    <div className="flex items-center justify-center gap-3">
                                        <button
                                            onClick={handleAdd}
                                            className="px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-colors"
                                        >
                                            ➕ 새 항목 추가
                                        </button>
                                        <button
                                            onClick={handleLoadSampleData}
                                            className="px-6 py-3 bg-purple-500 text-white rounded-xl font-bold hover:bg-purple-600 transition-colors"
                                        >
                                            📋 샘플 데이터
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ========== 상세 정보 탭 ========== */
                        selectedItem && (
                            <PmEquipmentDetailTab
                                selectedItem={selectedItem}
                                showCheckHistory={showCheckHistory}
                                setShowCheckHistory={setShowCheckHistory}
                                handleUpdate={handleUpdate}
                                handleAddCheckRecord={handleAddCheckRecord}
                                handleImageUpload={handleImageUpload}
                                fileInputRef={fileInputRef}
                            />
                        )
                    )}
                </div>

                {/* 푸터 */}
                <div className="py-3 px-5 bg-gray-100 rounded-b-xl flex justify-between items-center border-t border-gray-200">
                    <div className="text-xs text-gray-500">
                        {selectedItem && activeTab === 'detail' && (
                            <span>ID: {selectedItem.id}</span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleLoadSampleData}
                            className="px-4 py-2 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-700 transition-colors shadow-sm flex items-center gap-2"
                        >
                            <span>📋</span> 샘플 데이터 로드
                        </button>
                        <button
                            onClick={handleAdd}
                            className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                        >
                            <span>➕</span> 새 항목 추가
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

const PmEquipmentModal = React.memo(PmEquipmentModalInner);
export default PmEquipmentModal;
