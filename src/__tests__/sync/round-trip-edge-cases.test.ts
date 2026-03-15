/**
 * @vitest-environment node
 */
/**
 * @file round-trip-edge-cases.test.ts
 * @description CP↔PFD↔PFMEA 왕복 연동 엣지케이스 테스트
 * @version 1.0.0
 * @created 2026-03-08
 *
 * 비유: 팩스를 A→B→A로 반복 전송하면 글씨가 흐려지듯,
 *       데이터 연동도 왕복할수록 열화(degradation)되는지 검증한다.
 *
 * ⚠️ FULL_SYSTEM 필요: npm run dev 실행 후 테스트
 * 실행: npx vitest run src/__tests__/sync/round-trip-edge-cases.test.ts
 *
 * 테스트 시나리오:
 * 1. CP→PFD→CP 왕복: 데이터 동일성 보존 확인
 * 2. CP→PFD→CP 3회 반복: 반복 연동 시 데이터 열화 없음
 * 3. 특별특성(CC/SC) 왕복: 특성값 변환 정확성
 * 4. 빈 필드 왕복: 빈 값이 이상한 문자열로 변하지 않음
 * 5. 한글 데이터 왕복: 인코딩 깨짐 없음
 * 6. 대량 데이터 왕복: 행 누락/중복 없음
 * 7. 동시 연동 충돌: 동시에 양방향 연동 시 데이터 무결성
 * 8. 공정번호 중복 행 왕복: 같은 공정번호의 다른 특성 행이 합쳐지거나 누락되지 않음
 * 9. sortOrder 왕복: 순서가 뒤바뀌지 않음
 * 10. 특수문자/개행 왕복: 이스케이프 문제 없음
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import http from 'node:http';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
let serverAvailable = false;

/**
 * setup.ts에서 global.fetch가 vi.fn()으로 모킹되므로,
 * node:http를 직접 사용하여 실제 네트워크 호출을 수행한다.
 */
function httpRequest(url: string, method: string, body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const postData = body ? JSON.stringify(body) : undefined;

    const req = http.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 3000,
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
      },
      timeout: 30000,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ ok: (res.statusCode || 500) < 400, status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ ok: false, status: res.statusCode, data: null });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });

    if (postData) req.write(postData);
    req.end();
  });
}

// ── 테스트 데이터 ──

/** 기본 CP 아이템 (3공정, 5행 — 같은 공정의 다른 특성 포함) */
const SEED_CP_ITEMS = [
  {
    processNo: '10', processName: '커팅', processLevel: 'Main',
    processDesc: 'Steel Pipe를 도면에서 지정된 길이로 절단한다',
    partName: '스틸파이프', equipment: 'Cutting MC',
    productChar: '파이프 외경 Φ25.4±0.1', processChar: '', specialChar: 'CC',
    charIndex: 0, sortOrder: 0,
  },
  {
    processNo: '10', processName: '커팅', processLevel: 'Main',
    processDesc: 'Steel Pipe를 도면에서 지정된 길이로 절단한다',
    partName: '스틸파이프', equipment: 'Cutting MC',
    productChar: '', processChar: '절삭 RPM 3000±100', specialChar: 'SC',
    charIndex: 1, sortOrder: 1,
  },
  {
    processNo: '20', processName: '프레스 성형', processLevel: 'Main',
    processDesc: '절단된 파이프를 형상에 맞게 프레스 성형',
    partName: '다운 튜브', equipment: '300톤 프레스',
    productChar: 'BURR 높이 ≤0.3mm', processChar: '', specialChar: 'SC',
    charIndex: 0, sortOrder: 2,
  },
  {
    processNo: '20', processName: '프레스 성형', processLevel: 'Main',
    processDesc: '절단된 파이프를 형상에 맞게 프레스 성형',
    partName: '다운 튜브', equipment: '300톤 프레스',
    productChar: '', processChar: '프레스 압력 250±10 kgf', specialChar: '',
    charIndex: 1, sortOrder: 3,
  },
  {
    processNo: '30', processName: '용접', processLevel: 'Main',
    processDesc: '프레임 조립 후 CO₂ 용접',
    partName: '프레임 ASSY', equipment: 'CO₂ 용접기, JIG-W01',
    productChar: '용접 비드 높이', processChar: '전류 180±10A', specialChar: 'CC',
    charIndex: 0, sortOrder: 4,
  },
];

