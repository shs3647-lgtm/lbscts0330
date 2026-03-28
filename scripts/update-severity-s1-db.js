/**
 * S=1 DB 레코드 AIAG-VDA 기준 재평가
 * 복합 유니크 키(feText+severity) 충돌 방지: delete → upsert 패턴
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const seedData = require('../prisma/seed-data/10_severity_usage_records.json');

const SEVERITY_KEYWORDS = [
  { rating: 10, keywords: ['사망', '인체', '인명', '화재', '폭발', '감전'] },
  { rating: 9, keywords: ['법적', '리콜', 'RoHS', '법규', '규제 위반', '안전사고', '규제'] },
  { rating: 8, keywords: ['작동 불능', '기능 상실', '라인 정지', '라인정지', '생산 중단', '전수', 'Open/Short', '전기적 Open'] },
  { rating: 7, keywords: ['수율 저하', '수율 손실', '수율 심각', '고객 불만', '품질 저하', '불량 유출', 'Spec Out', '특성 이상', '불량 수령', '신뢰성 저하', '신뢰도 하락', 'Wafer 파손', 'Wafer 손실', '크랙', '파손', '손상', '미검출', '유출', '패턴 불량'] },
  { rating: 6, keywords: ['외관 결함', '외관 불량', '도장 불량', '내구성 저하', '부식', '기능 저하', '조립 불량', '생산 차질', '출고 지연', '산포 불량', '정렬 오차', '오염', '누락', '혼입', '정전기', 'Skip', 'Interlock'] },
  { rating: 5, keywords: ['식별 불가', '라벨 오류', '데이터 입력 오류', '정보 누락', 'LOT 관리', '검사 샘플', '수량 불일치'] },
];

function evaluateSeverity(feText) {
  for (const rule of SEVERITY_KEYWORDS) {
    for (const kw of rule.keywords) {
      if (feText.includes(kw)) return rule.rating;
    }
  }
  return 6;
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const s1Records = await prisma.severityUsageRecord.findMany({
    where: { severity: 1 },
  });
  
  console.log(`DB에서 S=1 레코드 ${s1Records.length}건 발견`);
  
  let updated = 0;
  let merged = 0;
  for (const rec of s1Records) {
    const seedMatch = seedData.find(s => s.feText === rec.feText && s.severity >= 2);
    const newSeverity = seedMatch ? seedMatch.severity : evaluateSeverity(rec.feText);
    
    // 1. 기존 S=1 레코드 삭제
    await prisma.severityUsageRecord.delete({ where: { id: rec.id } });
    
    // 2. feText+newSeverity 조합으로 upsert (이미 같은 FE+S가 있으면 usageCount 증가)
    await prisma.severityUsageRecord.upsert({
      where: { feText_severity: { feText: rec.feText, severity: newSeverity } },
      update: {
        usageCount: { increment: rec.usageCount || 1 },
        lastUsedAt: new Date(),
      },
      create: {
        feText: rec.feText,
        severity: newSeverity,
        feCategory: rec.feCategory || '',
        processName: rec.processName || '',
        productChar: rec.productChar || '',
        usageCount: rec.usageCount || 1,
        lastUsedAt: rec.lastUsedAt || new Date(),
      },
    });
    updated++;
    if (updated % 50 === 0) console.log(`  ${updated}건 처리...`);
  }
  
  const remaining = await prisma.severityUsageRecord.count({ where: { severity: 1 } });
  console.log(`\n완료: ${updated}건 재평가, 남은 S=1: ${remaining}건`);
  
  const all = await prisma.severityUsageRecord.groupBy({
    by: ['severity'],
    _count: true, 
    orderBy: { severity: 'asc' },
  });
  console.log('\n심각도 분포:');
  all.forEach(g => console.log(`  S=${g.severity}: ${g._count}건`));
  
  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
