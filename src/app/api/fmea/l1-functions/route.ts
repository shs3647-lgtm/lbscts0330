/**
 * @file l1-functions/route.ts
 * @description PFMEA 완제품기능(C2) 및 요구사항(C3) 조회/저장/삭제 API
 * - GET: Master FMEA 기초정보에서 구분(C1)별 완제품기능/요구사항 목록 반환
 * - POST: 새 완제품기능/요구사항 추가 또는 업데이트
 * - DELETE: 마스터 DB에서 완전 삭제
 * - pfmea_master_flat_items 테이블에서 itemCode='C2'/'C3' 데이터 조회
 * @created 2026-03-27
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * GET: 완제품기능(C2) 및 요구사항(C3) 조회
 * Query: ?type=C2|C3&category=YP|SP|USER&fmeaId=xxx
 */
export async function GET(req: NextRequest) {
    const prisma = getPrisma();
    if (!prisma) {
        return NextResponse.json({ success: false, error: 'DB 연결 실패', items: [] });
    }

    const { searchParams } = new URL(req.url);
    const itemType = searchParams.get('type') || 'C2'; // C2=완제품기능, C3=요구사항
    const category = searchParams.get('category') || ''; // YP, SP, USER
    const fmeaId = searchParams.get('fmeaId') || '';
    const parentId = searchParams.get('parentId') || ''; // C3 조회 시 부모 C2 ID
    const parentName = searchParams.get('parentName') || ''; // C3 조회 시 부모 C2 이름 (ID 매칭용)

    try {
        // fmeaId로 해당 FMEA의 데이터셋 조회
        let activeDataset: any = null;
        let datasetSource = '';
        
        if (fmeaId) {
            activeDataset = await prisma.pfmeaMasterDataset.findFirst({
                where: { fmeaId },
                orderBy: { updatedAt: 'desc' }
            });
            if (activeDataset) datasetSource = 'fmeaId';
        }
        
        // 2단계: 등록 화면에서 지정한 상위 FMEA (parentFmeaId) fallback
        if (!activeDataset && fmeaId) {
            const project = await prisma.fmeaProject.findFirst({ where: { fmeaId }, select: { parentFmeaId: true } });
            if (project?.parentFmeaId && project.parentFmeaId !== fmeaId) {
                activeDataset = await prisma.pfmeaMasterDataset.findFirst({
                    where: { fmeaId: project.parentFmeaId },
                    orderBy: { updatedAt: 'desc' }
                });
                if (activeDataset) datasetSource = `parent fallback (${project.parentFmeaId})`;
            }
        }

        // 3단계: isActive fallback
        if (!activeDataset) {
            activeDataset = await prisma.pfmeaMasterDataset.findFirst({
                where: { isActive: true },
                orderBy: { updatedAt: 'desc' }
            });
            if (activeDataset) datasetSource = 'isActive fallback';
        }

        console.log('[l1-functions GET] fmeaId:', fmeaId, '| type:', itemType, '| category:', category, '| datasetSource:', datasetSource);

        if (!activeDataset) {
            return NextResponse.json({
                success: true,
                items: [],
                source: 'none',
                message: 'Master FMEA 기초정보가 없습니다.'
            });
        }

        // 쿼리 조건 구성 — 카테고리별 필터 + 폴백
        const whereClause: Record<string, unknown> = {
            datasetId: activeDataset.id,
            itemCode: itemType, // C2 또는 C3
        };

        // 카테고리(구분) 필터 - C1의 value가 YP/SP/USER
        // C2/C3의 processNo 필드에 카테고리가 저장됨
        const normalizedCategory = category ? category.toUpperCase() : '';
        if (normalizedCategory) {
            whereClause.processNo = normalizedCategory;
        }

        // C3: POST 시 parentItemId에 워크시트 기능 id가 들어간 행과, 마스터 C2 flat id가 들어간 행이 공존
        // → parentName으로 찾은 마스터 C2 id + 쿼리 parentId(워크시트 func.id) 를 OR로 조회해야 행 삭제 후에도 목록이 유지됨
        const c3ParentIds: string[] = [];
        if (itemType === 'C3' && parentName?.trim()) {
            const parentC2 = await prisma.pfmeaMasterFlatItem.findFirst({
                where: {
                    datasetId: activeDataset.id,
                    itemCode: 'C2',
                    processNo: normalizedCategory,
                    value: parentName.trim(),
                },
            });
            if (parentC2) {
                c3ParentIds.push(parentC2.id);
                console.log('[l1-functions GET] parentName → 마스터 C2 id:', parentName, '→', parentC2.id);
            }
        }
        if (itemType === 'C3' && parentId?.trim()) {
            c3ParentIds.push(parentId.trim());
        }
        const uniqueC3Parents = [...new Set(c3ParentIds)];
        if (itemType === 'C3' && uniqueC3Parents.length === 1) {
            whereClause.parentItemId = uniqueC3Parents[0];
        } else if (itemType === 'C3' && uniqueC3Parents.length > 1) {
            whereClause.OR = uniqueC3Parents.map((pid) => ({ parentItemId: pid }));
        }

        let flatItems = await prisma.pfmeaMasterFlatItem.findMany({
            where: whereClause,
            orderBy: { value: 'asc' }
        });

        // ★ 폴백: 카테고리 필터링 결과가 없으면 전체 C2/C3 조회 (레거시 데이터 지원)
        let isFallback = false;
        if (flatItems.length === 0 && normalizedCategory) {
            console.log('[l1-functions GET] 카테고리 필터 결과 0건 → 전체 폴백 조회 (중복 제거)');
            isFallback = true;
            const fallbackWhere: Record<string, unknown> = {
                datasetId: activeDataset.id,
                itemCode: itemType,
            };
            if (itemType === 'C3' && uniqueC3Parents.length === 1) {
                fallbackWhere.parentItemId = uniqueC3Parents[0];
            } else if (itemType === 'C3' && uniqueC3Parents.length > 1) {
                fallbackWhere.OR = uniqueC3Parents.map((pid) => ({ parentItemId: pid }));
            }
            flatItems = await prisma.pfmeaMasterFlatItem.findMany({
                where: fallbackWhere,
                orderBy: { value: 'asc' }
            });
        }

        // 결과 매핑 + 중복 제거 (폴백 시 이름 기준 중복 제거)
        const seenNames = new Set<string>();
        const items = flatItems
            .map((item: any) => ({
                id: item.id,
                name: item.value || '',
                category: item.processNo || (isFallback ? normalizedCategory : ''), // 폴백 시 요청 카테고리 할당
                parentId: item.parentItemId || '',
                itemCode: item.itemCode,
            }))
            .filter((item: any) => {
                if (!item.name || !item.name.trim()) return false;
                // 폴백 모드: 이름 기준 중복 제거
                if (isFallback) {
                    const key = item.name.trim().toLowerCase();
                    if (seenNames.has(key)) return false;
                    seenNames.add(key);
                }
                return true;
            });

        return NextResponse.json({
            success: true,
            items,
            source: 'pfmea_master_flat_items',
            datasetId: activeDataset.id,
            type: itemType,
            category: category || 'all',
        });

    } catch (error: any) {
        console.error('[l1-functions GET] 오류:', error.message);
        return NextResponse.json({ success: false, items: [], error: error.message });
    }
}

