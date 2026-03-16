'use client';
/**
 * @file HelpChatbot.tsx
 * @description 온프레미스 챗봇 도움말 — 채팅+검색 하이브리드
 *
 * 모드: 채팅(키워드 매칭 Q&A) / 검색(ManualItem 카드)
 * 트리거: 화면 우하단 FAB 버튼
 * z-index: 9998 (HelpPanel 9999, HelpSearchModal 10000 아래)
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { CATEGORY_COLORS, CATEGORY_ICONS, MANUAL_DATA } from '@/components/modals/help';
import type { ManualItem } from '@/components/modals/help';
import {
  searchManualItems,
  getSnippet,
  getRecommendedForPath,
  createMsgId,
  useChatbotSearch,
  type ChatMessage,
} from './useChatbotSearch';
import { useFloatingWindow } from '@/components/modals/useFloatingWindow';

// ─── 채팅 모드 컴포넌트 (카카오톡 스타일) ───

const QUICK_QUESTIONS = [
  'SOD 평가 방법',
  '고장연결 확정',
  '4M 분류란',
  'AP 우선순위',
  '엑셀 Import',
  '개정 승인 절차',
];

function ChatMode({
  messages,
  onSend,
  pathname,
}: {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  pathname: string;
}) {
  const [input, setInput] = useState('');
  const [detailItem, setDetailItem] = useState<ManualItem | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 현재 화면에 해당하는 도움말 항목
  const pageItems = useMemo(() => {
    return MANUAL_DATA.ko.filter(
      item => item.paths?.some(p => pathname.startsWith(p))
    ).slice(0, 4);
  }, [pathname]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, detailItem]);

  const handleSend = (text?: string) => {
    const t = (text || input).trim();
    if (!t) return;
    setDetailItem(null); // 질문 시 상세에서 채팅으로 복귀
    onSend(t);
    setInput('');
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full">
      {/* 입력바 — 상단 항상 고정 (슬림) */}
      <div className="shrink-0 border-b border-blue-200 px-2 py-1 bg-blue-50">
        <div className="flex gap-1">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="질문을 입력하세요..."
            className="flex-1 px-2.5 py-1 text-xs bg-white border border-blue-400 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500"
            autoFocus
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim()}
            className="w-7 h-7 flex items-center justify-center rounded-full transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-xs shrink-0"
          >
            ↑
          </button>
        </div>
      </div>

      {/* 해당화면 바로가기 — 항상 고정 */}
      {pageItems.length > 0 && (
        <div className="shrink-0 border-b border-gray-200 px-2 py-1 bg-white">
          <div className="text-[9px] text-gray-400 mb-0.5">해당화면 바로가기</div>
          <div className="flex flex-wrap gap-1">
            {pageItems.map(item => (
              <button
                key={item.title}
                onClick={() => handleSend(item.title)}
                className="px-2 py-0.5 text-[10px] bg-blue-50 border border-blue-200 rounded-full text-blue-700 hover:bg-blue-100 transition-colors truncate max-w-[160px]"
                title={item.title}
              >
                {item.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 빠른 질문 칩 — 첫 진입 시만 */}
      {messages.length === 0 && !detailItem && (
        <div className="shrink-0 border-b border-gray-100 px-2 py-1 bg-gray-50">
          <div className="flex flex-wrap gap-1">
            {QUICK_QUESTIONS.map(q => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                className="px-2 py-0.5 text-[10px] bg-white border border-gray-200 rounded-full text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 본문 영역 — 상세 보기 또는 채팅 메시지 */}
      {detailItem ? (
        <div className="flex-1 overflow-y-auto flex flex-col" style={{ overscrollBehaviorY: 'contain' }}>
          {/* 상세 헤더 (목록 돌아가기) */}
          <div className="shrink-0 flex items-center border-b bg-gray-100">
            <button
              onClick={() => setDetailItem(null)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-blue-700 bg-white border-r border-gray-200 hover:bg-blue-50 transition-colors"
            >
              <span className="text-sm">◀</span> 채팅
            </button>
            <div className="flex-1 flex items-center gap-2 px-3 py-1 min-w-0">
              <span className={`shrink-0 px-2 py-0.5 text-[11px] rounded font-semibold ${CATEGORY_COLORS[detailItem.category] || 'bg-gray-200 text-gray-600'}`}>
                {CATEGORY_ICONS[detailItem.category]} {detailItem.category}
              </span>
              <span className="text-[12px] font-bold text-gray-800 truncate">{detailItem.title}</span>
            </div>
          </div>
          {/* 상세 본문 */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <div className="text-[11px] text-gray-700 leading-relaxed whitespace-pre-line">
              {detailItem.content}
            </div>
            {detailItem.keywords.length > 0 && (
              <div className="mt-3 pt-2 border-t border-gray-100">
                <div className="flex flex-wrap gap-1">
                  {detailItem.keywords.map(k => (
                    <span key={k} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[9px] rounded">{k}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* 관련 화면 이동 */}
          {detailItem.paths && detailItem.paths.length > 0 && (
            <div className="shrink-0 border-t border-gray-200 bg-gray-50 px-3 py-2 space-y-1">
              {detailItem.paths.map(p => (
                <a key={p} href={p} className="flex items-center justify-between w-full px-3 py-2 bg-blue-600 text-white text-[11px] font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                  <span className="flex items-center gap-1.5"><span>🔗</span><span>{p} 로 이동</span></span>
                  <span>→</span>
                </a>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-[#e9ecef]"
          style={{ overscrollBehaviorY: 'contain' }}
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-[11px]">
              질문을 입력하거나 위 키워드를 클릭하세요
            </div>
          ) : (
            messages.map(msg =>
              msg.role === 'user' ? (
                <UserBubble key={msg.id} text={msg.text} />
              ) : (
                <BotResponse key={msg.id} message={msg} onItemClick={setDetailItem} />
              )
            )
          )}
        </div>
      )}
    </div>
  );
}

/** 사용자 말풍선 — 우측 노란색 (카카오톡 스타일) */
function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[75%] px-3 py-2 bg-[#fee500] text-gray-900 rounded-2xl rounded-br-sm text-[12px] shadow-sm">
        {text}
      </div>
    </div>
  );
}

/** 봇 텍스트 말풍선 — 좌측 흰색 */
function BotBubble({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-1.5">
      <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-sm">
        💬
      </div>
      <div className="max-w-[80%] px-3 py-2 bg-white text-gray-800 rounded-2xl rounded-bl-sm text-[12px] shadow-sm">
        {text}
      </div>
    </div>
  );
}

/** 봇 응답 — 텍스트 + 결과 카드 목록 */
function BotResponse({
  message,
  onItemClick,
}: {
  message: ChatMessage;
  onItemClick: (item: ManualItem) => void;
}) {
  return (
    <div className="space-y-1.5">
      <BotBubble text={message.text} />
      {message.items && message.items.length > 0 && (
        <div className="pl-9 space-y-1">
          {message.items.map(item => (
            <button
              key={item.title}
              onClick={() => onItemClick(item)}
              className="w-full text-left p-2.5 bg-white rounded-xl shadow-sm hover:shadow-md hover:bg-blue-50/50 transition-all border border-transparent hover:border-blue-200"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded font-semibold ${CATEGORY_COLORS[item.category] || 'bg-gray-100 text-gray-600'}`}
                >
                  {CATEGORY_ICONS[item.category]} {item.category}
                </span>
              </div>
              <div className="text-[12px] font-bold text-gray-800 mb-0.5">
                {item.title}
              </div>
              <div className="text-[10px] text-gray-500 leading-relaxed line-clamp-2">
                {getSnippet(item.content, 100)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 검색 모드 컴포넌트 ───

function SearchMode({ onItemClick }: { onItemClick: (item: ManualItem) => void }) {
  const [query, setQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const { results, categories } = useChatbotSearch(query, selectedCat);

  return (
    <div className="flex flex-col h-full">
      {/* 검색바 */}
      <div className="shrink-0 px-3 py-2 border-b bg-gray-50">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="키워드 검색..."
          className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          autoFocus
        />
        {/* 카테고리 필터 */}
        <div className="flex flex-wrap gap-1 mt-1.5">
          <button
            onClick={() => setSelectedCat('')}
            className={`px-1.5 py-0.5 text-[9px] rounded-full font-semibold transition-colors ${
              !selectedCat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            전체
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCat(prev => prev === cat ? '' : cat)}
              className={`px-1.5 py-0.5 text-[9px] rounded-full font-semibold transition-colors ${
                selectedCat === cat
                  ? 'bg-blue-600 text-white'
                  : `${CATEGORY_COLORS[cat] || 'bg-gray-100 text-gray-600'} hover:opacity-80`
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 결과 목록 */}
      <div
        className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5"
        style={{ overscrollBehaviorY: 'contain' }}
      >
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-[10px]">
            {query || selectedCat ? '검색 결과가 없습니다.' : '카테고리를 선택하거나 키워드를 입력하세요.'}
          </div>
        ) : (
          results.map(item => (
            <SearchResultCard key={item.title} item={item} onItemClick={onItemClick} />
          ))
        )}
        {results.length > 0 && (
          <div className="text-center text-[9px] text-gray-400 py-1">
            {results.length}개 항목
          </div>
        )}
      </div>
    </div>
  );
}

function SearchResultCard({
  item,
  onItemClick,
}: {
  item: ManualItem;
  onItemClick: (item: ManualItem) => void;
}) {
  return (
    <button
      onClick={() => onItemClick(item)}
      className="w-full text-left p-2 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <span
          className={`px-1.5 py-0 text-[8px] rounded font-semibold shrink-0 ${CATEGORY_COLORS[item.category] || 'bg-gray-100 text-gray-600'}`}
        >
          {CATEGORY_ICONS[item.category]} {item.category}
        </span>
        <span className="text-[10px] font-bold text-gray-800 truncate">
          {item.title}
        </span>
      </div>
      <div className="text-[9px] text-gray-500 leading-relaxed line-clamp-2">
        {getSnippet(item.content, 120)}
      </div>
    </button>
  );
}

// ─── 상세 보기 오버레이 ───

function DetailOverlay({
  item,
  onClose,
}: {
  item: ManualItem;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-10 bg-white flex flex-col">
      {/* 네비게이션 바 */}
      <div className="shrink-0 flex items-center border-b bg-gray-100">
        <button
          onClick={onClose}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-bold text-blue-700 bg-white border-r border-gray-200 hover:bg-blue-50 transition-colors"
        >
          <span className="text-sm">◀</span> 목록
        </button>
        <div className="flex-1 flex items-center gap-2 px-3 py-1.5 min-w-0">
          <span
            className={`shrink-0 px-2 py-0.5 text-[11px] rounded font-semibold ${CATEGORY_COLORS[item.category] || 'bg-gray-200 text-gray-600'}`}
          >
            {CATEGORY_ICONS[item.category]} {item.category}
          </span>
          <span className="text-[12px] font-bold text-gray-800 truncate">
            {item.title}
          </span>
        </div>
      </div>

      {/* 본문 */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3"
        style={{ overscrollBehaviorY: 'contain' }}
      >
        <div className="text-[11px] text-gray-700 leading-relaxed whitespace-pre-line">
          {item.content}
        </div>

        {/* 키워드 */}
        {item.keywords.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-100">
            <div className="flex flex-wrap gap-1">
              {item.keywords.map(k => (
                <span
                  key={k}
                  className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[9px] rounded"
                >
                  {k}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 하단 — 관련 화면 이동 버튼 */}
      {item.paths && item.paths.length > 0 && (
        <div className="shrink-0 border-t border-gray-200 bg-gray-50 px-3 py-2 space-y-1">
          {item.paths.map(p => (
            <a
              key={p}
              href={p}
              className="flex items-center justify-between w-full px-3 py-2 bg-blue-600 text-white text-[11px] font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <span>🔗</span>
                <span>{p} 로 이동</span>
              </span>
              <span>→</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 메인 HelpChatbot ───

export default function HelpChatbot({ renderTrigger }: { renderTrigger?: (onOpen: () => void) => React.ReactNode } = {}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'chat' | 'search'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [detailItem, setDetailItem] = useState<ManualItem | null>(null);

  const { pos, size, onDragStart, onResizeStart } = useFloatingWindow({
    isOpen,
    width: 380,
    height: 520,
    minWidth: 320,
    minHeight: 400,
    initialY: 60,
  });

  const handleSend = useCallback((text: string) => {
    const userMsg: ChatMessage = {
      id: createMsgId(),
      role: 'user',
      text,
      timestamp: Date.now(),
    };

    const items = searchManualItems(text, 3);
    const botText = items.length > 0
      ? `"${text}"에 대한 도움말 ${items.length}건을 찾았습니다.`
      : `"${text}"에 대한 결과가 없습니다. 다른 키워드로 시도해 보세요.`;

    const botMsg: ChatMessage = {
      id: createMsgId(),
      role: 'bot',
      text: botText,
      items: items.length > 0 ? items : undefined,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg, botMsg]);
  }, []);

  const handleItemClick = useCallback((item: ManualItem) => {
    setDetailItem(item);
  }, []);

  const handleClearChat = useCallback(() => {
    setMessages([]);
  }, []);

  // 열릴 때 현재 화면 관련 도움말 자동 표시
  useEffect(() => {
    if (!isOpen) return;
    if (messages.length > 0) return; // 이미 대화 중이면 스킵
    const recommended = getRecommendedForPath(pathname);
    if (recommended.length > 0) {
      const pageName = pathname.split('/').filter(Boolean).pop() || '현재 화면';
      const botMsg: ChatMessage = {
        id: createMsgId(),
        role: 'bot',
        text: `📍 "${pageName}" 화면 도움말 ${recommended.length}건입니다.`,
        items: recommended,
        timestamp: Date.now(),
      };
      setMessages([botMsg]);
    }
  }, [isOpen, pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // ESC로 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (detailItem) setDetailItem(null);
        else setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, detailItem]);

  // renderTrigger 모드: 외부 트리거 + portal 윈도우
  // typeof window 체크 제거 — SSR에서 null 반환 시 React 트리 위치 이탈로 hydration 불일치 발생
  const chatWindow = (typeof window !== 'undefined' && isOpen) ? createPortal(
    <>
      {/* 챗봇 윈도우 */}
      <div
        className="fixed z-[9998] bg-white rounded-xl shadow-2xl flex flex-col border border-gray-300 overflow-hidden"
        style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
      >
        {/* 헤더 */}
        <div
          className="shrink-0 flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white cursor-move select-none"
          onMouseDown={onDragStart}
        >
          <span className="text-sm">💬</span>
          <span className="text-xs font-bold flex-1">SMART FMEA 도움말</span>
          <div className="flex bg-white/20 rounded-full p-0.5 gap-0.5">
            <button onClick={() => setMode('chat')} className={`px-2 py-0.5 text-[9px] rounded-full font-semibold transition-colors ${mode === 'chat' ? 'bg-white text-blue-700' : 'text-white/80 hover:text-white'}`}>💬 채팅</button>
            <button onClick={() => setMode('search')} className={`px-2 py-0.5 text-[9px] rounded-full font-semibold transition-colors ${mode === 'search' ? 'bg-white text-blue-700' : 'text-white/80 hover:text-white'}`}>🔍 검색</button>
          </div>
          {mode === 'chat' && messages.length > 0 && (
            <button onClick={handleClearChat} className="px-2 py-0.5 text-[10px] font-semibold bg-white/20 hover:bg-red-500 text-white rounded-full transition-colors" title="대화 초기화">🗑 초기화</button>
          )}
          <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white text-lg px-1 leading-none">✕</button>
        </div>
        {/* 본문 */}
        <div className="flex-1 relative overflow-hidden">
          {mode === 'chat' ? (
            <ChatMode messages={messages} onSend={handleSend} pathname={pathname} />
          ) : detailItem ? (
            <DetailOverlay item={detailItem} onClose={() => setDetailItem(null)} />
          ) : (
            <SearchMode onItemClick={handleItemClick} />
          )}
        </div>
        {/* 리사이즈 핸들 */}
        <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onMouseDown={onResizeStart}>
          <svg viewBox="0 0 16 16" className="text-gray-400 opacity-60">
            <path d="M14 14L8 14L14 8Z" fill="currentColor" />
            <path d="M14 14L11 14L14 11Z" fill="currentColor" />
          </svg>
        </div>
      </div>
    </>,
    document.body,
  ) : null;

  if (renderTrigger) {
    return (
      <>
        {renderTrigger(() => setIsOpen(true))}
        {chatWindow}
      </>
    );
  }

  return createPortal(
    <>
      {/* FAB 버튼 */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed z-[9998] right-2 top-[70px] flex items-center gap-1 px-2 h-6 rounded bg-blue-600 text-white shadow hover:bg-blue-700 transition-all opacity-70 hover:opacity-100"
          title="도움말 챗봇"
        >
          <span className="text-xs">💬</span>
          <span className="text-[10px] font-bold">Help</span>
        </button>
      )}

      {/* 챗봇 윈도우 (FAB 모드) */}
      {chatWindow}

      {/* FAB 펄스 애니메이션 */}
      <style>{`
        @keyframes chatbot-fab-pulse {
          0%, 100% { box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4); }
          50% { box-shadow: 0 4px 20px rgba(37, 99, 235, 0.7); }
        }
      `}</style>
    </>,
    document.body
  );
}
