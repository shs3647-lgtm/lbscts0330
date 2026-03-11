/**
 * DB 테이블 데이터 조회 API
 */
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { isValidIdentifier, safeErrorMessage } from '@/lib/security';

export const runtime = 'nodejs';

function getPool() {
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

export async function GET(request: NextRequest) {
  const pool = getPool();
  const searchParams = request.nextUrl.searchParams;
  const schema = searchParams.get('schema');
  const table = searchParams.get('table');
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '100', 10) || 100, 1), 1000);

  if (!schema || !table) {
    return NextResponse.json({
      success: false,
      error: 'schema와 table 파라미터가 필요합니다'
    }, { status: 400 });
  }

  // SQL Injection 방지: 스키마/테이블명 검증
  if (!isValidIdentifier(schema) || !isValidIdentifier(table)) {
    return NextResponse.json({
      success: false,
      error: '유효하지 않은 스키마 또는 테이블 이름입니다'
    }, { status: 400 });
  }

  try {
    // 컬럼 목록 조회 (information_schema로 존재 확인)
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

    // 데이터 조회 (검증된 식별자 사용)
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

  } catch (error: unknown) {
    console.error('데이터 조회 실패:', error instanceof Error ? error.message : error);
    return NextResponse.json({
      success: false,
      error: safeErrorMessage(error)
    }, { status: 500 });
  } finally {
    await pool.end();
  }
}











