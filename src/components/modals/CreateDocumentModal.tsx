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

import { useFloatingWindow } from '@/components/modals/useFloatingWindow';
import {
    AppType,
    APP_CONFIGS,
    APP_REGISTER_URLS,
    LinkMode,
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
// Triplet 대상 앱 (PFMEA, CP, PFD — 동일 Triplet API 사용)
// =====================================================
const TRIPLET_APPS: AppType[] = ['pfmea', 'cp', 'pfd'];
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
        isOpen, width: 440, height: 420, minWidth: 360, minHeight: 280
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
    const [companyName, setCompanyName] = useState('LBS');
    const [managerName, setManagerName] = useState('');
    const [partNo, setPartNo] = useState('');
    // ★ 기존 문서 목록 (중복 검증용 실시간 표시)
    const [existingDocs, setExistingDocs] = useState<{ id: string; name: string }[]>([]);

    // ★ 상위 FMEA 후보 목록 (TripletGroup + 기존 FmeaProject 합산)
    interface ParentCandidate { id: string; typeCode: string; subject: string; pfmeaId: string; source: 'triplet' | 'legacy' }
    const [parentCandidates, setParentCandidates] = useState<ParentCandidate[]>([]);
    const [selectedParentTriplet, setSelectedParentTriplet] = useState<string>('');
    const [partParentMode, setPartParentMode] = useState<'master-family' | 'part-ref' | 'standalone'>('master-family');
    const [masterDatasets, setMasterDatasets] = useState<{ id: string; fmeaId: string; name: string }[]>([]);
    const [selectedMasterDatasetId, setSelectedMasterDatasetId] = useState<string>('');
    const [partSetCount, setPartSetCount] = useState<number>(0);
    const [familySetCount, setFamilySetCount] = useState<number>(0);
    const [immediateCP, setImmediateCP] = useState(false);
    const [immediatePFD, setImmediatePFD] = useState(false);
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
            setPartSetCount(0);
            setFamilySetCount(0);
            setSelectedParentTriplet('');
            setPartParentMode('master-family');
            setSelectedMasterDatasetId('');
            setImmediateCP(false);
            setImmediatePFD(false);
            setProductName(initialProductName || '');
            setCustomer(initialCustomer || '');
            setPartNo(initialPartNo || '');
            setError(null);
            setCompanyName(initialCompanyName || '');
            setManagerName(initialManagerName || '');

            // ★ 상위 FMEA 후보 로드: TripletGroup + 기존 FmeaProject(M/F) 합산
            if (TRIPLET_APPS.includes(sourceApp)) {
                Promise.all([
                    fetch('/api/triplet/list').then(r => r.ok ? r.json() : { triplets: [] }).catch(() => ({ triplets: [] })),
                    fetch('/api/fmea/projects').then(r => r.ok ? r.json() : { projects: [] }).catch(() => ({ projects: [] })),
                ]).then(([tripletData, fmeaData]) => {
                    const tripletItems: ParentCandidate[] = (tripletData?.triplets || []).map((t: any) => ({
                        id: t.id, typeCode: t.typeCode, subject: t.subject || '', pfmeaId: t.pfmeaId || '', source: 'triplet' as const,
                    }));
                    const tripletPfmeaIds = new Set(tripletItems.map(t => t.pfmeaId));
                    const legacyItems: ParentCandidate[] = (fmeaData?.projects || [])
                        .filter((p: any) => ['M', 'F', 'P'].includes(p.fmeaType) && !tripletPfmeaIds.has(p.id))
                        .map((p: any) => ({
                            id: `legacy:${p.id}`,
                            typeCode: (p.fmeaType || 'M').toLowerCase(),
                            subject: p.fmeaInfo?.subject || p.project?.projectName || p.id,
                            pfmeaId: p.id,
                            source: 'legacy' as const,
                        }));
                    setParentCandidates([...tripletItems, ...legacyItems]);
                });
            }

            // ★ Master Dataset 목록 로드 (직접 작성 시 참조용)
            fetch('/api/fmea/master-datasets')
              .then(r => r.ok ? r.json() : { datasets: [] })
              .then(data => setMasterDatasets(data.datasets || []))
              .catch(() => setMasterDatasets([]));

            // ★ 기존 문서 목록 로드 (중복 검증용)
            setExistingDocs([]);
            const docUrl = sourceApp === 'pfmea'
                ? '/api/fmea/projects'
                : sourceApp === 'cp' ? '/api/control-plan/list'
                : sourceApp === 'pfd' ? '/api/pfd/list' : null;
            if (docUrl) {
                fetch(docUrl).then(r => r.json()).then(data => {
                    if (data.success) {
                        let docs: { id: string; name: string }[] = [];
                        if (sourceApp === 'pfmea') {
                            docs = (data.projects || []).map((p: any) => ({
                                id: p.id || p.fmeaId, name: p.fmeaInfo?.subject || p.project?.projectName || '',
                            }));
                        } else if (sourceApp === 'cp') {
                            docs = (data.items || data.cps || []).map((p: any) => ({
                                id: p.cpNo || p.id, name: p.subject || '',
                            }));
                        } else if (sourceApp === 'pfd') {
                            docs = (data.items || data.pfds || []).map((p: any) => ({
                                id: p.pfdNo || p.id, name: p.subject || '',
                            }));
                        }
                        setExistingDocs(docs.filter(d => d.name));
                    }
                }).catch(() => { /* 무시 */ });
            }

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

        // ★ 중복 검증: 동일한 이름의 문서가 이미 존재하는지 확인
        if (productName.trim()) {
            try {
                const checkUrl = sourceApp === 'pfmea'
                    ? '/api/fmea/projects?type=P'
                    : sourceApp === 'cp'
                        ? '/api/control-plan/list'
                        : sourceApp === 'pfd'
                            ? '/api/pfd/list'
                            : null;

                if (checkUrl) {
                    const checkRes = await fetch(checkUrl);
                    const checkData = await checkRes.json();

                    let existingNames: { id: string; name: string }[] = [];
                    if (checkData.success) {
                        if (sourceApp === 'pfmea') {
                            existingNames = (checkData.projects || []).map((p: any) => ({
                                id: p.id || p.fmeaId,
                                name: p.fmeaInfo?.subject || p.project?.projectName || '',
                            }));
                        } else if (sourceApp === 'cp') {
                            existingNames = (checkData.items || checkData.cps || []).map((p: any) => ({
                                id: p.cpNo || p.id,
                                name: p.subject || '',
                            }));
                        } else if (sourceApp === 'pfd') {
                            existingNames = (checkData.items || checkData.pfds || []).map((p: any) => ({
                                id: p.pfdNo || p.id,
                                name: p.subject || '',
                            }));
                        }
                    }

                    const duplicate = existingNames.find(
                        e => e.name.toLowerCase() === productName.trim().toLowerCase()
                    );
                    if (duplicate) {
                        setIsLoading(false);
                        const proceed = confirm(
                            `⚠️ 동일한 이름의 문서가 이미 존재합니다!\n\n` +
                            `기존 문서: "${duplicate.name}" (${duplicate.id})\n\n` +
                            `동일한 이름으로 새로 생성하시겠습니까?`
                        );
                        if (!proceed) return;
                        setIsLoading(true);
                    }
                }
            } catch (e) {
                console.error('[CreateDocumentModal] 중복 검증 오류:', e);
            }
        }

        try {
            const isTriplet = TRIPLET_APPS.includes(sourceApp);

            if (isTriplet) {
                // ★ PFMEA/CP/PFD 공통 → Triplet API 사용
                const docType = fmeaType === 'M' ? 'master' : fmeaType === 'F' ? 'family' : 'part';
                const tripletBody: Record<string, unknown> = {
                    docType,
                    subject: productName.trim(),
                    productName: productName.trim(),
                    customerName: customer.trim(),
                    companyName: companyName.trim(),
                    responsibleName: managerName.trim(),
                    partNo: partNo.trim(),
                };
                if (docType === 'family') {
                    if (selectedParentTriplet.startsWith('legacy:')) {
                        tripletBody.parentFmeaId = selectedParentTriplet.replace('legacy:', '');
                    } else {
                        tripletBody.parentTripletId = selectedParentTriplet;
                    }
                }
                if (docType === 'part') {
                    if (partParentMode === 'standalone') {
                        tripletBody.standalone = true;
                        if (selectedMasterDatasetId) {
                            tripletBody.masterDatasetId = selectedMasterDatasetId;
                        }
                    } else if (selectedParentTriplet) {
                        if (selectedParentTriplet.startsWith('legacy:')) {
                            tripletBody.parentFmeaId = selectedParentTriplet.replace('legacy:', '');
                        } else {
                            tripletBody.parentTripletId = selectedParentTriplet;
                        }
                        if (partParentMode === 'part-ref') {
                            tripletBody.partRef = true;
                        }
                    }
                }
                if (docType === 'master') {
                    tripletBody.familyCount = familySetCount;
                }
                if (docType === 'family') {
                    tripletBody.partCount = partSetCount;
                    tripletBody.immediateCP = true;
                    tripletBody.immediatePFD = true;
                }

                const response = await fetch('/api/triplet/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(tripletBody),
                });
                if (response.status === 503) {
                    throw new Error('Triplet 서비스 준비 중입니다. 서버를 재시작해주세요.');
                }
                const result = await response.json();
                if (!result.success) throw new Error(result.error || 'Triplet 생성 실패');

                const redirectId = sourceApp === 'cp' ? result.cpId
                    : sourceApp === 'pfd' ? result.pfdId
                    : result.pfmeaId;
                onClose();
                window.location.href = `${APP_REGISTER_URLS[sourceApp]}?id=${redirectId}`;
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
    const isTripletApp = TRIPLET_APPS.includes(sourceApp);
    const showFmeaTypeSelector = isTripletApp ||
        (linkMode === 'linked' && selectedApps.pfmea);

    return createPortal(
        <div
            className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
            style={{ left: pos.x, top: pos.y, width: size.w, maxHeight: size.h }}
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
            <div className="overflow-auto px-3 py-1">
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
                                    className={`w-full px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm ${
                                        productName.trim() && existingDocs.some(d => d.name.toLowerCase() === productName.trim().toLowerCase())
                                            ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-300'
                                    }`}
                                />
                                {/* ★ 중복 문서 실시간 표시 */}
                                {productName.trim().length >= 2 && existingDocs.filter(d =>
                                    d.name.toLowerCase().includes(productName.trim().toLowerCase())
                                ).length > 0 && (
                                    <div className="mt-1 border border-orange-200 rounded bg-orange-50 max-h-[80px] overflow-y-auto">
                                        <div className="px-2 py-0.5 text-[10px] font-bold text-orange-700 bg-orange-100 sticky top-0">
                                            ⚠️ 기존 문서 {existingDocs.filter(d => d.name.toLowerCase().includes(productName.trim().toLowerCase())).length}건 일치
                                        </div>
                                        {existingDocs.filter(d =>
                                            d.name.toLowerCase().includes(productName.trim().toLowerCase())
                                        ).map(d => (
                                            <div key={d.id} className={`px-2 py-0.5 text-[10px] flex items-center gap-1 ${
                                                d.name.toLowerCase() === productName.trim().toLowerCase()
                                                    ? 'text-red-700 font-bold bg-red-50' : 'text-orange-700'
                                            }`}>
                                                <span className="text-gray-400 font-mono">{d.id}</span>
                                                <span>{d.name}</span>
                                                {d.name.toLowerCase() === productName.trim().toLowerCase() && (
                                                    <span className="text-red-600 text-[9px]">← 동일</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </td>
                        </tr>

                        {/* 회사명 (작성회사) — datalist 드롭다운 + 직접입력 */}
                        <tr className="border-b">
                            <td className="py-1 pr-2 font-medium text-gray-600 text-xs w-24 align-middle">회사명</td>
                            <td className="py-1">
                                <span className="w-full px-3 py-1 text-sm">LBS</span>
                            </td>
                        </tr>

                        {/* 연동 모드 (Triplet 앱에서는 숨김 — PFMEA/CP/PFD) */}
                        {!isTripletApp && <tr className="border-b">
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
                        </tr>}

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

                        {/* ★ 상위 FMEA 선택 (Family 시 — Master 필수) */}
                        {isTripletApp && fmeaType === 'F' && (() => {
                            const filtered = parentCandidates.filter(t => t.typeCode === 'm');
                            return (
                            <tr className="border-b">
                                <td className="py-1 pr-2 font-medium text-gray-600 text-xs align-top">상위 Master</td>
                                <td className="py-1">
                                    <select
                                        value={selectedParentTriplet}
                                        onChange={(e) => setSelectedParentTriplet(e.target.value)}
                                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    >
                                        <option value="">-- 상위 FMEA 선택 --</option>
                                        {filtered.map(t => (
                                            <option key={t.id} value={t.id}>
                                                [{t.typeCode.toUpperCase()}] {t.subject || t.pfmeaId}{t.source === 'legacy' ? ' (기존)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {!selectedParentTriplet && filtered.length === 0 && (
                                        <div className="text-[9px] text-orange-600 mt-0.5">Master FMEA가 없습니다. 먼저 Master FMEA를 생성하세요.</div>
                                    )}
                                    {!selectedParentTriplet && filtered.length > 0 && (
                                        <div className="text-[9px] text-red-500 mt-0.5">상위 FMEA를 선택해야 생성 가능합니다.</div>
                                    )}
                                </td>
                            </tr>
                            );
                        })()}

                        {/* ★ Part FMEA 생성 모드 선택 (3가지) */}
                        {isTripletApp && fmeaType === 'P' && (
                            <tr className="border-b">
                                <td className="py-1 pr-2 font-medium text-gray-600 text-xs align-top">상위 선택</td>
                                <td className="py-1">
                                    <div className="flex flex-col gap-1">
                                        {[
                                            { v: 'master-family' as const, label: '상위 Master/Family 선택' },
                                            { v: 'part-ref' as const, label: '다른 Part FMEA 참조' },
                                            { v: 'standalone' as const, label: '직접 작성 (상위 없음)' },
                                        ].map(opt => (
                                            <label key={opt.v} className={`flex items-center gap-1.5 px-2 py-0.5 rounded cursor-pointer text-xs ${partParentMode === opt.v ? 'bg-green-50 text-green-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
                                                <input
                                                    type="radio"
                                                    name="partParentMode"
                                                    checked={partParentMode === opt.v}
                                                    onChange={() => { setPartParentMode(opt.v); setSelectedParentTriplet(''); }}
                                                    className="w-3 h-3"
                                                />
                                                {opt.label}
                                            </label>
                                        ))}
                                    </div>

                                    {/* 상위 Master/Family 목록 */}
                                    {partParentMode === 'master-family' && (() => {
                                        const filtered = parentCandidates.filter(t => t.typeCode === 'f' || t.typeCode === 'm');
                                        return (
                                            <div className="mt-1">
                                                <select
                                                    value={selectedParentTriplet}
                                                    onChange={(e) => setSelectedParentTriplet(e.target.value)}
                                                    size={Math.min(filtered.length + 1, 8)}
                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                >
                                                    <option value="">-- 상위 FMEA 선택 --</option>
                                                    {filtered.map(t => (
                                                        <option key={t.id} value={t.id}>
                                                            [{t.typeCode.toUpperCase()}] {t.subject || t.pfmeaId}{t.source === 'legacy' ? ' (기존)' : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                                {!selectedParentTriplet && filtered.length === 0 && (
                                                    <div className="text-[9px] text-orange-600 mt-0.5">Master/Family FMEA가 없습니다. 먼저 생성하세요.</div>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* 다른 Part FMEA 참조 목록 */}
                                    {partParentMode === 'part-ref' && (() => {
                                        const partCandidates = parentCandidates.filter(t => t.typeCode === 'p');
                                        return (
                                            <div className="mt-1">
                                                <select
                                                    value={selectedParentTriplet}
                                                    onChange={(e) => setSelectedParentTriplet(e.target.value)}
                                                    size={Math.min(partCandidates.length + 1, 8)}
                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                >
                                                    <option value="">-- Part FMEA 선택 --</option>
                                                    {partCandidates.map(t => (
                                                        <option key={t.id} value={t.id}>
                                                            [P] {t.subject || t.pfmeaId}{t.source === 'legacy' ? ' (기존)' : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                                {!selectedParentTriplet && partCandidates.length === 0 && (
                                                    <div className="text-[9px] text-orange-600 mt-0.5">Part FMEA가 없습니다.</div>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* 직접 작성 — Master Dataset 선택 */}
                                    {partParentMode === 'standalone' && (
                                        <div className="mt-1">
                                            <div className="text-[9px] text-blue-600 mb-1">상위 FMEA 없이 독립적으로 생성합니다.</div>
                                            {masterDatasets.length > 0 && (
                                                <>
                                                    <div className="text-[9px] text-gray-500 mb-0.5">참조할 Master Dataset (선택사항):</div>
                                                    <select
                                                        value={selectedMasterDatasetId}
                                                        onChange={(e) => setSelectedMasterDatasetId(e.target.value)}
                                                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                    >
                                                        <option value="">-- 없음 (완전 빈 상태) --</option>
                                                        {masterDatasets.map(ds => (
                                                            <option key={ds.id} value={ds.id}>
                                                                {ds.name} ({ds.fmeaId})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        )}

                        {/* ★ Master → 하위 Family 세트 수량 (Triplet 앱 공통) */}
                        {isTripletApp && fmeaType === 'M' && (
                            <tr className="border-b">
                                <td className="py-1 pr-2 font-medium text-gray-600 text-xs align-top">하위 Family 세트</td>
                                <td className="py-1">
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={familySetCount}
                                            onChange={(e) => setFamilySetCount(Number(e.target.value))}
                                            className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                                        >
                                            {[0,1].map(n => (
                                                <option key={n} value={n}>{n}개 {n === 0 ? '(나중에 추가)' : ''}</option>
                                            ))}
                                        </select>
                                        <span className="text-[9px] text-gray-500">각 세트 = F-FMEA + F-CP + F-PFD</span>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {/* ★ Family → 하위 Part 세트 수량 (Triplet 앱 공통) */}
                        {isTripletApp && fmeaType === 'F' && (
                            <tr className="border-b">
                                <td className="py-1 pr-2 font-medium text-gray-600 text-xs align-top">하위 Part 세트</td>
                                <td className="py-1">
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={partSetCount}
                                            onChange={(e) => setPartSetCount(Number(e.target.value))}
                                            className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                                        >
                                            {[0,1,2,3,4,5].map(n => (
                                                <option key={n} value={n}>{n}개 {n === 0 ? '(나중에 추가)' : ''}</option>
                                            ))}
                                        </select>
                                        <span className="text-[9px] text-gray-500">각 세트 = P-FMEA + P-CP + P-PFD</span>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {/* 연동 앱 선택 (연동 모드일 때만, Triplet 앱이 아닐 때) - 표 형태 */}
                        {linkMode === 'linked' && !isTripletApp && (
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
            <div className="px-3 py-1 flex justify-end gap-2 shrink-0 border-t border-gray-100 mt-auto">
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
