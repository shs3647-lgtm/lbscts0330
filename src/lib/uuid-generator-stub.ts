/**
 * @file uuid-generator-stub.ts
 * @description uuid-generator.ts 삭제 후 호환 stub (2026-03-22)
 *
 * 레거시 코드(buildAtomicDB, buildWorksheetState 등)가 여전히 genXxx를 호출하므로
 * 동일 시그니처의 stub을 제공. 새 코드는 position-uuid.ts를 사용.
 */

const pad3 = (n: number) => String(n).padStart(3, '0');

// L1
export const genC1 = (doc: string, div: string) => `${doc}-L1-${div}`;
export const genC2 = (doc: string, div: string, seq: number) => `${doc}-L1-${div}-${pad3(seq)}`;
export const genC3 = (doc: string, div: string, c2: number, c3: number) => `${doc}-L1-${div}-${pad3(c2)}-${pad3(c3)}`;
export const genC4 = (doc: string, div: string, c2: number, c3: number, c4: number) => `${doc}-L1-${div}-${pad3(c2)}-${pad3(c3)}-${pad3(c4)}`;

// L2
export const genA1 = (doc: string, pno: number) => `${doc}-L2-${pad3(pno)}`;
export const genA3 = (doc: string, pno: number, seq: number) => `${doc}-L2-${pad3(pno)}-F-${pad3(seq)}`;
export const genA4 = (doc: string, pno: number, seq: number) => `${doc}-L2-${pad3(pno)}-P-${pad3(seq)}`;
export const genA5 = (doc: string, pno: number, seq: number) => `${doc}-L2-${pad3(pno)}-M-${pad3(seq)}`;
export const genA6 = (doc: string, pno: number, seq: number) => `${doc}-L2-${pad3(pno)}-D-${pad3(seq)}`;

// L3
export const genB1 = (doc: string, pno: number, m4: string, seq: number) => `${doc}-L3-${pad3(pno)}-${m4}-${pad3(seq)}`;
export const genB2 = (doc: string, pno: number, m4: string, seq: number, fi?: number) => `${doc}-L3-${pad3(pno)}-${m4}-${pad3(seq)}-G${fi && fi > 1 ? `-${pad3(fi)}` : ''}`;
export const genB3 = (doc: string, pno: number, m4: string, b1: number, cs: number) => `${doc}-L3-${pad3(pno)}-${m4}-${pad3(b1)}-C-${pad3(cs)}`;
export const genB4 = (doc: string, pno: number, m4: string, b1: number, ks: number) => `${doc}-L3-${pad3(pno)}-${m4}-${pad3(b1)}-K-${pad3(ks)}`;
export const genB5 = (doc: string, pno: number, m4: string, b1: number, ps: number) => `${doc}-L3-${pad3(pno)}-${m4}-${pad3(b1)}-P-${pad3(ps)}`;

// FC
export const genFC = (doc: string, pno: number, mseq: number, m4: string, b1seq: number, kseq: number) =>
  `${doc}-FC-${pad3(pno)}-M${pad3(mseq)}-${m4}${pad3(b1seq)}-K${pad3(kseq)}`;
