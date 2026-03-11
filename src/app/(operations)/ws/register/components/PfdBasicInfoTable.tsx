/**
 * @file PfdBasicInfoTable.tsx
 * @description WS 등록 기본정보 테이블 (PFD 등록과 동등 수준)
 * @updated 2026-02-10
 */
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { PFDInfo, PFDType } from '../../types/pfdRegister';
import { generateLinkedCpNo, generatePFDId } from '../../utils/pfdIdUtils';

interface WsBasicInfoTableProps {
    pfdInfo: PFDInfo;
    pfdId: string;
    isEditMode: boolean;
    linkedCpList: { id: string }[];
    selectedBasePfd: string | null;
    selectedParentApqp: string | null;
    selectedParentFmea: string | null;
    fmeaLocked: boolean;
    cftMembers?: { name?: string; role?: string }[];
    setPfdId: (id: string) => void;
    updateField: (field: keyof PFDInfo, value: string) => void;
    setSelectedBasePfd: (id: string | null) => void;
    setSelectedParentApqp: (id: string | null) => void;
    setSelectedParentFmea: (id: string | null) => void;
    setStartDateModalOpen: (v: boolean) => void;
    setRevisionDateModalOpen: (v: boolean) => void;
    setBizInfoModalOpen: (v: boolean) => void;
    setUserModalTarget: (v: 'responsible' | 'design' | 'cft') => void;
    setUserModalOpen: (v: boolean) => void;
    loadApqpList: () => void;
    setApqpModalOpen: (v: boolean) => void;
    openFmeaSelectModal: () => void;
    openCpManageModal: () => void;
}

