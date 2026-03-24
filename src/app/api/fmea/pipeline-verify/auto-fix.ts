/**
 * @file auto-fix.ts
 * 파이프라인 자동수정 함수 — STEP 0~4 각 단계 수정 로직
 *
 * STEP 0: rebuild-atomic (구조 복원)
 * STEP 1: UUID 폴백 L3Function 생성
 * STEP 2: fmeaId 리매핑 (해당 시 — 현재 미구현, 수동 대응)
 * STEP 3: FK 깨진 링크 삭제 + 미연결 FC→FL 자동생성
 * STEP 4: 누락 데이터 보충 (DC/PC/SOD 피어 채움, orphanOpt 삭제, RA 자동생성)
 */

import { getPrisma } from '@/lib/prisma';
import { calcAPServer } from './verify-steps';

/** `1` 이면 L2=0일 때도 rebuild-atomic 호출 안 함 — FK 수선·재import 우선 (repair-fk) */
function isRebuildAtomicDisabled(): boolean {
  return (
    process.env.DISABLE_REBUILD_ATOMIC === '1' ||
    process.env.FMEA_REPAIR_NO_REBUILD === '1'
  );
}

// ─── STEP 0: 구조 확인 (rebuild-atomic 호출 완전 제거 — 리매핑으로 처리) ─────
export async function fixStructure(prisma: any, fmeaId: string): Promise<string[]> {
  const fixed: string[] = [];

  const l2Count = await prisma.l2Structure.count({ where: { fmeaId } });
  if (l2Count === 0) {
    fixed.push('L2Structure 없음 — Import 먼저 실행하세요 (save-position-import)');
    return fixed;
  }

  // ★ rebuild-atomic 호출 완전 제거 (위치기반 데이터 소실 방지)
  // 위치기반 프로젝트는 processCharId 리매핑만으로 충분
  const POS_UUID = /^L3-R\d+$/;
  const sampleL3 = await prisma.l3Structure.findFirst({ where: { fmeaId }, select: { id: true } });
  if (sampleL3 && POS_UUID.test(sampleL3.id)) {
    // ★ 위치기반: L3Function=0이면 repair-l3 API 호출 (즉시 복구)
    const l3FuncCount = await prisma.l3Function.count({ where: { fmeaId } });
    if (l3FuncCount === 0) {
      try {
        const repairRes = await fetch(`http://localhost:${process.env.PORT || 3000}/api/fmea/repair-l3?fmeaId=${encodeURIComponent(fmeaId)}`, { method: 'POST' });
        if (repairRes.ok) {
          const r = await repairRes.json();
          fixed.push(`L3Function 자동복구: ${r.after?.l3f || 0}건 생성 (${r.repairs?.join(', ') || ''})`);
        }
      } catch (e) { console.error('[fixStructure] repair-l3 실패:', e); }
    }
    // 위치기반: RA 보완 + processCharId 리매핑
    const allFLs = await prisma.failureLink.findMany({ where: { fmeaId }, select: { id: true } });
    const existingRaLinkIds = new Set(
      (await prisma.riskAnalysis.findMany({ where: { fmeaId }, select: { linkId: true } })).map((r: { linkId: string }) => r.linkId)
    );
    const missingRaFLs = allFLs.filter((fl: { id: string }) => !existingRaLinkIds.has(fl.id));
    if (missingRaFLs.length > 0) {
      const now = new Date();
      await prisma.riskAnalysis.createMany({
        skipDuplicates: true,
        data: missingRaFLs.map((fl: { id: string }) => ({
          id: `${fl.id}-RA`, fmeaId, linkId: fl.id,
          severity: 1, occurrence: 1, detection: 1, ap: 'L', createdAt: now, updatedAt: now,
        })),
      });
      fixed.push(`위치기반 RA 보완: ${missingRaFLs.length}건 (영구저장)`);
    }
    // processCharId 리매핑
    const fcsNull = await prisma.failureCause.findMany({ where: { fmeaId, processCharId: null }, select: { id: true, l3FuncId: true } });
    let remapped = 0;
    for (const fc of fcsNull) {
      if (fc.l3FuncId) {
        await prisma.failureCause.update({ where: { id: fc.id }, data: { processCharId: fc.l3FuncId } });
        remapped++;
      }
    }
    if (remapped > 0) fixed.push(`processCharId 리매핑: ${remapped}건 (영구저장)`);
  }

  return fixed;
}

