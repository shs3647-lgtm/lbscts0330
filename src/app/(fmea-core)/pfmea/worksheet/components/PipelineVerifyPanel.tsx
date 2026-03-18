'use client';

/**
 * @file PipelineVerifyPanel.tsx
 * @description 6단계 파이프라인 검증 + 자동수정 패널
 *
 * SAMPLE(0) → IMPORT(1) → 파싱(2) → UUID(3) → FK(4) → WS(5)
 * 빨간불 감지 → 자동수정 루프 → 초록불 될 때까지 반복
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import PipelineStep0Detail from './PipelineStep0Detail';
import PipelineStepDetailView from './PipelineStepDetailView';

interface CrossCheckEntry {
  entity: string;
  atomicCount: number;
  legacyCount: number;
  match: boolean;
  missingInAtomic: string[];
  missingInLegacy: string[];
}

interface FkIntegrityEntry {
  relation: string;
  total: number;
  valid: number;
  orphans: { id: string; fkValue: string; name?: string }[];
}

interface ParentChildEntry {
  parent: string;
  child: string;
  missingChildren: { parentId: string; parentName: string }[];
}

interface StepResult {
  step: number;
  name: string;
  status: 'ok' | 'warn' | 'error' | 'fixed';
  details: Record<string, number | string>;
  issues: string[];
  fixed: string[];
  crossCheck?: CrossCheckEntry[];
  fkIntegrity?: FkIntegrityEntry[];
  parentChild?: ParentChildEntry[];
}

interface PipelineResult {
  fmeaId: string;
  steps: StepResult[];
  allGreen: boolean;
  loopCount: number;
  timestamp: string;
}

interface PipelineVerifyPanelProps {
  fmeaId: string;
  onClose: () => void;
}

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  ok: { bg: 'bg-green-900/80', border: 'border-green-500', text: 'text-green-300', icon: '✅' },
  warn: { bg: 'bg-yellow-900/80', border: 'border-yellow-500', text: 'text-yellow-300', icon: '⚠️' },
  error: { bg: 'bg-red-900/80', border: 'border-red-500', text: 'text-red-300', icon: '❌' },
  fixed: { bg: 'bg-blue-900/80', border: 'border-blue-500', text: 'text-blue-300', icon: '🔧' },
  pending: { bg: 'bg-gray-800/80', border: 'border-gray-600', text: 'text-gray-400', icon: '⏳' },
};

const STEP_LABELS = ['SAMPLE', 'IMPORT', '파싱', 'UUID', 'FK', 'WS'];

export default function PipelineVerifyPanel({ fmeaId, onClose }: PipelineVerifyPanelProps) {
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const runVerify = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/fmea/pipeline-verify?fmeaId=${encodeURIComponent(fmeaId)}`);
      const data = await res.json();
      if (data.success) setResult(data);
    } catch { /* ignore */ }
    setIsLoading(false);
  }, [fmeaId]);

  const runAutoFix = useCallback(async () => {
    setIsFixing(true);
    try {
      const res = await fetch('/api/fmea/pipeline-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fmeaId }),
      });
      const data = await res.json();
      if (data.success) setResult(data);
    } catch { /* ignore */ }
    setIsFixing(false);
  }, [fmeaId]);

  // 마운트 시 자동 검증
  useEffect(() => { runVerify(); }, [runVerify]);

  const steps = result?.steps || [];
  const hasErrors = steps.some(s => s.status === 'error' || s.status === 'warn');

  return ReactDOM.createPortal(
    <div
      ref={panelRef}
      className="fixed left-0 right-0 mx-auto w-[900px] bg-gray-900 border border-gray-600 rounded-b-lg shadow-2xl"
      style={{ top: 0, maxHeight: '70vh', overflowY: 'auto', zIndex: 100002 }}
      data-testid="pipeline-verify-panel"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-[12px]">파이프라인 검증</span>
          {result && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${result.allGreen ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
              {result.allGreen ? 'ALL GREEN' : `이슈 ${steps.filter(s => s.status !== 'ok').length}건`}
            </span>
          )}
          {result && <span className="text-[9px] text-gray-500">Loop #{result.loopCount}</span>}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={runVerify}
            disabled={isLoading}
            className="px-2 py-0.5 text-[10px] bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50"
          >
            {isLoading ? '검증중...' : '검증'}
          </button>
          {hasErrors && (
            <button
              onClick={runAutoFix}
              disabled={isFixing}
              className="px-2 py-0.5 text-[10px] bg-orange-600 text-white rounded hover:bg-orange-500 disabled:opacity-50 font-bold animate-pulse"
            >
              {isFixing ? '수정중...' : '🔧 자동수정'}
            </button>
          )}
          <button onClick={onClose} className="px-1 py-0.5 text-gray-400 hover:text-white text-[14px]">×</button>
        </div>
      </div>

      {/* 파이프라인 흐름도 */}
      <div className="px-3 py-2">
        <div className="flex items-center justify-between gap-1">
          {STEP_LABELS.map((label, i) => {
            const step = steps.find(s => s.step === i);
            const status = step?.status || 'pending';
            const colors = STATUS_COLORS[status];

            return (
              <React.Fragment key={i}>
                <button
                  onClick={() => setExpandedStep(expandedStep === i ? null : i)}
                  className={`flex-1 flex flex-col items-center py-1.5 px-1 rounded border ${colors.border} ${colors.bg} cursor-pointer hover:brightness-125 transition-all ${expandedStep === i ? 'ring-2 ring-white/50' : ''}`}
                >
                  <span className="text-[14px]">{colors.icon}</span>
                  <span className={`text-[10px] font-bold ${colors.text}`}>STEP {i}</span>
                  <span className="text-[9px] text-gray-300">{label}</span>
                </button>
                {i < STEP_LABELS.length - 1 && <span className="text-gray-500 text-[12px] shrink-0">→</span>}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 선택된 STEP 세부 정보 */}
      {expandedStep !== null && steps.find(s => s.step === expandedStep) && (
        <div className="px-3 pb-2">
          {expandedStep === 0 ? (
            <PipelineStep0Detail
              step={steps.find(s => s.step === 0)!}
              fmeaId={fmeaId}
              onImportComplete={() => {
                runVerify();
                window.location.reload();
              }}
            />
          ) : (
            <StepDetail step={steps.find(s => s.step === expandedStep)!} fmeaId={fmeaId} />
          )}
        </div>
      )}

      {/* 전체 요약 (접힌 상태) */}
      {expandedStep === null && steps.length > 0 && (
        <div className="px-3 pb-2">
          <div className="grid grid-cols-1 gap-1">
            {steps.filter(s => s.issues.length > 0 || s.fixed.length > 0).map(s => (
              <div key={s.step} className="flex items-start gap-2 text-[10px]">
                <span className={`shrink-0 ${STATUS_COLORS[s.status]?.text || 'text-gray-400'}`}>
                  STEP {s.step} {s.name}:
                </span>
                <div className="flex flex-wrap gap-1">
                  {s.issues.map((issue, j) => (
                    <span key={j} className="text-red-400">{issue}</span>
                  ))}
                  {s.fixed.map((fix, j) => (
                    <span key={`f${j}`} className="text-blue-400">✔ {fix}</span>
                  ))}
                </div>
              </div>
            ))}
            {steps.every(s => s.issues.length === 0 && s.fixed.length === 0) && (
              <span className="text-green-400 text-[11px] font-bold">✅ 모든 단계 정상 — 이슈 없음</span>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

const PARSING_LABELS: Record<string, string> = {
  A1: '공정번호', A2: '공정명', A3: '공정기능', A4: '제품특성', A5: '고장형태', A6: '검출관리',
  B1: '작업요소', B2: '요소기능', B3: '공정특성', B4: '고장원인', B5: '예방관리',
  C1: '구분', C2: '완제품기능', C3: '요구사항', C4: '고장영향',
};

function ParsingStatsTable({ details }: { details: Record<string, number | string> }) {
  const aKeys = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'];
  const bKeys = ['B1', 'B2', 'B3', 'B4', 'B5'];
  const cKeys = ['C1', 'C2', 'C3', 'C4'];

  const renderRow = (code: string, level: string) => {
    const val = details[code];
    const isZero = val === 0;
    return (
      <tr key={code} className={isZero ? 'bg-red-900/40' : ''}>
        <td className="px-1 py-0.5 text-[9px] text-gray-400 text-center">{level}</td>
        <td className="px-1 py-0.5 text-[9px] text-cyan-300 font-bold text-center">{code}</td>
        <td className="px-1 py-0.5 text-[9px] text-gray-300">{PARSING_LABELS[code]}</td>
        <td className={`px-1 py-0.5 text-[10px] text-right font-bold ${isZero ? 'text-red-400' : 'text-green-300'}`}>
          {val !== undefined ? String(val) : '-'}
          {isZero && <span className="text-red-500 ml-1">❌</span>}
        </td>
      </tr>
    );
  };

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-gray-600">
          <th className="px-1 py-0.5 text-[8px] text-gray-500 w-8">레벨</th>
          <th className="px-1 py-0.5 text-[8px] text-gray-500 w-8">코드</th>
          <th className="px-1 py-0.5 text-[8px] text-gray-500 text-left">항목</th>
          <th className="px-1 py-0.5 text-[8px] text-gray-500 w-12 text-right">건수</th>
        </tr>
      </thead>
      <tbody>
        {aKeys.map(k => renderRow(k, 'L2'))}
        <tr><td colSpan={4} className="border-t border-gray-700 h-0.5" /></tr>
        {bKeys.map(k => renderRow(k, 'L3'))}
        <tr><td colSpan={4} className="border-t border-gray-700 h-0.5" /></tr>
        {cKeys.map(k => renderRow(k, 'L1'))}
      </tbody>
    </table>
  );
}

function CrossCheckMatrix({ entries }: { entries: CrossCheckEntry[] }) {
  if (!entries || entries.length === 0) return null;
  return (
    <div className="mt-1 mb-1">
      <div className="text-[10px] text-cyan-300 font-bold mb-0.5">교차검증 매트릭스 (Atomic vs Legacy)</div>
      <table className="w-full border-collapse text-[9px]">
        <thead>
          <tr className="border-b border-gray-600">
            <th className="px-1 py-0.5 text-gray-500 text-left">항목</th>
            <th className="px-1 py-0.5 text-gray-500 text-right w-14">Atomic</th>
            <th className="px-1 py-0.5 text-gray-500 text-right w-14">Legacy</th>
            <th className="px-1 py-0.5 text-gray-500 text-center w-10">일치</th>
            <th className="px-1 py-0.5 text-gray-500 text-left">diff</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={i} className={`border-t border-gray-800 ${!e.match ? 'bg-red-900/30' : ''}`}>
              <td className="px-1 py-0.5 text-white">{e.entity}</td>
              <td className="px-1 py-0.5 text-right text-blue-300 font-bold">{e.atomicCount}</td>
              <td className="px-1 py-0.5 text-right text-yellow-300 font-bold">{e.legacyCount}</td>
              <td className="px-1 py-0.5 text-center">{e.match ? '✅' : '❌'}</td>
              <td className="px-1 py-0.5 text-[8px]">
                {e.missingInAtomic.length > 0 && (
                  <span className="text-red-400">Atomic에 없음: {e.missingInAtomic.length}건 </span>
                )}
                {e.missingInLegacy.length > 0 && (
                  <span className="text-orange-400">Legacy에 없음: {e.missingInLegacy.length}건</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FkIntegrityTable({ entries }: { entries: FkIntegrityEntry[] }) {
  if (!entries || entries.length === 0) return null;
  const hasOrphans = entries.some(e => e.orphans.length > 0);
  return (
    <div className="mt-1 mb-1">
      <div className="text-[10px] text-orange-300 font-bold mb-0.5">FK 무결성 검증 ({entries.length}개 관계)</div>
      <table className="w-full border-collapse text-[9px]">
        <thead>
          <tr className="border-b border-gray-600">
            <th className="px-1 py-0.5 text-gray-500 text-left">FK 관계</th>
            <th className="px-1 py-0.5 text-gray-500 text-right w-10">전체</th>
            <th className="px-1 py-0.5 text-gray-500 text-right w-10">유효</th>
            <th className="px-1 py-0.5 text-gray-500 text-right w-10">고아</th>
            <th className="px-1 py-0.5 text-gray-500 text-center w-8">상태</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={i} className={`border-t border-gray-800 ${e.orphans.length > 0 ? 'bg-red-900/30' : ''}`}>
              <td className="px-1 py-0.5 text-white text-[8px]">{e.relation}</td>
              <td className="px-1 py-0.5 text-right text-gray-300">{e.total}</td>
              <td className="px-1 py-0.5 text-right text-green-300">{e.valid}</td>
              <td className="px-1 py-0.5 text-right text-red-400 font-bold">{e.orphans.length}</td>
              <td className="px-1 py-0.5 text-center">{e.orphans.length === 0 ? '✅' : '❌'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {hasOrphans && (
        <details className="mt-1">
          <summary className="text-[9px] text-red-400 cursor-pointer">고아 레코드 상세 펼치기</summary>
          <div className="ml-2 mt-0.5">
            {entries.filter(e => e.orphans.length > 0).map((e, i) => (
              <div key={i} className="mb-1">
                <div className="text-[9px] text-orange-300">{e.relation}</div>
                {e.orphans.map((o, j) => (
                  <div key={j} className="text-[8px] text-red-300 font-mono ml-2">
                    ID: {o.id} FK: {o.fkValue} {o.name ? `(${o.name})` : ''}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function ParentChildTree({ entries }: { entries: ParentChildEntry[] }) {
  if (!entries || entries.length === 0) return null;
  const hasMissing = entries.some(e => e.missingChildren.length > 0);
  if (!hasMissing) return (
    <div className="mt-1 text-[10px] text-green-300">모자관계 검증: ✅ 모든 부모-자식 관계 정상</div>
  );
  return (
    <div className="mt-1 mb-1">
      <div className="text-[10px] text-purple-300 font-bold mb-0.5">모자관계 검증</div>
      {entries.map((e, i) => (
        <div key={i} className="mb-1">
          <div className="text-[9px]">
            <span className="text-cyan-300">{e.parent}</span>
            <span className="text-gray-500"> → </span>
            <span className="text-blue-300">{e.child}</span>
            {e.missingChildren.length === 0 ? (
              <span className="text-green-400 ml-1">✅</span>
            ) : (
              <span className="text-red-400 ml-1">❌ {e.missingChildren.length}건 누락</span>
            )}
          </div>
          {e.missingChildren.length > 0 && (
            <div className="ml-3">
              {e.missingChildren.slice(0, 10).map((m, j) => (
                <div key={j} className="text-[8px] text-red-300">
                  <span className="font-mono text-yellow-400 mr-1">{m.parentId.substring(0, 12)}</span>
                  {m.parentName}
                </div>
              ))}
              {e.missingChildren.length > 10 && (
                <div className="text-[8px] text-gray-500">...외 {e.missingChildren.length - 10}건</div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function StepDetail({ step, fmeaId }: { step: StepResult; fmeaId: string }) {
  const [showDetail, setShowDetail] = useState(false);
  const colors = STATUS_COLORS[step.status];
  const isParsing = step.name === '파싱';
  const hasCrossCheck = step.crossCheck && step.crossCheck.length > 0;
  const hasFkIntegrity = step.fkIntegrity && step.fkIntegrity.length > 0;
  const hasParentChild = step.parentChild && step.parentChild.length > 0;

  return (
    <div className={`border ${colors.border} rounded p-2 ${colors.bg}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[14px]">{colors.icon}</span>
        <span className={`text-[12px] font-bold ${colors.text}`}>STEP {step.step}: {step.name}</span>
        <button
          onClick={() => setShowDetail(!showDetail)}
          className={`ml-auto px-2 py-0.5 text-[9px] rounded border ${showDetail ? 'bg-blue-700 text-white border-blue-500' : 'bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700'}`}
        >
          {showDetail ? '상세 접기 ▲' : '상세 보기 ▼'}
        </button>
      </div>

      {isParsing ? (
        <ParsingStatsTable details={step.details} />
      ) : (
        <div className="grid grid-cols-4 gap-1 mb-1">
          {Object.entries(step.details).map(([key, val]) => (
            <div key={key} className="text-[9px] bg-black/30 rounded px-1 py-0.5">
              <span className="text-gray-400">{key}:</span>{' '}
              <span className={typeof val === 'number' && val === 0 ? 'text-red-400 font-bold' : 'text-white'}>{String(val)}</span>
            </div>
          ))}
        </div>
      )}

      {hasCrossCheck && <CrossCheckMatrix entries={step.crossCheck!} />}
      {hasFkIntegrity && <FkIntegrityTable entries={step.fkIntegrity!} />}
      {hasParentChild && <ParentChildTree entries={step.parentChild!} />}

      {step.issues.length > 0 && (
        <div className="mt-1">
          {step.issues.map((issue, i) => (
            <div key={i} className="text-[10px] text-red-300">{'\u2022'} {issue}</div>
          ))}
        </div>
      )}

      {step.fixed.length > 0 && (
        <div className="mt-1">
          {step.fixed.map((fix, i) => (
            <div key={i} className="text-[10px] text-blue-300">{'\u2714'} {fix}</div>
          ))}
        </div>
      )}

      {showDetail && (
        <div className="mt-2 border-t border-gray-600 pt-2">
          <PipelineStepDetailView fmeaId={fmeaId} step={step.step} stepName={step.name} stepResult={step} />
        </div>
      )}
    </div>
  );
}