/**
 * POST: 완제품기능(C2) 또는 요구사항(C3) 추가/업데이트
 * Body: { fmeaId, type: 'C2'|'C3', category, name, parentId?, items?: [...] }
 */
export async function POST(req: NextRequest) {
    const prisma = getPrisma();
    if (!prisma) {
        return NextResponse.json({ success: false, error: 'DB 연결 실패' });
    }

    try {
        const body = await req.json();
        const { fmeaId, type, category, name, parentId, items } = body;
        const itemCode = type || 'C2';

        // fmeaId로 해당 FMEA의 데이터셋 조회 (없으면 생성)
        let activeDataset: any = null;
        let datasetSource = '';
        
        if (fmeaId) {
            activeDataset = await prisma.pfmeaMasterDataset.findFirst({
                where: { fmeaId },
                orderBy: { updatedAt: 'desc' }
            });
            if (activeDataset) {
                datasetSource = 'fmeaId';
            } else {
                activeDataset = await prisma.pfmeaMasterDataset.create({
                    data: {
                        name: `Master Dataset for ${fmeaId}`,
                        fmeaId: fmeaId,
                        fmeaType: 'PFMEA',
                        isActive: false,
                    }
                });
                datasetSource = 'created for fmeaId';
            }
        }
        
        if (!activeDataset) {
            activeDataset = await prisma.pfmeaMasterDataset.findFirst({
                where: { isActive: true },
                orderBy: { updatedAt: 'desc' }
            });
            if (activeDataset) datasetSource = 'isActive fallback';
        }
        
        console.log('[l1-functions POST] fmeaId:', fmeaId, '| type:', itemCode, '| datasetSource:', datasetSource);

        if (!activeDataset) {
            return NextResponse.json({ success: false, error: '활성 Master Dataset이 없습니다.' });
        }

        // 배치 처리 (items 배열이 있을 때)
        if (items && Array.isArray(items) && items.length > 0) {
            const results: Array<{ id: string; status: string }> = [];
            
            for (const item of items) {
                const itemName = (item.name || '').trim();
                if (!itemName) continue;
                
                const itemCategory = (item.category || category || '').toUpperCase();
                const itemParentId = item.parentId || parentId || '';
                
                // ID로 기존 항목 조회
                if (item.id) {
                    const existing = await prisma.pfmeaMasterFlatItem.findFirst({
                        where: { id: item.id, itemCode }
                    });
                    
                    if (existing) {
                        await prisma.pfmeaMasterFlatItem.update({
                            where: { id: item.id },
                            data: {
                                value: itemName,
                                processNo: itemCategory,
                                parentItemId: itemParentId || existing.parentItemId,
                            }
                        });
                        results.push({ id: item.id, status: 'updated' });
                        continue;
                    }
                }
                
                // 중복 체크 (같은 데이터셋, 같은 카테고리, 같은 이름)
                const duplicate = await prisma.pfmeaMasterFlatItem.findFirst({
                    where: {
                        datasetId: activeDataset.id,
                        itemCode,
                        processNo: itemCategory,
                        value: itemName,
                        ...(itemCode === 'C3' && itemParentId ? { parentItemId: itemParentId } : {}),
                    }
                });
                
                if (duplicate) {
                    results.push({ id: duplicate.id, status: 'duplicate' });
                    continue;
                }
                
                // 새 항목 생성
                const newItem = await prisma.pfmeaMasterFlatItem.create({
                    data: {
                        id: item.id || undefined,
                        datasetId: activeDataset.id,
                        category: itemCode === 'C2' ? 'C2-완제품기능' : 'C3-요구사항',
                        itemCode,
                        processNo: itemCategory,
                        value: itemName,
                        parentItemId: itemParentId || null,
                        rowSpan: 1,
                    }
                });
                results.push({ id: newItem.id, status: 'created' });
            }
            
            return NextResponse.json({ success: true, results, count: results.length });
        }

        // 단일 항목 처리
        if (!name || !name.trim()) {
            return NextResponse.json({ success: false, error: '이름이 없습니다.' });
        }

        const normalizedCategory = (category || '').toUpperCase();
        const normalizedName = name.trim();
        const { updateId, oldName } = body;

        // ★ 인라인 편집: updateId + oldName이 있으면 기존 항목 업데이트
        // 워크시트 funcId ≠ 마스터 parentItemId이므로, parentId 조건 없이 oldName + category로 검색
        if (updateId && oldName) {
            const existingByOldName = await prisma.pfmeaMasterFlatItem.findFirst({
                where: {
                    datasetId: activeDataset.id,
                    itemCode,
                    processNo: normalizedCategory,
                    value: oldName.trim(),
                },
            });

            if (existingByOldName) {
                await prisma.pfmeaMasterFlatItem.update({
                    where: { id: existingByOldName.id },
                    data: { value: normalizedName },
                });
                console.log('[l1-functions POST] 인라인 편집 업데이트:', oldName, '→', normalizedName);
                return NextResponse.json({ success: true, id: existingByOldName.id, updated: true });
            }
        }

        // 중복 체크
        const existing = await prisma.pfmeaMasterFlatItem.findFirst({
            where: {
                datasetId: activeDataset.id,
                itemCode,
                processNo: normalizedCategory,
                value: normalizedName,
                ...(itemCode === 'C3' && parentId ? { parentItemId: parentId } : {}),
            },
        });

        if (existing) {
            return NextResponse.json({ success: true, duplicate: true, id: existing.id });
        }

        // 새 항목 생성
        const newItem = await prisma.pfmeaMasterFlatItem.create({
            data: {
                datasetId: activeDataset.id,
                category: itemCode === 'C2' ? 'C2-완제품기능' : 'C3-요구사항',
                itemCode,
                processNo: normalizedCategory,
                value: normalizedName,
                parentItemId: parentId || null,
                rowSpan: 1,
            },
        });

        return NextResponse.json({ success: true, id: newItem.id });
    } catch (error: any) {
        console.error('[l1-functions POST] 오류:', error.message);
        return NextResponse.json({ success: false, error: error.message });
    }
}

