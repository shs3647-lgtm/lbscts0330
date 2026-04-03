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
import { isValidFmeaId } from '@/lib/security';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const prisma = getPrisma();
    if (!prisma) {
        return NextResponse.json({ success: false, error: 'DB 연결 실패', workElements: [] });
    }

    const { searchParams } = new URL(req.url);
    const processNo = searchParams.get('processNo') || '';
    const fmeaId = searchParams.get('fmeaId') || '';

    try {
        // ★ 2026-03-30: master-items/route.ts와 동일한 resolveDataset 패턴
        // 연동 프로젝트: masterDatasetId → parentFmeaId → 자체 → isActive
        // 단독 프로젝트: isActive 마스터 중 B1 데이터 가장 많은 것 우선
        let activeDataset: any = null;
        let datasetSource = '';

        if (fmeaId) {
            // 1단계: masterDatasetId / parentFmeaId 우선
            const project = await prisma.fmeaProject.findFirst({
                where: { fmeaId },
                select: { parentFmeaId: true, masterDatasetId: true }
            });

            if (project?.masterDatasetId) {
                activeDataset = await prisma.pfmeaMasterDataset.findFirst({ where: { id: project.masterDatasetId } });
                if (activeDataset) datasetSource = `masterDataset (${project.masterDatasetId})`;
            }

            if (!activeDataset && project?.parentFmeaId && project.parentFmeaId !== fmeaId) {
                activeDataset = await prisma.pfmeaMasterDataset.findFirst({
                    where: { fmeaId: project.parentFmeaId },
                    orderBy: { updatedAt: 'desc' }
                });
                if (activeDataset) datasetSource = `parent (${project.parentFmeaId})`;
            }

            // ★ 단독 프로젝트: isActive 마스터 중 B1 데이터 가장 많은 것 우선
            const isStandalone = !project?.parentFmeaId && !project?.masterDatasetId;
            if (!activeDataset && isStandalone) {
                const candidates = await prisma.pfmeaMasterDataset.findMany({
                    where: { isActive: true },
                    orderBy: { updatedAt: 'desc' },
                });
                let bestDataset: any = null;
                let bestCount = 0;
                for (const c of candidates) {
                    const cnt = await prisma.pfmeaMasterFlatItem.count({
                        where: { datasetId: c.id, itemCode: 'B1' }
                    });
                    if (cnt > bestCount) { bestCount = cnt; bestDataset = c; }
                }
                if (bestDataset && bestCount > 0) {
                    activeDataset = bestDataset;
                    datasetSource = `standalone→master (${bestDataset.fmeaId}, ${bestCount} B1 items)`;
                }
            }

            // 자체 dataset (연동 프로젝트)
            if (!activeDataset) {
                activeDataset = await prisma.pfmeaMasterDataset.findFirst({
                    where: { fmeaId },
                    orderBy: { updatedAt: 'desc' }
                });
                if (activeDataset) datasetSource = 'fmeaId';
            }
        }

        // isActive fallback
        if (!activeDataset) {
            const candidates = await prisma.pfmeaMasterDataset.findMany({
                where: { isActive: true },
                orderBy: { updatedAt: 'desc' },
            });
            for (const c of candidates) {
                const cnt = await prisma.pfmeaMasterFlatItem.count({
                    where: { datasetId: c.id, itemCode: 'B1' }
                });
                if (cnt > 0) { activeDataset = c; datasetSource = `isActive (${c.fmeaId}, ${cnt} items)`; break; }
            }
            if (!activeDataset && candidates.length > 0) {
                activeDataset = candidates[0];
                datasetSource = 'isActive fallback (empty)';
            }
        }
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
            // ★ 2026-03-29: 정규화 전/후 변형 모두 매칭 ("010"→"10", "10"→"010")
            const raw = processNo.trim();
            const stripped = raw.replace(/^0+/, '') || '0'; // "010"→"10", "10"→"10"
            const padded = stripped.replace(/^(\d+)/, (_, n) => n.padStart(3, '0')); // "10"→"010"
            const variants = [...new Set([raw, stripped, padded])];
            // 해당 공정(변형 포함) + 공통공정(0, 00) 함께 조회
            whereClause = {
                datasetId: activeDataset.id,
                itemCode: 'B1',
                processNo: { in: [...variants, ...COMMON_PROCESS_VALUES] }
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
            // ★★★ 2026-02-03: 공란 및 잘못된 데이터 필터링 ★★★
            if (!name || name === '') return false;
            if (!rawName || rawName === '') return false;  // 원본 이름도 체크
            if (name.startsWith('{')) return false;
            if (name === '[object Object]') return false;
            // ★★★ 2026-03-27: 숫자만 있는 항목도 유효 — 필터 제거 ★★★
            // if (/^\d+$/.test(name)) return false;  // 숫자만 있는 경우 제외 → 제거
            // if (/^\d+\s*$/.test(rawName)) return false;  // 원본이 숫자만 → 제거
            // if (rawName.length < 2) return false;  // 너무 짧은 이름 제외 → 제거
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
 * POST: 새 작업요소 추가/업데이트 (배치 지원)
 * Body: { fmeaId?: string, processNo?: string, name?: string, m4?: string, items?: Array<{id, name, m4, processNo}> }
 * - 단일 항목: processNo, name, m4 사용
 * - 배치 항목: items 배열 사용 (더블클릭 입력 등)
 * - items에 id가 있으면 upsert (기존 항목 업데이트 또는 새 항목 생성)
 */
export async function POST(req: NextRequest) {
    const prisma = getPrisma();
    if (!prisma) {
        return NextResponse.json({ success: false, error: 'DB 연결 실패' });
    }

    try {
        const body = await req.json();
        const { fmeaId, processNo, name, m4, items } = body;

        // ★★★ 2026-03-27: fmeaId로 해당 FMEA의 데이터셋 조회 (없으면 생성) ★★★
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
                // fmeaId에 해당하는 데이터셋이 없으면 새로 생성
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
        if (!activeDataset) {
            return NextResponse.json({ success: false, error: '활성 Master Dataset이 없습니다.' });
        }

        // ★★★ 배치 처리 (items 배열이 있을 때) ★★★
        if (items && Array.isArray(items) && items.length > 0) {
            const results: Array<{ id: string; status: string; m4?: string }> = [];
            
            for (const item of items) {
                const itemName = (item.name || '').trim();
                if (!itemName) continue;
                
                // 공정번호 제거한 rawName 추출
                const rawName = itemName.replace(/^\d+\s+/, '');
                const itemProcessNo = item.processNo || '';
                
                // ID로 기존 항목 조회
                if (item.id) {
                    const existing = await prisma.pfmeaMasterFlatItem.findFirst({
                        where: { id: item.id, itemCode: 'B1' }
                    });
                    
                    if (existing) {
                        // 기존 항목 업데이트
                        await prisma.pfmeaMasterFlatItem.update({
                            where: { id: item.id },
                            data: {
                                value: rawName,
                                m4: item.m4 || existing.m4 || '',
                                processNo: itemProcessNo || existing.processNo || '',
                            }
                        });
                        results.push({ id: item.id, status: 'updated' });
                        continue;
                    }
                }
                
                // 중복 체크 (같은 데이터셋, 같은 공정, 같은 이름)
                const duplicate = await prisma.pfmeaMasterFlatItem.findFirst({
                    where: {
                        datasetId: activeDataset.id,
                        itemCode: 'B1',
                        processNo: itemProcessNo,
                        value: rawName,
                    }
                });
                
                if (duplicate) {
                    // ★★★ 중복 항목의 m4도 반환 → 워크시트에서 4M 정보 동기화 가능 ★★★
                    results.push({ id: duplicate.id, status: 'duplicate', m4: duplicate.m4 || '' });
                    continue;
                }
                
                // 새 항목 생성 (워크시트 ID 사용)
                const newItem = await prisma.pfmeaMasterFlatItem.create({
                    data: {
                        id: item.id || undefined, // 워크시트 L3 ID 사용
                        datasetId: activeDataset.id,
                        category: 'B1-작업요소',
                        itemCode: 'B1',
                        processNo: itemProcessNo,
                        value: rawName,
                        m4: item.m4 || '',
                        rowSpan: 1,
                    }
                });
                results.push({ id: newItem.id, status: 'created' });
            }
            
            return NextResponse.json({ success: true, results, count: results.length });
        }

        // ★★★ 단일 항목 처리 (기존 로직) ★★★
        if (!name || !name.trim()) {
            return NextResponse.json({ success: false, error: '작업요소명이 없습니다.' });
        }

        // 중복 체크 (같은 공정에 같은 이름)
        const existing = await prisma.pfmeaMasterFlatItem.findFirst({
            where: {
                datasetId: activeDataset.id,
                itemCode: 'B1',
                processNo: processNo || '',
                value: name.trim(),
            },
        });

        if (existing) {
            return NextResponse.json({ success: true, duplicate: true, id: existing.id });
        }

        // 새 항목 생성
        const newItem = await prisma.pfmeaMasterFlatItem.create({
            data: {
                datasetId: activeDataset.id,
                category: 'B1-작업요소',
                itemCode: 'B1',
                processNo: processNo || '',
                value: name.trim(),
                m4: m4 || '',
                rowSpan: 1,
            },
        });

        return NextResponse.json({ success: true, id: newItem.id });
    } catch (error: any) {
        console.error('작업요소 추가 오류:', error.message);
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
