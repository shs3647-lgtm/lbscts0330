/**
 * @file manual/page.tsx
 * @description 수동 템플릿 모드 — 격리된 state, 기초정보 15시트 탭(엑셀 개별시트 순서), 자동저장
 * @created 2026-02-26
 *
 * ★★★ MASTER DATA 아키텍처 (2026-03-30) ★★★
 * ┌──────────────────────────────────────────────────────────┐
 * │  MASTER DATA (pfmea_master_flat_items)                   │
 * │  ─ 읽기 전용 SSoT (Single Source of Truth)               │
 * │  ─ 모달 오픈 시 초기 데이터로 렌더링됨                    │
 * │  ─ 모달 내 추가/삭제/수정은 MASTER에 저장되지 않음         │
 * │  ─ 프로젝트 승인 시에만 신규 데이터가 역류(중복 배제)      │
 * ├──────────────────────────────────────────────────────────┤
 * │  프로젝트 스키마 (pfmea_pfm26-mXXX)                      │
 * │  ─ 모달에서 편집된 모든 데이터는 여기에만 저장             │
 * │  ─ Atomic DB: L1Structure, L2Structure, L3Structure 등   │
 * │  ─ 최종 확정 시 신규분만 MASTER로 병합(replace:false)      │
 * └──────────────────────────────────────────────────────────┘
 * 흐름: MASTER→복사→모달렌더→편집→프로젝트저장→승인→신규분MASTER역류
 */

'use client';

import Link from 'next/link';
import { useState, useCallback, useMemo, useEffect } from 'react';
import type { ImportedFlatData } from '../types';
import { generateManualTemplateData, INDUSTRY_LABELS } from '../utils/template-data-generator';
import type { ManualTemplateConfig, ExampleIndustry } from '../utils/template-data-generator';
import { PFMEA_BASIC_INFO_EXCEL_TAB_ORDER_V271, PREVIEW_OPTIONS } from '../sampleData';
import { useFmeaSelection } from '../hooks/useFmeaSelection';
import { useAutoSaveOnImport } from '../hooks/useAutoSaveOnImport';
import { BdStatusTable } from '../components/BdStatusTable';
import ImportStepBar from '../components/ImportStepBar';

// ── 상수 ──
const SELECT_CLS = 'px-1.5 py-0.5 border border-gray-300 rounded text-[11px] bg-white';
const LABEL_CLS = 'text-[11px] text-blue-700 font-bold whitespace-nowrap';
const SECTION_CLS = 'flex items-center gap-1';
const M4_LABEL: Record<string, string> = {
  MN: 'text-red-700 bg-red-100 border border-red-300 px-1.5 py-0.5 rounded',
  MC: 'text-blue-700 bg-blue-100 border border-blue-300 px-1.5 py-0.5 rounded',
  IM: 'text-amber-700 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded',
  EN: 'text-pink-700 bg-pink-100 border border-pink-300 px-1.5 py-0.5 rounded',
};

/** 등록양식 `수동_기초정보_Import_v2.7.1.xlsx` 시트 탭 물리 순서 */
const MANUAL_EXCEL_TABS = PFMEA_BASIC_INFO_EXCEL_TAB_ORDER_V271.map((sheetName) => {
  const opt = PREVIEW_OPTIONS.find((o) => o.sheetName === sheetName);
  if (!opt) throw new Error(`PREVIEW_OPTIONS missing sheetName: ${sheetName}`);
  return { code: opt.value, sheetName: opt.sheetName, label: opt.label };
});

const DEFAULT_CONFIG: ManualTemplateConfig = {
  processCount: 3,
  processNaming: 'number' as const,
  commonMN: 1,
  commonEN: 0,
  perProcessMN: 0,
  perProcessMC: 1,
  perProcessIM: 0,
  perProcessEN: 0,
  exampleIndustry: 'sample-001' as ExampleIndustry,
};

