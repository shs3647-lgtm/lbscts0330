/**
 * prisma/seed.ts — 초기 시드 데이터 주입
 *
 * 실행: npx tsx prisma/seed.ts
 * 또는: npm run db:seed
 *
 * prisma/seed-data/*.json 파일을 읽어서 DB에 upsert
 * 기존 데이터가 있으면 스킵 (skipDuplicates)
 */
import { getPrisma } from '@/lib/prisma';
import * as fs from 'fs';
import * as path from 'path';

function loadJson<T>(filename: string): T[] {
  const filePath = path.join(__dirname, 'seed-data', filename);
  if (!fs.existsSync(filePath)) {
    console.log(`  SKIP: ${filename} (파일 없음)`);
    return [];
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T[];
}

async function main() {
  const p = getPrisma();
  if (!p) {
    console.error('DATABASE_URL이 설정되지 않았습니다.');
    process.exit(1);
  }

  console.log('=== FMEA Seed Data Import ===\n');

  // 1. Users (password 제외 — 별도 초기화 필요)
  const users = loadJson<any>('01_users.json');
  if (users.length > 0) {
    const existing = await p.user.count();
    if (existing === 0) {
      await p.user.createMany({ data: users.map(u => ({ ...u, password: '$2b$10$default_hash_placeholder' })), skipDuplicates: true });
      console.log(`users:                   ${users.length} 건 생성`);
    } else {
      console.log(`users:                   ${existing} 건 (기존 유지)`);
    }
  }

  // 2. TripletGroups
  const tgs = loadJson<any>('02_triplet_groups.json');
  if (tgs.length > 0) {
    await p.tripletGroup.createMany({ data: tgs, skipDuplicates: true });
    console.log(`tripletGroup:            ${tgs.length} 건`);
  }

  // 3. FmeaProjects
  const fps = loadJson<any>('03_fmea_projects.json');
  if (fps.length > 0) {
    await p.fmeaProject.createMany({ data: fps, skipDuplicates: true });
    console.log(`fmeaProject:             ${fps.length} 건`);
  }

  // 4. SOD Criteria (S/O/D 기준표)
  const sc = loadJson<any>('04_severity_criteria.json');
  if (sc.length > 0) {
    await p.pfmeaSeverityCriteria.createMany({ data: sc, skipDuplicates: true });
    console.log(`severityCriteria:        ${sc.length} 건`);
  }
  const oc = loadJson<any>('05_occurrence_criteria.json');
  if (oc.length > 0) {
    await p.pfmeaOccurrenceCriteria.createMany({ data: oc, skipDuplicates: true });
    console.log(`occurrenceCriteria:      ${oc.length} 건`);
  }
  const dc = loadJson<any>('06_detection_criteria.json');
  if (dc.length > 0) {
    await p.pfmeaDetectionCriteria.createMany({ data: dc, skipDuplicates: true });
    console.log(`detectionCriteria:       ${dc.length} 건`);
  }

  // 5. 산업DB (예방/검출)
  const kp = loadJson<any>('07_kr_industry_prevention.json');
  if (kp.length > 0) {
    await p.krIndustryPrevention.createMany({ data: kp, skipDuplicates: true });
    console.log(`krIndustryPrevention:    ${kp.length} 건`);
  }
  const kd = loadJson<any>('08_kr_industry_detection.json');
  if (kd.length > 0) {
    await p.krIndustryDetection.createMany({ data: kd, skipDuplicates: true });
    console.log(`krIndustryDetection:     ${kd.length} 건`);
  }

  // 6. Master FMEA Reference (골든 레퍼런스)
  const mr = loadJson<any>('09_master_fmea_reference.json');
  if (mr.length > 0) {
    await p.masterFmeaReference.createMany({ data: mr, skipDuplicates: true });
    console.log(`masterFmeaReference:     ${mr.length} 건`);
  }

  // 7. Severity Usage Records (FE→S 이력)
  const sur = loadJson<any>('10_severity_usage_records.json');
  if (sur.length > 0) {
    await p.severityUsageRecord.createMany({ data: sur, skipDuplicates: true });
    console.log(`severityUsageRecord:     ${sur.length} 건`);
  }

  // 8. Special Char Master Items (특별특성)
  const scm = loadJson<any>('11_special_char_master_items.json');
  if (scm.length > 0) {
    await p.specialCharMasterItem.createMany({ data: scm, skipDuplicates: true });
    console.log(`specialCharMasterItem:   ${scm.length} 건`);
  }

  // 9. Lessons Learned (LLD 교훈)
  const ll = loadJson<any>('12_lessons_learned.json');
  if (ll.length > 0) {
    await p.lessonsLearned.createMany({ data: ll, skipDuplicates: true });
    console.log(`lessonsLearned:          ${ll.length} 건`);
  }

  console.log('\n=== Seed 완료 ===');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
