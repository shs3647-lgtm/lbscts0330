/**
 * @file ReverseImportPanel.tsx
 * 역설계 Import — "기존 데이터 활용" 패널
 * 설계서: docs/# 역설계 기반 FMEA Import 시스템 설계서.md
 *
 * 원본 FMEA 선택 → 옵션 설정 → 원스텝 실행(프로젝트+DB+FK+Legacy+검증) → 워크시트 이동
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';

interface FMEAProjectItem {
  id: string;
  fmeaNo?: string;
  fmeaType?: string;
  fmeaInfo?: { subject?: string; companyName?: string };
}

interface ReverseImportPanelProps {
  selectedFmeaId: string;
  fmeaList: FMEAProjectItem[];
}

interface StepStatus {
  project: boolean;
  atomicDB: boolean;
  legacySync: boolean;
  verification: boolean;
}

interface VerifyCheck {
  entity: string;
  sourceCount: number;
  targetCount: number;
  match: boolean;
}

interface ImportResult {
  ok: boolean;
  sourceFmeaId: string;
  targetFmeaId: string;
  steps: StepStatus;
  counts: Record<string, number>;
  verification: { allMatch: boolean; checks: VerifyCheck[] };
  elapsedMs: number;
  worksheetUrl: string;
  error?: string;
}

interface VerifyResult {
  ok: boolean;
  allGreen: boolean;
  V01_fmeaId: { allMatch: boolean; tables: { table: string; total: number; mismatch: number }[] };
  V02_fkIntegrity: { allMatch: boolean; checks: { entity: string; match: boolean; sourceCount: number; targetCount: number }[] };
  V03_idempotency: { allMatch: boolean };
  V04_counts: { allMatch: boolean; checks: VerifyCheck[] };
  V05_ids: { allMatch: boolean };
}

type Phase = 'idle' | 'running' | 'done' | 'verifying' | 'verified' | 'error';

export default function ReverseImportPanel({ selectedFmeaId, fmeaList }: ReverseImportPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sourceFmeaId, setSourceFmeaId] = useState('');
  const [copyDCPC, setCopyDCPC] = useState(true);
  const [copySOD, setCopySOD] = useState(false);
  const [copyOptimization, setCopyOptimization] = useState(false);

  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const sourceOptions = useMemo(() =>
    fmeaList.filter(p => p.id !== selectedFmeaId && (p.fmeaType === 'P' || p.fmeaType === 'F' || p.fmeaType === 'M')),
    [fmeaList, selectedFmeaId]
  );

  const handleRun = useCallback(async () => {
    if (!sourceFmeaId || !selectedFmeaId) return;
    setPhase('running');
    setResult(null);
    setVerifyResult(null);
    setErrorMsg('');

    try {
      const res = await fetch('/api/fmea/create-with-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceFmeaId,
          targetFmeaId: selectedFmeaId,
          options: { copyDCPC, copySOD, copyOptimization },
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setPhase('error');
        setErrorMsg(data.error || '역설계 Import 실패');
        return;
      }
      setResult(data as ImportResult);
      setPhase('done');
    } catch (e: unknown) {
      setPhase('error');
      setErrorMsg(e instanceof Error ? e.message : '네트워크 오류');
    }
  }, [sourceFmeaId, selectedFmeaId, copyDCPC, copySOD, copyOptimization]);

  const handleVerify = useCallback(async () => {
    if (!sourceFmeaId || !selectedFmeaId) return;
    setPhase('verifying');

    try {
      const res = await fetch('/api/fmea/reverse-import/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceFmeaId, targetFmeaId: selectedFmeaId }),
      });
      const data: VerifyResult = await res.json();
      setVerifyResult(data);
      setPhase('verified');
    } catch (e: unknown) {
      setPhase('error');
      setErrorMsg(e instanceof Error ? e.message : '검증 오류');
    }
  }, [sourceFmeaId, selectedFmeaId]);

  const handleDownloadExcel = useCallback(() => {
    if (!selectedFmeaId) return;
    window.open(`/api/fmea/reverse-import/excel?fmeaId=${encodeURIComponent(selectedFmeaId)}`, '_blank');
  }, [selectedFmeaId]);

  const selectedSource = fmeaList.find(p => p.id === sourceFmeaId);
  const allStepsDone = result?.steps && Object.values(result.steps).every(v => v);

  return (
    <div className="mt-2 border border-purple-200 rounded-lg bg-white shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2 bg-gradient-to-r from-purple-50 to-white border-b border-purple-200 rounded-t-lg cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-purple-600 font-bold text-sm">
            {isOpen ? '▼' : '▶'}
          </span>
          <span className="text-[13px] font-bold text-purple-800">기존 데이터 활용 (역설계 Import)</span>
          <span className="text-[10px] text-purple-500 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
            프로젝트등록 + DB + FK + UUID + Legacy + 검증
          </span>
        </div>
        {result && phase !== 'idle' && (
          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
            allStepsDone && result.verification?.allMatch
              ? 'bg-green-100 text-green-700 border border-green-300'
              : phase === 'error'
              ? 'bg-red-100 text-red-700 border border-red-300'
              : 'bg-blue-100 text-blue-700 border border-blue-300'
          }`}>
            {allStepsDone && result.verification?.allMatch ? 'ALL GREEN' : phase === 'error' ? 'ERROR' : `DONE ${result.elapsedMs}ms`}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="p-4 space-y-4">
          {/* STEP 1: 원본 FMEA 선택 */}
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <h4 className="text-[11px] font-bold text-gray-700 mb-2">
              STEP 1. 원본 FMEA 선택 (Master / Family / Part)
            </h4>
            <div className="flex items-center gap-3">
              <select
                value={sourceFmeaId}
                onChange={(e) => { setSourceFmeaId(e.target.value); setPhase('idle'); setResult(null); setVerifyResult(null); }}
                className="flex-1 text-xs border border-gray-300 rounded px-2 py-1.5 bg-white"
              >
                <option value="">-- 원본 FMEA를 선택하세요 --</option>
                {sourceOptions.map(p => (
                  <option key={p.id} value={p.id}>
                    [{p.fmeaType}] {p.fmeaNo || p.id} — {p.fmeaInfo?.subject || ''}
                  </option>
                ))}
              </select>
              <div className="text-[10px] text-gray-400 whitespace-nowrap">
                대상: <span className="font-bold text-purple-700">{selectedFmeaId}</span>
              </div>
            </div>
            {selectedSource && (
              <div className="mt-2 text-[10px] text-gray-500">
                원본: <span className="font-semibold text-blue-600">{selectedSource.fmeaNo || selectedSource.id}</span>
                {selectedSource.fmeaInfo?.companyName && ` (${selectedSource.fmeaInfo.companyName})`}
                {' → '}대상: <span className="font-semibold text-purple-600">{selectedFmeaId}</span>
              </div>
            )}
          </div>

          {/* STEP 2: 옵션 설정 */}
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <h4 className="text-[11px] font-bold text-gray-700 mb-2">
              STEP 2. 전환 옵션
            </h4>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-1.5 text-[11px] text-gray-600 cursor-pointer">
                <input type="checkbox" checked={copyDCPC} onChange={(e) => setCopyDCPC(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-gray-300" />
                DC/PC (검출/예방관리)
              </label>
              <label className="flex items-center gap-1.5 text-[11px] text-gray-600 cursor-pointer">
                <input type="checkbox" checked={copySOD} onChange={(e) => setCopySOD(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-gray-300" />
                SOD (심각도/발생도/검출도)
              </label>
              <label className="flex items-center gap-1.5 text-[11px] text-gray-600 cursor-pointer">
                <input type="checkbox" checked={copyOptimization} onChange={(e) => setCopyOptimization(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-gray-300" />
                최적화 (개선활동)
              </label>
            </div>
            <p className="mt-1.5 text-[9px] text-gray-400">
              구조(L1/L2/L3) + 기능 + 고장사슬(FM/FE/FC/FL) + 공정특성/제품특성은 항상 복사됩니다.
            </p>
          </div>

          {/* STEP 3: 실행 버튼 */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleRun}
              disabled={!sourceFmeaId || phase === 'running' || phase === 'verifying'}
              className={`px-5 py-2 text-xs font-bold rounded shadow-sm ${
                !sourceFmeaId || phase === 'running' || phase === 'verifying'
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700 cursor-pointer'
              }`}
            >
              {phase === 'running' ? '실행 중...' : '원스텝 Import 실행'}
            </button>

            {(phase === 'done' || phase === 'verified') && (
              <>
                <button
                  onClick={handleVerify}
                  className="px-4 py-2 text-xs font-bold bg-green-600 text-white rounded shadow-sm hover:bg-green-700 cursor-pointer"
                >
                  V01~V05 상세 검증
                </button>
                <button
                  onClick={handleDownloadExcel}
                  className="px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded shadow-sm hover:bg-blue-700 cursor-pointer"
                >
                  Import 엑셀 다운로드
                </button>
                <button
                  onClick={() => window.location.href = `/pfmea/worksheet?id=${selectedFmeaId}`}
                  className="px-4 py-2 text-xs font-bold bg-orange-500 text-white rounded shadow-sm hover:bg-orange-600 cursor-pointer"
                >
                  워크시트 이동
                </button>
              </>
            )}
          </div>

          {/* 에러 표시 */}
          {phase === 'error' && (
            <div className="bg-red-50 border border-red-300 rounded p-3 text-xs text-red-700">
              <span className="font-bold">오류:</span> {errorMsg}
            </div>
          )}

          {/* 실행 결과: 파이프라인 단계별 상태 */}
          {result && phase !== 'idle' && phase !== 'error' && (
            <div className="space-y-3">
              {/* 단계별 상태 */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <h4 className="text-[11px] font-bold text-purple-800 mb-2">파이프라인 실행 결과</h4>
                <div className="flex gap-2 flex-wrap">
                  {([
                    ['프로젝트 등록', result.steps.project],
                    ['Atomic DB 저장', result.steps.atomicDB],
                    ['Legacy 동기화', result.steps.legacySync],
                    ['수량 검증', result.steps.verification],
                  ] as [string, boolean][]).map(([label, ok]) => (
                    <span key={label} className={`text-[10px] px-2 py-1 rounded font-bold ${
                      ok ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-700 border border-red-300'
                    }`}>
                      {ok ? '✓' : '✗'} {label}
                    </span>
                  ))}
                  <span className="text-[10px] px-2 py-1 rounded bg-gray-100 text-gray-600 border border-gray-200">
                    {result.elapsedMs}ms
                  </span>
                </div>
              </div>

              {/* DB 수량 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="text-[11px] font-bold text-blue-800 mb-2">Atomic DB 수량</h4>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(result.counts).map(([key, val]) => (
                    <div key={key} className="bg-white rounded px-2 py-1 border border-blue-100 text-center">
                      <div className="text-[9px] text-gray-500">{key}</div>
                      <div className="text-sm font-bold text-blue-700">{val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 검증 상세 */}
              {result.verification && (
                <div className={`border rounded-lg p-3 ${
                  result.verification.allMatch ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'
                }`}>
                  <h4 className={`text-[11px] font-bold mb-2 ${
                    result.verification.allMatch ? 'text-green-800' : 'text-yellow-800'
                  }`}>
                    {result.verification.allMatch ? '수량 검증 PASS — 원본과 100% 일치' : '수량 불일치 발견'}
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {result.verification.checks.map((c: VerifyCheck) => (
                      <span key={c.entity} className={`text-[9px] px-1.5 py-0.5 rounded ${
                        c.match ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {c.entity}: {c.sourceCount}{c.match ? '' : `→${c.targetCount}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* V01~V05 상세 검증 결과 */}
          {verifyResult && phase === 'verified' && (
            <div className={`border rounded-lg p-3 ${verifyResult.allGreen ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'}`}>
              <h4 className={`text-[11px] font-bold mb-2 ${verifyResult.allGreen ? 'text-green-800' : 'text-yellow-800'}`}>
                {verifyResult.allGreen ? 'ALL GREEN — V01~V05 전체 통과' : '상세 검증 결과'}
              </h4>
              <div className="space-y-2">
                <VerifySection title="V01 fmeaId 일치" pass={verifyResult.V01_fmeaId.allMatch}>
                  {verifyResult.V01_fmeaId.tables.map(t => (
                    <span key={t.table} className={`inline-block text-[9px] px-1.5 py-0.5 rounded mr-1 mb-0.5 ${
                      t.mismatch === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {t.table}: {t.total} {t.mismatch > 0 ? `(${t.mismatch} err)` : ''}
                    </span>
                  ))}
                </VerifySection>

                <VerifySection title="V02 FK 무결성" pass={verifyResult.V02_fkIntegrity.allMatch}>
                  {verifyResult.V02_fkIntegrity.checks.map(c => (
                    <span key={c.entity} className={`inline-block text-[9px] px-1.5 py-0.5 rounded mr-1 mb-0.5 ${
                      c.match ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {c.entity}
                    </span>
                  ))}
                </VerifySection>

                <VerifySection title="V03 멱등성" pass={verifyResult.V03_idempotency.allMatch} />

                <VerifySection title="V04 수량 일치" pass={verifyResult.V04_counts.allMatch}>
                  {verifyResult.V04_counts.checks.filter(c => !c.match).map(c => (
                    <span key={c.entity} className="inline-block text-[9px] px-1.5 py-0.5 rounded mr-1 mb-0.5 bg-red-100 text-red-700">
                      {c.entity}: {c.sourceCount}→{c.targetCount}
                    </span>
                  ))}
                </VerifySection>

                <VerifySection title="V05 UUID 일치" pass={verifyResult.V05_ids.allMatch} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VerifySection({ title, pass, children }: { title: string; pass: boolean; children?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${
        pass ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
      }`}>
        {pass ? 'PASS' : 'FAIL'} {title}
      </span>
      {children && <div className="flex flex-wrap">{children}</div>}
    </div>
  );
}
