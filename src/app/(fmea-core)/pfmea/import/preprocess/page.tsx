/**
 * @file preprocess/page.tsx
 * @description STEP B 전처리 페이지 — 3단계 UI
 * 1. 업로드: 파일 선택 + "변환" 버튼
 * 2. 미리보기: 통계 + 경고 리포트 + 데이터 테이블
 * 3. 저장 완료: DB 저장 후 워크시트 이동
 * @created 2026-03-05
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import StepBWarningReport from '../components/StepBWarningReport';
import { saveMasterDataset } from '../utils/master-api';
import ImportStepBar from '../components/ImportStepBar';
import type { MasterFailureChain } from '../types/masterFailureChain';
import type { StepBConvertResult, StepBStatistics } from '../stepb-parser';

type Step = 'upload' | 'preview' | 'done';

export default function PreprocessPage() {
  const searchParams = useSearchParams();
  const fmeaId = searchParams.get('id') || '';
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [isConverting, setIsConverting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<StepBConvertResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 파일 변환 핸들러
  const handleConvert = useCallback(async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setErrorMsg('파일을 선택해주세요.');
      return;
    }
    if (!file.name.endsWith('.xlsx')) {
      setErrorMsg('.xlsx 파일만 지원합니다. .xls 파일은 Excel에서 .xlsx로 저장 후 사용해주세요.');
      return;
    }
    if (!fmeaId) {
      setErrorMsg('FMEA ID가 없습니다. Import 메뉴에서 프로젝트를 선택한 후 진행해주세요.');
      return;
    }

    setIsConverting(true);
    setErrorMsg('');

    try {
      // 동적 import (클라이언트 번들 최적화)
      const { parseStepBWorkbook } = await import('../stepb-parser');
      const convertResult = await parseStepBWorkbook(file);

      setResult(convertResult);
      setFileName(file.name);

      // ERROR 레벨 경고가 있으면 미리보기에서 경고 표시
      const hasError = convertResult.warnings.some(w => w.level === 'ERROR');
      if (convertResult.flatData.length === 0 || hasError) {
        setErrorMsg('변환에 실패했거나 데이터가 없습니다. 경고 리포트를 확인해주세요.');
      }
      setStep('preview');
    } catch (err) {
      console.error('[전처리] 변환 오류:', err);
      setErrorMsg(`변환 중 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
    } finally {
      setIsConverting(false);
    }
  }, [fmeaId]);

  // DB 저장 핸들러
  const handleSave = useCallback(async () => {
    if (!result || !fmeaId) return;
    setIsSaving(true);
    setErrorMsg('');

    try {
      const saveResult = await saveMasterDataset({
        fmeaId,
        fmeaType: 'PFMEA',
        name: `STEPB-${fileName}`,
        replace: true,
        mode: 'import',
        flatData: result.flatData,
        failureChains: result.failureChains,
      });

      if (!saveResult.ok) {
        setErrorMsg('DB 저장에 실패했습니다.');
        return;
      }

      setStep('done');
    } catch (err) {
      console.error('[전처리] 저장 오류:', err);
      setErrorMsg(`저장 중 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
    } finally {
      setIsSaving(false);
    }
  }, [result, fmeaId, fileName]);

  // 다시 시작
  const handleReset = useCallback(() => {
    setStep('upload');
    setResult(null);
    setFileName('');
    setErrorMsg('');
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-bold text-gray-800">
          STEP B 전처리 변환
        </h2>
        <StepIndicator current={step} />
      </div>

      {/* 에러 메시지 */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-[11px] text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Step 1: 업로드 */}
      {step === 'upload' && (
        <UploadSection
          fileRef={fileRef}
          isConverting={isConverting}
          onConvert={handleConvert}
          fmeaId={fmeaId}
        />
      )}

      {/* Step 2: 미리보기 */}
      {step === 'preview' && result && (
        <PreviewSection
          result={result}
          fileName={fileName}
          isSaving={isSaving}
          onSave={handleSave}
          onReset={handleReset}
        />
      )}

      {/* Step 3: 완료 — SA→FC→FA 검증 후 FMEA 작성 */}
      {step === 'done' && (
        <DoneSection
          statistics={result?.statistics}
          onReset={handleReset}
          flatData={result?.flatData}
          failureChains={result?.failureChains as MasterFailureChain[] | undefined}
          fmeaId={fmeaId}
        />
      )}
    </div>
  );
}

