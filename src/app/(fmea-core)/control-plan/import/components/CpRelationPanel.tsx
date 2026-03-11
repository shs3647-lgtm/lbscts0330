/**
 * @file CpRelationPanel.tsx
 * @description CP Import 우측 관계형 데이터 패널 (PFMEA ImportRelationPanel 벤치마킹)
 * @created 2026-01-24
 */

'use client';

import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Link2, ExternalLink } from 'lucide-react';
import type { ImportedData } from '../types';

// 탭별 컬럼 정의
const CP_RELATION_TABS = [
    {
        key: 'processInfo',
        label: '공정현황(Process Status)',
        columns: [
            { key: 'processNo', label: '공정번호(P-No)', width: 'w-[60px]' },
            { key: 'processName', label: '공정명(Process Name)', width: 'w-[100px]' },
            { key: 'level', label: '레벨(Level)', width: 'w-[50px]' },
            { key: 'processDesc', label: '공정설명(Process Desc.)', width: 'w-[120px]' },
            { key: 'equipment', label: '설비(Equipment)', width: 'w-[100px]' },
        ]
    },
    {
        key: 'controlItem',
        label: '관리항목(Control Item)',
        columns: [
            { key: 'processNo', label: '공정번호(P-No)', width: 'w-[60px]' },
            { key: 'processName', label: '공정명(Process Name)', width: 'w-[80px]' },
            { key: 'productChar', label: '제품특성(Product Char.)', width: 'w-[100px]', clickable: true },
            { key: 'processChar', label: '공정특성(Process Char.)', width: 'w-[100px]', clickable: true },
            { key: 'specialChar', label: '특별(SC)', width: 'w-[40px]' },
            { key: 'spec', label: '스펙/허용차(Spec)', width: 'w-[100px]' },
        ]
    },
    {
        key: 'controlMethod',
        label: '관리방법(Control Method)',
        columns: [
            { key: 'processNo', label: '공정번호(P-No)', width: 'w-[60px]' },
            { key: 'processName', label: '공정명(Process Name)', width: 'w-[80px]' },
            { key: 'evalMethod', label: '평가방법(Eval Method)', width: 'w-[80px]', clickable: true },
            { key: 'sampleSize', label: '샘플크기(Sample)', width: 'w-[60px]' },
            { key: 'frequency', label: '주기(Freq.)', width: 'w-[60px]' },
            { key: 'controlMethod', label: '관리방법(Ctrl Method)', width: 'w-[80px]', clickable: true },
            { key: 'owner1', label: '책임1(Owner1)', width: 'w-[50px]' },
        ]
    },
    {
        key: 'reactionPlan',
        label: '대응계획(Reaction Plan)',
        columns: [
            { key: 'processNo', label: '공정번호(P-No)', width: 'w-[60px]' },
            { key: 'processName', label: '공정명(Process Name)', width: 'w-[100px]' },
            { key: 'productChar', label: '제품특성(Product Char.)', width: 'w-[100px]' },
            { key: 'processChar', label: '공정특성(Process Char.)', width: 'w-[100px]' },
            { key: 'reactionPlan', label: '대응계획(Reaction Plan)', width: 'w-[150px]', clickable: true },
        ]
    },
];

// itemCode -> key 매핑
const ITEM_CODE_TO_KEY: Record<string, string> = {
    'A1': 'processNo',
    'A2': 'processName',
    'A3': 'level',
    'A4': 'processDesc',
    'A5': 'equipment',
    'A6': 'ep',
    'A7': 'autoDetector',
    'B1': 'productChar',
    'B2': 'processChar',
    'B3': 'specialChar',
    'B4': 'spec',
    'B5': 'evalMethod',
    'B6': 'sampleSize',
    'B7': 'frequency',
    'B7-1': 'controlMethod',
    'B8': 'owner1',
    'B9': 'owner2',
    'B10': 'reactionPlan',
};

