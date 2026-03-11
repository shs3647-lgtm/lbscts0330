/**
 * @file CIPManageModal.tsx
 * @description CIP (Continuous Improvement Plan) 관리 모달
 * - LLD 양식 기반, CIP No 자동 생성
 * - 구분: Field, PCN, Yield, Quality
 * - AP H/M/L 모든 항목 대상 개선 관리
 */
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Plus, Trash2, Filter, Save } from 'lucide-react';
import HelpIcon from '@/components/common/HelpIcon';

// CIP 카테고리 (구분)
const CIP_CATEGORIES = ['Field', 'PCN', 'Yield', 'Quality'] as const;
type CIPCategory = typeof CIP_CATEGORIES[number];

const CATEGORY_COLORS: Record<CIPCategory, { bg: string; text: string }> = {
  Field: { bg: '#fee2e2', text: '#991b1b' },
  PCN: { bg: '#dbeafe', text: '#1d4ed8' },
  Yield: { bg: '#dcfce7', text: '#166534' },
  Quality: { bg: '#fef3c7', text: '#b45309' },
};

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  G: { bg: '#92D050', text: '#1F2937', label: 'Complete' },
  Y: { bg: '#FFD966', text: '#1F2937', label: 'In Progress' },
  R: { bg: '#FF6B6B', text: '#FFFFFF', label: 'Pending' },
};

const AP_COLORS: Record<string, { bg: string; text: string }> = {
  H: { bg: '#f87171', text: '#fff' },
  M: { bg: '#fde047', text: '#713f12' },
  L: { bg: '#86efac', text: '#14532d' },
};

export interface CIPItem {
  id: string;
  cipNo: string;
  fmeaId?: string | null;
  uniqueKey?: string | null;
  apLevel?: string | null;
  category: string;
  failureMode: string;
  cause: string;
  improvement: string;
  responsible?: string | null;
  targetDate?: string | null;
  completedDate?: string | null;
  status: string;
  s?: number | null;
  o?: number | null;
  d?: number | null;
}

interface CIPManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  fmeaId?: string;
  /** Pre-fill context when adding from AP table */
  prefill?: {
    uniqueKey: string;
    apLevel: string;
    failureMode: string;
    cause?: string;
    s?: number;
    o?: number;
    d?: number;
    currentPC?: string;
    currentDC?: string;
  };
  onSaved?: () => void;
}

type CategoryFilter = 'all' | CIPCategory;

