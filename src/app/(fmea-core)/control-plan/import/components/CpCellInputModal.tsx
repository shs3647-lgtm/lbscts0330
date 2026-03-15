// CODEFREEZE
/**
 * @file CpCellInputModal.tsx
 * @description CP 셀 클릭 시 표시되는 입력 모달 (PFMEA 데이터 연동)
 * @created 2026-01-24
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Plus, Search, Link2 } from 'lucide-react';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';

// 컬럼별 설정
const COLUMN_CONFIG: Record<string, {
    label: string;
    type: 'text' | 'select' | 'multi-select' | 'dropdown';
    options?: string[];
    pfmeaField?: string;  // PFMEA에서 가져올 필드
}> = {
    processName: { label: '공정명(Process Name)', type: 'text', pfmeaField: 'processName' },
    level: { label: '레벨(Level)', type: 'dropdown', options: ['Main', 'Sub', '-'] },
    processDesc: { label: '공정설명(Process Desc.)', type: 'text' },
    equipment: { label: '설비(Equipment)', type: 'text' },
    productChar: { label: '제품특성(Product Char.)', type: 'multi-select', pfmeaField: 'A4' },
    processChar: { label: '공정특성(Process Char.)', type: 'multi-select', pfmeaField: 'B3' },
    specialChar: { label: '특별특성(SC)', type: 'dropdown', options: ['★', '◇', '-'] },
    spec: { label: '스펙/허용차(Spec/Tolerance)', type: 'text' },
    evalMethod: { label: '평가/측정방법(Eval Method)', type: 'select', options: ['육안검사', '버니어캘리퍼스', '마이크로미터', '게이지', '압력계', '온도계', '저울', '테스터', '직접입력'] },
    sampleSize: { label: '샘플크기(Sample Size)', type: 'text' },
    frequency: { label: '주기(Freq.)', type: 'dropdown', options: ['1회/시작', '4시간', '2시간', '1시간', '30분', '매회', '전수', '직접입력'] },
    controlMethod: { label: '관리방법(Control Method)', type: 'select', options: ['SPC', 'Xbar-R', '관리도', '체크시트', '자동제어', '직접입력'] },
    owner1: { label: '책임1(Owner1)', type: 'text' },
    owner2: { label: '책임2(Owner2)', type: 'text' },
    reactionPlan: { label: '대응계획(Reaction Plan)', type: 'multi-select', pfmeaField: 'reactionPlan', options: ['재작업(Rework)', '폐기(Scrap)', '선별(Sort)', '공정조정(Process Adj.)', '설비점검(Equip. Check)', '담당자 보고(Report)', '직접입력'] },
};

interface PfmeaData {
    processNo: string;
    processName: string;
    A3?: string;  // 기능
    A4?: string;  // 제품특성 (고장형태)
    A5?: string;  // 고장형태
    B1?: string;  // 작업요소
    B2?: string;  // 기능
    B3?: string;  // 공정특성
    B4?: string;  // 고장원인
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    processNo: string;
    processName: string;
    columnKey: string;
    currentValue: string;
    pfmeaData?: PfmeaData[];  // PFMEA 연동 데이터
    onSave: (processNo: string, columnKey: string, value: string) => void;
}

export function CpCellInputModal({
    isOpen,
    onClose,
    processNo,
    processName,
    columnKey,
    currentValue,
    pfmeaData = [],
    onSave,
}: Props) {
    const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({ isOpen, width: 500, height: 400, minWidth: 400, minHeight: 280 });

    const [inputValue, setInputValue] = useState(currentValue);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [customInput, setCustomInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // 컬럼 설정
    const config = COLUMN_CONFIG[columnKey] || { label: columnKey, type: 'text' };

    // 초기화
    useEffect(() => {
        if (isOpen) {
            setInputValue(currentValue);
            if (config.type === 'multi-select' && currentValue) {
                setSelectedItems(new Set(currentValue.split(',').map(s => s.trim()).filter(Boolean)));
            } else {
                setSelectedItems(new Set());
            }
            setCustomInput('');
            setSearchQuery('');
        }
    }, [isOpen, currentValue, config.type]);

    // PFMEA 연동 옵션
    const pfmeaOptions = useMemo(() => {
        if (!config.pfmeaField || pfmeaData.length === 0) return [];

        const options: { value: string; source: string; specialChar?: string }[] = [];

        pfmeaData
            .filter(d => d.processNo === processNo)
            .forEach(d => {
                const value = d[config.pfmeaField as keyof PfmeaData];
                if (value && typeof value === 'string') {
                    // 쉼표로 분리된 값 처리
                    value.split(',').forEach(v => {
                        const trimmed = v.trim();
                        if (trimmed && !options.find(o => o.value === trimmed)) {
                            options.push({ value: trimmed, source: 'PFMEA' });
                        }
                    });
                }
            });

        return options;
    }, [pfmeaData, processNo, config.pfmeaField]);

    // 전체 옵션 (PFMEA + 기본 옵션)
    const allOptions = useMemo(() => {
        const opts = [...pfmeaOptions];

        // 기본 옵션 추가
        if (config.options) {
            config.options.forEach(opt => {
                if (opt !== '직접입력' && !opts.find(o => o.value === opt)) {
                    opts.push({ value: opt, source: '기본' });
                }
            });
        }

        // 검색 필터
        if (searchQuery) {
            return opts.filter(o => o.value.toLowerCase().includes(searchQuery.toLowerCase()));
        }

        return opts;
    }, [pfmeaOptions, config.options, searchQuery]);

    // 아이템 토글
    const toggleItem = (value: string) => {
        const newSet = new Set(selectedItems);
        if (newSet.has(value)) {
            newSet.delete(value);
        } else {
            newSet.add(value);
        }
        setSelectedItems(newSet);
    };

    // 커스텀 아이템 추가
    const addCustomItem = () => {
        if (customInput.trim()) {
            const newSet = new Set(selectedItems);
            newSet.add(customInput.trim());
            setSelectedItems(newSet);
            setCustomInput('');
        }
    };

    // 저장
    const handleSave = () => {
        let finalValue = '';

        if (config.type === 'multi-select') {
            finalValue = Array.from(selectedItems).join(', ');
        } else if (config.type === 'select' || config.type === 'dropdown') {
            finalValue = inputValue === '직접입력' ? customInput : inputValue;
        } else {
            finalValue = inputValue;
        }

        onSave(processNo, columnKey, finalValue);
        onClose();
    };

    if (!isOpen) return null;

    return typeof document === 'undefined' ? null : createPortal(
        <div className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
            style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}>
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-t-lg flex items-center justify-between cursor-move" onMouseDown={onDragStart}>
                <div className="flex items-center gap-2">
                    <span className="text-lg">🔧</span>
                    <div>
                        <div className="font-bold text-sm">공정 {processNo} - {processName}</div>
                        <div className="text-[11px] text-blue-200">{config.label} 입력</div>
                    </div>
                </div>
                <button onMouseDown={e => e.stopPropagation()} onClick={onClose} className="hover:bg-white/20 p-1 rounded transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

                {/* 본문 */}
                <div className="flex-1 overflow-y-auto p-4">
                    {/* PFMEA 연동 데이터 표시 */}
                    {pfmeaOptions.length > 0 && (
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Link2 className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-bold text-blue-700">PFMEA 연동 데이터</span>
                                <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                                    {pfmeaOptions.length}건
                                </span>
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 max-h-[120px] overflow-y-auto">
                                {pfmeaOptions.map((opt, i) => (
                                    <label
                                        key={i}
                                        className="flex items-center gap-2 p-2 hover:bg-blue-100 rounded cursor-pointer transition-colors"
                                    >
                                        {config.type === 'multi-select' ? (
                                            <input
                                                type="checkbox"
                                                checked={selectedItems.has(opt.value)}
                                                onChange={() => toggleItem(opt.value)}
                                                className="accent-blue-600"
                                            />
                                        ) : (
                                            <input
                                                type="radio"
                                                name="selected"
                                                checked={inputValue === opt.value}
                                                onChange={() => setInputValue(opt.value)}
                                                className="accent-blue-600"
                                            />
                                        )}
                                        <span className="text-sm">{opt.value}</span>
                                        <span className="text-[10px] bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded ml-auto">
                                            PFMEA
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 옵션 선택 (select/multi-select) */}
                    {(config.type === 'select' || config.type === 'multi-select') && config.options && (
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-bold text-gray-700">옵션 선택(Select Option)</span>
                            </div>

                            {/* 검색 */}
                            {allOptions.length > 5 && (
                                <div className="relative mb-2">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="검색...(Search)"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            )}

                            <div className="border border-gray-200 rounded-lg max-h-[150px] overflow-y-auto">
                                {allOptions.filter(o => o.source !== 'PFMEA').map((opt, i) => (
                                    <label
                                        key={i}
                                        className="flex items-center gap-2 p-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0 cursor-pointer transition-colors"
                                    >
                                        {config.type === 'multi-select' ? (
                                            <input
                                                type="checkbox"
                                                checked={selectedItems.has(opt.value)}
                                                onChange={() => toggleItem(opt.value)}
                                                className="accent-blue-600"
                                            />
                                        ) : (
                                            <input
                                                type="radio"
                                                name="selected"
                                                checked={inputValue === opt.value}
                                                onChange={() => setInputValue(opt.value)}
                                                className="accent-blue-600"
                                            />
                                        )}
                                        <span className="text-sm">{opt.value}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 드롭다운 */}
                    {config.type === 'dropdown' && (
                        <div className="mb-4">
                            <label className="text-sm font-bold text-gray-700 block mb-2">선택(Select)</label>
                            <select
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">-- 선택하세요 --</option>
                                {config.options?.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* 직접 입력 */}
                    <div className="mb-4">
                        <label className="text-sm font-bold text-gray-700 block mb-2">
                            {config.type === 'multi-select' ? '직접 추가(Custom Add)' : '직접 입력(Direct Input)'}
                        </label>
                        {config.type === 'multi-select' ? (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={customInput}
                                    onChange={e => setCustomInput(e.target.value)}
                                    placeholder="직접 입력 후 추가(Type & Add)"
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    onKeyDown={e => e.key === 'Enter' && addCustomItem()}
                                />
                                <button
                                    onClick={addCustomItem}
                                    disabled={!customInput.trim()}
                                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <input
                                type="text"
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                                placeholder={`${config.label} 입력`}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        )}
                    </div>

                    {/* 선택된 항목 (multi-select) */}
                    {config.type === 'multi-select' && selectedItems.size > 0 && (
                        <div className="mb-4">
                            <label className="text-sm font-bold text-gray-700 block mb-2">
                                선택된 항목(Selected) ({selectedItems.size}개)
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {Array.from(selectedItems).map(item => (
                                    <span
                                        key={item}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                                    >
                                        {item}
                                        <button
                                            onClick={() => toggleItem(item)}
                                            className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

            {/* 푸터 */}
            <div className="border-t border-gray-200 px-4 py-3 flex justify-end gap-2 bg-gray-50 rounded-b-lg">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
                >
                    취소(Cancel)
                </button>
                <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors text-sm font-medium flex items-center gap-1"
                >
                    <Check className="w-4 h-4" />
                    적용(Apply)
                </button>
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

export default CpCellInputModal;
