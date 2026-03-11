/**
 * @file /api/admin/migrate-lowercase/route.ts
 * @description 기존 대문자 ID를 소문자로 마이그레이션하는 API
 * @created 2026-01-13
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getBaseDatabaseUrl } from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * GET: 마이그레이션 대상 확인
 */
export async function GET() {
  const dbUrl = getBaseDatabaseUrl();
  if (!dbUrl) {
    return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
  }
  
  const pool = new Pool({ connectionString: dbUrl });
  
  try {
    // FMEA ID 확인
    const fmeaResult = await pool.query(`
      SELECT id FROM fmea_projects WHERE id <> LOWER(id)
    `);
    
    // CP ID 확인
    const cpResult = await pool.query(`
      SELECT "cpNo" FROM cp_registrations WHERE "cpNo" <> LOWER("cpNo")
    `);
    
    return NextResponse.json({
      success: true,
      message: '마이그레이션 대상 확인 완료',
      fmeaUppercaseIds: fmeaResult.rows.map(r => r.id),
      cpUppercaseIds: cpResult.rows.map(r => r.cpNo),
      totalFmea: fmeaResult.rowCount,
      totalCp: cpResult.rowCount,
    });
  } catch (error: any) {
    console.error('[Migrate Lowercase] 확인 오류:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    await pool.end();
  }
}

/**
 * POST: 소문자로 마이그레이션 실행
 */
export async function POST() {
  const dbUrl = getBaseDatabaseUrl();
  if (!dbUrl) {
    return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
  }
  
  const pool = new Pool({ connectionString: dbUrl });
  
  try {
    const results = {
      fmea: { updated: 0, tables: [] as string[] },
      cp: { updated: 0, tables: [] as string[] },
    };
    
    // FMEA 관련 테이블 마이그레이션
    const fmeaTables = [
      { table: 'fmea_projects', column: 'id' },
      { table: 'fmea_registrations', column: '"fmeaId"' },
      { table: 'fmea_cft_members', column: '"fmeaId"' },
      { table: 'fmea_worksheet_data', column: '"fmeaId"' },
      { table: 'fmea_legacy_data', column: '"fmeaId"' },
      { table: 'fmea_confirmed_states', column: '"fmeaId"' },
      { table: 'fmea_revision_history', column: '"fmeaId"' },
      { table: 'l1_structures', column: '"fmeaId"' },
      { table: 'l2_structures', column: '"fmeaId"' },
      { table: 'l3_structures', column: '"fmeaId"' },
      { table: 'l1_functions', column: '"fmeaId"' },
      { table: 'l2_functions', column: '"fmeaId"' },
      { table: 'l3_functions', column: '"fmeaId"' },
      { table: 'failure_effects', column: '"fmeaId"' },
      { table: 'failure_modes', column: '"fmeaId"' },
      { table: 'failure_causes', column: '"fmeaId"' },
      { table: 'failure_links', column: '"fmeaId"' },
      { table: 'risk_analyses', column: '"fmeaId"' },
      { table: 'optimizations', column: '"fmeaId"' },
    ];
    
    for (const { table, column } of fmeaTables) {
      try {
        const result = await pool.query(`
          UPDATE "${table}" SET ${column} = LOWER(${column})
          WHERE ${column} <> LOWER(${column})
        `);
        if (result.rowCount && result.rowCount > 0) {
          results.fmea.updated += result.rowCount;
          results.fmea.tables.push(`${table}: ${result.rowCount}`);
        }
      } catch (e: any) {
        console.warn(`[Migrate] ${table} 업데이트 스킵:`, e.message);
      }
    }
    
    // CP 관련 테이블 마이그레이션
    const cpTables = [
      { table: 'cp_registrations', column: '"cpNo"' },
      { table: 'cp_cft_members', column: '"cpNo"' },
      { table: 'cp_revisions', column: '"cpNo"' },
      { table: 'cp_processes', column: '"cpNo"' },
      { table: 'cp_detectors', column: '"cpNo"' },
      { table: 'cp_control_items', column: '"cpNo"' },
      { table: 'cp_control_methods', column: '"cpNo"' },
      { table: 'cp_reaction_plans', column: '"cpNo"' },
    ];
    
    for (const { table, column } of cpTables) {
      try {
        const result = await pool.query(`
          UPDATE "${table}" SET ${column} = LOWER(${column})
          WHERE ${column} <> LOWER(${column})
        `);
        if (result.rowCount && result.rowCount > 0) {
          results.cp.updated += result.rowCount;
          results.cp.tables.push(`${table}: ${result.rowCount}`);
        }
      } catch (e: any) {
        console.warn(`[Migrate] ${table} 업데이트 스킵:`, e.message);
      }
    }
    
    console.log('[Migrate Lowercase] 마이그레이션 완료:', results);
    
    return NextResponse.json({
      success: true,
      message: '소문자 마이그레이션 완료',
      results,
    });
  } catch (error: any) {
    console.error('[Migrate Lowercase] 마이그레이션 오류:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    await pool.end();
  }
}


