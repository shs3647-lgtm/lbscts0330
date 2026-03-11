'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { PFDInfo, PFDType } from '../../types/pfdRegister';
import { generateLinkedPfdNo, generateLinkedCpNo, generatePFDId } from '../../utils/pfdIdUtils';

// =====================================================
// Style constants — PFMEA 등록화면 표준
// =====================================================
const headerCell = "bg-[#00587a] text-white px-1 py-0.5 border border-white font-semibold text-[10px] text-center leading-tight";
const inputCell = "border border-gray-300 px-1 py-0.5 overflow-hidden";

interface PfdBasicInfoTableProps {
    pfdInfo: PFDInfo;
    pfdId: string;
    isEditMode: boolean;
    linkedCpList: { id: string; module?: string; docType?: string; subject?: string; linkGroupNo?: number }[];
    selectedBasePfd: string | null;
    selectedParentFmea: string | null;
    fmeaLocked: boolean;
    cftMembers?: { name?: string; role?: string }[];
    // Setters
    setPfdId: (id: string) => void;
    updateField: (field: keyof PFDInfo, value: string) => void;
    setSelectedBasePfd: (id: string | null) => void;
    setSelectedParentFmea: (id: string | null) => void;
    // Modal handlers
    setStartDateModalOpen: (v: boolean) => void;
    setRevisionDateModalOpen: (v: boolean) => void;
    setBizInfoModalOpen: (v: boolean) => void;
    setUserModalTarget: (v: 'responsible' | 'design' | 'cft') => void;
    setUserModalOpen: (v: boolean) => void;
    openFmeaSelectModal: () => void;
    openCpManageModal: () => void;
}

