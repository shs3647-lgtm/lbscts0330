// CODEFREEZE
/**
 * @file CpSyncWizard.tsx
 * @description FMEA → CP 연동 모달 (컴팩트 테이블 버전)
 * @version 3.0.0 - 하드코딩 적용
 * @status CODE_FREEZE 🔒
 * @frozen_date 2026-02-04
 * @freeze_level L2
 * 
 * ⚠️ 이 파일은 코드프리즈 상태입니다.
 * 버그 수정만 허용, 기능 수정 시 승인 필요
 * 
 * FMEA 컬럼 → CP 컬럼 100% 매핑:
 * - L2.no → processNo (공정번호)
 * - L2.name → processName (공정명)
 * - L2.functions[].name → processDesc (공정설명)
 * - L3.m4 → equipment + 4M 구분 (설비/금형/지그)
 * - L3.name → workElement (부품(컴포넌트))
 * - L2.functions[].productChars → productChar (설계특성)
 * - L3.processChars → processChar (설계파라미터)
 * - specialChar → specialChar (특별특성)
 */

'use client';

import React, { useMemo } from 'react';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';
import { WizardState, SyncStep } from '../hooks/useCpSync';

// ============================================================
// 🔒 HARDCODED CONSTANTS - 변경 금지
// ============================================================

// CP 병합 구조 규칙 (HARDCODED)
const CP_MERGE_STRUCTURE = {
    PROCESS_PARENT: ['processNo', 'processName', 'processLevel', 'processDesc'], // 최상위 병합
    PRODUCT_CHAR_PARENT: 'partName',  // 설계특성 부모 = 부품명
    PROCESS_CHAR_PARENT: 'equipment', // 설계파라미터 부모 = 설비 (4M=MC)
} as const; // HARDCODED

// 4M 분류 중 CP 제외 대상 (HARDCODED)
const M4_EXCLUDE_FROM_CP = ['MN'] as const; // 사람(MN)은 CP 연동에서 제외

// CP 행 계산 공식 (HARDCODED)
// CP_ROWS = productCharCount + processCharCount (MN 제외)

// 특별특성 코드 (HARDCODED)
const SPECIAL_CHAR_CODES = ['★', '◇', ''] as const;

// ============================================================

interface CpSyncWizardProps {
    wizardState: WizardState;
    cpNo: string | null;
    l2Data?: any[];  // L2 공정 데이터
    onExecuteNext: () => Promise<void>;
    onExecuteAll?: () => Promise<void>;
    onClose: () => void;
    onNavigateToCp?: () => void;
    onConfirm?: () => void;  // ★ 확정 버튼 핸들러
}

// DFMEA Interface Type 분류 아이콘 및 색상
const M4_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
    PC:  { icon: '🔗', label: 'Physical Connection', color: '#3b82f6' },
    ME:  { icon: '🧪', label: 'Material Exchange', color: '#10b981' },
    ET:  { icon: '⚡', label: 'Energy Transfer', color: '#f59e0b' },
    DE:  { icon: '📡', label: 'Data Exchange', color: '#8b5cf6' },
    HMI: { icon: '🖐️', label: 'Human-Machine', color: '#ef4444' },
    '':  { icon: '❓', label: '미분류', color: '#6b7280' },
};

// 상태별 배지 색상
const statusColors: Record<SyncStep['status'], string> = {
    pending: 'bg-gray-200 text-gray-600',
    ready: 'bg-blue-100 text-blue-700',
    syncing: 'bg-yellow-100 text-yellow-700',
    done: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
};

const statusLabels: Record<SyncStep['status'], string> = {
    pending: '대기',
    ready: '준비',
    syncing: '연동중',
    done: '완료',
    error: '오류',
};

interface MappingRow {
    processNo: string;
    processName: string;
    processDesc: string;
    workElement: string;
    m4: string;
    equipment: string;
    productChar: string;
    processChar: string;
    specialChar: string;
}

// ============================================================
// ★ 단계별 테이블 컬럼 정의
// ============================================================
interface StepColDef {
    key: keyof MappingRow;
    label: string;
    cpLabel: string;
    w: string;
    bg?: string;
    merge?: 'proc' | 'equip' | 'desc';
    renderAs?: 'm4' | 'sc';
}

