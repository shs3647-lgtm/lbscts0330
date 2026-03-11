/**
 * @file LLDSelectModal.tsx
 * @description 습득교훈(LLD) 선택 모달
 * - 리스크분석 화면에서 습득교훈 셀 클릭 시 열림
 * - LLD_No 선택하면 해당 셀에 입력됨
 * - 저장 후 LLD_No 클릭하면 LLD 화면으로 이동
 * - ★ 2026-03-02: 구분(예방/검출) 칼럼, 고장원인 칼럼, category 필터, applyTarget 자동 연동
 * - ★ 2026-03-02: 추천 기능 — FM/FC 텍스트 기반 유사도 매칭으로 관련 LLD 자동 추천
 */

'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, ExternalLink, Filter, Sparkles } from 'lucide-react';
import { extractKeywords, calcRecommendScore, type LLDItem } from '@/lib/lldRecommendUtils';
import HelpIcon from '@/components/common/HelpIcon';
import { useLocale } from '@/lib/locale';

// ★ 샘플 데이터 (DB가 비어있을 때 자동 로드)
const LESSONS_SAMPLE_DATA: LLDItem[] = [
  { id: 'll-001', lldNo: 'LLD26-001', vehicle: 'HHH', target: '설계', failureMode: 'Audio> 출력 자동으로 Mute 됨', cause: 'Mode 상의 Soft Bug', category: '예방관리', improvement: '각Mode 별로 Mute 제어함', status: 'G' },
  { id: 'll-002', lldNo: 'LLD26-002', vehicle: 'BBB', target: '부품', failureMode: 'AM>Side 주파수에서 Seek Stop', cause: 'IF를 체크하지않고 SD만 체크됨', category: '검출관리', improvement: 'IF도 체크하도록 Soft 수정', status: 'R' },
  { id: 'll-003', lldNo: 'LLD26-003', vehicle: 'GVS', target: '제조', failureMode: 'AST 메모리가 강전계순이 아님', cause: 'SM 체크하지 않음', category: '예방관리', improvement: 'SM 체크하도록 Soft 수정', status: 'Y' },
  { id: 'll-004', lldNo: 'LLD26-004', vehicle: 'ABC', target: '설계', failureMode: 'Bluetooth 연결 끊김 현상', cause: '연결 유지 타이머 설정 오류', category: '검출관리', improvement: 'BT 연결 타이머 2초→5초 변경', status: 'G' },
  { id: 'll-005', lldNo: 'LLD26-005', vehicle: 'XYZ', target: '부품', failureMode: '커넥터 접촉 불량', cause: '핀 규격 미달 (0.3mm→0.25mm)', category: '검출관리', improvement: '입고검사 핀 규격 추가', status: 'G' },
  { id: 'll-006', lldNo: 'LLD26-006', vehicle: 'DEF', target: '제조', failureMode: '솔더 크랙 발생', cause: '리플로우 온도 프로파일 불량', category: '예방관리', improvement: '온도 프로파일 최적화', status: 'Y' },
  { id: 'll-007', lldNo: 'LLD26-007', vehicle: 'GHI', target: '설계', failureMode: 'USB 인식 실패', cause: 'USB 드라이버 호환성 문제', category: '예방관리', improvement: 'USB 드라이버 버전 업데이트', status: 'G' },
  { id: 'll-008', lldNo: 'LLD26-008', vehicle: 'JKL', target: '부품', failureMode: 'LCD 불량화소 발생', cause: '공급사 생산공정 변경', category: '검출관리', improvement: '입고검사 불량화소 검출 추가', status: 'Y' },
  { id: 'll-009', lldNo: 'LLD26-009', vehicle: 'MNO', target: '제조', failureMode: 'PCB 휨 발생', cause: 'SMT 후 냉각속도 과다', category: '예방관리', improvement: '냉각 속도 조절', status: 'R' },
  { id: 'll-010', lldNo: 'LLD26-010', vehicle: 'PQR', target: '설계', failureMode: 'CAN 통신 오류', cause: '통신 프로토콜 불일치', category: '검출관리', improvement: 'CAN 프로토콜 버전 동기화', status: 'G' },
];

/** 추천 점수가 포함된 LLD 항목 */
interface ScoredLLDItem extends LLDItem {
  score: number;
  matchReasons: string[];
}

export type LLDApplyTarget = 'prevention' | 'detection';
type CategoryFilter = 'all' | '예방관리' | '검출관리';

