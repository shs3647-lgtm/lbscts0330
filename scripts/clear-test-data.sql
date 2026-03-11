-- 테스트 데이터 삭제 (test, e2e, parent 등 포함된 ID)
DELETE FROM "ProjectLinkage" WHERE "apqpNo" LIKE '%test%' OR "apqpNo" LIKE '%e2e%';
DELETE FROM "FmeaRegistration" WHERE "fmeaId" LIKE '%test%' OR "fmeaId" LIKE '%e2e%';
DELETE FROM "FmeaProject" WHERE "fmeaId" LIKE '%test%' OR "fmeaId" LIKE '%e2e%';
DELETE FROM "CpRegistration" WHERE "cpNo" LIKE '%test%' OR "cpNo" LIKE '%e2e%';
DELETE FROM "PfdRegistration" WHERE "pfdNo" LIKE '%test%' OR "pfdNo" LIKE '%e2e%';
DELETE FROM "ApqpCftMember" WHERE "apqpNo" LIKE '%test%' OR "apqpNo" LIKE '%e2e%';
DELETE FROM "ApqpRegistration" WHERE "apqpNo" LIKE '%test%' OR "apqpNo" LIKE '%e2e%';