export default function CIPManageModal({ isOpen, onClose, fmeaId, prefill, onSaved }: CIPManageModalProps) {
  const [items, setItems] = useState<CIPItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<CIPItem>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<Partial<CIPItem>>({
    category: 'Field',
    failureMode: '',
    cause: '',
    improvement: '',
    responsible: '',
    targetDate: '',
    status: 'R',
  });

  // Drag support
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const modalPanelRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    const modal = (e.target as HTMLElement).closest('[data-cip-modal]') as HTMLElement;
    if (!modal) return;
    const rect = modal.getBoundingClientRect();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: rect.left, origY: rect.top };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      setDragPos({
        x: dragRef.current.origX + (ev.clientX - dragRef.current.startX),
        y: dragRef.current.origY + (ev.clientY - dragRef.current.startY),
      });
    };
    const onUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setDragPos(null);
      loadItems();
      // Prefill from AP table
      if (prefill) {
        setShowAddForm(true);
        setNewItem({
          category: 'Field',
          failureMode: prefill.failureMode || '',
          cause: prefill.cause || '',
          improvement: '',
          responsible: '',
          targetDate: '',
          status: 'R',
        });
      }
    }
  }, [isOpen]);

  // Outside click to close
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (modalPanelRef.current && !modalPanelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onClose]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const url = fmeaId ? `/api/cip?fmeaId=${fmeaId}` : '/api/cip';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setItems(data.items);
      }
    } catch (error) {
      console.error('[CIP] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newItem.failureMode?.trim()) return;
    try {
      const res = await fetch('/api/cip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fmeaId,
          uniqueKey: prefill?.uniqueKey || null,
          apLevel: prefill?.apLevel || null,
          category: newItem.category || 'Field',
          failureMode: newItem.failureMode,
          cause: newItem.cause || '',
          improvement: newItem.improvement || '',
          responsible: newItem.responsible || '',
          targetDate: newItem.targetDate || '',
          status: newItem.status || 'R',
          s: prefill?.s ?? null,
          o: prefill?.o ?? null,
          d: prefill?.d ?? null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setItems(prev => [data.item, ...prev]);
        setShowAddForm(false);
        setNewItem({ category: 'Field', failureMode: '', cause: '', improvement: '', responsible: '', targetDate: '', status: 'R' });
        onSaved?.();
      }
    } catch (error) {
      console.error('[CIP] Add error:', error);
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const res = await fetch('/api/cip', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editData }),
      });
      const data = await res.json();
      if (data.success) {
        setItems(prev => prev.map(item => item.id === id ? { ...item, ...editData } : item));
        setEditingId(null);
        setEditData({});
        onSaved?.();
      }
    } catch (error) {
      console.error('[CIP] Update error:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('CIP 항목을 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/cip?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setItems(prev => prev.filter(item => item.id !== id));
        onSaved?.();
      }
    } catch (error) {
      console.error('[CIP] Delete error:', error);
    }
  };

  const startEdit = (item: CIPItem) => {
    setEditingId(item.id);
    setEditData({
      category: item.category,
      failureMode: item.failureMode,
      cause: item.cause,
      improvement: item.improvement,
      responsible: item.responsible || '',
      targetDate: item.targetDate || '',
      status: item.status,
    });
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: items.length };
    CIP_CATEGORIES.forEach(cat => {
      counts[cat] = items.filter(i => i.category === cat).length;
    });
    return counts;
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return (
        item.cipNo.toLowerCase().includes(s) ||
        item.failureMode.toLowerCase().includes(s) ||
        item.cause.toLowerCase().includes(s) ||
        item.improvement.toLowerCase().includes(s) ||
        (item.responsible || '').toLowerCase().includes(s)
      );
    });
  }, [items, categoryFilter, searchTerm]);

  if (!isOpen) return null;

  const thStyle = 'bg-[#1565c0] text-white font-bold p-1 text-center text-[10px]';
  const tdStyle = 'p-1 text-[10px]';
  const inputStyle = 'w-full px-1 py-0.5 text-[10px] border border-gray-300 rounded focus:outline-none focus:border-blue-400';

  const modalContent = (
    <div
      ref={modalPanelRef}
      data-cip-modal
      className="fixed bg-white rounded-lg shadow-2xl w-[960px] max-h-[85vh] flex flex-col z-[50001] pointer-events-auto border-2 border-[#1565c0]"
      style={dragPos
        ? { left: dragPos.x, top: dragPos.y }
        : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
      }
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-1.5 bg-[#1565c0] text-white rounded-t-lg cursor-move select-none shrink-0"
        onMouseDown={handleDragStart}
      >
        <span className="text-xs font-bold shrink-0">CIP (Continuous Improvement Plan) - AP Improvement Management</span>
        <span onMouseDown={e => e.stopPropagation()}>
          <HelpIcon compact iconSize={15} title="CIP Help" popoverWidth={400}>
            <div style={{ lineHeight: 1.9 }}>
              <b>CIP (Continuous Improvement Plan)</b>
              <p>AP(Action Priority) H/M/L 모든 항목에 대해 개선 대상을 추가하고 결과를 관리하는 도구입니다.</p>
              <hr style={{ margin: '6px 0', borderColor: '#e5e7eb' }} />
              <b>구분 (Category)</b>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginTop: 4 }}>
                <tbody>
                  <tr><td style={{ padding: '2px 6px', background: '#fee2e2', color: '#991b1b', fontWeight: 700, width: 60, textAlign: 'center' }}>Field</td><td style={{ padding: '2px 6px' }}>Field Issue (현장 이슈)</td></tr>
                  <tr><td style={{ padding: '2px 6px', background: '#dbeafe', color: '#1d4ed8', fontWeight: 700, textAlign: 'center' }}>PCN</td><td style={{ padding: '2px 6px' }}>Process Change Notice (공정 변경)</td></tr>
                  <tr><td style={{ padding: '2px 6px', background: '#dcfce7', color: '#166534', fontWeight: 700, textAlign: 'center' }}>Yield</td><td style={{ padding: '2px 6px' }}>Yield Improvement (수율 개선)</td></tr>
                  <tr><td style={{ padding: '2px 6px', background: '#fef3c7', color: '#b45309', fontWeight: 700, textAlign: 'center' }}>Quality</td><td style={{ padding: '2px 6px' }}>Quality Issue (품질 이슈)</td></tr>
                </tbody>
              </table>
              <hr style={{ margin: '6px 0', borderColor: '#e5e7eb' }} />
              <b>Status</b>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginTop: 4 }}>
                <tbody>
                  <tr><td style={{ padding: '2px 6px', background: '#92D050', fontWeight: 700, width: 30, textAlign: 'center' }}>G</td><td style={{ padding: '2px 6px' }}>Complete</td></tr>
                  <tr><td style={{ padding: '2px 6px', background: '#FFD966', fontWeight: 700, textAlign: 'center' }}>Y</td><td style={{ padding: '2px 6px' }}>In Progress</td></tr>
                  <tr><td style={{ padding: '2px 6px', background: '#FF6B6B', color: '#fff', fontWeight: 700, textAlign: 'center' }}>R</td><td style={{ padding: '2px 6px' }}>Pending</td></tr>
                </tbody>
              </table>
            </div>
          </HelpIcon>
        </span>
        <div className="flex items-center gap-1.5 shrink-0" onMouseDown={e => e.stopPropagation()}>
          <button
            onClick={() => { setShowAddForm(true); setNewItem({ category: 'Field', failureMode: '', cause: '', improvement: '', responsible: '', targetDate: '', status: 'R' }); }}
            className="flex items-center gap-0.5 px-2 py-0.5 bg-green-600 hover:bg-green-500 text-white font-bold text-[10px] rounded"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
          <button onClick={onClose} className="hover:bg-white/20 p-0.5 rounded">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Context info (prefill) */}
      {prefill && (
        <div className="px-3 py-1 flex items-center gap-2 bg-blue-50 text-[10px] shrink-0 border-b">
          {prefill.apLevel && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: AP_COLORS[prefill.apLevel]?.bg || '#e5e7eb', color: AP_COLORS[prefill.apLevel]?.text || '#333' }}>
              AP={prefill.apLevel}
            </span>
          )}
          {prefill.s != null && <span className="px-1 py-0.5 rounded font-bold" style={{ background: '#fee2e2', color: '#991b1b' }}>S={prefill.s}</span>}
          {prefill.o != null && <span className="px-1 py-0.5 rounded font-bold" style={{ background: '#dcfce7', color: '#166534' }}>O={prefill.o}</span>}
          {prefill.d != null && <span className="px-1 py-0.5 rounded font-bold" style={{ background: '#e0f2fe', color: '#1e40af' }}>D={prefill.d}</span>}
          {prefill.failureMode && <span className="text-gray-600 truncate max-w-[300px]" title={prefill.failureMode}>FM: {prefill.failureMode}</span>}
        </div>
      )}

      {/* Search + Filter */}
      <div className="px-2 py-1 border-b flex items-center gap-2 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            placeholder="CIP No, FM, cause, improvement..."
            className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Filter className="h-3 w-3 text-gray-500" />
          <button
            onClick={() => setCategoryFilter('all')}
            className="px-1.5 py-0.5 text-[10px] rounded font-semibold"
            style={{ background: categoryFilter === 'all' ? '#1565c0' : '#f3f4f6', color: categoryFilter === 'all' ? '#fff' : '#374151' }}
          >
            All({categoryCounts.all})
          </button>
          {CIP_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className="px-1.5 py-0.5 text-[10px] rounded font-semibold"
              style={{
                background: categoryFilter === cat ? CATEGORY_COLORS[cat].text : CATEGORY_COLORS[cat].bg,
                color: categoryFilter === cat ? '#fff' : CATEGORY_COLORS[cat].text,
              }}
            >
              {cat}({categoryCounts[cat] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="px-2 py-1.5 border-b bg-green-50 shrink-0">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[10px] font-bold text-green-700">New CIP Item</span>
          </div>
          <div className="grid grid-cols-12 gap-1">
            <div className="col-span-2">
              <select
                className={inputStyle}
                value={newItem.category || 'Field'}
                onChange={e => setNewItem(prev => ({ ...prev, category: e.target.value }))}
              >
                {CIP_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="col-span-3">
              <input className={inputStyle} placeholder="Failure Mode" value={newItem.failureMode || ''} onChange={e => setNewItem(prev => ({ ...prev, failureMode: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <input className={inputStyle} placeholder="Cause" value={newItem.cause || ''} onChange={e => setNewItem(prev => ({ ...prev, cause: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <input className={inputStyle} placeholder="Improvement" value={newItem.improvement || ''} onChange={e => setNewItem(prev => ({ ...prev, improvement: e.target.value }))} />
            </div>
            <div className="col-span-1">
              <input className={inputStyle} placeholder="Resp." value={newItem.responsible || ''} onChange={e => setNewItem(prev => ({ ...prev, responsible: e.target.value }))} />
            </div>
            <div className="col-span-1">
              <select className={inputStyle} value={newItem.status || 'R'} onChange={e => setNewItem(prev => ({ ...prev, status: e.target.value }))}>
                <option value="R">R</option>
                <option value="Y">Y</option>
                <option value="G">G</option>
              </select>
            </div>
            <div className="col-span-1 flex gap-0.5">
              <button onClick={handleAdd} className="flex-1 px-1 py-0.5 bg-green-600 text-white text-[9px] rounded hover:bg-green-700 font-bold">Save</button>
              <button onClick={() => setShowAddForm(false)} className="px-1 py-0.5 bg-gray-400 text-white text-[9px] rounded hover:bg-gray-500">X</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto px-1 py-0.5">
        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            {items.length === 0 ? (
              <div className="space-y-2">
                <div>No CIP items registered.</div>
                <div className="text-xs">Click <b>+ Add</b> to create a new improvement plan.</div>
              </div>
            ) : 'No matching items.'}
          </div>
        ) : (
          <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className={thStyle} style={{ border: '1px solid #0d47a1', width: 80 }}>CIP No</th>
                <th className={thStyle} style={{ border: '1px solid #0d47a1', width: 35 }}>AP</th>
                <th className={thStyle} style={{ border: '1px solid #0d47a1', width: 65 }}>Category</th>
                <th className={thStyle} style={{ border: '1px solid #0d47a1', minWidth: 120 }}>Failure Mode</th>
                <th className={thStyle} style={{ border: '1px solid #0d47a1', minWidth: 90 }}>Cause</th>
                <th className={thStyle} style={{ border: '1px solid #0d47a1', minWidth: 110 }}>Improvement</th>
                <th className={thStyle} style={{ border: '1px solid #0d47a1', width: 60 }}>Resp.</th>
                <th className={thStyle} style={{ border: '1px solid #0d47a1', width: 75 }}>Target Date</th>
                <th className={thStyle} style={{ border: '1px solid #0d47a1', width: 35 }}>Sts</th>
                <th className={thStyle} style={{ border: '1px solid #0d47a1', width: 55 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, idx) => {
                const isEditing = editingId === item.id;
                const zebraBg = idx % 2 === 0 ? '#fff' : '#f0f7ff';
                const catColor = CATEGORY_COLORS[item.category as CIPCategory];
                const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.R;
                const apColor = AP_COLORS[item.apLevel || ''];

                return (
                  <tr key={item.id} style={{ background: isEditing ? '#fffbeb' : zebraBg }}>
                    <td className={`${tdStyle} text-center font-mono font-bold text-[#1565c0]`} style={{ border: '1px solid #ccc' }}>
                      {item.cipNo}
                    </td>
                    <td className={`${tdStyle} text-center`} style={{ border: '1px solid #ccc' }}>
                      {apColor ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: apColor.bg, color: apColor.text }}>
                          {item.apLevel}
                        </span>
                      ) : <span className="text-gray-300">-</span>}
                    </td>
                    <td className={`${tdStyle} text-center`} style={{ border: '1px solid #ccc' }}>
                      {isEditing ? (
                        <select className={inputStyle} value={editData.category || item.category} onChange={e => setEditData(prev => ({ ...prev, category: e.target.value }))}>
                          {CIP_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      ) : catColor ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: catColor.bg, color: catColor.text }}>
                          {item.category}
                        </span>
                      ) : item.category}
                    </td>
                    <td className={`${tdStyle} text-left`} style={{ border: '1px solid #ccc' }}>
                      {isEditing ? (
                        <input className={inputStyle} value={editData.failureMode ?? item.failureMode} onChange={e => setEditData(prev => ({ ...prev, failureMode: e.target.value }))} />
                      ) : item.failureMode}
                    </td>
                    <td className={`${tdStyle} text-left`} style={{ border: '1px solid #ccc', color: '#555' }}>
                      {isEditing ? (
                        <input className={inputStyle} value={editData.cause ?? item.cause} onChange={e => setEditData(prev => ({ ...prev, cause: e.target.value }))} />
                      ) : item.cause}
                    </td>
                    <td className={`${tdStyle} text-left`} style={{ border: '1px solid #ccc', color: '#1a5276', fontWeight: 500 }}>
                      {isEditing ? (
                        <input className={inputStyle} value={editData.improvement ?? item.improvement} onChange={e => setEditData(prev => ({ ...prev, improvement: e.target.value }))} />
                      ) : item.improvement}
                    </td>
                    <td className={`${tdStyle} text-center`} style={{ border: '1px solid #ccc' }}>
                      {isEditing ? (
                        <input className={inputStyle} value={editData.responsible ?? (item.responsible || '')} onChange={e => setEditData(prev => ({ ...prev, responsible: e.target.value }))} />
                      ) : item.responsible || '-'}
                    </td>
                    <td className={`${tdStyle} text-center`} style={{ border: '1px solid #ccc' }}>
                      {isEditing ? (
                        <input type="date" className={inputStyle} value={editData.targetDate ?? (item.targetDate || '')} onChange={e => setEditData(prev => ({ ...prev, targetDate: e.target.value }))} />
                      ) : item.targetDate || '-'}
                    </td>
                    <td className={`${tdStyle} text-center`} style={{ border: '1px solid #ccc' }}>
                      {isEditing ? (
                        <select className={inputStyle} value={editData.status ?? item.status} onChange={e => setEditData(prev => ({ ...prev, status: e.target.value }))}>
                          <option value="R">R</option>
                          <option value="Y">Y</option>
                          <option value="G">G</option>
                        </select>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: statusColor.bg, color: statusColor.text }}>
                          {item.status}
                        </span>
                      )}
                    </td>
                    <td className={`${tdStyle} text-center`} style={{ border: '1px solid #ccc' }}>
                      {isEditing ? (
                        <div className="flex gap-0.5 justify-center">
                          <button onClick={() => handleUpdate(item.id)} className="px-1 py-0.5 bg-blue-600 text-white text-[8px] rounded hover:bg-blue-700">
                            <Save className="h-2.5 w-2.5" />
                          </button>
                          <button onClick={() => { setEditingId(null); setEditData({}); }} className="px-1 py-0.5 bg-gray-400 text-white text-[8px] rounded hover:bg-gray-500">
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-0.5 justify-center">
                          <button onClick={() => startEdit(item)} className="px-1 py-0.5 bg-gray-200 text-gray-700 text-[8px] rounded hover:bg-gray-300" title="Edit">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="px-1 py-0.5 bg-red-100 text-red-600 text-[8px] rounded hover:bg-red-200" title="Delete">
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="px-2 py-1 border-t bg-gray-50 text-[10px] flex items-center justify-between shrink-0 rounded-b-lg">
        <span className="text-gray-500">Total {items.length} CIP items | Showing {filteredItems.length}</span>
        <div className="flex items-center gap-2">
          {CIP_CATEGORIES.map(cat => {
            const count = categoryCounts[cat] || 0;
            if (count === 0) return null;
            return (
              <span key={cat} className="px-1 py-0 rounded text-[9px] font-bold" style={{ background: CATEGORY_COLORS[cat].bg, color: CATEGORY_COLORS[cat].text }}>
                {cat}: {count}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
