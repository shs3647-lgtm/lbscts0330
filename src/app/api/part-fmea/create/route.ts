/**
 * @file Part FMEA 생성 API
 * @description POST: 새 Part FMEA 생성 + CP/PFD 자동 생성 ($transaction)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

const CreateSchema = z.object({
  customerName: z.string().min(1).max(200),
  productName: z.string().min(1).max(200),
  sourceType: z.enum(['FAMILY_REF', 'INDEPENDENT']).default('INDEPENDENT'),
  sourceFamilyMasterId: z.string().uuid().optional(),
  sourceProcessNos: z.array(z.string()).optional(),
  authorId: z.string().optional(),
  authorName: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
});

function toCode(str: string, len: number): string {
  return str.replace(/[^a-zA-Z0-9]/g, '').slice(0, len).toUpperCase().padEnd(len, 'X');
}

export async function POST(request: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = parsed.data;

    // FAMILY_REF 모드: sourceFamilyMasterId 검증
    if (input.sourceType === 'FAMILY_REF') {
      if (!input.sourceFamilyMasterId) {
        return NextResponse.json(
          { success: false, error: 'FAMILY_REF 모드에서는 sourceFamilyMasterId가 필수입니다' },
          { status: 400 }
        );
      }
      const master = await prisma.familyMaster.findUnique({
        where: { id: input.sourceFamilyMasterId },
      });
      if (!master) {
        return NextResponse.json(
          { success: false, error: 'Family Master를 찾을 수 없습니다' },
          { status: 404 }
        );
      }
    }

    // partCode 생성: PF-{customerCode}-{productCode}-{seq}
    const customerCode = toCode(input.customerName, 3);
    const productCode = toCode(input.productName, 4);
    const prefix = `PF-${customerCode}-${productCode}`;

    const existingCount = await prisma.partFmea.count({
      where: { partCode: { startsWith: prefix } },
    });
    const seq = String(existingCount + 1).padStart(3, '0');
    const partCode = `${prefix}-${seq}`;

    // fmeaId 생성: pfm-pf-{seq}
    const totalCount = await prisma.partFmea.count();
    const fmeaId = `pfm-pf-${String(totalCount + 1).padStart(3, '0')}`;

    const result = await prisma.$transaction(async (tx) => {
      const partFmea = await tx.partFmea.create({
        data: {
          partCode,
          fmeaId,
          customerName: input.customerName,
          productName: input.productName,
          sourceType: input.sourceType,
          sourceFamilyMasterId: input.sourceFamilyMasterId ?? null,
          sourceProcessNos: input.sourceProcessNos
            ? (input.sourceProcessNos as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          authorId: input.authorId ?? null,
          authorName: input.authorName ?? null,
          authorDate: new Date(),
          description: input.description ?? null,
        },
      });

      const controlPlan = await tx.partControlPlan.create({
        data: {
          partFmeaId: partFmea.id,
          cpCode: `CP-PF-${partCode}`,
          cpName: `${input.productName} Control Plan`,
        },
      });

      const processFlow = await tx.partPfd.create({
        data: {
          partFmeaId: partFmea.id,
          pfdCode: `PFD-PF-${partCode}`,
          pfdName: `${input.productName} Process Flow`,
        },
      });

      return { ...partFmea, controlPlan, processFlow };
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: unknown) {
    console.error('[part-fmea/create] Error:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
