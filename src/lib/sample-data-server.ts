/**
 * @file sample-data-server.ts
 * @description 서버사이드 전용 — m066 DB에서 직접 WE별 데이터 조회
 * 
 * migration.ts / rebuild-atomic에서 사용 (API 호출 대신 직접 DB 쿼리)
 */

import { Pool } from 'pg';

const SAMPLE_SCHEMA = 'pfmea_pfm26_m066';

export interface SampleFCData {
  weName: string;
  m4: string;
  causes: string[];       // FC(고장원인) 텍스트 목록
  processChars: string[];  // B3(공정특성) 텍스트 목록
  b5: string[];           // 예방관리
  a6: string[];           // 검출관리
}

let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:1234@localhost:5432/fmea_db',
      max: 3,
    });
  }
  return pool;
}

let cachedData: Map<string, SampleFCData> | null = null;

/**
 * m066 DB에서 m4+WE별 FC 데이터 일괄 로드 (서버사이드 캐시)
 */
export async function loadSampleFCData(): Promise<Map<string, SampleFCData>> {
  if (cachedData) return cachedData;

  const p = getPool();
  try {
    const { rows } = await p.query(`
      SELECT 
        l3s.name AS we_name, l3s.m4,
        l3f."processChar" AS process_char,
        fc.cause AS fc_name,
        ra."preventionControl" AS pc, ra."detectionControl" AS dc
      FROM "${SAMPLE_SCHEMA}".l3_structures l3s
      LEFT JOIN "${SAMPLE_SCHEMA}".l3_functions l3f ON l3f."l3StructId" = l3s.id
      LEFT JOIN "${SAMPLE_SCHEMA}".failure_causes fc ON fc."l3StructId" = l3s.id
      LEFT JOIN "${SAMPLE_SCHEMA}".failure_links fl ON fl."fcId" = fc.id AND fl."deletedAt" IS NULL
      LEFT JOIN "${SAMPLE_SCHEMA}".risk_analyses ra ON ra."linkId" = fl.id
      ORDER BY l3s.m4, l3s.name
    `);

    const map = new Map<string, SampleFCData>();
    for (const r of rows) {
      const key = `${r.m4}|${r.we_name}`;
      if (!map.has(key)) {
        map.set(key, {
          weName: r.we_name, m4: r.m4,
          causes: [], processChars: [], b5: [], a6: [],
        });
      }
      const d = map.get(key)!;
      if (r.fc_name && !d.causes.includes(r.fc_name)) d.causes.push(r.fc_name);
      if (r.process_char && !d.processChars.includes(r.process_char)) d.processChars.push(r.process_char);
      if (r.pc && !d.b5.includes(r.pc)) d.b5.push(r.pc);
      if (r.dc && !d.a6.includes(r.dc)) d.a6.push(r.dc);
    }

    cachedData = map;
    console.info(`[sample-data-server] m066 데이터 로드: ${map.size}건 WE`);
    return map;
  } catch (e) {
    console.warn('[sample-data-server] m066 DB 조회 실패:', e);
    return new Map();
  }
}

/**
 * m4+WE명으로 m066 FC 데이터 조회
 * 매칭 우선순위: 1) 정확매칭 2) 부분매칭 3) m4 카테고리 대표
 */
export function lookupSampleFC(
  data: Map<string, SampleFCData>,
  m4: string,
  weName: string,
): SampleFCData | null {
  if (!data || data.size === 0 || !m4) return null;
  const m4Upper = m4.toUpperCase();

  // 1순위: 정확 매칭
  const exact = data.get(`${m4Upper}|${weName}`);
  if (exact && exact.causes.length > 0) return exact;

  // 2순위: 부분 매칭
  if (weName) {
    const weNorm = weName.toLowerCase().replace(/\s/g, '');
    for (const [, d] of data) {
      if (d.m4 !== m4Upper) continue;
      const dNorm = d.weName.toLowerCase().replace(/\s/g, '');
      if ((dNorm.includes(weNorm) || weNorm.includes(dNorm)) && d.causes.length > 0) {
        return d;
      }
    }
  }

  // 3순위: m4 카테고리 대표
  for (const [, d] of data) {
    if (d.m4 === m4Upper && d.causes.length > 0) return d;
  }

  return null;
}