// ─── STEP 1: UUID 검증 (폴백 생성 제거 — DB 원본 유지) ───────────────
export async function fixUuid(_prisma: any, _fmeaId: string): Promise<string[]> {
  return [];
}

// ─── STEP 3: FK 수정 ─────────────────────────────────────────
export async function fixFk(prisma: any, fmeaId: string): Promise<string[]> {
  const fixed: string[] = [];

  const [l2s, l3s, l3Funcs, fcs, links, fms, fes] = await Promise.all([
    prisma.l2Structure.findMany({ where: { fmeaId }, select: { id: true, no: true, order: true }, orderBy: { order: 'asc' } }),
    prisma.l3Structure.findMany({ where: { fmeaId }, select: { id: true, l2Id: true, l1Id: true, order: true } }),
    prisma.l3Function.findMany({ where: { fmeaId }, select: { id: true, l3StructId: true, l2StructId: true } }),
    prisma.failureCause.findMany({ where: { fmeaId }, select: { id: true, l3StructId: true, l2StructId: true, l3FuncId: true } }),
    prisma.failureLink.findMany({ where: { fmeaId } }),
    prisma.failureMode.findMany({ where: { fmeaId } }),
    prisma.failureEffect.findMany({ where: { fmeaId } }),
  ]);

  const l2Set = new Set(l2s.map((s: any) => s.id));
  const fcSet = new Set(fcs.map((f: any) => f.id));
  const fmSet = new Set(fms.map((f: any) => f.id));
  const feSet = new Set(fes.map((f: any) => f.id));

  // ★★★ L3.l2Id NULL/orphan 복구 — 위치기반 ID 패턴에서 행 인덱스 기반 L2 매핑 ★★★
  // 2026-03-25: CODEFREEZE 벤치마킹 rebuild-atomic 방식 참조
  const orphanL3s = l3s.filter((l3: any) => !l3.l2Id || !l2Set.has(l3.l2Id));
  if (orphanL3s.length > 0 && l2s.length > 0) {
    // 방법 1: L3 order 기반 → 가장 가까운 L2 매칭
    //   L3의 order가 L2의 order 범위 내에 있으면 해당 L2로 할당
    const l2Sorted = [...l2s].sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
    let l3Fixed = 0;

    for (const l3 of orphanL3s) {
      // 이미 유효한 l2Id가 있으면 스킵
      if (l3.l2Id && l2Set.has(l3.l2Id)) continue;

      // 방법 1: 위치기반 ID에서 행 인덱스 추출 (L3-R{n})
      const rowMatch = /^L3-R(\d+)/.exec(l3.id);
      if (rowMatch) {
        const rowIdx = parseInt(rowMatch[1], 10);
        // L2 order 범위에서 L3 rowIdx에 가장 가까운 L2 찾기
        let bestL2 = l2Sorted[0];
        for (let i = 0; i < l2Sorted.length; i++) {
          if ((l2Sorted[i].order || 0) <= rowIdx) bestL2 = l2Sorted[i];
          else break;
        }
        if (bestL2) {
          await prisma.l3Structure.update({ where: { id: l3.id }, data: { l2Id: bestL2.id } });
          l3.l2Id = bestL2.id; // 메모리도 업데이트 (하위 연쇄 복구용)
          l3Fixed++;
        }
      } else {
        // 방법 2: 같은 l1Id 기준 첫 L2 할당 (fallback)
        const fallbackL2 = l2Sorted[0];
        if (fallbackL2) {
          await prisma.l3Structure.update({ where: { id: l3.id }, data: { l2Id: fallbackL2.id } });
          l3.l2Id = fallbackL2.id;
          l3Fixed++;
        }
      }
    }
    if (l3Fixed > 0) fixed.push(`L3.l2Id NULL 복구 ${l3Fixed}건 (위치기반 행매핑)`);
  }

  // ★ L3Function.l2StructId 연쇄 복구 — L3Structure의 l2Id에서 가져옴
  const l3ToL2 = new Map<string, string>();
  for (const l3 of l3s) { if (l3.l2Id) l3ToL2.set(l3.id, l3.l2Id); }

  let l3fFixed = 0;
  for (const l3f of l3Funcs) {
    const expectedL2 = l3ToL2.get(l3f.l3StructId);
    if (expectedL2 && l3f.l2StructId !== expectedL2) {
      await prisma.l3Function.update({ where: { id: l3f.id }, data: { l2StructId: expectedL2 } });
      l3f.l2StructId = expectedL2;
      l3fFixed++;
    }
  }
  if (l3fFixed > 0) fixed.push(`L3F.l2StructId 연쇄복구 ${l3fFixed}건`);

  // ★ FC.l2StructId 연쇄 복구 — L3Structure 기반
  let fcFixed = 0;
  for (const fc of fcs) {
    const expectedL2 = l3ToL2.get(fc.l3StructId);
    if (expectedL2 && fc.l2StructId !== expectedL2) {
      await prisma.failureCause.update({ where: { id: fc.id }, data: { l2StructId: expectedL2 } });
      fcFixed++;
    }
  }
  if (fcFixed > 0) fixed.push(`FC.l2StructId 연쇄복구 ${fcFixed}건`);

  // 깨진 FL 삭제
  let brokenDeleted = 0;
  for (const lk of links) {
    if (!fcSet.has(lk.fcId) || !fmSet.has(lk.fmId) || !feSet.has(lk.feId)) {
      await prisma.failureLink.delete({ where: { id: lk.id } }).catch((e: unknown) => console.error(`[fixFk] FL 삭제 실패 id=${lk.id}:`, e));
      brokenDeleted++;
    }
  }
  if (brokenDeleted > 0) fixed.push(`깨진 FL 삭제 ${brokenDeleted}건`);

  // ★ 2026-03-20: 미연결 FC→FL 자동생성 / RA 자동생성 제거 — no-fallback 원칙

  return fixed;
}

