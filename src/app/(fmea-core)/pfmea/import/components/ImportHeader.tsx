/**
 * @file ImportHeader.tsx
 * @description PFMEA Import 페이지 헤더 컴포넌트 (BD 연동 테이블 + 기초정보 데이터 현황)
 * @author AI Assistant
 * @created 2026-01-21
 * @updated 2026-02-17 - BdLinkageTable 분리, 기존 6컬럼 테이블 교체
 */

'use client';

import React from 'react';
import { ImportHeaderProps } from './ImportPageTypes';
import HelpIcon from '@/components/common/HelpIcon';
import { BdStatusTable } from './BdStatusTable';
import { BdLinkageTable } from './BdLinkageTable';

interface DataCount {
  itemCount: number;
  dataCount: number;
}

export function ImportHeader({
  fmeaList,
  selectedFmeaId,
  setSelectedFmeaId,
  mode,
  fmeaTypeFromUrl,
  onDownloadSample,
  onDownloadEmpty,
  previewDataCount,
  bdStatusList,
  onCopyFromParent,
  onSelectAndCopy,
}: ImportHeaderProps & { previewDataCount?: DataCount }) {
  return (
    <>
      {/* 제목 + 도움말 */}
      <div className="flex items-center gap-2 mb-3">
        <h1 className="text-[15px] font-bold text-[#00587a]">
          FMEA Basic Data 템플렛 다운로드
        </h1>
        <HelpIcon title="FMEA Basic Data 도움말" popoverWidth={440}>
          <div style={{ lineHeight: 1.9 }}>
            <p style={{ fontWeight: 700, marginBottom: 6, color: '#0c4a6e' }}>PFMEA Basic Data란?</p>
            <p>PFMEA 구조분석 워크시트에 사용되는 기초정보(공정명, 기능, 고장모드 등)를 엑셀로 관리하는 기능입니다.</p>

            <p style={{ fontWeight: 700, marginTop: 12, marginBottom: 6, color: '#2563eb' }}>M / F / P 계층 구조</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '4px 6px', fontWeight: 700, color: '#2563eb' }}>MBD</td>
                  <td style={{ padding: '4px 6px' }}>Master FMEA Basic Data — 전 차종 공통 기초정보 (기준)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '4px 6px', fontWeight: 700, color: '#2563eb' }}>FBD</td>
                  <td style={{ padding: '4px 6px' }}>Family FMEA Basic Data — 동일 제품군 공통 기초정보</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 6px', fontWeight: 700, color: '#16a34a' }}>PBD</td>
                  <td style={{ padding: '4px 6px' }}>Part FMEA Basic Data — 개별 부품 기초정보</td>
                </tr>
              </tbody>
            </table>

            <p style={{ fontWeight: 700, marginTop: 12, marginBottom: 6, color: '#0c4a6e' }}>사용 순서</p>
            <ol style={{ paddingLeft: 18, margin: 0 }}>
              <li>BD현황에서 FMEA 선택 후 엑셀 파일 업로드</li>
              <li>미리보기 패널에서 데이터 확인 및 편집</li>
              <li>저장 → 구조분석 워크시트에서 활용</li>
            </ol>

            <p style={{ fontWeight: 700, marginTop: 12, marginBottom: 6, color: '#0c4a6e' }}>연동 FMEA</p>
            <p>등록 시 연결한 상위 FMEA가 표시됩니다. 상위 데이터를 가져오면 &quot;연동&quot;, 직접 Import하면 &quot;변경&quot;으로 표시됩니다.</p>
          </div>
        </HelpIcon>
      </div>

      {/* FMEA 유형별 안내 메시지 (등록화면에서 넘어온 경우) */}
      {mode === 'excel' && fmeaTypeFromUrl && (
        <div className={`mb-3 px-4 py-3 rounded-lg border-2 ${
          fmeaTypeFromUrl === 'M' ? 'bg-blue-50 border-blue-300' :
          fmeaTypeFromUrl === 'F' ? 'bg-blue-50 border-blue-300' :
          'bg-green-50 border-green-300'
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {fmeaTypeFromUrl === 'M' ? '🔵' : fmeaTypeFromUrl === 'F' ? '🔵' : '🟢'}
            </span>
            <div>
              <div className={`font-bold text-sm ${
                fmeaTypeFromUrl === 'M' ? 'text-blue-700' :
                fmeaTypeFromUrl === 'F' ? 'text-blue-700' :
                'text-green-700'
              }`}>
                {fmeaTypeFromUrl === 'M' ? 'Master' : fmeaTypeFromUrl === 'F' ? 'Family' : 'Part'} FMEA Basic Data Import
              </div>
              <div className="text-xs text-gray-600 mt-1">
                아래에서 FMEA명을 선택한 후, 엑셀 파일을 업로드하세요.
                {fmeaTypeFromUrl === 'M' && ' Master FMEA는 다른 FMEA의 기준이 됩니다.'}
                {fmeaTypeFromUrl === 'F' && ' Family FMEA는 동일 제품군에 적용됩니다.'}
                {fmeaTypeFromUrl === 'P' && ' Part FMEA는 개별 부품에 적용됩니다.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ★★★ 2026-02-17: BD 연동 테이블 (구분/BD ID/등록FMEA/연동FMEA/상태/샘플/데이터현황) ★★★ */}
      <BdLinkageTable
        fmeaList={fmeaList}
        selectedFmeaId={selectedFmeaId}
        bdStatusList={bdStatusList}
        previewDataCount={previewDataCount}
        onDownloadSample={onDownloadSample}
        onDownloadEmpty={onDownloadEmpty}
        onCopyFromParent={onCopyFromParent}
      />

      {/* ★★★ 2026-02-17: BD 현황 (별도 컴포넌트 - 검색/소팅/9컬럼) ★★★ */}
      {bdStatusList && bdStatusList.length > 0 && (
        <BdStatusTable
          bdStatusList={bdStatusList}
          selectedFmeaId={selectedFmeaId}
          setSelectedFmeaId={setSelectedFmeaId}
          onSelectAndCopy={onSelectAndCopy}
        />
      )}
    </>
  );
}

export default ImportHeader;
