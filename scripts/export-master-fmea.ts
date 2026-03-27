/**
 * @file export-master-fmea.ts
 * @description 마스터 FMEA 데이터를 Atomic DB에서 직접 로드하여 JSON 파일로 영구 저장
 *
 * 실행: npx tsx -r tsconfig-paths/register scripts/export-master-fmea.ts pfm26-m002
 *
 * @created 2026-03-17
 */
import 'tsconfig-paths/register';
import dotenv from 'dotenv';
import path from 'path';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';
import { atomicToFlatData } from '@/app/(fmea-core)/pfmea/import/utils/atomicToFlatData';
import { atomicToChains } from '@/app/(fmea-core)/pfmea/import/utils/atomicToChains';

async function main() {
  const fmeaId = process.argv[2];
  if (!fmeaId) {
    console.error('❌ Usage: npx tsx -r tsconfig-paths/register scripts/export-master-fmea.ts <fmeaId>');
    console.error('   예: npx tsx -r tsconfig-paths/register scripts/export-master-fmea.ts pfm26-m002');
    process.exit(1);
  }

  const normalizedFmeaId = fmeaId.toLowerCase();
  console.info(`\n🔄 마스터 FMEA 내보내기 시작: ${normalizedFmeaId}\n`);

  // 1. DB 연결
  const baseUrl = getBaseDatabaseUrl();
  if (!baseUrl) {
    console.error('❌ DATABASE_URL이 설정되지 않았습니다. .env 파일을 확인하세요.');
    process.exit(1);
  }

  const schema = getProjectSchemaName(normalizedFmeaId);
  console.info(`📂 스키마: ${schema}`);

  await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
  const prisma = getPrismaForSchema(schema);

  if (!prisma) {
    console.error('❌ Prisma client 생성 실패');
    process.exit(1);
  }

  // 2. Atomic DB 전체 로드
  console.info('📥 Atomic DB 로드 중...');

  const [
    l1Structure,
    l2Structures,
    l3Structures,
    l1Functions,
    l2Functions,
    l3Functions,
    failureEffects,
    failureModes,
    failureCauses,
    failureLinks,
    failureAnalyses,
    riskAnalyses,
    optimizations,
    processProductChars,
  ] = await Promise.all([
    prisma.l1Structure.findFirst({ where: { fmeaId: normalizedFmeaId } }),
    prisma.l2Structure.findMany({ where: { fmeaId: normalizedFmeaId }, orderBy: { order: 'asc' } }),
    prisma.l3Structure.findMany({ where: { fmeaId: normalizedFmeaId }, orderBy: { order: 'asc' } }),
    prisma.l1Function.findMany({ where: { fmeaId: normalizedFmeaId } }),
    prisma.l2Function.findMany({ where: { fmeaId: normalizedFmeaId } }),
    prisma.l3Function.findMany({ where: { fmeaId: normalizedFmeaId } }),
    prisma.failureEffect.findMany({ where: { fmeaId: normalizedFmeaId } }),
    prisma.failureMode.findMany({ where: { fmeaId: normalizedFmeaId } }),
    prisma.failureCause.findMany({ where: { fmeaId: normalizedFmeaId } }),
    prisma.failureLink.findMany({ where: { fmeaId: normalizedFmeaId } }),
    prisma.failureAnalysis.findMany({ where: { fmeaId: normalizedFmeaId } }).catch(() => []),
    prisma.riskAnalysis.findMany({ where: { fmeaId: normalizedFmeaId } }),
    prisma.optimization.findMany({ where: { fmeaId: normalizedFmeaId } }).catch(() => []),
    prisma.processProductChar.findMany({ where: { fmeaId: normalizedFmeaId } }).catch(() => []),
  ]);

  if (l2Structures.length === 0) {
    console.error(`❌ Atomic DB에 데이터가 없습니다: ${normalizedFmeaId}`);
    process.exit(1);
  }

  console.info('✅ DB 로드 완료');

  // 3. FMEAWorksheetDB 형태로 조합
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = {
    fmeaId: normalizedFmeaId,
    savedAt: new Date().toISOString(),
    l1Structure,
    l2Structures,
    l3Structures,
    l1Functions,
    l2Functions,
    l3Functions,
    failureEffects,
    failureModes,
    failureCauses,
    failureLinks,
    failureAnalyses,
    riskAnalyses,
    optimizations,
    confirmed: {
      structure: true, l1Function: true, l2Function: true, l3Function: true,
      l1Failure: true, l2Failure: true, l3Failure: true,
      failureLink: true, risk: true, optimization: true,
    },
  };

  // 4. 역변환: DB → flatData + chains
  console.info('🔄 atomicToFlatData 역변환 중...');
  const { flatData, idRemap } = atomicToFlatData(db, { fmeaId: normalizedFmeaId });
  console.info(`   flatData: ${flatData.length}건`);

  console.info('🔄 atomicToChains 역변환 중...');
  const chains = atomicToChains(db, idRemap);
  console.info(`   chains: ${chains.length}건`);

  // 5. 통계 산출
  const stats = {
    fmeaId: normalizedFmeaId,
    exportedAt: new Date().toISOString(),
    l2Count: l2Structures.length,
    l3Count: l3Structures.length,
    l1FunctionCount: l1Functions.length,
    l2FunctionCount: l2Functions.length,
    l3FunctionCount: l3Functions.length,
    feCount: failureEffects.length,
    fmCount: failureModes.length,
    fcCount: failureCauses.length,
    linkCount: failureLinks.length,
    riskCount: riskAnalyses.length,
    optimizationCount: optimizations.length,
    processProductCharCount: processProductChars.length,
    flatDataCount: flatData.length,
    chainCount: chains.length,
  };

  // 6. 통계 출력
  console.info('\n' + '═'.repeat(60));
  console.info('  📊 마스터 FMEA 데이터 통계');
  console.info('═'.repeat(60));
  console.info(`  FMEA ID:          ${normalizedFmeaId}`);
  console.info(`  L1 (완제품):       ${l1Structure ? '1건' : '없음'}`);
  console.info(`  L2 (공정):         ${stats.l2Count}건`);
  console.info(`  L3 (작업요소):     ${stats.l3Count}건`);
  console.info('─'.repeat(60));
  console.info(`  L1 기능:           ${stats.l1FunctionCount}건`);
  console.info(`  L2 기능:           ${stats.l2FunctionCount}건`);
  console.info(`  L3 기능:           ${stats.l3FunctionCount}건`);
  console.info('─'.repeat(60));
  console.info(`  고장영향(FE):      ${stats.feCount}건`);
  console.info(`  고장형태(FM):      ${stats.fmCount}건`);
  console.info(`  고장원인(FC):      ${stats.fcCount}건`);
  console.info(`  고장연결(Link):    ${stats.linkCount}건`);
  console.info('─'.repeat(60));
  console.info(`  위험분석(Risk):    ${stats.riskCount}건`);
  console.info(`  최적화(Opt):       ${stats.optimizationCount}건`);
  console.info(`  제품특성(PC):      ${stats.processProductCharCount}건`);
  console.info('─'.repeat(60));
  console.info(`  FlatData:          ${stats.flatDataCount}건`);
  console.info(`  Chains:            ${stats.chainCount}건`);
  console.info('═'.repeat(60) + '\n');

  // 7. JSON 파일 저장
  const masterDir = path.join(process.cwd(), 'data', 'master-fmea');
  if (!existsSync(masterDir)) {
    mkdirSync(masterDir, { recursive: true });
  }

  const exportData = {
    fmeaId: normalizedFmeaId,
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
    atomicDB: {
      l1Structure,
      l2Structures,
      l3Structures,
      l1Functions,
      l2Functions,
      l3Functions,
      failureEffects,
      failureModes,
      failureCauses,
      failureLinks,
      failureAnalyses,
      riskAnalyses,
      optimizations,
      processProductChars,
    },
    flatData,
    chains,
    stats,
  };

  const jsonPath = path.join(masterDir, `${normalizedFmeaId}.json`);
  writeFileSync(jsonPath, JSON.stringify(exportData, null, 2), 'utf-8');
  console.info(`✅ 마스터 데이터 저장: ${jsonPath}`);

  const statsPath = path.join(masterDir, `${normalizedFmeaId}-stats.json`);
  writeFileSync(statsPath, JSON.stringify(stats, null, 2), 'utf-8');
  console.info(`✅ 통계 저장: ${statsPath}`);

  const fileSizeMB = (Buffer.byteLength(JSON.stringify(exportData)) / 1024 / 1024).toFixed(2);
  console.info(`📦 파일 크기: ${fileSizeMB} MB`);

  console.info('\n🎉 마스터 FMEA 내보내기 완료!\n');
}

main().catch((err) => {
  console.error('❌ 스크립트 실행 실패:', err instanceof Error ? err.message : String(err));
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});
