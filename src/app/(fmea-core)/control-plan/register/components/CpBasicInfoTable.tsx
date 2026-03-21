/**
 * @file CpBasicInfoTable.tsx
 * @description CP 등록 기본정보 5행 테이블 — PFMEA 등록화면 표준 적용
 * @version 2.0.0
 */

'use client';

import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { CPInfo, CPType, CPSelectType } from '../types';
import { LinkedDocItem } from '@/components/linkage/types';

// =====================================================
// Style constants — PFMEA 등록화면 표준
// =====================================================
const headerCell = "bg-[#00587a] text-white px-1 py-0.5 border border-white font-semibold text-[10px] text-center leading-tight";
const inputCell = "border border-gray-300 px-1 py-0.5 overflow-hidden";

// =====================================================
// Props
// =====================================================
export interface CpBasicInfoTableProps {
  cpInfo: CPInfo;
  cpId: string;
  isEditMode: boolean;
  selectedBaseCp: string | null;
  selectedParentFmea: string | null;
  fmeaLocked: boolean;
  linkedPfdList: LinkedDocItem[];
  cftNames: string;

  // Field updaters
  updateField: (field: keyof CPInfo, value: string) => void;
  setCpId: (id: string) => void;
  setCpInfo: React.Dispatch<React.SetStateAction<CPInfo>>;
  setSelectedBaseCp: (val: string | null) => void;

  // Modal openers
  openCpSelectModal: (type: CPSelectType) => void;
  openFmeaSelectModal: () => void;
  setBizInfoModalOpen: (open: boolean) => void;
  setUserModalTarget: (target: string) => void;
  setUserModalOpen: (open: boolean) => void;
  setStartDateModalOpen: (open: boolean) => void;
  setRevisionDateModalOpen: (open: boolean) => void;
  setLinkageModalOpen: (open: boolean) => void;

  // CP type change handler
  handleCpTypeChange: (newType: CPType) => void;

  // Router
  router: AppRouterInstance;
  // Triplet
  tripletInfo?: {
    id: string; typeCode: string; pfmeaId: string | null; pfdId: string | null;
    syncStatus: string; children: Array<{ id: string; subject: string }>;
  } | null;
}

