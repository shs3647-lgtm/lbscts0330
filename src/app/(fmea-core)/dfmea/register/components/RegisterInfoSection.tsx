/**
 * @file components/RegisterInfoSection.tsx
 * @description DFMEA 등록 - 기획 및 준비 (1단계) 폼 섹션
 * @module pfmea/register
 */

'use client';

import { useRouter } from 'next/navigation';
import { FMEAInfo, FMEAType, FMEASelectType } from '../types';

// 셀 스타일
const headerCell = "border border-gray-300 px-2 py-1 text-center text-xs font-semibold bg-[#e3f2fd] text-gray-700";
const inputCell = "border border-gray-300 px-0 py-0 text-left";

interface RegisterInfoSectionProps {
  fmeaInfo: FMEAInfo;
  fmeaId: string;
  isEditMode: boolean;
  showMissingFields: boolean;
  selectedBaseFmea: string | null;
  selectedParentApqp: string | null;
  // ★ 연동 PFD/CP
  linkedPfd: string | null;
  linkedCp: string | null;
  onFieldChange: (field: keyof FMEAInfo, value: string) => void;
  onFmeaTypeChange: (type: FMEAType) => void;
  onOpenBizInfoModal: () => void;
  onOpenUserModal: (target: 'responsible' | 'cft') => void;
  onOpenStartDateModal: () => void;
  onOpenRevisionDateModal: () => void;
  onOpenFmeaSelectModal: (type: FMEASelectType) => void;
  onOpenApqpModal: () => void;
  onClearParentApqp: () => void;
  onExcelImport: () => void;
  onGoToWorksheet: () => void;
  excelFileInputRef: React.RefObject<HTMLInputElement | null>;
  onExcelFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * 기획 및 준비 (1단계) 폼 섹션 컴포넌트
 */
export function RegisterInfoSection({
  fmeaInfo,
  fmeaId,
  isEditMode,
  showMissingFields,
  selectedBaseFmea,
  selectedParentApqp,
  linkedPfd,
  linkedCp,
  onFieldChange,
  onFmeaTypeChange,
  onOpenBizInfoModal,
  onOpenUserModal,
  onOpenStartDateModal,
  onOpenRevisionDateModal,
  onOpenFmeaSelectModal,
  onOpenApqpModal,
  onClearParentApqp,
  onExcelImport,
  onGoToWorksheet,
  excelFileInputRef,
  onExcelFileChange,
}: RegisterInfoSectionProps) {
  const router = useRouter();

  const updateField = (field: keyof FMEAInfo, value: string) => {
    onFieldChange(field, value);
  };

  return (
    <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
      <div className="bg-white rounded border border-gray-300 mb-3">
        <div className="bg-[#e3f2fd] px-3 py-1.5 border-b border-gray-300">
          <h2 className="text-xs font-bold text-gray-700">기획 및 준비(Planning & Preparation, 1단계)</h2>
        </div>

        <table className="w-full border-collapse text-xs">
          <tbody>
            {/* 1행 */}
            <tr className="bg-[#e3f2fd] h-8">
              <td className={`${headerCell} w-[11%] whitespace-nowrap`}>회사 명(Company)</td>
              <td className={`${inputCell} w-[14%] relative`}>
                {showMissingFields && !fmeaInfo.companyName && (
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-orange-400 text-[10px] pointer-events-none">미입력(Not Entered)</span>
                )}
                <input
                  type="text"
                  name="fmea-company-name-x1"
                  autoComplete="new-password"
                  value={fmeaInfo.companyName}
                  onChange={(e) => updateField('companyName', e.target.value)}
                  className={`w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none placeholder:text-gray-400 ${showMissingFields && !fmeaInfo.companyName ? 'text-transparent' : ''}`}
                  placeholder="공정 FMEA에 책임이 있는 회사 명(Company)"
                />
              </td>
              <td className={`${headerCell} w-[7%] whitespace-nowrap`}>FMEA명(Name)</td>
              <td className={`${inputCell} w-[18%] relative`}>
                {showMissingFields && !fmeaInfo.subject && (
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-orange-400 text-[10px] pointer-events-none">미입력(Not Entered)</span>
                )}
                <input
                  type="text"
                  name="fmea-subject-x1"
                  autoComplete="new-password"
                  value={fmeaInfo.subject}
                  onChange={(e) => updateField('subject', e.target.value)}
                  className={`w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none placeholder:text-gray-400 ${showMissingFields && !fmeaInfo.subject ? 'text-transparent' : ''}`}
                  placeholder="시스템, 서브시스템 및/또는 구성품"
                />
              </td>
              <td className={`${headerCell} w-[7%] whitespace-nowrap`}>FMEA ID</td>
              <td className={`${inputCell} w-[10%]`}>
                <span className="px-2 text-xs font-semibold text-blue-600">{fmeaId}</span>
              </td>
              <td className={`${headerCell} w-[8%] whitespace-nowrap`}>상위 APQP(Parent)</td>
              <td className={`${inputCell} w-[15%] cursor-pointer hover:bg-green-50`} onClick={onOpenApqpModal}>
                {selectedParentApqp ? (
                  <div className="flex items-center gap-1 px-2">
                    <span
                      className="px-1 py-0 rounded text-[9px] font-bold text-white bg-green-500 cursor-pointer hover:bg-green-600"
                      onClick={(e) => { e.stopPropagation(); router.push(`/apqp/register?id=${selectedParentApqp.toLowerCase()}`); }}
                      title="APQP 등록화면으로 이동"
                    >APQP</span>
                    <span
                      className="text-xs font-semibold text-green-600 cursor-pointer hover:underline"
                      onClick={(e) => { e.stopPropagation(); router.push(`/apqp/register?id=${selectedParentApqp.toLowerCase()}`); }}
                      title="APQP 등록화면으로 이동"
                    >{selectedParentApqp}</span>
                    <button onClick={(e) => { e.stopPropagation(); onClearParentApqp(); }} className="text-red-500 hover:text-red-700 text-[10px]">✕</button>
                  </div>
                ) : <span className="px-2 text-xs text-gray-400">-</span>}
              </td>
            </tr>

            {/* 2행 */}
            <tr className="bg-white h-8">
              <td className={`${headerCell} whitespace-nowrap`}>공정 책임(Design Resp.)</td>
              <td className={`${inputCell}`}>
                <input
                  type="text"
                  name="fmea-dept-x1"
                  autoComplete="new-password"
                  value={fmeaInfo.designResponsibility}
                  onChange={(e) => updateField('designResponsibility', e.target.value)}
                  className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none"
                  placeholder="부서(Department)"
                />
              </td>
              <td className={`${headerCell} whitespace-nowrap`}>FMEA 담당자(Responsible)</td>
              <td className={`${inputCell}`}>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    name="fmea-responsible-x1"
                    autoComplete="new-password"
                    value={fmeaInfo.fmeaResponsibleName}
                    onChange={(e) => updateField('fmeaResponsibleName', e.target.value)}
                    className="flex-1 h-7 px-2 text-xs border-0 bg-transparent focus:outline-none"
                    placeholder="담당자 성명(Name)"
                  />
                  <button onClick={() => onOpenUserModal('responsible')} className="text-blue-500 hover:text-blue-700 px-1">🔍</button>
                </div>
              </td>
              <td className={`${headerCell} whitespace-nowrap`}>시작 일자(Start Date)</td>
              <td className={`${inputCell}`}>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    readOnly
                    value={fmeaInfo.fmeaStartDate}
                    placeholder="클릭하여 선택(Click to Select)"
                    onClick={onOpenStartDateModal}
                    className="flex-1 h-7 px-2 text-xs border border-gray-300 rounded bg-white focus:outline-none cursor-pointer hover:bg-gray-50"
                  />
                  <button type="button" onClick={onOpenStartDateModal} className="text-blue-500 hover:text-blue-700 px-1">📅</button>
                </div>
              </td>
              <td className={`${headerCell} whitespace-nowrap`}>상위 FMEA(Parent)</td>
              <td className={`${inputCell} cursor-pointer hover:bg-yellow-50`} onClick={() => onOpenFmeaSelectModal('ALL')}>
                {selectedBaseFmea ? (
                  <div className="flex items-center gap-1 px-2">
                    <span className="px-1 py-0 rounded text-[9px] font-bold text-white bg-yellow-500">FMEA</span>
                    <span className="text-xs font-semibold text-yellow-600">{selectedBaseFmea}</span>
                  </div>
                ) : (
                  <span className="px-2 text-xs text-gray-400">-</span>
                )}
              </td>
            </tr>

            {/* 3행 */}
            <tr className="bg-[#e3f2fd] h-8">
              <td className={`${headerCell} whitespace-nowrap`}>고객 명(Customer)</td>
              <td className={`${inputCell}`}>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    name="fmea-customer-x1"
                    autoComplete="new-password"
                    value={fmeaInfo.customerName}
                    onChange={(e) => updateField('customerName', e.target.value)}
                    className="flex-1 h-7 px-2 text-xs border-0 bg-transparent focus:outline-none"
                    placeholder="고객 명(Customer)"
                  />
                  <button onClick={onOpenBizInfoModal} className="text-blue-500 hover:text-blue-700">🔍</button>
                </div>
              </td>
              <td className={`${headerCell} whitespace-nowrap`}>개정 일자(Revision Date)</td>
              <td className={`${inputCell}`}>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    readOnly
                    value={fmeaInfo.fmeaRevisionDate}
                    placeholder="클릭하여 선택(Click to Select)"
                    onClick={onOpenRevisionDateModal}
                    className="flex-1 h-7 px-2 text-xs border border-gray-300 rounded bg-white focus:outline-none cursor-pointer hover:bg-gray-50"
                  />
                  <button type="button" onClick={onOpenRevisionDateModal} className="text-blue-500 hover:text-blue-700 px-1">📅</button>
                </div>
              </td>
              <td className={`${headerCell} whitespace-nowrap`}>엔지니어링 위치(Eng. Location)</td>
              <td className={`${inputCell}`}>
                <input
                  type="text"
                  name="fmea-location-x1"
                  autoComplete="new-password"
                  value={fmeaInfo.engineeringLocation}
                  onChange={(e) => updateField('engineeringLocation', e.target.value)}
                  className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none"
                  placeholder="위치(Location)"
                />
              </td>
              <td className={`${headerCell} whitespace-nowrap`}>보안 수준(Confidentiality)</td>
              <td className={`${inputCell}`}>
                <select
                  value={fmeaInfo.confidentialityLevel}
                  onChange={(e) => updateField('confidentialityLevel', e.target.value)}
                  className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="">선택(Select)</option>
                  <option value="internal">사내용(Internal)</option>
                  <option value="confidential">대외비(Restricted)</option>
                  <option value="secret">기밀(Confidential)</option>
                </select>
              </td>
            </tr>

            {/* 4행 - FMEA 유형 + 연동 PFD/CP */}
            <tr className="bg-white h-8">
              <td className={`${headerCell} whitespace-nowrap`}>FMEA 유형(Type)</td>
              <td colSpan={3} className={`${inputCell} px-3`}>
                <div className="flex items-center gap-4 h-7">
                  {(['M', 'F', 'P'] as FMEAType[]).map((type) => (
                    <label key={type} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="fmeaType"
                        checked={fmeaInfo.fmeaType === type}
                        onChange={() => onFmeaTypeChange(type)}
                        disabled={isEditMode}
                        className="w-3 h-3"
                      />
                      <span className={`text-xs ${fmeaInfo.fmeaType === type ? 'font-bold text-blue-600' : 'text-gray-600'}`}>
                        {type === 'M' ? 'Master' : type === 'F' ? 'Family' : 'Part'}
                      </span>
                    </label>
                  ))}
                </div>
              </td>
              {/* 연동 PFD */}
              <td className={`${headerCell} whitespace-nowrap bg-violet-600`}>연동 PFD(Linked PFD)</td>
              <td className={`${inputCell}`}>
                {linkedPfd ? (
                  <div className="flex items-center gap-1 px-2">
                    <span
                      className="px-1 py-0 rounded text-[9px] font-bold text-white bg-violet-500 cursor-pointer hover:bg-violet-600"
                      onClick={() => router.push(`/pfd/register?id=${linkedPfd.toLowerCase()}`)}
                      title="PFD 등록화면으로 이동"
                    >PFDL</span>
                    <span
                      className="text-xs font-semibold text-violet-600 cursor-pointer hover:underline"
                      onClick={() => router.push(`/pfd/register?id=${linkedPfd.toLowerCase()}`)}
                      title="PFD 등록화면으로 이동"
                    >{linkedPfd}</span>
                  </div>
                ) : <span className="px-2 text-xs text-gray-400">-</span>}
              </td>
              {/* 연동 CP */}
              <td className={`${headerCell} whitespace-nowrap bg-teal-600`}>연동 CP(Linked CP)</td>
              <td className={`${inputCell}`}>
                {linkedCp ? (
                  <div className="flex items-center gap-1 px-2">
                    <span
                      className="px-1 py-0 rounded text-[9px] font-bold text-white bg-teal-500 cursor-pointer hover:bg-teal-600"
                      onClick={() => router.push(`/control-plan/register?id=${linkedCp.toLowerCase()}`)}
                      title="CP 등록화면으로 이동"
                    >CP</span>
                    <span
                      className="text-xs font-semibold text-teal-600 cursor-pointer hover:underline"
                      onClick={() => router.push(`/control-plan/register?id=${linkedCp.toLowerCase()}`)}
                      title="CP 등록화면으로 이동"
                    >{linkedCp}</span>
                  </div>
                ) : <span className="px-2 text-xs text-gray-400">-</span>}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 기초정보 등록 옵션 */}
      <div className="bg-white rounded border border-gray-300 mb-3 p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">📋</span>
          <h3 className="text-xs font-bold text-gray-700">기초정보 등록 옵션(BD Registration Options)</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onOpenFmeaSelectModal('M')}
            className="px-3 py-1.5 text-xs border border-blue-400 text-blue-600 rounded hover:bg-blue-50"
          >
            📘 Master FMEA 선택(Select)
          </button>
          <button
            onClick={() => onOpenFmeaSelectModal('F')}
            className="px-3 py-1.5 text-xs border border-green-400 text-green-600 rounded hover:bg-green-50"
          >
            📗 Family FMEA 선택(Select)
          </button>
          <button
            onClick={() => onOpenFmeaSelectModal('P')}
            className="px-3 py-1.5 text-xs border border-yellow-400 text-yellow-600 rounded hover:bg-yellow-50"
          >
            📙 Part FMEA 선택(Select)
          </button>
          <button
            onClick={onExcelImport}
            className="px-3 py-1.5 text-xs border border-purple-400 text-purple-600 rounded hover:bg-purple-50"
          >
            📥 Excel Import
          </button>
          <button
            onClick={onGoToWorksheet}
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            📝 워크시트 이동(Go to Worksheet)
          </button>
        </div>

        {/* 숨겨진 파일 입력 */}
        <input
          type="file"
          ref={excelFileInputRef}
          onChange={onExcelFileChange}
          accept=".xlsx,.xls"
          className="hidden"
        />
      </div>
    </form>
  );
}

export default RegisterInfoSection;
