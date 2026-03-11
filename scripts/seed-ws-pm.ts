// @ts-nocheck - wsRegistration/pmRegistration 모델 미존재
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding WS and PM data...');

    // WS Data
    const wsData = [
        { wsNo: 'WS26-001', subject: 'Engine Assembly Guide', processName: 'Engine Ass\'y', revision: 'Rev.01', manager: 'Kim Engineer', status: 'active' },
        { wsNo: 'WS26-002', subject: 'Press Safety Standard', processName: 'Stamping', revision: 'Rev.02', manager: 'Lee Safety', status: 'active' },
        { wsNo: 'WS26-003', subject: 'Welding Protocol A', processName: 'Body Welding', revision: 'Rev.00', manager: 'Park Welder', status: 'draft' },
        { wsNo: 'WS26-004', subject: 'Paint Shop Inspection', processName: 'Painting', revision: 'Rev.03', manager: 'Choi Quality', status: 'active' },
        { wsNo: 'WS26-005', subject: 'Final Assembly Check', processName: 'Final Line', revision: 'Rev.01', manager: 'Kim Engineer', status: 'obsolete' },
        { wsNo: 'WS26-006', subject: 'Logistics Handling', processName: 'Warehouse', revision: 'Rev.00', manager: 'Jung Logistics', status: 'draft' },
        { wsNo: 'WS26-007', subject: 'Maintenance Safety', processName: 'General', revision: 'Rev.01', manager: 'Lee Safety', status: 'active' }
    ];

    for (const w of wsData) {
        await prisma.wsRegistration.upsert({
            where: { wsNo: w.wsNo },
            update: w,
            create: w
        });
    }

    // PM Data
    const pmData = [
        { pmNo: 'PM26-001', subject: 'Hydraulic Press #1 Check', machineName: 'Press-001', maintenanceType: 'Periodic', manager: 'Chief Kang', startDate: '2026-02-05', endDate: '2026-02-05', status: 'planned' },
        { pmNo: 'PM26-002', subject: 'Robot Arm Calibration', machineName: 'Robot-W04', maintenanceType: 'Corrective', manager: 'Eng. Kim', startDate: '2026-01-28', endDate: '2026-01-29', status: 'completed' },
        { pmNo: 'PM26-003', subject: 'Conveyor Belt Tension', machineName: 'Line-A1', maintenanceType: 'Periodic', manager: 'Tech. Park', startDate: '2026-02-10', endDate: '2026-02-10', status: 'planned' },
        { pmNo: 'PM26-004', subject: 'Cooling System Flush', machineName: 'Cooler-M2', maintenanceType: 'Preventive', manager: 'Chief Kang', startDate: '2026-01-15', endDate: '2026-01-15', status: 'completed' },
        { pmNo: 'PM26-005', subject: 'Sensor Replacement', machineName: 'Vision-X1', maintenanceType: 'Breakdown', manager: 'Eng. Lee', startDate: '2026-02-02', endDate: '2026-02-02', status: 'In Progress' },
        { pmNo: 'PM26-006', subject: 'Oil Filter Change', machineName: 'Compr-03', maintenanceType: 'Periodic', manager: 'Tech. Park', startDate: '2026-03-01', endDate: '2026-03-01', status: 'planned' },
        { pmNo: 'PM26-007', subject: 'Safety Guard Inspection', machineName: 'All Lines', maintenanceType: 'Safety', manager: 'Manager Choi', startDate: '2026-02-15', endDate: '2026-02-20', status: 'draft' }
    ];

    for (const p of pmData) {
        await prisma.pmRegistration.upsert({
            where: { pmNo: p.pmNo },
            update: p,
            create: p
        });
    }

    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
