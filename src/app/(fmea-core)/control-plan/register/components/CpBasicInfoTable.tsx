/**
 * @file CpBasicInfoTable.tsx
 * @description CP 등록 기본정보 6행 테이블 (page.tsx에서 추출)
 * @version 1.0.0
 */

'use client';

import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { CPInfo, CPType, CPSelectType } from '../types';
import { LinkedDocItem } from '@/components/linkage/types';

// =====================================================
// Style constants
// =====================================================
const headerCell = "bg-[#00587a] text-white px-2 py-1.5 border border-white font-semibold text-xs text-center whitespace-nowrap";
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
  selectedParentApqp: string | null;
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
  loadApqpList: () => Promise<void>;
  setApqpModalOpen: (open: boolean) => void;
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
  selectedParentApqp,
  fmeaLocked,
  linkedPfdList,
  cftNames,
  updateField,
  setCpId,
  setCpInfo,
  setSelectedBaseCp,
  openCpSelectModal,
  openFmeaSelectModal,
  loadApqpList,
  setApqpModalOpen,
  setBizInfoModalOpen,
  setUserModalTarget,
  setUserModalOpen,
  setStartDateModalOpen,
  setRevisionDateModalOpen,
  setLinkageModalOpen,
  handleCpTypeChange,
  router,
}: CpBasicInfoTableProps) {
  const linkedPfdNo = linkedPfdList[0]?.id || null;

  return (
    <div className="bg-white rounded border border-gray-300 mb-3">
      <div className="bg-blue-50 px-3 py-1.5 border-b border-gray-300">
        <h2 className="text-xs font-bold text-gray-700">Control Plan 기본정보(Basic Info)</h2>
      </div>
      <table className="w-full border-collapse text-xs table-fixed">
        <colgroup>
          <col className="w-[10%]" />
          <col className="w-[15%]" />
          <col className="w-[10%]" />
          <col className="w-[15%]" />
          <col className="w-[10%]" />
          <col className="w-[15%]" />
          <col className="w-[10%]" />
          <col className="w-[15%]" />
        </colgroup>
        <tbody>
          {/* 1행: CP유형, CP명, CP ID, 상위 APQP */}
          <tr className="h-8">
            <td className={headerCell} title="CP Type">CP 유형(Type)</td>
            <td className={inputCell}>
              <select
                value={cpInfo.cpType}
                onChange={e => handleCpTypeChange(e.target.value as CPType)}
                className="w-full h-7 px-2 text-xs border border-gray-300 bg-white rounded font-semibold cursor-pointer"
              >
                <option value="M">M - Master CP</option>
                <option value="F">F - Family CP</option>
                <option value="P">P - Part CP</option>
              </select>
            </td>
            <td className={headerCell} title="CP Name">CP명(Name)</td>
            <td className={inputCell}>
              <input
                type="text"
                value={cpInfo.subject}
                onChange={e => updateField('subject', e.target.value)}
                className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none"
                placeholder="품명 또는 제품명(Product Name)"
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
            <td className={headerCell} title="Parent APQP">상위 APQP(Parent)</td>
            <td className={inputCell}>
              <div className="flex items-center gap-1 px-2">
                {selectedParentApqp ? (
                  <>
                    <span className="text-xs font-semibold text-teal-600">{selectedParentApqp}</span>
                    <button
                      onClick={() => setApqpModalOpen(false)}
                      className="text-gray-400 hover:text-red-500 text-xs ml-1"
                      title="APQP 연동 해제"
                    >
                      &#x2715;
                    </button>
                  </>
                ) : (
                  <button
                    onClick={async () => { await loadApqpList(); setApqpModalOpen(true); }}
                    className="text-xs text-teal-600 hover:text-teal-800 font-semibold"
                  >
                    + APQP 선택
                  </button>
                )}
              </div>
            </td>
          </tr>

          {/* 2행: 공정책임, CP담당자, 시작일자, 상위 FMEA */}
          <tr className="h-8">
            <td className={headerCell} title="Process Responsibility">공정 책임(Resp.)</td>
            <td className={inputCell}>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={cpInfo.processResponsibility}
                  onChange={e => updateField('processResponsibility', e.target.value)}
                  className="flex-1 h-7 px-2 text-xs border-0 bg-transparent focus:outline-none"
                  placeholder="부서(Department)"
                />
                <button
                  onClick={() => { setUserModalTarget('design'); setUserModalOpen(true); }}
                  className="text-blue-500 hover:text-blue-700 px-1 shrink-0"
                >
                  🔍
                </button>
              </div>
            </td>
            <td className={headerCell} title="CP Owner">CP 담당자(Owner)</td>
            <td className={inputCell}>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={cpInfo.cpResponsibleName}
                  onChange={e => updateField('cpResponsibleName', e.target.value)}
                  className="flex-1 h-7 px-2 text-xs border-0 bg-transparent focus:outline-none"
                  placeholder="담당자 성명(Person Name)"
                />
                <button
                  onClick={() => { setUserModalTarget('responsible'); setUserModalOpen(true); }}
                  className="text-blue-500 hover:text-blue-700 px-1 shrink-0"
                >
                  🔍
                </button>
              </div>
            </td>
            <td className={headerCell} title="Start Date">시작 일자(Start)</td>
            <td className={inputCell}>
              <input
                type="text"
                readOnly
                value={cpInfo.cpStartDate}
                onClick={() => setStartDateModalOpen(true)}
                className="w-full h-7 px-2 text-xs border border-gray-300 rounded bg-white cursor-pointer hover:bg-gray-50"
                placeholder="클릭하여 선택(Click to Select)"
              />
            </td>
            <td className={`${headerCell} bg-yellow-600`} title="Parent FMEA">상위 FMEA(Parent)</td>
            <td className={inputCell}>
              <div className="flex items-center gap-2 px-2">
                {selectedParentFmea ? (
                  <>
                    {fmeaLocked && <span className="text-yellow-600" title="FMEA에서 연동됨 (변경 불가)">🔒</span>}
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white bg-yellow-500 cursor-pointer hover:bg-yellow-600"
                      onClick={() => router.push(`/pfmea/register?id=${selectedParentFmea.toLowerCase()}`)}
                      title="FMEA 등록화면으로 이동"
                    >FMEA</span>
                    <span
                      className={`text-xs font-semibold text-yellow-600 ${!fmeaLocked ? 'cursor-pointer hover:underline' : ''}`}
                      onClick={() => !fmeaLocked && openFmeaSelectModal()}
                      title={fmeaLocked ? 'FMEA에서 연동됨' : 'FMEA 선택'}
                    >{selectedParentFmea}</span>
                  </>
                ) : (
                  <span className="text-xs text-gray-400">-</span>
                )}
              </div>
            </td>
          </tr>

          {/* 3행: 고객명, 목표완료일, 회사명, 연동 PFD */}
          <tr className="h-8">
            <td className={headerCell} title="Customer Name">고객 명(Customer)</td>
            <td className={inputCell}>
              <div className="flex items-center gap-1 h-full">
                <input
                  type="text"
                  value={cpInfo.customerName}
                  onChange={e => updateField('customerName', e.target.value)}
                  className="flex-1 h-7 px-2 text-xs border-0 bg-transparent focus:outline-none"
                  placeholder="고객 명(Customer)"
                />
                <button onClick={() => setBizInfoModalOpen(true)} className="text-blue-500 hover:text-blue-700">🔍</button>
              </div>
            </td>
            <td className={headerCell} title="Target Date">목표완료일(Target)</td>
            <td className={inputCell}>
              <input
                type="text"
                readOnly
                value={cpInfo.cpRevisionDate}
                onClick={() => setRevisionDateModalOpen(true)}
                className="w-full h-7 px-2 text-xs border border-gray-300 rounded bg-white cursor-pointer hover:bg-gray-50"
                placeholder="클릭하여 선택(Click to Select)"
              />
            </td>
            <td className={headerCell} title="Company Name">회사 명(Company)</td>
            <td className={inputCell}>
              <input
                type="text"
                value={cpInfo.companyName}
                onChange={e => updateField('companyName', e.target.value)}
                className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none"
                placeholder="회사 명(Company)"
              />
            </td>
            <td className={`${headerCell} bg-violet-600`} title="Linked PFD">연동 PFD(Linked)</td>
            <td className={inputCell}>
              <div className="flex items-center gap-2 px-2">
                {linkedPfdList.length > 0 ? (
                  <>
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white bg-violet-500 cursor-pointer hover:bg-violet-600"
                      onClick={() => router.push(`/pfd/register?id=${linkedPfdList[0].id.toLowerCase()}`)}
                      title="PFD 등록화면으로 이동"
                    >PFD</span>
                    <span
                      className="text-xs font-semibold text-violet-600 cursor-pointer hover:underline"
                      onClick={() => setLinkageModalOpen(true)}
                      title="연동 관리"
                    >{linkedPfdList[0].id}</span>
                  </>
                ) : (
                  <span className="text-xs text-gray-400">-</span>
                )}
              </div>
            </td>
          </tr>

          {/* 4행: 모델연식, 엔지니어링위치, 품명, CP종류 */}
          <tr className="h-8">
            <td className={headerCell} title="Model Year">모델 연식(MY)</td>
            <td className={inputCell}>
              <input
                type="text"
                value={cpInfo.modelYear}
                onChange={e => updateField('modelYear', e.target.value)}
                className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none"
                placeholder="어플리케이션(Application)"
              />
            </td>
            <td className={headerCell} title="Engineering Location">엔지니어링 위치(Eng. Location)</td>
            <td className={inputCell}>
              <input
                type="text"
                value={cpInfo.engineeringLocation}
                onChange={e => updateField('engineeringLocation', e.target.value)}
                className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none"
                placeholder="위치(Location)"
              />
            </td>
            <td className={headerCell} title="Part Name">품명(Part Name)</td>
            <td className={inputCell}>
              <div className="flex items-center h-full">
                <input
                  type="text"
                  value={cpInfo.partName}
                  onChange={e => updateField('partName', e.target.value)}
                  className="flex-1 h-7 px-2 text-xs border-0 bg-transparent focus:outline-none"
                  placeholder="완제품명(Product)"
                />
              </div>
            </td>
            <td className={headerCell} title="CP Category">CP 종류(Category)</td>
            <td className={inputCell}>
              <select
                value={cpInfo.confidentialityLevel}
                onChange={e => updateField('confidentialityLevel', e.target.value)}
                className="w-full h-7 px-1 text-xs border-0 bg-transparent focus:outline-none"
              >
                <option value="">선택</option>
                <option value="Prototype">Prototype</option>
                <option value="Pre-Launch">Pre-Launch</option>
                <option value="Production">Production</option>
                <option value="Safe Launch">Safe Launch</option>
              </select>
            </td>
          </tr>

          {/* 5행: 품번, 기밀수준, 상호기능팀, 상위 DFMEA */}
          <tr className="h-8">
            <td className={headerCell} title="Part Number">품번(Part No)</td>
            <td className={inputCell}>
              <div className="flex items-center h-full">
                <input
                  type="text"
                  value={cpInfo.partNo}
                  onChange={e => updateField('partNo', e.target.value)}
                  className="flex-1 h-7 px-2 text-xs border-0 bg-transparent focus:outline-none"
                  placeholder="품번(Part No.)"
                />
              </div>
            </td>
            <td className={headerCell} title="Security Level">기밀수준(Security)</td>
            <td className={inputCell}>
              <select
                value={cpInfo.securityLevel}
                onChange={e => updateField('securityLevel', e.target.value)}
                className="w-full h-7 px-1 text-xs border-0 bg-transparent focus:outline-none"
              >
                <option value="">선택</option>
                <option value="Confidential">Confidential (기밀)</option>
                <option value="Internal">Internal (내부용)</option>
                <option value="Public">Public (공개)</option>
              </select>
            </td>
            <td className={headerCell} title="Cross Functional Team">상호기능팀(CFT)</td>
            <td className={inputCell}>
              <span className="text-xs text-gray-700 px-2">{cftNames || '-'}</span>
            </td>
            <td className={`${headerCell} bg-indigo-600`} title="Parent DFMEA">상위 DFMEA(Parent)</td>
            <td className={inputCell}>
              <div className="flex items-center gap-1 px-2">
                {cpInfo.linkedDfmeaNo ? (
                  <>
                    <span
                      className="px-1 py-0 rounded text-[9px] font-bold text-white bg-indigo-500 cursor-pointer hover:bg-indigo-600"
                      onClick={() => router.push(`/dfmea/register?id=${cpInfo.linkedDfmeaNo?.toLowerCase()}`)}
                      title="DFMEA 등록화면으로 이동"
                    >DFMEA</span>
                    <span
                      className="text-xs font-bold text-indigo-700 cursor-pointer hover:underline"
                      onClick={() => router.push(`/dfmea/register?id=${cpInfo.linkedDfmeaNo?.toLowerCase()}`)}
                    >{cpInfo.linkedDfmeaNo}</span>
                  </>
                ) : (
                  <span className="text-xs text-gray-400">-</span>
                )}
              </div>
            </td>
          </tr>

          {/* 6행: 워크시트 옵션 */}
          <tr className="h-8">
            <td className={headerCell} title="Worksheet Options">워크시트 옵션(WS Options)</td>
            <td className={inputCell} colSpan={7}>
              <label className="flex items-center gap-1.5 cursor-pointer px-2">
                <input
                  type="checkbox"
                  checked={cpInfo.partNameMode === 'B'}
                  onChange={e => updateField('partNameMode', e.target.checked ? 'B' : 'A')}
                  className="w-3.5 h-3.5 accent-indigo-600"
                />
                <span className="text-xs text-gray-700">부품명(Part Name) E열 컬럼 표시(Show Column)</span>
                <span className="text-[9px] text-gray-400 ml-1">(DFMEA 연동 시 활성화)</span>
              </label>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
