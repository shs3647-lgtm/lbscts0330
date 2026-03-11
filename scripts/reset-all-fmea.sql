-- FMEA 완전 초기화 스크립트
-- 모든 pfmea_ 스키마 삭제

DO $$
DECLARE
    schema_record RECORD;
BEGIN
    FOR schema_record IN 
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name LIKE 'pfmea_%'
    LOOP
        EXECUTE 'DROP SCHEMA IF EXISTS "' || schema_record.schema_name || '" CASCADE';
        RAISE NOTICE 'Dropped schema: %', schema_record.schema_name;
    END LOOP;
END $$;

-- 확인
SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'pfmea_%';











