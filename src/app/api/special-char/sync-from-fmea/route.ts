/**
 * @file /api/special-char/sync-from-fmea/route.ts
 * @description FMEA Atomic DB → LBS SpecialCharMasterItem 100% 동기화
 *
 * POST { fmeaId } → project schema에서 특별특성 추출 → base DB에 upsert
 * fire-and-forget으로 FMEA 저장 후 자동 호출됨
 */
import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { getPrisma, getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';

export const runtime = 'nodejs';

interface SCItem {
  customer: string;
  internalSymbol: string;
  customerSymbol: string;
  meaning: string;
  color: string;
  partName: string;
  processName: string;
  productChar: string;
  processChar: string;
  failureMode: string;
  sourceFmeaId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fmeaId = body.fmeaId;
    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'fmeaId 필요' }, { status: 400 });
    }

    const basePrisma = getPrisma();
    if (!basePrisma) {
      return NextResponse.json({ success: false, error: 'Base DB 연결 실패' }, { status: 500 });
    }

    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) {
      return NextResponse.json({ success: false, error: 'DB URL 미설정' }, { status: 500 });
    }

    const schema = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const projectPrisma = getPrismaForSchema(schema);
    if (!projectPrisma) {
      return NextResponse.json({ success: false, error: 'Project DB 연결 실패' }, { status: 500 });
    }

    // 1. L1 정보 (완제품명)
    const l1 = await projectPrisma.l1Structure.findFirst({
      where: { fmeaId },
      select: { name: true },
    });
    const partName = l1?.name || '';

    // 2. L2 제품특성 (A4) — ProcessProductChar with specialChar
    const l2Structs = await projectPrisma.l2Structure.findMany({
      where: { fmeaId },
      select: {
        id: true,
        no: true,
        name: true,
        l2Functions: {
          select: {
            specialChar: true,
          },
        },
        processProductChars: {
          select: { name: true, specialChar: true },
        },
      },
    });

    // 3. L3 공정특성 (B3) — via L3Function.specialChar + processChar
    const l3Functions = await projectPrisma.l3Function.findMany({
      where: { fmeaId, specialChar: { not: null } },
      select: {
        processChar: true,
        specialChar: true,
        l2StructId: true,
      },
    });

    // L2 ID → processName 맵
    const l2IdByStructId = new Map<string, { no: string; name: string }>();
    for (const l2 of l2Structs) {
      l2IdByStructId.set(l2.id, { no: l2.no || '', name: l2.name || '' });
    }

    // 특별특성 항목 수집
    const scItems: SCItem[] = [];
    const seen = new Set<string>();

    // A4 제품특성 추출 (ProcessProductChar.specialChar)
    for (const l2 of l2Structs) {
      const processName = l2.no ? `${l2.no}. ${l2.name}` : (l2.name || '');
      for (const pc of l2.processProductChars) {
        const charName = pc.name?.trim();
        const symbol = pc.specialChar?.trim();
        if (!charName || !symbol || symbol === '-') continue;

        const key = `product|${charName}`;
        if (seen.has(key)) continue;
        seen.add(key);

        scItems.push({
          customer: 'LBS',
          internalSymbol: symbol === '★' ? 'CC' : symbol === '◇' ? 'SC' : symbol,
          customerSymbol: symbol,
          meaning: `제품특성 ${symbol}`,
          color: symbol === '★' ? '#e65100' : '#00838f',
          partName,
          processName,
          productChar: charName,
          processChar: '',
          failureMode: '',
          sourceFmeaId: fmeaId,
        });
      }
    }

    // B3 공정특성 추출 (L3Function.processChar + specialChar)
    for (const func of l3Functions) {
      const charName = func.processChar?.trim();
      const symbol = func.specialChar?.trim();
      if (!charName || !symbol || symbol === '-') continue;

      const l2Info = l2IdByStructId.get(func.l2StructId || '');
      const processName = l2Info ? `${l2Info.no}. ${l2Info.name}` : '';

      const key = `process|${charName}`;
      if (seen.has(key)) continue;
      seen.add(key);

      scItems.push({
        customer: 'LBS',
        internalSymbol: symbol === '◇' ? 'SC' : symbol === '★' ? 'CC' : symbol,
        customerSymbol: symbol,
        meaning: `공정특성 ${symbol}`,
        color: symbol === '◇' ? '#00838f' : '#e65100',
        partName,
        processName,
        productChar: '',
        processChar: charName,
        failureMode: '',
        sourceFmeaId: fmeaId,
      });
    }

    if (scItems.length === 0) {
      return NextResponse.json({ success: true, synced: 0, message: '특별특성 없음' });
    }

    // 4. Base DB의 SpecialCharMasterItem에 upsert
    let created = 0, updated = 0;

    for (const item of scItems) {
      const matchField = item.productChar ? 'productChar' : 'processChar';
      const matchValue = item.productChar || item.processChar;

      const existing = await basePrisma.specialCharMasterItem.findFirst({
        where: {
          [matchField]: matchValue,
          sourceFmeaId: fmeaId,
        },
      });

      if (existing) {
        await basePrisma.specialCharMasterItem.update({
          where: { id: existing.id },
          data: {
            customerSymbol: item.customerSymbol,
            internalSymbol: item.internalSymbol,
            meaning: item.meaning,
            color: item.color,
            partName: item.partName,
            processName: item.processName,
            lastUsedAt: new Date(),
          },
        });
        updated++;
      } else {
        await basePrisma.specialCharMasterItem.create({
          data: {
            ...item,
            linkDFMEA: false,
            linkPFMEA: true,
            linkCP: true,
            linkPFD: false,
            usageCount: 1,
            lastUsedAt: new Date(),
          },
        });
        created++;
      }
    }

    return NextResponse.json({
      success: true,
      synced: scItems.length,
      created,
      updated,
      items: scItems.map(i => ({
        type: i.productChar ? '제품특성' : '공정특성',
        name: i.productChar || i.processChar,
        symbol: i.customerSymbol,
      })),
    });
  } catch (error) {
    console.error('[special-char/sync-from-fmea] error:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}
