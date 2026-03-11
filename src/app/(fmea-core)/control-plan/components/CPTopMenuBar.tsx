/**
 * @file CPTopMenuBar.tsx
 * @description Control Plan 상단 메뉴바 - PFMEA TopMenuBar와 동일한 구조
 */

'use client';

import React, { useState, RefObject } from 'react';
import { useRouter } from 'next/navigation';

const menuBtn = "px-2 py-1 bg-white/10 border border-white/30 text-white text-xs rounded hover:bg-white/20 transition-all";

interface CPTopMenuBarProps {
  fmeaList: any[];
  currentCpState: any;
  selectedCpId?: string | null;
  dirty: boolean;
  isSaving: boolean;
  lastSaved: string;
  currentTab: string;
  syncMessage: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onCpStateChange: (setState: React.SetStateAction<any>) => void;
  onSyncFromFmea: (fmeaId: string) => void;
  onSave: () => void;
  onExport: () => void;
  onNavigateToList: () => void;
}

export default function CPTopMenuBar({
  fmeaList,
  currentCpState,
  dirty,
  isSaving,
  lastSaved,
  syncMessage,
  onSyncFromFmea,
  onSave,
  onExport,
  onNavigateToList,
}: CPTopMenuBarProps) {
  const router = useRouter();
  const [linkedFmeaId, setLinkedFmeaId] = useState(currentCpState.linkedFmeaId || '');

  const handleFmeaChange = (fmeaId: string) => {
    setLinkedFmeaId(fmeaId);
    if (fmeaId) {
      onSyncFromFmea(fmeaId);
    }
  };

  return (
    <div 
      className="flex items-center gap-2 fixed top-9 left-[53px] right-0 h-8 px-2 z-[99] border-t border-b border-white/30"
      style={{ background: 'linear-gradient(to right, #004d6e, #14b8a6, #004d6e)' }}
    >
      {/* CP명 */}
      <div className="flex items-center gap-1.5">
        <span 
          className="text-white cursor-pointer hover:underline text-xs font-semibold"
          onClick={onNavigateToList}
        >
          📋 CP명:
        </span>
        <input
          type="text"
          value={currentCpState.cpNo || ''}
          readOnly
          placeholder="새 CP"
          className="px-2 py-1 rounded border-0 bg-white/20 text-white min-w-[120px] text-xs"
        />
        <button onClick={onNavigateToList} className="px-2 py-1 text-white rounded hover:bg-white/20 text-xs">
          📋
        </button>
      </div>

      <div className="w-px h-5 bg-white/30" />

      {/* FMEA 연동 */}
      <div className="flex items-center gap-1.5">
        <span className="text-yellow-300 text-xs font-semibold">🔗FMEA연동:</span>
        <select
          value={linkedFmeaId}
          onChange={(e) => handleFmeaChange(e.target.value)}
          className="px-2 py-1 rounded border-0 bg-white/20 text-white min-w-[160px] text-xs"
        >
          <option value="" className="text-gray-800">-- FMEA 선택 --</option>
          {fmeaList.map((fmea: any) => (
            <option key={fmea.id} value={fmea.id} className="text-gray-800">
              {fmea.fmeaInfo?.subject || fmea.project?.productName || fmea.id}
            </option>
          ))}
        </select>
        {linkedFmeaId && (
          <button 
            onClick={() => router.push(`/pfmea/worksheet?id=${linkedFmeaId}`)}
            className="px-2 py-1 bg-yellow-500 text-white rounded text-[10px] hover:bg-yellow-600"
          >
            FMEA열기
          </button>
        )}
      </div>

      <div className="w-px h-5 bg-white/30" />

      {/* 저장/Export */}
      <div className="flex items-center gap-1.5">
        <button 
          onClick={onSave} 
          disabled={isSaving} 
          className={`px-3 py-1 rounded transition-all text-white text-xs font-semibold ${
            isSaving ? 'bg-orange-500' : dirty ? 'bg-green-600' : 'bg-white/15'
          }`}
        >
          {isSaving ? '⏳저장중' : dirty ? '💾저장' : '✅저장됨'}
        </button>
        
        <button onClick={onExport} className={menuBtn}>📤Export</button>
        
        {syncMessage && (
          <span className={`px-3 py-1 rounded text-white text-xs font-semibold ${
            syncMessage.includes('✅') ? 'bg-green-600' : 'bg-red-600'
          }`}>
            {syncMessage}
          </span>
        )}
        
        {lastSaved && (
          <span className="text-white/70 text-[10px]">마지막 저장: {lastSaved}</span>
        )}
      </div>

      <div className="w-px h-5 bg-white/30" />

      {/* 추가 메뉴 */}
      <div className="flex items-center gap-1.5 mr-[290px]">
        <button onClick={() => router.push('/control-plan/register')} className={menuBtn}>📝등록</button>
        <button onClick={() => router.push('/control-plan/list')} className={menuBtn}>📋리스트</button>
        <button onClick={() => router.push('/control-plan/revision')} className={menuBtn}>📜개정관리</button>
        <button onClick={() => router.push('/pfmea/worksheet')} className={`${menuBtn} bg-indigo-600/50`}>📊 FMEA</button>
      </div>

      {/* 우측: CP 요약 - 280px */}
      <div className="flex-1" />
      <div 
        className="absolute right-0 top-0 w-[280px] h-8 flex items-stretch border-l-[2px] border-white"
        style={{ background: 'linear-gradient(to right, #004d6e, #00587a)' }}
      >
        <div className="w-[80px] h-8 flex items-center justify-center border-r border-white/30 shrink-0">
          <span className="text-yellow-400 text-xs font-bold whitespace-nowrap">관리항목:</span>
        </div>
        <div className="w-[100px] h-8 flex items-center justify-center border-r border-white/30 shrink-0">
          <span className="text-white text-xs font-bold whitespace-nowrap">{currentCpState.rows?.length || 0}개</span>
        </div>
        <div className="w-[100px] h-8 flex items-center justify-center shrink-0">
          <span className={`text-xs font-bold whitespace-nowrap ${linkedFmeaId ? 'text-green-300' : 'text-orange-300'}`}>
            {linkedFmeaId ? '🔗연동됨' : '⚠️미연동'}
          </span>
        </div>
      </div>
    </div>
  );
}



















