// CODEFREEZE

import { createPortal } from 'react-dom';
import { CpItem } from '../../types/pfdRegister';
import { generateLinkedCpNo } from '../../utils/pfdIdUtils';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';

interface CpSelectModalProps {
    isOpen: boolean;
    onClose: () => void;
    availableCps: CpItem[];
    pfdId: string;
}

export function CpSelectModal({ isOpen, onClose, availableCps, pfdId }: CpSelectModalProps) {
    const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({ isOpen, width: 700, height: 450, minWidth: 450, minHeight: 300 });

    if (!isOpen) return null;

    return typeof document === 'undefined' ? null : createPortal(
        <div className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
            style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}>
            <div className="flex items-center justify-between px-4 py-2 bg-teal-500 text-white rounded-t-lg cursor-move" onMouseDown={onDragStart}>
                <h3 className="text-sm font-bold">📋 기존 CP 목록 (참고용)</h3>
                <button onClick={onClose} className="text-white hover:text-gray-200">✕</button>
            </div>
            <div className="px-4 py-2 bg-blue-50 border-b">
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-blue-600 font-bold">ℹ️ 안내:</span>
                    <span>기존 CP 목록입니다. 연동할 CP는 [CP 관리] 모달에서 추가하세요.</span>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2">
                {availableCps.length === 0 ? <div className="text-center py-6 text-gray-500 text-xs">등록된 CP가 없습니다.</div> : (
                    <table className="w-full text-xs border-collapse">
                        <thead className="sticky top-0 bg-gray-100">
                            <tr>
                                <th className="border px-2 py-1 w-28">CP ID</th>
                                <th className="border px-2 py-1 w-12">유형</th>
                                <th className="border px-2 py-1">CP명</th>
                                <th className="border px-2 py-1 w-24 bg-orange-100">연동된 PFD</th>
                                <th className="border px-2 py-1 w-16">상태</th>
                            </tr>
                        </thead>
                        <tbody>
                            {availableCps.map((c, idx) => (
                                <tr key={c.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${c.linkedPfdNo ? 'bg-orange-50' : ''}`}>
                                    <td className="border px-2 py-1 text-center font-mono text-teal-700">{c.id}</td>
                                    <td className="border px-2 py-1 text-center"><span className={`px-1 py-0.5 rounded text-[10px] font-bold text-white ${c.type === 'm' ? 'bg-purple-500' : c.type === 'f' ? 'bg-blue-500' : 'bg-green-500'}`}>{c.type.toUpperCase()}</span></td>
                                    <td className="border px-2 py-1">{c.subject}</td>
                                    <td className="border px-2 py-1 text-center">
                                        {c.linkedPfdNo ? (
                                            <span className="px-1 py-0.5 rounded text-[9px] font-bold text-white bg-orange-500">{c.linkedPfdNo}</span>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="border px-2 py-1 text-center">
                                        {c.linkedPfdNo ? (
                                            <span className="text-[10px] text-orange-600 font-bold">🔗 연동됨</span>
                                        ) : (
                                            <span className="text-[10px] text-gray-400">미연동</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            <div className="px-4 py-2 border-t bg-gray-50 flex justify-end"><button onClick={onClose} className="px-3 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300">닫기</button></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={onResizeStart} title="크기 조절">
                <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 opacity-60">
                    <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
            </div>
        </div>, document.body);
}
