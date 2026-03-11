import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function check() {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true
            }
        });

        console.log('--- Current Users in DB ---');
        console.table(users);

        const admin = users.find(u => u.name === 'admin' || u.email === 'admin@fmea.local');
        if (admin) {
            console.log('Admin found:', admin.name, '(', admin.email, ')');
            console.log('Role:', admin.role);
            console.log('Active:', admin.isActive);
        } else {
            console.log('Admin NOT found in DB!');
        }
    } catch (e) {
        console.error('Error checking DB:', e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
