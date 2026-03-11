/**
 * @file useDeleteSelectDialog.tsx
 * @description 삭제 시 연관 모듈 선택 다이얼로그 훅
 *
 * FMEA 삭제 시 연동된 모듈(CP, PFD, DFMEA, WS, PM)을
 * 개별적으로 선택하여 삭제할 수 있는 다이얼로그.
 * APQP는 부모 모듈이므로 자식에서 삭제 불가.
 *
 * @usage
 * const { deleteSelectDialog, DeleteSelectDialogUI } = useDeleteSelectDialog();
 * const result = await deleteSelectDialog({
 *   fmeaId: 'pfm26-f001-l01',
 *   linkedModules: [{ type: 'CP', id: 'cp-001', status: 'draft', approved: false }],
 * });
 * if (!result) return; // 취소
 * // result.selectedModules = ['FMEA', 'CP', 'PFD']
 *
 * @version 1.0.0
 * @created 2026-02-16
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';

export interface LinkedModuleInfo {
  type: 'CP' | 'PFD' | 'APQP' | 'PFMEA' | 'DFMEA' | 'WS' | 'PM';
  id: string;
  status: string;
  approved: boolean;
}

export interface DeleteSelectOptions {
  fmeaIds: string[];
  linkedModules: LinkedModuleInfo[];
}

export interface DeleteSelectResult {
  selectedModules: string[]; // ['FMEA', 'CP', 'PFD', ...]
}

type ModuleKey = 'FMEA' | 'CP' | 'PFD' | 'DFMEA' | 'PFMEA' | 'WS' | 'PM';

const MODULE_LABELS: Record<string, { label: string; color: string }> = {
  FMEA: { label: 'FMEA', color: '#2563eb' },
  CP: { label: 'CP (관리계획서)', color: '#059669' },
  PFD: { label: 'PFD (공정흐름도)', color: '#7c3aed' },
  DFMEA: { label: 'DFMEA', color: '#dc2626' },
  PFMEA: { label: 'PFMEA', color: '#dc2626' },
  WS: { label: 'WS (작업표준서)', color: '#d97706' },
  PM: { label: 'PM (예방보전)', color: '#0891b2' },
  APQP: { label: 'APQP (부모 모듈)', color: '#6b7280' },
};

interface DialogState {
  open: boolean;
  options: DeleteSelectOptions | null;
}

export function useDeleteSelectDialog() {
  const [state, setState] = useState<DialogState>({ open: false, options: null });
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [showHelp, setShowHelp] = useState(false);
  const resolveRef = useRef<((value: DeleteSelectResult | null) => void) | null>(null);

  const deleteSelectDialog = useCallback((options: DeleteSelectOptions): Promise<DeleteSelectResult | null> => {
    return new Promise<DeleteSelectResult | null>((resolve) => {
      resolveRef.current = resolve;

      // 초기 체크 상태: FMEA는 항상 체크, 나머지는 체크
      const initial: Record<string, boolean> = { FMEA: true };
      const moduleTypes = new Set<string>();
      for (const m of options.linkedModules) {
        if (m.type !== 'APQP' && !m.approved) {
          moduleTypes.add(m.type);
        }
      }
      for (const t of moduleTypes) {
        initial[t] = true;
      }
      setChecked(initial);
      setState({ open: true, options });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    const selectedModules = Object.entries(checked)
      .filter(([, v]) => v)
      .map(([k]) => k);
    setState({ open: false, options: null });
    resolveRef.current?.({ selectedModules });
    resolveRef.current = null;
  }, [checked]);

  const handleCancel = useCallback(() => {
    setState({ open: false, options: null });
    resolveRef.current?.(null);
    resolveRef.current = null;
  }, []);

  const toggleModule = useCallback((key: string) => {
    if (key === 'FMEA') return; // FMEA는 항상 삭제
    setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const toggleAll = useCallback(() => {
    setChecked(prev => {
      const moduleKeys = Object.keys(prev).filter(k => k !== 'FMEA');
      const allChecked = moduleKeys.every(k => prev[k]);
      const next: Record<string, boolean> = { FMEA: true };
      for (const k of moduleKeys) {
        next[k] = !allChecked;
      }
      return next;
    });
  }, []);

  const DeleteSelectDialogUI = useCallback(() => {
    if (!state.open || !state.options) return null;

    const { fmeaIds, linkedModules } = state.options;

    // 모듈 유형별 그룹핑
    const moduleGroups: Record<string, LinkedModuleInfo[]> = {};
    for (const m of linkedModules) {
      if (!moduleGroups[m.type]) moduleGroups[m.type] = [];
      moduleGroups[m.type].push(m);
    }

    // 삭제 가능한 모듈 키 (APQP 제외, 승인된 것 제외)
    const selectableKeys = Object.keys(checked).filter(k => k !== 'FMEA');
    const allChecked = selectableKeys.length > 0 && selectableKeys.every(k => checked[k]);
    const selectedCount = Object.values(checked).filter(v => v).length;

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
          animation: 'dsd-fade-in 0.15s ease-out',
        }}
        onClick={handleCancel}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: '20px 24px',
            minWidth: 380,
            maxWidth: 500,
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            fontFamily: 'Malgun Gothic, sans-serif',
            animation: 'dsd-zoom-in 0.15s ease-out',
          }}
        >
          {/* 제목 */}
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>
            🗑️ 삭제 항목 선택
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 12 }}>
            {fmeaIds.length === 1
              ? `${fmeaIds[0]} 삭제 시 연동 모듈을 선택하세요.`
              : `${fmeaIds.length}개 FMEA 삭제 시 연동 모듈을 선택하세요.`}
          </div>

          {/* 전체 선택 */}
          {selectableKeys.length > 0 && (
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 8px',
                marginBottom: 4,
                borderRadius: 6,
                backgroundColor: '#f3f4f6',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
              }}
              onClick={toggleAll}
            >
              <input
                type="checkbox"
                checked={allChecked}
                onChange={toggleAll}
                onClick={e => e.stopPropagation()}
                style={{ width: 15, height: 15, accentColor: '#dc2626' }}
              />
              전체 선택 (연동 모듈 포함 삭제)
            </label>
          )}

          {/* 모듈 목록 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 12 }}>
            {/* FMEA 자체 (항상 체크, 비활성) */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '5px 8px 5px 24px',
                borderRadius: 4,
                backgroundColor: '#eff6ff',
                fontSize: 12,
                color: '#1e40af',
                fontWeight: 600,
              }}
            >
              <input
                type="checkbox"
                checked={true}
                disabled
                style={{ width: 14, height: 14, accentColor: '#2563eb' }}
              />
              FMEA ({fmeaIds.join(', ')})
              <span style={{ fontSize: 10, color: '#6b7280', marginLeft: 'auto' }}>필수</span>
            </label>

            {/* 연동 모듈 (선택 가능) */}
            {Object.entries(moduleGroups).map(([type, modules]) => {
              const info = MODULE_LABELS[type] || { label: type, color: '#6b7280' };
              const isApqp = type === 'APQP';
              const hasApproved = modules.some(m => m.approved);
              const isDisabled = isApqp || hasApproved;
              const isChecked = isApqp ? false : (checked[type] || false);

              return (
                <label
                  key={type}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    padding: '5px 8px 5px 24px',
                    borderRadius: 4,
                    backgroundColor: isDisabled ? '#f9fafb' : (isChecked ? '#fef2f2' : '#fff'),
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.6 : 1,
                    fontSize: 12,
                  }}
                  onClick={e => { if (!isDisabled) { e.preventDefault(); toggleModule(type); } }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isDisabled}
                    onChange={() => { if (!isDisabled) toggleModule(type); }}
                    onClick={e => e.stopPropagation()}
                    style={{ width: 14, height: 14, marginTop: 1, accentColor: info.color }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: isDisabled ? '#9ca3af' : '#374151' }}>
                      {info.label}
                    </div>
                    <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>
                      {modules.map(m => `${m.id} (${m.status})`).join(', ')}
                    </div>
                    {isApqp && (
                      <div style={{ fontSize: 10, color: '#ef4444', marginTop: 1 }}>
                        부모 모듈 — 하위에서 삭제 불가
                      </div>
                    )}
                    {hasApproved && !isApqp && (
                      <div style={{ fontSize: 10, color: '#ef4444', marginTop: 1 }}>
                        승인 완료 — 삭제 불가
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          {/* 도움말 토글 */}
          <div style={{ marginBottom: 10 }}>
            <button
              onClick={() => setShowHelp(prev => !prev)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 11,
                color: '#6b7280',
                padding: '2px 0',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span style={{ fontSize: 13 }}>❓</span>
              <span style={{ textDecoration: 'underline' }}>
                {showHelp ? '도움말 닫기' : '삭제 도움말'}
              </span>
              <span style={{ fontSize: 9, transform: showHelp ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>▼</span>
            </button>
            {showHelp && (
              <div
                style={{
                  marginTop: 6,
                  padding: '10px 12px',
                  backgroundColor: '#f0f9ff',
                  borderRadius: 6,
                  border: '1px solid #bae6fd',
                  fontSize: 11,
                  lineHeight: 1.7,
                  color: '#1e3a5f',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4, color: '#0c4a6e' }}>
                  FMEA 삭제 안내
                </div>
                <div><b>FMEA</b> — 선택한 FMEA는 항상 삭제됩니다 (필수).</div>
                <div><b>CP</b> — 연동된 관리계획서. 체크 시 함께 삭제됩니다.</div>
                <div><b>PFD</b> — 연동된 공정흐름도. 체크 시 함께 삭제됩니다.</div>
                <div><b>DFMEA/PFMEA</b> — 연동된 상대편 FMEA. 체크 시 함께 삭제됩니다.</div>
                <div><b>WS</b> — 연동된 작업표준서. 체크 시 함께 삭제됩니다.</div>
                <div><b>PM</b> — 연동된 예방보전. 체크 시 함께 삭제됩니다.</div>
                <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px dashed #93c5fd' }}>
                  <div style={{ color: '#b91c1c' }}>⛔ <b>승인 완료</b> 모듈은 삭제할 수 없습니다.</div>
                  <div style={{ color: '#6b7280' }}>🔒 <b>APQP</b>는 부모 모듈이므로 하위에서 삭제 불가합니다. APQP 리스트에서 삭제하세요.</div>
                  <div style={{ color: '#059669', marginTop: 2 }}>♻️ 삭제된 항목은 <b>휴지통</b>에서 복원할 수 있습니다.</div>
                </div>
              </div>
            )}
          </div>

          {/* 버튼 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              onClick={handleCancel}
              style={{
                padding: '7px 18px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                border: '1px solid #d1d5db',
                backgroundColor: '#f9fafb',
                color: '#374151',
                cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#f9fafb')}
            >
              취소
            </button>
            <button
              onClick={handleConfirm}
              style={{
                padding: '7px 18px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                border: 'none',
                backgroundColor: '#dc2626',
                color: 'white',
                cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#b91c1c')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#dc2626')}
            >
              선택 항목 삭제 ({selectedCount}개 모듈)
            </button>
          </div>
        </div>

        <style>{`
          @keyframes dsd-fade-in {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          @keyframes dsd-zoom-in {
            from { opacity: 0; transform: scale(0.95); }
            to   { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    );
  }, [state, checked, showHelp, handleConfirm, handleCancel, toggleModule, toggleAll]);

  return { deleteSelectDialog, DeleteSelectDialogUI };
}