function NumSelect({ value, options, onChange, disabled }: {
  value: number; options: number[]; onChange: (v: number) => void; disabled?: boolean;
}) {
  return (
    <select value={value} onChange={e => onChange(Number(e.target.value))} className={SELECT_CLS} disabled={disabled}>
      {options.map(v => <option key={v} value={v}>{v}</option>)}
    </select>
  );
}

export default function ManualImportPage() {
  // ── 격리된 state ──
  const fmea = useFmeaSelection();
  const [flatData, setFlatData] = useState<ImportedFlatData[]>([]);
  const [masterDatasetId, setMasterDatasetId] = useState<string | null>(null);
  const [config, setConfig] = useState<ManualTemplateConfig>(DEFAULT_CONFIG);
  const [generated, setGenerated] = useState(false);
  const [activeSheetCode, setActiveSheetCode] = useState<string>('A1');
  const [masterLoaded, setMasterLoaded] = useState(false);

  const autoSave = useAutoSaveOnImport({
    selectedFmeaId: fmea.selectedFmeaId,
    fmeaType: fmea.selectedFmea?.fmeaType || 'P',
    masterDatasetId,
    setMasterDatasetId,
    setBdStatusList: fmea.setBdStatusList,
    mode: 'template',  // ★ 2026-03-02: failureChains DB 오염 방지
  });

  /**
   * ★★★ MASTER DATA 초기 렌더링 (2026-03-30) ★★★
   * URL에 ?masterSrc=pfm26-m009 형태로 전달되면
   * 해당 MASTER DATA를 초기 데이터로 로드한다.
   * ─ 이 데이터는 모달에 렌더링만 되며, MASTER DB에는 저장되지 않음
   * ─ 사용자가 추가/삭제/수정한 내용은 프로젝트 스키마에만 저장됨
   * ─ 프로젝트 최종 승인 시에만 신규 데이터가 MASTER로 역류 (중복 배제)
   */
  useEffect(() => {
    if (typeof window === 'undefined' || masterLoaded) return;
    const params = new URLSearchParams(window.location.search);
    const masterSrc = params.get('masterSrc');
    if (!masterSrc) return;
    setMasterLoaded(true);
    fetch(`/api/pfmea/master?fmeaId=${masterSrc}&includeItems=true`)
      .then(r => r.json())
      .then(data => {
        const items = data?.dataset?.flatItems || [];
        if (items.length > 0) {
          const mapped: ImportedFlatData[] = items.map((item: any, idx: number) => ({
            id: `master-${idx}-${Date.now()}`,
            processNo: item.processNo || '',
            category: item.category || '',
            itemCode: item.itemCode || '',
            value: item.value || '',
            m4: item.m4 || undefined,
            specialChar: item.specialChar || undefined,
          }));
          setFlatData(mapped);
          setGenerated(true);
          setActiveSheetCode('A1');
        }
      })
      .catch(err => console.error('[MASTER DATA 초기 로드] 오류:', err));
  }, [masterLoaded]);

  const updateConfig = useCallback(<K extends keyof ManualTemplateConfig>(key: K, val: ManualTemplateConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: val }));
  }, []);

  // ── 생성 + 자동저장 ──
  const handleGenerate = useCallback(async () => {
    if (!fmea.selectedFmeaId) {
      alert('FMEA 프로젝트를 먼저 선택하세요.');
      return;
    }
    const raw = generateManualTemplateData(config);
    setFlatData(raw);
    setActiveSheetCode('A1');
    setGenerated(true);
    // 즉시 자동저장
    await autoSave.triggerSave(raw);
  }, [config, fmea.selectedFmeaId, autoSave]);

  // ── 미리보기 통계 ──
  const stats = useMemo(() => {
    const processes = new Set(flatData.filter(d => d.itemCode === 'A1').map(d => d.processNo));
    const a = flatData.filter(d => d.category === 'A');
    const b = flatData.filter(d => d.category === 'B');
    const c = flatData.filter(d => d.category === 'C');
    return { processCount: processes.size, aCount: a.length, bCount: b.length, cCount: c.length, total: flatData.length };
  }, [flatData]);

  const sheetRows = useMemo(() => {
    return flatData
      .filter((d) => d.itemCode === activeSheetCode)
      .slice()
      .sort((a, b) => {
        const pc = a.processNo.localeCompare(b.processNo, undefined, { numeric: true });
        if (pc !== 0) return pc;
        const ma = a.m4 || '';
        const mb = b.m4 || '';
        if (ma !== mb) return ma.localeCompare(mb);
        return a.value.localeCompare(b.value, 'ko');
      });
  }, [flatData, activeSheetCode]);

  const showM4Col = activeSheetCode.startsWith('B');
  const scopeColLabel = activeSheetCode.startsWith('C') ? '구분' : '공정번호';

  const idQ = fmea.selectedFmeaId ? `?id=${encodeURIComponent(fmea.selectedFmeaId)}` : '';

  return (
    <>
      {/* 엑셀 Import는 이 페이지에 없음 — 사용자 안내 */}
      <div className="mb-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-950 leading-relaxed">
        <p className="font-bold text-amber-900 mb-1">엑셀 파일 Import는 이 화면에 없습니다</p>
        <p className="mb-2 text-amber-900/90">
          이 탭은 <strong>생성</strong>으로 빈 템플릿 구조를 만들고 저장하는 곳입니다. 파일 선택(Import) 버튼은 아래 경로에 있습니다.
        </p>
        <ul className="list-disc pl-4 space-y-1 mb-2 text-[10px]">
          <li>
            <strong>위치기반 통합 5시트</strong> 엑셀(L1/L2/L3 통합 + FC): 상단{' '}
            <strong>「기존데이터 Import」</strong> 탭 → 아래로 스크롤 → <strong>기초정보</strong> 패널을 펼친 뒤 우측 툴바의{' '}
            <strong className="text-green-800">Import</strong> 버튼
          </li>
          <li>
            <strong>15탭 등록양식</strong>(수동_기초정보_Import_v2.7.1 등):{' '}
            <Link href={`/pfmea/register${idQ}`} className="text-blue-700 font-bold underline hover:text-blue-900">
              PFMEA 등록
            </Link>
            {' '}→ (관리자) <strong>기초정보 관리 (Admin)</strong> 펼침 → 같은 기초정보 영역의 <strong className="text-green-800">Import</strong>
          </li>
        </ul>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/pfmea/import/legacy${idQ}`}
            className="inline-flex items-center rounded border border-blue-600 bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-blue-700"
          >
            기존데이터 Import로 이동 (5시트·Import)
          </Link>
          <Link
            href={`/pfmea/register${idQ}`}
            className="inline-flex items-center rounded border border-gray-400 bg-white px-2.5 py-1 text-[10px] font-bold text-gray-800 hover:bg-gray-50"
          >
            등록 화면으로 (15탭·Admin Import)
          </Link>
        </div>
      </div>

      {/* ── 설정 패널 ── */}
      <div className="bg-white border border-blue-100 rounded-lg p-3 mb-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[12px] font-bold text-blue-800">수동 템플릿 설정</h3>
          <div className="flex items-center gap-2">
            {autoSave.isSaving && <span className="text-[10px] text-blue-500 animate-pulse">저장 중...</span>}
            {autoSave.lastSaveOk === true && <span className="text-[10px] text-green-600 font-bold">저장 완료</span>}
            <button
              onClick={handleGenerate}
              disabled={autoSave.isSaving}
              className="px-4 py-1.5 bg-blue-600 text-white rounded text-[11px] font-bold hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              생성
            </button>
            {/* FMEA 작성 → 는 아래 ImportStepBar의 FA 완료 후 활성화 */}
          </div>
        </div>

        {/* 설정 1행: 업종/공정수/번호 */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-1.5 items-center">
          <div className={SECTION_CLS}>
            <span className={LABEL_CLS}>업종사례</span>
            <select value={config.exampleIndustry} onChange={e => updateConfig('exampleIndustry', e.target.value as ExampleIndustry)} className={`${SELECT_CLS} font-bold`}>
              {(Object.keys(INDUSTRY_LABELS) as ExampleIndustry[]).map(k => (
                <option key={k} value={k}>{INDUSTRY_LABELS[k]}</option>
              ))}
            </select>
          </div>
          <span className="w-px h-4 bg-blue-200 hidden sm:block" />
          <div className={SECTION_CLS}>
            <span className={LABEL_CLS}>공정갯수</span>
            <NumSelect value={config.processCount} options={[1,2,3,5,10,15,20,30,50]} onChange={v => updateConfig('processCount', v)} />
          </div>
          <div className={SECTION_CLS}>
            <span className={LABEL_CLS}>번호타입</span>
            <select value={config.processNaming} onChange={e => updateConfig('processNaming', e.target.value as 'number' | 'alphabet')} className={SELECT_CLS}>
              <option value="number">10,20,30...</option>
              <option value="alphabet">A,B,C...</option>
            </select>
          </div>
        </div>

        {/* 설정 2행: 4M */}
        <div className="flex flex-wrap gap-x-1.5 gap-y-1 items-center text-[10px]">
          <span className="text-blue-700 font-bold whitespace-nowrap">공통:</span>
          <div className={SECTION_CLS}>
            <span className={`font-bold ${M4_LABEL.MN} ${config.perProcessMN > 0 ? 'opacity-40' : ''}`}>MN</span>
            <NumSelect value={config.commonMN} options={[0,1,2,3,4,5]}
              onChange={v => { updateConfig('commonMN', v); if (v > 0) updateConfig('perProcessMN', 0); }}
              disabled={config.perProcessMN > 0} />
          </div>
          <div className={SECTION_CLS}>
            <span className={`font-bold ${M4_LABEL.EN} ${config.perProcessEN > 0 ? 'opacity-40' : ''}`}>EN</span>
            <NumSelect value={config.commonEN} options={[0,1,2,3,4,5]}
              onChange={v => { updateConfig('commonEN', v); if (v > 0) updateConfig('perProcessEN', 0); }}
              disabled={config.perProcessEN > 0} />
          </div>
          <span className="text-blue-300">|</span>
          <span className="text-blue-700 font-bold whitespace-nowrap">공정별:</span>
          <div className={SECTION_CLS}>
            <span className={`font-bold ${M4_LABEL.MN} ${config.commonMN > 0 ? 'opacity-40' : ''}`}>MN</span>
            <NumSelect value={config.perProcessMN} options={[0,1,2,3,4,5]}
              onChange={v => { updateConfig('perProcessMN', v); if (v > 0) updateConfig('commonMN', 0); }}
              disabled={config.commonMN > 0} />
          </div>
          <div className={SECTION_CLS}>
            <span className={`font-bold ${M4_LABEL.MC}`}>MC</span>
            <NumSelect value={config.perProcessMC} options={[0,1,2,3,4,5]} onChange={v => updateConfig('perProcessMC', v)} />
          </div>
          <div className={SECTION_CLS}>
            <span className={`font-bold ${M4_LABEL.IM}`}>IM</span>
            <NumSelect value={config.perProcessIM} options={[0,1,2,3,4,5]} onChange={v => updateConfig('perProcessIM', v)} />
          </div>
          <div className={SECTION_CLS}>
            <span className={`font-bold ${M4_LABEL.EN} ${config.commonEN > 0 ? 'opacity-40' : ''}`}>EN</span>
            <NumSelect value={config.perProcessEN} options={[0,1,2,3,4,5]}
              onChange={v => { updateConfig('perProcessEN', v); if (v > 0) updateConfig('commonEN', 0); }}
              disabled={config.commonEN > 0} />
          </div>
        </div>
      </div>

      {/* ── 미리보기 ── */}
      {generated && flatData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 mb-2">
          <div className="flex flex-wrap items-center gap-3 mb-2 text-[10px] text-gray-500">
            <span>공정 <b className="text-blue-700">{stats.processCount}</b></span>
            <span>L2(A) <b>{stats.aCount}</b></span>
            <span>L3(B) <b>{stats.bCount}</b></span>
            <span>L1(C) <b>{stats.cCount}</b></span>
            <span>합계 <b className="text-blue-700">{stats.total}</b></span>
            <span className="text-gray-400">시트 탭명 = 수동_기초정보_Import_v2.7.1.xlsx</span>
          </div>
          <p className="text-[10px] text-gray-500 mb-1.5">시트 선택 (엑셀 워크북 탭과 동일한 이름·순서)</p>
          <div className="flex flex-wrap gap-0.5 mb-2 border-b border-gray-200 pb-2">
            {MANUAL_EXCEL_TABS.map(({ code, sheetName }) => (
              <button
                key={code}
                type="button"
                title={`${code} · ${sheetName}`}
                onClick={() => setActiveSheetCode(code)}
                className={`px-1 py-0.5 rounded-t text-[9px] font-medium border border-b-0 cursor-pointer text-left leading-tight max-w-[10.5rem] whitespace-normal ${
                  activeSheetCode === code
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
              >
                {sheetName}
              </button>
            ))}
          </div>
          <div className="text-[10px] text-gray-600 mb-1 font-medium" title={MANUAL_EXCEL_TABS.find((t) => t.code === activeSheetCode)?.sheetName}>
            {MANUAL_EXCEL_TABS.find((t) => t.code === activeSheetCode)?.sheetName}
            <span className="text-gray-400 font-normal ml-1">({sheetRows.length}행)</span>
          </div>
          <div className="max-h-[320px] overflow-auto">
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="bg-blue-50">
                  <th className="border border-gray-300 px-1.5 py-1 text-center w-[56px]">{scopeColLabel}</th>
                  {showM4Col && (
                    <th className="border border-gray-300 px-1.5 py-1 text-center w-[40px]">4M</th>
                  )}
                  <th className="border border-gray-300 px-1.5 py-1 text-left">내용</th>
                  <th className="border border-gray-300 px-1.5 py-1 text-center w-[36px]">특별특성</th>
                </tr>
              </thead>
              <tbody>
                {sheetRows.length === 0 ? (
                  <tr>
                    <td colSpan={showM4Col ? 4 : 3} className="border border-gray-200 px-2 py-3 text-center text-gray-400">
                      이 시트에 해당하는 행이 없습니다.
                    </td>
                  </tr>
                ) : (
                  sheetRows.map((row) => (
                    <tr key={row.id}>
                      <td className="border border-gray-200 px-1.5 py-0.5 text-center font-mono text-blue-600">{row.processNo}</td>
                      {showM4Col && (
                        <td className="border border-gray-200 px-1 py-0.5 text-center">
                          {row.m4 ? <span className={`font-bold text-[9px] ${M4_LABEL[row.m4] || ''}`}>{row.m4}</span> : '—'}
                        </td>
                      )}
                      <td className="border border-gray-200 px-1.5 py-0.5 align-top">{row.value}</td>
                      <td className="border border-gray-200 px-1 py-0.5 text-center text-[9px]">{row.specialChar?.trim() || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SA→FC→FA 검증 + FMEA 작성 ── */}
      {generated && flatData.length > 0 && fmea.selectedFmeaId && autoSave.lastSaveOk && (
        <ImportStepBar
          flatData={flatData}
          fmeaId={fmea.selectedFmeaId}
          fmeaInfo={{ fmeaType: fmea.selectedFmea?.fmeaType || 'P' }}
        />
      )}

      {/* ── BD 현황 테이블 ── */}
      <BdStatusTable
        bdStatusList={fmea.bdStatusList}
        selectedFmeaId={fmea.selectedFmeaId}
        setSelectedFmeaId={fmea.setSelectedFmeaId}
        onDeleteDatasets={fmea.handleDeleteDatasets}
        adminMode={fmea.adminMode}
        isAdmin={fmea.isAdmin}
        onToggleAdminMode={fmea.handleToggleAdminMode}
        onRestoreDatasets={fmea.handleRestoreDatasets}
        onPermanentDeleteDatasets={fmea.handlePermanentDeleteDatasets}
      />
    </>
  );
}