/**
 * DELETE: 완제품기능(C2) 또는 요구사항(C3) 삭제
 * Body: { ids: string[], type: 'C2'|'C3' }
 */
export async function DELETE(req: NextRequest) {
    const prisma = getPrisma();
    if (!prisma) {
        return NextResponse.json({ success: false, error: 'DB 연결 실패' });
    }

    try {
        const body = await req.json();
        const { ids, type } = body;
        const itemCode = type || 'C2';

        if (!ids || ids.length === 0) {
            return NextResponse.json({ success: false, error: '삭제할 항목 ID가 없습니다.' });
        }

        // 해당 itemCode 항목만 삭제 (안전장치)
        const result = await prisma.pfmeaMasterFlatItem.deleteMany({
            where: {
                id: { in: ids },
                itemCode,
            },
        });

        console.log('[l1-functions DELETE] type:', itemCode, '| deletedCount:', result.count);

        return NextResponse.json({ success: true, deletedCount: result.count });
    } catch (error: any) {
        console.error('[l1-functions DELETE] 오류:', error.message);
        return NextResponse.json({ success: false, error: error.message });
    }
}

/**
 * PATCH: 완제품기능/요구사항 이름 수정
 * Body: { updates: [{ id: string, name: string }], type: 'C2'|'C3' }
 */
export async function PATCH(req: NextRequest) {
    const prisma = getPrisma();
    if (!prisma) {
        return NextResponse.json({ success: false, error: 'DB 연결 실패' });
    }

    try {
        const body = await req.json();
        const { updates, type } = body;
        const itemCode = type || 'C2';

        if (!updates || updates.length === 0) {
            return NextResponse.json({ success: false, error: '수정할 데이터가 없습니다.' });
        }

        let updatedCount = 0;
        for (const upd of updates) {
            const result = await prisma.pfmeaMasterFlatItem.updateMany({
                where: { id: upd.id, itemCode },
                data: { value: upd.name },
            });
            updatedCount += result.count;
        }

        return NextResponse.json({ success: true, updatedCount });
    } catch (error: any) {
        console.error('[l1-functions PATCH] 오류:', error.message);
        return NextResponse.json({ success: false, error: error.message });
    }
}
