/**
 * @file /apqp/register/page.tsx
 * @description APQP 프로젝트 등록/수정 — 독립 라우트 (dynamic import, ssr: false)
 *
 * ★★★ 설계 원칙 ★★★
 * 1. 경량 등록 폼 — 간트차트/대시보드 미포함
 * 2. next/dynamic + Suspense → DFMEA와 동시 렌더링 방지
 * 3. APQP ↔ FMEA/CP/PFD 연동 ID 관리
 *
 * @created 2026-04-03
 */

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { FixedLayout } from '@/components/layout';
import { toast } from '@/hooks/useToast';

const APQPTopNav = dynamic(() => import('@/components/layout/APQPTopNav'), { ssr: false });

interface ApqpFormData {
  apqpNo: string;
  subject: string;
  productName: string;
  customerName: string;
  companyName: string;
  modelYear: string;
  partNo: string;
  apqpResponsibleName: string;
  engineeringLocation: string;
  linkedFmea: string;
  linkedDfmea: string;
  linkedCp: string;
  linkedPfd: string;
}

const EMPTY_FORM: ApqpFormData = {
  apqpNo: '', subject: '', productName: '', customerName: '', companyName: '',
  modelYear: '', partNo: '', apqpResponsibleName: '', engineeringLocation: '',
  linkedFmea: '', linkedDfmea: '', linkedCp: '', linkedPfd: '',
};

function APQPRegisterContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get('id');

  const [form, setForm] = useState<ApqpFormData>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isEdit = !!editId;

  // 수정 모드: 기존 데이터 로드
  useEffect(() => {
    if (!editId) return;
    setIsLoading(true);
    fetch(`/api/apqp?apqpNo=${encodeURIComponent(editId)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.apqp) {
          const a = data.apqp;
          setForm({
            apqpNo: a.apqpNo || '',
            subject: a.subject || '',
            productName: a.productName || '',
            customerName: a.customerName || '',
            companyName: a.companyName || '',
            modelYear: a.modelYear || '',
            partNo: a.partNo || '',
            apqpResponsibleName: a.apqpResponsibleName || '',
            engineeringLocation: a.engineeringLocation || '',
            linkedFmea: a.linkedFmea || '',
            linkedDfmea: a.linkedDfmea || '',
            linkedCp: a.linkedCp || '',
            linkedPfd: a.linkedPfd || '',
          });
        }
      })
      .catch(() => toast.error('APQP 정보 로드 실패'))
      .finally(() => setIsLoading(false));
  }, [editId]);

  const handleChange = (field: keyof ApqpFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.subject.trim()) {
      toast.warn('프로젝트명을 입력해주세요.');
      return;
    }
    setIsSaving(true);
    try {
      const body = {
        apqpNo: form.apqpNo || undefined,
        apqpInfo: {
          subject: form.subject,
          productName: form.productName || form.subject,
          customerName: form.customerName,
          companyName: form.companyName,
          modelYear: form.modelYear,
          partNo: form.partNo,
          apqpResponsibleName: form.apqpResponsibleName,
          engineeringLocation: form.engineeringLocation,
        },
        linkedFmea: form.linkedFmea || null,
        linkedDfmea: form.linkedDfmea || null,
        linkedCp: form.linkedCp || null,
        linkedPfd: form.linkedPfd || null,
      };

      const res = await fetch('/api/apqp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`APQP 프로젝트 ${isEdit ? '수정' : '등록'} 완료 (${data.apqpNo})`);
        router.push('/apqp/list');
      } else {
        toast.error(data.error || '저장 실패');
      }
    } catch (e) {
      toast.error('네트워크 오류');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <FixedLayout topNav={<APQPTopNav selectedProjectId={editId} />} topNavHeight={48} showSidebar={true} contentPadding="p-0">
        <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      </FixedLayout>
    );
  }

  const Field = ({ label, field, placeholder, half }: { label: string; field: keyof ApqpFormData; placeholder?: string; half?: boolean }) => (
    <div className={half ? 'w-1/2' : 'w-full'}>
      <label className="text-[11px] font-semibold text-gray-600 block mb-0.5">{label}</label>
      <input
        value={form[field]}
        onChange={e => handleChange(field, e.target.value)}
        placeholder={placeholder || `${label} 입력`}
        className="w-full px-2 py-1 text-[12px] border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
      />
    </div>
  );

  return (
    <FixedLayout topNav={<APQPTopNav selectedProjectId={editId} />} topNavHeight={48} showSidebar={true} contentPadding="p-0">
      <div className="font-[Malgun_Gothic] p-4 max-w-3xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📝</span>
            <h1 className="text-lg font-bold text-gray-800">APQP 프로젝트 {isEdit ? '수정' : '등록'}</h1>
            {isEdit && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{form.apqpNo}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/apqp/list')} className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
              ← 리스트(List)
            </button>
            <button onClick={handleSave} disabled={isSaving}
              className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-bold">
              {isSaving ? '저장중...' : isEdit ? '💾 수정(Update)' : '💾 등록(Save)'}
            </button>
          </div>
        </div>

        {/* 기본 정보 */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
          <h2 className="text-sm font-bold text-gray-700 mb-3 border-b pb-1">📌 프로젝트 기본정보</h2>
          <div className="space-y-2">
            <Field label="프로젝트명 (Project Name) *" field="subject" placeholder="예: BMW 타이어개발" />
            <div className="flex gap-2">
              <Field label="고객사 (Customer)" field="customerName" half />
              <Field label="회사명 (Company)" field="companyName" half />
            </div>
            <div className="flex gap-2">
              <Field label="차종/연식 (Model Year)" field="modelYear" half />
              <Field label="품번 (Part No.)" field="partNo" half />
            </div>
            <div className="flex gap-2">
              <Field label="담당자 (Responsible)" field="apqpResponsibleName" half />
              <Field label="공장/위치 (Plant)" field="engineeringLocation" half />
            </div>
          </div>
        </div>

        {/* 연동 문서 */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-bold text-gray-700 mb-3 border-b pb-1">🔗 하위 연동 문서 (Linked Documents)</h2>
          <p className="text-[10px] text-gray-500 mb-2">APQP 프로젝트에 연결할 하위 문서의 ID를 입력합니다.</p>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Field label="PFMEA ID" field="linkedFmea" placeholder="예: pfm26-m001" half />
              <Field label="DFMEA ID" field="linkedDfmea" placeholder="예: dfm26-d001" half />
            </div>
            <div className="flex gap-2">
              <Field label="CP No" field="linkedCp" placeholder="예: cp26-m001" half />
              <Field label="PFD No" field="linkedPfd" placeholder="예: pfd26-m001" half />
            </div>
          </div>
        </div>
      </div>
    </FixedLayout>
  );
}

export default function APQPRegisterPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>}>
      <APQPRegisterContent />
    </Suspense>
  );
}
