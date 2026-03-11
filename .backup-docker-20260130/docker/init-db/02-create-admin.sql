-- 기본 관리자 계정 생성 스크립트
-- 첫 실행 시 자동으로 관리자 계정을 생성합니다

-- 사용자 테이블이 있는지 확인 후 기본 관리자 생성
DO $$
BEGIN
    -- Prisma migration이 완료된 후 실행되도록 대기
    PERFORM pg_sleep(5);

    -- users 테이블이 존재하는지 확인
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        -- 기본 관리자가 없으면 생성
        IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@fmea.local') THEN
            INSERT INTO users (
                id,
                email,
                name,
                password,
                role,
                department,
                position,
                created_at,
                updated_at,
                is_active,
                last_login
            ) VALUES (
                gen_random_uuid(),
                'admin@fmea.local',
                '시스템 관리자',
                crypt('admin123!@#', gen_salt('bf')), -- 초기 비밀번호: admin123!@#
                'ADMIN',
                '정보시스템팀',
                '관리자',
                NOW(),
                NOW(),
                true,
                NULL
            );

            RAISE NOTICE '기본 관리자 계정이 생성되었습니다. (admin@fmea.local / admin123!@#)';
        ELSE
            RAISE NOTICE '관리자 계정이 이미 존재합니다.';
        END IF;
    END IF;
END$$;

-- 시스템 설정 초기값
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_settings') THEN
        -- SMTP 기본 설정
        INSERT INTO system_settings (key, value, category, description, created_at, updated_at)
        VALUES
            ('smtp_enabled', 'false', 'email', 'SMTP 활성화 여부', NOW(), NOW()),
            ('smtp_host', '', 'email', 'SMTP 서버 주소', NOW(), NOW()),
            ('smtp_port', '587', 'email', 'SMTP 포트', NOW(), NOW()),
            ('smtp_secure', 'false', 'email', 'SMTP 보안 연결', NOW(), NOW()),
            ('smtp_user', '', 'email', 'SMTP 사용자명', NOW(), NOW()),
            ('smtp_from', 'noreply@fmea.local', 'email', '발신자 이메일', NOW(), NOW()),
            ('smtp_from_name', 'FMEA System', 'email', '발신자 이름', NOW(), NOW()),

            -- 시스템 기본 설정
            ('system_name', 'FMEA Management System', 'system', '시스템 이름', NOW(), NOW()),
            ('system_version', '1.0.0', 'system', '시스템 버전', NOW(), NOW()),
            ('maintenance_mode', 'false', 'system', '유지보수 모드', NOW(), NOW()),
            ('allow_registration', 'false', 'system', '사용자 등록 허용', NOW(), NOW()),
            ('session_timeout', '3600', 'system', '세션 타임아웃 (초)', NOW(), NOW()),
            ('max_login_attempts', '5', 'security', '최대 로그인 시도 횟수', NOW(), NOW()),
            ('password_min_length', '8', 'security', '최소 비밀번호 길이', NOW(), NOW()),
            ('password_require_special', 'true', 'security', '특수문자 필수 여부', NOW(), NOW()),

            -- 파일 업로드 설정
            ('max_file_size', '10485760', 'file', '최대 파일 크기 (bytes)', NOW(), NOW()),
            ('allowed_file_types', 'pdf,xlsx,xls,doc,docx,png,jpg,jpeg', 'file', '허용 파일 확장자', NOW(), NOW()),

            -- 백업 설정
            ('backup_enabled', 'true', 'backup', '자동 백업 활성화', NOW(), NOW()),
            ('backup_schedule', '0 2 * * *', 'backup', '백업 스케줄 (cron)', NOW(), NOW()),
            ('backup_retention_days', '30', 'backup', '백업 보관 기간 (일)', NOW(), NOW())
        ON CONFLICT (key) DO NOTHING;

        RAISE NOTICE '시스템 설정이 초기화되었습니다.';
    END IF;
END$$;