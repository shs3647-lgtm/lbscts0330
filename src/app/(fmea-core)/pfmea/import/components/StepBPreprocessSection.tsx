/**
 * @file StepBPreprocessSection.tsx
 * @description STEP A/B 전처리 인라인 섹션 — TemplateGeneratorPanel 내 전처리 탭 콘텐츠
 * STEP B (필수) + STEP A (선택) → 병합 변환 → 경고 리포트 → DB 저장
 * @created 2026-03-05
 * @updated 2026-03-05 — UI 간소화 (설명→도움말 이동)
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import StepBWarningReport from './StepBWarningReport';
import { saveMasterDataset } from '../utils/master-api';
import type { StepBConvertResult } from '../stepb-parser';
import HelpIcon from '@/components/common/HelpIcon';

interface StepBPreprocessSectionProps {
  selectedFmeaId?: string;
  onSaved?: () => void;
}

export default function StepBPreprocessSection({ selectedFmeaId, onSaved }: StepBPreprocessSectionProps) {
  const stepBFileRef = useRef<HTMLInputElement>(null);
  const stepAFileRef = useRef<HTMLInputElement>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<StepBConvertResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [stepAFileName, setStepAFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saved, setSaved] = useState(false);

  const handleConvert = useCallback(async () => {
    const stepBFile = stepBFileRef.current?.files?.[0];
    if (!stepBFile) { setErrorMsg('STEP B 파일을 선택해주세요.'); return; }
    if (!stepBFile.name.endsWith('.xlsx')) {
      setErrorMsg('.xlsx 파일만 지원합니다. .xls는 Excel에서 .xlsx로 저장 후 사용해주세요.');
      return;
    }
    if (!selectedFmeaId) {
      setErrorMsg('FMEA 프로젝트를 먼저 선택해주세요.');
      return;
    }

    const stepAFile = stepAFileRef.current?.files?.[0];
    if (stepAFile && !stepAFile.name.endsWith('.xlsx')) {
      setErrorMsg('STEP A도 .xlsx 파일만 지원합니다.');
      return;
    }

    setIsConverting(true);
    setErrorMsg('');
    setSaved(false);

    try {
      const { parseStepBWorkbook } = await import('../stepb-parser');
      let convertResult: StepBConvertResult;

      if (stepAFile) {
        const { parseStepAWorkbook, mergeStepAB } = await import('../stepa-parser');
        const [stepAResult, stepBResult] = await Promise.all([
          parseStepAWorkbook(stepAFile),
          parseStepBWorkbook(stepBFile),
        ]);
        convertResult = mergeStepAB(stepAResult, stepBResult);
        setStepAFileName(stepAFile.name);
      } else {
        convertResult = await parseStepBWorkbook(stepBFile);
        setStepAFileName('');
      }

      setResult(convertResult);
      setFileName(stepBFile.name);

      if (convertResult.flatData.length === 0) {
        setErrorMsg('변환된 데이터가 없습니다. 경고 리포트를 확인해주세요.');
      }
    } catch (err) {
      console.error('[전처리] 변환 오류:', err);
      const msg = err instanceof Error ? err.message : '알 수 없는 오류';
      if (msg.includes('end of central directory') || msg.includes('zip')) {
        setErrorMsg('파일 형식 오류: 실제 .xlsx가 아닙니다. Excel에서 "다른 이름으로 저장" → .xlsx 형식으로 저장 후 다시 시도해주세요.');
      } else {
        setErrorMsg(`변환 오류: ${msg}`);
      }
    } finally {
      setIsConverting(false);
    }
  }, [selectedFmeaId]);

  const handleSave = useCallback(async () => {
    if (!result || !selectedFmeaId) return;
    setIsSaving(true);
    setErrorMsg('');

    try {
      const label = stepAFileName ? `STEPAB-${fileName}` : `STEPB-${fileName}`;
      const saveResult = await saveMasterDataset({
        fmeaId: selectedFmeaId,
        fmeaType: 'PFMEA',
        name: label,
        replace: true,
        mode: 'import',
        flatData: result.flatData,
        failureChains: result.failureChains,
      });
      if (!saveResult.ok) {
        setErrorMsg('DB 저장 실패');
        return;
      }
      setSaved(true);
      onSaved?.();
    } catch (err) {
      console.error('[전처리] 저장 오류:', err);
      setErrorMsg(`저장 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
    } finally {
      setIsSaving(false);
    }
  }, [result, selectedFmeaId, fileName, stepAFileName, onSaved]);

  const handleReset = useCallback(() => {
    setResult(null);
    setFileName('');
    setStepAFileName('');
    setErrorMsg('');
    setSaved(false);
    if (stepBFileRef.current) stepBFileRef.current.value = '';
    if (stepAFileRef.current) stepAFileRef.current.value = '';
  }, []);

  return (
    <div className="space-y-2">
      {/* 헤더: 타이틀 + 도움말 */}
      <div className="flex items-center gap-1">
        <span className="font-bold text-[11px] text-gray-700">STEP B 전처리</span>
        <HelpIcon title="전처리 도움말" popoverWidth={360}>
          <div style={{ lineHeight: 1.7, fontSize: 11 }}>
            <p style={{ fontWeight: 700, marginBottom: 4, color: '#0c4a6e' }}>STEP B 엑셀 → Smart FMEA 자동 변환</p>
            <p>헤더 자동감지 · carry-forward · prefix 제거 · 01번 공통공정 · V1~V4 검증</p>
            <p style={{ color: '#2563eb', marginTop: 4 }}>STEP A 파일도 함께 업로드하면 A3/B2/C2/C3 원본 데이터로 보강됩니다.</p>
            <p style={{ marginTop: 6, color: '#6b7280', fontSize: 10 }}>※ .xlsx만 지원 (.xls는 Excel에서 .xlsx로 저장 후 사용)</p>
          </div>
        </HelpIcon>
      </div>

      {/* 에러 */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded px-2 py-1 text-[10px] text-red-600">{errorMsg}</div>
      )}

      {/* 저장 완료 + 기존데이터 이동 버튼 */}
      {saved && (
        <div className="bg-green-50 border border-green-200 rounded px-2 py-1 text-[10px] text-green-700 font-bold flex items-center gap-2">
          <span>DB 저장 완료 — 공정 {result?.statistics.processCount}개 · FM {result?.statistics.fmCount}건 · FC사슬 {result?.statistics.chainCount}건</span>
          <button
            onClick={() => onSaved?.()}
            className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded hover:bg-blue-700 whitespace-nowrap"
          >
            기존데이터로 이동 →
          </button>
        </div>
      )}

      {/* 파일 선택 + 버튼 — 한 줄 배치 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold text-blue-700">B<span className="text-[8px] text-blue-400 ml-0.5">필수</span></span>
        <input
          ref={stepBFileRef}
          type="file"
          accept=".xlsx"
          className="text-[10px] file:mr-1 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 max-w-[180px]"
        />
        <span className="text-[10px] font-bold text-gray-400">A<span className="text-[8px] ml-0.5">선택</span></span>
        <input
          ref={stepAFileRef}
          type="file"
          accept=".xlsx"
          className="text-[10px] file:mr-1 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-gray-50 file:text-gray-500 hover:file:bg-gray-100 max-w-[180px]"
        />
        <button
          onClick={handleConvert}
          disabled={isConverting || !selectedFmeaId}
          className="px-3 py-1 bg-blue-600 text-white text-[10px] font-bold rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConverting ? '변환중...' : '변환'}
        </button>
        {result && !saved && (
          <button
            onClick={handleSave}
            disabled={isSaving || result.flatData.length === 0}
            className="px-3 py-1 bg-green-600 text-white text-[10px] font-bold rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? '저장중...' : 'DB 저장'}
          </button>
        )}
        {result && (
          <button onClick={handleReset} className="px-2 py-1 text-[10px] text-gray-500 border border-gray-300 rounded hover:bg-gray-50">
            초기화
          </button>
        )}
      </div>

      {!selectedFmeaId && (
        <div className="text-[10px] text-red-500 font-bold">FMEA 프로젝트를 먼저 선택해주세요.</div>
      )}

      {/* 변환 결과 통계 */}
      {result && (
        <div className="space-y-1">
          <div className="flex flex-wrap gap-2 text-[10px]">
            <span className="text-gray-500">B: <strong className="text-gray-700">{fileName}</strong></span>
            {stepAFileName && (
              <span className="text-blue-500">+ A: <strong className="text-blue-700">{stepAFileName}</strong></span>
            )}
            <span>공정: <strong className="text-blue-700">{result.statistics.processCount}</strong></span>
            <span>FM: <strong className="text-purple-700">{result.statistics.fmCount}</strong></span>
            <span>FC: <strong className="text-orange-700">{result.statistics.fcCount}</strong></span>
            <span>FE: <strong className="text-green-700">{result.statistics.feCount}</strong></span>
            <span>사슬: <strong className="text-red-700">{result.statistics.chainCount}</strong></span>
            {result.statistics.autoGeneratedCount > 0 && (
              <span className="text-red-500">자동생성: <strong>{result.statistics.autoGeneratedCount}</strong></span>
            )}
          </div>
          <StepBWarningReport warnings={result.warnings} />
        </div>
      )}
    </div>
  );
}
