// CODEFREEZE
/**
 * @file FmeaSelectModal.tsx
 * @description FMEA 선택 플로팅 윈도우 (공통 컴포넌트)
 * @usage PFMEA, DFMEA, CP 등에서 상위 FMEA 선택 또는 불러오기
 * @updated 2026-02-17 - 기초정보/리스트 바로가기 + 유형클릭=기초정보 + ID클릭=리스트
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, usePathname } from 'next/navigation';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';
import { fmeaIdToBdId } from '@/app/(fmea-core)/pfmea/import/utils/bd-id';

export interface FmeaItem {
  id: string;
  subject: string;
  type: string;
  customerName?: string;
  revisionNo?: string;
  startDate?: string;
  remark?: string;
}

interface FmeaSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (fmeaId: string) => void;
  fmeas: FmeaItem[];
  selectType: 'M' | 'F' | 'P' | 'D' | 'ALL' | 'LOAD' | 'MF';
  currentFmeaId?: string;
  onExcelImport?: () => void;
}

const TYPE_COLORS = {
  M: { bg: 'bg-blue-700', text: 'text-blue-700', hover: 'hover:bg-blue-800' },
  F: { bg: 'bg-blue-600', text: 'text-blue-600', hover: 'hover:bg-blue-700' },
  P: { bg: 'bg-green-600', text: 'text-green-700', hover: 'hover:bg-green-700' },
  D: { bg: 'bg-indigo-600', text: 'text-indigo-700', hover: 'hover:bg-indigo-700' },
  ALL: { bg: 'bg-gray-600', text: 'text-gray-700', hover: 'hover:bg-gray-700' },
  LOAD: { bg: 'bg-blue-700', text: 'text-blue-700', hover: 'hover:bg-blue-800' },
  MF: { bg: 'bg-blue-600', text: 'text-blue-600', hover: 'hover:bg-blue-700' },
};

const TYPE_LABELS = {
  M: 'Master FMEA 선택(Select Master FMEA)',
  F: 'Family FMEA 선택(Select Family FMEA)',
  P: 'Part FMEA 선택(Select Part FMEA)',
  D: 'DFMEA 선택(Select DFMEA)',
  ALL: 'FMEA 리스트 선택(Select FMEA)',
  LOAD: '불러올 FMEA 선택(Load FMEA)',
  MF: '상위 FMEA 선택(Select Parent FMEA)',
};

const TYPE_EMPTY_LABELS: Record<string, string> = {
  M: 'Master FMEA', F: 'Family FMEA', P: 'Part FMEA',
  ALL: 'FMEA', LOAD: 'PFMEA', MF: 'FMEA',
};

const BD_ABBR: Record<string, string> = { m: 'MBD', f: 'FBD', p: 'PBD' };

/** 비고 인라인 편집 셀 */
function RemarkCell({ fmeaId, value }: { fmeaId: string; value: string }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setText(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const save = async () => {
    setEditing(false);
    if (text === value) return;
    try {
      const res = await fetch('/api/fmea/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fmeaId, remark: text }),
      });
      const data = await res.json();
      if (data.success) { setSaved(true); setTimeout(() => setSaved(false), 1200); }
    } catch { /* ignore */ }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setText(value); setEditing(false); } }}
        onClick={e => e.stopPropagation()}
        className="w-full px-1 py-0.5 text-xs border border-blue-400 rounded focus:outline-none bg-blue-50"
      />
    );
  }

  return (
    <span
      onClick={e => { e.stopPropagation(); setEditing(true); }}
      className={`block truncate cursor-text hover:bg-blue-50 rounded px-1 py-0.5 min-h-[18px] ${saved ? 'bg-green-50' : ''}`}
      title={text ? `${text} (클릭하여 편집)` : '클릭하여 비고 입력'}
    >
      {text || <span className="text-gray-300 italic">편집</span>}
    </span>
  );
}

