'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { MENU_DICT } from './locale-dict';

// ── Types ──
export type Locale = 'ko' | 'en';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** 한글 원문 → 현재 locale에 맞는 번역 반환. 이모지 prefix 자동 분리. */
  t: (text: string) => string;
}

// ── Context ──
const LocaleContext = createContext<LocaleContextValue>({
  locale: 'ko',
  setLocale: () => {},
  t: (text) => text,
});

// ── 이모지 prefix 분리 regex (이모지 + 공백) ──
const EMOJI_PREFIX_RE = /^([\p{Emoji_Presentation}\p{Emoji}\u200d\ufe0f]+\s*)/u;

/**
 * 번역 함수: 이모지 prefix를 보존하고 bilingual 형식으로 반환
 * KO: '저장(Save)', '📊 대시보드(Dashboard)'
 * EN: 'Save(저장)', '📊 Dashboard(대시보드)'
 * 괄호 포함 텍스트: '고장영향(FE)' → EN: 'Failure Effect(고장영향)'
 */
function translate(text: string, locale: Locale): string {
  const match = text.match(EMOJI_PREFIX_RE);
  const emoji = match ? match[1] : '';
  const rest = match ? text.slice(emoji.length).trim() : text;

  // DICT에서 직접 검색
  let en = MENU_DICT[rest];

  // 괄호 포함 텍스트: '고장영향(FE)' → 괄호 제거 후 '고장영향'으로 fallback 검색
  const parenMatch = rest.match(/^(.+?)\(([^)]+)\)$/);
  if (!en && parenMatch) {
    en = MENU_DICT[parenMatch[1]];
  }

  // ★ EN(KO) 형식 감지: 'Structure(구조)', '1L Function(기능)' 등
  // pre-paren이 라틴 문자 포함 + inner-paren이 한글 포함 → EN(KO) 형식
  if (!en && parenMatch) {
    const preText = parenMatch[1];
    const innerText = parenMatch[2];
    const isEnKoFormat = /[A-Za-z]/.test(preText) && /[\uAC00-\uD7AF]/.test(innerText);
    if (isEnKoFormat) {
      if (locale === 'en') return text; // 이미 EN(KO) — 유지
      return `${emoji}${innerText}(${preText})`; // KO(EN)으로 전환
    }
  }

  if (!en) return text; // 번역 없으면 원문 그대로

  if (locale === 'ko') {
    if (parenMatch) return text; // 이미 '한글(약어)' 형식
    return `${emoji}${rest}(${en})`;
  }

  // EN mode
  if (parenMatch) {
    // '고장영향(FE)' → 'Failure Effect(고장영향)'
    const pureKorean = parenMatch[1];
    const pureEn = en.replace(/\([^)]*\)$/, '').trim();
    return `${emoji}${pureEn}(${pureKorean})`;
  }
  return `${emoji}${en}(${rest})`;
}

// ── Storage key ──
const LOCALE_STORAGE_KEY = 'fmea-locale';

// ── Provider ──
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ko');

  // localStorage에서 초기값 읽기 (hydration 후)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
      if (saved === 'en' || saved === 'ko') {
        setLocaleState(saved);
      }
    } catch {
      // SSR or localStorage unavailable
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const t = useCallback((text: string) => translate(text, locale), [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

// ── Hook ──
export function useLocale() {
  return useContext(LocaleContext);
}

// ── <T> 컴포넌트: 현재 locale로 표시 + 호버 시 한글(English) 툴팁 ──
interface TProps {
  children: string;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 번역 텍스트 컴포넌트
 * - 현재 locale에 맞는 bilingual 텍스트 표시
 * - KO 호버: English full word / EN 호버: 한글
 */
export function T({ children: text, as: Tag = 'span', className, style }: TProps) {
  const { locale, t } = useLocale();
  const translated = t(text);
  const clean = text.replace(EMOJI_PREFIX_RE, '').trim();
  const en = MENU_DICT[clean];

  // tooltip: 반대 언어만 표시
  const tooltip = en
    ? (locale === 'en' ? clean : en)
    : undefined;

  return React.createElement(Tag, { className, style, title: tooltip }, translated);
}

/**
 * tooltip용 반대 언어 반환 훅
 * KO: bt('저장') → 'Save' / EN: bt('저장') → '저장'
 */
export function useBilingualTitle() {
  const { locale } = useLocale();
  return useCallback((text: string): string | undefined => {
    const clean = text.replace(EMOJI_PREFIX_RE, '').trim();
    const en = MENU_DICT[clean];
    if (!en) return undefined;
    return locale === 'en' ? clean : en;
  }, [locale]);
}