// =====================================================
// Component
// =====================================================
export default function CpBasicInfoTable({
  cpInfo,
  cpId,
  isEditMode,
  selectedBaseCp,
  selectedParentFmea,
  fmeaLocked,
  linkedPfdList,
  cftNames,
  updateField,
  setCpId,
  setCpInfo,
  setSelectedBaseCp,
  openCpSelectModal,
  openFmeaSelectModal,
  setBizInfoModalOpen,
  setUserModalTarget,
  setUserModalOpen,
  setStartDateModalOpen,
  setRevisionDateModalOpen,
  setLinkageModalOpen,
  handleCpTypeChange,
  router,
  tripletInfo,
}: CpBasicInfoTableProps) {
  return (
    <div className="bg-white rounded border border-gray-300 mb-3">
      <div className="bg-[#e3f2fd] px-3 py-1.5 border-b border-gray-300">
        <h2 className="text-sm font-extrabold text-gray-800" title="Control Plan Basic Info">기획 및 준비 <span className="text-[10px] font-semibold text-gray-500">(Plan & Prep)</span> 1단계</h2>
      </div>
      <table className="w-full border-collapse text-xs table-fixed">
        <colgroup>
          <col className="w-[9%]" /><col className="w-[16%]" /><col className="w-[9%]" /><col className="w-[16%]" />
          <col className="w-[9%]" /><col className="w-[16%]" /><col className="w-[9%]" /><col className="w-[16%]" />
        </colgroup>
        <tbody>
          {/* 1행: CP유형, CP명, CP ID, 상위 FMEA */}
          <tr className="h-9">
            <td className={headerCell}>CP 유형<br /><span className="text-[8px] font-normal opacity-70">(Type)</span></td>
            <td className={inputCell}>
              <select
                value={cpInfo.cpType}
                onChange={e => handleCpTypeChange(e.target.value as CPType)}
                className="w-full h-7 px-1 text-xs border border-gray-300 bg-white rounded font-semibold cursor-pointer"
              >
                <option value="M">M - Master CP</option>
                <option value="F">F - Family CP</option>
                <option value="P">P - Part CP</option>
              </select>
            </td>
            <td className={headerCell}>CP명<br /><span className="text-[8px] font-normal opacity-70">(Name)</span></td>
            <td className={inputCell}>
              <input
                type="text"
                value={cpInfo.subject}
                onChange={e => updateField('subject', e.target.value)}
                className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none"
                placeholder="품명 또는 제품명"
              />
            </td>
            <td className={headerCell}>CP ID</td>
            <td className={inputCell}>
              <span
                className="px-2 text-xs font-semibold text-blue-600 cursor-pointer hover:underline hover:text-blue-700"
                onClick={() => router.push('/control-plan/list')}
                title="클릭하여 CP 리스트로 이동"
              >{cpId}</span>
            </td>
            <td className={`${headerCell} bg-yellow-600`}>상위 FMEA<br /><span className="text-[8px] font-normal opacity-70">(Parent)</span></td>
            <td className={inputCell}>
              <div className="flex items-center gap-1 px-1 cursor-pointer hover:bg-yellow-50 min-h-[28px] min-w-0 flex-wrap" onClick={() => !fmeaLocked && openFmeaSelectModal()} title={fmeaLocked ? 'FMEA에서 연동됨' : 'FMEA 선택'}>
                {selectedParentFmea ? (<>
                  {fmeaLocked && <span className="text-yellow-600" title="FMEA에서 연동됨 (변경 불가)">🔒</span>}
                  <span className="px-1 py-0.5 rounded text-[8px] font-bold text-white bg-yellow-500 shrink-0">FMEA</span>
                  <span className="text-[10px] font-semibold text-yellow-600 hover:underline break-all" onClick={e => { e.stopPropagation(); if (!selectedParentFmea) return; router.push(`/pfmea/register?id=${selectedParentFmea.toLowerCase()}`); }}>{selectedParentFmea}</span>
                </>) : <span className="text-[10px] text-gray-400">-</span>}
              </div>
            </td>
          </tr>

          {/* 2행: 공정책임, CP담당자, 시작일자, 연동 PFD */}
          <tr className="h-9">
            <td className={headerCell}>공정 책임<br /><span className="text-[8px] font-normal opacity-70">(Responsibility)</span></td>
            <td className={inputCell}>
              <div className="flex items-center gap-0.5 min-w-0">
                <input
                  type="text"
                  value={cpInfo.processResponsibility}
                  onChange={e => updateField('processResponsibility', e.target.value)}
                  className="flex-1 min-w-0 h-7 px-1 text-xs border-0 bg-transparent focus:outline-none truncate"
                  placeholder="부서(Department)"
                />
                <button
                  onClick={() => { setUserModalTarget('design'); setUserModalOpen(true); }}
                  className="text-blue-500 hover:text-blue-700 shrink-0 text-xs"
                >🔍</button>
              </div>
            </td>
            <td className={headerCell}>CP 담당자<br /><span className="text-[8px] font-normal opacity-70">(Owner)</span></td>
            <td className={inputCell}>
              <div className="flex items-center gap-0.5 min-w-0">
                <input
                  type="text"
                  value={cpInfo.cpResponsibleName}
                  onChange={e => updateField('cpResponsibleName', e.target.value)}
                  className="flex-1 min-w-0 h-7 px-1 text-xs border-0 bg-transparent focus:outline-none truncate"
                  placeholder="담당자 성명(Name)"
                />
                <button
                  onClick={() => { setUserModalTarget('responsible'); setUserModalOpen(true); }}
                  className="text-blue-500 hover:text-blue-700 shrink-0 text-xs"
                >🔍</button>
              </div>
            </td>
            <td className={headerCell}>시작 일자<br /><span className="text-[8px] font-normal opacity-70">(Start Date)</span></td>
            <td className={inputCell}>
              <input
                type="text"
                readOnly
                value={cpInfo.cpStartDate}
                onClick={() => setStartDateModalOpen(true)}
                className="w-full h-7 px-2 text-xs border border-gray-300 rounded bg-white cursor-pointer hover:bg-gray-50"
                placeholder="클릭하여 선택"
              />
            </td>
            <td className={`${headerCell} bg-indigo-700`}>연동 PFD<br /><span className="text-[8px] font-normal opacity-70">(Linked)</span></td>
            <td className={inputCell}>
              <div className="flex items-center gap-0.5 px-1 min-h-[28px]">
                {linkedPfdList.length > 0 ? (<>
                  <span
                    className="px-1 py-0.5 rounded text-[8px] font-bold text-white bg-indigo-500 cursor-pointer hover:bg-indigo-600 shrink-0"
                    onClick={() => { const pfdId = linkedPfdList[0]?.id; if (!pfdId) return; router.push(`/pfd/register?id=${pfdId.toLowerCase()}`); }}
                    title="PFD 등록화면으로 이동"
                  >PFD</span>
                  <span
                    className="text-[10px] font-semibold text-indigo-700 cursor-pointer hover:underline"
                    onClick={() => setLinkageModalOpen(true)}
                    title="연동 관리"
                  >{linkedPfdList[0].id}</span>
                </>) : <span className="text-[10px] text-gray-400">-</span>}
              </div>
            </td>
          </tr>

          {/* Triplet 상태 행 */}
          {tripletInfo && (
          <tr className="h-8 bg-gradient-to-r from-teal-50 to-blue-50">
            <td className="px-2 py-1 text-[10px] font-bold text-teal-700 border border-gray-200 bg-teal-100" colSpan={2}>
              Triplet [{tripletInfo.typeCode.toUpperCase()}] {tripletInfo.id}
            </td>
            <td className="px-2 py-1 text-[10px] border border-gray-200" colSpan={2}>
              <span className="font-medium text-gray-600">PFMEA: </span>
              {tripletInfo.pfmeaId ? (
                <span className="text-blue-700 font-semibold cursor-pointer hover:underline" onClick={() => { if (!tripletInfo.pfmeaId) return; router.push(`/pfmea/register?id=${tripletInfo.pfmeaId.toLowerCase()}`); }}>{tripletInfo.pfmeaId}</span>
              ) : <span className="text-gray-400 italic">-</span>}
            </td>
            <td className="px-2 py-1 text-[10px] border border-gray-200" colSpan={2}>
              <span className="font-medium text-gray-600">PFD: </span>
              {tripletInfo.pfdId ? (
                <span className="text-indigo-700 font-semibold cursor-pointer hover:underline" onClick={() => { if (!tripletInfo.pfdId) return; router.push(`/pfd/register?id=${tripletInfo.pfdId.toLowerCase()}`); }}>{tripletInfo.pfdId}</span>
              ) : <span className="text-gray-400 italic">Lazy</span>}
            </td>
            <td className="px-2 py-1 text-[10px] border border-gray-200" colSpan={2}>
              <span className={`px-1 py-0.5 rounded text-[8px] font-bold text-white ${
                tripletInfo.syncStatus === 'synced' ? 'bg-green-500' : tripletInfo.syncStatus === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
              }`}>{tripletInfo.syncStatus}</span>
            </td>
          </tr>
          )}
          {/* 3행: 고객명, 엔지니어링위치, 목표완료일, CP종류 */}
          <tr className="h-9">
            <td className={headerCell}>고객 명<br /><span className="text-[8px] font-normal opacity-70">(Customer)</span></td>
            <td className={inputCell}>
              <div className="flex items-center gap-0.5 min-w-0">
                <input
                  type="text"
                  value={cpInfo.customerName}
                  onChange={e => updateField('customerName', e.target.value)}
                  className="flex-1 min-w-0 h-7 px-1 text-xs border-0 bg-transparent focus:outline-none truncate"
                  placeholder="고객 명"
                />
                <button onClick={() => setBizInfoModalOpen(true)} className="text-blue-500 hover:text-blue-700 shrink-0 text-xs">🔍</button>
              </div>
            </td>
            <td className={headerCell}>엔지니어링 위치<br /><span className="text-[8px] font-normal opacity-70">(Location)</span></td>
            <td className={inputCell}>
              <input
                type="text"
                value={cpInfo.engineeringLocation}
                onChange={e => updateField('engineeringLocation', e.target.value)}
                className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none"
                placeholder="위치(Location)"
              />
            </td>
            <td className={headerCell}>목표완료일<br /><span className="text-[8px] font-normal opacity-70">(Target Date)</span></td>
            <td className={inputCell}>
              <input
                type="text"
                readOnly
                value={cpInfo.cpRevisionDate}
                onClick={() => setRevisionDateModalOpen(true)}
                className="w-full h-7 px-2 text-xs border border-gray-300 rounded bg-white cursor-pointer hover:bg-gray-50"
                placeholder="클릭하여 선택"
              />
            </td>
            <td className={headerCell}>CP 종류<br /><span className="text-[8px] font-normal opacity-70">(Category)</span></td>
            <td className={inputCell}>
              <select
                value={cpInfo.confidentialityLevel}
                onChange={e => updateField('confidentialityLevel', e.target.value)}
                className="w-full h-7 px-1 text-xs border-0 bg-transparent focus:outline-none"
              >
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
              <input
                type="text"
                value={cpInfo.companyName}
                onChange={e => updateField('companyName', e.target.value)}
                className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none"
                placeholder="회사 명"
              />
            </td>
            <td className={headerCell}>모델 연식<br /><span className="text-[8px] font-normal opacity-70">(Model Year)</span></td>
            <td className={inputCell}>
              <input
                type="text"
                value={cpInfo.modelYear}
                onChange={e => updateField('modelYear', e.target.value)}
                className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none"
                placeholder="어플리케이션"
              />
            </td>
            <td className={headerCell}>품명<br /><span className="text-[8px] font-normal opacity-70">(Part Name)</span></td>
            <td className={inputCell}>
              <input
                type="text"
                value={cpInfo.partName}
                onChange={e => updateField('partName', e.target.value)}
                className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none"
                placeholder="완제품명(Product)"
              />
            </td>
            <td className={headerCell}>기밀수준<br /><span className="text-[8px] font-normal opacity-70">(Security)</span></td>
            <td className={inputCell}>
              <select
                value={cpInfo.securityLevel}
                onChange={e => updateField('securityLevel', e.target.value)}
                className="w-full h-7 px-1 text-xs border-0 bg-transparent focus:outline-none"
              >
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
              <input
                type="text"
                value={cpInfo.partNo}
                onChange={e => updateField('partNo', e.target.value)}
                className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none"
                placeholder="품번"
              />
            </td>
            <td className={headerCell}>상호기능팀<br /><span className="text-[8px] font-normal opacity-70">(CFT)</span></td>
            <td colSpan={5} className={inputCell}>
              <span className="text-xs text-gray-700 px-2">{cftNames || '-'}</span>
            </td>
          </tr>

        </tbody>
      </table>
    </div>
  );
}
