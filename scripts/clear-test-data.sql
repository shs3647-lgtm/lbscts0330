-- 테스트 데이터 삭제 (test, e2e, parent 등 포함된 ID)
DELETE FROM project_linkages WHERE "apqpNo" LIKE '%test%' OR "apqpNo" LIKE '%e2e%';
DELETE FROM fmea_registrations WHERE "fmeaId" LIKE '%test%' OR "fmeaId" LIKE '%e2e%';
DELETE FROM fmea_projects WHERE "fmeaId" LIKE '%test%' OR "fmeaId" LIKE '%e2e%';
DELETE FROM control_plans WHERE "cpNo" LIKE '%test%' OR "cpNo" LIKE '%e2e%';
DELETE FROM pfd_registrations WHERE "pfdNo" LIKE '%test%' OR "pfdNo" LIKE '%e2e%';
DELETE FROM apqp_projects WHERE "apqpNo" LIKE '%test%' OR "apqpNo" LIKE '%e2e%';