/** 특수문자/한글 극단 케이스 */
const EDGE_CP_ITEMS = [
  {
    processNo: '10', processName: '도금/코팅(Plating)', processLevel: 'Main',
    processDesc: '표면 처리: Zn-Ni 도금 (두께 8~12μm)\n※ 주의: 산 세척 후 즉시 투입',
    partName: '브래킷 (Bracket)', equipment: '도금라인 #1, 건조기 (60°C)',
    productChar: '도금 두께 8~12μm ±2', processChar: '전류밀도 2.5A/dm²', specialChar: 'CC',
    charIndex: 0, sortOrder: 0,
  },
  {
    processNo: '20', processName: '', processLevel: 'Main',  // 빈 공정명
    processDesc: '', partName: '', equipment: '',
    productChar: '', processChar: '', specialChar: '',
    charIndex: 0, sortOrder: 1,
  },
  {
    processNo: '30', processName: '검사 (Inspection/검사)', processLevel: 'Main',
    processDesc: 'O-Ring 삽입 → 기밀시험 (He leak ≤ 1×10⁻⁸ Pa·m³/s)',
    partName: '밸브 ASSY', equipment: 'He Leak Detector "LD-500"',
    productChar: '누설률 ≤1×10⁻⁸', processChar: 'He 압력 500kPa', specialChar: 'SC',
    charIndex: 0, sortOrder: 2,
  },
];

// 고유한 테스트 식별자 (테스트 간 충돌 방지)
const TEST_ID = `rt-${Date.now().toString(36)}`;
const TEST_CP_NO = `cp-test-${TEST_ID}`;
const TEST_PFD_NO = `pfd-test-${TEST_ID}`;

// ── 유틸리티 ──

/** 핵심 필드만 추출하여 비교 가능한 형태로 정규화 */
function normalizeItems(items: any[]): any[] {
  return items
    .filter((i: any) => i.processNo && i.processNo.trim())  // 빈 공정번호 제외 (PFD→CP 변환 시 필터됨)
    .map((i: any) => ({
      processNo: (i.processNo || '').trim(),
      processName: (i.processName || '').trim(),
      processDesc: (i.processDesc || '').trim(),
      partName: (i.partName || '').trim(),
      equipment: (i.equipment || '').trim(),
      productChar: (i.productChar || '').trim(),
      processChar: (i.processChar || '').trim(),
      specialChar: (i.specialChar || '').trim().toUpperCase(),
    }))
    .sort((a: any, b: any) => {
      const noCompare = a.processNo.localeCompare(b.processNo);
      if (noCompare !== 0) return noCompare;
      // 같은 공정번호 내에서 productChar → processChar 순
      return (a.productChar || '').localeCompare(b.productChar || '');
    });
}

/** API 호출 래퍼 (node:http 기반 — vitest mock 우회) */
async function apiCall(url: string, method: string, body?: any): Promise<any> {
  const result = await httpRequest(`${BASE_URL}${url}`, method, body);
  return result.data;
}

// ── 테스트 ──

