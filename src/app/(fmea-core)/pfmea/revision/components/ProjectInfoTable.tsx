/**
 * @file ProjectInfoTable.tsx
 * @description 프로젝트 정보 테이블 컴포넌트
 * @module pfmea/revision/components
 *
 * @status CODEFREEZE L4 (Gold) 🔒
 * @freeze_level L4 (Critical - Gold Test Passed)
 * @frozen_date 2026-03-02
 * @gold_tag v4.0.0-gold
 * @allowed_changes NONE — 사용자 명시적 승인 + full test pass 필수
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface ProjectInfo {
    fmeaId: string;
    fmeaName: string;
    factory: string;
    responsible: string;
    customer: string;
    productName: string;
}

interface ProjectInfoTableProps {
    selectedInfo: ProjectInfo;
}

export function ProjectInfoTable({ selectedInfo }: ProjectInfoTableProps) {
    const router = useRouter();
    return (
        <div className="rounded-lg overflow-hidden border border-gray-400 mb-4">
            <table className="w-full border-collapse text-xs">
                <thead>
                    <tr className="bg-[#00587a] text-white">
                        <th className="border border-white px-2 py-2 text-center w-[16%]" title="FMEA Identifier">FMEA ID</th>
                        <th className="border border-white px-2 py-2 text-center w-[16%]" title="FMEA Name">FMEA명(Name)</th>
                        <th className="border border-white px-2 py-2 text-center w-[16%]" title="Plant / Factory">공장(Plant)</th>
                        <th className="border border-white px-2 py-2 text-center w-[16%]" title="FMEA Responsible Person">FMEA담당자(Owner)</th>
                        <th className="border border-white px-2 py-2 text-center w-[16%]" title="Customer Name">고객(Customer)</th>
                        <th className="border border-white px-2 py-2 text-center w-[20%]" title="Model / Product Name">모델(품명)(Model)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className="bg-white h-10">
                        {/* FMEA ID 클릭 → FMEA 리스트 이동 */}
                        <td className="border border-gray-400 px-1 py-1 bg-gray-50">
                            <span
                                className="block w-full h-8 leading-8 px-2 text-xs text-center font-bold text-blue-600 cursor-pointer hover:underline hover:text-blue-800 truncate"
                                title="클릭하여 PFMEA 리스트로 이동(Click to go to PFMEA List)"
                                onClick={() => selectedInfo.fmeaId && router.push('/pfmea/list')}
                            >
                                {selectedInfo.fmeaId || '-'}
                            </span>
                        </td>
                        {/* FMEA명 클릭 → FMEA 워크시트 이동 */}
                        <td className="border border-gray-400 px-1 py-1 bg-gray-50">
                            <span
                                className="block w-full h-8 leading-8 px-2 text-xs text-center font-semibold text-blue-600 cursor-pointer hover:underline hover:text-blue-800 truncate"
                                title="클릭하여 PFMEA 워크시트로 이동(Click to go to PFMEA Worksheet)"
                                onClick={() => selectedInfo.fmeaId && router.push(`/pfmea/worksheet?id=${selectedInfo.fmeaId}`)}
                            >
                                {selectedInfo.fmeaName || '-'}
                            </span>
                        </td>
                        {/* 공장 - FMEA 등록정보에서 자동 연동 */}
                        <td className="border border-gray-400 px-1 py-1">
                            <input
                                type="text"
                                value={selectedInfo.factory}
                                readOnly
                                placeholder="-"
                                className="w-full h-8 px-2 text-xs text-center border-0 bg-gray-50 focus:outline-none"
                            />
                        </td>
                        {/* FMEA담당자 - FMEA 등록정보에서 자동 연동 */}
                        <td className="border border-gray-400 px-1 py-1">
                            <input
                                type="text"
                                value={selectedInfo.responsible}
                                readOnly
                                placeholder="-"
                                className="w-full h-8 px-2 text-xs text-center border-0 bg-gray-50 focus:outline-none font-semibold text-green-700"
                            />
                        </td>
                        {/* 고객 - FMEA 등록정보에서 자동 연동 */}
                        <td className="border border-gray-400 px-1 py-1">
                            <input
                                type="text"
                                value={selectedInfo.customer}
                                readOnly
                                placeholder="-"
                                className="w-full h-8 px-2 text-xs text-center border-0 bg-gray-50 focus:outline-none"
                            />
                        </td>
                        {/* 모델(품명) - FMEA 등록정보에서 자동 연동 */}
                        <td className="border border-gray-400 px-1 py-1">
                            <input
                                type="text"
                                value={selectedInfo.productName}
                                readOnly
                                placeholder="-"
                                className="w-full h-8 px-2 text-xs text-center border-0 bg-gray-50 focus:outline-none"
                            />
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
