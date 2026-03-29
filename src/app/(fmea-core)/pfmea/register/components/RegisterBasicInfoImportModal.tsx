/**
 * 등록 화면 전용 — 공정 기초정보 Excel Import (경량)
 * 위치기반 통합 엑셀 → 15탭(A1~C4) 미리보기 → 저장 후 워크시트 이동
 * (기존데이터 Import 페이지 수준의 패널·검증·비교 없음)
 */
'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';
import { normalizeL2ProcessNo } from '@/app/(fmea-core)/pfmea/worksheet/utils/processNoNormalize';
import { parseRegisterBasicInfoWorkbook } from '../utils/parseRegisterBasicInfoWorkbook';
import { validateExcelFileWithAlert } from '@/lib/excel-validation';

const BASIC_ITEM_CODES = [
  'A1', 'A2', 'A3', 'A4', 'A5', 'A6',
  'B1', 'B2', 'B3', 'B4', 'B5',
  'C1', 'C2', 'C3', 'C4',
] as const;

const TAB_LABEL: Record<string, string> = {
  A1: 'A1 공정번호',
  A2: 'A2 공정명',
  A3: 'A3 공정기능',
  A4: 'A4 제품특성',
  A5: 'A5 고장형태',
  A6: 'A6 검출관리',
  B1: 'B1 작업요소',
  B2: 'B2 요소기능',
  B3: 'B3 공정특성',
  B4: 'B4 고장원인',
  B5: 'B5 예방관리',
  C1: 'C1 구분',
  C2: 'C2 제품기능',
  C3: 'C3 요구사항',
  C4: 'C4 고장영향',
};

function sortPreviewRows(a: ImportedFlatData, b: ImportedFlatData): number {
  const pa = a.category === 'C' ? a.processNo : normalizeL2ProcessNo(a.processNo);
  const pb = b.category === 'C' ? b.processNo : normalizeL2ProcessNo(b.processNo);
  const c = pa.localeCompare(pb, undefined, { numeric: true });
  if (c !== 0) return c;
  return (a.value || '').localeCompare(b.value || '');
}

export interface RegisterBasicInfoImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  fmeaId: string;
  fmeaType: string;
  /** 저장·Atomic 반영 성공 후 호출 (워크시트 이동 등) */
  onSuccessNavigate: () => void;
}