// ─── STEP 4: 누락 데이터 자동수정 ────────────────────────────
export async function fixMissing(prisma: any, fmeaId: string): Promise<string[]> {
  const fixed: string[] = [];

  // ★★★ 2026-03-25: processChar(B3) + functionName(B2) 빈값 채움 ★★★
  // CODEFREEZE 벤치마킹: rebuild-atomic L530-L614 패턴 참조
  // FlatItem B2/B3를 processNo+m4 기준으로 매칭 → 기존 L3Function 업데이트
  {
    const l3Funcs = await prisma.l3Function.findMany({
      where: { fmeaId },
      select: { id: true, l3StructId: true, l2StructId: true, processChar: true, functionName: true, specialChar: true },
    });
    const l3Structs = await prisma.l3Structure.findMany({
      where: { fmeaId },
      select: { id: true, l2Id: true, m4: true, name: true, order: true },
    });
    const l2Structs = await prisma.l2Structure.findMany({
      where: { fmeaId },
      select: { id: true, no: true },
    });

    // ★★★ 2026-03-25: l3ProcessChar 테이블에서 processChar 직접 복사 (SSoT 우선)
    // B3 독립 엔티티: L3-R{n}-C5-B3 ID의 L3Function → l3ProcessChar.name으로 processChar 채움
    try {
      // Prisma 모델 접근 (safeTx 패턴 - 모델 존재 여부 런타임 체크)
      const pcModel = (prisma as any).l3ProcessChar;
      if (pcModel) {
        const l3PCs: Array<{ id: string; l3FuncId: string; name: string; specialChar: string | null }> =
          await pcModel.findMany({
            where: { fmeaId },
            select: { id: true, l3FuncId: true, name: true, specialChar: true },
          });

        if (l3PCs.length > 0) {
          // l3FuncId → l3ProcessChar.name 매핑 (첫 번째 값 사용)
          const pcByFuncId = new Map<string, { name: string; specialChar: string | null }>();
          for (const pc of l3PCs) {
            if (pc.name?.trim() && !pcByFuncId.has(pc.l3FuncId)) {
              pcByFuncId.set(pc.l3FuncId, { name: pc.name.trim(), specialChar: pc.specialChar });
            }
          }

          let l3pcFilled = 0;
          for (const l3f of l3Funcs) {
            if (l3f.processChar?.trim()) continue; // 이미 채워짐
            const pc = pcByFuncId.get(l3f.id);
            if (pc) {
              const upd: any = { processChar: pc.name };
              if (pc.specialChar && !l3f.specialChar) upd.specialChar = pc.specialChar;
              await prisma.l3Function.update({ where: { id: l3f.id }, data: upd });
              (l3f as any).processChar = pc.name; // 인메모리도 업데이트 (후속 로직용)
              l3pcFilled++;
            }
          }
          if (l3pcFilled > 0) fixed.push(`l3ProcessChar→processChar 복사 ${l3pcFilled}건`);
        }
      } else {
        console.log('[fixMissing] l3ProcessChar 모델 미존재 — 스킵');
      }
    } catch (e: any) {
      console.warn('[fixMissing] l3ProcessChar 복사 실패 (테이블 미존재 등):', e?.message);
    }

    // empty processChar 필터 (B2 전용 ID 패턴만 제외)
    // ★ L3-R{n}-C5-B3은 제외하지 않음 — 실제 공정특성을 채워야 하는 대상
    const B2_PATTERN = /^PF-L3-\d{3}-[A-Z]{2}-\d{3}-G|^L3-R\d+-C5$/;
    const emptyPCFuncs = l3Funcs.filter(
      (f: any) => !f.processChar?.trim() && !B2_PATTERN.test(f.id)
    );
    const emptyFNFuncs = l3Funcs.filter(
      (f: any) => !f.functionName?.trim() && !B2_PATTERN.test(f.id)
    );

    console.error(`[fixMissing] ★ emptyPC=${emptyPCFuncs.length} emptyFN=${emptyFNFuncs.length} total_l3f=${l3Funcs.length}`);
    fixed.push(`[진단] emptyPC=${emptyPCFuncs.length} emptyFN=${emptyFNFuncs.length} total_l3f=${l3Funcs.length}`);
    if (emptyPCFuncs.length > 0 || emptyFNFuncs.length > 0) {
      const publicPrisma = getPrisma();
      if (publicPrisma) {
        try {
          const dataset = await publicPrisma.pfmeaMasterDataset.findFirst({
            where: { fmeaId, isActive: true },
            select: { id: true },
          });
          if (dataset) {
            type FlatRow = { processNo: string; value: string; m4: string | null; specialChar: string | null };
            const [flatB2, flatB3] = await Promise.all([
              publicPrisma.pfmeaMasterFlatItem.findMany({
                where: { datasetId: dataset.id, itemCode: 'B2' },
                select: { processNo: true, value: true, m4: true, specialChar: true },
              }) as Promise<FlatRow[]>,
              publicPrisma.pfmeaMasterFlatItem.findMany({
                where: { datasetId: dataset.id, itemCode: 'B3' },
                select: { processNo: true, value: true, m4: true, specialChar: true },
              }) as Promise<FlatRow[]>,
            ]);

            // processNo 추출: "L2-PNO-040" → "40", "PF-L2-040" → "40"
            const l2NoById = new Map<string, string>();
            for (const l2 of l2Structs) {
              l2NoById.set(l2.id, String(parseInt(String(l2.no || ''), 10)));
            }
            // L3Structure ID → l2Id + m4 맵
            const l3Meta = new Map<string, { l2Id: string; m4: string; name: string }>();
            for (const l3 of l3Structs) {
              l3Meta.set(l3.id, { l2Id: l3.l2Id || '', m4: l3.m4 || '', name: l3.name || '' });
            }

            // FlatItem B2/B3를 processNo+m4로 그룹화 (rebuild-atomic 동일 패턴)
            const b2Map = new Map<string, FlatRow[]>();
            for (const b of flatB2) {
              const key = `${parseInt(b.processNo, 10)}|${b.m4 || ''}`;
              if (!b2Map.has(key)) b2Map.set(key, []);
              b2Map.get(key)!.push(b);
            }
            const b3Map = new Map<string, FlatRow[]>();
            for (const b of flatB3) {
              const key = `${parseInt(b.processNo, 10)}|${b.m4 || ''}`;
              if (!b3Map.has(key)) b3Map.set(key, []);
              b3Map.get(key)!.push(b);
            }

            // ★ 디버그: FlatItem 로드 결과
            fixed.push(`[진단] FlatItem B2=${flatB2.length}, B3=${flatB3.length}`);
            fixed.push(`[진단] b3Map keys: ${[...b3Map.keys()].slice(0, 10).join(', ')} (${b3Map.size}건)`);
            // 빈 L3Function의 key 확인 (매칭 실패 원인 진단)
            const unmatchedKeys = new Set<string>();
            for (const f of emptyPCFuncs) {
              const meta = l3Meta.get(f.l3StructId);
              if (!meta) { unmatchedKeys.add(`NO_META:${f.l3StructId}`); continue; }
              const pno = l2NoById.get(meta.l2Id) || '';
              const k = `${pno}|${meta.m4}`;
              if (!b3Map.has(k)) unmatchedKeys.add(k);
            }
            if (unmatchedKeys.size > 0) fixed.push(`[진단] B3 매칭 실패 key(${unmatchedKeys.size}건): ${[...unmatchedKeys].slice(0, 10).join(', ')}`);
            // ★★★ 2026-03-25 FIX: L3Function별 매칭 인덱스를 WE(l3StructId) 단위로 관리
            // 중복 제거 금지: 같은 공정특성(B3)이 다른 WE에도 동일하게 매칭되어야 함
            // 과거 해결 벤치마크: useImportFileHandlers L372 "B3: 같은 공정/m4에서 다른 WE가 동일한 공정특성"
            // key = pno|m4|l3StructId → 각 WE별로 독립적 인덱스
            const usedB2Idx = new Map<string, number>();
            const usedB3Idx = new Map<string, number>();

            // ★ L3Function을 l3StructId.order 기준으로 정렬하여 순차 할당
            const sortedL3Funcs = [...l3Funcs].sort((a: any, b: any) => {
              const oA = l3Structs.find((s: any) => s.id === a.l3StructId)?.order ?? 0;
              const oB = l3Structs.find((s: any) => s.id === b.l3StructId)?.order ?? 0;
              return oA - oB;
            });

            let pcFilled = 0, fnFilled = 0, scFilled = 0;

            for (const l3f of sortedL3Funcs) {
              const meta = l3Meta.get(l3f.l3StructId);
              if (!meta) continue;
              const pno = l2NoById.get(meta.l2Id) || '';
              if (!pno) continue;
              const b3LookupKey = `${pno}|${meta.m4}`;
              // ★★★ WE(l3StructId) 단위 인덱스: 같은 pno|m4라도 다른 WE면 인덱스 0부터 재시작
              // 이렇게 해야 동일한 공정특성이 여러 WE에 독립적으로 매칭됨 (중복 제거 금지)
              const weIdxKey = `${pno}|${meta.m4}|${l3f.l3StructId}`;

              const updateData: any = {};

              // processChar (B3) 채움
              if (!l3f.processChar?.trim() && !B2_PATTERN.test(l3f.id)) {
                const b3Items = b3Map.get(b3LookupKey) || [];
                const idx = usedB3Idx.get(weIdxKey) || 0;
                usedB3Idx.set(weIdxKey, idx + 1);
                const b3 = b3Items[idx];
                if (b3?.value?.trim()) {
                  updateData.processChar = b3.value.trim();
                  pcFilled++;
                  if (b3.specialChar && !l3f.specialChar) {
                    updateData.specialChar = b3.specialChar;
                    scFilled++;
                  }
                }
              }

              // functionName (B2) 채움
              if (!l3f.functionName?.trim() && !B2_PATTERN.test(l3f.id)) {
                const b2Items = b2Map.get(b3LookupKey) || [];
                const idx = usedB2Idx.get(weIdxKey) || 0;
                usedB2Idx.set(weIdxKey, idx + 1);
                const b2 = b2Items[idx];
                if (b2?.value?.trim()) {
                  updateData.functionName = b2.value.trim();
                  fnFilled++;
                }
              }

              if (Object.keys(updateData).length > 0) {
                await prisma.l3Function.update({ where: { id: l3f.id }, data: updateData });
              }
            }

            if (pcFilled > 0) fixed.push(`공정특성(B3) 자동채움 ${pcFilled}건`);
            if (fnFilled > 0) fixed.push(`요소기능(B2) 자동채움 ${fnFilled}건`);
            if (scFilled > 0) fixed.push(`특별특성(SC) 자동채움 ${scFilled}건`);

            // ★★★ 2026-03-25: 피어 채움 — FlatItem B3보다 DB L3Function이 많을 때
            // 같은 pno|m4 내 이미 채워진 L3Function의 processChar를 WE별로 복사 (중복 허용)
            // 벤치마크: useImportFileHandlers L373 "같은 공정/m4에서 다른 WE가 동일한 공정특성을 가질 수 있음"
            {
              // 현재 DB 상태 재로드 (FlatItem 채움 후)
              const refreshedL3Funcs = await prisma.l3Function.findMany({
                where: { fmeaId },
                select: { id: true, l3StructId: true, processChar: true },
              });

              // pno|m4 → 채워진 processChar 값 목록
              const filledPcByPnoM4 = new Map<string, string[]>();
              for (const f of refreshedL3Funcs) {
                if (!f.processChar?.trim()) continue;
                const meta = l3Meta.get(f.l3StructId);
                if (!meta) continue;
                const pno = l2NoById.get(meta.l2Id) || '';
                const k = `${pno}|${meta.m4}`;
                if (!filledPcByPnoM4.has(k)) filledPcByPnoM4.set(k, []);
                filledPcByPnoM4.get(k)!.push(f.processChar.trim());
              }

              let peerFilled = 0;
              // WE 단위 피어 인덱스
              const peerIdx = new Map<string, number>();
              for (const f of refreshedL3Funcs) {
                if (f.processChar?.trim()) continue;
                if (B2_PATTERN.test(f.id)) continue;
                const meta = l3Meta.get(f.l3StructId);
                if (!meta) continue;
                const pno = l2NoById.get(meta.l2Id) || '';
                const k = `${pno}|${meta.m4}`;
                const pcValues = filledPcByPnoM4.get(k);
                if (!pcValues || pcValues.length === 0) continue;

                // WE별 순환 인덱스 (같은 WE는 같은 processChar 반복)
                const weKey = `${k}|${f.l3StructId}`;
                const idx = peerIdx.get(weKey) || 0;
                peerIdx.set(weKey, idx + 1);
                const pc = pcValues[idx % pcValues.length]; // 순환
                if (pc) {
                  await prisma.l3Function.update({ where: { id: f.id }, data: { processChar: pc } });
                  peerFilled++;
                }
              }
              if (peerFilled > 0) fixed.push(`피어채움(공정특성) ${peerFilled}건`);
            }
          }
        } catch (e: any) {
          console.error('[fixMissing] processChar/B3 채움 실패:', e?.message);
        }
      }
    }
  }

  const [ras, fls, opts] = await Promise.all([
    prisma.riskAnalysis.findMany({ where: { fmeaId } }),
    prisma.failureLink.findMany({ where: { fmeaId }, select: { id: true, fmId: true, fcId: true } }),
    prisma.optimization.findMany({ where: { fmeaId }, select: { id: true, riskId: true } }),
  ]);

  const raSet = new Set(ras.map((ra: any) => ra.id));
  const flById = new Map<string, { fmId: string; fcId: string }>();
  for (const fl of fls) flById.set(fl.id, { fmId: fl.fmId, fcId: fl.fcId });

  // Opt → RA FK 고아 삭제
  const orphanOpts = opts.filter((o: any) => !raSet.has(o.riskId));
  if (orphanOpts.length > 0) {
    const ids = orphanOpts.map((o: any) => o.id);
    await prisma.optimization.deleteMany({ where: { id: { in: ids } } }).catch((e: unknown) => console.error(`[fixMissing] Opt 고아 삭제 실패:`, e));
    fixed.push(`Opt FK 고아 삭제 ${orphanOpts.length}건`);
  }

  // DC/PC 피어 채움 (동일 FM 그룹의 최빈값)
  const fmPeerDC = new Map<string, string[]>();
  const fmPeerPC = new Map<string, string[]>();
  const fmPeerO = new Map<string, number[]>();
  const fmPeerD = new Map<string, number[]>();
  const fmToProcessNo = new Map<string, string>();

  for (const ra of ras) {
    const fl = flById.get(ra.linkId);
    if (!fl) continue;
    if (ra.detectionControl?.trim()) {
      if (!fmPeerDC.has(fl.fmId)) fmPeerDC.set(fl.fmId, []);
      fmPeerDC.get(fl.fmId)!.push(ra.detectionControl.trim());
    }
    if (ra.preventionControl?.trim()) {
      if (!fmPeerPC.has(fl.fmId)) fmPeerPC.set(fl.fmId, []);
      fmPeerPC.get(fl.fmId)!.push(ra.preventionControl.trim());
    }
    if (ra.occurrence > 0) {
      if (!fmPeerO.has(fl.fmId)) fmPeerO.set(fl.fmId, []);
      fmPeerO.get(fl.fmId)!.push(ra.occurrence);
    }
    if (ra.detection > 0) {
      if (!fmPeerD.has(fl.fmId)) fmPeerD.set(fl.fmId, []);
      fmPeerD.get(fl.fmId)!.push(ra.detection);
    }
  }

  // Peer 데이터가 모두 비어 있으면 public staging A6/B5에서 공정 단위 기본값을 읽는다.
  const publicPrisma = getPrisma();
  const dcByProcess = new Map<string, string>();
  const pcByProcess = new Map<string, string>();
  if (publicPrisma) {
    try {
      const dataset = await publicPrisma.pfmeaMasterDataset.findFirst({
        where: { fmeaId, isActive: true },
        select: { id: true },
      });
      if (dataset) {
        const [flatA6, flatB5, fms, l2s] = await Promise.all([
          publicPrisma.pfmeaMasterFlatItem.findMany({
            where: { datasetId: dataset.id, itemCode: 'A6' },
            select: { processNo: true, value: true },
          }),
          publicPrisma.pfmeaMasterFlatItem.findMany({
            where: { datasetId: dataset.id, itemCode: 'B5' },
            select: { processNo: true, value: true },
          }),
          prisma.failureMode.findMany({
            where: { fmeaId },
            select: { id: true, l2StructId: true },
          }),
          prisma.l2Structure.findMany({
            where: { fmeaId },
            select: { id: true, no: true },
          }),
        ]);

        const l2NoById = new Map<string, string>();
        for (const l2 of l2s) {
          if (l2?.id && l2?.no) l2NoById.set(l2.id, String(parseInt(String(l2.no), 10)));
        }
        for (const fm of fms) {
          const pNo = l2NoById.get(fm.l2StructId || '') || '';
          if (pNo) fmToProcessNo.set(fm.id, pNo);
        }
        for (const a6 of flatA6) {
          const pNo = String(parseInt(String(a6.processNo || ''), 10));
          if (pNo && !dcByProcess.has(pNo) && a6.value?.trim()) dcByProcess.set(pNo, a6.value.trim());
        }
        for (const b5 of flatB5) {
          const pNo = String(parseInt(String(b5.processNo || ''), 10));
          if (pNo && !pcByProcess.has(pNo) && b5.value?.trim()) pcByProcess.set(pNo, b5.value.trim());
        }
      }
    } catch (e) {
      console.error('[fixMissing] public A6/B5 fallback 조회 실패:', e);
    }
  }

  const mostFrequent = (arr: string[]) => {
    if (arr.length === 0) return '';
    const freq = new Map<string, number>();
    for (const v of arr) freq.set(v, (freq.get(v) || 0) + 1);
    let best = arr[0], bestCount = 0;
    for (const [k, c] of freq) { if (c > bestCount) { best = k; bestCount = c; } }
    return best;
  };

  const median = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  };

  let dcFilled = 0, pcFilled = 0, oFilled = 0, dFilled = 0, apFixed = 0;

  for (const ra of ras) {
    const fl = flById.get(ra.linkId);
    if (!fl) continue;

    let needsUpdate = false;
    let newO = ra.occurrence;
    let newD = ra.detection;
    let newDC = ra.detectionControl || '';
    let newPC = ra.preventionControl || '';

    if (!newDC.trim()) {
      const peer = mostFrequent(fmPeerDC.get(fl.fmId) || []);
      const fallback = dcByProcess.get(fmToProcessNo.get(fl.fmId) || '') || '';
      if (peer || fallback) {
        newDC = peer || fallback;
        needsUpdate = true;
        dcFilled++;
      }
    }
    if (!newPC.trim()) {
      const peer = mostFrequent(fmPeerPC.get(fl.fmId) || []);
      const fallback = pcByProcess.get(fmToProcessNo.get(fl.fmId) || '') || '';
      if (peer || fallback) {
        newPC = peer || fallback;
        needsUpdate = true;
        pcFilled++;
      }
    }
    if (!ra.occurrence || ra.occurrence <= 0) {
      newO = median(fmPeerO.get(fl.fmId) || []) || 1;
      needsUpdate = true; oFilled++;
    }
    if (!ra.detection || ra.detection <= 0) {
      newD = median(fmPeerD.get(fl.fmId) || []) || 1;
      needsUpdate = true; dFilled++;
    }

    const newAP = calcAPServer(ra.severity || 1, newO, newD);
    if (newAP && newAP !== ra.ap) { needsUpdate = true; apFixed++; }

    if (needsUpdate) {
      await prisma.riskAnalysis.update({
        where: { id: ra.id },
        data: {
          occurrence: newO, detection: newD,
          ap: newAP || ra.ap || 'L',
          ...(newDC.trim() ? { detectionControl: newDC } : {}),
          ...(newPC.trim() ? { preventionControl: newPC } : {}),
        },
      }).catch((e: unknown) => console.error(`[fixMissing] RA 업데이트 실패 id=${ra.id}:`, e));
    }
  }

  if (dcFilled > 0) fixed.push(`DC 자동채움 ${dcFilled}건`);
  if (pcFilled > 0) fixed.push(`PC 자동채움 ${pcFilled}건`);
  if (oFilled > 0) fixed.push(`O 자동채움 ${oFilled}건`);
  if (dFilled > 0) fixed.push(`D 자동채움 ${dFilled}건`);
  if (apFixed > 0) fixed.push(`AP 재계산 ${apFixed}건`);

  return fixed;
}