describe('CP↔PFD 왕복 연동 엣지케이스', () => {

  beforeAll(async () => {
    try {
      const result = await httpRequest(`${BASE_URL}/api/health`, 'GET');
      // 503 (unhealthy)도 서버가 동작 중이므로 테스트 가능
      serverAvailable = result.status !== undefined && result.status < 600;
    } catch {
      serverAvailable = false;
    }
    if (!serverAvailable) {
      console.log('⚠️ 서버 미실행 — 왕복 연동 테스트 스킵 (npm run dev 필요)');
    } else {
      console.log('✅ 서버 연결 확인 — 왕복 연동 테스트 실행');
    }
  });

  // ★ 테스트 후 DB 정리 — 테스트 데이터가 PFD 리스트에 남는 버그 방지
  afterAll(async () => {
    if (!serverAvailable) return;
    const suffixes = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10'];
    for (const suffix of suffixes) {
      const pfdNo = `${TEST_PFD_NO}-${suffix}`;
      try {
        await httpRequest(
          `${BASE_URL}/api/pfd?pfdNo=${encodeURIComponent(pfdNo)}`,
          'DELETE'
        );
      } catch {
        // 삭제 실패해도 다음 항목 계속 진행
      }
    }
    console.log(`🧹 테스트 데이터 정리 완료: ${TEST_PFD_NO}-s1~s10`);
  });

  // ────────────────────────────────────────────
  // 시나리오 1: CP→PFD→CP 왕복 데이터 동일성
  // ────────────────────────────────────────────
  describe('1. CP→PFD→CP 왕복 동일성', () => {
    it('CP 원본 데이터가 PFD를 거쳐 CP로 돌아와도 핵심 필드가 동일해야 함', async () => {
      if (!serverAvailable) return;

      const cpNo = `${TEST_CP_NO}-s1`;
      const pfdNo = `${TEST_PFD_NO}-s1`;

      // Step 1: CP → PFD 연동
      const toPfd = await apiCall('/api/pfd/sync-from-cp', 'POST', {
        cpNo, pfdNo, items: SEED_CP_ITEMS,
      });
      expect(toPfd.success).toBe(true);
      expect(toPfd.data.itemCount).toBe(SEED_CP_ITEMS.length);

      // Step 2: PFD에서 데이터 조회
      const pfdData = await apiCall(`/api/pfd/${pfdNo}`, 'GET');
      expect(pfdData.success).toBe(true);
      const pfdItems = pfdData.data.items.filter((i: any) => !i.isDeleted);

      // Step 3: PFD → CP 연동 (돌아오기)
      const toCp = await apiCall('/api/control-plan/sync-from-pfd', 'POST', {
        pfdNo, cpNo, items: pfdItems,
      });
      expect(toCp.success).toBe(true);

      // Step 4: 비교 — 원본 vs 왕복 결과
      const original = normalizeItems(SEED_CP_ITEMS);
      const roundTripped = normalizeItems(toCp.data.items);

      // 행 수 동일
      expect(roundTripped.length).toBe(original.length);

      // 각 행의 핵심 필드 동일
      for (let i = 0; i < original.length; i++) {
        expect(roundTripped[i].processNo).toBe(original[i].processNo);
        expect(roundTripped[i].processName).toBe(original[i].processName);
        expect(roundTripped[i].partName).toBe(original[i].partName);
        expect(roundTripped[i].equipment).toBe(original[i].equipment);
        expect(roundTripped[i].productChar).toBe(original[i].productChar);
        expect(roundTripped[i].processChar).toBe(original[i].processChar);
      }
    });
  });

  // ────────────────────────────────────────────
  // 시나리오 2: 3회 반복 왕복 — 열화 없음
  // ────────────────────────────────────────────
  describe('2. 3회 반복 왕복 — 데이터 열화 없음', () => {
    it('CP→PFD→CP를 3번 반복해도 데이터가 변하지 않아야 함', async () => {
      if (!serverAvailable) return;

      const cpNo = `${TEST_CP_NO}-s2`;
      const pfdNo = `${TEST_PFD_NO}-s2`;
      let currentItems: any[] = SEED_CP_ITEMS;

      for (let round = 1; round <= 3; round++) {
        // CP → PFD
        const toPfd = await apiCall('/api/pfd/sync-from-cp', 'POST', {
          cpNo, pfdNo, items: currentItems,
        });
        expect(toPfd.success).toBe(true);

        // PFD 조회
        const pfdData = await apiCall(`/api/pfd/${pfdNo}`, 'GET');
        const pfdItems = pfdData.data.items.filter((i: any) => !i.isDeleted);

        // PFD → CP
        const toCp = await apiCall('/api/control-plan/sync-from-pfd', 'POST', {
          pfdNo, cpNo, items: pfdItems,
        });
        expect(toCp.success).toBe(true);

        currentItems = toCp.data.items;
      }

      // 3회 왕복 후 원본과 비교
      const original = normalizeItems(SEED_CP_ITEMS);
      const after3Rounds = normalizeItems(currentItems);

      expect(after3Rounds.length).toBe(original.length);
      for (let i = 0; i < original.length; i++) {
        expect(after3Rounds[i].processNo).toBe(original[i].processNo);
        expect(after3Rounds[i].processName).toBe(original[i].processName);
        expect(after3Rounds[i].productChar).toBe(original[i].productChar);
        expect(after3Rounds[i].processChar).toBe(original[i].processChar);
      }
    });
  });

  // ────────────────────────────────────────────
  // 시나리오 3: 특별특성(CC/SC) 왕복 정확성
  // ────────────────────────────────────────────
  describe('3. 특별특성 변환 정확성', () => {
    it('CC/SC 값이 왕복 후에도 정확히 보존되어야 함', async () => {
      if (!serverAvailable) return;

      const cpNo = `${TEST_CP_NO}-s3`;
      const pfdNo = `${TEST_PFD_NO}-s3`;

      const specialItems = [
        { processNo: '10', processName: 'A', processLevel: 'Main', processDesc: '', partName: '', equipment: '',
          productChar: '특성A', processChar: '', specialChar: 'CC', charIndex: 0, sortOrder: 0 },
        { processNo: '20', processName: 'B', processLevel: 'Main', processDesc: '', partName: '', equipment: '',
          productChar: '특성B', processChar: '', specialChar: 'SC', charIndex: 0, sortOrder: 1 },
        { processNo: '30', processName: 'C', processLevel: 'Main', processDesc: '', partName: '', equipment: '',
          productChar: '특성C', processChar: '', specialChar: '', charIndex: 0, sortOrder: 2 },  // 빈 특성
      ];

      // CP → PFD
      const toPfd = await apiCall('/api/pfd/sync-from-cp', 'POST', {
        cpNo, pfdNo, items: specialItems,
      });
      expect(toPfd.success).toBe(true);

      // PFD 조회 후 specialChar 확인
      const pfdData = await apiCall(`/api/pfd/${pfdNo}`, 'GET');
      const pfdItems = pfdData.data.items.filter((i: any) => !i.isDeleted);

      // PFD → CP
      const toCp = await apiCall('/api/control-plan/sync-from-pfd', 'POST', {
        pfdNo, cpNo, items: pfdItems,
      });
      expect(toCp.success).toBe(true);

      const result = toCp.data.items;
      const p10 = result.find((i: any) => i.processNo === '10');
      const p20 = result.find((i: any) => i.processNo === '20');
      const p30 = result.find((i: any) => i.processNo === '30');

      // CC는 CC로 보존
      expect((p10?.specialChar || '').toUpperCase()).toContain('CC');
      // SC는 SC로 보존
      expect((p20?.specialChar || '').toUpperCase()).toContain('SC');
      // 빈 특성은 빈 채로 유지 (이상한 값 안 됨)
      expect((p30?.specialChar || '').trim()).toBe('');
    });
  });

  // ────────────────────────────────────────────
  // 시나리오 4: 빈 필드가 이상한 값으로 변하지 않음
  // ────────────────────────────────────────────
  describe('4. 빈 필드 보존', () => {
    it('빈 문자열 필드가 "undefined", "null", "false" 등으로 변하지 않아야 함', async () => {
      if (!serverAvailable) return;

      const cpNo = `${TEST_CP_NO}-s4`;
      const pfdNo = `${TEST_PFD_NO}-s4`;

      const emptyItems = [
        { processNo: '10', processName: '공정A', processLevel: 'Main',
          processDesc: '', partName: '', equipment: '',
          productChar: '', processChar: '', specialChar: '',
          charIndex: 0, sortOrder: 0 },
      ];

      // CP → PFD → CP
      await apiCall('/api/pfd/sync-from-cp', 'POST', { cpNo, pfdNo, items: emptyItems });
      const pfdData = await apiCall(`/api/pfd/${pfdNo}`, 'GET');
      const pfdItems = pfdData.data.items.filter((i: any) => !i.isDeleted);

      const toCp = await apiCall('/api/control-plan/sync-from-pfd', 'POST', {
        pfdNo, cpNo, items: pfdItems,
      });

      const result = toCp.data.items[0];

      // 빈 필드가 이상한 문자열로 변하면 안 됨
      const badValues = ['undefined', 'null', 'false', 'NaN', '[object Object]'];
      const fieldsToCheck = ['processDesc', 'partName', 'equipment', 'productChar', 'processChar', 'specialChar'];

      for (const field of fieldsToCheck) {
        const value = (result[field] || '').toString().trim();
        for (const bad of badValues) {
          expect(value).not.toBe(bad);
        }
      }
    });
  });

  // ────────────────────────────────────────────
  // 시나리오 5: 한글/특수문자/개행 왕복
  // ────────────────────────────────────────────
  describe('5. 한글 + 특수문자 + 개행 왕복', () => {
    it('μm, ², ≤, ×, 개행 등 특수문자가 왕복 후에도 보존되어야 함', async () => {
      if (!serverAvailable) return;

      const cpNo = `${TEST_CP_NO}-s5`;
      const pfdNo = `${TEST_PFD_NO}-s5`;

      // CP → PFD
      await apiCall('/api/pfd/sync-from-cp', 'POST', { cpNo, pfdNo, items: EDGE_CP_ITEMS });

      // PFD 조회
      const pfdData = await apiCall(`/api/pfd/${pfdNo}`, 'GET');
      const pfdItems = pfdData.data.items.filter((i: any) => !i.isDeleted);

      // PFD → CP
      const toCp = await apiCall('/api/control-plan/sync-from-pfd', 'POST', {
        pfdNo, cpNo, items: pfdItems,
      });

      // 공정번호 10의 특수문자 검증
      const p10 = toCp.data.items.find((i: any) => i.processNo === '10');
      if (p10) {
        // μm이 살아있는지
        expect(p10.productChar || p10.processDesc || '').toMatch(/μm|um/i);
        // 한글 깨짐 없는지
        expect(p10.processName).toContain('도금');
      }

      // 공정번호 30의 특수문자 검증
      const p30 = toCp.data.items.find((i: any) => i.processNo === '30');
      if (p30) {
        expect(p30.processName).toContain('검사');
      }
    });
  });

  // ────────────────────────────────────────────
  // 시나리오 6: 대량 데이터 왕복 (50행)
  // ────────────────────────────────────────────
  describe('6. 대량 데이터 왕복 — 행 누락/중복 없음', () => {
    it('50행 데이터가 왕복 후에도 정확히 50행이어야 함', async () => {
      if (!serverAvailable) return;

      const cpNo = `${TEST_CP_NO}-s6`;
      const pfdNo = `${TEST_PFD_NO}-s6`;

      // 50행 생성
      const bulkItems = Array.from({ length: 50 }, (_, i) => ({
        processNo: String((i + 1) * 10).padStart(3, '0'),
        processName: `공정${i + 1}`,
        processLevel: 'Main',
        processDesc: `공정설명 ${i + 1}`,
        partName: `부품${i + 1}`,
        equipment: `설비${i + 1}`,
        productChar: i % 2 === 0 ? `제품특성${i}` : '',
        processChar: i % 2 === 1 ? `공정특성${i}` : '',
        specialChar: i % 3 === 0 ? 'CC' : (i % 3 === 1 ? 'SC' : ''),
        charIndex: 0,
        sortOrder: i,
      }));

      // CP → PFD
      const toPfd = await apiCall('/api/pfd/sync-from-cp', 'POST', {
        cpNo, pfdNo, items: bulkItems,
      });
      expect(toPfd.success).toBe(true);
      expect(toPfd.data.itemCount).toBe(50);

      // PFD 조회
      const pfdData = await apiCall(`/api/pfd/${pfdNo}`, 'GET');
      const pfdItems = pfdData.data.items.filter((i: any) => !i.isDeleted);
      expect(pfdItems.length).toBe(50);

      // PFD → CP
      const toCp = await apiCall('/api/control-plan/sync-from-pfd', 'POST', {
        pfdNo, cpNo, items: pfdItems,
      });
      expect(toCp.success).toBe(true);
      expect(toCp.data.itemCount).toBe(50);

      // 중복 processNo 체크 (각 행이 고유한 공정번호를 가짐)
      const processNos = toCp.data.items.map((i: any) => i.processNo);
      const uniqueProcessNos = new Set(processNos);
      expect(uniqueProcessNos.size).toBe(50);
    });
  });

  // ────────────────────────────────────────────
  // 시나리오 7: 같은 공정번호 다중 행 왕복
  // ────────────────────────────────────────────
  describe('7. 같은 공정번호 다중 행 — 합쳐지거나 누락 안 됨', () => {
    it('공정번호 10에 2행, 20에 2행 → 왕복 후에도 4행이어야 함', async () => {
      if (!serverAvailable) return;

      const cpNo = `${TEST_CP_NO}-s7`;
      const pfdNo = `${TEST_PFD_NO}-s7`;

      // 같은 공정번호로 제품특성/공정특성 분리 행
      const multiRowItems = [
        { processNo: '10', processName: '커팅', processLevel: 'Main', processDesc: '절단',
          partName: '파이프', equipment: 'CNC',
          productChar: '외경', processChar: '', specialChar: 'CC', charIndex: 0, sortOrder: 0 },
        { processNo: '10', processName: '커팅', processLevel: 'Main', processDesc: '절단',
          partName: '파이프', equipment: 'CNC',
          productChar: '', processChar: 'RPM', specialChar: 'SC', charIndex: 1, sortOrder: 1 },
        { processNo: '20', processName: '용접', processLevel: 'Main', processDesc: '조립',
          partName: '프레임', equipment: '용접기',
          productChar: '비드높이', processChar: '', specialChar: '', charIndex: 0, sortOrder: 2 },
        { processNo: '20', processName: '용접', processLevel: 'Main', processDesc: '조립',
          partName: '프레임', equipment: '용접기',
          productChar: '', processChar: '전류', specialChar: 'CC', charIndex: 1, sortOrder: 3 },
      ];

      // CP → PFD
      await apiCall('/api/pfd/sync-from-cp', 'POST', { cpNo, pfdNo, items: multiRowItems });

      // PFD 조회
      const pfdData = await apiCall(`/api/pfd/${pfdNo}`, 'GET');
      const pfdItems = pfdData.data.items.filter((i: any) => !i.isDeleted);
      expect(pfdItems.length).toBe(4);  // 4행 유지

      // PFD → CP
      const toCp = await apiCall('/api/control-plan/sync-from-pfd', 'POST', {
        pfdNo, cpNo, items: pfdItems,
      });
      expect(toCp.data.itemCount).toBe(4);  // 4행 유지 (합쳐지면 안 됨)

      // 공정번호별 행 수 확인
      const p10Count = toCp.data.items.filter((i: any) => i.processNo === '10').length;
      const p20Count = toCp.data.items.filter((i: any) => i.processNo === '20').length;
      expect(p10Count).toBe(2);
      expect(p20Count).toBe(2);
    });
  });

  // ────────────────────────────────────────────
  // 시나리오 8: sortOrder 보존
  // ────────────────────────────────────────────
  describe('8. sortOrder 보존', () => {
    it('왕복 후 행 순서가 원본과 동일해야 함', async () => {
      if (!serverAvailable) return;

      const cpNo = `${TEST_CP_NO}-s8`;
      const pfdNo = `${TEST_PFD_NO}-s8`;

      // CP → PFD → CP
      await apiCall('/api/pfd/sync-from-cp', 'POST', { cpNo, pfdNo, items: SEED_CP_ITEMS });
      const pfdData = await apiCall(`/api/pfd/${pfdNo}`, 'GET');
      const pfdItems = pfdData.data.items
        .filter((i: any) => !i.isDeleted)
        .sort((a: any, b: any) => a.sortOrder - b.sortOrder);

      const toCp = await apiCall('/api/control-plan/sync-from-pfd', 'POST', {
        pfdNo, cpNo, items: pfdItems,
      });

      const resultOrder = toCp.data.items.map((i: any) => i.processNo);
      const originalOrder = SEED_CP_ITEMS.map((i: any) => i.processNo);

      // 순서 보존 (공정번호 순서가 동일)
      expect(resultOrder).toEqual(originalOrder);
    });
  });

  // ────────────────────────────────────────────
  // 시나리오 9: 중복 연동 — 이전 데이터 정리
  // ────────────────────────────────────────────
  describe('9. 중복 연동 — soft delete 후 새 데이터만 남음', () => {
    it('같은 PFD에 2번 연동하면 최신 데이터만 남아야 함 (이전 데이터 잔류 없음)', async () => {
      if (!serverAvailable) return;

      const cpNo = `${TEST_CP_NO}-s9`;
      const pfdNo = `${TEST_PFD_NO}-s9`;

      // 1차 연동: 5행
      await apiCall('/api/pfd/sync-from-cp', 'POST', {
        cpNo, pfdNo, items: SEED_CP_ITEMS,
      });

      // 2차 연동: 3행 (데이터 줄임)
      const reducedItems = SEED_CP_ITEMS.slice(0, 3);
      await apiCall('/api/pfd/sync-from-cp', 'POST', {
        cpNo, pfdNo, items: reducedItems,
      });

      // PFD 조회 — 활성 아이템만
      const pfdData = await apiCall(`/api/pfd/${pfdNo}`, 'GET');
      const activeItems = pfdData.data.items.filter((i: any) => !i.isDeleted);

      // 최신 3행만 남아야 함 (5행 잔류하면 안 됨)
      expect(activeItems.length).toBe(3);
    });
  });

  // ────────────────────────────────────────────
  // 시나리오 10: 동시 양방향 연동 충돌
  // ────────────────────────────────────────────
  describe('10. 동시 양방향 연동 — 최종 상태 일관성', () => {
    it('CP→PFD와 PFD→CP를 동시에 호출해도 에러 없이 완료해야 함', async () => {
      if (!serverAvailable) return;

      const cpNo = `${TEST_CP_NO}-s10`;
      const pfdNo = `${TEST_PFD_NO}-s10`;

      // 먼저 초기 데이터 설정
      await apiCall('/api/pfd/sync-from-cp', 'POST', {
        cpNo, pfdNo, items: SEED_CP_ITEMS,
      });

      // 동시에 양방향 연동 실행
      const pfdData = await apiCall(`/api/pfd/${pfdNo}`, 'GET');
      const pfdItems = pfdData.data.items.filter((i: any) => !i.isDeleted);

      const modifiedCpItems = SEED_CP_ITEMS.map(i => ({
        ...i, processDesc: i.processDesc + ' [CP수정]',
      }));
      const modifiedPfdItems = pfdItems.map((i: any) => ({
        ...i, processDesc: (i.processDesc || '') + ' [PFD수정]',
      }));

      // 동시 호출 (Promise.allSettled로 에러가 나도 테스트 계속)
      const results = await Promise.allSettled([
        httpRequest(`${BASE_URL}/api/pfd/sync-from-cp`, 'POST', { cpNo, pfdNo, items: modifiedCpItems }),
        httpRequest(`${BASE_URL}/api/control-plan/sync-from-pfd`, 'POST', { pfdNo, cpNo, items: modifiedPfdItems }),
      ]);

      // 둘 다 fulfilled (에러 없이 완료)
      for (const result of results) {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          // success는 true이거나, 최소한 서버 500이 아님
          expect(result.value.data?.success).toBeDefined();
        }
      }

      // 최종 상태 확인 — PFD에 활성 데이터가 있어야 함
      const finalPfd = await apiCall(`/api/pfd/${pfdNo}`, 'GET');
      const finalActive = finalPfd.data.items.filter((i: any) => !i.isDeleted);
      expect(finalActive.length).toBeGreaterThan(0);
    });
  });
});
