/**
 * @file LLDHelpModal.tsx
 * @description 습득교훈(LLD) 관리 도움말 모달
 */

'use client';

import React from 'react';

interface LLDHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LLDHelpModal({ isOpen, onClose }: LLDHelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-[640px] max-h-[80vh] overflow-y-auto p-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-[#00587a]">📖 습득교훈(LLD) 관리 도움말 (Help)</h2>
          <button className="text-gray-400 hover:text-gray-600 text-lg font-bold" onClick={onClose}>✕</button>
        </div>

        <div className="space-y-3 text-[11px] text-gray-700 leading-relaxed">
          {/* 1. 구분 (Classification) */}
          <section>
            <h3 className="font-bold text-[12px] text-[#00587a] mb-1">1. 구분 (Classification)</h3>
            <table className="w-full text-[10px] border-collapse border border-slate-300">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-300 px-2 py-1 w-24">구분</th>
                  <th className="border border-slate-300 px-2 py-1">설명</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { code: 'RMA', color: '#ef4444', desc: '반품 분석 — 고객 반품으로 발견된 불량 및 개선 이력' },
                  { code: 'ABN', color: '#f97316', desc: '이상 발생 — 공정 중 발생한 이상(Abnormality) 기록' },
                  { code: 'CIP', color: '#22c55e', desc: '지속 개선 — 지속적 개선 활동(Continuous Improvement) 기록' },
                  { code: 'ECN', color: '#3b82f6', desc: '변경점 — 설계/공정 변경 관련 교훈 (Engineering Change Notice)' },
                  { code: 'Field Issue', color: '#a855f7', desc: '필드 이슈 — 양산/출하 후 현장에서 발생한 문제' },
                  { code: 'DevIssue', color: '#6366f1', desc: '개발 이슈 — 개발 단계에서 발생한 이슈 기록' },
                ].map(item => (
                  <tr key={item.code}>
                    <td className="border border-slate-300 px-2 py-1 text-center font-bold text-white" style={{ backgroundColor: item.color }}>{item.code}</td>
                    <td className="border border-slate-300 px-2 py-1">{item.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* 2. 기능 버튼 */}
          <section>
            <h3 className="font-bold text-[12px] text-[#00587a] mb-1">2. 기능 버튼</h3>
            <table className="w-full text-[10px] border-collapse border border-slate-300">
              <tbody>
                {[
                  { btn: '↑Import', bg: '#22c55e', desc: 'Excel 파일에서 LLD 데이터를 불러옵니다' },
                  { btn: '↓Export', bg: '#f97316', desc: '현재 LLD 테이블 데이터를 Excel 파일로 내보냅니다' },
                  { btn: '📋양식', bg: '#64748b', desc: '빈 Import 양식(템플릿)을 다운로드합니다' },
                  { btn: '⇄H.P.', bg: '#a855f7', desc: 'Horizontal Propagation — 다른 프로젝트에 교훈을 수평전개합니다' },
                  { btn: '+Add Row', bg: '#3b82f6', desc: '수동으로 새 행을 추가합니다' },
                  { btn: '⊞Save', bg: '#0d47a1', desc: '수동 입력/Import한 데이터를 DB에 저장합니다' },
                  { btn: '✕Close', bg: '#94a3b8', desc: '화면을 닫고 이전 화면으로 돌아갑니다' },
                ].map(item => (
                  <tr key={item.btn}>
                    <td className="border border-slate-300 px-2 py-1 font-bold text-white w-24 text-center" style={{ backgroundColor: item.bg }}>{item.btn}</td>
                    <td className="border border-slate-300 px-2 py-1">{item.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* 3. 상태 관리 */}
          <section>
            <h3 className="font-bold text-[12px] text-[#00587a] mb-1">3. 상태 관리</h3>
            <div className="flex gap-2">
              <span className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: '#FF6B6B', color: '#FFFFFF' }}>R: 미완료</span>
              <span className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: '#FFD966', color: '#1F2937' }}>Y: 진행중</span>
              <span className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: '#92D050', color: '#1F2937' }}>G: 완료</span>
            </div>
          </section>

          {/* 4. SOD 값 */}
          <section>
            <h3 className="font-bold text-[12px] text-[#00587a] mb-1">4. S/O/D 평가값</h3>
            <table className="w-full text-[10px] border-collapse border border-slate-300">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-300 px-2 py-1 w-12">항목</th>
                  <th className="border border-slate-300 px-2 py-1">설명</th>
                  <th className="border border-slate-300 px-2 py-1 w-16">범위</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-300 px-2 py-1 text-center font-bold text-red-600">S</td>
                  <td className="border border-slate-300 px-2 py-1">심각도(Severity) — 고장이 발생했을 때 영향의 심각성</td>
                  <td className="border border-slate-300 px-2 py-1 text-center">1~10</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-2 py-1 text-center font-bold text-orange-600">O</td>
                  <td className="border border-slate-300 px-2 py-1">발생도(Occurrence) — 고장 원인이 발생할 가능성</td>
                  <td className="border border-slate-300 px-2 py-1 text-center">1~10</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-2 py-1 text-center font-bold text-blue-600">D</td>
                  <td className="border border-slate-300 px-2 py-1">검출도(Detection) — 현재 관리방법으로 검출할 수 있는 능력</td>
                  <td className="border border-slate-300 px-2 py-1 text-center">1~10</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* 5. 테이블 컬럼 설명 */}
          <section>
            <h3 className="font-bold text-[12px] text-[#00587a] mb-1">5. 테이블 컬럼 설명</h3>
            <table className="w-full text-[10px] border-collapse border border-slate-300">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-300 px-2 py-1 w-24">컬럼</th>
                  <th className="border border-slate-300 px-2 py-1">설명</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { col: 'LLD No', desc: '습득교훈 고유번호 (LLD26-001 형식)' },
                  { col: '구분', desc: '분류 (RMA/ABN/CIP/ECN/FieldIssue/DevIssue)' },
                  { col: '제품명', desc: '해당 제품명' },
                  { col: '공정명', desc: '해당 공정명' },
                  { col: 'FM/FC', desc: '고장형태(Failure Mode)와 고장원인(Failure Cause)' },
                  { col: '예방관리 개선', desc: '예방관리 관점의 개선 내용' },
                  { col: '검출관리 개선', desc: '검출관리 관점의 개선 내용' },
                  { col: '개선일자', desc: '개선이 완료된 날짜' },
                  { col: '담당자', desc: '개선 담당자 이름' },
                  { col: 'FMEA', desc: '연결된 FMEA 프로젝트 ID' },
                  { col: '첨부', desc: '근거서류 첨부 URL (드라이브/위키 링크)' },
                ].map(item => (
                  <tr key={item.col}>
                    <td className="border border-slate-300 px-2 py-1 font-bold">{item.col}</td>
                    <td className="border border-slate-300 px-2 py-1">{item.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* 6. 워크시트 연동 */}
          <section>
            <h3 className="font-bold text-[12px] text-[#00587a] mb-1">6. 워크시트 연동</h3>
            <ul className="list-disc list-inside space-y-1">
              <li><b>자동 추천</b>: 워크시트 ALL탭에서 FM/FC 입력 시, LLD에 등록된 유사 교훈을 자동 추천합니다</li>
              <li><b>수평전개(H.P.)</b>: "⇄H.P." 버튼으로 다른 프로젝트에 동일 교훈을 적용합니다</li>
              <li><b>FMEA 연결</b>: 교훈이 적용된 FMEA 프로젝트가 FMEA 컬럼에 표시됩니다</li>
            </ul>
          </section>
        </div>

        <div className="mt-4 text-right">
          <button className="px-4 py-1.5 rounded bg-[#00587a] text-white text-[11px] font-bold hover:bg-[#004060]" onClick={onClose}>
            닫기 (Close)
          </button>
        </div>
      </div>
    </div>
  );
}
