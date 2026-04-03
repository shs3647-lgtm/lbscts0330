/**
 * @file /apqp/register/page.tsx
 * @description APQP 프로젝트 등록/수정 — FMEA 등록 테이블 스타일
 *
 * ★★★ 설계 원칙 ★★★
 * 1. PFMEA 등록 화면과 동일한 테이블 기반 UI (headerCell/inputCell)
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
  status: string;
  linkedFmea: string;
  linkedDfmea: string;
  linkedCp: string;
  linkedPfd: string;
}

const EMPTY_FORM: ApqpFormData = {
  apqpNo: '', subject: '', productName: '', customerName: '', companyName: 'LBS',
  modelYear: '', partNo: '', apqpResponsibleName: '', engineeringLocation: '',
  status: 'planning',
  linkedFmea: '', linkedDfmea: '', linkedCp: '', linkedPfd: '',
};

function APQPRegisterContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get('id');

  const [form, setForm] = useState<ApqpFormData>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
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
            companyName: a.companyName || 'LBS',
            modelYear: a.modelYear || '',
            partNo: a.partNo || '',
            apqpResponsibleName: a.apqpResponsibleName || '',
            engineeringLocation: a.engineeringLocation || '',
            status: a.status || 'planning',
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

  const updateField = (field: keyof ApqpFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.subject.trim()) {
      toast.warn('프로젝트명을 입력해주세요.');
      return;
    }
    setSaveStatus('saving');
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
        setSaveStatus('saved');
        toast.success(`APQP 프로젝트 ${isEdit ? '수정' : '등록'} 완료 (${data.apqpNo})`);
        if (!isEdit) {
          router.replace(`/apqp/register?id=${data.apqpNo}`);
        }
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('idle');
        toast.error(data.error || '저장 실패');
      }
    } catch {
      setSaveStatus('idle');
      toast.error('네트워크 오류');
    }
  };

  const handleNewRegister = () => {
    setForm(EMPTY_FORM);
    router.replace('/apqp/register');
  };

  if (isLoading) {
    return (
      <FixedLayout topNav={<APQPTopNav selectedProjectId={editId} />} topNavHeight={48} showSidebar={true} contentPadding="p-0">
        <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      </FixedLayout>
    );
  }

  // ★ PFMEA 등록과 동일한 테이블 스타일
  const headerCell = "bg-[#00587a] text-white px-1 py-0.5 border border-white font-semibold text-[10px] text-center leading-tight";
  const inputCell = "border border-gray-300 px-1 py-0.5 overflow-hidden";

  return (
    <FixedLayout topNav={<APQPTopNav selectedProjectId={editId} />} topNavHeight={48} showSidebar={true} contentPadding="pl-[5px] pr-2 py-2">
      <div className="font-[Malgun_Gothic]">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{isEdit ? '✏️' : '📝'}</span>
            <h1 className="text-sm font-bold text-gray-800">APQP 프로젝트 {isEdit ? '수정(Edit)' : '등록(Register)'}</h1>
            {form.apqpNo && <span className="text-xs text-gray-500 ml-2">No: {form.apqpNo}</span>}
            {isEdit && <span className="px-2 py-0.5 text-xs bg-yellow-200 text-yellow-800 rounded font-bold">수정모드(Edit Mode)</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={handleNewRegister} className="px-3 py-1.5 bg-green-500 text-white text-xs rounded hover:bg-green-600 font-semibold">➕ 새로 작성(Create)</button>
            <button onClick={() => router.push('/apqp/list')} className="px-3 py-1.5 bg-gray-400 text-white text-xs rounded hover:bg-gray-500 font-semibold">📋 리스트(List)</button>
            <button onClick={handleSave} disabled={saveStatus === 'saving'}
              className={`px-4 py-1.5 text-xs font-bold rounded ${
                saveStatus === 'saving' ? 'bg-gray-300 text-gray-500' :
                saveStatus === 'saved' ? 'bg-green-500 text-white' :
                'bg-blue-600 text-white hover:bg-blue-700'
              }`}>
              {saveStatus === 'saving' ? '⏳ 저장 중...(Saving)' :
               saveStatus === 'saved' ? '✓ 저장됨(Saved)' : '💾 저장(Save)'}
            </button>
          </div>
        </div>

        {/* ★ 기획 및 준비 — PFMEA 테이블 스타일 */}
        <div className="bg-white rounded border border-gray-300 mb-3">
          <div className="bg-[#e3f2fd] px-3 py-1.5 border-b border-gray-300 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-gray-800" title="APQP Project Information">APQP 프로젝트 정보 <span className="text-[10px] font-semibold text-gray-500">(Project Info)</span></h2>
          </div>
          <form autoComplete="off" onSubmit={e => e.preventDefault()}>
            <table className="w-full border-collapse text-xs table-fixed">
              <colgroup>
                <col className="w-[9%]" /><col className="w-[16%]" /><col className="w-[9%]" /><col className="w-[16%]" />
                <col className="w-[9%]" /><col className="w-[16%]" /><col className="w-[9%]" /><col className="w-[16%]" />
              </colgroup>
              <tbody>
                {/* 1행: 프로젝트명, APQP No, 현황 */}
                <tr className="h-9">
                  <td className={headerCell}>프로젝트명<br /><span className="text-[8px] font-normal opacity-70">(Project)</span></td>
                  <td className={inputCell} colSpan={3}>
                    <input type="text" value={form.subject} onChange={e => updateField('subject', e.target.value)}
                      className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="예: BMW 타이어개발" />
                  </td>
                  <td className={headerCell}>APQP No</td>
                  <td className={inputCell}>
                    <span className="px-2 text-xs font-semibold text-blue-600 cursor-pointer hover:underline"
                      onClick={() => form.apqpNo && router.push('/apqp/list')}>{form.apqpNo || '(자동생성)'}</span>
                  </td>
                  <td className={headerCell}>현황<br /><span className="text-[8px] font-normal opacity-70">(Status)</span></td>
                  <td className={inputCell}>
                    <select value={form.status} onChange={e => updateField('status', e.target.value)}
                      className="w-full h-7 px-1 text-xs border-0 bg-transparent focus:outline-none cursor-pointer">
                      <option value="planning">기획(Planning)</option>
                      <option value="development">개발(Development)</option>
                      <option value="validation">검증(Validation)</option>
                      <option value="production">양산(Production)</option>
                      <option value="completed">완료(Completed)</option>
                    </select>
                  </td>
                </tr>

                {/* 2행: 고객명, 회사명, 담당자, 공장/위치 */}
                <tr className="h-9">
                  <td className={headerCell}>고객 명<br /><span className="text-[8px] font-normal opacity-70">(Customer)</span></td>
                  <td className={inputCell}>
                    <input type="text" value={form.customerName} onChange={e => updateField('customerName', e.target.value)}
                      className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="고객 명" />
                  </td>
                  <td className={headerCell}>회사 명<br /><span className="text-[8px] font-normal opacity-70">(Company)</span></td>
                  <td className={inputCell}>
                    <span className="w-full h-7 px-2 text-xs flex items-center">{form.companyName || 'LBS'}</span>
                  </td>
                  <td className={headerCell}>APQP 담당자<br /><span className="text-[8px] font-normal opacity-70">(Resp.)</span></td>
                  <td className={inputCell}>
                    <input type="text" value={form.apqpResponsibleName} onChange={e => updateField('apqpResponsibleName', e.target.value)}
                      className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="담당자 성명" />
                  </td>
                  <td className={headerCell}>공장/위치<br /><span className="text-[8px] font-normal opacity-70">(Plant)</span></td>
                  <td className={inputCell}>
                    <input type="text" value={form.engineeringLocation} onChange={e => updateField('engineeringLocation', e.target.value)}
                      className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="공장/위치" />
                  </td>
                </tr>

                {/* 3행: 차종/연식, 품번, 품명 */}
                <tr className="h-9">
                  <td className={headerCell}>차종/연식<br /><span className="text-[8px] font-normal opacity-70">(Model Year)</span></td>
                  <td className={inputCell}>
                    <input type="text" value={form.modelYear} onChange={e => updateField('modelYear', e.target.value)}
                      className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="차종/연식" />
                  </td>
                  <td className={headerCell}>품번<br /><span className="text-[8px] font-normal opacity-70">(Part No.)</span></td>
                  <td className={inputCell}>
                    <input type="text" value={form.partNo} onChange={e => updateField('partNo', e.target.value)}
                      className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="품번" />
                  </td>
                  <td className={headerCell}>품명<br /><span className="text-[8px] font-normal opacity-70">(Product)</span></td>
                  <td className={inputCell} colSpan={3}>
                    <input type="text" value={form.productName} onChange={e => updateField('productName', e.target.value)}
                      className="w-full h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="품명 (미입력시 프로젝트명 사용)" />
                  </td>
                </tr>
              </tbody>
            </table>
          </form>
        </div>

        {/* ★ 연동 문서 — 테이블 스타일 */}
        <div className="bg-white rounded border border-gray-300 mb-3">
          <div className="bg-[#e8f5e9] px-3 py-1.5 border-b border-gray-300">
            <h2 className="text-sm font-extrabold text-gray-800" title="Linked Documents">🔗 하위 연동 문서 <span className="text-[10px] font-semibold text-gray-500">(Linked Documents)</span></h2>
          </div>
          <table className="w-full border-collapse text-xs table-fixed">
            <colgroup>
              <col className="w-[9%]" /><col className="w-[16%]" /><col className="w-[9%]" /><col className="w-[16%]" />
              <col className="w-[9%]" /><col className="w-[16%]" /><col className="w-[9%]" /><col className="w-[16%]" />
            </colgroup>
            <tbody>
              <tr className="h-9">
                <td className={`${headerCell} bg-teal-700`}>PFMEA<br /><span className="text-[8px] font-normal opacity-70">(ID)</span></td>
                <td className={inputCell}>
                  <div className="flex items-center gap-1">
                    <input type="text" value={form.linkedFmea} onChange={e => updateField('linkedFmea', e.target.value)}
                      className="flex-1 h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="pfm26-m001" />
                    {form.linkedFmea && (
                      <span className="px-1 py-0.5 bg-teal-100 text-teal-700 text-[9px] rounded cursor-pointer hover:bg-teal-200"
                        onClick={() => router.push(`/pfmea/register?id=${form.linkedFmea}`)}>이동</span>
                    )}
                  </div>
                </td>
                <td className={`${headerCell} bg-purple-700`}>DFMEA<br /><span className="text-[8px] font-normal opacity-70">(ID)</span></td>
                <td className={inputCell}>
                  <div className="flex items-center gap-1">
                    <input type="text" value={form.linkedDfmea} onChange={e => updateField('linkedDfmea', e.target.value)}
                      className="flex-1 h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="dfm26-d001" />
                    {form.linkedDfmea && (
                      <span className="px-1 py-0.5 bg-purple-100 text-purple-700 text-[9px] rounded cursor-pointer hover:bg-purple-200"
                        onClick={() => router.push(`/dfmea/register?id=${form.linkedDfmea}`)}>이동</span>
                    )}
                  </div>
                </td>
                <td className={`${headerCell} bg-orange-600`}>CP<br /><span className="text-[8px] font-normal opacity-70">(No)</span></td>
                <td className={inputCell}>
                  <div className="flex items-center gap-1">
                    <input type="text" value={form.linkedCp} onChange={e => updateField('linkedCp', e.target.value)}
                      className="flex-1 h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="cp26-m001" />
                    {form.linkedCp && (
                      <span className="px-1 py-0.5 bg-orange-100 text-orange-700 text-[9px] rounded cursor-pointer hover:bg-orange-200"
                        onClick={() => router.push(`/control-plan/register?id=${form.linkedCp}`)}>이동</span>
                    )}
                  </div>
                </td>
                <td className={`${headerCell} bg-indigo-700`}>PFD<br /><span className="text-[8px] font-normal opacity-70">(No)</span></td>
                <td className={inputCell}>
                  <div className="flex items-center gap-1">
                    <input type="text" value={form.linkedPfd} onChange={e => updateField('linkedPfd', e.target.value)}
                      className="flex-1 h-7 px-2 text-xs border-0 bg-transparent focus:outline-none" placeholder="pfd26-m001" />
                    {form.linkedPfd && (
                      <span className="px-1 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] rounded cursor-pointer hover:bg-indigo-200"
                        onClick={() => router.push(`/pfd/register?id=${form.linkedPfd}`)}>이동</span>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 안내 */}
        <div className="bg-green-50 border border-green-200 rounded p-3 text-[10px] text-gray-600">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">💡</span>
            <span className="font-bold text-green-700">APQP 프로젝트 안내</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 ml-5">
            <li>APQP 프로젝트는 PFMEA, DFMEA, CP, PFD의 상위 컨테이너입니다.</li>
            <li>하위 문서 ID를 연동하면 각 모듈 리스트에서 APQP 프로젝트명이 자동 표시됩니다.</li>
            <li>APQP No는 저장 시 자동 생성됩니다 (예: pj26-001).</li>
          </ul>
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
