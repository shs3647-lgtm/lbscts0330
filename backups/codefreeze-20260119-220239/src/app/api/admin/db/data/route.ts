/**
 * DB 테이블 데이터 조회 API
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
  const table = searchParams.get('table');
  const limit = parseInt(searchParams.get('limit') || '100', 10);
  
  if (!schema || !table) {
    return NextResponse.json({ 
      success: false, 
      error: 'schema와 table 파라미터가 필요합니다' 
    }, { status: 400 });
  }
  
  try {
    // 컬럼 목록 조회
    const columnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `, [schema, table]);
    
    const columns = columnsResult.rows.map(r => r.column_name);
    
    if (columns.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: '테이블을 찾을 수 없습니다' 
      }, { status: 404 });
    }
    
    // 데이터 조회
    const dataResult = await pool.query(`
      SELECT * FROM "${schema}"."${table}"
      LIMIT $1
    `, [limit]);
    
    return NextResponse.json({ 
      success: true, 
      result: {
        schema,
        table,
        columns,
        data: dataResult.rows
      }
    });
    
  } catch (error: any) {
    console.error('데이터 조회 실패:', error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  } finally {
    await pool.end();
  }
}











