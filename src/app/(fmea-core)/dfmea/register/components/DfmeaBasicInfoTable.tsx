/**
 * @file components/DfmeaBasicInfoTable.tsx
 * @description DFMEA 등록 - 기본정보 테이블 컴포넌트 (기획 및 준비 1단계)
 * @version 1.0.0
 * @created 2026-01-27
 */

'use client';

import { useRouter } from 'next/navigation';

/** 회사명 목록 (드롭다운 + 직접입력) */
const COMPANY_LIST = ['AMP', 'T&F', 'LBS', '금호타이어', '넥센타이어', '한국타이어', '일진글로벌'];

// 타입
type FMEAType = 'M' | 'F' | 'P' | 'D';

interface FMEAInfo {
    companyName: string;
    engineeringLocation: string;
    customerName: string;
    modelYear: string;
    subject: string;
    fmeaStartDate: string;
    fmeaRevisionDate: string;
    fmeaProjectName: string;
    fmeaId: string;
    fmeaType: FMEAType;
    designResponsibility: string;
    confidentialityLevel: string;
    fmeaResponsibleName: string;
    partName: string;      // ★ 부품명 (partName)
    partNo: string;        // ★ 품번
    linkedCpNo: string;
    linkedPfdNo: string;
}

interface DfmeaBasicInfoTableProps {
    fmeaInfo: FMEAInfo;
    fmeaId: string;
    isEditMode: boolean;
    duplicateWarning: string | null;
    selectedBaseFmea: string | null;
    selectedParentApqp: string | null;
    cftNames: string;
    // 업데이트 핸들러
    updateField: (field: keyof FMEAInfo, value: string) => void;
    setFmeaId: (id: string) => void;
    setSelectedBaseFmea: (id: string | null) => void;
    setSelectedParentApqp: (id: string | null) => void;
    handleFmeaNameChange: (value: string) => void;
    // 모달 핸들러
    openFmeaSelectModal: (type: 'M' | 'F' | 'P' | 'D' | 'ALL' | 'LOAD') => void;
    loadApqpList: () => void;
    setApqpModalOpen: (v: boolean) => void;
    loadFmeaNameList: () => void;
    setFmeaNameModalOpen: (v: boolean) => void;
    setBizInfoModalOpen: (v: boolean) => void;
    setUserModalTarget: (v: 'responsible' | 'cft') => void;
    setUserModalOpen: (v: boolean) => void;
    setStartDateModalOpen: (v: boolean) => void;
    setRevisionDateModalOpen: (v: boolean) => void;
    // ID 생성 (DB 기반 비동기)
    generateFMEAId: (type: FMEAType) => Promise<string>;
    // 라우터
    router: ReturnType<typeof useRouter>;
    // ★ 연동 모달 열기
    onOpenLinkageModal: () => void;
    // ★ 연동 ID
    linkedPfdId: string | null;
    linkedCpId: string | null;
    linkedDfmeaId: string | null;  // ★ 연동 DFMEA 추가
    // ★ Family CP 개수
    familyCpCount?: number;
    onFamilyCpCountChange?: (count: number) => void;
}

// 스타일
const headerCell = "bg-[#1e3a5f] text-white px-2 py-1.5 border border-white font-semibold text-xs text-center whitespace-nowrap";
const inputCell = "border border-gray-300 px-1 py-0.5";

/**
 * DFMEA 기본정보 테이블 컴포넌트
 */
