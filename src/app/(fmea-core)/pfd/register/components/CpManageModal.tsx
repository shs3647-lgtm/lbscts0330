// CODEFREEZE

import { createPortal } from 'react-dom';
import { LinkedCpItem, PFDType } from '../../types/pfdRegister';
import { generateLinkedPfdNo } from '../../utils/pfdIdUtils';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';

interface CpManageModalProps {
    isOpen: boolean;
    onClose: () => void;
    linkedCpList: LinkedCpItem[];
    onAddLinkedCp: (cpType: PFDType) => void;
    onRemoveLinkedCp: (cpId: string) => void;
    pfdId: string;
    pfdType: PFDType;
}

export function CpManageModal({ isOpen, onClose, linkedCpList, onAddLinkedCp, onRemoveLinkedCp, pfdId, pfdType }: CpManageModalProps) {
    const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({ isOpen, width: 650, height: 450, minWidth: 400, minHeight: 300 });

    if (!isOpen) return null;

    return typeof document === 'undefined' ? null : createPortal(
        <div className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
            style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}>
            <div className="flex items-center justify-between px-4 py-2 bg-teal-500 text-white rounded-t-lg cursor-move" onMouseDown={onDragStart}>
                <h3 className="text-sm font-bold">🔗 연동 CP 관리</h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onAddLinkedCp(pfdType)}
                        className="px-2 py-0.5 text-[10px] bg-white text-teal-700 rounded hover:bg-teal-50 font-bold"
                    >
                        + 추가
                    </button>
                    <button onClick={onClose} className="text-white hover:text-gray-200">✕</button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2">
                <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 bg-gray-100">
                        <tr>
                            <th className="border px-2 py-1 w-32 bg-violet-100">현재 PFD ID</th>
                            <th className="border px-2 py-1 w-12">유형</th>
                            <th className="border px-2 py-1 bg-teal-100">연동할 CP ID</th>
                            <th className="border px-2 py-1 w-12">유형</th>
                            <th className="border px-2 py-1 w-20">연동 status</th>
                            <th className="border px-2 py-1 w-12">삭제</th>
                        </tr>
                    </thead>
                    <tbody>
                        {linkedCpList.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="border px-2 py-4 text-center text-gray-400">
                                    연동할 CP가 없습니다. [+ 추가] 버튼을 클릭하세요.
                                </td>
                            </tr>
                        ) : (
                            linkedCpList.map((cp, idx) => (
                                <tr key={cp.cpId} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                    <td className="border px-2 py-1 text-center font-mono text-violet-700">{generateLinkedPfdNo(pfdId)}</td>
                                    <td className="border px-2 py-1 text-center">
                                        <span className={`px-1 py-0.5 rounded text-[10px] font-bold text-white ${cp.cpType === 'M' ? 'bg-purple-500' : cp.cpType === 'F' ? 'bg-blue-500' : 'bg-green-500'}`}>
                                            {cp.cpType}
                                        </span>
                                    </td>
                                    <td className="border px-2 py-1 text-center font-mono text-teal-700 font-bold">{cp.cpId}</td>
                                    <td className="border px-2 py-1 text-center">
                                        <span className={`px-1 py-0.5 rounded text-[10px] font-bold text-white ${cp.cpType === 'M' ? 'bg-purple-500' : cp.cpType === 'F' ? 'bg-blue-500' : 'bg-green-500'}`}>
                                            {cp.cpType}
                                        </span>
                                    </td>
                                    <td className="border px-2 py-1 text-center">
                                        {cp.status === 'linked' && <span className="text-[10px] font-bold text-orange-600">🔗 연동됨</span>}
                                        {cp.status === 'pending' && <span className="text-[10px] font-bold text-gray-400">미연동</span>}
                                    </td>
                                    <td className="border px-2 py-1 text-center">
                                        <button
                                            onClick={() => onRemoveLinkedCp(cp.cpId)}
                                            className="text-red-500 hover:text-red-700 text-[10px]"
                                        >
                                            ✕
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <div className="px-4 py-2 border-t bg-gray-50 flex justify-between items-center">
                <span className="text-[10px] text-gray-500">※ [+ 추가] 버튼으로 연동 CP를 추가하세요</span>
                <button onClick={onClose} className="px-3 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300">닫기</button>
            </div>
            <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={onResizeStart} title="크기 조절">
                <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 opacity-60">
                    <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
            </div>
        </div>, document.body);
}