export function FmeaSelectModal({
  isOpen, onClose, onSelect, fmeas, selectType, currentFmeaId,
}: FmeaSelectModalProps) {
  const [search, setSearch] = useState('');
  const [mfTab, setMfTab] = useState<'M' | 'F'>('M');
  const [localFmeas, setLocalFmeas] = useState<FmeaItem[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({
    isOpen, width: 820, height: 380, minWidth: 650, minHeight: 260
  });
  const router = useRouter();
  const pathname = usePathname();
  const modulePrefix = pathname?.split('/').filter(Boolean)[0] || 'pfmea';

  /** 기초정보 입력 화면으로 이동 */
  const navigateToImport = (fmeaId?: string) => {
    const url = `/${modulePrefix}/import${fmeaId ? `?fmeaId=${encodeURIComponent(fmeaId)}` : ''}`;
    onClose();
    router.push(url);
  };

  /** FMEA 리스트 화면으로 이동 */
  const navigateToList = () => {
    onClose();
    router.push(`/${modulePrefix}/list`);
  };

  useEffect(() => {
    if (isOpen) { setSearch(''); setMfTab('M'); setDeleteConfirm(null); }
  }, [isOpen]);

  useEffect(() => { setLocalFmeas(fmeas); }, [fmeas]);

  if (!isOpen) return null;

  const colors = TYPE_COLORS[selectType];

  const filtered = localFmeas.filter(f =>
    f.id.toLowerCase().includes(search.toLowerCase()) ||
    f.subject.toLowerCase().includes(search.toLowerCase()) ||
    (f.customerName || '').toLowerCase().includes(search.toLowerCase())
  );

  const emptyLabel = selectType === 'MF'
    ? `${mfTab === 'M' ? 'Master' : 'Family'} FMEA`
    : TYPE_EMPTY_LABELS[selectType] || 'FMEA';

  // ===== Delete =====
  const handleDelete = async (fmeaId: string) => {
    try {
      const res = await fetch('/api/fmea/projects', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fmeaId }),
      });
      const data = await res.json();
      if (data.success) {
        setLocalFmeas(prev => prev.filter(f => f.id !== fmeaId));
      }
    } catch { /* ignore */ }
    setDeleteConfirm(null);
  };

  return createPortal(
    <div
      className="fixed z-[9999] bg-white rounded-lg shadow-2xl flex flex-col select-none border border-gray-300"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
    >
      {/* 헤더 + 툴바 통합 */}
      <div
        className={`${colors.bg} text-white px-2 py-1.5 flex items-center gap-2 cursor-move shrink-0 rounded-t-lg`}
        onMouseDown={onDragStart}
      >
        <h3 className="font-bold text-xs whitespace-nowrap">{TYPE_LABELS[selectType]}</h3>
        <input
          type="text"
          placeholder="검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onMouseDown={e => e.stopPropagation()}
          className="flex-1 px-2 py-0.5 text-xs border-0 rounded bg-white/20 text-white placeholder-white/60 focus:outline-none focus:bg-white/30"
        />
        <button
          onClick={() => navigateToImport()}
          onMouseDown={e => e.stopPropagation()}
          className="px-1.5 py-0.5 bg-white/20 hover:bg-white/30 text-white rounded text-[10px] font-semibold whitespace-nowrap"
        >
          기초정보<span className="text-[7px] opacity-70 ml-0.5">(Info)</span>
        </button>
        <button
          onClick={navigateToList}
          onMouseDown={e => e.stopPropagation()}
          className="px-1.5 py-0.5 bg-white/20 hover:bg-white/30 text-white rounded text-[10px] font-semibold whitespace-nowrap"
        >
          리스트<span className="text-[7px] opacity-70 ml-0.5">(List)</span>
        </button>
        <button onClick={onClose} onMouseDown={e => e.stopPropagation()} className="text-white/70 hover:text-white text-sm leading-none ml-1">✕</button>
      </div>

      {/* MF 안내 */}
      {selectType === 'MF' && (
        <div className="px-2 py-0.5 bg-yellow-50 border-b text-[10px] text-yellow-700 shrink-0">
          Master(M) 또는 Family(F) 중 하나를 클릭하세요.
        </div>
      )}

      {/* 목록 */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-4">
            <p className={`text-xs font-bold ${colors.text}`}>{emptyLabel} 데이터가 없습니다</p>
            <button
              onClick={() => navigateToImport()}
              className={`mt-1.5 px-2 py-1 ${colors.bg} ${colors.hover} text-white rounded text-[11px] font-bold`}
            >
              기초정보 바로가기
            </button>
          </div>
        ) : (
          <table className="w-full text-[11px] border-collapse" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 28 }} />
              <col style={{ width: 62 }} />
              <col style={{ width: 78 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 100 }} />
              <col />
              <col style={{ width: 48 }} />
              <col style={{ width: 72 }} />
              <col style={{ width: 80 }} />
              <col style={{ width: 24 }} />
            </colgroup>
            <thead className="sticky top-0 bg-gray-200 text-gray-700 text-[10px]">
              <tr>
                <th className="px-1 py-0.5 text-center border border-gray-300 font-semibold">No</th>
                <th className="px-1 py-0.5 text-center border border-gray-300 font-semibold" title="Type"><div className="leading-tight"><div>유형</div><div className="text-[8px] font-normal opacity-60">(Type)</div></div></th>
                <th className="px-1 py-0.5 text-center border border-gray-300 font-semibold" title="Basic Data ID">BD ID</th>
                <th className="px-1 py-0.5 text-center border border-gray-300 font-semibold" title="Customer"><div className="leading-tight"><div>고객</div><div className="text-[8px] font-normal opacity-60">(Cust.)</div></div></th>
                <th className="px-1 py-0.5 text-center border border-gray-300 font-semibold" title="FMEA Identifier">FMEA ID</th>
                <th className="px-1 py-0.5 text-center border border-gray-300 font-semibold" title="FMEA Name"><div className="leading-tight"><div>FMEA명</div><div className="text-[8px] font-normal opacity-60">(Name)</div></div></th>
                <th className="px-1 py-0.5 text-center border border-gray-300 font-semibold" title="Revision">Rev</th>
                <th className="px-1 py-0.5 text-center border border-gray-300 font-semibold" title="Created Date"><div className="leading-tight"><div>작성일</div><div className="text-[8px] font-normal opacity-60">(Date)</div></div></th>
                <th className="px-1 py-0.5 text-center border border-gray-300 font-semibold" title="Remark"><div className="leading-tight"><div>비고</div><div className="text-[8px] font-normal opacity-60">(Remark)</div></div></th>
                <th className="px-0 py-0.5 text-center border border-gray-300"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((fmea, idx) => {
                const t = fmea.type?.toLowerCase() || 'p';
                const bdId = fmeaIdToBdId(fmea.id);
                const abbr = BD_ABBR[t] || 'BD';
                const isDeleting = deleteConfirm === fmea.id;
                const rowBg = isDeleting ? 'bg-red-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                return (
                  <tr
                    key={fmea.id}
                    onClick={() => !isDeleting && onSelect(fmea.id)}
                    className={`cursor-pointer hover:bg-blue-50 ${rowBg}`}
                  >
                    <td className="px-1 py-0.5 text-center text-gray-400 border border-gray-200">{idx + 1}</td>
                    <td
                      className="px-1 py-0.5 text-center border border-gray-200 cursor-pointer"
                      onClick={e => { e.stopPropagation(); navigateToImport(fmea.id); }}
                      title="기초정보 입력으로 이동"
                    >
                      <span className={`px-1 py-0 rounded text-[10px] font-bold hover:opacity-80 ${
                        t === 'm' ? 'bg-blue-200 text-blue-700' :
                        t === 'f' ? 'bg-sky-100 text-sky-600' :
                        'bg-green-100 text-green-600'
                      }`}>
                        {t.toUpperCase()} {abbr}
                      </span>
                    </td>
                    <td className="px-1 py-0.5 text-center font-mono text-[10px] text-gray-600 border border-gray-200">{bdId}</td>
                    <td className="px-1 py-0.5 text-gray-700 truncate border border-gray-200" title={fmea.customerName || ''}>
                      {fmea.customerName || '-'}
                    </td>
                    <td
                      className="px-1 py-0.5 font-semibold text-blue-600 truncate border border-gray-200 cursor-pointer hover:underline"
                      onClick={e => { e.stopPropagation(); navigateToList(); }}
                      title="리스트로 이동"
                    >
                      {fmea.id}
                    </td>
                    <td className="px-1 py-0.5 text-gray-800 truncate border border-gray-200" title={fmea.subject}>
                      {fmea.subject}
                    </td>
                    <td className="px-1 py-0.5 text-center text-gray-500 font-mono text-[10px] border border-gray-200">
                      {fmea.revisionNo || 'Rev.00'}
                    </td>
                    <td className="px-1 py-0.5 text-center text-gray-500 text-[10px] border border-gray-200">
                      {fmea.startDate || '-'}
                    </td>
                    <td className="px-0.5 py-0.5 text-gray-500 border border-gray-200">
                      <RemarkCell fmeaId={fmea.id} value={fmea.remark || ''} />
                    </td>
                    <td className="px-0 py-0.5 text-center border border-gray-200">
                      {isDeleting ? (
                        <div className="flex gap-0.5 justify-center" onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleDelete(fmea.id)} className="text-[9px] text-red-600 font-bold hover:underline">삭제</button>
                          <button onClick={() => setDeleteConfirm(null)} className="text-[9px] text-gray-500 hover:underline">취소</button>
                        </div>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteConfirm(fmea.id); }}
                          className="text-gray-300 hover:text-red-500 text-[11px] leading-none"
                          title="삭제"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 미니 푸터 */}
      <div className="bg-gray-50 px-3 py-1 flex justify-between items-center border-t shrink-0 rounded-b-lg text-[10px] text-gray-400">
        <span>{selectType === 'MF' ? `${mfTab === 'M' ? 'Master' : 'Family'}: ` : ''}총 {filtered.length}건</span>
        <span>유형=기초정보 | ID=리스트 | 비고=편집</span>
      </div>

      {/* 리사이즈 핸들 */}
      <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={onResizeStart} title="크기 조절">
        <svg width="14" height="14" viewBox="0 0 14 14" className="text-gray-400 opacity-60">
          <path d="M12 2v10H2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 6v6H6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
    </div>,
    document.body
  );
}

export default FmeaSelectModal;