export interface LLDSelectResult {
  lldNo: string;
  applyTarget: LLDApplyTarget;
  improvement: string;
  failureMode: string;
  cause: string;
  classification?: string;
}

interface LLDSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (lldNo: string, fmeaId?: string, detail?: LLDSelectResult) => void;
  currentValue?: string;
  fmeaId?: string;
  fmText?: string;   // ★ 추천용: 현재 고장형태
  fcText?: string;   // ★ 추천용: 현재 고장원인
  pcText?: string;   // ★ 현재 행 예방관리
  dcText?: string;   // ★ 현재 행 검출관리
  onAutoSelect?: () => void;  // ★ LLD 자동선택 (일괄 매칭)
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  G: { bg: '#92D050', text: '#1F2937', label: '완료' },
  Y: { bg: '#FFD966', text: '#1F2937', label: '진행중' },
  R: { bg: '#FF6B6B', text: '#FFFFFF', label: '미완료' },
};

const CATEGORY_BADGE: Record<string, { bg: string; text: string }> = {
  '예방관리': { bg: '#dbeafe', text: '#1d4ed8' },
  '검출관리': { bg: '#fef3c7', text: '#b45309' },
};

const RECOMMEND_THRESHOLD = 1;
const STATUS_PRIORITY: Record<string, number> = { G: 3, Y: 2, R: 1 };

// ═══════════════════════════════════════════════════
// ★ 추천 로직 — @/lib/lldRecommendUtils에서 import
// ═══════════════════════════════════════════════════

