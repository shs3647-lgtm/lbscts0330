/**
 * POST /api/master/recalc-sod
 * @description MasterFmeaReference의 O/D를 FMEA_PC_DC_재평가_추천.xlsx 기준으로 재평가
 *
 * body: { dryRun?: boolean }
 *
 * 매칭 방식: MasterRef.b5Controls(PC) → O값, MasterRef.a6Controls(DC) → D값
 * 엑셀 PC_DC_재평가_추천표의 PC텍스트→O재평가, DC텍스트→D재평가 매핑 사용
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

export const runtime = 'nodejs';

// ══════════════════════════════════════════════════════════════
// PC(예방관리) → O(발생도) 매핑 — FMEA_PC_DC_재평가_추천.xlsx 기준
// AIAG-VDA: O=2(SPC+인터록), O=3(PM+IQC+교정), O=4(교육/OJT의존)
// ══════════════════════════════════════════════════════════════
const PC_TO_O: [string[], number][] = [
  // O=2: 통계적 제어 + 인터록 완비
  [['SPC', 'Cpk', '인터록', 'interlock', 'poka-yoke', '포카요케'], 2],
  [['PID 튜닝', '프로파일 SPC', '온도 프로파일'], 2],
  [['실시간 모니터링', 'SPC 관리', '전류 실시간'], 2],
  [['Recipe 잠금', '레시피 잠금', '인터록 설정'], 2],
  [['유량 인터록', '유량계 정기 교정'], 2],
  [['환경 인터록', '온습도', '청정도', '일일 모니터링'], 2],
  [['Etch Rate SPC', 'Etchant 농도 주기 분석'], 2],
  [['Anneal 온도', '열전대 정기 교정'], 2],
  [['PR 보관 온습도 관리', '유효기간 시스템'], 2],
  [['Mask 정기 검사', 'Inspection', '사용 이력 관리'], 2],
  [['MFC 정기 교정'], 2],

  // O=3: 정기 PM + 교정 + IQC 복합
  [['PM 주기 관리', '정기 PM', '가동 이력'], 3],
  [['IQC', '수입품질', '자재 성적서', 'COC'], 3],
  [['HEPA 필터', '파티클 카운터 측정'], 3],
  [['MSA', '측정기 정기 교정', '계측 시스템'], 3],
  [['OCR Reader 정기', '인식률 모니터링'], 3],
  [['정렬 센서 정기 교정', 'Cal.'], 3],
  [['노즐 정기 점검', '분사 압력'], 3],
  [['DI Water', '비저항', '필터 정기 교체'], 3],
  [['Coater RPM', 'Recipe 잠금 관리'], 3],
  [['UV Lamp', 'Dose Monitor'], 3],
  [['UPS 운영', 'Power 실시간'], 3],
  [['Etchant 온도', '농도 일일 측정', 'Rate 모니터링'], 3],
  [['포장 장비 정기 PM', '교정 이력'], 3],
  [['설비 PM', '월 1회', '정기점검'], 3],
  [['N₂ 유량계', 'N2 유량'], 2],

  // O=4: 작업표준 + 교육 의존 (인적 예방)
  [['작업표준서', '자격인증', 'OJT', '교육'], 4],
  [['검사 기준서', '한도 견본', '기준서 교육'], 4],
  [['도금액 성분', '일 1회 분석', 'Make-up'], 4],
  [['작업 표준', '작업기준'], 4],

  // O=5: 간헐적 예방
  [['비주기적', '간헐적', '일부 표준'], 5],
];

// ══════════════════════════════════════════════════════════════
// DC(검출관리) → D(검출도) 매핑 — FMEA_PC_DC_재평가_추천.xlsx 기준
// AIAG-VDA: D=2(자동전수검출), D=3(자동시스템/Daily), D=4(AVI+육안), D=5(샘플링+육안)
// ══════════════════════════════════════════════════════════════
const DC_TO_D: [string[], number][] = [
  // D=2: 자동 기계기반 전수검출 (인터록, MES)
  [['전수 자동', 'AVI 장비 전수', '자동 외관검사'], 2],
  [['전수 측정', 'CD-SEM', 'CD 측정기'], 2],
  [['Bump 높이 측정기 전수', 'XRF 분석기'], 2],
  [['MES Alarm', '인터록', 'interlock'], 2],

  // D=3: 자동 시스템 전수/Daily (AVI, SPC, 자동측정)
  [['파티클 카운터', '온습도 센서 자동', '매 Shift'], 3],
  [['바코드 스캐너', '바코드'], 3],
  [['OCR Reader 자동', 'Sorter 장비 정렬 센서'], 3],
  [['Particle Counter', '파티클 잔류수 검사'], 3],
  [['SEM 검사', 'Seed 잔류물'], 3],
  [['비전검사', 'vision'], 3],
  [['Sorter', '정렬 정밀도', '매 Wafer'], 3],
  [['자동 기록', 'auto'], 3],

  // D=4: AVI+육안 / 샘플링자동
  [['두께 측정기', 'PR Thickness', '샘플 측정'], 4],
  [['광학 현미경', 'Opening 검사', 'PR 잔사 검사'], 4],
  [['샘플링', '기준샘플'], 4],

  // D=5: 샘플링+육안 수동
  [['육안 검사', '외관 확인', '육안'], 5],
  [['포장 상태 육안', '라벨 바코드 스캔'], 5],

  // D=6: 육안 단독
  [['시각 검사', '촉각', '수동 측정'], 6],
];

function matchPC(pcTexts: string[]): number {
  const combined = pcTexts.join(' ').toLowerCase();
  if (!combined.trim()) return 4; // PC 없으면 교육 의존 수준

  for (const [keywords, oVal] of PC_TO_O) {
    if (keywords.some(kw => combined.includes(kw.toLowerCase()))) {
      return oVal;
    }
  }
  return 4; // 기본: 교육/OJT 의존
}

function matchDC(dcTexts: string[]): number {
  const combined = dcTexts.join(' ').toLowerCase();
  if (!combined.trim()) return 5; // DC 없으면 수동 검사 수준

  for (const [keywords, dVal] of DC_TO_D) {
    if (keywords.some(kw => combined.includes(kw.toLowerCase()))) {
      return dVal;
    }
  }
  return 4; // 기본: 샘플링 수준
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun === true;

    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });

    const refs = await prisma.masterFmeaReference.findMany({
      where: { isActive: true },
    });

    const updates: { id: string; oldO: number; newO: number; oldD: number; newD: number; m4: string; we: string; pc: string; dc: string }[] = [];

    for (const ref of refs) {
      const newO = matchPC(ref.b5Controls);
      const newD = matchDC(ref.a6Controls);
      const oldO = ref.occurrence ?? 0;
      const oldD = ref.detection ?? 0;

      if (newO !== oldO || newD !== oldD) {
        updates.push({
          id: ref.id,
          oldO, newO,
          oldD, newD,
          m4: ref.m4,
          we: ref.weName,
          pc: ref.b5Controls.slice(0, 1).join(',').substring(0, 40),
          dc: ref.a6Controls.slice(0, 1).join(',').substring(0, 40),
        });
      }
    }

    if (!dryRun && updates.length > 0) {
      for (const u of updates) {
        await prisma.masterFmeaReference.update({
          where: { id: u.id },
          data: { occurrence: u.newO, detection: u.newD },
        });
      }
    }

    // 변경 후 O/D 분포
    const oDist: Record<number, number> = {};
    const dDist: Record<number, number> = {};
    refs.forEach(ref => {
      const u = updates.find(u => u.id === ref.id);
      const o = u ? u.newO : (ref.occurrence ?? 0);
      const d = u ? u.newD : (ref.detection ?? 0);
      oDist[o] = (oDist[o] || 0) + 1;
      dDist[d] = (dDist[d] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      dryRun,
      total: refs.length,
      changed: updates.length,
      unchanged: refs.length - updates.length,
      oDistribution: oDist,
      dDistribution: dDist,
      sample: updates.slice(0, 20).map(u =>
        `O:${u.oldO}→${u.newO} D:${u.oldD}→${u.newD} [${u.m4}] ${u.we} PC:${u.pc} DC:${u.dc}`
      ),
    });
  } catch (error) {
    console.error('[master/recalc-sod] Error:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}
