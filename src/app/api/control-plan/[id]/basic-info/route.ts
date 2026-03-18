/**
 * @file basic-info/route.ts
 * @description CP 기초정보 조회 API (cp_master_flat_items 테이블)
 * 
 * ★ 표준화: 기초정보 Import → 모달에 전달
 * - 이 API는 기초정보 Import에서 저장한 데이터를 조회
 * - CP 작성화면의 입력 모달에서 활용
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

// GET: CP 기초정보 조회 (Prisma ORM)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const prisma = getPrisma();
        if (!prisma) {
            return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });
        }

        const { id } = await params;
        const cpNo = id.trim();

        // Prisma ORM: cp_master_flat_items → dataset(cpNo) 관계 활용
        const flatItems = await prisma.cpMasterFlatItem.findMany({
            where: {
                dataset: { cpNo },
            },
            orderBy: [
                { processNo: 'asc' },
                { itemCode: 'asc' },
            ],
        });

        if (flatItems.length === 0) {
            return NextResponse.json({
                success: true,
                flatData: [],
                message: '저장된 기초정보가 없습니다. 기초정보 Import를 먼저 해주세요.',
            });
        }

        // 공정 목록 추출 (A1, A2)
        const processMap = new Map<string, { no: string; name: string }>();

        flatItems.forEach(item => {
            if (item.itemCode === 'A1' && item.value) {
                const processNo = item.value.trim();
                if (!processMap.has(processNo)) {
                    processMap.set(processNo, { no: processNo, name: '' });
                }
            }
            if (item.itemCode === 'A2' && item.value && item.processNo) {
                const proc = processMap.get(item.processNo);
                if (proc) {
                    proc.name = item.value.trim();
                }
            }
        });

        // flatData 형식으로 변환
        const flatData = flatItems.map(item => ({
            processNo: item.processNo || '',
            category: item.category || '',
            itemCode: item.itemCode || '',
            value: item.value || '',
        }));

        // 공정 목록
        const processes = Array.from(processMap.values())
            .sort((a, b) => {
                const numA = parseInt(a.no, 10);
                const numB = parseInt(b.no, 10);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return a.no.localeCompare(b.no, undefined, { numeric: true });
            })
            .map((p, idx) => ({
                id: `cp_proc_${idx}`,
                no: p.no,
                name: p.name || `공정 ${p.no}`,
            }));

        // 카테고리별 통계
        const categoryCounts = flatItems.reduce((acc, item) => {
            acc[item.category] = (acc[item.category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return NextResponse.json({
            success: true,
            flatData,
            processes,
            categoryCounts,
            totalCount: flatItems.length,
        });
    } catch (error: any) {
        console.error('❌ [CP Basic Info] 조회 오류:', error);

        if (error.code === '42P01') {
            return NextResponse.json({
                success: true,
                flatData: [],
                processes: [],
                message: 'cp_master_flat_items 테이블이 없습니다.',
            });
        }

        return NextResponse.json({ success: false, error: error.message || 'CP Basic Info 조회 실패' }, { status: 500 });
    }
}
