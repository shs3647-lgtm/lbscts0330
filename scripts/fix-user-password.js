const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function fixPassword() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log('DATABASE_URL not set');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: dbUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const user = await prisma.user.findFirst({ where: { email: 'shs3647@daum.net' } });
  if (!user) {
    console.log('User not found');
    await prisma.$disconnect();
    await pool.end();
    return;
  }
  console.log('Found user:', user.name, user.email, user.phone);
  console.log('Current password hash (first 20):', (user.password || '').substring(0, 20));

  const phoneDigits = (user.phone || '').replace(/\D/g, '');
  console.log('Phone digits:', phoneDigits);

  const newHash = await bcrypt.hash(phoneDigits, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: newHash }
  });
  console.log('Password updated to bcrypt hash');

  const isValid = await bcrypt.compare(phoneDigits, newHash);
  console.log('Verification:', isValid);

  await prisma.$disconnect();
  await pool.end();
}

fixPassword().catch(e => { console.error(e); process.exit(1); });
