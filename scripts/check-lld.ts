import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import 'dotenv/config'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function run() {
  const all = await prisma.lLDFilterCode.findMany({ orderBy: { lldNo: 'asc' } })
  console.log('total:', all.length)
  for (const r of all) {
    console.log(r.lldNo, '|', r.applyTo, '|', (r.improvement || '').slice(0, 50))
  }
  await prisma.$disconnect()
  pool.end()
}
run().catch(e => { console.error(e); process.exit(1) })
