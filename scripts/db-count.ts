import { getPrisma } from '@/lib/prisma';

async function main() {
  const p = getPrisma();
  if (!p) { console.log("no prisma"); return; }
  
  const models: [string, () => Promise<number>][] = [
    ["tripletGroup", () => p.tripletGroup.count()],
    ["fmeaProject", () => p.fmeaProject.count()],
    ["user", () => p.user.count()],
    ["severityCriteria", () => p.pfmeaSeverityCriteria.count()],
    ["occurrenceCriteria", () => p.pfmeaOccurrenceCriteria.count()],
    ["detectionCriteria", () => p.pfmeaDetectionCriteria.count()],
    ["masterFmeaRef", () => p.masterFmeaReference.count()],
    ["krIndustryPrev", () => p.krIndustryPrevention.count()],
    ["krIndustryDet", () => p.krIndustryDetection.count()],
    ["lldFilterCode", () => p.lldFilterCode.count()],
    ["severityUsageRec", () => p.severityUsageRecord.count()],
    ["improvementPlan", () => p.continuousImprovementPlan.count()],
    ["lessonsLearned", () => p.lessonsLearned.count()],
    ["cftPublicMember", () => p.cftPublicMember.count()],
    ["specialCharItem", () => p.specialCharMasterItem.count()],
  ];
  
  for (const [name, fn] of models) {
    try {
      const c = await fn();
      console.log(`${name.padEnd(25)} ${c}`);
    } catch {
      console.log(`${name.padEnd(25)} ERR`);
    }
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