export default function WsBasicInfoTable({
    pfdInfo, pfdId, isEditMode, linkedCpList,
    selectedBasePfd, selectedParentApqp, selectedParentFmea, fmeaLocked,
    cftMembers = [],
    setPfdId, updateField, setSelectedBasePfd, setSelectedParentApqp, setSelectedParentFmea,
    setStartDateModalOpen, setRevisionDateModalOpen, setBizInfoModalOpen,
    setUserModalTarget, setUserModalOpen, loadApqpList, setApqpModalOpen,
    openFmeaSelectModal, openCpManageModal,
}: WsBasicInfoTableProps) {
    const router = useRouter();
    const headerCell = "bg-[#5A6C7D] text-white px-2 py-1.5 border border-white font-semibold text-xs text-center whitespace-nowrap";
    const inputCell = "border border-gray-300 px-1 py-0.5 overflow-hidden";

    const handleTypeChange = (newType: PFDType) => {
        updateField('pfdType', newType);
        const newId = generatePFDId(newType).replace(/^pfd/i, 'ws');
        setPfdId(newId);
        router.replace(`/ws/register?id=${newId}`);
    };

    // CP ID 생성 헬퍼 (ws → pfd 변환 후 CP 생성)
    const getCpNo = () => {
        if (!pfdId) return '';
        return generateLinkedCpNo(pfdId.replace(/^ws/i, 'pfd'));
    };

    return (
        <div className="bg-white rounded border border-gray-300 mb-3">
            <div className="bg-[#e8ecf0] px-3 py-1.5 border-b border-gray-300">
                <h2 className="text-xs font-bold text-gray-700">WS 기본정보</h2>
            </div>
            <table className="w-full border-collapse text-xs">
                <tbody>
                    {/* 1행: WS유형, WS명, WS ID, 상위APQP */}
                    <tr className="h-8">
                        <td className={headerCell}>WS 유형</td>
                        <td className={inputCell}>
                            <select value={pfdInfo.pfdType} onChange={e => handleTypeChange(e.target.value as PFDType)} className="w-full h-7 px-2 text-xs border border-gray-300 bg-white rounded font-semibold cursor-pointer">
                                <option value="M">M - Master WS</option>
                                <option value="F">F - Family WS</option>
                                <option value="P">P - Part WS</option>
                            </select>
                        </td>
                        <td className={headerCell}>WS명</td>
                        <td className={inputCell}>
                            <input type="text" value={pfdInfo.subject} onChange={e => updateField('subject', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="작업표준서 제목" />
                        </td>
                        <td className={headerCell}>WS ID</td>
                        <td className={inputCell}>
                            <div className="flex items-center gap-1 px-2">
                                {pfdId ? (
                                    <>
                                        <span className="px-1 py-0 rounded text-[9px] font-bold text-white bg-slate-500">연동</span>
                                        <span className="text-xs font-bold text-slate-700 cursor-pointer hover:underline" onClick={() => router.push('/ws/list')} title="WS 리스트로 이동">{pfdId}</span>
                                    </>
                                ) : (
                                    <span className="text-xs text-gray-400">-</span>
                                )}
                            </div>
                        </td>
                        <td className={headerCell}>상위 APQP</td>
                        <td className={inputCell}>
                            <div className="flex items-center gap-2 px-2">
                                {selectedParentApqp ? (
                                    <>
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white bg-green-500 cursor-pointer hover:bg-green-600" onClick={() => router.push(`/apqp/register?id=${selectedParentApqp.toLowerCase()}`)} title="APQP 등록화면으로 이동">APQP</span>
                                        <span className="text-xs font-semibold text-green-600 cursor-pointer hover:underline" onClick={() => { loadApqpList(); setApqpModalOpen(true); }} title="APQP 선택">{selectedParentApqp}</span>
                                    </>
                                ) : (
                                    <span className="text-xs text-gray-400">-</span>
                                )}
                            </div>
                        </td>
                    </tr>
                    {/* 2행: 공정책임, WS담당자, 시작일자, 상위FMEA */}
                    <tr className="h-8">
                        <td className={headerCell}>공정 책임</td>
                        <td className={inputCell}>
                            <div className="flex items-center gap-1">
                                <input type="text" value={pfdInfo.processResponsibility} onChange={e => updateField('processResponsibility', e.target.value)} className="flex-1 h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="부서" />
                                <button onClick={() => { setUserModalTarget('design'); setUserModalOpen(true); }} className="text-slate-500 hover:text-slate-700 px-1 shrink-0">🔍</button>
                            </div>
                        </td>
                        <td className={headerCell}>WS 담당자</td>
                        <td className={inputCell}>
                            <div className="flex items-center gap-1">
                                <input type="text" value={pfdInfo.pfdResponsibleName} onChange={e => updateField('pfdResponsibleName', e.target.value)} className="flex-1 h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="담당자 성명" />
                                <button onClick={() => { setUserModalTarget('responsible'); setUserModalOpen(true); }} className="text-slate-500 hover:text-slate-700 px-1 shrink-0">🔍</button>
                            </div>
                        </td>
                        <td className={headerCell}>시작 일자</td>
                        <td className={inputCell}>
                            <input type="text" readOnly value={pfdInfo.pfdStartDate} onClick={() => setStartDateModalOpen(true)} className="w-full h-7 px-2 text-xs border border-gray-300 rounded bg-white cursor-pointer hover:bg-gray-50" placeholder="클릭하여 선택" />
                        </td>
                        <td className={`${headerCell} bg-yellow-600`}>상위 FMEA</td>
                        <td className={inputCell}>
                            <div className="flex items-center gap-2 px-2">
                                {selectedParentFmea ? (
                                    <>
                                        {fmeaLocked && <span className="text-yellow-600" title="FMEA에서 연동됨 (변경 불가)">🔒</span>}
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white bg-yellow-500 cursor-pointer hover:bg-yellow-600" onClick={() => router.push(`/pfmea/register?id=${selectedParentFmea.toLowerCase()}`)} title="FMEA 등록화면으로 이동">FMEA</span>
                                        <span className={`text-xs font-semibold text-yellow-600 ${!fmeaLocked ? 'cursor-pointer hover:underline' : ''}`} onClick={() => !fmeaLocked && openFmeaSelectModal()} title={fmeaLocked ? 'FMEA에서 연동됨' : 'FMEA 선택'}>{selectedParentFmea}</span>
                                    </>
                                ) : (
                                    <span className="text-xs text-gray-400">-</span>
                                )}
                            </div>
                        </td>
                    </tr>
                    {/* 3행: 고객명, 목표완료일, 회사명, 연동CP */}
                    <tr className="h-8">
                        <td className={headerCell}>고객 명</td>
                        <td className={inputCell}>
                            <div className="flex items-center gap-1">
                                <input type="text" value={pfdInfo.customerName} onChange={e => updateField('customerName', e.target.value)} className="flex-1 h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="고객 명" />
                                <button onClick={() => setBizInfoModalOpen(true)} className="text-slate-500 hover:text-slate-700">🔍</button>
                            </div>
                        </td>
                        <td className={headerCell}>목표완료일</td>
                        <td className={inputCell}>
                            <input type="text" readOnly value={pfdInfo.pfdRevisionDate} onClick={() => setRevisionDateModalOpen(true)} className="w-full h-7 px-2 text-xs border border-gray-300 rounded bg-white cursor-pointer hover:bg-gray-50" placeholder="클릭하여 선택" />
                        </td>
                        <td className={headerCell}>회사 명</td>
                        <td className={inputCell}>
                            <input type="text" value={pfdInfo.companyName} onChange={e => updateField('companyName', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="회사 명" />
                        </td>
                        <td className={`${headerCell} bg-teal-600`}>연동 CP</td>
                        <td className={inputCell}>
                            <div className="flex items-center gap-1 px-2">
                                {getCpNo() ? (
                                    <>
                                        <span className="px-1 py-0 rounded text-[9px] font-bold text-white bg-teal-500 cursor-pointer hover:bg-teal-600" onClick={() => router.push(`/control-plan/register?id=${getCpNo()?.toLowerCase()}`)} title="CP 등록화면으로 이동">CP</span>
                                        <span className="text-xs font-bold text-teal-700 cursor-pointer hover:underline" onClick={() => router.push(`/control-plan/register?id=${getCpNo()?.toLowerCase()}`)} title="CP 등록화면으로 이동">{getCpNo()}</span>
                                    </>
                                ) : (
                                    <span className="text-xs text-gray-400">-</span>
                                )}
                            </div>
                        </td>
                    </tr>
                    {/* 4행: 모델연식, 엔지니어링위치, 품명, 공정명 */}
                    <tr className="h-8">
                        <td className={headerCell}>모델 연식</td>
                        <td className={inputCell}>
                            <input type="text" value={pfdInfo.modelYear} onChange={e => updateField('modelYear', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="어플리케이션" />
                        </td>
                        <td className={headerCell}>엔지니어링 위치</td>
                        <td className={inputCell}>
                            <input type="text" value={pfdInfo.engineeringLocation} onChange={e => updateField('engineeringLocation', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="위치" />
                        </td>
                        <td className={headerCell}>품명</td>
                        <td className={inputCell}>
                            <input type="text" value={pfdInfo.partName} onChange={e => updateField('partName', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="완제품명" />
                        </td>
                        <td className={headerCell}>공정명</td>
                        <td className={inputCell}>
                            <input type="text" value={pfdInfo.processName || ''} onChange={e => updateField('processName', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="공정명 입력" />
                        </td>
                    </tr>
                    {/* 5행: 품번, 기밀수준, 상호기능팀 */}
                    <tr className="h-8">
                        <td className={headerCell}>품번</td>
                        <td className={inputCell}>
                            <input type="text" value={pfdInfo.partNo} onChange={e => updateField('partNo', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="품번" />
                        </td>
                        <td className={headerCell}>기밀수준</td>
                        <td className={inputCell}>
                            <select value={pfdInfo.securityLevel} onChange={e => updateField('securityLevel', e.target.value)} className="w-full h-7 px-1 text-xs border-0 bg-transparent focus:outline-none">
                                <option value="">선택</option>
                                <option value="Confidential">Confidential (기밀)</option>
                                <option value="Internal">Internal (내부용)</option>
                                <option value="Public">Public (공개)</option>
                            </select>
                        </td>
                        <td className={headerCell}>상호기능팀</td>
                        <td className={inputCell} colSpan={3}>
                            <span className="px-2 text-xs text-gray-700">
                                {cftMembers.filter(m => m.name?.trim()).length > 0
                                    ? cftMembers.filter(m => m.name?.trim()).map(m => m.name).join(', ')
                                    : <span className="text-gray-400">CFT 등록 필요</span>
                                }
                            </span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
