// CODEFREEZE

import { createPortal } from 'react-dom';
import { PFDSelectType, PfdItem } from '../../types/pfdRegister';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';

interface PfdSelectModalProps {
    isOpen: boolean;
    onClose: () => void;
    pfdSelectType: PFDSelectType;
    availablePfds: PfdItem[];
    onSelect: (id: string) => void;
}

export function PfdSelectModal({ isOpen, onClose, pfdSelectType, availablePfds, onSelect }: PfdSelectModalProps) {
    const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({ isOpen, width: 600, height: 450, minWidth: 400, minHeight: 300 });

    if (!isOpen) return null;

    return typeof document === 'undefined' ? null : createPortal(
        <div className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
            style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}>
            <div className="flex items-center justify-between px-4 py-2 bg-[#1e3a5f] text-white rounded-t-lg cursor-move" onMouseDown={onDragStart}>
                <h3 className="text-sm font-bold">📋 PFD 선택 ({pfdSelectType === 'LOAD' ? '편집할 PFD' : pfdSelectType === 'ALL' ? '상위 PFD' : `${pfdSelectType} 타입`})</h3>
                <button onClick={onClose} className="text-white hover:text-gray-200">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2">
                {availablePfds.length === 0 ? <div className="text-center py-6 text-gray-500 text-xs">등록된 PFD가 없습니다.</div> : (
                    <table className="w-full text-xs border-collapse">
                        <thead className="sticky top-0 bg-gray-100"><tr><th className="border px-2 py-1 w-24">ID</th><th className="border px-2 py-1 w-12">유형</th><th className="border px-2 py-1">PFD명</th><th className="border px-2 py-1 w-16">선택</th></tr></thead>
                        <tbody>
                            {availablePfds.map((p, idx) => (
                                <tr key={p.id} className={`hover:bg-indigo-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                    <td className="border px-2 py-1 text-center font-mono text-indigo-600">{p.id}</td>
                                    <td className="border px-2 py-1 text-center"><span className={`px-1 py-0.5 rounded text-[10px] font-bold text-white ${p.type === 'm' ? 'bg-purple-500' : p.type === 'f' ? 'bg-blue-500' : 'bg-green-500'}`}>{p.type.toUpperCase()}</span></td>
                                    <td className="border px-2 py-1">{p.subject}</td>
                                    <td className="border px-2 py-1 text-center"><button onClick={() => onSelect(p.id)} className="px-2 py-0.5 bg-[#1e3a5f] text-white rounded text-[10px] hover:bg-[#162d4a]">선택</button></td>
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
