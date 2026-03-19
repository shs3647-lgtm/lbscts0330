/**
 * @file page.tsx
 * @description Part FMEA 신규 생성 페이지
 * - 모드 선택: Master F/F 참조 / 독립 작성
 * - POST /api/part-fmea/create
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FixedLayout } from '@/components/layout';
import PartFmeaTopNav from '../components/PartFmeaTopNav';
import { toast } from '@/hooks/useToast';

// ─── 타입 ───

interface FamilyMasterOption {
  id: string;
  name: string;
  familyMaster?: { id: string };
}

interface ProcessOption {
  id: string;
  processNo: string;
  processName: string;
}

type SourceMode = 'FAMILY_REF' | 'INDEPENDENT';

interface FormData {
  sourceMode: SourceMode;
  sourceFamilyMasterId: string;
  sourceProcessNos: string[];
  customerName: string;
  productName: string;
  authorName: string;
  description: string;
}

const INITIAL_FORM: FormData = {
  sourceMode: 'FAMILY_REF',
  sourceFamilyMasterId: '',
  sourceProcessNos: [],
  customerName: '',
  productName: '',
  authorName: '',
  description: '',
};

// ─── 메인 페이지 ───

export default function PartFmeaCreatePage() {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [masterOptions, setMasterOptions] = useState<FamilyMasterOption[]>([]);
  const [processOptions, setProcessOptions] = useState<ProcessOption[]>([]);
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
    const selected = masterOptions.find((m) => m.id === masterId);
    const fmId = selected?.familyMaster?.id || masterId;
    setForm((prev) => ({ ...prev, sourceFamilyMasterId: fmId, sourceProcessNos: [] }));
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

  const toggleProcessNo = (processNo: string) => {
    setForm((prev) => {
      const exists = prev.sourceProcessNos.includes(processNo);
      return {
        ...prev,
        sourceProcessNos: exists
          ? prev.sourceProcessNos.filter((p) => p !== processNo)
          : [...prev.sourceProcessNos, processNo],
      };
    });
  };

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName.trim()) {
      toast.error('고객사명을 입력하세요.');
      return;
    }
    if (!form.productName.trim()) {
      toast.error('제품명을 입력하세요.');
      return;
    }
    if (!form.authorName.trim()) {
      toast.error('담당자명을 입력하세요.');
      return;
    }
    if (form.sourceMode === 'FAMILY_REF' && !form.sourceFamilyMasterId) {
      toast.error('Master F/F를 선택하세요.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/part-fmea/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `API 오류: ${res.status}`);
      }
      const data = await res.json();
      toast.success('Part FMEA가 생성되었습니다.');
      window.location.href = `/part-fmea/${data.id}`;
    } catch (error) {
      console.error('Part FMEA 생성 실패:', error);
      toast.error(error instanceof Error ? error.message : 'Part FMEA 생성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FixedLayout>
      <PartFmeaTopNav />
      <div className="pt-10 px-4 pb-4">
        <h1 className="text-lg font-bold text-gray-800 mb-4">새 Part FMEA 생성</h1>

        <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
          {/* 모드 선택 */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              작성 모드 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="sourceMode"
                  checked={form.sourceMode === 'FAMILY_REF'}
                  onChange={() => setForm((prev) => ({ ...prev, sourceMode: 'FAMILY_REF' }))}
                  className="w-3.5 h-3.5"
                />
                <span className="text-xs">
                  <span className="font-semibold text-blue-700">Master F/F 참조</span>
                  <span className="text-gray-500 ml-1">(기존 Family FMEA 기반)</span>
                </span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="sourceMode"
                  checked={form.sourceMode === 'INDEPENDENT'}
                  onChange={() => setForm((prev) => ({ ...prev, sourceMode: 'INDEPENDENT' }))}
                  className="w-3.5 h-3.5"
                />
                <span className="text-xs">
                  <span className="font-semibold text-orange-700">독립 작성</span>
                  <span className="text-gray-500 ml-1">(처음부터 새로 작성)</span>
                </span>
              </label>
            </div>
          </div>

          {/* 참조모드 전용 필드 */}
          {form.sourceMode === 'FAMILY_REF' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Master F/F <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.sourceFamilyMasterId}
                  onChange={(e) => handleMasterChange(e.target.value)}
                  disabled={loadingMasters}
                  className="w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-red-500 disabled:bg-gray-100"
                >
                  <option value="">{loadingMasters ? '로딩 중...' : '-- Master F/F 선택 --'}</option>
                  {masterOptions.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* 공정 멀티셀렉트 */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">공정 선택 (복수 가능)</label>
                {loadingProcesses ? (
                  <div className="text-xs text-gray-400 py-2">로딩 중...</div>
                ) : processOptions.length === 0 ? (
                  <div className="text-xs text-gray-400 py-2">
                    {form.sourceFamilyMasterId ? '공정 없음' : 'Master를 먼저 선택하세요'}
                  </div>
                ) : (
                  <div className="border rounded p-2 max-h-40 overflow-y-auto space-y-1">
                    {processOptions.map((p) => (
                      <label key={p.id} className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 px-1 rounded">
                        <input
                          type="checkbox"
                          checked={form.sourceProcessNos.includes(p.processNo)}
                          onChange={() => toggleProcessNo(p.processNo)}
                          className="w-3 h-3"
                        />
                        <span className="text-xs">
                          <span className="font-mono text-blue-600">{p.processNo}</span>
                          <span className="ml-1 text-gray-700">{p.processName}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* 공통 필드 */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              고객사 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.customerName}
              onChange={(e) => updateField('customerName', e.target.value)}
              placeholder="고객사명 입력"
              className="w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              제품명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.productName}
              onChange={(e) => updateField('productName', e.target.value)}
              placeholder="제품명 입력"
              className="w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              담당자 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.authorName}
              onChange={(e) => updateField('authorName', e.target.value)}
              placeholder="담당자명 입력"
              className="w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">설명</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="설명 입력 (선택사항)"
              rows={3}
              className="w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 text-xs bg-red-700 text-white rounded hover:bg-red-800 disabled:bg-gray-400 transition-colors font-semibold"
            >
              {submitting ? '생성 중...' : '생성'}
            </button>
            <button
              type="button"
              onClick={() => { window.location.href = '/part-fmea'; }}
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
