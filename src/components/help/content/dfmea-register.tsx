/**
 * @file help/content/dfmea-register.tsx
 * @description DFMEA 등록화면 도움말 콘텐츠 (PFMEA 기반 DFMEA용 수정)
 * @module help
 */

'use client';

import type { HelpSectionDef, HelpManualMeta } from '../types';

// =====================================================
// 메타 정보
// =====================================================
export const DFMEA_REGISTER_META: HelpManualMeta = {
  title: 'DFMEA 등록화면 도움말',
  module: 'DFMEA Register',
  version: 'v1.0',
  lastUpdated: '2026-03-05',
};

// =====================================================
// 섹션 컴포넌트
// =====================================================
function OverviewSection() {
  return (
    <div className="space-y-2">
      <p className="font-bold text-indigo-800">DFMEA 등록화면은 설계 FMEA 프로젝트의 기본 정보를 등록하고 관리하는 화면입니다.</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded p-2 border border-indigo-200">
          <p className="font-bold text-[10px] text-blue-700 mb-1">주요 기능</p>
          <ul className="space-y-0.5 text-[10px]">
            <li>- DFMEA 프로젝트 신규 등록 / 수정</li>
            <li>- FMEA 유형(M/F/P/D) 선택 및 ID 자동 부여</li>
            <li>- 상위 APQP / FMEA 연동</li>
            <li>- CP / PFD / PFMEA 문서 연동</li>
            <li>- CFT(상호기능팀) 구성원 관리</li>
          </ul>
        </div>
        <div className="bg-white rounded p-2 border border-indigo-200">
          <p className="font-bold text-[10px] text-green-700 mb-1">버튼 설명</p>
          <ul className="space-y-0.5 text-[10px]">
            <li><span className="font-bold text-green-600">새로 작성</span> — 새 DFMEA 등록 (ID 자동 생성)</li>
            <li><span className="font-bold text-yellow-600">편집</span> — 기존 DFMEA 불러오기 / 수정모드</li>
            <li><span className="font-bold text-blue-600">저장</span> — 현재 정보를 DB에 저장</li>
            <li><span className="font-bold text-gray-600">도움말</span> — 화면 사용법 안내 (이 패널)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function FieldsSection() {
  return (
    <div className="space-y-2">
      <p className="font-bold text-indigo-800">기획 및 준비 (1단계) - 필드별 설명</p>
      <table className="w-full text-[10px] border-collapse">
        <thead>
          <tr className="bg-indigo-200">
            <th className="border border-indigo-300 px-2 py-1 text-left w-[20%]">필드명</th>
            <th className="border border-indigo-300 px-2 py-1 text-left">설명</th>
            <th className="border border-indigo-300 px-2 py-1 text-center w-[10%]">필수</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['FMEA 유형', 'M(Master), F(Family), P(Part), D(Design) 중 선택. 유형에 따라 ID가 자동 변경됩니다.', 'Y'],
            ['FMEA명', '시스템, 서브시스템 및/또는 구성품의 이름을 입력합니다.', 'Y'],
            ['FMEA ID', '자동 생성된 고유 식별자. 유형 변경 시 자동 재생성됩니다.', '-'],
            ['상위 APQP', 'APQP 프로젝트와 연동합니다. 선택 시 APQP 정보가 자동 반영됩니다.', '-'],
            ['설계 책임', '해당 설계의 책임 부서를 입력합니다.', '-'],
            ['FMEA 담당자', 'FMEA 작성 담당자의 성명을 입력합니다.', 'Y'],
            ['시작 일자', 'FMEA 분석 시작 예정일.', '-'],
            ['상위 FMEA', 'Master/Family FMEA와 연동합니다.', '-'],
            ['고객 명', '납품 대상 고객명.', '-'],
            ['회사 명', '자사(제조사) 회사명을 입력합니다.', '-'],
            ['모델 연식', '해당 어플리케이션/모델 연식을 입력합니다.', '-'],
            ['품명 / 품번', '완제품명과 품번을 입력합니다.', '-'],
            ['기밀수준', '사업용도 / 독점 / 기밀 중 선택합니다.', '-'],
          ].map(([name, desc, req], i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-indigo-50'}>
              <td className="border border-indigo-200 px-2 py-1 font-semibold">{name}</td>
              <td className="border border-indigo-200 px-2 py-1">{desc}</td>
              <td className="border border-indigo-200 px-2 py-1 text-center font-bold">{req === 'Y' ? <span className="text-red-500">Y</span> : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MFPDSection() {
  return (
    <div className="space-y-2">
      <p className="font-bold text-indigo-800">M / F / P / D 계층 구조</p>
      <div className="bg-white rounded p-2 border border-indigo-200">
        <div className="flex items-center gap-2 text-[10px] mb-2">
          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded font-bold">Master (MBD)</span>
          <span className="text-gray-400">&rarr;</span>
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-bold">Family (FBD)</span>
          <span className="text-gray-400">&rarr;</span>
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-bold">Part (PBD)</span>
          <span className="text-gray-400">/</span>
          <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded font-bold">Design (DBD)</span>
        </div>
        <table className="w-full text-[10px] border-collapse">
          <tbody>
            {([
              ['M', 'bg-purple-50', 'text-purple-700', 'MBD', '설계 유형별 표준 FMEA (최상위 기준)'],
              ['F', 'bg-blue-50', 'text-blue-700', 'FBD', 'Master를 상속한 제품군 단위 FMEA'],
              ['P', 'bg-green-50', 'text-green-700', 'PBD', 'Family를 상속한 개별 부품 FMEA'],
              ['D', 'bg-indigo-50', 'text-indigo-700', 'DBD', '설계 FMEA (Design FMEA)'],
            ] as const).map(([type, bg, text, bd, desc]) => (
              <tr key={type} className={bg}>
                <td className={`px-1.5 py-1 font-bold ${text} w-6 border border-gray-200`}>{type}</td>
                <td className="px-1.5 py-1 font-mono text-gray-600 w-10 border border-gray-200">{bd}</td>
                <td className="px-1.5 py-1 border border-gray-200">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LinkageSection() {
  return (
    <div className="space-y-2">
      <p className="font-bold text-indigo-800">문서 연동 관리</p>
      <p className="text-[10px] text-gray-600">DFMEA는 APQP, 상위 FMEA, CP(관리계획서), PFD(공정흐름도)와 연동할 수 있습니다.</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded p-2 border border-indigo-200">
          <p className="font-bold text-[10px] text-yellow-700 mb-1">상위 APQP 연동</p>
          <ul className="space-y-0.5 text-[10px]">
            <li>- APQP 프로젝트를 선택하면 고객정보 자동 반영</li>
            <li>- APQP 등록화면으로 바로 이동 가능 (배지 클릭)</li>
          </ul>
        </div>
        <div className="bg-white rounded p-2 border border-indigo-200">
          <p className="font-bold text-[10px] text-orange-700 mb-1">상위 FMEA 연동</p>
          <ul className="space-y-0.5 text-[10px]">
            <li>- Master/Family FMEA를 상위 문서로 지정</li>
            <li>- 기초정보를 상속받아 워크시트 자동 생성</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function CFTHelpSection() {
  return (
    <div className="space-y-2">
      <p className="font-bold text-indigo-800">CFT (상호기능팀) 구성</p>
      <div className="bg-white rounded p-2 border border-indigo-200">
        <p className="font-bold text-[10px] text-blue-700 mb-1">역할별 책임 (필수 5역할 + CFT 팀원)</p>
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="bg-indigo-100">
              <th className="border border-indigo-200 px-1 py-0.5 text-center w-[6%]">No</th>
              <th className="border border-indigo-200 px-1 py-0.5 text-left w-[22%]">역할</th>
              <th className="border border-indigo-200 px-1 py-0.5 text-left">책임 및 역할</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['1', 'Champion', '최종 승인 및 자원 배정, 경영층 보고'],
              ['2', 'Technical Leader', '기술 판단 주도, 분석 방향 및 타당성 검증'],
              ['3', 'Leader', '프로젝트 총괄 운영, CFT 구성 및 산출물 관리'],
              ['4', 'PM', '일정/이슈 관리, CFT 간 업무 조율 및 진행 추적'],
              ['5', 'Moderator', '워크시트 회의 진행, S/O/D 평가 합의 주도'],
              ['6', 'CFT 팀원', '부서 전문 지식 제공, 고장 모드 식별 및 조치 실행'],
            ].map(([no, role, desc], i) => (
              <tr key={i} className={i < 5 ? (i % 2 === 0 ? 'bg-blue-50' : 'bg-white') : 'bg-gray-50'}>
                <td className="border border-indigo-200 px-1 py-0.5 text-center font-bold text-gray-500">{no}</td>
                <td className="border border-indigo-200 px-1 py-0.5 font-bold">{role}</td>
                <td className="border border-indigo-200 px-1 py-0.5">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WorkflowSection() {
  return (
    <div className="space-y-2">
      <p className="font-bold text-indigo-800">DFMEA 등록 작업 흐름</p>
      <div className="bg-white rounded p-2 border border-indigo-200">
        <div className="space-y-2 text-[10px]">
          {[
            { step: '1', title: '신규 등록', desc: '새로 작성 클릭 → FMEA 유형(M/F/P/D) 선택 → ID 자동 생성', color: 'bg-green-100 text-green-700' },
            { step: '2', title: '기본정보 입력', desc: 'FMEA명, 담당자, 고객명, 회사명, 품명/품번, 일자 등 입력', color: 'bg-blue-100 text-blue-700' },
            { step: '3', title: '연동 설정', desc: '상위 APQP, 상위 FMEA, CP/PFD 연동 (선택사항)', color: 'bg-purple-100 text-purple-700' },
            { step: '4', title: 'CFT 구성', desc: 'CFT 멤버 등록 — 역할 지정 및 사용자 검색', color: 'bg-orange-100 text-orange-700' },
            { step: '5', title: '저장', desc: '저장 클릭 → DB에 프로젝트 정보 저장', color: 'bg-indigo-100 text-indigo-700' },
            { step: '6', title: '기초정보 등록', desc: 'Master/Family/Part/Design 데이터 선택 또는 신규 입력 → 워크시트로 이동', color: 'bg-amber-100 text-amber-700' },
          ].map(item => (
            <div key={item.step} className="flex items-start gap-2">
              <span className={`${item.color} rounded-full w-5 h-5 flex items-center justify-center text-[9px] font-bold shrink-0`}>{item.step}</span>
              <div>
                <span className="font-bold">{item.title}</span>
                <span className="text-gray-500 ml-1">— {item.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// 섹션 정의 (export)
// =====================================================
export const DFMEA_REGISTER_SECTIONS: HelpSectionDef[] = [
  { key: 'overview', label: '개요', component: OverviewSection },
  { key: 'fields', label: '필드 설명', component: FieldsSection },
  { key: 'mfp', label: 'M/F/P/D 구조', component: MFPDSection },
  { key: 'linkage', label: '연동 관리', component: LinkageSection },
  { key: 'cft', label: 'CFT 구성', component: CFTHelpSection },
  { key: 'workflow', label: '작업 흐름', component: WorkflowSection },
];
