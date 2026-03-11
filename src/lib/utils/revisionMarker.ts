/**
 * @file revisionMarker.ts
 * @description 개정 출처 마커 유틸리티
 * @version 1.0.0
 * @created 2026-03-08
 *
 * CP/PFD/PFMEA 간 연동 시 어디서 개정이 시작되었는지
 * 위첨자 마커로 구분합니다.
 *
 * 마커:
 *   ᶠ = FMEA에서 개정됨 (파란색 #1565c0)
 *   ᶜ = CP에서 개정됨   (녹색 #2e7d32)
 *   ᵖ = PFD에서 개정됨  (주황색 #e65100)
 */

// =====================================================
// 타입 정의
// =====================================================

/** 연동 모듈 유형 */
export type SyncSource = 'pfmea' | 'dfmea' | 'cp' | 'pfd';

/** 개정 마커 정보 */
export interface RevisionMarker {
  /** 위첨자 문자 */
  char: string;
  /** 표시 색상 (hex) */
  color: string;
  /** 한국어 라벨 */
  label: string;
  /** 영문 약칭 */
  code: string;
}

// =====================================================
// 마커 정의
// =====================================================

const MARKERS: Record<SyncSource, RevisionMarker> = {
  pfmea: { char: 'ᶠ', color: '#1565c0', label: 'PFMEA', code: 'F' },
  dfmea: { char: 'ᶠ', color: '#1565c0', label: 'DFMEA', code: 'F' },
  cp:    { char: 'ᶜ', color: '#2e7d32', label: 'CP',    code: 'C' },
  pfd:   { char: 'ᵖ', color: '#e65100', label: 'PFD',   code: 'P' },
};

// =====================================================
// 마커 조회
// =====================================================

/**
 * 연동 출처에 대한 마커 정보 반환
 *
 * @example
 * getMarker('pfmea') → { char: 'ᶠ', color: '#1565c0', label: 'PFMEA', code: 'F' }
 */
export function getMarker(source: SyncSource): RevisionMarker {
  return MARKERS[source];
}

/**
 * 연동 출처에 대한 위첨자 문자 반환
 *
 * @example
 * getMarkerChar('cp') → 'ᶜ'
 */
export function getMarkerChar(source: SyncSource): string {
  return MARKERS[source].char;
}

/**
 * 연동 출처에 대한 색상 반환
 *
 * @example
 * getMarkerColor('pfd') → '#e65100'
 */
export function getMarkerColor(source: SyncSource): string {
  return MARKERS[source].color;
}

// =====================================================
// 텍스트에 마커 추가
// =====================================================

/**
 * 텍스트에 개정 출처 마커를 추가
 *
 * @example
 * appendMarker('용접 전류', 'pfmea') → '용접 전류ᶠ'
 */
export function appendMarker(text: string, source: SyncSource): string {
  if (!text) return text;
  const marker = MARKERS[source];
  // 이미 마커가 있으면 중복 추가 방지
  if (text.endsWith(marker.char)) return text;
  return `${text}${marker.char}`;
}

/**
 * 텍스트에서 마커를 제거
 *
 * @example
 * stripMarkers('용접 전류ᶠ') → '용접 전류'
 */
export function stripMarkers(text: string): string {
  if (!text) return text;
  return text.replace(/[ᶠᶜᵖ]/g, '');
}

/**
 * 텍스트에서 마커를 감지하여 출처 반환
 *
 * @example
 * detectSource('용접 전류ᶜ') → 'cp'
 * detectSource('일반 텍스트') → null
 */
export function detectSource(text: string): SyncSource | null {
  if (!text) return null;
  if (text.includes('ᶠ')) return 'pfmea';
  if (text.includes('ᶜ')) return 'cp';
  if (text.includes('ᵖ')) return 'pfd';
  return null;
}

// =====================================================
// React 인라인 스타일 헬퍼
// =====================================================

/**
 * 마커용 인라인 스타일 객체 반환 (React style prop에 사용)
 *
 * @example
 * <span style={getMarkerStyle('pfmea')}>ᶠ</span>
 */
export function getMarkerStyle(source: SyncSource): React.CSSProperties {
  return {
    color: MARKERS[source].color,
    fontSize: '0.7em',
    verticalAlign: 'super',
    fontWeight: 600,
    marginLeft: '1px',
  };
}

/**
 * Tailwind 클래스 문자열 반환 (color만 인라인, 나머지 Tailwind)
 */
export function getMarkerClassName(): string {
  return 'text-[0.7em] align-super font-semibold ml-px';
}
