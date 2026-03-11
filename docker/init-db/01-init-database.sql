-- FMEA 데이터베이스 초기화 스크립트
-- PostgreSQL 15+

-- 확장 기능 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 기본 스키마 생성
CREATE SCHEMA IF NOT EXISTS public;

-- 역할 및 권한 설정
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fmea_app') THEN
        CREATE ROLE fmea_app WITH LOGIN PASSWORD 'fmea_app_password';
    END IF;
END$$;

GRANT ALL PRIVILEGES ON SCHEMA public TO fmea_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO fmea_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO fmea_app;

-- 기본 테이블스페이스 설정
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL ON TABLES TO fmea_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL ON SEQUENCES TO fmea_app;

-- 성능 최적화 설정
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;

-- 연결 설정
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET max_prepared_transactions = 100;

-- 타임존 설정
ALTER SYSTEM SET timezone = 'Asia/Seoul';

-- 로깅 설정
ALTER SYSTEM SET log_statement = 'mod';
ALTER SYSTEM SET log_duration = on;
ALTER SYSTEM SET log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h ';
ALTER SYSTEM SET log_checkpoints = on;
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
ALTER SYSTEM SET log_lock_waits = on;
ALTER SYSTEM SET log_temp_files = 0;

-- 설정 적용
SELECT pg_reload_conf();