// ── 서브 컴포넌트 ──

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { key: 'upload', label: '1. 업로드' },
    { key: 'preview', label: '2. 미리보기' },
    { key: 'done', label: '3. 완료' },
  ];
  return (
    <div className="flex items-center gap-1 text-[10px]">
      {steps.map((s, i) => (
        <span key={s.key} className="flex items-center gap-1">
          {i > 0 && <span className="text-gray-300">→</span>}
          <span className={current === s.key ? 'text-blue-700 font-bold' : 'text-gray-400'}>
            {s.label}
          </span>
        </span>
      ))}
    </div>
  );
}

function UploadSection({
  fileRef,
  isConverting,
  onConvert,
  fmeaId,
}: {
  fileRef: React.RefObject<HTMLInputElement | null>;
  isConverting: boolean;
  onConvert: () => void;
  fmeaId: string;
}) {
  return (
    <div className="bg-white rounded border border-gray-200 p-4 space-y-3">
      <div className="text-[11px] text-gray-600 space-y-1">
        <p className="font-bold">STEP B 엑셀 파일을 업로드하면 Smart FMEA Import 형식으로 자동 변환합니다.</p>
        <ul className="list-disc list-inside text-[10px] text-gray-500 space-y-0.5">
          <li>헤더 자동감지 — &quot;고장형태&quot;+&quot;고장원인&quot; 키워드 기반</li>
          <li>carry-forward — 병합셀 누락 자동 보완</li>
          <li>prefix 제거 — 공정번호 접두사 자동 제거</li>
          <li>01번 공통 공정 자동 삽입</li>
          <li>교차 검증 — FE/FM/FC 카운트 일치 확인</li>
        </ul>
        {!fmeaId && (
          <p className="text-red-500 font-bold">⚠ FMEA 프로젝트를 먼저 선택해주세요.</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx"
          className="text-[11px] file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <button
          onClick={onConvert}
          disabled={isConverting || !fmeaId}
          className="px-4 py-1.5 bg-blue-600 text-white text-[11px] font-bold rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConverting ? '변환중...' : '변환 시작'}
        </button>
      </div>

      <div className="text-[10px] text-gray-400">
        ※ .xls 파일은 지원하지 않습니다. Excel에서 &quot;다른 이름으로 저장&quot; → .xlsx 형식으로 변환 후 업로드해주세요.
      </div>
    </div>
  );
}

function PreviewSection({
  result,
  fileName,
  isSaving,
  onSave,
  onReset,
}: {
  result: StepBConvertResult;
  fileName: string;
  isSaving: boolean;
  onSave: () => void;
  onReset: () => void;
}) {
  const { statistics, warnings, flatData, failureChains } = result;
  const hasError = warnings.some(w => w.level === 'ERROR');
  const autoItems = flatData.filter(d => d.inherited);

  return (
    <div className="space-y-2">
      {/* 통계 바 */}
      <div className="bg-white rounded border border-gray-200 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-bold text-gray-700">변환 결과: {fileName}</span>
          <div className="flex gap-1">
            <button
              onClick={onReset}
              className="px-3 py-1 text-[11px] rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              다시 선택
            </button>
            <button
              onClick={onSave}
              disabled={isSaving || hasError || flatData.length === 0}
              className="px-4 py-1 bg-green-600 text-white text-[11px] font-bold rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? '저장중...' : 'DB 저장'}
            </button>
          </div>
        </div>

        <StatisticsBar statistics={statistics} autoCount={autoItems.length} chainCount={failureChains.length} />
      </div>

      {/* 경고 리포트 */}
      <StepBWarningReport warnings={warnings} />

      {/* 데이터 미리보기 테이블 */}
      <DataPreviewTable flatData={flatData} chainCount={failureChains.length} />
    </div>
  );
}

function StatisticsBar({
  statistics,
  autoCount,
  chainCount,
}: {
  statistics: StepBStatistics;
  autoCount: number;
  chainCount: number;
}) {
  const items = [
    { label: '공정', value: statistics.processCount, color: 'text-blue-700' },
    { label: 'FM', value: statistics.fmCount, color: 'text-purple-700' },
    { label: 'FC', value: statistics.fcCount, color: 'text-orange-700' },
    { label: 'FE', value: statistics.feCount, color: 'text-green-700' },
    { label: 'FC사슬', value: chainCount, color: 'text-red-700' },
    { label: '자동생성', value: autoCount, color: 'text-red-500' },
  ];

  return (
    <div className="flex flex-wrap gap-3 text-[11px]">
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-1">
          <span className="text-gray-500">{item.label}:</span>
          <span className={`font-bold ${item.color}`}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function DataPreviewTable({
  flatData,
  chainCount,
}: {
  flatData: StepBConvertResult['flatData'];
  chainCount: number;
}) {
  // itemCode별 카운트
  const codeCount = new Map<string, number>();
  for (const d of flatData) {
    codeCount.set(d.itemCode, (codeCount.get(d.itemCode) || 0) + 1);
  }

  const LABELS: Record<string, string> = {
    A1: '공정번호', A2: '공정명', A3: '공정기능', A4: '제품특성', A5: '고장형태',
    B1: '작업요소', B2: '요소기능', B3: '공정특성', B4: '고장원인',
    C1: '구분', C4: '고장영향',
  };

  const codes = ['A1', 'A2', 'A3', 'A4', 'A5', 'B1', 'B2', 'B3', 'B4', 'C1', 'C4'];

  return (
    <div className="bg-white rounded border border-gray-200 p-3">
      <div className="text-[11px] font-bold text-gray-700 mb-2">데이터 미리보기</div>
      <table className="w-full text-[10px]">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="text-left px-2 py-1 text-gray-600">코드</th>
            <th className="text-left px-2 py-1 text-gray-600">항목</th>
            <th className="text-right px-2 py-1 text-gray-600">건수</th>
            <th className="text-left px-2 py-1 text-gray-600">미리보기 (상위 3건)</th>
          </tr>
        </thead>
        <tbody>
          {codes.map(code => {
            const count = codeCount.get(code) || 0;
            const items = flatData.filter(d => d.itemCode === code).slice(0, 3);
            return (
              <tr key={code} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-2 py-1 font-mono font-bold text-blue-600">{code}</td>
                <td className="px-2 py-1 text-gray-600">{LABELS[code] || code}</td>
                <td className="px-2 py-1 text-right font-bold">{count}</td>
                <td className="px-2 py-1 text-gray-500 truncate max-w-[300px]">
                  {items.map((d, i) => (
                    <span key={d.id}>
                      {i > 0 && ', '}
                      <span className={d.inherited ? 'text-red-500' : ''}>
                        {d.value.substring(0, 30)}{d.value.length > 30 ? '...' : ''}
                      </span>
                    </span>
                  ))}
                  {count > 3 && <span className="text-gray-300"> ... 외 {count - 3}건</span>}
                </td>
              </tr>
            );
          })}
          <tr className="border-b border-gray-100 bg-orange-50">
            <td className="px-2 py-1 font-mono font-bold text-orange-600">FC</td>
            <td className="px-2 py-1 text-gray-600">고장사슬</td>
            <td className="px-2 py-1 text-right font-bold">{chainCount}</td>
            <td className="px-2 py-1 text-gray-500 text-[9px]">FE↔FM↔FC + PC/DC/S/O/D/AP</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function DoneSection({
  statistics,
  onReset,
  flatData,
  failureChains,
  fmeaId,
}: {
  statistics?: StepBStatistics;
  onReset: () => void;
  flatData?: StepBConvertResult['flatData'];
  failureChains?: MasterFailureChain[];
  fmeaId: string;
}) {
  return (
    <div className="space-y-3">
      <div className="bg-white rounded border border-green-200 p-4 text-center space-y-2">
        <div className="text-[14px] font-bold text-green-700">DB 저장 완료</div>
        {statistics && (
          <div className="text-[11px] text-gray-600">
            공정 {statistics.processCount}개 · FM {statistics.fmCount}건 · FC {statistics.fcCount}건 · FE {statistics.feCount}건 · 사슬 {statistics.chainCount}건
          </div>
        )}
        <button
          onClick={onReset}
          className="px-4 py-1.5 text-[11px] rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
        >
          다른 파일 전처리
        </button>
      </div>

      {/* SA→FC→FA 검증 + FMEA 작성 */}
      {flatData && flatData.length > 0 && fmeaId && (
        <ImportStepBar
          flatData={flatData}
          fmeaId={fmeaId}
          failureChains={failureChains}
          fmeaInfo={{ fmeaType: 'P' }}
        />
      )}
    </div>
  );
}
