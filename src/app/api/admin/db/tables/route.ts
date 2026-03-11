/**
 * DB 테이블 목록 조회 API
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

  if (!schema) {
    return NextResponse.json({
      success: false,
      error: 'schema 파라미터가 필요합니다'
    }, { status: 400 });
  }

  // SQL Injection 방지: 스키마명 검증
  if (!isValidIdentifier(schema)) {
    return NextResponse.json({
      success: false,
      error: '유효하지 않은 스키마 이름입니다'
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

    // 각 테이블의 행 수 조회 (table_name은 DB에서 반환된 값이므로 안전)
    const tables = await Promise.all(
      tablesResult.rows.map(async (row) => {
        try {
          const countResult = await pool.query(`
            SELECT COUNT(*) as count
            FROM "${schema}"."${row.table_name}"
          `);
          const count = parseInt(countResult.rows[0].count, 10);
          return {
            schema,
            table: row.table_name,
            rows: count
          };
        } catch {
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

  } catch (error: unknown) {
    console.error('테이블 목록 조회 실패:', error instanceof Error ? error.message : error);
    return NextResponse.json({
      success: false,
      error: safeErrorMessage(error)
    }, { status: 500 });
  } finally {
    await pool.end();
  }
}





