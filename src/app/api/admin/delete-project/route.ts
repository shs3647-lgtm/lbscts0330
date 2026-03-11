/**
 * @file route.ts
 * @description FMEA 프로젝트 완전 삭제 API (관리자용)
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getBaseDatabaseUrl } from '@/lib/prisma';
import { isValidFmeaId, isValidIdentifier, safeErrorMessage } from '@/lib/security';

export const runtime = 'nodejs';

export async function DELETE(request: NextRequest) {
  const dbUrl = getBaseDatabaseUrl();

  if (!dbUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 });
  }

  const pool = new Pool({ connectionString: dbUrl });

  try {
    const { searchParams } = new URL(request.url);
    const fmeaId = searchParams.get('fmeaId');

    if (!fmeaId) {
      return NextResponse.json({ error: 'fmeaId required' }, { status: 400 });
    }

    // SQL Injection 방지
    if (!isValidFmeaId(fmeaId)) {
      return NextResponse.json({ error: 'Invalid fmeaId format' }, { status: 400 });
    }


    const results: Record<string, unknown> = {};

    // 트랜잭션으로 원자성 보장
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. CFT Members 삭제
      const cft = await client.query(`
        DELETE FROM "fmea_cft_members"
        WHERE LOWER("fmeaId") = LOWER($1)
      `, [fmeaId]);
      results.cftMembers = cft.rowCount;

      // 2. Worksheet Data 삭제
      const ws = await client.query(`
        DELETE FROM "fmea_worksheet_data"
        WHERE LOWER("fmeaId") = LOWER($1)
      `, [fmeaId]);
      results.worksheetData = ws.rowCount;

      // 3. Registration 삭제
      const reg = await client.query(`
        DELETE FROM "fmea_registrations"
        WHERE LOWER("fmeaId") = LOWER($1)
      `, [fmeaId]);
      results.registration = reg.rowCount;

      // 4. Project 삭제
      const proj = await client.query(`
        DELETE FROM "fmea_projects"
        WHERE LOWER("fmeaId") = LOWER($1)
      `, [fmeaId]);
      results.project = proj.rowCount;

      // 5. 프로젝트별 스키마 삭제
      const schemaName = `pfmea_${fmeaId.replace(/-/g, '_').toLowerCase()}`;
      if (isValidIdentifier(schemaName)) {
        try {
          await client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
          results.schema = { deleted: schemaName };
        } catch (e: unknown) {
          results.schema = { error: e instanceof Error ? e.message : 'unknown' };
        }
      }

      await client.query('COMMIT');
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }


    return NextResponse.json({
      success: true,
      fmeaId,
      results,
      message: `${fmeaId} 완전 삭제 완료`
    });

  } catch (error: unknown) {
    console.error('삭제 오류:', error);
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 500 });
  } finally {
    await pool.end();
  }
}