export default function PfdBasicInfoTable({
    pfdInfo, pfdId, isEditMode, linkedCpList,
    selectedBasePfd, selectedParentFmea, fmeaLocked,
    cftMembers = [],
    setPfdId, updateField, setSelectedBasePfd, setSelectedParentFmea,
    setStartDateModalOpen, setRevisionDateModalOpen, setBizInfoModalOpen,
    setUserModalTarget, setUserModalOpen,
    openFmeaSelectModal, openCpManageModal,
}: PfdBasicInfoTableProps) {
    const router = useRouter();

    // 유형 변경 핸들러
    const handleTypeChange = (newType: PFDType) => {
        updateField('pfdType', newType);
        const currentIdType = pfdId?.match(/pfd\d{2}-([mfp])/i)?.[1]?.toUpperCase() || '';
        if (currentIdType !== newType) {
            const newId = generatePFDId(newType);
            setPfdId(newId);
            router.replace(`/pfd/register?id=${newId}`);
        }
        if (newType === 'M') setSelectedBasePfd(pfdId || newType);
        else setSelectedBasePfd(null);
    };

    return (
        <div className="bg-white rounded border border-gray-300 mb-3">
            <div className="bg-[#e3f2fd] px-3 py-1.5 border-b border-gray-300">
                <h2 className="text-sm font-extrabold text-gray-800" title="PFD Basic Information">기획 및 준비 <span className="text-[10px] font-semibold text-gray-500">(Plan & Prep)</span> 1단계</h2>
            </div>
            <table className="w-full border-collapse text-xs table-fixed">
                <colgroup>
                    <col className="w-[9%]" /><col className="w-[16%]" />
                    <col className="w-[9%]" /><col className="w-[16%]" />
                    <col className="w-[9%]" /><col className="w-[16%]" />
                    <col className="w-[9%]" /><col className="w-[16%]" />
                </colgroup>
                <tbody>
                    {/* 1행: PFD유형, PFD명, PFD ID, 상위FMEA */}
                    <tr className="h-9">
                        <td className={headerCell}>PFD 유형<br /><span className="text-[8px] font-normal opacity-70">(Type)</span></td>
                        <td className={inputCell}>
                            <select
                                value={pfdInfo.pfdType}
                                onChange={e => handleTypeChange(e.target.value as PFDType)}
                                className="w-full h-7 px-1 text-xs border border-gray-300 bg-white rounded font-semibold cursor-pointer"
                            >
                                <option value="M">M - Master PFD</option>
                                <option value="F">F - Family PFD</option>
                                <option value="P">P - Part PFD</option>
                            </select>
                        </td>
                        <td className={headerCell}>PFD명<br /><span className="text-[8px] font-normal opacity-70">(Name)</span></td>
                        <td className={inputCell}>
                            <input type="text" value={pfdInfo.subject} onChange={e => updateField('subject', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="공정흐름도 제목" />
                        </td>
                        <td className={headerCell}>PFD ID</td>
                        <td className={inputCell}>
                            <div className="flex items-center gap-1 px-1">
                                {pfdId ? (<>
                                    <span className="px-1 py-0.5 rounded text-[8px] font-bold text-white bg-violet-500 shrink-0">연동</span>
                                    <span className="text-[10px] font-bold text-violet-700 cursor-pointer hover:underline" onClick={() => router.push('/pfd/list')} title="클릭하면 PFD 리스트로 이동">{generateLinkedPfdNo(pfdId)}</span>
                                </>) : <span className="text-[10px] text-gray-400">-</span>}
                            </div>
                        </td>
                        <td className={`${headerCell} bg-yellow-600`}>상위 FMEA<br /><span className="text-[8px] font-normal opacity-70">(Parent)</span></td>
                        <td className={inputCell}>
                            <div className="flex items-center gap-1 px-1 cursor-pointer hover:bg-yellow-50 min-h-[28px] min-w-0 flex-wrap" onClick={() => !fmeaLocked && openFmeaSelectModal()} title={fmeaLocked ? 'FMEA에서 연동됨' : 'FMEA 선택'}>
                                {selectedParentFmea ? (<>
                                    {fmeaLocked && <span className="text-yellow-600" title="FMEA에서 연동됨 (변경 불가)">🔒</span>}
                                    <span className="px-1 py-0.5 rounded text-[8px] font-bold text-white bg-yellow-500 shrink-0">FMEA</span>
                                    <span className="text-[10px] font-semibold text-yellow-600 hover:underline break-all" onClick={e => { e.stopPropagation(); router.push(`/pfmea/register?id=${selectedParentFmea.toLowerCase()}`); }}>{selectedParentFmea}</span>
                                </>) : <span className="text-[10px] text-gray-400">-</span>}
                            </div>
                        </td>
                    </tr>
                    {/* 2행: 공정책임, PFD담당자, 시작일자, 연동CP */}
                    <tr className="h-9">
                        <td className={headerCell}>공정 책임<br /><span className="text-[8px] font-normal opacity-70">(Responsibility)</span></td>
                        <td className={inputCell}>
                            <div className="flex items-center gap-0.5 min-w-0">
                                <input type="text" value={pfdInfo.processResponsibility} onChange={e => updateField('processResponsibility', e.target.value)} className="flex-1 min-w-0 h-7 px-1 text-xs border-0 bg-transparent focus:outline-none truncate" placeholder="부서(Department)" />
                                <button onClick={() => { setUserModalTarget('design'); setUserModalOpen(true); }} className="text-blue-500 hover:text-blue-700 shrink-0 text-xs">🔍</button>
                            </div>
                        </td>
                        <td className={headerCell}>PFD 담당자<br /><span className="text-[8px] font-normal opacity-70">(Owner)</span></td>
                        <td className={inputCell}>
                            <div className="flex items-center gap-0.5 min-w-0">
                                <input type="text" value={pfdInfo.pfdResponsibleName} onChange={e => updateField('pfdResponsibleName', e.target.value)} className="flex-1 min-w-0 h-7 px-1 text-xs border-0 bg-transparent focus:outline-none truncate" placeholder="담당자 성명(Name)" />
                                <button onClick={() => { setUserModalTarget('responsible'); setUserModalOpen(true); }} className="text-blue-500 hover:text-blue-700 shrink-0 text-xs">🔍</button>
                            </div>
                        </td>
                        <td className={headerCell}>시작 일자<br /><span className="text-[8px] font-normal opacity-70">(Start Date)</span></td>
                        <td className={inputCell}>
                            <input type="text" readOnly value={pfdInfo.pfdStartDate} onClick={() => setStartDateModalOpen(true)} className="w-full h-7 px-2 text-xs border border-gray-300 rounded bg-white cursor-pointer hover:bg-gray-50" placeholder="클릭하여 선택" />
                        </td>
                        <td className={`${headerCell} bg-teal-700`}>연동 CP<br /><span className="text-[8px] font-normal opacity-70">(Linked)</span></td>
                        <td className={inputCell}>
                            <div className="flex items-center gap-0.5 px-1 min-h-[28px]">
                                {pfdId ? (<>
                                    <span className="px-1 py-0.5 rounded text-[8px] font-bold text-white bg-teal-500 cursor-pointer hover:bg-teal-600 shrink-0" onClick={() => router.push(`/control-plan/register?id=${generateLinkedCpNo(pfdId)?.toLowerCase()}`)} title="CP 등록화면으로 이동">CP</span>
                                    <span className="text-[10px] font-bold text-teal-700 cursor-pointer hover:underline" onClick={() => router.push(`/control-plan/register?id=${generateLinkedCpNo(pfdId)?.toLowerCase()}`)} title="CP 등록화면으로 이동">{generateLinkedCpNo(pfdId)}</span>
                                </>) : <span className="text-[10px] text-gray-400">-</span>}
                            </div>
                        </td>
                    </tr>
                    {/* 3행: 고객명, 엔지니어링위치, 목표완료일, 연동FMEA(PFD→FMEA 방향) */}
                    <tr className="h-9">
                        <td className={headerCell}>고객 명<br /><span className="text-[8px] font-normal opacity-70">(Customer)</span></td>
                        <td className={inputCell}>
                            <div className="flex items-center gap-0.5 min-w-0">
                                <input type="text" value={pfdInfo.customerName} onChange={e => updateField('customerName', e.target.value)} className="flex-1 min-w-0 h-7 px-1 text-xs border-0 bg-transparent focus:outline-none truncate" placeholder="고객 명" />
                                <button onClick={() => setBizInfoModalOpen(true)} className="text-blue-500 hover:text-blue-700 shrink-0 text-xs">🔍</button>
                            </div>
                        </td>
                        <td className={headerCell}>엔지니어링 위치<br /><span className="text-[8px] font-normal opacity-70">(Location)</span></td>
                        <td className={inputCell}>
                            <input type="text" value={pfdInfo.engineeringLocation} onChange={e => updateField('engineeringLocation', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="위치(Location)" />
                        </td>
                        <td className={headerCell}>목표완료일<br /><span className="text-[8px] font-normal opacity-70">(Target Date)</span></td>
                        <td className={inputCell}>
                            <input type="text" readOnly value={pfdInfo.pfdRevisionDate} onClick={() => setRevisionDateModalOpen(true)} className="w-full h-7 px-2 text-xs border border-gray-300 rounded bg-white cursor-pointer hover:bg-gray-50" placeholder="클릭하여 선택" />
                        </td>
                        <td className={headerCell}>PFD 종류<br /><span className="text-[8px] font-normal opacity-70">(Category)</span></td>
                        <td className={inputCell}>
                            <select value={pfdInfo.confidentialityLevel} onChange={e => updateField('confidentialityLevel', e.target.value)} className="w-full h-7 px-1 text-xs border-0 bg-transparent focus:outline-none">
                                <option value="">선택(Select)</option>
                                <option value="Prototype">Prototype</option>
                                <option value="Pre-Launch">Pre-Launch</option>
                                <option value="Production">Production</option>
                                <option value="Safe Launch">Safe Launch</option>
                            </select>
                        </td>
                    </tr>
                    {/* 4행: 회사명, 모델연식, 품명, 기밀수준 */}
                    <tr className="h-9">
                        <td className={headerCell}>회사 명<br /><span className="text-[8px] font-normal opacity-70">(Company)</span></td>
                        <td className={inputCell}>
                            <input type="text" value={pfdInfo.companyName} onChange={e => updateField('companyName', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="회사 명" />
                        </td>
                        <td className={headerCell}>모델 연식<br /><span className="text-[8px] font-normal opacity-70">(Model Year)</span></td>
                        <td className={inputCell}>
                            <input type="text" value={pfdInfo.modelYear} onChange={e => updateField('modelYear', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="어플리케이션" />
                        </td>
                        <td className={headerCell}>품명<br /><span className="text-[8px] font-normal opacity-70">(Part Name)</span></td>
                        <td className={inputCell}>
                            <input type="text" value={pfdInfo.partName} onChange={e => updateField('partName', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="완제품명(Product)" />
                        </td>
                        <td className={headerCell}>기밀수준<br /><span className="text-[8px] font-normal opacity-70">(Security)</span></td>
                        <td className={inputCell}>
                            <select value={pfdInfo.securityLevel} onChange={e => updateField('securityLevel', e.target.value)} className="w-full h-7 px-1 text-xs border-0 bg-transparent focus:outline-none">
                                <option value="">선택(Select)</option>
                                <option value="Confidential">Confidential (기밀)</option>
                                <option value="Internal">Internal (내부용)</option>
                                <option value="Public">Public (공개)</option>
                            </select>
                        </td>
                    </tr>
                    {/* 5행: 품번, 상호기능팀(넓게) */}
                    <tr className="h-9">
                        <td className={headerCell}>품번<br /><span className="text-[8px] font-normal opacity-70">(Part No.)</span></td>
                        <td className={inputCell}>
                            <input type="text" value={pfdInfo.partNo} onChange={e => updateField('partNo', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="품번" />
                        </td>
                        <td className={headerCell}>상호기능팀<br /><span className="text-[8px] font-normal opacity-70">(CFT)</span></td>
                        <td colSpan={5} className={inputCell}>
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
