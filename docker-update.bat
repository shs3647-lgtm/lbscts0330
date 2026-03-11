@echo off
REM ============================================================================
REM Docker 업데이트 스크립트 (Windows)
REM
REM 용도: 로컬 개발 완료 후 Docker 환경 업데이트 (배포 전 최종 확인)
REM 실행: docker-update.bat
REM ============================================================================

setlocal enabledelayedexpansion

echo ========================================
echo 🐳 FMEA Docker 업데이트
echo ========================================
echo.

REM 시작 시간 기록
set START_TIME=%time%

REM 1. 현재 상태 확인
echo [1/5] 현재 Docker 상태 확인...
docker-compose ps
echo.

set /p CONTINUE="Docker 업데이트를 계속하시겠습니까? (y/N): "
if /i not "%CONTINUE%"=="y" (
    echo 취소되었습니다.
    exit /b 0
)

REM 2. 앱 이미지 재빌드
echo.
echo [2/5] 앱 이미지 재빌드 중...
docker-compose build app
if errorlevel 1 (
    echo ✗ 빌드 실패
    exit /b 1
)

REM 3. 스키마 변경 확인
echo.
echo [3/5] 데이터베이스 스키마 변경 여부 확인...
set /p MIGRATE="Prisma 스키마가 변경되었습니까? (y/N): "
if /i "%MIGRATE%"=="y" (
    echo 마이그레이션 실행 중...
    docker-compose --profile tools run --rm migrate
    if errorlevel 1 (
        echo ✗ 마이그레이션 실패
        exit /b 1
    )
) else (
    echo ✓ 마이그레이션 건너뜀
)

REM 4. 컨테이너 재시작
echo.
echo [4/5] 앱 컨테이너 재시작 중...
docker-compose up -d --no-deps --force-recreate app
if errorlevel 1 (
    echo ✗ 컨테이너 시작 실패
    exit /b 1
)

REM 5. Health Check 대기
echo.
echo [5/5] 컨테이너 시작 대기 (최대 30초)...
set RETRY_COUNT=0
set MAX_RETRIES=15

:HEALTH_CHECK_LOOP
if %RETRY_COUNT% geq %MAX_RETRIES% goto HEALTH_CHECK_FAILED

curl -sf http://localhost:3001/api/health >nul 2>&1
if %errorlevel%==0 (
    echo ✓ 앱이 정상적으로 시작되었습니다!
    goto HEALTH_CHECK_SUCCESS
)

set /a RETRY_COUNT+=1
echo|set /p=.
timeout /t 2 /nobreak >nul
goto HEALTH_CHECK_LOOP

:HEALTH_CHECK_FAILED
echo.
echo ✗ Health check 실패
echo.
echo 로그 확인:
docker-compose logs app --tail 50
exit /b 1

:HEALTH_CHECK_SUCCESS
echo.

REM 6. 최종 상태 확인
echo.
echo ========================================
echo ✅ Docker 업데이트 완료!
echo ========================================
echo.

REM 종료 시간 계산
set END_TIME=%time%

echo 📊 업데이트 정보:
echo   - 시작 시간: %START_TIME%
echo   - 종료 시간: %END_TIME%
echo   - 앱 URL: http://localhost:3001
echo.

REM Health check 상세 정보
echo 🏥 Health Check:
curl -s http://localhost:3001/api/health 2>nul
echo.
echo.

echo 📋 컨테이너 상태:
docker-compose ps

echo.
echo 💡 Tip: 로그 확인: docker-compose logs -f app
echo.

endlocal
