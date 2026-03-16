// Direct patch: pfm26-m037 FmeaLegacyData l1 SP/USER 요구사항 재배분
// SP func[0](고객 납품 기준): placeholder → 4개 이동
// USER func[0](최종 사용자 전기적): placeholder → 1개 이동
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const legacy = await prisma.fmeaLegacyData.findFirst({
    where: { fmeaId: 'pfm26-m037' },
    select: { id: true, data: true }
  });
  if (!legacy) { console.error('pfm26-m037 FmeaLegacyData not found'); process.exit(1); }

  const data = JSON.parse(JSON.stringify(legacy.data));
  const l1 = data.l1;
  const types = l1?.types || [];

  // SP 수정: func[1] 6개 → func[0]=4개(납품 관련), func[1]=2개(순도/IMC)
  const sp = types.find(t => t.name === 'SP');
  if (!sp) { console.error('SP type not found'); process.exit(1); }
  const spFunc0 = sp.functions[0]; // 고객 납품 기준
  const spFunc1 = sp.functions[1]; // 고객 기능 안정성

  console.log('SP before:');
  console.log('  func[0]:', spFunc0.name?.substring(0,40), '→', spFunc0.requirements.map(r => r.name?.substring(0,30)));
  console.log('  func[1]:', spFunc1.name?.substring(0,40), '→', spFunc1.requirements.map(r => r.name?.substring(0,30)));

  const DELIVERY_PREFIXES = ['Au Bump 높이 고객 출하', 'Au Bump 외관 고객', '고객 납품 파티클', '포장 기준 적합성'];
  const func1AllReqs = [...spFunc1.requirements];
  const toMove = func1AllReqs.filter(r => DELIVERY_PREFIXES.some(p => r.name?.startsWith(p)));
  const toKeep = func1AllReqs.filter(r => !DELIVERY_PREFIXES.some(p => r.name?.startsWith(p)));

  // func[0]에 4개 이동 (placeholder 제거 후)
  spFunc0.requirements = toMove;
  spFunc1.requirements = toKeep;

  console.log('SP after:');
  console.log('  func[0]:', spFunc0.requirements.length, 'reqs');
  console.log('  func[1]:', spFunc1.requirements.length, 'reqs');

  // USER 수정: func[1] 3개 → func[0]=1개(전기적 신뢰성), func[1]=2개(ESD/RoHS)
  const user = types.find(t => t.name === 'USER');
  if (!user) { console.error('USER type not found'); process.exit(1); }
  const userFunc0 = user.functions[0]; // 최종 사용자 전기적
  const userFunc1 = user.functions[1]; // RoHS 등 환경

  console.log('USER before:');
  console.log('  func[0]:', userFunc0.name?.substring(0,40), '→', userFunc0.requirements.map(r => r.name?.substring(0,30)));
  console.log('  func[1]:', userFunc1.name?.substring(0,40), '→', userFunc1.requirements.map(r => r.name?.substring(0,30)));

  const ELECTRIC_PREFIX = 'Au Bump 전기적 신뢰성';
  const func1AllUser = [...userFunc1.requirements];
  const toMoveUser = func1AllUser.filter(r => r.name?.startsWith(ELECTRIC_PREFIX));
  const toKeepUser = func1AllUser.filter(r => !r.name?.startsWith(ELECTRIC_PREFIX));

  userFunc0.requirements = toMoveUser;
  userFunc1.requirements = toKeepUser;

  console.log('USER after:');
  console.log('  func[0]:', userFunc0.requirements.length, 'reqs');
  console.log('  func[1]:', userFunc1.requirements.length, 'reqs');

  // Save back
  await prisma.fmeaLegacyData.update({
    where: { id: legacy.id },
    data: { data }
  });
  console.log('\n✅ Saved');
}

main().then(() => pool.end()).catch(e => { console.error(e.message); pool.end(); process.exit(1); });
