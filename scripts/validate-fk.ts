// scripts/validate-fk.ts
// Import 후 FK 정합성 검증 — 고아 엔티티 탐지
// 실행: npx ts-node scripts/validate-fk.ts [fmeaId]

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function validateFK(fmeaId?: string) {
  const where = fmeaId ? { fmeaId } : {}
  const errors: string[] = []

  console.log('=== FK 정합성 검증 시작 ===\n')

  // 1. productCharId 없는 FailureMode (필수 FK 누락)
  const orphanFMs = await prisma.failureMode.findMany({
    where: { ...where, productCharId: null as any },
    select: { id: true, mode: true },
  })
  if (orphanFMs.length > 0) {
    errors.push(`[오류] productCharId 없는 FailureMode ${orphanFMs.length}건`)
    orphanFMs.forEach(fm => console.log(`  - FM: ${fm.mode} (${fm.id})`))
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

  // 3. CP fmeaId 불일치 검증
  if (fmeaId) {
    const cps = await prisma.controlPlan.findMany({
      where: { fmeaId },
      select: { id: true, cpNo: true },
    })
    if (cps.length === 0) {
      errors.push(`[경고] fmeaId=${fmeaId}에 대한 ControlPlan 없음`)
    }
  }

  // 4. l2FuncId 없는 FailureMode
  const noFnFMs = await prisma.failureMode.findMany({
    where: { ...where, l2FuncId: null as any },
    select: { id: true, mode: true },
  })
  if (noFnFMs.length > 0) {
    errors.push(`[오류] l2FuncId 없는 FailureMode ${noFnFMs.length}건`)
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

const fmeaId = process.argv[2]
validateFK(fmeaId).catch(console.error)
