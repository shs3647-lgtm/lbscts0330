@echo off
echo ========================================
echo FMEA Docker Build Script
echo ========================================
echo.

:: Docker 상태 확인
echo [1/6] Docker 상태 확인 중...
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker가 실행되지 않습니다.
    echo Docker Desktop을 시작한 후 다시 실행해주세요.
    pause
    exit /b 1
)
echo [OK] Docker가 실행 중입니다.
echo.

:: 환경 파일 확인
echo [2/6] 환경 설정 파일 확인 중...
if not exist .env (
    echo .env 파일이 없습니다. .env.docker를 복사합니다...
    copy .env.docker .env
    echo [INFO] .env 파일이 생성되었습니다.
    echo 필요한 설정을 수정한 후 다시 실행해주세요.
    pause
    exit /b 1
)
echo [OK] 환경 설정 파일이 존재합니다.
echo.

:: 기존 컨테이너 정리 (선택사항)
echo [3/6] 기존 컨테이너 확인 중...
docker compose ps >nul 2>&1
if %errorlevel% equ 0 (
    set /p cleanup="기존 컨테이너를 정리하시겠습니까? (y/n): "
    if /i "%cleanup%"=="y" (
        echo 기존 컨테이너 정리 중...
        docker compose down -v
    )
)
echo.

:: Docker 이미지 빌드
echo [4/6] Docker 이미지 빌드 중...
echo 이 작업은 5-10분 정도 소요될 수 있습니다...
docker compose build
if %errorlevel% neq 0 (
    echo [ERROR] Docker 이미지 빌드 실패
    pause
    exit /b 1
)
echo [OK] Docker 이미지 빌드 완료
echo.

:: 컨테이너 시작
echo [5/6] 컨테이너 시작 중...
docker compose up -d
if %errorlevel% neq 0 (
    echo [ERROR] 컨테이너 시작 실패
    pause
    exit /b 1
)
echo [OK] 모든 컨테이너가 시작되었습니다.
echo.

:: 헬스체크
echo [6/6] 서비스 상태 확인 중...
timeout /t 10 /nobreak >nul
docker compose ps
echo.

:: 데이터베이스 마이그레이션
echo 데이터베이스 마이그레이션을 실행하시겠습니까?
set /p migrate="첫 실행시 필수입니다 (y/n): "
if /i "%migrate%"=="y" (
    echo 마이그레이션 실행 중...
    docker compose exec app npx prisma migrate deploy
    echo [OK] 마이그레이션 완료
)
echo.

echo ========================================
echo 배포가 완료되었습니다!
echo ========================================
echo.
echo 애플리케이션 URL: http://localhost:3000
echo 관리자 계정: admin@fmea.local / admin123!@#
echo.
echo 로그 확인: docker compose logs -f
echo 종료: docker compose down
echo.
echo [주의사항]
echo 1. 관리자 비밀번호를 즉시 변경하세요
echo 2. .env 파일의 시크릿 키들을 변경하세요
echo.
pause