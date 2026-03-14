// scripts/validate-fk.ts
// Import 후 FK 정합성 검증 — 고아 엔티티 탐지
// 실행: npx ts-node scripts/validate-fk.ts [processId]

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function validateFK(processId?: string) {
  const where = processId ? { processId } : {}
  const errors: string[] = []

  console.log('=== FK 정합성 검증 시작 ===\n')

  // 1. productCharId 없는 FailureMode (필수 FK 누락)
  const orphanFMs = await prisma.failureMode.findMany({
    where: { ...where, productCharId: null as any },
    select: { id: true, name: true },
  })
  if (orphanFMs.length > 0) {
    errors.push(`[오류] productCharId 없는 FailureMode ${orphanFMs.length}건`)
    orphanFMs.forEach(fm => console.log(`  - FM: ${fm.name} (${fm.id})`))
  }

  // 2. FM이 없는 ProcessProductChar (고아 A4)
  const allPCs = await prisma.processProductChar.findMany({
    where,
    include: { failureModes: { select: { id: true } } },
  })
  const orphanPCs = allPCs.filter(pc => pc.failureModes.length === 0)
  if (orphanPCs.length > 0) {
    errors.push(`[경고] FM이 없는 ProcessProductChar(고아 A4) ${orphanPCs.length}건`)
    orphanPCs.forEach(pc => console.log(`  - PC: ${pc.name} (${pc.id})`))
  }

  // 3. CP와 PFMEA productCharId 불일치
  const cps = await prisma.controlPlan.findMany({
    where,
    select: { id: true, productCharId: true },
  })
  const pcIds = new Set(allPCs.map(pc => pc.id))
  const mismatched = cps.filter(cp => !pcIds.has(cp.productCharId))
  if (mismatched.length > 0) {
    errors.push(`[오류] PFMEA에 없는 productCharId 참조하는 CP ${mismatched.length}건`)
  }

  // 4. functionId 없는 FailureMode
  const noFnFMs = await prisma.failureMode.findMany({
    where: { ...where, functionId: null as any },
    select: { id: true, name: true },
  })
  if (noFnFMs.length > 0) {
    errors.push(`[오류] functionId 없는 FailureMode ${noFnFMs.length}건`)
  }

  // 결과 출력
  console.log('\n=== 검증 결과 ===')
  if (errors.length === 0) {
    console.log('모든 FK 정합성 통과')
  } else {
    errors.forEach(e => console.log(e))
    process.exit(1)
  }

  await prisma.$disconnect()
}

const processId = process.argv[2]
validateFK(processId).catch(console.error)
