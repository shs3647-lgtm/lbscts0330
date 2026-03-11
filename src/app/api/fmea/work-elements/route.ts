/**
 * @file work-elements/route.ts
 * @description PFMEA 작업요소 조회 API
 * - GET: Master FMEA 기초정보에서 공정별 작업요소 목록 반환
 * - pfmea_master_flat_items 테이블에서 itemCode='B1' (L3-1 작업요소) 데이터 조회
 * - 공통공정(00번)은 모든 공정에 자동 포함
 * - 표시 형식: 00=공통, 나머지=공정번호 (예: "공통 작업자", "10 Cutting MC")
 * @created 2026-02-03
 * @codefreeze 2026-02-03
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const prisma = getPrisma();
    if (!prisma) {
        return NextResponse.json({ success: false, error: 'DB 연결 실패', workElements: [] });
    }

    const { searchParams } = new URL(req.url);
    const processNo = searchParams.get('processNo') || '';

    try {
        // 1. 활성화된 Master Dataset 조회
        const activeDataset = await prisma.pfmeaMasterDataset.findFirst({
            where: { isActive: true },
            orderBy: { updatedAt: 'desc' }
        });

        if (!activeDataset) {
            return NextResponse.json({
                success: true,
                workElements: [],
                source: 'none',
                message: 'Master FMEA 기초정보가 없습니다. 먼저 기초정보를 Import해주세요.'
            });
        }

        // 2. Master Dataset에서 작업요소(B1) 데이터 조회
        // ★★★ 2026-02-05 수정: 공통공정 = '0' 또는 '00' (호환성) ★★★
        // - 공정번호 0, 10, 20, 30... 형식으로 통일
        // - 공정번호 '0' 또는 '00'은 공통공정 (모든 공정에 표시)
        // - 예: 작업자, 셋업엔지니어, 보전원 등
        const COMMON_PROCESS_VALUES = ['0', '00'];  // ★ 둘 다 공통공정으로 인식
        
        const isCommonProcess = (pNo: string | null | undefined): boolean => {
            if (!pNo) return false;
            return COMMON_PROCESS_VALUES.includes(pNo.trim());
        };
        
        let whereClause: Record<string, unknown> = {
            datasetId: activeDataset.id,
            itemCode: 'B1'  // B1 = 작업요소 (L3-1 시트)
        };

        // ★★★ 2026-02-05 수정: 모달용 기초정보 로드 (공통공정 포함) ★★★
        // 모달에는 해당 공정 + 공통공정 기초정보 항상 표시
        // 워크시트 저장은 사용자가 선택한 것만 (모달 로직에서 처리)
        if (processNo && !isCommonProcess(processNo)) {
            // 해당 공정 + 공통공정(0, 00) 함께 조회
            whereClause = {
                datasetId: activeDataset.id,
                itemCode: 'B1',
                processNo: { in: [processNo, ...COMMON_PROCESS_VALUES] }
            };
        } else if (isCommonProcess(processNo)) {
            // 공통공정만 조회
            whereClause.processNo = { in: COMMON_PROCESS_VALUES };
        }
        // processNo가 없으면 전체 조회 (whereClause 그대로)

        const flatItems = await prisma.pfmeaMasterFlatItem.findMany({
            where: whereClause,
            orderBy: { processNo: 'asc' }
        });

        // 3. 작업요소 목록 생성
        const workElements = flatItems.map((item: any, idx: number) => {
            // ★★★ value가 객체일 수 있으므로 처리 ★★★
            let rawName = '';
            if (typeof item.value === 'string') {
                rawName = item.value;
            } else if (item.value && typeof item.value === 'object') {
                // JSON 객체인 경우 name 또는 value 필드 추출
                rawName = item.value.name || item.value.value || JSON.stringify(item.value);
            }

            // ★★★ 2026-02-03: 공정번호 + 작업요소명 = 하나의 문자열 ★★★
            const pNo = item.processNo || '';

            // ★★★ 2026-02-03: 중복 공정번호 방지 - 이미 공정번호로 시작하면 추가 안 함 ★★★
            let displayName = rawName;
            if (pNo && rawName) {
                // rawName이 이미 공정번호로 시작하는지 체크
                const alreadyHasProcessNo = /^\d+\s/.test(rawName);
                if (!alreadyHasProcessNo) {
                    displayName = `${pNo} ${rawName}`;
                }
            }

            // ★★★ 2026-02-07: m4 추론 제거 - 기초정보(DB) 값 그대로 사용 ★★★
            // MD, JG → MC 정규화만 수행, 빈값은 빈값 그대로 전달 (모달에서 경고)
            const rawM4 = (item.m4 || '').trim();
            const m4 = (rawM4 === 'MD' || rawM4 === 'JG') ? 'MC' : rawM4;

            return {
                id: item.id || `we_${pNo}_${idx}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                m4,
                name: displayName,
                rawName: rawName,
                processNo: pNo,
                isCommon: isCommonProcess(pNo)
            };
        }).filter((we: any) => {
            const name = (we.name || '').trim();
            const rawName = (we.rawName || '').trim();
            // ★★★ 2026-02-03: 공란 및 잘못된 데이터 필터링 강화 ★★★
            if (!name || name === '') return false;
            if (!rawName || rawName === '') return false;  // 원본 이름도 체크
            if (name.startsWith('{')) return false;
            if (name === '[object Object]') return false;
            if (/^\d+$/.test(name)) return false;  // 숫자만 있는 경우 제외
            if (/^\d+\s*$/.test(rawName)) return false;  // 원본이 숫자만
            if (rawName.length < 2) return false;  // 너무 짧은 이름 제외
            return true;
        });

        // ★★★ 2026-02-07: 4M 빈값 경고 - 기초정보에서 m4 미지정 항목 감지 ★★★
        const emptyM4Items = workElements.filter((we: any) => !we.m4);
        if (emptyM4Items.length > 0) {
        }


        return NextResponse.json({
            success: true,
            workElements,
            source: 'pfmea_master_flat_items',
            datasetId: activeDataset.id,
            datasetName: activeDataset.name,
            processNo: processNo || 'all',
            // ★ 4M 빈값 경고
            warnings: emptyM4Items.length > 0
                ? [`기초정보에 4M 분류가 없는 작업요소 ${emptyM4Items.length}개: ${emptyM4Items.map((e: any) => e.rawName).join(', ')}`]
                : [],
        });

    } catch (error: any) {
        console.error('작업요소 조회 오류:', error.message);
        return NextResponse.json({
            success: false,
            workElements: [],
            error: error.message
        });
    }
}

/**
 * DELETE: 마스터 작업요소 삭제 (id 기준)
 * Body: { ids: string[] }
 * - ids = PfmeaMasterFlatItem의 id 배열
 * - itemCode='B1' 항목만 삭제 (안전장치)
 */
