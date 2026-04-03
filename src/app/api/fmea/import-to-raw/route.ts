/**
 * @status CODEFREEZE L4 (Pipeline Protection) u{1F512}
 * @freeze_level L4 (Critical - DFMEA Pre-Development Snapshot)
 * @frozen_date 2026-03-30
 * @snapshot_tag codefreeze-v5.0-pre-dfmea-20260330
 * @allowed_changes NONE ???ъ슜??紐낆떆???뱀씤 + full test pass ?꾩닔
 * @manifest CODEFREEZE_PIPELINE_MANIFEST.md
 */
/**
 * @file import-to-raw/route.ts
 * @description JSON 형태의 PositionBasedJSON (5시트 데이터)를 받아 파싱 + 품질 체크만 (DB 저장 없음)
 *
 * POST /api/fmea/import-to-raw
 * Body: { fmeaId: string, json: PositionBasedJSON }
 * Returns: { success, fmeaId, stats, quality: RawQualityResult }
 *
 * @version 1.0.0
 * @created 2026-03-23
 */

import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { parsePositionBasedJSON } from '@/lib/fmea/position-parser';
import { validateFKChain } from '@/lib/fmea-core/fk-chain-validator';
import { checkRawQuality } from '@/lib/fmea-core/raw-quality-checker';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fmeaId, json, save: doSave, force } = body as {
      fmeaId: string; json: unknown; save?: boolean; force?: boolean;
    };

    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'Invalid fmeaId' }, { status: 400 });
    }
    if (!json || typeof json !== 'object') {
      return NextResponse.json({ success: false, error: 'json parameter required (PositionBasedJSON)' }, { status: 400 });
    }

    const normalizedId = fmeaId.toLowerCase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const atomicData = parsePositionBasedJSON(json as any);
    const report = validateFKChain(atomicData);
    const qualityResult = checkRawQuality(atomicData, report);
    // ★ save=true 이면 save-position-import API 경유로 DB 저장
    if (doSave) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const saveRes = await fetch(`${baseUrl}/api/fmea/save-position-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fmeaId: normalizedId, atomicData, force: force ?? true }),
      });
      const saveResult = await saveRes.json();
      if (!saveResult.success) {
        return NextResponse.json({
          success: false, fmeaId: normalizedId, error: saveResult.error,
          stats: atomicData.stats, quality: qualityResult,
        }, { status: 500 });
      }
      return NextResponse.json({
        success: true, fmeaId: normalizedId,
        stats: atomicData.stats, quality: qualityResult,
        saved: true, counts: saveResult.atomicCounts,
      });
    }

    return NextResponse.json({
      success: true, fmeaId: normalizedId,
      stats: atomicData.stats, quality: qualityResult,
    });

  } catch (err) {
    console.error('[import-to-raw] Error:', err);
    return NextResponse.json({ success: false, error: safeErrorMessage(err) }, { status: 500 });
  }
}
