// CODEFREEZE

import { createPortal } from 'react-dom';
import { FmeaItem } from '../../types/pfdRegister';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';

interface FmeaSelectModalProps {
    isOpen: boolean;
    onClose: () => void;
    availableFmeas: FmeaItem[];
    onSelect: (id: string) => void;
}

export function FmeaSelectModal({ isOpen, onClose, availableFmeas, onSelect }: FmeaSelectModalProps) {
    const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({ isOpen, width: 600, height: 450, minWidth: 400, minHeight: 300 });

    if (!isOpen) return null;

    return typeof document === 'undefined' ? null : createPortal(
        <div className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
            style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}>
            <div className="flex items-center justify-between px-4 py-2 bg-yellow-500 text-white rounded-t-lg cursor-move" onMouseDown={onDragStart}>
                <h3 className="text-sm font-bold">📋 상위 FMEA 선택</h3>
                <button onClick={onClose} className="text-white hover:text-gray-200">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2">
                {availableFmeas.length === 0 ? <div className="text-center py-6 text-gray-500 text-xs">등록된 FMEA가 없습니다.</div> : (
                    <table className="w-full text-xs border-collapse">
                        <thead className="sticky top-0 bg-gray-100"><tr><th className="border px-2 py-1 w-28">FMEA ID</th><th className="border px-2 py-1 w-12">유형</th><th className="border px-2 py-1">FMEA명</th><th className="border px-2 py-1 w-16">선택</th></tr></thead>
                        <tbody>
                            {availableFmeas.map((f, idx) => (
                                <tr key={f.id} className={`hover:bg-yellow-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                    <td className="border px-2 py-1 text-center font-mono text-yellow-700">{f.id}</td>
                                    <td className="border px-2 py-1 text-center"><span className={`px-1 py-0.5 rounded text-[10px] font-bold text-white ${f.type === 'm' ? 'bg-purple-500' : f.type === 'f' ? 'bg-blue-500' : 'bg-green-500'}`}>{f.type.toUpperCase()}</span></td>
                                    <td className="border px-2 py-1">{f.subject}</td>
                                    <td className="border px-2 py-1 text-center"><button onClick={() => {
                                        onSelect(f.id);
                                        onClose();
                                    }} className="px-2 py-0.5 bg-yellow-500 text-white rounded text-[10px] hover:bg-yellow-600">선택</button></td>
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
