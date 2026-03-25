/**
 * @file schema/utils/uid.ts
 * @description 고유 ID 생성 함수 — crypto.getRandomValues() 기반 (브라우저+서버 모두 지원)
 *
 * P7+ 안전성 강화:
 * - Math.random() → crypto.getRandomValues() (암호학적 안전)
 * - 128bit 랜덤 (32자 hex) + 타임스탬프 → 충돌 확률 사실상 0
 * - crypto 미지원 환경 fallback: Math.random() × 4 연결
 */

const hexFromBytes = (bytes: Uint8Array): string => {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
};

const cryptoRandom = (): string => {
  // 브라우저 + Node 18+ 모두 globalThis.crypto 지원
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16); // 128bit
    globalThis.crypto.getRandomValues(bytes);
    return hexFromBytes(bytes);
  }
  // fallback: Math.random() × 4 연결 (52bit × 4 = 208bit)
  return (
    Math.random().toString(16).slice(2) +
    Math.random().toString(16).slice(2) +
    Math.random().toString(16).slice(2) +
    Math.random().toString(16).slice(2)
  ).slice(0, 32);
};

export const uid = (): string =>
  'id_' + cryptoRandom() + '_' + Date.now().toString(16);
