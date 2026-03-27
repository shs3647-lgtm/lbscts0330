/**
 * /api/fmea/sample-lookup
 * 
 * m002(fmea_sample) DB에서 m4+WE 기반으로 실제 B2/B3/B4/B5/A6 데이터를 조회.
 * Import 시 엑셀에 WE만 있고 하위 데이터가 없을 때, 이 API로 실제 데이터를 가져와 꽂아넣기.
 * 
 * GET ?m4=MC&we=Sputter장비 → 정확 매칭
 * GET ?m4=MC               → m4별 대표 데이터
 * GET ?bulk=true            → 전체 WE 데이터 일괄 반환 (import 시 1회 호출)
 */
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const SAMPLE_SCHEMA = 'pfmea_pfm26_m002';

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

export interface SampleWEData {
  processNo: string;
  processName: string;
  m4: string;
  weName: string;
  b2: string[];   // 요소기능
  b3: string[];   // 공정특성
  b4: string[];   // 고장원인
  b5: string[];   // 예방관리
  a6: string[];   // 검출관리
}

async function fetchAllSampleData(): Promise<SampleWEData[]> {
  const p = getPool();
  const { rows } = await p.query(`
    SELECT 
      l2s.no AS process_no, l2s.name AS process_name,
      l3s.name AS we_name, l3s.m4,
      l3f."functionName" AS l3f_name, l3f."processChar" AS l3f_pc,
      fc.cause AS fc_name,
      ra."preventionControl" AS pc, ra."detectionControl" AS dc
    FROM "${SAMPLE_SCHEMA}".l3_structures l3s
    JOIN "${SAMPLE_SCHEMA}".l2_structures l2s ON l3s."l2Id" = l2s.id
    LEFT JOIN "${SAMPLE_SCHEMA}".l3_functions l3f ON l3f."l3StructId" = l3s.id
    LEFT JOIN "${SAMPLE_SCHEMA}".failure_causes fc ON fc."l3StructId" = l3s.id
    LEFT JOIN "${SAMPLE_SCHEMA}".failure_links fl ON fl."fcId" = fc.id AND fl."deletedAt" IS NULL
    LEFT JOIN "${SAMPLE_SCHEMA}".risk_analyses ra ON ra."linkId" = fl.id
    ORDER BY l2s.no::int, l3s.m4, l3s.name
  `);

  const weMap = new Map<string, SampleWEData>();
  for (const r of rows) {
    const key = `${r.process_no}|${r.m4}|${r.we_name}`;
    if (!weMap.has(key)) {
      weMap.set(key, {
        processNo: r.process_no, processName: r.process_name,
        m4: r.m4, weName: r.we_name,
        b2: [], b3: [], b4: [], b5: [], a6: [],
      });
    }
    const we = weMap.get(key)!;
    if (r.l3f_name && !we.b2.includes(r.l3f_name)) we.b2.push(r.l3f_name);
    if (r.l3f_pc && !we.b3.includes(r.l3f_pc)) we.b3.push(r.l3f_pc);
    if (r.fc_name && !we.b4.includes(r.fc_name)) we.b4.push(r.fc_name);
    if (r.pc && !we.b5.includes(r.pc)) we.b5.push(r.pc);
    if (r.dc && !we.a6.includes(r.dc)) we.a6.push(r.dc);
  }

  return [...weMap.values()];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bulk = searchParams.get('bulk') === 'true';
    const m4 = searchParams.get('m4') || '';
    const we = searchParams.get('we') || '';

    const allData = await fetchAllSampleData();

    if (bulk) {
      return NextResponse.json({ ok: true, count: allData.length, data: allData });
    }

    if (m4 && we) {
      // 1순위: m4+WE 정확 매칭
      let match = allData.find(d => d.m4 === m4 && d.weName === we);
      // 2순위: m4+WE 부분 매칭 (포함 검사)
      if (!match) {
        const weNorm = we.toLowerCase().replace(/\s/g, '');
        match = allData.find(d => {
          const dNorm = d.weName.toLowerCase().replace(/\s/g, '');
          return d.m4 === m4 && (dNorm.includes(weNorm) || weNorm.includes(dNorm));
        });
      }
      // 3순위: m4 카테고리 대표 데이터
      if (!match) {
        match = allData.find(d => d.m4 === m4 && d.b4.length > 0);
      }
      return NextResponse.json({ ok: true, match: match || null, matchType: match ? 'exact' : 'none' });
    }

    if (m4) {
      const filtered = allData.filter(d => d.m4 === m4);
      return NextResponse.json({ ok: true, count: filtered.length, data: filtered });
    }

    return NextResponse.json({ ok: true, count: allData.length, data: allData });
  } catch (error) {
    console.error('[sample-lookup] Error:', error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
