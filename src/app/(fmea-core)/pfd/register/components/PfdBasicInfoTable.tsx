'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, T } from '@/lib/locale';
import { PFDInfo, PFDType } from '../../types/pfdRegister';
import { generateLinkedPfdNo, generateLinkedCpNo, generatePFDId } from '../../utils/pfdIdUtils';

interface PfdBasicInfoTableProps {
    pfdInfo: PFDInfo;
    pfdId: string;
    isEditMode: boolean;
    linkedCpList: { id: string;[key: string]: any }[];
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
    const { t } = useLocale();
    const headerCell = "bg-[#00587a] text-white px-2 py-1.5 border border-white font-semibold text-xs text-center whitespace-nowrap";
    const inputCell = "border border-gray-300 px-1 py-0.5 overflow-hidden";

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
            <div className="bg-[#e0e7ff] px-3 py-1.5 border-b border-gray-300">
                <h2 className="text-xs font-bold text-gray-700" title="PFD Basic Information"><T>PFD 기본정보(Basic Info)</T></h2>
            </div>
            <table className="w-full border-collapse text-xs">
                <colgroup>
                    <col className="w-[10%]" /><col className="w-[15%]" />
                    <col className="w-[10%]" /><col className="w-[15%]" />
                    <col className="w-[10%]" /><col className="w-[15%]" />
                    <col className="w-[10%]" /><col className="w-[15%]" />
                </colgroup>
                <tbody>
                    {/* 1행: PFD유형, PFD명, PFD ID */}
                    <tr className="h-8">
                        <td className={headerCell} title="PFD Type"><T>PFD 유형(Type)</T></td>
                        <td className={inputCell}>
                            <select
                                value={pfdInfo.pfdType}
                                onChange={e => handleTypeChange(e.target.value as PFDType)}
                                className="w-full h-7 px-2 text-xs border border-gray-300 bg-white rounded font-semibold cursor-pointer"
                            >
                                <option value="M">M - Master PFD</option>
                                <option value="F">F - Family PFD</option>
                                <option value="P">P - Part PFD</option>
                            </select>
                        </td>
                        <td className={headerCell} title="PFD Name"><T>PFD명(Name)</T></td>
                        <td className={inputCell}>
                            <input type="text" value={pfdInfo.subject} onChange={e => updateField('subject', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder={t('공정흐름도 제목(PFD Title)')} />
                        </td>
                        <td className={headerCell}><T>PFD ID</T></td>
                        <td colSpan={3} className={inputCell}>
                            <div className="flex items-center gap-1 px-2">
                                {pfdId ? (
                                    <>
                                        <span className="px-1 py-0 rounded text-[9px] font-bold text-white bg-violet-500"><T>연동</T></span>
                                        <span className="text-xs font-bold text-violet-700 cursor-pointer hover:underline" onClick={() => router.push('/pfd/list')} title={t('클릭하면 PFD 리스트로 이동')}>{generateLinkedPfdNo(pfdId)}</span>
                                    </>
                                ) : <span className="text-xs text-gray-400">-</span>}
                            </div>
                        </td>
                    </tr>
                    {/* 2행: 공정책임, PFD담당자, 시작일자, 상위FMEA */}
                    <tr className="h-8">
                        <td className={headerCell} title="Process Responsibility"><T>공정 책임(Process Owner)</T></td>
                        <td className={inputCell}>
                            <div className="flex items-center gap-1">
                                <input type="text" value={pfdInfo.processResponsibility} onChange={e => updateField('processResponsibility', e.target.value)} className="flex-1 h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder={t('부서(Department)')} />
                                <button onClick={() => { setUserModalTarget('design'); setUserModalOpen(true); }} className="text-violet-500 hover:text-violet-700 px-1 shrink-0">🔍</button>
                            </div>
                        </td>
                        <td className={headerCell} title="PFD Responsible Person"><T>PFD 담당자(Responsible)</T></td>
                        <td className={inputCell}>
                            <div className="flex items-center gap-1">
                                <input type="text" value={pfdInfo.pfdResponsibleName} onChange={e => updateField('pfdResponsibleName', e.target.value)} className="flex-1 h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder={t('담당자 성명(Person Name)')} />
                                <button onClick={() => { setUserModalTarget('responsible'); setUserModalOpen(true); }} className="text-violet-500 hover:text-violet-700 px-1 shrink-0">🔍</button>
                            </div>
                        </td>
                        <td className={headerCell} title="Start Date"><T>시작 일자(Start Date)</T></td>
                        <td className={inputCell}>
                            <input type="text" readOnly value={pfdInfo.pfdStartDate} onClick={() => setStartDateModalOpen(true)} className="w-full h-7 px-2 text-xs border border-gray-300 rounded bg-white cursor-pointer hover:bg-gray-50" placeholder={t('클릭하여 선택(Click to select)')} />
                        </td>
                        <td className={`${headerCell} bg-yellow-600`} title="Parent FMEA"><T>상위 FMEA(Parent)</T></td>
                        <td className={inputCell}>
                            <div className="flex items-center gap-2 px-2">
                                {selectedParentFmea ? (
                                    <>
                                        {fmeaLocked && <span className="text-yellow-600" title={t('FMEA에서 연동됨 (변경 불가)')}>🔒</span>}
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white bg-yellow-500 cursor-pointer hover:bg-yellow-600" onClick={() => router.push(`/pfmea/register?id=${selectedParentFmea.toLowerCase()}`)} title={t('FMEA 등록화면으로 이동')}>FMEA</span>
                                        <span className={`text-xs font-semibold text-yellow-600 ${!fmeaLocked ? 'cursor-pointer hover:underline' : ''}`} onClick={() => !fmeaLocked && openFmeaSelectModal()} title={fmeaLocked ? t('FMEA에서 연동됨') : t('FMEA 선택')}>{selectedParentFmea}</span>
                                    </>
                                ) : <span className="text-xs text-gray-400">-</span>}
                            </div>
                        </td>
                    </tr>
                    {/* 3행: 고객명, 목표완료일, 회사명, 연동CP */}
                    <tr className="h-8">
                        <td className={headerCell} title="Customer Name"><T>고객 명(Customer)</T></td>
                        <td className={inputCell}>
                            <div className="flex items-center gap-1">
                                <input type="text" value={pfdInfo.customerName} onChange={e => updateField('customerName', e.target.value)} className="flex-1 h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder={t('고객 명(Customer)')} />
                                <button onClick={() => setBizInfoModalOpen(true)} className="text-violet-500 hover:text-violet-700">🔍</button>
                            </div>
                        </td>
                        <td className={headerCell} title="Target Completion Date"><T>목표완료일(Target Date)</T></td>
                        <td className={inputCell}>
                            <input type="text" readOnly value={pfdInfo.pfdRevisionDate} onClick={() => setRevisionDateModalOpen(true)} className="w-full h-7 px-2 text-xs border border-gray-300 rounded bg-white cursor-pointer hover:bg-gray-50" placeholder={t('클릭하여 선택(Click to select)')} />
                        </td>
                        <td className={headerCell} title="Company Name"><T>회사 명(Company)</T></td>
                        <td className={inputCell}>
                            <input type="text" value={pfdInfo.companyName} onChange={e => updateField('companyName', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder={t('회사 명(Company)')} />
                        </td>
                        <td className={`${headerCell} bg-teal-600`} title="Linked CP"><T>연동 CP(Linked)</T></td>
                        <td className={inputCell}>
                            <div className="flex items-center gap-1 px-2">
                                {pfdId ? (
                                    <>
                                        <span className="px-1 py-0 rounded text-[9px] font-bold text-white bg-teal-500 cursor-pointer hover:bg-teal-600" onClick={() => router.push(`/control-plan/register?id=${generateLinkedCpNo(pfdId)?.toLowerCase()}`)} title={t('CP 등록화면으로 이동')}>CP</span>
                                        <span className="text-xs font-bold text-teal-700 cursor-pointer hover:underline" onClick={() => router.push(`/control-plan/register?id=${generateLinkedCpNo(pfdId)?.toLowerCase()}`)} title={t('CP 등록화면으로 이동')}>{generateLinkedCpNo(pfdId)}</span>
                                    </>
                                ) : <span className="text-xs text-gray-400">-</span>}
                            </div>
                        </td>
                    </tr>
                    {/* 4행: 모델연식, 엔지니어링위치, 품명, PFD종류 */}
                    <tr className="h-8">
                        <td className={headerCell} title="Model Year"><T>모델 연식(Model Year)</T></td>
                        <td className={inputCell}>
                            <input type="text" value={pfdInfo.modelYear} onChange={e => updateField('modelYear', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder={t('어플리케이션(Application)')} />
                        </td>
                        <td className={headerCell} title="Engineering Location"><T>엔지니어링 위치(Eng. Location)</T></td>
                        <td className={inputCell}>
                            <input type="text" value={pfdInfo.engineeringLocation} onChange={e => updateField('engineeringLocation', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder={t('위치(Location)')} />
                        </td>
                        <td className={headerCell} title="Product Name"><T>품명(Product Name)</T></td>
                        <td className={inputCell}>
                            <input type="text" value={pfdInfo.partName} onChange={e => updateField('partName', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder={t('완제품명(Product)')} />
                        </td>
                        <td className={headerCell} title="PFD Category"><T>PFD 종류(Category)</T></td>
                        <td className={inputCell}>
                            <select value={pfdInfo.confidentialityLevel} onChange={e => updateField('confidentialityLevel', e.target.value)} className="w-full h-7 px-1 text-xs border-0 bg-transparent focus:outline-none">
                                <option value="">{t('선택(Select)')}</option>
                                <option value="Prototype">Prototype</option>
                                <option value="Pre-Launch">Pre-Launch</option>
                                <option value="Production">Production</option>
                                <option value="Safe Launch">Safe Launch</option>
                            </select>
                        </td>
                    </tr>
                    {/* 5행: 품번, 기밀수준, 상호기능팀 */}
                    <tr className="h-8">
                        <td className={headerCell} title="Part Number"><T>품번(Part No)</T></td>
                        <td className={inputCell}>
                            <input type="text" value={pfdInfo.partNo} onChange={e => updateField('partNo', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder={t('품번(Part No.)')} />
                        </td>
                        <td className={headerCell} title="Security Level"><T>기밀수준(Security Level)</T></td>
                        <td className={inputCell}>
                            <select value={pfdInfo.securityLevel} onChange={e => updateField('securityLevel', e.target.value)} className="w-full h-7 px-1 text-xs border-0 bg-transparent focus:outline-none">
                                <option value="">{t('선택(Select)')}</option>
                                <option value="Confidential">Confidential ({t('기밀')})</option>
                                <option value="Internal">Internal ({t('내부용')})</option>
                                <option value="Public">Public ({t('공개')})</option>
                            </select>
                        </td>
                        <td className={headerCell} title="Cross Functional Team"><T>상호기능팀(CFT)</T></td>
                        <td colSpan={3} className={inputCell}>
                            <span className="px-2 text-xs text-gray-700">
                                {cftMembers.filter(m => m.name?.trim()).length > 0
                                    ? cftMembers.filter(m => m.name?.trim()).map(m => m.name).join(', ')
                                    : <span className="text-gray-400"><T>CFT 등록 필요(CFT Required)</T></span>
                                }
                            </span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
