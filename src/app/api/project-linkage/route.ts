/**
 * @file route.ts
 * @description 프로젝트 연동 관리 API (중앙집중식)
 * APQP → PFMEA → PFD → CP 연동 관계를 한 곳에서 관리
 * @version 1.0.0
 * @created 2026-01-27
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * GET: 연동 정보 조회
 * - ?apqpNo=xxx: APQP 기준 조회
 * - ?pfmeaId=xxx: PFMEA 기준 조회
 * - ?pfdNo=xxx: PFD 기준 조회
 * - ?cpNo=xxx: CP 기준 조회
 * - (파라미터 없으면 전체 목록)
 */
export async function GET(request: NextRequest) {
    const prisma = getPrisma();
    if (!prisma) {
        return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const apqpNo = searchParams.get('apqpNo')?.toLowerCase();
        const pfmeaId = searchParams.get('pfmeaId')?.toLowerCase();
        const pfdNo = searchParams.get('pfdNo')?.toLowerCase();
        const cpNo = searchParams.get('cpNo')?.toLowerCase();

        const whereClause: any = { status: 'active' };
        if (apqpNo) whereClause.apqpNo = apqpNo;
        if (pfmeaId) whereClause.pfmeaId = pfmeaId;
        if (pfdNo) whereClause.pfdNo = pfdNo;
        if (cpNo) whereClause.cpNo = cpNo;

        const linkages = await prisma.projectLinkage.findMany({
            where: whereClause,
            orderBy: { updatedAt: 'desc' },
        });

        return NextResponse.json({
            success: true,
            count: linkages.length,
            data: linkages,
        });
    } catch (error: any) {
        console.error('[ProjectLinkage API] 조회 오류:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * POST: 연동 관계 생성/수정 (Upsert)
 * Body: { apqpNo?, pfmeaId?, pfdNo?, cpNo?, 기초정보들... }
 */
export async function POST(request: NextRequest) {
    const prisma = getPrisma();
    if (!prisma) {
        return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    try {
        const body = await request.json();
        const {
            apqpNo, pfmeaId, pfdNo, cpNo,
            // 기초정보
            companyName, engineeringLocation, customerName, modelYear, subject,
            projectName, startDate, revisionDate, processResponsibility,
            confidentialityLevel, responsibleName, createdBy, partNo  // ★ partNo 추가
        } = body;

        // 최소 하나는 있어야 함
        if (!apqpNo && !pfmeaId && !pfdNo && !cpNo) {
            return NextResponse.json(
                { success: false, error: 'At least one of apqpNo, pfmeaId, pfdNo, cpNo is required' },
                { status: 400 }
            );
        }

        // 소문자 정규화
        const data: any = {
            apqpNo: apqpNo?.toLowerCase() || null,
            pfmeaId: pfmeaId?.toLowerCase() || null,
            pfdNo: pfdNo?.toLowerCase() || null,
            cpNo: cpNo?.toLowerCase() || null,
            // 기초정보
            companyName: companyName || null,
            engineeringLocation: engineeringLocation || null,
            customerName: customerName || null,
            modelYear: modelYear || null,
            subject: subject || null,
            projectName: projectName || null,
            startDate: startDate || null,
            revisionDate: revisionDate || null,
            processResponsibility: processResponsibility || null,
            confidentialityLevel: confidentialityLevel || null,
            responsibleName: responsibleName || null,
            partNo: partNo || null,  // ★ partNo 추가
            createdBy: createdBy || null,
            status: 'active',
            linkType: 'auto',
        };

        // 기존 연동 찾기 (APQP 기준 우선, 없으면 PFMEA 기준)
        const existing = await prisma.projectLinkage.findFirst({
            where: {
                OR: [
                    // APQP 기준 매칭 (최우선)
                    ...(data.apqpNo ? [{ apqpNo: data.apqpNo, status: 'active' }] : []),
                    // PFMEA 기준 매칭
                    ...(data.pfmeaId ? [{ pfmeaId: data.pfmeaId, status: 'active' }] : []),
                ],
            },
        });

        let savedLinkage;
        if (existing) {
            // 기존 연동 업데이트 (null이 아닌 값만 업데이트)
            const updateData: any = {};
            Object.keys(data).forEach(key => {
                if (data[key] !== null && key !== 'status' && key !== 'linkType') {
                    updateData[key] = data[key];
                }
            });

            savedLinkage = await prisma.projectLinkage.update({
                where: { id: existing.id },
                data: updateData,
            });
        } else {
            // 새 연동 생성
            savedLinkage = await prisma.projectLinkage.create({ data });
        }

        return NextResponse.json({
            success: true,
            message: existing ? 'Linkage updated' : 'Linkage created',
            data: savedLinkage,
        });
    } catch (error: any) {
        console.error('[ProjectLinkage API] 저장 오류:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * DELETE: 연동 관계 삭제 (soft delete)
 */
export async function DELETE(request: NextRequest) {
    const prisma = getPrisma();
    if (!prisma) {
        return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
        }

        const deleted = await prisma.projectLinkage.update({
            where: { id },
            data: { status: 'deleted' },
        });

        return NextResponse.json({
            success: true,
            message: 'Linkage deleted',
            data: deleted,
        });
    } catch (error: any) {
        console.error('[ProjectLinkage API] 삭제 오류:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
