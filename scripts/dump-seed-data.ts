import { getPrisma } from '@/lib/prisma';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const p = getPrisma();
  if (!p) { console.error("no prisma"); process.exit(1); }

  const seedDir = path.join(process.cwd(), 'prisma/seed-data');
  if (!fs.existsSync(seedDir)) fs.mkdirSync(seedDir, { recursive: true });

  const dumps: [string, string, () => Promise<unknown[]>][] = [
    ['01_users.json', 'user', () => p.user.findMany({ select: { id: true, name: true, role: true, department: true, email: true, isActive: true, factory: true, position: true, phone: true } })],
    ['02_triplet_groups.json', 'tripletGroup', () => p.tripletGroup.findMany()],
    ['03_fmea_projects.json', 'fmeaProject', () => p.fmeaProject.findMany()],
    ['04_severity_criteria.json', 'severityCriteria', () => p.pfmeaSeverityCriteria.findMany({ orderBy: { rating: 'asc' } })],
    ['05_occurrence_criteria.json', 'occurrenceCriteria', () => p.pfmeaOccurrenceCriteria.findMany({ orderBy: { rating: 'asc' } })],
    ['06_detection_criteria.json', 'detectionCriteria', () => p.pfmeaDetectionCriteria.findMany({ orderBy: { rating: 'asc' } })],
    ['07_kr_industry_prevention.json', 'krIndustryPrev', () => p.krIndustryPrevention.findMany()],
    ['08_kr_industry_detection.json', 'krIndustryDet', () => p.krIndustryDetection.findMany()],
    ['09_master_fmea_reference.json', 'masterFmeaRef', () => p.masterFmeaReference.findMany()],
    ['10_severity_usage_records.json', 'severityUsageRec', () => p.severityUsageRecord.findMany()],
    ['11_special_char_master_items.json', 'specialCharItem', () => p.specialCharMasterItem.findMany()],
    ['12_lessons_learned.json', 'lessonsLearned', () => p.lessonsLearned.findMany()],
  ];

  for (const [filename, label, fn] of dumps) {
    try {
      const data = await fn();
      const filePath = path.join(seedDir, filename);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`${filename.padEnd(40)} ${(data as unknown[]).length} 건`);
    } catch (e: any) {
      console.log(`${filename.padEnd(40)} ERR: ${e.message?.substring(0, 50)}`);
    }
  }

  console.log('\nDone! → prisma/seed-data/');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