export default function DfmeaBasicInfoTable({
    fmeaInfo,
    fmeaId,
    isEditMode,
    duplicateWarning,
    selectedBaseFmea,
    selectedParentApqp,
    cftNames,
    updateField,
    setFmeaId,
    setSelectedBaseFmea,
    setSelectedParentApqp,
    handleFmeaNameChange,
    openFmeaSelectModal,
    loadApqpList,
    setApqpModalOpen,
    loadFmeaNameList,
    setFmeaNameModalOpen,
    setBizInfoModalOpen,
    setUserModalTarget,
    setUserModalOpen,
    setStartDateModalOpen,
    setRevisionDateModalOpen,
    generateFMEAId,
    router,
    onOpenLinkageModal,
    linkedPfdId,
    linkedCpId,
    linkedDfmeaId,
    familyCpCount,
    onFamilyCpCountChange,
}: DfmeaBasicInfoTableProps) {
    // ★★★ FMEA ID 기반으로 상위 APQP ID 자동 계산 ★★★
    const derivedParentApqp = selectedParentApqp || (fmeaId ? `pj${fmeaId.replace(/^dfm/i, '')}` : null);

    return (
        <div className="bg-white rounded border border-gray-300 mb-3">
            <div className="bg-[#e3f2fd] px-3 py-1.5 border-b border-gray-300">
                <h2 className="text-xs font-bold text-gray-700">기획 및 준비(Planning & Preparation, 1단계)</h2>
            </div>
            <table className="w-full border-collapse text-xs table-fixed">
                {/* ★ APQP와 동일한 열 너비 표준화: 헤더 8-10%, 입력 14-15% */}
                <colgroup>
                    <col style={{ width: '8%' }} />  {/* 헤더1 */}
                    <col style={{ width: '14%' }} /> {/* 입력1 */}
                    <col style={{ width: '8%' }} />  {/* 헤더2 */}
                    <col style={{ width: '14%' }} /> {/* 입력2 */}
                    <col style={{ width: '7%' }} />  {/* 헤더3 */}
                    <col style={{ width: '14%' }} /> {/* 입력3 */}
                    <col style={{ width: '7%' }} />  {/* 헤더4 (연동) */}
                    <col style={{ width: '14%' }} /> {/* 입력4 (연동) */}
                </colgroup>
                <tbody>
                    {/* 1행 */}
                    <tr className="h-8">
                        <td className={headerCell} title="FMEA Type">FMEA 유형(Type)</td>
                        <td className={inputCell}>
                            <div className="flex items-center gap-1">
                                <select value={fmeaInfo.fmeaType} onChange={async (e) => {
                                    const newType = e.target.value as FMEAType;
                                    updateField('fmeaType', newType);
                                    const currentIdType = fmeaId?.match(/pfm\d{2}-([mfp])/i)?.[1]?.toUpperCase() || '';
                                    let currentId = fmeaId;
                                    if (currentIdType !== newType) {
                                        currentId = await generateFMEAId(newType);
                                        setFmeaId(currentId);
                                        router.replace(`/dfmea/register?id=${currentId}`);
                                    }
                                    if (newType === 'M' && currentId) {
                                        setSelectedBaseFmea(currentId);
                                    } else if (newType !== 'M') {
                                        setSelectedBaseFmea(null);
                                    }
                                }} className={`${fmeaInfo.fmeaType === 'F' ? 'w-[60%]' : 'w-full'} h-7 px-2 text-xs border border-gray-300 bg-white rounded font-semibold cursor-pointer`}>
                                    <option value="D">D - Design FMEA</option>
                                    <option value="M">M - Master FMEA</option>
                                    <option value="F">F - Family FMEA</option>
                                    <option value="P">P - Part FMEA</option>
                                </select>
                                {fmeaInfo.fmeaType === 'F' && onFamilyCpCountChange && (
                                    <div className="flex items-center gap-0.5 flex-shrink-0">
                                        <span className="text-[9px] text-gray-500 whitespace-nowrap">CP</span>
                                        <input
                                            type="number"
                                            min={1}
                                            max={10}
                                            value={familyCpCount ?? 3}
                                            onChange={e => onFamilyCpCountChange(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                                            className="w-8 h-6 px-1 text-[10px] text-center border border-gray-300 rounded bg-white"
                                        />
                                        <span className="text-[9px] text-gray-500">건</span>
                                    </div>
                                )}
                            </div>
                        </td>
                        <td className={headerCell} title="FMEA Subject">FMEA명(Subject)</td>
                        <td className={`${inputCell} relative`}>
                            <div className="flex items-center gap-1">
                                <input
                                    type="text"
                                    value={fmeaInfo.subject}
                                    onChange={e => handleFmeaNameChange(e.target.value)}
                                    onFocus={() => loadFmeaNameList()}
                                    className={`flex-1 h-7 px-2 text-xs border-0 bg-transparent focus:outline-none ${duplicateWarning ? 'text-red-600' : ''}`}
                                    placeholder="시스템, 서브시스템 및/또는 구성품"
                                />
                                <button onClick={() => { loadFmeaNameList(); setFmeaNameModalOpen(true); }} className="text-blue-500 hover:text-blue-700 px-1" title="기존 FMEA 목록 보기">🔍</button>
                            </div>
                            {duplicateWarning && <div className="absolute -bottom-4 left-0 text-[10px] text-red-600 font-semibold">{duplicateWarning}</div>}
                        </td>
                        <td className={headerCell} title="FMEA Identifier">FMEA ID</td>
                        <td className={inputCell}>
                            <span className="px-2 text-xs font-semibold text-blue-600 cursor-pointer hover:underline hover:text-blue-700" onClick={() => router.push('/dfmea/list')} title="클릭하여 DFMEA 리스트로 이동">{fmeaId}</span>
                        </td>
                        <td className={`${headerCell} bg-green-600`} title="Parent APQP Project">상위 APQP(Parent)</td>
                        <td className={inputCell}>
                            <div className="flex items-center gap-2 px-2">
                                {derivedParentApqp ? (
                                    <>
                                        <span
                                            className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white bg-green-500 cursor-pointer hover:bg-green-600"
                                            onClick={() => router.push(`/apqp/register?id=${derivedParentApqp.toLowerCase()}`)}
                                            title="APQP 등록화면으로 이동"
                                        >APQP</span>
                                        <span
                                            className="text-xs font-semibold text-green-600 cursor-pointer hover:underline"
                                            onClick={() => { loadApqpList(); setApqpModalOpen(true); }}
                                            title="APQP 선택"
                                        >{derivedParentApqp}</span>
                                    </>
                                ) : (
                                    <span className="text-xs text-gray-400">-</span>
                                )}
                            </div>
                        </td>
                    </tr>

                    {/* 2행 */}
                    <tr className="h-8">
                        <td className={headerCell} title="Design Responsibility">공정 책임(Design Resp.)</td>
                        <td className={inputCell}><input type="text" value={fmeaInfo.designResponsibility} onChange={e => updateField('designResponsibility', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="부서(Department)" /></td>
                        <td className={headerCell} title="FMEA Responsible">FMEA 담당자(Responsible)</td>
                        <td className={inputCell}>
                            <div className="flex items-center gap-1">
                                <input type="text" value={fmeaInfo.fmeaResponsibleName} onChange={e => updateField('fmeaResponsibleName', e.target.value)} className="flex-1 h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="담당자 성명(Name)" />
                                <button onClick={() => { setUserModalTarget('responsible'); setUserModalOpen(true); }} className="text-blue-500 hover:text-blue-700 px-1">🔍</button>
                            </div>
                        </td>
                        <td className={headerCell} title="FMEA Start Date">시작 일자(Start Date)</td>
                        <td className={inputCell}>
                            <div className="flex items-center gap-1">
                                <input type="text" readOnly value={fmeaInfo.fmeaStartDate} onClick={() => setStartDateModalOpen(true)} className="flex-1 h-7 px-2 text-xs border border-gray-300 rounded bg-white cursor-pointer hover:bg-gray-50" placeholder="클릭하여 선택(Click to Select)" />
                                <button onClick={() => setStartDateModalOpen(true)} className="text-blue-500 hover:text-blue-700 px-1">📅</button>
                            </div>
                        </td>
                        <td className={`${headerCell} bg-yellow-600`} title="Base/Parent FMEA">상위 FMEA(Parent)</td>
                        <td className={inputCell}>
                            <div className="flex items-center gap-2 px-2">
                                {selectedBaseFmea ? (
                                    <>
                                        <span
                                            className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white bg-yellow-500 cursor-pointer hover:bg-yellow-600"
                                            onClick={() => router.push(`/dfmea/register?id=${selectedBaseFmea.toLowerCase()}`)}
                                            title="FMEA 등록화면으로 이동"
                                        >FMEA</span>
                                        <span
                                            className="text-xs font-semibold text-yellow-600 cursor-pointer hover:underline"
                                            onClick={() => openFmeaSelectModal('ALL')}
                                            title="FMEA 선택"
                                        >{selectedBaseFmea}</span>
                                    </>
                                ) : (
                                    <span className="text-xs text-gray-400">-</span>
                                )}
                            </div>
                        </td>
                    </tr>

                    {/* 3행: 고객명, 엔지니어링 위치, 목표완료일, 연동 CP */}
                    <tr className="h-8">
                        <td className={headerCell} title="Customer Name">고객 명(Customer)</td>
                        <td className={inputCell}>
                            <div className="flex items-center gap-1">
                                <input type="text" value={fmeaInfo.customerName} onChange={e => updateField('customerName', e.target.value)} className="flex-1 h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="고객 명(Customer)" />
                                <button onClick={() => setBizInfoModalOpen(true)} className="text-blue-500 hover:text-blue-700">🔍</button>
                            </div>
                        </td>
                        <td className={headerCell} title="Engineering Location">엔지니어링 위치(Eng. Location)</td>
                        <td className={inputCell}><input type="text" value={fmeaInfo.engineeringLocation} onChange={e => updateField('engineeringLocation', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="엔지니어링 위치(Eng. Location)" /></td>
                        <td className={headerCell} title="Revision Date / Target">목표완료일(Target Date)</td>
                        <td className={inputCell}>
                            <div className="flex items-center gap-1">
                                <input type="text" readOnly value={fmeaInfo.fmeaRevisionDate} onClick={() => setRevisionDateModalOpen(true)} className="flex-1 h-7 px-2 text-xs border border-gray-300 rounded bg-white cursor-pointer hover:bg-gray-50" placeholder="클릭하여 선택(Click to Select)" />
                                <button onClick={() => setRevisionDateModalOpen(true)} className="text-blue-500 hover:text-blue-700 px-1">📅</button>
                            </div>
                        </td>
                        {/* 연동 CP */}
                        <td className={`${headerCell} bg-teal-600`} title="Linked Control Plan">연동 CP(Linked CP)</td>
                        <td className={inputCell}>
                            <div className="flex items-center gap-2 px-2">
                                {linkedCpId ? (
                                    <>
                                        <span
                                            className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white bg-teal-500 cursor-pointer hover:bg-teal-600"
                                            onClick={() => router.push(`/control-plan/register?id=${linkedCpId.toLowerCase()}`)}
                                            title="CP 등록화면으로 이동"
                                        >CP</span>
                                        <span
                                            className="text-xs font-semibold text-teal-600 cursor-pointer hover:underline"
                                            onClick={onOpenLinkageModal}
                                            title="연동 관리"
                                        >{linkedCpId}</span>
                                    </>
                                ) : (
                                    <span className="text-xs text-gray-400">-</span>
                                )}
                            </div>
                        </td>
                    </tr>

                    {/* 4행: 회사명, 모델연식, 품명, 연동 PFD */}
                    <tr className="h-8">
                        <td className={headerCell} title="Company Name">회사명(Company)</td>
                        <td className={inputCell}>
                            <input type="text" list="company-list-alt"
                                value={fmeaInfo.companyName} onChange={e => updateField('companyName', e.target.value)}
                                autoComplete="off"
                                className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="회사명 선택 또는 입력(Select or Enter)" />
                            <datalist id="company-list-alt">
                                {COMPANY_LIST.map(c => <option key={c} value={c} />)}
                            </datalist>
                        </td>
                        <td className={headerCell} title="Model Year">모델 연식(Model Year)</td>
                        <td className={inputCell}><input type="text" value={fmeaInfo.modelYear} onChange={e => updateField('modelYear', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="모델 연식(Model Year)" /></td>
                        <td className={headerCell} title="Part Name">부품명(Part Name)</td>
                        <td className={inputCell}><input type="text" value={fmeaInfo.partName} onChange={e => updateField('partName', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="부품명(Part Name)" /></td>
                        {/* 연동 PFD */}
                        <td className={`${headerCell} bg-violet-600`} title="Linked PFD">연동 PFD(Linked PFD)</td>
                        <td className={inputCell}>
                            <div className="flex items-center gap-2 px-2">
                                {linkedPfdId ? (
                                    <>
                                        <span
                                            className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white bg-violet-500 cursor-pointer hover:bg-violet-600"
                                            onClick={() => router.push(`/pfd/register?id=${linkedPfdId.toLowerCase()}`)}
                                            title="PFD 등록화면으로 이동"
                                        >PFD</span>
                                        <span
                                            className="text-xs font-semibold text-violet-600 cursor-pointer hover:underline"
                                            onClick={onOpenLinkageModal}
                                            title="연동 관리"
                                        >{linkedPfdId}</span>
                                    </>
                                ) : (
                                    <span className="text-xs text-gray-400">-</span>
                                )}
                            </div>
                        </td>
                    </tr>

                    {/* 5행: 품번, 기밀수준, 상호기능팀, 연동 DFMEA */}
                    <tr className="h-8">
                        <td className={headerCell} title="Part Number">품번(Part No.)</td>
                        <td className={inputCell}><input type="text" value={fmeaInfo.partNo} onChange={e => updateField('partNo', e.target.value)} className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="품번(Part No.)" /></td>
                        <td className={headerCell} title="Confidentiality Level">기밀 수준(Confidentiality)</td>
                        <td className={inputCell}>
                            <select value={fmeaInfo.confidentialityLevel} onChange={e => updateField('confidentialityLevel', e.target.value)} className="w-full h-7 px-2 text-xs border border-gray-300 bg-white rounded font-semibold cursor-pointer">
                                <option value="">선택(Select)</option>
                                <option value="사내">사내(Internal)</option>
                                <option value="RESTRICTED">RESTRICTED</option>
                                <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                            </select>
                        </td>
                        <td className={headerCell} title="Cross-Functional Team">상호기능팀(CFT)</td>
                        <td className={inputCell}><span className="text-xs text-gray-700 px-2">{cftNames || '-'}</span></td>
                        {/* 연동 DFMEA */}
                        <td className={`${headerCell} bg-orange-600`} title="Linked DFMEA">연동 DFMEA(Linked)</td>
                        <td className={inputCell}>
                            <div className="flex items-center gap-2 px-2">
                                {linkedDfmeaId ? (
                                    <>
                                        <span
                                            className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white bg-orange-500 cursor-pointer hover:bg-orange-600"
                                            onClick={() => router.push(`/dfmea/register?id=${linkedDfmeaId.toLowerCase()}`)}
                                            title="DFMEA 등록화면으로 이동"
                                        >DFMEA</span>
                                        <span
                                            className="text-xs font-semibold text-orange-600 cursor-pointer hover:underline"
                                            onClick={onOpenLinkageModal}
                                            title="연동 관리"
                                        >{linkedDfmeaId}</span>
                                    </>
                                ) : (
                                    <span className="text-xs text-gray-400">-</span>
                                )}
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
