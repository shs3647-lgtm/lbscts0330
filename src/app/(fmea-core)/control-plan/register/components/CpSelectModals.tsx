/**
 * @file CpSelectModals.tsx
 * @description CP 선택 / FMEA 선택 플로팅 모달 (page.tsx에서 추출)
 * @version 1.0.0
 */

'use client';

import { CpItem, FmeaItem, CPSelectType } from '../types';

// =====================================================
// Props
// =====================================================
export interface CpSelectModalsProps {
  // CP 선택 모달
  cpSelectModalOpen: boolean;
  setCpSelectModalOpen: (open: boolean) => void;
  cpSelectType: CPSelectType;
  availableCps: CpItem[];
  handleCpSelect: (cpId: string) => void;
  cpSelPos: { x: number; y: number };
  cpSelSize: { w: number; h: number };
  cpSelDragStart: (e: React.MouseEvent) => void;
  cpSelResizeStart: (e: React.MouseEvent) => void;

  // FMEA 선택 모달
  fmeaSelectModalOpen: boolean;
  setFmeaSelectModalOpen: (open: boolean) => void;
  availableFmeas: FmeaItem[];
  setSelectedParentFmea: (fmeaId: string) => void;
  fmeaSelPos: { x: number; y: number };
  fmeaSelSize: { w: number; h: number };
  fmeaSelDragStart: (e: React.MouseEvent) => void;
  fmeaSelResizeStart: (e: React.MouseEvent) => void;
}

// =====================================================
// Component
// =====================================================
export default function CpSelectModals({
  cpSelectModalOpen,
  setCpSelectModalOpen,
  cpSelectType,
  availableCps,
  handleCpSelect,
  cpSelPos,
  cpSelSize,
  cpSelDragStart,
  cpSelResizeStart,
  fmeaSelectModalOpen,
  setFmeaSelectModalOpen,
  availableFmeas,
  setSelectedParentFmea,
  fmeaSelPos,
  fmeaSelSize,
  fmeaSelDragStart,
  fmeaSelResizeStart,
}: CpSelectModalsProps) {
  return (
    <>
      {/* CP 선택 모달 */}
      {cpSelectModalOpen && (
        <div
          className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
          style={{ left: cpSelPos.x, top: cpSelPos.y, width: cpSelSize.w, height: cpSelSize.h }}
        >
          <div
            className="flex items-center justify-between px-4 py-2 bg-[#00587a] text-white rounded-t-lg cursor-move"
            onMouseDown={cpSelDragStart}
          >
            <h3 className="text-sm font-bold" title="CP Select">
              CP 선택(Select) ({cpSelectType === 'LOAD' ? '편집할 CP' : cpSelectType === 'ALL' ? '상위 CP' : `${cpSelectType} 타입`})
            </h3>
            <button onClick={() => setCpSelectModalOpen(false)} className="text-white hover:text-gray-200">
              &#x2715;
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2">
            {availableCps.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-xs">등록된 CP가 없습니다.</div>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 bg-gray-100">
                  <tr>
                    <th className="border px-2 py-1 text-center w-24" title="Control Plan ID">CP ID</th>
                    <th className="border px-2 py-1 text-center w-12" title="Type">유형(Type)</th>
                    <th className="border px-2 py-1 text-left" title="CP Name">CP명(Name)</th>
                    <th className="border px-2 py-1 text-center w-16" title="Select">선택(Select)</th>
                  </tr>
                </thead>
                <tbody>
                  {availableCps.map((cp, idx) => (
                    <tr key={cp.id} className={`hover:bg-blue-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="border px-2 py-1 text-center font-mono text-blue-600">{cp.id}</td>
                      <td className="border px-2 py-1 text-center">
                        <span className={`px-1 py-0.5 rounded text-[10px] font-bold text-white ${cp.type === 'm' ? 'bg-purple-500' : cp.type === 'f' ? 'bg-blue-500' : 'bg-green-500'}`}>
                          {cp.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="border px-2 py-1">{cp.subject}</td>
                      <td className="border px-2 py-1 text-center">
                        <button onClick={() => handleCpSelect(cp.id)} className="px-2 py-0.5 bg-blue-500 text-white rounded text-[10px] hover:bg-blue-600">
                          선택(Select)
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="px-4 py-2 border-t bg-gray-50 flex justify-end flex-shrink-0">
            <button onClick={() => setCpSelectModalOpen(false)} className="px-3 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300">
              닫기(Close)
            </button>
          </div>
          <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={cpSelResizeStart} title="크기 조절">
            <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 opacity-60">
              <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
        </div>
      )}

      {/* FMEA 선택 모달 */}
      {fmeaSelectModalOpen && (
        <div
          className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
          style={{ left: fmeaSelPos.x, top: fmeaSelPos.y, width: fmeaSelSize.w, height: fmeaSelSize.h }}
        >
          <div
            className="flex items-center justify-between px-4 py-2 bg-[#00587a] text-white rounded-t-lg cursor-move"
            onMouseDown={fmeaSelDragStart}
          >
            <h3 className="text-sm font-bold" title="Parent FMEA Select">상위 FMEA 선택(Parent FMEA Select)</h3>
            <button onClick={() => setFmeaSelectModalOpen(false)} className="text-white hover:text-gray-200">
              &#x2715;
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2">
            {availableFmeas.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-xs">등록된 FMEA가 없습니다.</div>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 bg-gray-100">
                  <tr>
                    <th className="border px-2 py-1 text-center w-24">FMEA ID</th>
                    <th className="border px-2 py-1 text-center w-12" title="Type">유형(Type)</th>
                    <th className="border px-2 py-1 text-left" title="FMEA Name">FMEA명(Name)</th>
                    <th className="border px-2 py-1 text-center w-16" title="Select">선택(Select)</th>
                  </tr>
                </thead>
                <tbody>
                  {availableFmeas.map((fmea, idx) => (
                    <tr key={fmea.id} className={`hover:bg-blue-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="border px-2 py-1 text-center font-mono text-blue-600">{fmea.id}</td>
                      <td className="border px-2 py-1 text-center">
                        <span className={`px-1 py-0.5 rounded text-[10px] font-bold text-white ${fmea.type === 'm' ? 'bg-purple-500' : fmea.type === 'f' ? 'bg-blue-500' : 'bg-green-500'}`}>
                          {fmea.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="border px-2 py-1">{fmea.subject}</td>
                      <td className="border px-2 py-1 text-center">
                        <button
                          onClick={() => {
                            setSelectedParentFmea(fmea.id.toLowerCase());
                            setFmeaSelectModalOpen(false);
                          }}
                          className="px-2 py-0.5 bg-blue-500 text-white rounded text-[10px] hover:bg-blue-600"
                        >
                          선택(Select)
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="px-4 py-2 border-t bg-gray-50 flex justify-end flex-shrink-0">
            <button onClick={() => setFmeaSelectModalOpen(false)} className="px-3 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300">
              닫기(Close)
            </button>
          </div>
          <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={fmeaSelResizeStart} title="크기 조절">
            <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 opacity-60">
              <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
        </div>
      )}
    </>
  );
}