const STEP_COLS: Record<number, {
    groups: { label: string; span: number; cls: string }[];
    cols: StepColDef[];
}> = {
    1: {
        groups: [],
        cols: [
            { key: 'processNo', label: 'No', cpLabel: '', w: '4%' },
            { key: 'processName', label: '공정', cpLabel: '', w: '8%' },
            { key: 'processDesc', label: '설명', cpLabel: '', w: '12%' },
            { key: 'workElement', label: '작업', cpLabel: '', w: '8%' },
            { key: 'm4', label: '4M', cpLabel: '', w: '4%', renderAs: 'm4' },
            { key: 'equipment', label: '설비', cpLabel: '', w: '12%', bg: 'bg-green-50' },
            { key: 'productChar', label: '설계특성', cpLabel: '', w: '20%', bg: 'bg-blue-50' },
            { key: 'processChar', label: '설계파라미터', cpLabel: '', w: '20%', bg: 'bg-purple-50' },
            { key: 'specialChar', label: 'SC', cpLabel: '', w: '4%', renderAs: 'sc' },
        ],
    },
    2: {
        groups: [],
        cols: [
            { key: 'processNo', label: 'No', cpLabel: '', w: '5%', merge: 'proc' },
            { key: 'processName', label: '공정', cpLabel: '', w: '10%', merge: 'proc' },
            { key: 'processDesc', label: '설명', cpLabel: '', w: '20%', merge: 'desc' },
            { key: 'workElement', label: '작업', cpLabel: '', w: '15%' },
            { key: 'm4', label: '4M', cpLabel: '', w: '5%', renderAs: 'm4' },
            { key: 'equipment', label: '설비/금형/지그', cpLabel: '', w: '30%', bg: 'bg-green-50' },
        ],
    },
    3: {
        groups: [],
        cols: [
            { key: 'processNo', label: 'No', cpLabel: '', w: '5%', merge: 'proc' },
            { key: 'processName', label: '공정', cpLabel: '', w: '10%', merge: 'proc' },
            { key: 'productChar', label: '설계특성', cpLabel: '', w: '70%', bg: 'bg-blue-50' },
            { key: 'specialChar', label: 'SC', cpLabel: '', w: '5%', renderAs: 'sc' },
        ],
    },
    4: {
        groups: [],
        cols: [
            { key: 'processNo', label: 'No', cpLabel: '', w: '5%', merge: 'proc' },
            { key: 'processName', label: '공정', cpLabel: '', w: '10%', merge: 'proc' },
            { key: 'equipment', label: '설비', cpLabel: '', w: '20%', bg: 'bg-green-50', merge: 'equip' },
            { key: 'processChar', label: '설계파라미터', cpLabel: '', w: '50%', bg: 'bg-purple-50' },
            { key: 'specialChar', label: 'SC', cpLabel: '', w: '5%', renderAs: 'sc' },
        ],
    },
    5: {
        groups: [],
        cols: [
            { key: 'processNo', label: 'No', cpLabel: '', w: '5%', merge: 'proc' },
            { key: 'processName', label: '공정', cpLabel: '', w: '10%', merge: 'proc' },
            { key: 'productChar', label: '설계특성', cpLabel: '', w: '35%', bg: 'bg-blue-50' },
            { key: 'processChar', label: '설계파라미터', cpLabel: '', w: '35%', bg: 'bg-purple-50' },
            { key: 'specialChar', label: 'SC', cpLabel: '', w: '5%', renderAs: 'sc' },
        ],
    },
};

