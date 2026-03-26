/**
 * @file POST /api/sod/recommend-correction
 * @description SOD 재평가 API — public SOD DB 기반 O/D 추천
 *
 * ★ 설계 원칙:
 *   - 데이터 소스: public.kr_industry_prevention (O), public.kr_industry_detection (D)
 *   - 매칭 방식: PC/DC 텍스트 ↔ 산업DB method 부분일치
 *   - 매칭 실패 → "누락" (추론/자동생성 절대 금지)
 *   - O=1 추천 금지 (O=1 = 원천 제거 = 엔지니어만 판단)
 *   - D=1 추천 금지 (D=1 = 고장원인 설계 제거 = 엔지니어만 판단)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBaseDatabaseUrl, getPrisma, getPrismaForSchema } from '@/lib/prisma';
import { getProjectSchemaName, ensureProjectSchemaReady } from '@/lib/project-schema';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';

interface Recommendation {
  uniqueKey: string;       // fmId-fcId
  linkId: string;
  currentValue: number;    // 현재 O 또는 D
  recommendedValue: number;
  source: 'INDUSTRY';
  sourceId: string;        // kr_industry_*.id UUID
  sourceMethod: string;    // 매칭된 산업DB method 텍스트
  controlText: string;     // 현재 PC/DC 텍스트
  processNo: string;
}

/** 텍스트 정규화: 접두사 제거, 공백 정리 */
function normalizeText(text: string): string {
  return text
    .replace(/^\[표준\]\s*/g, '')
    .replace(/^\[LLD\]\s*/g, '')
    .replace(/^P:\s*/g, '')
    .replace(/^D:\s*/g, '')
    .replace(/^\[추천\]\s*/g, '')
    .trim();
}