export function RegisterBasicInfoImportModal({
  isOpen,
  onClose,
  fmeaId,
  fmeaType,
  onSuccessNavigate,
}: RegisterBasicInfoImportModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'idle' | 'preview'>('idle');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [flatData, setFlatData] = useState<ImportedFlatData[]>([]);
  const [atomicPayload, setAtomicPayload] = useState<unknown>(null);
  const [activeTab, setActiveTab] = useState<string>('A1');
  const [fileLabel, setFileLabel] = useState('');

  const reset = useCallback(() => {
    setStep('idle');
    setErr(null);
    setFlatData([]);
    setAtomicPayload(null);
    setActiveTab('A1');
    setFileLabel('');
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const filteredPreview = useMemo(() => {
    const basic = flatData.filter((d) => (BASIC_ITEM_CODES as readonly string[]).includes(d.itemCode));
    return basic.filter((d) => d.itemCode === activeTab).slice().sort(sortPreviewRows);
  }, [flatData, activeTab]);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const d of flatData) {
      if ((BASIC_ITEM_CODES as readonly string[]).includes(d.itemCode)) {
        m[d.itemCode] = (m[d.itemCode] || 0) + 1;
      }
    }
    return m;
  }, [flatData]);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validateExcelFileWithAlert(file)) {
      e.target.value = '';
      return;
    }
    if (!fmeaId?.trim()) {
      setErr('FMEA ID가 없습니다. 저장 후 다시 시도하세요.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const parsed = await parseRegisterBasicInfoWorkbook(file, fmeaId.toLowerCase());
      setFlatData(parsed.flat);
      setAtomicPayload(parsed.mode === 'position' ? parsed.atomicData : null);
      setFileLabel(file.name);
      setStep('preview');
    } catch (er) {
      console.error('[RegisterBasicInfoImportModal]', er);
      setErr(er instanceof Error ? er.message : String(er));
    } finally {
      setBusy(false);
      if (e.target) e.target.value = '';
    }
  };

  const onConfirmSave = async () => {
    if (!fmeaId?.trim() || flatData.length === 0) return;
    setBusy(true);
    setErr(null);
    try {
      if (atomicPayload) {
        const saveRes = await fetch('/api/fmea/save-position-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fmeaId: fmeaId.toLowerCase(), atomicData: atomicPayload, force: true }),
        });
        const saveResult = await saveRes.json();
        if (!saveResult.success) {
          setErr(saveResult.error || 'Atomic 저장 실패');
          setBusy(false);
          return;
        }
      }
      const { saveMasterDataset } = await import('@/app/(fmea-core)/pfmea/import/utils/master-api');
      const masterRes = await saveMasterDataset({
        fmeaId: fmeaId.toLowerCase(),
        fmeaType: (fmeaType || 'P') as 'M' | 'F' | 'P',
        name: 'MASTER',
        replace: true,
        mode: 'import',
        flatData,
      });
      if (!masterRes.ok) {
        setErr('마스터 플랫 저장에 실패했습니다.');
        setBusy(false);
        return;
      }
      handleClose();
      onSuccessNavigate();
    } catch (er) {
      console.error('[RegisterBasicInfoImportModal] save', er);
      setErr(er instanceof Error ? er.message : String(er));
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10020] flex items-center justify-center bg-black/45 p-2"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reg-basic-import-title"
      onClick={(ev) => {
        if (ev.target === ev.currentTarget) handleClose();
      }}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-[920px] max-h-[90vh] flex flex-col border border-gray-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-2 bg-[#00587a] text-white flex items-center justify-between shrink-0 rounded-t-lg">
          <h2 id="reg-basic-import-title" className="text-sm font-bold">
            공정 기초정보 Excel Import
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-white/90 hover:text-white text-lg leading-none px-1"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <div className="px-3 py-2 border-b text-[11px] text-gray-600 shrink-0">
          위치기반 통합(L1/L2/L3/FC) 또는 개별 15탭 기초정보 템플릿 엑셀을 선택하세요. 미리보기는 항목코드(A1~C4) 기준입니다. 통합 포맷 저장 시 Atomic+마스터 플랫, 개별 탭만일 때는 마스터 플랫만 갱신됩니다.
          {fileLabel ? (
            <span className="ml-2 font-semibold text-gray-800">파일: {fileLabel}</span>
          ) : null}
        </div>

        {err ? (
          <div className="mx-3 mt-2 px-2 py-1.5 bg-red-50 text-red-800 text-[11px] rounded border border-red-200">
            {err}
          </div>
        ) : null}

        <div className="px-3 py-2 flex flex-wrap gap-2 shrink-0">
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onPickFile} />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {busy ? '처리 중…' : '📁 엑셀 선택'}
          </button>
          {step === 'preview' ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                reset();
              }}
              className="px-3 py-1.5 border border-gray-400 text-gray-700 text-xs rounded hover:bg-gray-50"
            >
              다시 선택
            </button>
          ) : null}
        </div>

        {step === 'preview' ? (
          <>
            <div className="px-2 pt-1 flex flex-wrap gap-0.5 border-b border-gray-200 bg-gray-50 max-h-[120px] overflow-y-auto shrink-0">
              {BASIC_ITEM_CODES.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setActiveTab(code)}
                  className={`px-1.5 py-0.5 text-[10px] font-semibold rounded border ${
                    activeTab === code
                      ? 'bg-[#00587a] text-white border-[#00587a]'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {code}
                  <span className="opacity-80 ml-0.5">({counts[code] ?? 0})</span>
                </button>
              ))}
            </div>
            <div className="px-2 py-1 text-[10px] text-gray-500 shrink-0">
              {TAB_LABEL[activeTab] || activeTab} — 미리보기 (공정번호 3자리 정규화 적용)
            </div>
            <div className="flex-1 min-h-[200px] overflow-auto px-2 pb-2">
              <table className="w-full text-[10px] border-collapse border border-gray-300">
                <thead className="sticky top-0 bg-gray-100">
                  <tr>
                    <th className="border border-gray-300 px-1 py-0.5 text-left w-[14%]">구분/공정</th>
                    <th className="border border-gray-300 px-1 py-0.5 text-left w-[8%]">코드</th>
                    <th className="border border-gray-300 px-1 py-0.5 text-left w-[8%]">4M</th>
                    <th className="border border-gray-300 px-1 py-0.5 text-left">값</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPreview.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="border border-gray-200 px-2 py-4 text-center text-gray-400">
                        이 탭에 행이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredPreview.map((row) => (
                      <tr key={row.id} className="hover:bg-blue-50/50">
                        <td className="border border-gray-200 px-1 py-0.5 font-mono">{row.processNo}</td>
                        <td className="border border-gray-200 px-1 py-0.5">{row.itemCode}</td>
                        <td className="border border-gray-200 px-1 py-0.5">{row.m4 || '—'}</td>
                        <td className="border border-gray-200 px-1 py-0.5 break-all">{row.value}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex-1 min-h-[120px] px-3 py-6 text-center text-[11px] text-gray-500">
            엑셀 파일을 선택하면 15개 탭으로 파싱 결과를 확인할 수 있습니다.
          </div>
        )}

        <div className="px-3 py-2 border-t flex justify-end gap-2 shrink-0 bg-gray-50 rounded-b-lg">
          <button
            type="button"
            onClick={handleClose}
            className="px-3 py-1.5 text-xs border border-gray-400 rounded hover:bg-white"
          >
            취소
          </button>
          <button
            type="button"
            disabled={busy || step !== 'preview'}
            onClick={onConfirmSave}
            className="px-4 py-1.5 text-xs font-bold bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? '저장 중…' : '확인 후 FMEA 작성화면으로'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default RegisterBasicInfoImportModal;
