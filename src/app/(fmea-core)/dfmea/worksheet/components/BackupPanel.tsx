/**
 * @file BackupPanel.tsx
 * @description FMEA 프로젝트별 백업 관리 플로팅 패널
 * - 자동/수동 백업 목록 표시
 * - 수동 백업 생성 (메모 입력)
 * - 원클릭 복원 (confirm 다이얼로그)
 * - 스냅샷 삭제
 * @created 2026-02-23
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { WorksheetState } from '../constants';
import {
  createSnapshot,
  listSnapshots,
  restoreSnapshot,
  deleteSnapshot,
  type SnapshotMetadata,
  type SnapshotListResponse,
} from '@/lib/backup/snapshot-manager';

// ============================================================================
// Props
// ============================================================================

interface BackupPanelProps {
  isOpen: boolean;
  onClose: () => void;
  fmeaId: string;
  state: WorksheetState;
}

// ============================================================================
// 날짜 포맷
// ============================================================================

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function triggerLabel(t: string): string {
  switch (t) {
    case 'AUTO_CONFIRM': return '확정 자동(Auto Confirm)';
    case 'AUTO_PERIODIC': return '주기적 자동(Auto Periodic)';
    case 'MANUAL': return '수동(Manual)';
    case 'RESTORE': return '복원 전 백업(Pre-Restore)';
    default: return t;
  }
}

// ============================================================================
// 컴포넌트
// ============================================================================

export default function BackupPanel({ isOpen, onClose, fmeaId, state }: BackupPanelProps) {
  const [tab, setTab] = useState<'auto' | 'manual'>('auto');
  const [snapshots, setSnapshots] = useState<SnapshotMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // 드래그 상태
  const [pos, setPos] = useState({ x: 100, y: 80 });
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0 });

  // ============================================================================
  // 스냅샷 목록 로드
  // ============================================================================

  const loadSnapshots = useCallback(async () => {
    if (!fmeaId) return;
    setLoading(true);
    try {
      const result: SnapshotListResponse = await listSnapshots(fmeaId);
      setSnapshots(result.snapshots || []);
    } catch (e) {
      console.error('[BackupPanel] 목록 로드 실패:', e);
    } finally {
      setLoading(false);
    }
  }, [fmeaId]);

  useEffect(() => {
    if (isOpen && fmeaId) loadSnapshots();
  }, [isOpen, fmeaId, loadSnapshots]);

  // ============================================================================
  // 수동 백업 생성
  // ============================================================================

  const handleCreateManual = useCallback(async () => {
    if (!fmeaId || creating) return;
    setCreating(true);
    try {
      const result = await createSnapshot(fmeaId, state, 'MANUAL', note || '수동 백업(Manual Backup)');
      if (result?.success) {
        setNote('');
        await loadSnapshots();
        alert(`수동 백업 생성 완료(Manual backup created) (v${result.version})`);
      } else {
        alert('백업 생성 실패(Backup creation failed)');
      }
    } catch (e) {
      console.error('[BackupPanel] 수동 백업 실패:', e);
      alert('백업 생성 중 오류 발생(Error during backup creation)');
    } finally {
      setCreating(false);
    }
  }, [fmeaId, state, note, creating, loadSnapshots]);

  // ============================================================================
  // 복원
  // ============================================================================

  const handleRestore = useCallback(async (version: string) => {
    if (!fmeaId) return;
    const confirmed = window.confirm(
      `v${version} 백업을 복원하시겠습니까?(Restore backup v${version}?)\n\n현재 데이터는 자동으로 백업된 후 복원됩니다.\n(Current data will be auto-backed up before restore.)\n복원 후 페이지가 새로고침됩니다.(Page will reload after restore.)`
    );
    if (!confirmed) return;

    setRestoring(version);
    try {
      const result = await restoreSnapshot(fmeaId, version);
      if (result.success) {
        alert(`v${version} 복원 완료(Restore complete). 페이지를 새로고침합니다.(Reloading page.)`);
        window.location.reload();
      } else {
        alert(`복원 실패(Restore failed): ${result.message}`);
      }
    } catch (e) {
      console.error('[BackupPanel] 복원 실패:', e);
      alert('복원 중 오류 발생(Error during restore)');
    } finally {
      setRestoring(null);
    }
  }, [fmeaId]);

  // ============================================================================
  // 삭제
  // ============================================================================

  const handleDelete = useCallback(async (version: string) => {
    if (!fmeaId) return;
    const confirmed = window.confirm(`v${version} 백업을 삭제하시겠습니까?(Delete backup v${version}?)`);
    if (!confirmed) return;

    const ok = await deleteSnapshot(fmeaId, version);
    if (ok) {
      await loadSnapshots();
    } else {
      alert('삭제 실패(Delete failed)');
    }
  }, [fmeaId, loadSnapshots]);

  // ============================================================================
  // 드래그
  // ============================================================================

  const onDragStart = useCallback((e: React.MouseEvent) => {
    dragRef.current = { dragging: true, startX: e.clientX - pos.x, startY: e.clientY - pos.y };
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
  }, [pos]);

  const onDragMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current.dragging) return;
    setPos({ x: e.clientX - dragRef.current.startX, y: e.clientY - dragRef.current.startY });
  }, []);

  const onDragEnd = useCallback(() => {
    dragRef.current.dragging = false;
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
  }, [onDragMove]);

  // ============================================================================
  // 필터링
  // ============================================================================

  const filtered = snapshots.filter(s => {
    if (tab === 'auto') return s.version.startsWith('A.') || s.triggerType === 'RESTORE';
    return s.version.startsWith('M.');
  });

  const autoCount = snapshots.filter(s => s.version.startsWith('A.')).length;
  const manualCount = snapshots.filter(s => s.version.startsWith('M.')).length;

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: 420,
        maxHeight: 560,
        zIndex: 99998,
        background: '#fff',
        border: '2px solid #1565c0',
        borderRadius: 8,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Malgun Gothic', sans-serif",
      }}
    >
      {/* 헤더 (드래그 가능) */}
      <div
        onMouseDown={onDragStart}
        style={{
          background: '#1565c0',
          color: '#fff',
          padding: '8px 12px',
          borderRadius: '6px 6px 0 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'move',
          userSelect: 'none',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 13 }}>백업 관리(Backup Management)</span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}
        >
          ×
        </button>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0' }}>
        {(['auto', 'manual'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: '6px 0',
              fontSize: 12,
              fontWeight: tab === t ? 700 : 400,
              color: tab === t ? '#1565c0' : '#666',
              background: tab === t ? '#e3f2fd' : '#fff',
              border: 'none',
              borderBottom: tab === t ? '2px solid #1565c0' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            {t === 'auto' ? `자동 백업(Auto Backup) (${autoCount})` : `수동 백업(Manual Backup) (${manualCount})`}
          </button>
        ))}
      </div>

      {/* 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 200, maxHeight: 340 }}>
        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 12 }}>로딩 중...(Loading...)</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 12 }}>백업 없음(No backups)</div>
        ) : (
          filtered.map(snap => (
            <div
              key={snap.version}
              style={{
                padding: '8px 12px',
                borderBottom: '1px solid #f0f0f0',
                fontSize: 11,
              }}
            >
              {/* 상단: 버전 + 날짜 + 트리거 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <div>
                  <span style={{ fontWeight: 700, color: '#1565c0' }}>{snap.version}</span>
                  <span style={{ color: '#888', marginLeft: 8 }}>{formatDate(snap.createdAt)}</span>
                </div>
                <span style={{
                  fontSize: 10,
                  padding: '1px 6px',
                  borderRadius: 3,
                  background: snap.version.startsWith('M.') ? '#e8f5e9' : snap.triggerType === 'RESTORE' ? '#fff3e0' : '#e3f2fd',
                  color: snap.version.startsWith('M.') ? '#2e7d32' : snap.triggerType === 'RESTORE' ? '#e65100' : '#1565c0',
                }}>
                  {triggerLabel(snap.triggerType)}
                </span>
              </div>

              {/* 메모 + 크기 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#666' }}>
                <span>{snap.changeNote || ''}</span>
                <span style={{ fontSize: 10, color: '#aaa' }}>{formatSize(snap.dataSize)}</span>
              </div>

              {/* 버튼 */}
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <button
                  onClick={() => handleRestore(snap.version)}
                  disabled={restoring === snap.version}
                  style={{
                    padding: '2px 10px',
                    fontSize: 10,
                    border: '1px solid #1565c0',
                    borderRadius: 3,
                    background: '#fff',
                    color: '#1565c0',
                    cursor: 'pointer',
                    opacity: restoring === snap.version ? 0.5 : 1,
                  }}
                >
                  {restoring === snap.version ? '복원 중...(Restoring...)' : '복원(Restore)'}
                </button>
                <button
                  onClick={() => handleDelete(snap.version)}
                  style={{
                    padding: '2px 10px',
                    fontSize: 10,
                    border: '1px solid #e53935',
                    borderRadius: 3,
                    background: '#fff',
                    color: '#e53935',
                    cursor: 'pointer',
                  }}
                >
                  삭제(Delete)
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 하단: 수동 백업 생성 */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid #e0e0e0', background: '#fafafa' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="백업 메모(Backup note) (선택/optional)"
            style={{
              flex: 1,
              padding: '4px 8px',
              fontSize: 11,
              border: '1px solid #ccc',
              borderRadius: 3,
              outline: 'none',
            }}
            onKeyDown={e => { if (e.key === 'Enter') handleCreateManual(); }}
          />
          <button
            onClick={handleCreateManual}
            disabled={creating}
            style={{
              padding: '4px 12px',
              fontSize: 11,
              fontWeight: 700,
              border: 'none',
              borderRadius: 3,
              background: '#1565c0',
              color: '#fff',
              cursor: creating ? 'not-allowed' : 'pointer',
              opacity: creating ? 0.6 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {creating ? '생성 중...(Creating...)' : '수동 백업(Manual)'}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '4px 10px',
              fontSize: 11,
              border: '1px solid #ccc',
              borderRadius: 3,
              background: '#fff',
              color: '#666',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