/** 산업DB method와 PC/DC 텍스트 매칭 (부분일치) */
function matchIndustryMethod(
  controlText: string,
  methods: Array<{ id: string; method: string; defaultRating: number | null }>,
): { id: string; method: string; rating: number } | null {
  const normalized = normalizeText(controlText).toLowerCase();
  if (!normalized) return null;

  // 멀티라인 → 각 줄별 매칭
  const lines = normalized.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    // 1순위: 정확 일치
    for (const m of methods) {
      const mNorm = m.method.toLowerCase();
      if (line === mNorm && m.defaultRating && m.defaultRating >= 2) {
        return { id: m.id, method: m.method, rating: m.defaultRating };
      }
    }
    // 2순위: 부분 포함 (산업DB가 PC/DC에 포함되거나, PC/DC가 산업DB에 포함)
    for (const m of methods) {
      const mNorm = m.method.toLowerCase();
      if ((line.includes(mNorm) || mNorm.includes(line)) && m.defaultRating && m.defaultRating >= 2) {
        return { id: m.id, method: m.method, rating: m.defaultRating };
      }
    }
    // 3순위: 핵심 키워드 매칭 (3글자 이상 연속 일치, 2개 이상)
    for (const m of methods) {
      const mNorm = m.method.toLowerCase();
      const mWords = mNorm.split(/[\s/+()（）,，]+/).filter(w => w.length >= 3);
      const matched = mWords.filter(w => line.includes(w));
      if (matched.length >= 2 && m.defaultRating && m.defaultRating >= 2) {
        return { id: m.id, method: m.method, rating: m.defaultRating };
      }
    }
    // 4순위: 약어 매칭 (IQC, COC, SPC 등 대문자 2~5글자가 양쪽에 동시 존재)
    for (const m of methods) {
      const abbrs = m.method.match(/[A-Z][A-Za-z]{1,4}/g) || [];
      if (abbrs.length > 0 && m.defaultRating && m.defaultRating >= 2) {
        const matchedAbbr = abbrs.filter(a => line.includes(a.toLowerCase()));
        if (matchedAbbr.length >= 1) {
          return { id: m.id, method: m.method, rating: m.defaultRating };
        }
      }
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fmeaId, type = 'both' } = body as { fmeaId: string; type?: 'O' | 'D' | 'both' };

    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'Invalid fmeaId' }, { status: 400 });
    }

    const publicPrisma = getPrisma();
    if (!publicPrisma) {
      return NextResponse.json({ success: false, error: 'DB not available' }, { status: 500 });
    }

    // 프로젝트 스키마 클라이언트
    const baseUrl = getBaseDatabaseUrl();
    const schema = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Project schema not available' }, { status: 500 });
    }
    if (!/^[a-z][a-z0-9_]*$/.test(schema)) throw new Error(`Invalid schema: ${schema}`);
    await prisma.$executeRawUnsafe(`SET search_path TO ${schema}, public`);

    // 1. 산업DB 로드 (public)
    const [industryPrevention, industryDetection] = await Promise.all([
      (type === 'D') ? Promise.resolve([]) :
        publicPrisma.krIndustryPrevention.findMany({
          select: { id: true, method: true, defaultRating: true },
          where: { isActive: true },
        }),
      (type === 'O') ? Promise.resolve([]) :
        publicPrisma.krIndustryDetection.findMany({
          select: { id: true, method: true, defaultRating: true },
          where: { isActive: true },
        }),
    ]);

    // 2. 프로젝트 RiskAnalysis + FailureLink 로드
    const riskAnalyses = await prisma.riskAnalysis.findMany({
      where: { fmeaId },
      select: {
        id: true,
        linkId: true,
        severity: true,
        occurrence: true,
        detection: true,
        preventionControl: true,
        detectionControl: true,
        failureLink: {
          select: {
            id: true,
            fmId: true,
            fcId: true,
            failureMode: {
              select: {
                l2StructId: true,
                l2Structure: { select: { no: true } },
              },
            },
          },
        },
      },
    });

    const oRecommendations: Recommendation[] = [];
    const dRecommendations: Recommendation[] = [];
    let oMatched = 0, oUnmatched = 0, dMatched = 0, dUnmatched = 0;

    for (const ra of riskAnalyses) {
      const fl = ra.failureLink;
      if (!fl?.fmId || !fl?.fcId) continue;
      const uk = `${fl.fmId}-${fl.fcId}`;
      const processNo = fl.failureMode?.l2Structure?.no || '';

      // O 추천: PC 텍스트 → 산업DB 매칭
      if (type === 'O' || type === 'both') {
        const pcText = (ra.preventionControl || '').trim();
        const currentO = ra.occurrence || 0;

        if (pcText) {
          const match = matchIndustryMethod(pcText, industryPrevention);
          if (match && match.rating >= 2) {
            // ★ 매칭 성공 → 항상 추천 (기존값 무관하게 강제 덮어쓰기)
            oRecommendations.push({
              uniqueKey: uk,
              linkId: ra.linkId,
              currentValue: currentO,
              recommendedValue: match.rating,
              source: 'INDUSTRY',
              sourceId: match.id,
              sourceMethod: match.method,
              controlText: pcText.substring(0, 80),
              processNo,
            });
            oMatched++;
          } else {
            oUnmatched++;
          }
        } else {
          oUnmatched++;
        }
      }

      // D 추천: DC 텍스트 → 산업DB 매칭
      if (type === 'D' || type === 'both') {
        const dcText = (ra.detectionControl || '').trim();
        const currentD = ra.detection || 0;

        if (dcText) {
          const match = matchIndustryMethod(dcText, industryDetection);
          if (match && match.rating >= 2) {
            // ★ 매칭 성공 → 항상 추천 (기존값 무관하게 강제 덮어쓰기)
            dRecommendations.push({
              uniqueKey: uk,
              linkId: ra.linkId,
              currentValue: currentD,
              recommendedValue: match.rating,
              source: 'INDUSTRY',
              sourceId: match.id,
              sourceMethod: match.method,
              controlText: dcText.substring(0, 80),
              processNo,
            });
            dMatched++;
          } else {
            dUnmatched++;
          }
        } else {
          dUnmatched++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      oRecommendations,
      dRecommendations,
      stats: {
        total: riskAnalyses.length,
        o: { matched: oMatched, unmatched: oUnmatched, corrections: oRecommendations.length },
        d: { matched: dMatched, unmatched: dUnmatched, corrections: dRecommendations.length },
        industryPrevention: industryPrevention.length,
        industryDetection: industryDetection.length,
      },
    });
  } catch (error) {
    console.error('[SOD recommend-correction] 오류:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}
