import { getPrisma } from '../src/lib/prisma';
import { initializeAdmin } from '../src/lib/services/auth-service';

async function main() {
    console.log('Starting manual Admin initialization...');
    const prisma = getPrisma();
    if (!prisma) {
        console.error('CRITICAL: Prisma instance is NULL. Check DATABASE_URL.');
        return;
    }

    try {
        const userCount = await prisma.user.count();
        console.log(`Current user count: ${userCount}`);

        await initializeAdmin();
        console.log('Manual Admin initialization step 1 finished.');

        // Check again
        const admin = await prisma.user.findFirst({
            where: { name: 'admin' }
        });

        if (admin) {
            console.log('Admin user found in DB:', admin.name, 'ID:', admin.id);
            console.log('Admin Active:', admin.isActive);
        } else {
            console.log('Admin user NOT FOUND even after initialization!');
        }
    } catch (error) {
        console.error('Error during manual initialization:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
