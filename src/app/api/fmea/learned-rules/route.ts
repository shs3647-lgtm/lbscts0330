/**
 * @file learned-rules API
 * @description 사용자 확정 매핑을 learned_rules에 축적/조회
 *              온프레미스 지속적 개선 루프 — PostgreSQL만 사용
 *
 * POST: 확정 데이터 축적 (FMEA 워크시트 저장 시 자동 호출)
 * GET:  학습된 규칙 조회 (Import 시 우선 적용)
 */

import { NextRequest, NextResponse } from 'next/server';
import pg from 'pg';

const pool = new pg.Pool({
  host: 'localhost', port: 5432,
  user: 'postgres', password: '1234',
  database: 'fmea_db',
});

// ═══ POST: 확정 매핑 축적 ═══
export async function POST(req: NextRequest) {
  try {
    const { rules } = await req.json();
    // rules: Array<{ ruleType, inputText, outputText, m4Code?, sodValue?, sourceFmea? }>

    if (!Array.isArray(rules) || rules.length === 0) {
      return NextResponse.json({ success: false, error: 'rules required' }, { status: 400 });
    }

    let upserted = 0;
    for (const rule of rules) {
      const { ruleType, inputText, outputText, m4Code, sodValue, sourceFmea } = rule;
      if (!ruleType || !inputText || !outputText) continue;

      await pool.query(`
        INSERT INTO public.learned_rules (rule_type, input_text, output_text, m4_code, sod_value, source_fmea, confidence, use_count)
        VALUES ($1, $2, $3, $4, $5, $6, 100, 1)
        ON CONFLICT (rule_type, input_text, COALESCE(m4_code, ''))
        DO UPDATE SET
          output_text = EXCLUDED.output_text,
          sod_value = COALESCE(EXCLUDED.sod_value, learned_rules.sod_value),
          use_count = learned_rules.use_count + 1,
          confidence = LEAST(learned_rules.confidence + 10, 100),
          updated_at = NOW()
      `, [ruleType, inputText.substring(0, 500), outputText.substring(0, 500), m4Code || null, sodValue || null, sourceFmea || null]);
      upserted++;
    }

    return NextResponse.json({ success: true, upserted });
  } catch (error) {
    console.error('[learned-rules POST]', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// ═══ GET: 학습된 규칙 조회 ═══
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ruleType = searchParams.get('type');      // FC_PC, FM_DC, FE_S, FC_O, DC_D
    const inputText = searchParams.get('input');    // 매칭할 텍스트
    const m4Code = searchParams.get('m4');

    let query = 'SELECT * FROM public.learned_rules';
    const params: any[] = [];
    const conditions: string[] = [];

    if (ruleType) {
      params.push(ruleType);
      conditions.push(`rule_type = $${params.length}`);
    }
    if (inputText) {
      params.push(`%${inputText}%`);
      conditions.push(`input_text ILIKE $${params.length}`);
    }
    if (m4Code) {
      params.push(m4Code);
      conditions.push(`(m4_code = $${params.length} OR m4_code IS NULL)`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY use_count DESC, confidence DESC LIMIT 100';

    const { rows } = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      rules: rows,
      total: rows.length,
    });
  } catch (error) {
    console.error('[learned-rules GET]', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
