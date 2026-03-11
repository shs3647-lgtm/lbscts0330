/**
 * DB 테이블 목록 조회 API
 */
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const runtime = 'nodejs';

function getPool() {
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

export async function GET(request: NextRequest) {
  const pool = getPool();
  const searchParams = request.nextUrl.searchParams;
  const schema = searchParams.get('schema');
  
  if (!schema) {
    return NextResponse.json({ 
      success: false, 
      error: 'schema 파라미터가 필요합니다' 
    }, { status: 400 });
  }
  
  try {
    // 테이블 목록 조회
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = $1
      ORDER BY table_name
    `, [schema]);
    
    // 각 테이블의 행 수 조회
    const tables = await Promise.all(
      tablesResult.rows.map(async (row) => {
        try {
          const countResult = await pool.query(`
            SELECT COUNT(*) as count 
            FROM "${schema}"."${row.table_name}"
          `);
          const count = parseInt(countResult.rows[0].count, 10);
          // 리스크분석 테이블의 경우 디버깅 로그 추가
          if (row.table_name === 'risk_analyses') {
            console.log(`[DB 뷰어] ${schema}.risk_analyses 행 수:`, count);
          }
          return {
            schema,
            table: row.table_name,
            rows: count
          };
        } catch (error: any) {
          // 에러 발생 시 로그 출력 (리스크분석 테이블의 경우)
          if (row.table_name === 'risk_analyses') {
            console.error(`[DB 뷰어] ${schema}.risk_analyses 행 수 조회 실패:`, error.message);
          }
          return {
            schema,
            table: row.table_name,
            rows: 0
          };
        }
      })
    );
    
    return NextResponse.json({ 
      success: true, 
      tables 
    });
    
  } catch (error: any) {
    console.error('테이블 목록 조회 실패:', error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  } finally {
    await pool.end();
  }
}