export async function DELETE(req: NextRequest) {
    const prisma = getPrisma();
    if (!prisma) {
        return NextResponse.json({ success: false, error: 'DB 연결 실패' });
    }

    try {
        const body = await req.json();
        const ids: string[] = body.ids;

        if (!ids || ids.length === 0) {
            return NextResponse.json({ success: false, error: '삭제할 작업요소 ID가 없습니다.' });
        }

        // B1(작업요소) 항목만 삭제 (안전장치)
        const result = await prisma.pfmeaMasterFlatItem.deleteMany({
            where: {
                id: { in: ids },
                itemCode: 'B1',
            },
        });

        return NextResponse.json({ success: true, deletedCount: result.count });
    } catch (error: any) {
        console.error('작업요소 삭제 오류:', error.message);
        return NextResponse.json({ success: false, error: error.message });
    }
}

/**
 * PATCH: 작업요소명 수정
 * Body: { updates: [{ id: string, name: string }] }
 * - id = PfmeaMasterFlatItem의 id
 * - name = 수정할 작업요소명 (rawName, 공정번호 제외)
 */
export async function PATCH(req: NextRequest) {
    const prisma = getPrisma();
    if (!prisma) {
        return NextResponse.json({ success: false, error: 'DB 연결 실패' });
    }

    try {
        const body = await req.json();
        const updates: { id: string; name: string }[] = body.updates;

        if (!updates || updates.length === 0) {
            return NextResponse.json({ success: false, error: '수정할 데이터가 없습니다.' });
        }

        let updatedCount = 0;
        for (const upd of updates) {
            const result = await prisma.pfmeaMasterFlatItem.updateMany({
                where: { id: upd.id, itemCode: 'B1' },
                data: { value: upd.name },
            });
            updatedCount += result.count;
        }

        return NextResponse.json({ success: true, updatedCount });
    } catch (error: any) {
        console.error('작업요소명 수정 오류:', error.message);
        return NextResponse.json({ success: false, error: error.message });
    }
}
