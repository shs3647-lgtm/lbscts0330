/**
 * @file route.ts
 * @description FMEA 완전 초기화 API (관리자용)
 * - 모든 pfmea_ 스키마 삭제
 * - 테스트/개발 환경용
 */

import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export const runtime = 'nodejs';

function getPool() {
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

// POST: 모든 FMEA 스키마 삭제
export async function POST() {
  const pool = getPool();
  
  try {
    
    // 1. 모든 pfmea_ 스키마 조회
    const schemasResult = await pool.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name LIKE 'pfmea_%'
      ORDER BY schema_name
    `);
    
    const schemas = schemasResult.rows.map(r => r.schema_name);
    
    // 2. 각 스키마 삭제
    const deleted: string[] = [];
    for (const schema of schemas) {
      await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      deleted.push(schema);
    }
    
    // 3. 확인
    const checkResult = await pool.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name LIKE 'pfmea_%'
    `);
    
    const remaining = checkResult.rows.length;
    
    
    return NextResponse.json({
      success: true,
      message: 'FMEA 완전 초기화 완료',
      deleted: deleted,
      deletedCount: deleted.length,
      remaining: remaining
    });
    
  } catch (error: any) {
    console.error('❌ 초기화 실패:', error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  } finally {
    await pool.end();
  }
}

// GET: 현재 FMEA 스키마 목록 조회
export async function GET() {
  const pool = getPool();
  
  try {
    const result = await pool.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name LIKE 'pfmea_%'
      ORDER BY schema_name
    `);
    
    return NextResponse.json({
      success: true,
      schemas: result.rows.map(r => r.schema_name),
      count: result.rows.length
    });
    
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  } finally {
    await pool.end();
  }
}