interface Props {
    flatData: ImportedData[];
    selectedCpId: string;
    onCellClick?: (processNo: string, columnKey: string, currentValue: string) => void;
    onLinkClick?: (processNo: string) => void;
}

export function CpRelationPanel({ flatData, selectedCpId, onCellClick, onLinkClick }: Props) {
    const [activeTab, setActiveTab] = useState<string>('processInfo');

    // 공정번호 목록 (정렬)
    const processNos = useMemo(() => {
        const nos = [...new Set(flatData.map(d => d.processNo))];
        return nos.sort((a, b) => {
            const numA = parseInt(a, 10);
            const numB = parseInt(b, 10);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b, undefined, { numeric: true });
        });
    }, [flatData]);

    // 공정별 데이터 맵
    const processDataMap = useMemo(() => {
        const map = new Map<string, Record<string, string>>();

        flatData.forEach(item => {
            if (!map.has(item.processNo)) {
                map.set(item.processNo, { processNo: item.processNo });
            }
            const row = map.get(item.processNo)!;
            const key = ITEM_CODE_TO_KEY[item.itemCode] || item.itemCode;
            row[key] = item.value || '';

            // 공정명은 별도 처리
            if (item.processName) {
                row.processName = item.processName;
            }
        });

        return map;
    }, [flatData]);

    // 현재 탭 설정
    const currentTab = CP_RELATION_TABS.find(t => t.key === activeTab) || CP_RELATION_TABS[0];

    // 테이블 행 데이터
    const rows = useMemo(() => {
        return processNos.map(processNo => processDataMap.get(processNo) || { processNo });
    }, [processNos, processDataMap]);

    // 통계
    const stats = {
        total: flatData.length,
        processCount: processNos.length,
        filled: flatData.filter(d => d.value?.trim()).length,
        empty: flatData.filter(d => !d.value?.trim()).length,
    };

    const handleCellClick = (processNo: string, columnKey: string, value: string) => {
        if (onCellClick) {
            onCellClick(processNo, columnKey, value);
        }
    };

    return (
        <div className="flex-1 min-w-[450px] flex flex-col border-2 border-blue-600 rounded-lg overflow-hidden bg-white shadow-lg">
            {/* 헤더 */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white px-4 py-2 text-sm font-bold flex items-center justify-between">
                <div className="flex items-center gap-2 whitespace-nowrap">
                    <span>📊</span> CP 분석 DATA : {selectedCpId || 'CP 미선택'}
                </div>
                <div className="flex items-center gap-2 text-[11px] font-normal">
                    {flatData.length > 0 && (
                        <>
                            <span className="bg-white/20 px-2 py-0.5 rounded whitespace-nowrap">
                                공정: <b className="text-yellow-300">{stats.processCount}</b>
                            </span>
                            <span className="bg-green-500/40 px-2 py-0.5 rounded whitespace-nowrap">
                                데이터: <b className="text-green-200">{stats.filled}</b>
                            </span>
                            <span className={`px-2 py-0.5 rounded whitespace-nowrap ${stats.empty > 0 ? 'bg-red-500/40' : 'bg-gray-500/40'}`}>
                                누락: <b className={stats.empty > 0 ? 'text-red-200' : 'text-gray-200'}>{stats.empty}</b>
                            </span>
                        </>
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col">
                {/* 탭 */}
                <div className="flex w-full border-b border-gray-400 shrink-0 bg-gray-50">
                    {CP_RELATION_TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 px-3 py-2 text-[11px] font-bold border-r border-gray-300 transition-colors ${activeTab === tab.key
                                    ? 'bg-blue-100 text-blue-800 border-b-2 border-b-blue-600'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* 테이블 */}
                <div className="flex-1 overflow-y-auto overflow-x-auto max-h-[400px] border-t border-gray-200 bg-gray-50">
                    {/* 데이터 없음 상태 */}
                    {rows.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full py-16 text-gray-400">
                            <div className="text-4xl mb-4">📊</div>
                            <div className="text-sm font-bold mb-2">기초정보를 먼저 Import하세요</div>
                            <div className="text-[10px] text-gray-400">
                                좌측에서 엑셀 파일을 업로드하거나<br />
                                워크시트 Import를 이용하세요
                            </div>
                        </div>
                    )}

                    {/* 데이터 테이블 */}
                    {rows.length > 0 && (
                        <table className="w-full border-collapse table-fixed min-w-[600px]">
                            <colgroup>
                                <col className="w-[25px]" /> {/* 체크박스 */}
                                <col className="w-[30px]" /> {/* NO */}
                                <col className="w-[30px]" /> {/* 순서 */}
                                {currentTab.columns.map((col, i) => (
                                    <col key={i} className={col.width} />
                                ))}
                                <col className="w-[50px]" /> {/* 연결 */}
                            </colgroup>
                            <thead className="sticky top-0 z-[1]">
                                <tr>
                                    <th className="bg-gray-200 border border-gray-400 text-[10px] font-medium text-center p-1">
                                        <input type="checkbox" />
                                    </th>
                                    <th className="bg-gray-200 border border-gray-400 text-[10px] font-medium text-center p-1">NO</th>
                                    <th className="bg-gray-200 border border-gray-400 text-[10px] font-medium text-center p-1">순서</th>
                                    {currentTab.columns.map((col, i) => (
                                        <th key={i} className="bg-blue-100 border border-gray-400 text-[10px] font-medium text-center p-1 text-blue-800">
                                            {col.label}
                                        </th>
                                    ))}
                                    <th className="bg-blue-100 border border-gray-400 text-[10px] font-medium text-center p-1 text-blue-700">
                                        연결
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, i) => (
                                    <tr key={row.processNo} className="hover:bg-blue-50 transition-colors">
                                        <td className="border border-gray-300 text-center p-1">
                                            <input type="checkbox" className="cursor-pointer" />
                                        </td>
                                        <td className="border border-gray-300 text-[10px] text-center p-1 text-gray-600">{i + 1}</td>
                                        <td className="border border-gray-300 text-center p-1">
                                            <div className="flex flex-col items-center gap-0 cursor-pointer">
                                                <ChevronUp className="w-2.5 h-2.5 text-gray-400 hover:text-blue-600" />
                                                <ChevronDown className="w-2.5 h-2.5 text-gray-400 hover:text-blue-600" />
                                            </div>
                                        </td>
                                        {currentTab.columns.map((col, j) => {
                                            const value = row[col.key] || '';
                                            const isClickable = col.clickable && !value;

                                            return (
                                                <td
                                                    key={j}
                                                    className={`border border-gray-300 text-[10px] p-1 ${isClickable
                                                            ? 'cursor-pointer hover:bg-orange-100 text-orange-400'
                                                            : col.clickable
                                                                ? 'cursor-pointer hover:bg-blue-100'
                                                                : ''
                                                        }`}
                                                    onClick={() => col.clickable && handleCellClick(row.processNo, col.key, value)}
                                                >
                                                    {value ? (
                                                        <span className="break-words whitespace-normal leading-tight block px-1">
                                                            {value}
                                                        </span>
                                                    ) : isClickable ? (
                                                        <span className="text-[10px] text-orange-400 underline">[클릭]</span>
                                                    ) : (
                                                        <span className="text-gray-300">-</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td className="border border-gray-300 text-center p-1">
                                            <button
                                                onClick={() => onLinkClick?.(row.processNo)}
                                                className="text-blue-500 hover:text-blue-700 transition-colors"
                                                title="PFMEA 연결"
                                            >
                                                <Link2 className="w-3.5 h-3.5 inline" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* 푸터 */}
                <div className="px-4 py-2 bg-gradient-to-br from-blue-50 to-gray-100 border-t-2 border-gray-600 text-[11px] text-gray-700 text-center shrink-0 font-bold">
                    ▼ 총 {rows.length}개 공정 ━━ {currentTab.label} ━━ ▼
                </div>
            </div>
        </div>
    );
}

export default CpRelationPanel;
