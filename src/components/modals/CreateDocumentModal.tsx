// CODEFREEZE
/**
 * @file CreateDocumentModal.tsx
 * @description 새 문서 생성 플로팅 윈도우 - 컴팩트 테이블 형태
 * @updated 2026-02-16: 비모달 플로팅 윈도우 전환
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';

/** 회사명 목록 (드롭다운 + 직접입력) */
const COMPANY_LIST = ['AMP', 'T&F', 'LBS', '금호타이어', '넥센타이어', '한국타이어', '일진글로벌'];
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';
import {
    AppType,
    APP_CONFIGS,
    APP_REGISTER_URLS,
    LinkMode,
    CreateDocumentRequest,
    CreateDocumentResponse,
} from '@/types/linkage';

// =====================================================
// Props
// =====================================================
interface CreateDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    sourceApp: AppType;
    initialProductName?: string;
    initialCustomer?: string;
    initialCompanyName?: string;
    initialManagerName?: string;
    initialPartNo?: string;
}

// =====================================================
// 앱 체크박스 설정 (PFD → PFMEA → CP)
// =====================================================
const LINKABLE_APPS: AppType[] = ['pfd', 'pfmea', 'cp'];

// =====================================================
// 컴포넌트
// =====================================================
export default function CreateDocumentModal({
    isOpen,
    onClose,
    sourceApp,
    initialProductName,
    initialCustomer,
    initialCompanyName,
    initialManagerName,
    initialPartNo,
}: CreateDocumentModalProps) {
    const router = useRouter();
    const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({
        isOpen, width: 440, height: 380, minWidth: 360, minHeight: 300
    });

    // 상태
    const [linkMode, setLinkMode] = useState<LinkMode>('linked');
    const [selectedApps, setSelectedApps] = useState<Partial<Record<AppType, boolean>>>({
        [sourceApp]: true,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fmeaType, setFmeaType] = useState<'M' | 'F' | 'P'>('P');
    const [cpCount, setCpCount] = useState<number>(1);
    const [pfdCount, setPfdCount] = useState<number>(1);

    // 품명, 고객사, 회사명, 품번 상태
    const [productName, setProductName] = useState('');
    const [customer, setCustomer] = useState('');
    const [customers, setCustomers] = useState<string[]>([]);
    const [companyName, setCompanyName] = useState('');
    const [managerName, setManagerName] = useState('');
    const [partNo, setPartNo] = useState('');
    // 소스 앱 변경 시 초기화
    useEffect(() => {
        if (isOpen) {
            setSelectedApps({
                [sourceApp]: true,
                ...(sourceApp === 'pfd' && { pfmea: true }),
                ...(sourceApp === 'pfmea' && { pfd: true, cp: true }),
                ...(sourceApp === 'cp' && { pfmea: true }),
            });
            setLinkMode('linked');
            setFmeaType('P');
            setCpCount(1);
            setPfdCount(1);
            setProductName(initialProductName || '');
            setCustomer(initialCustomer || '');
            setPartNo(initialPartNo || '');
            setError(null);
            setCompanyName(initialCompanyName || '');
            setManagerName(initialManagerName || '');

            // 고객사 목록 로드
            fetch('/api/master/customer')
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.customers) {
                        setCustomers(data.customers.map((c: any) => c.name || c.customerName || c));
                    }
                })
                .catch(() => {
                    setCustomers(['현대자동차', '기아자동차', 'GM', '폭스바겐', '도요타', 'AMPSYSTEM']);
                });
        }
    }, [isOpen, sourceApp]);

    // 앱 체크박스 토글
    const toggleApp = (app: AppType) => {
        if (app === sourceApp) return;
        setSelectedApps(prev => ({
            ...prev,
            [app]: !prev[app],
        }));
    };

    // 문서 생성
    const handleCreate = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const request: CreateDocumentRequest & { productName?: string; customer?: string; companyName?: string; managerName?: string; partNo?: string; cpCount?: number; pfdCount?: number } = {
                linkMode,
                sourceApp,
                linkedApps: linkMode === 'solo'
                    ? { [sourceApp]: true }
                    : selectedApps,
                fmeaType: fmeaType || 'P',
                productName: productName.trim() || undefined,
                customer: customer.trim() || undefined,
                companyName: companyName.trim() || undefined,
                managerName: managerName.trim() || undefined,
                partNo: partNo.trim() || undefined,
                cpCount: selectedApps.cp ? cpCount : 1,
                pfdCount: selectedApps.pfd ? pfdCount : 1,
            };

            const response = await fetch('/api/project/create-linked', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request),
            });

            const result: CreateDocumentResponse = await response.json();

            if (!result.success) {
                throw new Error(result.error || '문서 생성 실패');
            }

            const createdId = result.createdDocs[sourceApp];
            if (createdId) {
                const registerUrl = `${APP_REGISTER_URLS[sourceApp]}?id=${createdId}`;
                onClose();
                window.location.href = registerUrl;
            }
        } catch (err: any) {
            console.error('[CreateDocumentModal] 생성 오류:', err);
            setError(err.message || '문서 생성 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const sourceConfig = APP_CONFIGS[sourceApp];
    const selectedCount = Object.values(selectedApps).filter(Boolean).length;
    const showFmeaTypeSelector = sourceApp === 'pfmea' ||
        (linkMode === 'linked' && selectedApps.pfmea);

    return createPortal(
        <div
            className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
            style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
        >
            {/* 헤더 */}
            <div
                className="px-3 py-2 flex items-center justify-between text-white rounded-t-lg cursor-move shrink-0"
                style={{ backgroundColor: sourceConfig.color }}
                onMouseDown={onDragStart}
            >
                <div className="flex items-center gap-1.5">
                    <span className="text-base">{sourceConfig.icon}</span>
                    <h2 className="font-bold text-sm" title="Create Document">새 문서 생성(Create {sourceConfig.name})</h2>
                </div>
                <button onClick={onClose} onMouseDown={e => e.stopPropagation()} className="text-white/80 hover:text-white text-lg leading-none">×</button>
            </div>

            {/* 본문 - 컴팩트 테이블 형태 */}
            <div className="overflow-auto px-3 py-1.5">
                <table className="w-full text-sm border-collapse">
                    <tbody>
                        {/* 프로젝트명 (subject) — 소스앱별 동적 라벨 */}
                        <tr className="border-b">
                            <td className="py-1 pr-2 font-medium text-gray-600 text-xs w-24 align-middle">{sourceConfig.name}명</td>
                            <td className="py-1">
                                <input
                                    type="text"
                                    value={productName}
                                    onChange={(e) => setProductName(e.target.value)}
                                    onPaste={(e) => {
                                        const text = e.clipboardData.getData('text/plain');
                                        if (text) { e.preventDefault(); setProductName(text.replace(/[\r\n]/g, ' ').trim()); }
                                    }}
                                    placeholder={`${sourceConfig.name}명을 입력하세요`}
                                    className="w-full px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                                />
                            </td>
                        </tr>

                        {/* 회사명 (작성회사) — datalist 드롭다운 + 직접입력 */}
                        <tr className="border-b">
                            <td className="py-1 pr-2 font-medium text-gray-600 text-xs w-24 align-middle">회사명</td>
                            <td className="py-1">
                                <input
                                    type="text"
                                    list="company-list-create"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    autoComplete="off"
                                    placeholder="회사명 선택 또는 입력"
                                    className="w-full px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                                />
                                <datalist id="company-list-create">
                                    {COMPANY_LIST.map(c => <option key={c} value={c} />)}
                                </datalist>
                            </td>
                        </tr>

                        {/* 연동 모드 */}
                        <tr className="border-b">
                            <td className="py-1 pr-2 font-medium text-gray-600 text-xs w-24 align-top">연동 모드</td>
                            <td className="py-1">
                                <div className="flex gap-3">
                                    <label className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer text-xs ${linkMode === 'linked' ? 'bg-blue-100 text-blue-700 font-semibold' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}>
                                        <input
                                            type="radio"
                                            name="linkMode"
                                            checked={linkMode === 'linked'}
                                            onChange={() => setLinkMode('linked')}
                                            className="w-3.5 h-3.5"
                                        />
                                        연동
                                    </label>
                                    <label className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer text-xs ${linkMode === 'solo' ? 'bg-blue-100 text-blue-700 font-semibold' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}>
                                        <input
                                            type="radio"
                                            name="linkMode"
                                            checked={linkMode === 'solo'}
                                            onChange={() => setLinkMode('solo')}
                                            className="w-3.5 h-3.5"
                                        />
                                        단독
                                    </label>
                                </div>
                            </td>
                        </tr>

                        {/* FMEA 종류 (PFMEA 선택 시) */}
                        {showFmeaTypeSelector && (
                            <tr className="border-b">
                                <td className="py-1 pr-2 font-medium text-gray-600 text-xs align-top">FMEA 종류</td>
                                <td className="py-1">
                                    <div className="flex gap-2">
                                        {[
                                            { v: 'M' as const, label: 'Master', bg: 'bg-purple-500' },
                                            { v: 'F' as const, label: 'Family', bg: 'bg-blue-500' },
                                            { v: 'P' as const, label: 'Part', bg: 'bg-green-500' },
                                        ].map(t => (
                                            <label
                                                key={t.v}
                                                className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer text-xs border-2 ${fmeaType === t.v ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="fmeaType"
                                                    checked={fmeaType === t.v}
                                                    onChange={() => setFmeaType(t.v)}
                                                    className="sr-only"
                                                />
                                                <span className={`px-1.5 py-0.5 text-xs text-white font-bold rounded ${t.bg}`}>{t.v}</span>
                                                <span className="text-sm font-medium">{t.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        )}

                        {/* 연동 앱 선택 (연동 모드일 때만) - 표 형태 */}
                        {linkMode === 'linked' && (
                            <tr className="border-b">
                                <td className="py-1 pr-2 font-medium text-gray-600 text-xs align-top">
                                    연동 앱
                                    <div className="text-xs text-blue-500">({selectedCount}개)</div>
                                </td>
                                <td className="py-1">
                                    <table className="w-full border-collapse text-xs">
                                        <tbody>
                                            {LINKABLE_APPS.map(app => {
                                                const config = APP_CONFIGS[app];
                                                const isSource = app === sourceApp;
                                                const isSelected = selectedApps[app];
                                                const isDisabled = isSource;
                                                return (
                                                    <tr key={app} className="border-b border-gray-100 last:border-b-0">
                                                        <td className="py-0.5 pr-2 w-20">
                                                            <span className={`px-1.5 py-0.5 text-xs text-white font-bold rounded ${config.bgColor}`}>
                                                                {config.name}
                                                            </span>
                                                        </td>
                                                        <td className="py-0.5">
                                                            <div className="flex items-center gap-2">
                                                                <label className={`flex items-center gap-1 cursor-pointer ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isDisabled ? false : !!isSelected}
                                                                        disabled={isDisabled}
                                                                        onChange={() => toggleApp(app)}
                                                                        className="w-3.5 h-3.5 rounded"
                                                                    />
                                                                    {isSource && <span className="text-gray-400">(현재)</span>}
                                                                </label>
                                                                {app === 'cp' && isSelected && (
                                                                    <select
                                                                        value={cpCount}
                                                                        onChange={(e) => setCpCount(Number(e.target.value))}
                                                                        className="px-1.5 py-0.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                                                                    >
                                                                        {[1,2,3,4,5].map(n => (
                                                                            <option key={n} value={n}>{n}개</option>
                                                                        ))}
                                                                    </select>
                                                                )}
                                                                {app === 'pfd' && isSelected && (
                                                                    <select
                                                                        value={pfdCount}
                                                                        onChange={(e) => setPfdCount(Number(e.target.value))}
                                                                        className="px-1.5 py-0.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                                                                    >
                                                                        {[1,2,3,4,5].map(n => (
                                                                            <option key={n} value={n}>{n}개</option>
                                                                        ))}
                                                                    </select>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* 에러 메시지 */}
                {error && (
                    <div className="mt-3 bg-red-50 border border-red-200 rounded p-2 text-red-600 text-xs">
                        ⚠️ {error}
                    </div>
                )}
            </div>

            {/* 푸터 */}
            <div className="px-3 py-1.5 flex justify-end gap-2 shrink-0">
                <button
                    onClick={onClose}
                    disabled={isLoading}
                    className="px-4 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm"
                >
                    취소<span className="text-[9px] opacity-70 ml-0.5">(Cancel)</span>
                </button>
                <button
                    onClick={handleCreate}
                    disabled={isLoading}
                    className="px-4 py-1.5 rounded text-white font-semibold text-sm flex items-center gap-1"
                    style={{ backgroundColor: sourceConfig.color }}
                >
                    {isLoading ? '생성 중...' : '생성(Create)'}
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
