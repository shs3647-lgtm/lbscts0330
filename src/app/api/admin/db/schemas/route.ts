/**
 * DB 스키마 목록 조회 API
 */
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const runtime = 'nodejs';

function getPool() {
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

export async function GET() {
  const pool = getPool();
  
  try {
    const result = await pool.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name
    `);
    
    const schemas = result.rows.map(r => r.schema_name);
    
    return NextResponse.json({ 
      success: true, 
      schemas 
    });
    
  } catch (error: any) {
    console.error('스키마 목록 조회 실패:', error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  } finally {
    await pool.end();
  }
}











