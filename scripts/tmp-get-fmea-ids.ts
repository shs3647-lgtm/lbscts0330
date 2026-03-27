import { PrismaClient } from '@prisma/client';
const p = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});
async function main() {
  const projects = await p.fMEAProject.findMany({ select: { id: true, name: true }, take: 5 });
  console.log(JSON.stringify(projects, null, 2));
  await p.$disconnect();
}
main().catch(async e => { console.error(e.message); await p.$disconnect(); });
