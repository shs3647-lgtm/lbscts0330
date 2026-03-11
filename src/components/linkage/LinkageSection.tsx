/**
 * @file LinkageSection.tsx
 * @description 통합 연동 섹션 컴포넌트 - 4개 등록화면에서 공통 사용
 * @version 1.0.0
 * @created 2026-01-27
 */

'use client';

import { LinkageSectionProps } from './types';
import { LinkageTag } from './LinkageTag';

// 헤더 셀 스타일
const headerCell = "border border-gray-300 px-2 py-1 text-center text-xs font-semibold text-white w-[80px]";
const valueCell = "border border-gray-300 px-2 py-1 text-left bg-white";

/**
 * 통합 연동 섹션 컴포넌트
 * - 상위 APQP, 상위 FMEA, 연동 PFD, 연동 CP 표시
 * - 현재 모듈에 따라 필요한 연동만 표시
 * - 1:N 연동 지원 (CP)
 */
export function LinkageSection({
    currentModule,
    currentId,
    apqpNo,
    pfmeaId,
    pfdNo,
    cpNos = [],
    onApqpChange,
    onFmeaChange,
    onPfdChange,
    onCpRemove,
    onOpenApqpModal,
    onOpenFmeaModal,
    onOpenPfdModal,
    onOpenCpModal,
    locked = {},
    show,
}: LinkageSectionProps) {

    // 현재 모듈에 따라 표시할 연동 결정 (APQP 미개발 → 항상 숨김)
    const displayConfig = show || {
        apqp: false,
        fmea: currentModule !== 'PFMEA' && currentModule !== 'APQP',
        pfd: currentModule !== 'PFD',
        cp: currentModule !== 'CP',
    };

    const renderEmpty = (label: string, onClick?: () => void) => (
        <span
            className={`text-xs text-gray-400 ${onClick ? 'cursor-pointer hover:text-gray-600' : ''}`}
            onClick={onClick}
        >
            - (클릭하여 선택)
        </span>
    );

    return (
        <div className="bg-white rounded border border-gray-300 mb-3">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-3 py-1.5 border-b border-gray-300">
                <h2 className="text-xs font-bold text-white flex items-center gap-1">
                    📎 프로젝트 연동 정보
                </h2>
            </div>

            <table className="w-full border-collapse text-xs">
                <tbody>
                    <tr className="h-8">
                        {/* 상위 APQP */}
                        {displayConfig.apqp && (
                            <>
                                <td className={`${headerCell} bg-green-600`}>상위 APQP</td>
                                <td
                                    className={`${valueCell} ${!locked.apqp && onOpenApqpModal ? 'cursor-pointer hover:bg-green-50' : ''}`}
                                    onClick={() => !locked.apqp && onOpenApqpModal?.()}
                                >
                                    {apqpNo ? (
                                        <LinkageTag
                                            type="APQP"
                                            id={apqpNo}
                                            locked={locked.apqp}
                                            onRemove={() => onApqpChange?.(null)}
                                            showRemoveButton={!locked.apqp}
                                        />
                                    ) : renderEmpty('APQP', onOpenApqpModal)}
                                </td>
                            </>
                        )}

                        {/* 상위 FMEA */}
                        {displayConfig.fmea && (
                            <>
                                <td className={`${headerCell} bg-yellow-600`}>상위 FMEA</td>
                                <td
                                    className={`${valueCell} ${!locked.fmea && onOpenFmeaModal ? 'cursor-pointer hover:bg-yellow-50' : ''} ${locked.fmea ? 'bg-yellow-50' : ''}`}
                                    onClick={() => !locked.fmea && onOpenFmeaModal?.()}
                                >
                                    {pfmeaId ? (
                                        <LinkageTag
                                            type="FMEA"
                                            id={pfmeaId}
                                            locked={locked.fmea}
                                            onRemove={() => onFmeaChange?.(null)}
                                            showRemoveButton={!locked.fmea}
                                        />
                                    ) : renderEmpty('FMEA', locked.fmea ? undefined : onOpenFmeaModal)}
                                </td>
                            </>
                        )}

                        {/* 연동 PFD */}
                        {displayConfig.pfd && (
                            <>
                                <td className={`${headerCell} bg-violet-600`}>연동 PFD</td>
                                <td
                                    className={`${valueCell} ${!locked.pfd && onOpenPfdModal ? 'cursor-pointer hover:bg-violet-50' : ''}`}
                                    onClick={() => !locked.pfd && onOpenPfdModal?.()}
                                >
                                    {pfdNo ? (
                                        <LinkageTag
                                            type="PFDL"
                                            id={pfdNo}
                                            locked={locked.pfd}
                                            onRemove={() => onPfdChange?.(null)}
                                            showRemoveButton={!locked.pfd}
                                        />
                                    ) : (
                                        <span className="text-xs text-gray-400">PFD 연동 시 자동 표시</span>
                                    )}
                                </td>
                            </>
                        )}

                        {/* 연동 CP - 1:N 지원 */}
                        {displayConfig.cp && (
                            <>
                                <td className={`${headerCell} bg-teal-600`}>연동 CP</td>
                                <td
                                    className={`${valueCell} ${!locked.cp && onOpenCpModal ? 'cursor-pointer hover:bg-teal-50' : ''}`}
                                    onClick={() => !locked.cp && onOpenCpModal?.()}
                                >
                                    {cpNos.length > 0 ? (
                                        <div className="flex flex-wrap items-center gap-1">
                                            {cpNos.map((cpNo, idx) => (
                                                <LinkageTag
                                                    key={cpNo}
                                                    type="CP"
                                                    id={cpNo}
                                                    locked={locked.cp}
                                                    onRemove={() => onCpRemove?.(cpNo)}
                                                    showRemoveButton={!locked.cp}
                                                />
                                            ))}
                                            {cpNos.length > 1 && (
                                                <span className="text-[10px] text-gray-500">
                                                    ({cpNos.length}개)
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400">CP 연동 시 자동 표시</span>
                                    )}
                                </td>
                            </>
                        )}
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

export default LinkageSection;
