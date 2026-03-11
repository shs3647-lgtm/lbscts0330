/**
 * @file route.ts
 * @description 레거시 데이터 저장 API - Master/Family FMEA 샘플 데이터 저장
 * @version 1.0.0
 * @created 2026-01-10
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const runtime = 'nodejs';

// DB 연결
function getPool() {
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

/**
 * POST: 레거시 데이터 저장
 */
export async function POST(req: NextRequest) {
  const pool = getPool();
  
  try {
    const body = await req.json();
    // ✅ FMEA ID는 항상 대문자로 정규화 (DB 일관성 보장)
    const fmeaId = body.fmeaId?.toUpperCase();
    const { schemaName, legacyData } = body;
    
    if (!fmeaId || !legacyData) {
      return NextResponse.json({ 
        success: false, 
        error: 'fmeaId and legacyData are required' 
      }, { status: 400 });
    }
    
    // 스키마 이름 생성 (없으면 자동 생성)
    const targetSchema = schemaName || `pfmea_${fmeaId.replace(/-/g, '_').toLowerCase()}`;
    
    console.log(`[레거시 저장] FMEA: ${fmeaId}, 스키마: ${targetSchema}`);
    
    // 1. 스키마 생성
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${targetSchema}"`);
    
    // 2. FmeaLegacyData 테이블 생성
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${targetSchema}"."FmeaLegacyData" (
        id TEXT PRIMARY KEY,
        "fmeaId" TEXT NOT NULL,
        "legacyData" JSONB,
        "legacyVersion" TEXT DEFAULT '2.0',
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // 3. 레거시 데이터 저장
    const fullLegacyData = {
      fmeaId,
      ...legacyData,
      structureConfirmed: true,
      l1Confirmed: true,
      l2Confirmed: true,
      l3Confirmed: true,
      failureL1Confirmed: false,
      failureL2Confirmed: false,
      failureL3Confirmed: false,
      failureLinkConfirmed: false,
      _imported: true,
      _importedAt: new Date().toISOString(),
    };
    
    await pool.query(`
      INSERT INTO "${targetSchema}"."FmeaLegacyData" 
      (id, "fmeaId", "legacyData", "legacyVersion")
      VALUES ($1, $2, $3, '2.0')
      ON CONFLICT (id) DO UPDATE SET
        "legacyData" = $3,
        "updatedAt" = NOW()
    `, [`legacy-${fmeaId}`, fmeaId, JSON.stringify(fullLegacyData)]);
    
    // 4. L2Structure 테이블에도 저장 (원자성 테이블)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${targetSchema}"."L2Structure" (
        id TEXT PRIMARY KEY,
        "fmeaId" TEXT NOT NULL,
        "processNo" TEXT,
        "processName" TEXT,
        "order" INTEGER DEFAULT 10,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // L2 데이터 삽입
    for (const proc of legacyData.l2 || []) {
      await pool.query(`
        INSERT INTO "${targetSchema}"."L2Structure" 
        (id, "fmeaId", "processNo", "processName", "order")
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          "processNo" = $3,
          "processName" = $4,
          "order" = $5,
          "updatedAt" = NOW()
      `, [proc.id, fmeaId, proc.no, proc.name, proc.order || 10]);
    }
    
    // 5. 통계 계산
    const stats = {
      processes: legacyData.l2?.length || 0,
      workElements: (legacyData.l2 || []).reduce((sum: number, p: any) => 
        sum + (p.l3?.length || 0), 0),
      functions: (legacyData.l2 || []).reduce((sum: number, p: any) => 
        sum + (p.functions?.length || 0) + 
        (p.l3 || []).reduce((s2: number, w: any) => s2 + (w.functions?.length || 0), 0), 0),
      failureModes: (legacyData.l2 || []).reduce((sum: number, p: any) => 
        sum + (p.failureModes?.length || 0), 0),
    };
    
    console.log(`[레거시 저장] ✅ 완료:`, stats);
    
    return NextResponse.json({
      success: true,
      fmeaId,
      schemaName: targetSchema,
      stats,
      message: `${fmeaId}에 ${stats.processes}개 공정 데이터가 저장되었습니다.`,
    });
    
  } catch (error: any) {
    console.error('❌ 레거시 저장 오류:', error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  } finally {
    await pool.end();
  }
}

/**
 * GET: 레거시 데이터 조회
 */
export async function GET(req: NextRequest) {
  const pool = getPool();
  
  try {
    const { searchParams } = new URL(req.url);
    // ✅ FMEA ID는 항상 대문자로 정규화 (DB 일관성 보장)
    const fmeaId = searchParams.get('fmeaId')?.toUpperCase();
    
    if (!fmeaId) {
      return NextResponse.json({ 
        success: false, 
        error: 'fmeaId is required' 
      }, { status: 400 });
    }
    
    const targetSchema = `pfmea_${fmeaId.replace(/-/g, '_').toLowerCase()}`;
    
    // 레거시 데이터 조회
    const result = await pool.query(`
      SELECT "legacyData" FROM "${targetSchema}"."FmeaLegacyData" 
      WHERE "fmeaId" = $1
      LIMIT 1
    `, [fmeaId]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No data found' 
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      fmeaId,
      legacyData: result.rows[0].legacyData,
    });
    
  } catch (error: any) {
    console.error('❌ 레거시 조회 오류:', error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  } finally {
    await pool.end();
  }
}


