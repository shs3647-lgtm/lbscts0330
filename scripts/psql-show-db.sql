-- DB 스키마 및 테이블 확인

-- 1. 스키마 목록
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
ORDER BY schema_name;

-- 2. pfmea_pfm26_m001 스키마의 테이블 목록
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'pfmea_pfm26_m001'
ORDER BY table_name;

-- 3. FmeaInfo 테이블 데이터 조회
SET search_path TO pfmea_pfm26_m001;
SELECT * FROM "FmeaInfo";











