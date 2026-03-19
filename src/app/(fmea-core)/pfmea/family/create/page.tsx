/**
 * @file page.tsx
 * @description Family FMEA 신규 생성 페이지
 * - Master FMEA / 공정 드롭다운 연동
 * - POST /api/family-fmea/create
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FixedLayout } from '@/components/layout';
import FamilyTopNav from '../components/FamilyTopNav';
import { toast } from '@/hooks/useToast';

// ─── 타입 ───

interface MasterFmeaOption {
  id: string;
  name: string;
  familyMaster?: { id: string };
}

interface MasterProcessOption {
  id: string;
  processNo: string;
  processName: string;
}

interface FormData {
  familyMasterId: string;
  masterProcessId: string;
  processName: string;
  description: string;
  authorName: string;
}

const INITIAL_FORM: FormData = {
  familyMasterId: '',
  masterProcessId: '',
  processName: '',
  description: '',
  authorName: '',
};

// ─── 메인 페이지 ───

export default function FamilyFmeaCreatePage() {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [masterOptions, setMasterOptions] = useState<MasterFmeaOption[]>([]);
  const [processOptions, setProcessOptions] = useState<MasterProcessOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingMasters, setLoadingMasters] = useState(true);
  const [loadingProcesses, setLoadingProcesses] = useState(false);

  // Master FMEA 목록 로드
  useEffect(() => {
    const loadMasters = async () => {
      try {
        const res = await fetch('/api/master-fmea');
        if (!res.ok) throw new Error(`API 오류: ${res.status}`);
        const data = await res.json();
        setMasterOptions(data.data || []);
      } catch (error) {
        console.error('Master FMEA 목록 로드 실패:', error);
        toast.error('Master FMEA 목록을 불러오는데 실패했습니다.');
      } finally {
        setLoadingMasters(false);
      }
    };
    loadMasters();
  }, []);

  // Master 선택 시 공정 목록 로드
  const handleMasterChange = useCallback(async (masterId: string) => {
    // masterId = MasterFmea.id → FamilyMaster.id를 찾아서 form에 저장
    const selected = masterOptions.find((m) => m.id === masterId);
    const fmId = selected?.familyMaster?.id || masterId;
    setForm((prev) => ({ ...prev, familyMasterId: fmId, masterProcessId: '' }));
    if (!masterId) {
      setProcessOptions([]);
      return;
    }
    try {
      setLoadingProcesses(true);
      const res = await fetch(`/api/master-fmea/${masterId}/processes`);
      if (!res.ok) throw new Error(`API 오류: ${res.status}`);
      const data = await res.json();
      setProcessOptions(data.data || []);
    } catch (error) {
      console.error('공정 목록 로드 실패:', error);
      toast.error('공정 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoadingProcesses(false);
    }
  }, []);

  // 공정 선택 시 자동 입력
  const handleProcessChange = (processId: string) => {
    const selected = processOptions.find((p) => p.id === processId);
    setForm((prev) => ({
      ...prev,
      masterProcessId: processId,
      processName: selected ? selected.processName : prev.processName,
    }));
  };

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.familyMasterId) {
      toast.error('Master FMEA를 선택하세요.');
      return;
    }
    if (!form.processName.trim()) {
      toast.error('공정명을 입력하세요.');
      return;
    }
    if (!form.authorName.trim()) {
      toast.error('담당자명을 입력하세요.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/family-fmea/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `API 오류: ${res.status}`);
      }
      const data = await res.json();
      toast.success('Family FMEA가 생성되었습니다.');
      window.location.href = `/pfmea/family/${data.id}`;
    } catch (error) {
      console.error('Family FMEA 생성 실패:', error);
      toast.error(error instanceof Error ? error.message : 'Family FMEA 생성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FixedLayout>
      <FamilyTopNav />
      <div className="pt-10 px-4 pb-4">
        <h1 className="text-lg font-bold text-gray-800 mb-4">새 Family FMEA 생성</h1>

        <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
          {/* Master FMEA 선택 */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Master FMEA <span className="text-red-500">*</span>
            </label>
            <select
              value={form.familyMasterId}
              onChange={(e) => handleMasterChange(e.target.value)}
              disabled={loadingMasters}
              className="w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">{loadingMasters ? '로딩 중...' : '-- Master FMEA 선택 --'}</option>
              {masterOptions.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* 공정 선택 */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">공정</label>
            <select
              value={form.masterProcessId}
              onChange={(e) => handleProcessChange(e.target.value)}
              disabled={!form.familyMasterId || loadingProcesses}
              className="w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">
                {loadingProcesses ? '로딩 중...' : form.familyMasterId ? '-- 공정 선택 (선택사항) --' : '-- Master를 먼저 선택하세요 --'}
              </option>
              {processOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.processNo} - {p.processName}
                </option>
              ))}
            </select>
          </div>

          {/* 공정명 */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              공정명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.processName}
              onChange={(e) => updateField('processName', e.target.value)}
              placeholder="공정명 입력"
              className="w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">설명</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="설명 입력 (선택사항)"
              rows={3}
              className="w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* 담당자 */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              담당자 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.authorName}
              onChange={(e) => updateField('authorName', e.target.value)}
              placeholder="담당자명 입력"
              className="w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-semibold"
            >
              {submitting ? '생성 중...' : '생성'}
            </button>
            <button
              type="button"
              onClick={() => { window.location.href = '/pfmea/family'; }}
              className="px-4 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border transition-colors"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </FixedLayout>
  );
}
