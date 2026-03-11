import { PrismaClient } from '@prisma/client';
const p = new PrismaClient({});
// Check if lLDFilterCode accessor exists
console.log('lLDFilterCode exists:', typeof (p as any).lLDFilterCode);
console.log('lessonsLearned exists:', typeof (p as any).lessonsLearned);
// Try to count
try {
  const count = await (p as any).lLDFilterCode.count();
  console.log('LLDFilterCode count:', count);
} catch (e: any) {
  console.error('LLDFilterCode error:', e.message?.substring(0, 100));
}
try {
  const count = await (p as any).lessonsLearned.count();
  console.log('LessonsLearned count:', count);
} catch (e: any) {
  console.error('LessonsLearned error:', e.message?.substring(0, 100));
}
await p.$disconnect();