export default function CpSyncWizard({
    wizardState,
    cpNo,
    l2Data = [],
    onExecuteNext,
    onExecuteAll,
    onClose,
    onNavigateToCp,
    onConfirm,
}: CpSyncWizardProps) {
    const { isOpen, steps, error } = wizardState;
    const [isExecuting, setIsExecuting] = React.useState(false);

    // Floating window hook
    const { pos: wizPos, size: wizSize, onDragStart: wizDragStart, onResizeStart: wizResizeStart } = useFloatingWindow({ isOpen, width: 960, height: 600, minWidth: 700, minHeight: 350, initialY: 40 });

    // L2 데이터에서 매핑 테이블 생성 (★ 원자성 중복 제거 적용)
    const mappingRows = useMemo(() => {
        const rows: MappingRow[] = [];
        const seenKeys = new Set<string>(); // ★ 중복 체크용 Set

        // ★ 고유 키 생성 함수 (processNo + processName + workElement + m4 + productChar + processChar)
        const makeRowKey = (row: MappingRow): string => {
            return `${row.processNo}|${row.processName}|${row.workElement}|${row.m4}|${row.productChar}|${row.processChar}`;
        };

        // ★ 중복 없이 행 추가하는 헬퍼 함수
        const addRowIfUnique = (row: MappingRow): boolean => {
            const key = makeRowKey(row);
            if (seenKeys.has(key)) {
                return false; // 중복 - 추가하지 않음
            }
            seenKeys.add(key);
            rows.push(row);
            return true;
        };

        l2Data.forEach((l2: any) => {
            const processNo = l2.no || '';
            const processName = l2.name || '';

            // L2 기능 순회
            (l2.functions || []).forEach((func: any) => {
                const processDesc = func.name || '';

                // 설계특성 순회
                (func.productChars || []).forEach((pc: any) => {
                    const productChar = typeof pc === 'string' ? pc : (pc.name || '');
                    const pcSpecial = typeof pc === 'object' ? (pc.specialChar || '') : '';

                    // L3 부품(컴포넌트) 순회
                    (l2.l3 || []).forEach((l3: any) => {
                        const workElement = l3.name || '';
                        const m4 = l3.m4 || l3.fourM || '';
                        const m4Upper = m4.toUpperCase();
                        // ★ MN(사람)은 CP 연동에서 완전 제외 (M4_EXCLUDE_FROM_CP)
                        if (M4_EXCLUDE_FROM_CP.includes(m4Upper as any)) return;
                        // ★ 설비명만 표시 (4M 프리픽스 제거)
                        const equipment = workElement;

                        // ★ L3.functions[].processChars에서 설계파라미터 수집 (신규 구조)
                        let processCharsFound = false;
                        (l3.functions || []).forEach((l3Func: any) => {
                            (l3Func.processChars || []).forEach((pchar: any) => {
                                const processChar = typeof pchar === 'string' ? pchar : (pchar.name || '');
                                const pcharSpecial = typeof pchar === 'object' ? (pchar.specialChar || '') : '';

                                if (processChar && !processChar.includes('클릭')) {
                                    processCharsFound = true;
                                    // ★ 중복 체크 후 추가
                                    addRowIfUnique({
                                        processNo,
                                        processName,
                                        processDesc,
                                        workElement,
                                        m4,
                                        equipment,
                                        productChar,
                                        processChar,
                                        specialChar: pcSpecial || pcharSpecial || '',
                                    });
                                }
                            });
                        });

                        // 폴백: l3.processChars에서도 수집 (하위호환)
                        if (!processCharsFound) {
                            (l3.processChars || []).forEach((pchar: any) => {
                                const processChar = typeof pchar === 'string' ? pchar : (pchar.name || '');
                                const pcharSpecial = typeof pchar === 'object' ? (pchar.specialChar || '') : '';

                                if (processChar && !processChar.includes('클릭')) {
                                    processCharsFound = true;
                                    // ★ 중복 체크 후 추가
                                    addRowIfUnique({
                                        processNo,
                                        processName,
                                        processDesc,
                                        workElement,
                                        m4,
                                        equipment,
                                        productChar,
                                        processChar,
                                        specialChar: pcSpecial || pcharSpecial || '',
                                    });
                                }
                            });
                        }

                        // 설계파라미터이 없는 경우에도 행 생성
                        if (!processCharsFound) {
                            // ★ 중복 체크 후 추가
                            addRowIfUnique({
                                processNo,
                                processName,
                                processDesc,
                                workElement,
                                m4,
                                equipment,
                                productChar,
                                processChar: '',
                                specialChar: pcSpecial || '',
                            });
                        }
                    });

                    // L3가 없는 경우에도 행 생성
                    if ((l2.l3 || []).length === 0) {
                        // ★ 중복 체크 후 추가
                        addRowIfUnique({
                            processNo,
                            processName,
                            processDesc,
                            workElement: '',
                            m4: '',
                            equipment: '',
                            productChar,
                            processChar: '',
                            specialChar: pcSpecial || '',
                        });
                    }
                });

                // 설계특성이 없는 경우에도 행 생성
                if ((func.productChars || []).length === 0) {
                    (l2.l3 || []).forEach((l3: any) => {
                        const m4Val = (l3.m4 || l3.fourM || '').toUpperCase();
                        if (M4_EXCLUDE_FROM_CP.includes(m4Val as any)) return; // MN 제외
                        // ★ 중복 체크 후 추가
                        addRowIfUnique({
                            processNo,
                            processName,
                            processDesc,
                            workElement: l3.name || '',
                            m4: l3.m4 || l3.fourM || '',
                            equipment: l3.equipment || l3.name || '',
                            productChar: '',
                            processChar: '',
                            specialChar: '',
                        });
                    });
                }
            });

            // 기능이 없는 경우에도 L3 기반으로 행 생성
            if ((l2.functions || []).length === 0) {
                (l2.l3 || []).forEach((l3: any) => {
                    const m4Val = (l3.m4 || l3.fourM || '').toUpperCase();
                    if (M4_EXCLUDE_FROM_CP.includes(m4Val as any)) return; // MN 제외
                    // ★ 중복 체크 후 추가
                    addRowIfUnique({
                        processNo,
                        processName,
                        processDesc: '',
                        workElement: l3.name || '',
                        m4: l3.m4 || l3.fourM || '',
                        equipment: l3.equipment || l3.name || '',
                        productChar: '',
                        processChar: '',
                        specialChar: '',
                    });
                });
            }
        });

        // ★★★ 규칙 기반 검증 로그 ★★★

        // L2별 실제 행 수 계산
        const actualByProcess: Record<string, number> = {};
        rows.forEach(row => {
            const key = `${row.processNo}|${row.processName}`;
            actualByProcess[key] = (actualByProcess[key] || 0) + 1;
        });

        // 이론치 vs 실제치 비교
        let totalTheoretical = 0;
        l2Data.forEach((l2: any) => {
            const processNo = l2.no || '';
            const processName = l2.name || '';
            const key = `${processNo}|${processName}`;

            // L3 수
            const validL3 = (l2.l3 || []).filter((l3: any) => {
                const name = (l3.name || '').trim();
                return name && !name.startsWith('00 ');
            });
            const l3Count = Math.max(1, validL3.length);

            // 설계특성 수
            let productCharCount = 0;
            for (const func of l2.functions || []) {
                productCharCount += (func.productChars || [])
                    .filter((pc: any) => {
                        const n = typeof pc === 'string' ? pc : (pc.name || '');
                        return n && !n.includes('클릭');
                    }).length;
            }
            productCharCount = Math.max(1, productCharCount);

            // 설계파라미터 수
            let processCharCount = 0;
            for (const l3 of validL3) {
                for (const l3Func of l3.functions || []) {
                    processCharCount += (l3Func.processChars || [])
                        .filter((pc: any) => {
                            const n = typeof pc === 'string' ? pc : (pc.name || '');
                            return n && !n.includes('클릭');
                        }).length;
                }
                if (processCharCount === 0) {
                    processCharCount += (l3.processChars || [])
                        .filter((pc: any) => {
                            const n = typeof pc === 'string' ? pc : (pc.name || '');
                            return n && !n.includes('클릭');
                        }).length;
                }
            }
            processCharCount = Math.max(1, processCharCount);

            const theoretical = l3Count * productCharCount * processCharCount;
            totalTheoretical += theoretical;
            const actual = actualByProcess[key] || 0;
            const status = actual <= theoretical ? '✓' : '⚠';

        });

        const duplicatesRemoved = seenKeys.size - rows.length;

        return rows;
    }, [l2Data]);

    // ★ 선택된 단계 상태 (기본: 2=구조연동)
    const [selectedStep, setSelectedStep] = React.useState<number>(2);

    // ★ 단계별 필터링/중복 제거된 행
    const stepFilteredRows = useMemo(() => {
        if (selectedStep <= 1) return mappingRows;
        const seen = new Set<string>();
        if (selectedStep === 2) {
            return mappingRows.filter(r => {
                const key = `${r.processNo}|${r.workElement}|${r.equipment}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        }
        if (selectedStep === 3) {
            return mappingRows.filter(r => {
                if (!r.productChar) return false;
                const key = `${r.processNo}|${r.productChar}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        }
        if (selectedStep === 4) {
            return mappingRows.filter(r => {
                if (!r.processChar) return false;
                // ★ 동일 공정 내 동일 설계파라미터 중복 제거 (설비 무관)
                const key = `${r.processNo}|${r.processChar}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        }
        // step 5: 모든 행 표시 (특별특성 없어도 빈값으로 연동)
        return mappingRows;
    }, [selectedStep, mappingRows]);

    // ★ 셀 병합 정보 (processNo + equipment + processDesc rowSpan)
    const mergeSpans = useMemo(() => {
        const rows = stepFilteredRows;
        const result: Array<{ procSpan: number; equipSpan: number; descSpan: number }> =
            rows.map(() => ({ procSpan: 0, equipSpan: 0, descSpan: 0 }));
        let i = 0;
        while (i < rows.length) {
            let j = i + 1;
            while (j < rows.length && rows[j].processNo === rows[i].processNo) j++;
            const pSpan = j - i;
            if (selectedStep === 4) {
                // step 4: equipment 서브그룹 병합
                let k = i;
                while (k < j) {
                    let l = k + 1;
                    while (l < j && rows[l].equipment === rows[k].equipment) l++;
                    result[k] = { procSpan: k === i ? pSpan : 0, equipSpan: l - k, descSpan: 0 };
                    for (let m = k + 1; m < l; m++) result[m] = { procSpan: 0, equipSpan: 0, descSpan: 0 };
                    k = l;
                }
            } else if (selectedStep === 2) {
                // step 2: processDesc 서브그룹 병합 (같은 공정 내 동일 공정설명)
                let k = i;
                while (k < j) {
                    let l = k + 1;
                    while (l < j && rows[l].processDesc === rows[k].processDesc) l++;
                    result[k] = { procSpan: k === i ? pSpan : 0, equipSpan: 0, descSpan: l - k };
                    for (let m = k + 1; m < l; m++) result[m] = { procSpan: 0, equipSpan: 0, descSpan: 0 };
                    k = l;
                }
            } else {
                result[i] = { procSpan: pSpan, equipSpan: 0, descSpan: 0 };
                for (let m = i + 1; m < j; m++) result[m] = { procSpan: 0, equipSpan: 0, descSpan: 0 };
            }
            i = j;
        }
        return result;
    }, [stepFilteredRows, selectedStep]);

    // ★ 현재 단계 컬럼 설정
    const stepConfig = STEP_COLS[selectedStep] || STEP_COLS[1];

    if (!isOpen) return null;

    const allDone = steps.every(s => s.status === 'done');
    const allSyncing = steps.every(s => s.status === 'syncing');

    const handleExecuteAll = async () => {
        if (!onExecuteAll) return;
        setIsExecuting(true);
        try {
            await onExecuteAll();
        } finally {
            setIsExecuting(false);
        }
    };

    return (
        <div className="fixed z-[9999] bg-white rounded-xl shadow-2xl flex flex-col select-none border border-gray-300 overflow-hidden"
            style={{ left: wizPos.x, top: wizPos.y, width: wizSize.w, height: wizSize.h }}>
                {/* 헤더 - 콤팩트 */}
                <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-3 py-2 flex-shrink-0 cursor-move" onMouseDown={wizDragStart}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h2 className="text-white text-sm font-bold">FMEA→CP</h2>
                            <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded">
                                {cpNo || 'auto'}
                            </span>
                            <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded">
                                {mappingRows.length}건
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {allDone ? (
                                <>
                                    <span className="text-green-300 text-[10px] font-semibold">연동완료</span>
                                    {onNavigateToCp && (
                                        <button onClick={onNavigateToCp} className="px-2 py-0.5 bg-white/20 hover:bg-white/30 text-white rounded text-[9px] font-medium">
                                            CP이동→
                                        </button>
                                    )}
                                </>
                            ) : allSyncing ? (
                                <span className="text-yellow-300 text-[10px] animate-pulse">연동중...</span>
                            ) : (
                                <button
                                    onClick={handleExecuteAll}
                                    disabled={isExecuting || mappingRows.length === 0}
                                    className={`px-2 py-0.5 rounded text-[9px] font-bold ${isExecuting || mappingRows.length === 0
                                        ? 'bg-white/10 text-white/40 cursor-not-allowed'
                                        : 'bg-orange-500 hover:bg-orange-600 text-white'
                                    }`}
                                >
                                    {isExecuting ? '연동중...' : '전체연동'}
                                </button>
                            )}
                            <button onClick={onClose} className="px-2 py-0.5 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded text-[9px]">닫기</button>
                        </div>
                    </div>
                    {/* 진행 상태 (수평) */}
                    <div className="flex items-center gap-1 mt-1">
                        {steps.map((step, idx) => (
                            <div key={step.step} className="flex items-center gap-0.5">
                                <button
                                    onClick={() => setSelectedStep(step.step)}
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-medium cursor-pointer
                                        ${selectedStep === step.step
                                            ? 'ring-1 ring-white ring-offset-1 ring-offset-teal-700'
                                            : ''
                                        }
                                        ${statusColors[step.status]}`}
                                >
                                    {step.step}.{step.name}{step.status === 'done' && '✓'}
                                </button>
                                {idx < steps.length - 1 && <span className="text-white/30 text-[8px]">→</span>}
                            </div>
                        ))}
                    </div>
                </div>


                {/* ★ 단계별 매핑 테이블 (셀 병합 + 세로 스크롤) */}
                <div className="flex-1 overflow-y-auto border-t">
                    <table key={selectedStep} className="w-full text-[9px] border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-teal-600 text-white text-[8px]">
                                {stepConfig.cols.map((col, i) => (
                                    <th key={i} className="px-0.5 py-0.5 border-r border-teal-400 leading-tight font-semibold whitespace-nowrap" style={{ width: col.w }}>
                                        {col.label}
                                    </th>
                                ))}
                                {onConfirm && (
                                    <th className="px-1 py-0 text-center" style={{ width: '48px' }}>
                                        <button onClick={onConfirm} className="px-2 py-0.5 bg-orange-500 hover:bg-orange-600 text-white rounded text-[9px] font-bold" title="확정 후 개정관리 현황으로 이동">확정</button>
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {stepFilteredRows.length === 0 ? (
                                <tr>
                                    <td colSpan={stepConfig.cols.length + (onConfirm ? 1 : 0)} className="text-center py-8 text-gray-400">
                                        {selectedStep <= 1 ? '연동할 데이터가 없습니다.' : `${selectedStep}단계에 해당하는 데이터가 없습니다.`}
                                    </td>
                                </tr>
                            ) : (
                                stepFilteredRows.map((row, idx) => {
                                    const sp = mergeSpans[idx];
                                    return (
                                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                            {stepConfig.cols.map((col, ci) => {
                                                // 병합된 셀은 렌더링 skip
                                                if (col.merge === 'proc' && sp.procSpan === 0) return null;
                                                if (col.merge === 'equip' && sp.equipSpan === 0) return null;
                                                if (col.merge === 'desc' && sp.descSpan === 0) return null;
                                                const rSpan = col.merge === 'proc' ? sp.procSpan
                                                    : col.merge === 'equip' ? sp.equipSpan
                                                    : col.merge === 'desc' ? sp.descSpan : undefined;
                                                const val = row[col.key];
                                                // 렌더 함수
                                                let content: React.ReactNode = val;
                                                if (col.renderAs === 'm4') {
                                                    const mc = M4_CONFIG[row.m4] || M4_CONFIG[''];
                                                    content = (
                                                        <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px]"
                                                            style={{ backgroundColor: mc.color + '20', color: mc.color }}
                                                            title={mc.label}>
                                                            {row.m4 || '?'}
                                                        </span>
                                                    );
                                                } else if (col.renderAs === 'sc' && val) {
                                                    const bg = (val === '★' || val === 'CC') ? 'bg-red-500' : (val === '◇' || val === 'SC') ? 'bg-orange-500' : 'bg-yellow-500';
                                                    content = <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold text-white ${bg}`}>{val}</span>;
                                                }
                                                return (
                                                    <td key={ci}
                                                        rowSpan={rSpan && rSpan > 1 ? rSpan : undefined}
                                                        className={`px-0.5 py-0 border border-gray-200 leading-tight ${col.bg || ''} ${
                                                            col.merge ? 'bg-gray-50 font-medium align-middle' : ''
                                                        } ${col.key === 'processNo' || col.key === 'specialChar' || col.key === 'm4' ? 'text-center' : ''}`}
                                                    >
                                                        {content}
                                                    </td>
                                                );
                                            })}
                                            {onConfirm && <td className="border border-gray-200" />}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 에러 표시 */}
                {error && (
                    <div className="mx-4 mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex-shrink-0">
                        ⚠️ {error}
                    </div>
                )}

                {/* 상태 바 - 슬림 */}
                <div className="px-3 py-1 bg-gray-50 border-t flex items-center gap-2 text-[9px] text-gray-500 flex-shrink-0">
                    <span className="font-bold text-gray-700">{selectedStep}단계:{stepFilteredRows.length}건</span>
                    <span className={selectedStep === 3 ? 'font-bold text-blue-600' : ''}>제품:{mappingRows.filter(r => r.productChar).length}</span>
                    <span className={selectedStep === 4 ? 'font-bold text-purple-600' : ''}>공정:{mappingRows.filter(r => r.processChar).length}</span>
                    <span className={selectedStep === 5 ? 'font-bold text-red-600' : ''}>특별:{mappingRows.filter(r => r.specialChar).length}</span>
                </div>
            <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={wizResizeStart} title="크기 조절">
                <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 opacity-60">
                    <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
            </div>
        </div>
    );
}
