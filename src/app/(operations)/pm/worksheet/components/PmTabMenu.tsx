/**
 * @file PmTabMenu.tsx
 * @description WS 워크시트 탭 메뉴 (CP 연동, 초안/확정/승인)
 * @version 1.0.0
 * @created 2026-02-01
 */

import React from 'react';
import { useLocale } from '@/lib/locale';

interface ExtensionMergeSettings {
    all: boolean;
    D: boolean;
    E: boolean;
    F: boolean;
    H: boolean;
}

interface PmTabMenuProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    pmNo?: string;
    cpNo?: string;
    itemCount?: number;
    dirty?: boolean;
    status?: 'draft' | 'review' | 'approved' | 'obsolete';
    // ★ 액션 props
    onConfirm?: () => void;
    onApprove?: () => void;
    // ★ 토글 관련 props
    inputMode?: 'manual' | 'auto';
    onInputModeChange?: (mode: 'manual' | 'auto') => void;
    extensionMerge?: ExtensionMergeSettings;
    onExtensionMergeToggle?: (key: 'all' | 'D' | 'E' | 'F' | 'H') => void;
}

function PmTabMenuInner({
    activeTab,
    onTabChange,
    pmNo,
    cpNo,
    itemCount = 0,
    dirty = false,
    status = 'draft',
    onConfirm,
    onApprove,
    inputMode = 'manual',
    onInputModeChange,
    extensionMerge = { all: true, D: true, E: true, F: true, H: true },
    onExtensionMergeToggle,
}: PmTabMenuProps) {
    const { t } = useLocale();

    // ★★★ WS 탭 구조: 첫화면 = PM Work Sheet ★★★
    const tabs = [
        { id: 'pm-main', label: 'PM Main', icon: '📋', count: undefined },
        { id: 'pm-worksheet', label: 'PM Work Sheet', icon: '📝', count: itemCount },
        { id: 'equipment', label: '설비/TOOL', icon: '🔧', count: undefined },
        { id: 'work-standard', label: '작업표준', icon: '📖', count: undefined },
    ];

    return (
        <div
            className="fixed top-[81px] left-[53px] right-0 h-9 z-[98] border-b border-white/30"
            style={{ background: '#5A6C7D' }}
        >
            <div className="flex items-center h-full px-1 sm:px-2 justify-between">
                <div className="flex items-center">
                    {/* 탭 버튼 */}
                    <nav className="flex gap-0.5 min-w-fit items-center">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={`py-1 px-2 sm:px-3 text-[11px] font-medium transition-all whitespace-nowrap rounded ${activeTab === tab.id
                                    ? 'bg-teal-600 text-white'
                                    : 'bg-transparent text-white/70 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                <span className="hidden sm:inline mr-1">{tab.icon}</span>
                                {t(tab.label)}
                                {tab.count !== undefined && tab.count > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 text-[9px] font-bold bg-white/30 rounded-full">
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}

                        <div className="w-px h-5 bg-white/50 mx-1" />

                        {/* CP 연동 표시 */}
                        {cpNo && (
                            <span className="px-2 py-0.5 text-[10px] font-medium bg-purple-500 text-white rounded">
                                🔗 CP: {cpNo}
                            </span>
                        )}
                    </nav>

                    {/* 상태 및 확정/승인 버튼 */}
                    <div className="flex items-center gap-1 ml-2">
                        {/* 상태 배지 */}
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${status === 'approved' ? 'bg-green-500 text-white' :
                            status === 'review' ? 'bg-yellow-500 text-black' :
                                'bg-gray-500 text-white'
                            }`}>
                            {status === 'approved' ? `✅ ${t('승인됨')}` :
                                status === 'review' ? `📝 ${t('확정')}` :
                                    `📄 ${t('초안')}`}
                        </span>

                        {/* 확정 버튼 */}
                        <button
                            onClick={onConfirm}
                            disabled={status === 'approved'}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded border-2 transition-all ${status === 'approved'
                                ? 'border-gray-400 text-gray-400 cursor-not-allowed opacity-50'
                                : status === 'review'
                                    ? 'border-green-400 text-green-400 hover:bg-green-400/20'
                                    : 'border-yellow-400 text-yellow-400 hover:bg-yellow-400/20'
                                }`}
                            title={status === 'approved' ? '승인된 WS는 수정할 수 없습니다' : '현재 데이터를 DB에 확정 저장'}
                        >
                            {status === 'review' ? t('재확정') : t('확정')}
                        </button>

                        {/* 승인 버튼 */}
                        <button
                            onClick={onApprove}
                            disabled={status === 'approved' || status === 'draft'}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded border-2 transition-all ${status === 'approved'
                                ? 'border-green-500 bg-green-500 text-white cursor-not-allowed'
                                : status === 'review'
                                    ? 'border-purple-400 text-purple-400 hover:bg-purple-400/20'
                                    : 'border-gray-400 text-gray-400 cursor-not-allowed opacity-50'
                                }`}
                            title={
                                status === 'approved' ? '이미 승인되었습니다' :
                                    status === 'draft' ? '먼저 확정을 눌러주세요' :
                                        '최종 승인'
                            }
                        >
                            {status === 'approved' ? t('승인됨') : t('승인')}
                        </button>
                    </div>
                </div>

                {/* ★★★ 우측: 토글 영역 ★★★ */}
                <div className="flex items-center gap-2">
                    {/* 입력 레이블 + 수동/자동 토글 */}
                    <span className="text-[10px] text-white/80 font-medium">{t('입력')}</span>
                    <div className="flex rounded overflow-hidden">
                        <button
                            onClick={() => onInputModeChange?.('manual')}
                            className={`px-1.5 py-0.5 text-[10px] font-medium transition-all ${inputMode === 'manual'
                                ? 'bg-white text-blue-700'
                                : 'bg-white/20 text-white hover:bg-white/30'
                                }`}
                            title="수동: 우클릭으로 행 추가/삭제"
                        >
                            {t('수동')}
                        </button>
                        <button
                            onClick={() => onInputModeChange?.('auto')}
                            className={`px-1.5 py-0.5 text-[10px] font-medium transition-all ${inputMode === 'auto'
                                ? 'bg-green-500 text-white'
                                : 'bg-white/20 text-white hover:bg-white/30'
                                }`}
                            title={t('자동')}
                        >
                            {t('자동')}
                        </button>
                    </div>

                    <div className="w-px h-5 bg-white/30" />

                    {/* 병합 토글 */}
                    <span className="text-[10px] text-white/80 font-medium">{t('병합')}</span>
                    <div className="flex rounded-md overflow-hidden border border-purple-300">
                        <button
                            onClick={() => onExtensionMergeToggle?.('all')}
                            className={`px-2 py-0.5 text-[10px] font-semibold transition-all ${extensionMerge.all
                                ? 'bg-purple-500 text-white'
                                : 'bg-purple-200 text-purple-700'
                                }`}
                            title="전체 확장병합 ON/OFF"
                        >
                            All
                        </button>
                        {(['D', 'E', 'F', 'H'] as const).map(col => (
                            <button
                                key={col}
                                onClick={() => onExtensionMergeToggle?.(col)}
                                className={`px-1.5 py-0.5 text-[10px] font-semibold transition-all border-l border-purple-300 ${extensionMerge[col]
                                    ? 'bg-purple-400 text-white'
                                    : 'bg-purple-200 text-purple-700'
                                    }`}
                                title={`${col}열 확장병합 ${extensionMerge[col] ? 'ON' : 'OFF'}`}
                            >
                                {col}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export const PmTabMenu = React.memo(PmTabMenuInner);
