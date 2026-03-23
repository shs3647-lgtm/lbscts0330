/**
 * @file PfmeaContextMenu.tsx
 * @description PFMEA 워크시트 컨텍스트 메뉴 (CP 벤치마킹 - 구조분석~3L원인 전탭 지원)
 * @created 2026-01-27
 * @updated 2026-01-29: CP 벤치마킹 - 행 추가/삭제, 병합/병합해제, Undo/Redo 추가
 * @updated 2026-02-06: 메뉴 명칭 개선 및 상세 주석 추가
 * @updated 2026-03-23: 메뉴 액션에 stopPropagation + type="button" + 패널 onMouseDown (중복 행 삽입 방지)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📋 컨텍스트 메뉴 기능 설명 (수동모드에서 우클릭 시 표시)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 1️⃣ 위로 새 행 추가 (onInsertAbove)
 *    - 현재 선택한 행의 **위쪽**에 새로운 빈 행을 추가합니다.
 *    - 병합 영역과 상관없이 독립적인 새 행이 생성됩니다.
 *    - 예: 공정 "10. 파이프 외경" 위에 완전히 새로운 공정 행을 추가
 * 
 * 2️⃣ 아래로 새 행 추가 (onInsertBelow)
 *    - 현재 선택한 행의 **아래쪽**에 새로운 빈 행을 추가합니다.
 *    - 병합 영역과 상관없이 독립적인 새 행이 생성됩니다.
 *    - 예: 공정 "10. 파이프 외경" 아래에 완전히 새로운 공정 행을 추가
 * 
 * 3️⃣ 위로 병합 추가 (onAddMergedAbove) - Add with Merge Above
 *    - 현재 병합된 셀 **내부**에서 위쪽에 항목을 추가합니다.
 *    - 우클릭한 셀의 유형에 따라 다르게 동작:
 *      • 공정 셀 우클릭 → 새 공정 추가 (병합 밖으로, 독립적인 새 공정)
 *      • 기능 셀 우클릭 → 같은 공정 안에 새 기능 추가 (병합 안에서)
 *      • 제품특성 셀 우클릭 → 같은 기능 안에 새 제품특성 추가 (병합 안에서)
 * 
 * 4️⃣ 아래로 병합 추가 (onAddMergedBelow) - Add with Merge Below
 *    - 현재 병합된 셀 **내부**에서 아래쪽에 항목을 추가합니다.
 *    - 우클릭한 셀의 유형에 따라 다르게 동작:
 *      • 공정 셀 우클릭 → 새 공정 추가 (병합 밖으로, 독립적인 새 공정)
 *      • 기능 셀 우클릭 → 같은 공정 안에 새 기능 추가 (병합 안에서)
 *      • 제품특성 셀 우클릭 → 같은 기능 안에 새 제품특성 추가 (병합 안에서)
 * 
 * 5️⃣ 행 삭제 (onDeleteRow)
 *    - 현재 선택한 행을 삭제합니다.
 *    - 데이터가 있는 행은 삭제 전 확인 메시지가 표시됩니다.
 *    - 빈 행만 즉시 삭제 가능합니다.
 * 
 * 6️⃣ 위 행과 병합 / 아래 행과 병합 (onMergeUp / onMergeDown)
 *    - 인접한 행의 셀을 병합하여 하나의 셀로 만듭니다.
 * 
 * 7️⃣ 셀 병합 해제 (onUnmerge)
 *    - 병합된 셀을 개별 셀로 분리합니다.
 * 
 * 8️⃣ 실행취소 / 다시실행 (onUndo / onRedo)
 *    - 최근 작업을 취소하거나 다시 실행합니다.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client';

import React, { useState, useRef, useLayoutEffect } from 'react';

// 컬럼 타입: 구조분석(L1/L2/L3), 기능분석(FM), 고장분석(FC/FE), SOD, AP
export type PfmeaColumnType = 'l1' | 'l2' | 'l3' | 'fm' | 'fc' | 'fe' | 'sod' | 'ap' | 'other';

export interface PfmeaContextMenuState {
    visible: boolean;
    x: number;
    y: number;
    rowIdx: number;
    fmId?: string;
    fcId?: string;
    columnType?: PfmeaColumnType;
    colKey?: string;  // 컬럼 키 (병합용)
}

interface PfmeaContextMenuProps {
    contextMenu: PfmeaContextMenuState;
    onClose: () => void;
    // 행 추가/삭제 (CP 스타일)
    onInsertAbove?: (rowIdx: number, colType?: PfmeaColumnType, colKey?: string) => void;
    onInsertBelow?: (rowIdx: number, colType?: PfmeaColumnType, colKey?: string) => void;
    onDeleteRow?: (rowIdx: number) => void;
    // ★★★ 2026-02-05: 병합 추가 (작업요소 추가 - 상위 병합 확장) ★★★
    onAddMergedAbove?: (rowIdx: number, colKey?: string) => void;
    onAddMergedBelow?: (rowIdx: number, colKey?: string) => void;
    // 병합 (CP 스타일)
    onMergeUp?: (rowIdx: number, colKey?: string) => void;
    onMergeDown?: (rowIdx: number, colKey?: string) => void;
    onUnmerge?: (rowIdx: number, colKey?: string) => void;
    // Undo/Redo (CP 스타일)
    onUndo?: () => void;
    onRedo?: () => void;
    undoCount?: number;
    redoCount?: number;
    // 기존 고장연결 기능
    onAddFailureLink?: (fmId: string, fcId: string) => void;
    onDeleteFailureLink?: (fmId: string, fcId: string) => void;
    // 복사/붙여넣기
    onCopyRow?: (rowIdx: number) => void;
    onPasteRow?: (rowIdx: number) => void;
}

export function PfmeaContextMenu({
    contextMenu,
    onClose,
    onInsertAbove,
    onInsertBelow,
    onDeleteRow,
    onAddMergedAbove,
    onAddMergedBelow,
    onMergeUp,
    onMergeDown,
    onUnmerge,
    onUndo,
    onRedo,
    undoCount = 0,
    redoCount = 0,
    onAddFailureLink,
    onDeleteFailureLink,
    onCopyRow,
    onPasteRow,
}: PfmeaContextMenuProps) {
    const [showHelp, setShowHelp] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const [adjustedPos, setAdjustedPos] = useState<{ x: number; y: number }>({ x: contextMenu.x, y: contextMenu.y });

    // ★ 메뉴가 뷰포트 밖으로 나가면 위치 조정 (위쪽/왼쪽으로 플립)
    // useLayoutEffect: DOM 변경 후 브라우저 페인트 전에 실행 → 메뉴 깜빡임 방지
    useLayoutEffect(() => {
        if (!contextMenu.visible) return;
        const el = menuRef.current;
        if (!el) {
            setAdjustedPos({ x: contextMenu.x, y: contextMenu.y });
            return;
        }
        const rect = el.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        let x = contextMenu.x;
        let y = contextMenu.y;
        // 하단 넘침 → 위로 플립
        if (y + rect.height > vh - 8) y = contextMenu.y - rect.height;
        // 우측 넘침 → 왼쪽 플립
        if (x + rect.width > vw - 8) x = contextMenu.x - rect.width;
        // 상단/좌측 경계 보정 (플립 후에도 벗어나면 클램프)
        y = Math.max(8, Math.min(y, vh - rect.height - 8));
        x = Math.max(8, Math.min(x, vw - rect.width - 8));
        setAdjustedPos({ x, y });
    }, [contextMenu.visible, contextMenu.x, contextMenu.y]);

    if (!contextMenu.visible && !showHelp) return null;

    const { rowIdx, fmId, fcId, columnType, colKey } = contextMenu;

    // 컬럼 타입별 라벨
    const getColumnLabel = () => {
        switch (columnType) {
            case 'l1': return '📋 L1 (공정단계)';
            case 'l2': return '🔧 L2 (작업요소)';
            case 'l3': return '📊 L3 (작업단계)';
            case 'fm': return '⚠️ 고장형태(FM)';
            case 'fc': return '🔍 고장원인(FC)';
            case 'fe': return '💥 고장영향(FE)';
            case 'sod': return '📈 SOD 입력';
            case 'ap': return '🎯 AP 관리';
            default: return '📝 일반';
        }
    };

    // 병합 가능한 컬럼인지 확인 (구조분석 L1/L2/L3, 기능분석 FM 등)
    const isMergeableColumn = ['l1', 'l2', 'l3', 'fm', 'fc'].includes(columnType || '');

    // 구조분석 컬럼인지 확인 (L1/L2/L3)
    const isStructureColumn = ['l1', 'l2', 'l3'].includes(columnType || '');

    /** 메뉴 액션: 오버레이/부모로 이벤트 전파 시 중복 실행 방지 */
    const stopMenuPointer = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    // 핸들러들
    const handleInsertAbove = (e: React.MouseEvent<HTMLButtonElement>) => {
        stopMenuPointer(e);
        if (onInsertAbove) {
            onInsertAbove(rowIdx, columnType, colKey);
        }
        onClose();
    };

    const handleInsertBelow = (e: React.MouseEvent<HTMLButtonElement>) => {
        stopMenuPointer(e);
        if (onInsertBelow) {
            onInsertBelow(rowIdx, columnType, colKey);
        }
        onClose();
    };

    const handleDeleteRow = (e: React.MouseEvent<HTMLButtonElement>) => {
        stopMenuPointer(e);
        if (onDeleteRow) {
            onDeleteRow(rowIdx);
        }
        onClose();
    };

    // ★★★ 2026-02-05: 병합 추가 (작업요소 추가 - 상위 병합 확장) ★★★
    const handleAddMergedAbove = (e: React.MouseEvent<HTMLButtonElement>) => {
        stopMenuPointer(e);
        if (onAddMergedAbove) {
            onAddMergedAbove(rowIdx, colKey);
        }
        onClose();
    };

    const handleAddMergedBelow = (e: React.MouseEvent<HTMLButtonElement>) => {
        stopMenuPointer(e);
        if (onAddMergedBelow) {
            onAddMergedBelow(rowIdx, colKey);
        }
        onClose();
    };

    const handleMergeUp = (e: React.MouseEvent<HTMLButtonElement>) => {
        stopMenuPointer(e);
        if (onMergeUp) {
            onMergeUp(rowIdx, colKey);
        }
        onClose();
    };

    const handleMergeDown = (e: React.MouseEvent<HTMLButtonElement>) => {
        stopMenuPointer(e);
        if (onMergeDown) {
            onMergeDown(rowIdx, colKey);
        }
        onClose();
    };

    const handleUnmerge = (e: React.MouseEvent<HTMLButtonElement>) => {
        stopMenuPointer(e);
        if (onUnmerge) {
            onUnmerge(rowIdx, colKey);
        }
        onClose();
    };

    const handleUndo = (e: React.MouseEvent<HTMLButtonElement>) => {
        stopMenuPointer(e);
        if (undoCount > 0 && onUndo) {
            onUndo();
        }
        onClose();
    };

    const handleRedo = (e: React.MouseEvent<HTMLButtonElement>) => {
        stopMenuPointer(e);
        if (redoCount > 0 && onRedo) {
            onRedo();
        }
        onClose();
    };

    const handleAddFailureLink = (e: React.MouseEvent<HTMLButtonElement>) => {
        stopMenuPointer(e);
        if (onAddFailureLink && fmId) {
            onAddFailureLink(fmId, fcId || '');
        }
        onClose();
    };

    const handleDeleteFailureLink = (e: React.MouseEvent<HTMLButtonElement>) => {
        stopMenuPointer(e);
        if (onDeleteFailureLink && fmId && fcId) {
            onDeleteFailureLink(fmId, fcId);
        }
        onClose();
    };

    const handleCopy = (e: React.MouseEvent<HTMLButtonElement>) => {
        stopMenuPointer(e);
        if (onCopyRow) {
            onCopyRow(rowIdx);
        }
        onClose();
    };

    const handlePaste = (e: React.MouseEvent<HTMLButtonElement>) => {
        stopMenuPointer(e);
        if (onPasteRow) {
            onPasteRow(rowIdx);
        }
        onClose();
    };

    // 공통 메뉴: Undo/Redo
    const UndoRedoMenuItems = () => (
        <>
            <div className="border-t border-gray-200 my-0.5" />
            <button type="button"
                onClick={handleUndo}
                disabled={undoCount === 0}
                className={`w-full text-left px-2 py-1 text-[10px] flex items-center gap-1.5 ${undoCount > 0 ? 'hover:bg-yellow-50 text-yellow-700' : 'text-gray-300 cursor-not-allowed'
                    }`}
            >
                ↩️ 실행취소 {undoCount > 0 && <span className="text-[8px] bg-yellow-100 px-0.5 rounded">{Math.min(undoCount, 3)}회</span>}
            </button>
            <button type="button"
                onClick={handleRedo}
                disabled={redoCount === 0}
                className={`w-full text-left px-2 py-1 text-[10px] flex items-center gap-1.5 ${redoCount > 0 ? 'hover:bg-green-50 text-green-700' : 'text-gray-300 cursor-not-allowed'
                    }`}
            >
                ↪️ 다시실행 {redoCount > 0 && <span className="text-[8px] bg-green-100 px-0.5 rounded">{Math.min(redoCount, 3)}회</span>}
            </button>
        </>
    );

    return (
        <>
            {/* 오버레이 (CP와 동일한 z-index) */}
            <div
                className="fixed inset-0 z-[200]"
                onClick={onClose}
                onContextMenu={(e) => { e.preventDefault(); onClose(); }}
            />

            {/* 메뉴 (컴팩트 스타일) - 뷰포트 경계 자동 조정 */}
            <div
                ref={menuRef}
                role="menu"
                className="fixed z-[201] bg-white border border-gray-300 rounded-md shadow-lg py-0.5 min-w-[180px] max-h-[calc(100vh-16px)] overflow-y-auto"
                style={{
                    left: adjustedPos.x,
                    top: adjustedPos.y,
                }}
                onMouseDown={(e) => e.stopPropagation()}
            >
                {/* 헤더 - 컬럼 타입 표시 */}
                <div className="px-2 py-1 text-[9px] text-gray-500 border-b border-gray-100">
                    {getColumnLabel()} | 행 #{rowIdx + 1}
                    {fmId && <span className="ml-1 text-blue-600">(FM: {fmId.slice(-6)})</span>}
                </div>

                {/* ★ 행 추가 (위/아래) - L3(작업요소)에서는 비활성화 (병합 추가 사용) */}
                {(() => {
                    const isL3 = columnType === 'l3';
                    const canInsertAbove = onInsertAbove && !isL3;
                    const canInsertBelow = onInsertBelow && !isL3;
                    return (
                        <>
                            <button type="button"
                                onClick={canInsertAbove ? handleInsertAbove : undefined}
                                disabled={!canInsertAbove}
                                className={`w-full text-left px-2 py-1 text-[10px] flex items-center gap-1.5 transition-colors ${canInsertAbove ? 'hover:bg-blue-50' : 'text-gray-300 cursor-not-allowed'}`}
                            >
                                <span>⬆️</span>
                                <span>위로 새 행 추가</span>
                                {isStructureColumn && canInsertAbove && <span className="ml-auto text-gray-400 text-[8px]">{columnType?.toUpperCase()}</span>}
                            </button>
                            <button type="button"
                                onClick={canInsertBelow ? handleInsertBelow : undefined}
                                disabled={!canInsertBelow}
                                className={`w-full text-left px-2 py-1 text-[10px] flex items-center gap-1.5 transition-colors ${canInsertBelow ? 'hover:bg-blue-50' : 'text-gray-300 cursor-not-allowed'}`}
                            >
                                <span>⬇️</span>
                                <span>아래로 새 행 추가</span>
                                {isStructureColumn && canInsertBelow && <span className="ml-auto text-gray-400 text-[8px]">{columnType?.toUpperCase()}</span>}
                            </button>
                        </>
                    );
                })()}

                {/* ★★★ 2026-02-05: 병합 추가 (작업요소 추가 - 상위 병합 확장) ★★★ */}
                {(onAddMergedAbove || onAddMergedBelow) && (
                    <div className="border-t border-gray-100 my-0.5" />
                )}
                {onAddMergedAbove && (
                    <button type="button"
                        onClick={handleAddMergedAbove}
                        className="w-full text-left px-2 py-1 text-[10px] hover:bg-green-50 text-green-700 flex items-center gap-1.5 transition-colors"
                    >
                        <span>⬆️➕</span>
                        <span>위로 병합 추가</span>
                    </button>
                )}
                {onAddMergedBelow && (
                    <button type="button"
                        onClick={handleAddMergedBelow}
                        className="w-full text-left px-2 py-1 text-[10px] hover:bg-green-50 text-green-700 flex items-center gap-1.5 transition-colors"
                    >
                        <span>⬇️➕</span>
                        <span>아래로 병합 추가</span>
                    </button>
                )}

                {/* ★ 행 삭제 */}
                <div className="border-t border-gray-100 my-0.5" />
                <button type="button"
                    onClick={onDeleteRow ? handleDeleteRow : undefined}
                    disabled={!onDeleteRow}
                    className={`w-full text-left px-2 py-1 text-[10px] flex items-center gap-1.5 transition-colors ${onDeleteRow ? 'hover:bg-red-50 text-red-600' : 'text-gray-300 cursor-not-allowed'}`}
                >
                    <span>🗑️</span>
                    <span>행 삭제</span>
                </button>

                {/* ★ 병합 기능 (병합 가능한 컬럼에서만) */}
                {isMergeableColumn && (onMergeUp || onMergeDown || onUnmerge) && (
                    <>
                        <div className="border-t border-gray-100 my-0.5" />
                        {onMergeUp && (
                            <button type="button"
                                onClick={handleMergeUp}
                                className="w-full text-left px-2 py-1 text-[10px] hover:bg-purple-50 text-purple-700 flex items-center gap-1.5 transition-colors"
                            >
                                <span>🔗</span>
                                <span>위 행과 병합</span>
                            </button>
                        )}
                        {onMergeDown && (
                            <button type="button"
                                onClick={handleMergeDown}
                                className="w-full text-left px-2 py-1 text-[10px] hover:bg-purple-50 text-purple-700 flex items-center gap-1.5 transition-colors"
                            >
                                <span>🔗</span>
                                <span>아래 행과 병합</span>
                            </button>
                        )}
                        {onUnmerge && (
                            <button type="button"
                                onClick={handleUnmerge}
                                className="w-full text-left px-2 py-1 text-[10px] hover:bg-orange-50 text-orange-700 flex items-center gap-1.5 transition-colors"
                            >
                                <span>✂️</span>
                                <span>셀 병합 해제</span>
                            </button>
                        )}
                    </>
                )}

                {/* 고장연결 추가/삭제 (FM/FC 컬럼에서만) */}
                {(columnType === 'fm' || columnType === 'fc') && (
                    <>
                        <div className="border-t border-gray-100 my-0.5" />
                        {onAddFailureLink && (
                            <button type="button"
                                onClick={handleAddFailureLink}
                                className="w-full text-left px-2 py-1 text-[10px] hover:bg-blue-50 flex items-center gap-1.5 transition-colors"
                            >
                                <span className="text-green-600">➕</span>
                                <span>고장연결 추가</span>
                            </button>
                        )}
                        {onDeleteFailureLink && fmId && fcId && (
                            <button type="button"
                                onClick={handleDeleteFailureLink}
                                className="w-full text-left px-2 py-1 text-[10px] hover:bg-red-50 flex items-center gap-1.5 transition-colors text-red-600"
                            >
                                <span>🗑️</span>
                                <span>고장연결 삭제</span>
                            </button>
                        )}
                    </>
                )}

                {/* 복사/붙여넣기 */}
                {(onCopyRow || onPasteRow) && (
                    <>
                        <div className="border-t border-gray-100 my-0.5" />
                        {onCopyRow && (
                            <button type="button"
                                onClick={handleCopy}
                                className="w-full text-left px-2 py-1 text-[10px] hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
                            >
                                <span>📋</span>
                                <span>행 복사</span>
                            </button>
                        )}
                        {onPasteRow && (
                            <button type="button"
                                onClick={handlePaste}
                                className="w-full text-left px-2 py-1 text-[10px] hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
                            >
                                <span>📥</span>
                                <span>행 붙여넣기</span>
                            </button>
                        )}
                    </>
                )}

                {/* Undo/Redo */}
                {(onUndo || onRedo) && <UndoRedoMenuItems />}

                {/* 도움말 */}
                <div className="border-t border-gray-100 my-0.5" />
                <button type="button"
                    onClick={() => setShowHelp(true)}
                    className="w-full text-left px-2 py-1 text-[10px] hover:bg-yellow-50 text-yellow-700 flex items-center gap-1.5 transition-colors"
                >
                    <span>❓</span>
                    <span>도움말</span>
                </button>

                {/* 닫기 */}
                <div className="border-t border-gray-100 my-0.5" />
                <button type="button"
                    onClick={onClose}
                    className="w-full text-left px-2 py-1 text-[10px] hover:bg-gray-50 flex items-center gap-1.5 transition-colors text-gray-500"
                >
                    <span>❌</span>
                    <span>닫기</span>
                </button>
            </div>

            {/* 도움말 모달 - 컨텍스트 메뉴 우측에 표시 */}
            {showHelp && (
                <div 
                    className="fixed inset-0 z-[10001]"
                    onClick={() => { setShowHelp(false); onClose(); }}
                >
                    <div 
                        className="absolute bg-white rounded-lg shadow-2xl border border-gray-300 p-3"
                        style={{
                            left: Math.min(contextMenu.x + 160, window.innerWidth - 280),
                            top: Math.max(contextMenu.y - 50, 10),
                            minWidth: '240px',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-xs font-bold text-gray-800 mb-2 flex items-center gap-1">
                            📋 컨텍스트 메뉴 도움말
                        </div>
                        <div className="text-[10px] text-gray-700 space-y-1.5">
                            <div className="flex items-start gap-1.5">
                                <span className="text-blue-600 font-semibold min-w-[65px]">⬆️⬇️ 새 행</span>
                                <span>병합 밖 독립적인 새 행 추가</span>
                            </div>
                            <div className="border-t border-gray-200 my-1" />
                            <div className="flex items-start gap-1.5">
                                <span className="text-green-600 font-semibold min-w-[75px]">⬆️➕ 위로 병합</span>
                                <span>같은 그룹 내 위에 항목 추가</span>
                            </div>
                            <div className="flex items-start gap-1.5">
                                <span className="text-green-600 font-semibold min-w-[75px]">⬇️➕ 아래 병합</span>
                                <span>같은 그룹 내 아래에 항목 추가</span>
                            </div>
                            <div className="text-[9px] text-gray-500 pl-[70px]">
                                • 공정 셀 → 새 공정 추가<br/>
                                • 기능 셀 → 같은 공정 내 새 기능<br/>
                                • 특성 셀 → 같은 기능 내 새 특성
                            </div>
                            <div className="border-t border-gray-200 my-1" />
                            <div className="flex items-start gap-1.5">
                                <span className="text-purple-600 font-semibold min-w-[65px]">🔗 병합</span>
                                <span>위/아래 셀 합치기</span>
                            </div>
                            <div className="flex items-start gap-1.5">
                                <span className="text-red-600 font-semibold min-w-[65px]">🗑️ 삭제</span>
                                <span>빈 행만 즉시 삭제</span>
                            </div>
                            <div className="flex items-start gap-1.5">
                                <span className="text-gray-600 font-semibold min-w-[65px]">↩️↪️</span>
                                <span>실행취소 / 다시실행</span>
                            </div>
                        </div>
                        <button type="button"
                            onClick={() => { setShowHelp(false); onClose(); }}
                            className="mt-3 w-full py-1 text-[10px] bg-gray-100 hover:bg-gray-200 rounded text-gray-600 transition-colors"
                        >
                            닫기
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

// 컨텍스트 메뉴 초기 상태
export const initialPfmeaContextMenu: PfmeaContextMenuState = {
    visible: false,
    x: 0,
    y: 0,
    rowIdx: -1,
    fmId: undefined,
    fcId: undefined,
    columnType: undefined,
    colKey: undefined,
};
