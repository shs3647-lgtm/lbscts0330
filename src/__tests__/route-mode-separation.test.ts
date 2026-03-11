/**
 * @file route-mode-separation.test.ts
 * @description 수동/자동 mode='template' → failureChains DB 오염 방지 검증
 *
 * 수동/자동 모드에서 mode='template'이 전달되면
 * API에서 failureChains를 강제 무시하여 기존 데이터 오염을 방지한다.
 *
 * @created 2026-03-02
 */

import { describe, it, expect } from 'vitest';

// ─── saveMasterDataset의 body 생성 로직 재현 ───
// master-api.ts의 JSON.stringify body 생성 로직을 검증

function buildSaveBody(params: {
  fmeaId: string;
  fmeaType: string;
  flatData: Array<{ processNo: string; category: string; itemCode: string; value: string }>;
  failureChains?: unknown[];
  mode?: 'import' | 'template';
}) {
  return {
    fmeaId: params.fmeaId,
    fmeaType: params.fmeaType,
    name: 'MASTER',
    replace: true,
    flatData: params.flatData,
    failureChains: params.failureChains,
    mode: params.mode,
  };
}

/** API POST 핸들러의 mode 안전장치 재현 */
function applyModeSafeguard(body: ReturnType<typeof buildSaveBody>) {
  if (body.mode === 'template') {
    body.failureChains = undefined;
  }
  return body;
}

// ─── 테스트 ───

describe('수동/자동 route 분리 — mode 안전장치', () => {

  const sampleFlat = [
    { processNo: '10', category: 'A', itemCode: 'A2', value: '세척' },
  ];

  const sampleChains = [
    { processNo: '10', fmValue: '오염', fcValue: '세척불량', feValue: '기능상실' },
  ];

  describe('mode=template (수동/자동)', () => {

    it('failureChains가 전달되어도 undefined로 강제 무시된다', () => {
      const body = buildSaveBody({
        fmeaId: 'test-001',
        fmeaType: 'P',
        flatData: sampleFlat,
        failureChains: sampleChains,
        mode: 'template',
      });
      const safeguarded = applyModeSafeguard(body);
      expect(safeguarded.failureChains).toBeUndefined();
    });

    it('failureChains가 없으면 그대로 undefined', () => {
      const body = buildSaveBody({
        fmeaId: 'test-001',
        fmeaType: 'P',
        flatData: sampleFlat,
        mode: 'template',
      });
      const safeguarded = applyModeSafeguard(body);
      expect(safeguarded.failureChains).toBeUndefined();
    });

    it('flatData는 영향 없이 전달됨', () => {
      const body = buildSaveBody({
        fmeaId: 'test-001',
        fmeaType: 'P',
        flatData: sampleFlat,
        mode: 'template',
      });
      const safeguarded = applyModeSafeguard(body);
      expect(safeguarded.flatData).toEqual(sampleFlat);
    });

  });

  describe('mode=import (기존 Import)', () => {

    it('failureChains가 그대로 전달된다', () => {
      const body = buildSaveBody({
        fmeaId: 'test-001',
        fmeaType: 'P',
        flatData: sampleFlat,
        failureChains: sampleChains,
        mode: 'import',
      });
      const safeguarded = applyModeSafeguard(body);
      expect(safeguarded.failureChains).toEqual(sampleChains);
    });

  });

  describe('mode 미지정 (하위 호환)', () => {

    it('failureChains가 그대로 전달된다 (기존 동작 유지)', () => {
      const body = buildSaveBody({
        fmeaId: 'test-001',
        fmeaType: 'P',
        flatData: sampleFlat,
        failureChains: sampleChains,
      });
      const safeguarded = applyModeSafeguard(body);
      expect(safeguarded.failureChains).toEqual(sampleChains);
    });

    it('failureChains가 없으면 undefined (기존 동작 유지)', () => {
      const body = buildSaveBody({
        fmeaId: 'test-001',
        fmeaType: 'P',
        flatData: sampleFlat,
      });
      const safeguarded = applyModeSafeguard(body);
      expect(safeguarded.failureChains).toBeUndefined();
    });

  });

});