export default function LLDSelectModal({ isOpen, onClose, onSelect, currentValue, fmeaId, fmText, fcText, pcText, dcText, onAutoSelect }: LLDSelectModalProps) {
  const { t } = useLocale();
  const [items, setItems] = useState<LLDItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLldNo, setSelectedLldNo] = useState<string>(currentValue || '');
  const [applyTarget, setApplyTarget] = useState<LLDApplyTarget>('prevention');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [showRecommendOnly, setShowRecommendOnly] = useState(false);  // ★ 추천만 보기

  // ★ 드래그 이동 기능
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const modalPanelRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    const modal = (e.target as HTMLElement).closest('[data-lld-modal]') as HTMLElement;
    if (!modal) return;
    const rect = modal.getBoundingClientRect();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: rect.left, origY: rect.top };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      setDragPos({
        x: dragRef.current.origX + (ev.clientX - dragRef.current.startX),
        y: dragRef.current.origY + (ev.clientY - dragRef.current.startY),
      });
    };
    const onUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  // 모달 열릴 때 위치 초기화
  useEffect(() => {
    if (isOpen) setDragPos(null);
  }, [isOpen]);

  // ★ 오버레이 없이 외부 클릭 감지 (워크시트 스크롤 차단 방지)
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (modalPanelRef.current && !modalPanelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onClose]);

  // FM/FC 키워드 추출 (모달 열릴 때 1회)
  const fmKeywords = useMemo(() => extractKeywords(fmText || ''), [fmText]);
  const fcKeywords = useMemo(() => extractKeywords(fcText || ''), [fcText]);
  const pcKeywords = useMemo(() => extractKeywords(pcText || ''), [pcText]);
  const dcKeywords = useMemo(() => extractKeywords(dcText || ''), [dcText]);
  const hasContext = fmKeywords.length > 0 || fcKeywords.length > 0 || pcKeywords.length > 0 || dcKeywords.length > 0;

  // LLD 데이터 로드
  useEffect(() => {
    if (isOpen) {
      loadLLDData();
      setSelectedLldNo(currentValue || '');
      setCategoryFilter('all');
      setShowRecommendOnly(false);
    }
  }, [isOpen, currentValue]);

  const loadLLDData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/lessons-learned');
      const data = await res.json();

      if (data.success && data.items && Array.isArray(data.items) && data.items.length > 0) {
        const mappedItems: LLDItem[] = data.items.map((item: any) => ({
          id: item.id || item.lldNo,
          lldNo: item.lldNo,
          vehicle: item.vehicle || '',
          target: item.target || '',
          failureMode: item.failureMode || '',
          cause: item.cause || '',
          category: item.category || '',
          improvement: item.improvement || '',
          status: item.status || 'Y',
          classification: item.classification || '',
        }));
        setItems(mappedItems);
      } else {
        setItems(LESSONS_SAMPLE_DATA);
      }
    } catch (error) {
      console.error('[LLDSelectModal] ❌ LLD 데이터 로드 오류:', error);
      setItems(LESSONS_SAMPLE_DATA);
    } finally {
      setLoading(false);
    }
  };

  // ★ 추천 점수 계산 + 필터링 + 정렬
  const scoredItems: ScoredLLDItem[] = useMemo(() => {
    return items.map(item => {
      const { score, reasons } = hasContext
        ? calcRecommendScore(item, fmKeywords, fcKeywords, {
          pcKeywords,
          dcKeywords,
          preferredTarget: applyTarget,
        })
        : { score: 0, reasons: [] as string[] };
      return { ...item, score, matchReasons: reasons };
    });
  }, [items, fmKeywords, fcKeywords, pcKeywords, dcKeywords, applyTarget, hasContext]);

  const filteredItems = useMemo(() => {
    let result = scoredItems.filter(item => {
      // 구분 필터
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      // 추천만 보기
      if (showRecommendOnly && item.score < RECOMMEND_THRESHOLD) return false;
      // 텍스트 검색
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        item.lldNo.toLowerCase().includes(search) ||
        item.vehicle.toLowerCase().includes(search) ||
        item.failureMode.toLowerCase().includes(search) ||
        item.cause.toLowerCase().includes(search) ||
        item.improvement.toLowerCase().includes(search)
      );
    });
    // ★ 추천 점수 높은 순으로 정렬 (동점이면 LLD_No 순)
    if (hasContext) {
      result = result.sort((a, b) =>
        b.score - a.score ||
        (STATUS_PRIORITY[b.status] || 0) - (STATUS_PRIORITY[a.status] || 0) ||
        a.lldNo.localeCompare(b.lldNo)
      );
    }
    return result;
  }, [scoredItems, searchTerm, categoryFilter, showRecommendOnly, hasContext]);

  const selectedItem = useMemo(() => items.find(i => i.lldNo === selectedLldNo), [items, selectedLldNo]);

  const recommendCount = useMemo(() => scoredItems.filter(i => i.score >= RECOMMEND_THRESHOLD).length, [scoredItems]);

  const handleSelectItem = (item: LLDItem) => {
    setSelectedLldNo(item.lldNo);
    if (item.category === '검출관리') {
      setApplyTarget('detection');
    } else if (item.category === '예방관리') {
      setApplyTarget('prevention');
    }
  };

  const handleConfirm = () => {
    if (selectedLldNo) {
      const item = items.find(i => i.lldNo === selectedLldNo);
      const detail: LLDSelectResult | undefined = item ? {
        lldNo: item.lldNo,
        applyTarget,
        improvement: item.improvement,
        failureMode: item.failureMode,
        cause: item.cause,
        classification: item.classification,
      } : undefined;
      onSelect(selectedLldNo, fmeaId, detail);
      onClose();
    }
  };

  const handleGoToLLD = () => {
    window.open('/pfmea/lld', '_blank');
  };

  const categoryCounts = useMemo(() => {
    const pc = items.filter(i => i.category === '예방관리').length;
    const dc = items.filter(i => i.category === '검출관리').length;
    return { all: items.length, pc, dc };
  }, [items]);

  if (!isOpen) return null;

  const modalContent = (
      <div
        ref={modalPanelRef}
        data-lld-modal
        className="fixed bg-white rounded-lg shadow-2xl w-[880px] max-h-[80vh] flex flex-col z-[50001] pointer-events-auto border-2 border-[#00587a]"
        style={dragPos
          ? { left: dragPos.x, top: dragPos.y }
          : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
        }
>
        {/* 헤더 (드래그 가능) — 모든 컨트롤 통합 */}
        <div
          className="flex items-center justify-between px-3 py-1.5 bg-[#00587a] text-white rounded-t-lg cursor-move select-none shrink-0"
          onMouseDown={handleDragStart}
        >
          <span className="text-xs font-bold shrink-0" title="Select Lessons Learned">📚 {t('습득교훈(LLD)')} {t('선택')}</span>
          <span onMouseDown={e => e.stopPropagation()}>
            <HelpIcon compact iconSize={15} title="습득교훈(LLD) 도움말" popoverWidth={460}>
              <div style={{ lineHeight: 1.9 }}>
                <b>습득교훈(Lessons Learned)이란?</b>
                <p>과거 프로젝트에서 발생한 고장 사례와 개선 대책을 체계적으로 기록한 문서입니다. 최적화(6단계)에서 예방/검출 개선안을 수립할 때 <b>유사한 과거 사례를 참조</b>하여 효과적인 대응책을 마련할 수 있습니다.</p>
                <hr style={{ margin: '6px 0', borderColor: '#e5e7eb' }} />
                <b>사용 방법</b>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginTop: 4 }}>
                  <tbody>
                    <tr><td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, width: 80 }}>항목 선택</td><td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb' }}>목록에서 LLD 항목을 클릭하여 선택 → <b>선택완료</b> 클릭</td></tr>
                    <tr><td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>반영 대상</td><td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb' }}>예방/검출 라디오 버튼으로 반영 위치 지정 (구분 칼럼 기준 자동 전환)</td></tr>
                    <tr><td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>자동선택</td><td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb' }}>FM/FC 텍스트 기반으로 LLD DB 전체를 검색하여 유사 항목 일괄 매칭</td></tr>
                    <tr><td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>LLD 화면</td><td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb' }}>습득교훈 관리 화면으로 이동 (데이터 등록/수정)</td></tr>
                  </tbody>
                </table>
                <hr style={{ margin: '6px 0', borderColor: '#e5e7eb' }} />
                <b>추천 기능 (★)</b>
                <ul style={{ paddingLeft: 16, margin: '4px 0' }}>
                  <li>현재 행의 <b>고장형태(FM)</b>와 <b>고장원인(FC)</b> 텍스트를 자동 분석</li>
                  <li>LLD DB의 고장형태/고장원인/개선대책과 <b>키워드 유사도 매칭</b></li>
                  <li>★★(높음) / ★(보통) / ☆(낮음) 3단계 추천 점수 표시</li>
                  <li><b>추천</b> 버튼으로 매칭 항목만 필터링 가능</li>
                </ul>
                <hr style={{ margin: '6px 0', borderColor: '#e5e7eb' }} />
                <b>구분 필터</b>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginTop: 4 }}>
                  <tbody>
                    <tr><td style={{ padding: '2px 6px', background: '#dbeafe', color: '#1d4ed8', fontWeight: 700, width: 60, textAlign: 'center' }}>예방</td><td style={{ padding: '2px 6px' }}>예방관리(PC) 개선에 활용되는 교훈</td></tr>
                    <tr><td style={{ padding: '2px 6px', background: '#fef3c7', color: '#b45309', fontWeight: 700, textAlign: 'center' }}>검출</td><td style={{ padding: '2px 6px' }}>검출관리(DC) 개선에 활용되는 교훈</td></tr>
                  </tbody>
                </table>
                <hr style={{ margin: '6px 0', borderColor: '#e5e7eb' }} />
                <b>상태 표시</b>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginTop: 4 }}>
                  <tbody>
                    <tr><td style={{ padding: '2px 6px', background: '#92D050', fontWeight: 700, width: 40, textAlign: 'center' }}>G</td><td style={{ padding: '2px 6px' }}>완료 — 개선 조치 완료된 교훈</td></tr>
                    <tr><td style={{ padding: '2px 6px', background: '#FFD966', fontWeight: 700, textAlign: 'center' }}>Y</td><td style={{ padding: '2px 6px' }}>진행중 — 개선 진행 중인 교훈</td></tr>
                    <tr><td style={{ padding: '2px 6px', background: '#FF6B6B', color: '#fff', fontWeight: 700, textAlign: 'center' }}>R</td><td style={{ padding: '2px 6px' }}>미완료 — 아직 조치되지 않은 교훈</td></tr>
                  </tbody>
                </table>
              </div>
            </HelpIcon>
          </span>
          {/* 중앙: 반영대상 + 선택완료 */}
          <div className="flex items-center gap-1.5 text-[10px]" onMouseDown={e => e.stopPropagation()}>
            <span className="text-white/70 shrink-0">{t('반영')}:</span>
            <label className="flex items-center gap-0.5 cursor-pointer px-1 py-0.5 rounded shrink-0" style={{ background: applyTarget === 'prevention' ? 'rgba(219,234,254,0.25)' : 'transparent' }}>
              <input type="radio" name="applyTarget" checked={applyTarget === 'prevention'} onChange={() => setApplyTarget('prevention')} className="w-3 h-3" />
              <span style={{ color: applyTarget === 'prevention' ? '#93c5fd' : '#cbd5e1', fontWeight: applyTarget === 'prevention' ? 700 : 400 }}>{t('예방')}</span>
            </label>
            <label className="flex items-center gap-0.5 cursor-pointer px-1 py-0.5 rounded shrink-0" style={{ background: applyTarget === 'detection' ? 'rgba(254,243,199,0.25)' : 'transparent' }}>
              <input type="radio" name="applyTarget" checked={applyTarget === 'detection'} onChange={() => setApplyTarget('detection')} className="w-3 h-3" />
              <span style={{ color: applyTarget === 'detection' ? '#fcd34d' : '#cbd5e1', fontWeight: applyTarget === 'detection' ? 700 : 400 }}>{t('검출')}</span>
            </label>
            <button
              className="px-2 py-0.5 font-bold text-white rounded ml-1"
              style={{ background: selectedLldNo ? '#16a34a' : '#6b7280', cursor: selectedLldNo ? 'pointer' : 'not-allowed' }}
              onClick={handleConfirm}
              disabled={!selectedLldNo}
            >
              {t('선택완료')}
            </button>
          </div>
          {/* 우측: 자동선택 + LLD화면 + 닫기 */}
          <div className="flex items-center gap-1.5 shrink-0">
            {onAutoSelect && (
              <button
                className="px-2 py-0.5 bg-green-600 hover:bg-green-500 text-white font-bold text-[10px] rounded"
                onClick={() => { onClose(); onAutoSelect(); }}
              >
                {t('자동선택')}
              </button>
            )}
            <button
              className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-white/80 hover:bg-white/20 rounded"
              onClick={handleGoToLLD}
            >
              <ExternalLink className="h-3 w-3" />
              LLD
            </button>
            <button onClick={onClose} className="hover:bg-white/20 p-0.5 rounded">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ★ 현재 행 컨텍스트: 예방/검출 + 고장정보 — 1줄 컴팩트 */}
        {(hasContext || pcText || dcText) && (
          <div className="px-3 py-1 flex items-center gap-2 bg-[#f0f7fa] text-[10px] shrink-0 overflow-hidden">
            {pcText && (
              <span className="truncate max-w-[280px] px-1 py-0.5 bg-blue-50 border border-blue-200 rounded" title={pcText}>
                <span className="font-bold text-blue-700">PC:</span> <span className="text-blue-900">{pcText.length > 40 ? pcText.slice(0, 40) + '…' : pcText}</span>
              </span>
            )}
            {dcText && (
              <span className="truncate max-w-[280px] px-1 py-0.5 bg-amber-50 border border-amber-200 rounded" title={dcText}>
                <span className="font-bold text-amber-700">DC:</span> <span className="text-amber-900">{dcText.length > 40 ? dcText.slice(0, 40) + '…' : dcText}</span>
              </span>
            )}
            {hasContext && (
              <>
                <span className="text-gray-300">|</span>
                <Sparkles className="h-3 w-3 text-blue-600 shrink-0" />
                <span className="truncate text-gray-600" title={`FM: ${fmText || '-'} / FC: ${fcText || '-'}`}>
                  FM: {(fmText || '-').slice(0, 30)}{(fmText || '').length > 30 ? '…' : ''} / FC: {(fcText || '-').slice(0, 30)}{(fcText || '').length > 30 ? '…' : ''}
                </span>
                {recommendCount > 0 && (
                  <span className="font-bold text-blue-700 shrink-0">({recommendCount}건 매칭)</span>
                )}
              </>
            )}
          </div>
        )}

        {/* 검색 + 필터 — 컴팩트 */}
        <div className="px-2 py-1 border-b flex items-center gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              placeholder={`LLD No, ${t('차종')}, ${t('고장형태')}, ${t('고장원인')}, ${t('개선대책')} ${t('검색')}...`}
              className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {/* 구분 필터 */}
          <div className="flex items-center gap-0.5 shrink-0">
            <Filter className="h-3 w-3 text-gray-500" />
            <button
              onClick={() => setCategoryFilter('all')}
              className="px-1.5 py-0.5 text-[10px] rounded font-semibold transition-colors"
              style={{
                background: categoryFilter === 'all' ? '#00587a' : '#f3f4f6',
                color: categoryFilter === 'all' ? '#fff' : '#374151',
              }}
            >
              {t('전체')}({categoryCounts.all})
            </button>
            <button
              onClick={() => setCategoryFilter('예방관리')}
              className="px-1.5 py-0.5 text-[10px] rounded font-semibold transition-colors"
              style={{
                background: categoryFilter === '예방관리' ? '#1d4ed8' : '#dbeafe',
                color: categoryFilter === '예방관리' ? '#fff' : '#1d4ed8',
              }}
            >
              {t('예방')}({categoryCounts.pc})
            </button>
            <button
              onClick={() => setCategoryFilter('검출관리')}
              className="px-1.5 py-0.5 text-[10px] rounded font-semibold transition-colors"
              style={{
                background: categoryFilter === '검출관리' ? '#b45309' : '#fef3c7',
                color: categoryFilter === '검출관리' ? '#fff' : '#b45309',
              }}
            >
              {t('검출')}({categoryCounts.dc})
            </button>
          </div>
          {/* ★ 추천만 보기 토글 */}
          {hasContext && recommendCount > 0 && (
            <button
              onClick={() => setShowRecommendOnly(prev => !prev)}
              className="px-1.5 py-0.5 text-[10px] rounded font-semibold transition-colors shrink-0 flex items-center gap-0.5"
              style={{
                background: showRecommendOnly ? '#7c3aed' : '#f3f4f6',
                color: showRecommendOnly ? '#fff' : '#7c3aed',
                border: showRecommendOnly ? 'none' : '1px solid #c4b5fd',
              }}
            >
              <Sparkles className="h-2.5 w-2.5" />
              {t('추천')}({recommendCount})
            </button>
          )}
        </div>

        {/* 테이블 */}
        <div className="flex-1 overflow-auto px-1 py-0.5">
          {loading ? (
            <div className="text-center py-10 text-gray-500">{t('로딩 중...')}</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              {items.length === 0 ? (
                <div className="space-y-2">
                  <div>등록된 습득교훈이 없습니다.</div>
                  <div className="text-xs">
                    <button
                      onClick={handleGoToLLD}
                      className="text-[#00587a] hover:underline font-bold"
                    >
                      📚 습득교훈 화면
                    </button>
                    에서 먼저 데이터를 등록해주세요.
                  </div>
                </div>
              ) : showRecommendOnly ? '매칭되는 추천 항목이 없습니다.' : '검색 결과가 없습니다.'}
            </div>
          ) : (
            <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {hasContext && (
                    <th className="bg-[#00587a] text-white font-bold p-0.5 text-center" style={{ border: '1px solid #456', width: 42 }}><div className="leading-tight"><div className="text-[10px]">추천</div><div className="text-[7px] font-normal opacity-60">(Rec.)</div></div></th>
                  )}
                  <th className="bg-[#00587a] text-white font-bold p-0.5 text-center" style={{ border: '1px solid #456', width: 30 }}><div className="leading-tight"><div className="text-[10px]">선택</div><div className="text-[7px] font-normal opacity-60">(Sel)</div></div></th>
                  <th className="bg-[#00587a] text-white font-bold p-0.5 text-center" style={{ border: '1px solid #456', width: 85 }}><div className="leading-tight"><div className="text-[10px]">LLD No</div></div></th>
                  <th className="bg-[#00587a] text-white font-bold p-0.5 text-center" style={{ border: '1px solid #456', width: 45 }}><div className="leading-tight"><div className="text-[10px]">차종</div><div className="text-[7px] font-normal opacity-60">(Veh.)</div></div></th>
                  <th className="bg-[#00587a] text-white font-bold p-0.5 text-center" style={{ border: '1px solid #456', width: 45 }}><div className="leading-tight"><div className="text-[10px]">대상</div><div className="text-[7px] font-normal opacity-60">(Tgt)</div></div></th>
                  <th className="bg-[#00587a] text-white font-bold p-0.5 text-left" style={{ border: '1px solid #456', minWidth: 90 }}><div className="leading-tight"><div className="text-[10px]">고장형태</div><div className="text-[7px] font-normal opacity-60">(FM)</div></div></th>
                  <th className="bg-[#00587a] text-white font-bold p-0.5 text-left" style={{ border: '1px solid #456', minWidth: 80 }}><div className="leading-tight"><div className="text-[10px]">고장원인</div><div className="text-[7px] font-normal opacity-60">(FC)</div></div></th>
                  <th className="bg-[#00587a] text-white font-bold p-0.5 text-center" style={{ border: '1px solid #456', width: 62 }}><div className="leading-tight"><div className="text-[10px]">구분</div><div className="text-[7px] font-normal opacity-60">(Type)</div></div></th>
                  <th className="bg-[#00587a] text-white font-bold p-0.5 text-left" style={{ border: '1px solid #456', minWidth: 90 }}><div className="leading-tight"><div className="text-[10px]">개선대책</div><div className="text-[7px] font-normal opacity-60">(Impr.)</div></div></th>
                  <th className="bg-[#00587a] text-white font-bold p-0.5 text-center" style={{ border: '1px solid #456', width: 38 }}><div className="leading-tight"><div className="text-[10px]">상태</div><div className="text-[7px] font-normal opacity-60">(Sts)</div></div></th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, idx) => {
                  const isSelected = selectedLldNo === item.lldNo;
                  const isRecommended = item.score >= RECOMMEND_THRESHOLD;
                  const zebraBg = idx % 2 === 0 ? '#fff' : '#e0f2fb';
                  const rowBg = isSelected ? '#bbdefb' : isRecommended ? '#f5f3ff' : zebraBg;
                  const catBadge = CATEGORY_BADGE[item.category];
                  const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.Y;
                  return (
                    <tr
                      key={item.id}
                      className="cursor-pointer hover:bg-blue-100"
                      style={{ background: rowBg }}
                      onClick={() => handleSelectItem(item)}
                    >
                      {/* ★ 추천 점수 칼럼 */}
                      {hasContext && (
                        <td className="p-1 text-center" style={{ border: '1px solid #999' }}>
                          {isRecommended ? (
                            <span
                              title={item.matchReasons.join(', ')}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 2,
                                padding: '1px 4px', borderRadius: 4, fontSize: '9px', fontWeight: 700,
                                background: item.score >= 2.5 ? '#7c3aed' : item.score >= 1.5 ? '#8b5cf6' : '#c4b5fd',
                                color: '#fff',
                              }}
                            >
                              {item.score >= 2.5 ? '★★' : item.score >= 1.5 ? '★' : '☆'}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                      )}
                      <td className="p-1 text-center" style={{ border: '1px solid #999' }}>
                        <input
                          type="radio"
                          checked={isSelected}
                          onChange={() => handleSelectItem(item)}
                        />
                      </td>
                      <td className="p-1 text-center font-mono font-bold text-[#00587a]" style={{ border: '1px solid #999' }}>
                        {item.lldNo}
                      </td>
                      <td className="p-1 text-center" style={{ border: '1px solid #999' }}>{item.vehicle}</td>
                      <td className="p-1 text-center" style={{ border: '1px solid #999' }}>{item.target}</td>
                      <td className="p-1 text-left" style={{ border: '1px solid #999' }}>{item.failureMode}</td>
                      <td className="p-1 text-left" style={{ border: '1px solid #999', color: '#555' }}>{item.cause}</td>
                      <td className="p-1 text-center" style={{ border: '1px solid #999' }}>
                        {catBadge ? (
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap"
                            style={{ background: catBadge.bg, color: catBadge.text }}
                          >
                            {item.category}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-1 text-left" style={{ border: '1px solid #999', color: '#1a5276', fontWeight: 500 }}>{item.improvement}</td>
                      <td className="p-1 text-center" style={{ border: '1px solid #999' }}>
                        <span
                          className="px-2 py-0.5 rounded text-xs font-bold"
                          style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* 선택 미리보기 (하단 1줄) */}
        {selectedItem && (
          <div className="px-2 py-0.5 border-t bg-gray-50 text-[10px] flex items-center gap-2 shrink-0 rounded-b-lg">
            <span className="font-bold text-[#00587a]">{selectedItem.lldNo}</span>
            {selectedItem.category && (
              <span className="px-1 py-0 rounded text-[9px] font-bold" style={{ background: CATEGORY_BADGE[selectedItem.category]?.bg || '#f3f4f6', color: CATEGORY_BADGE[selectedItem.category]?.text || '#374151' }}>
                {selectedItem.category}
              </span>
            )}
            <span className="text-gray-500 truncate">{selectedItem.improvement}</span>
          </div>
        )}
      </div>
  );

  return createPortal(modalContent, document.body);
}
