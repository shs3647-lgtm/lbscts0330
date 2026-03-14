#!/bin/bash
# check-cartesian.sh
# buildWorksheetState.ts에서 카테시안 복제 패턴을 자동 탐지

TARGET=${1:-"src"}

echo "=== 카테시안 복제 패턴 탐지 ==="
echo ""

echo "[1] a4Items.map() 내부 id: uid() 호출 (카테시안 복제 핵심 패턴)"
grep -rn "a4Items\.map\|a4Items\.forEach" $TARGET --include="*.ts" -A3 | grep -i "uid()\|uuidv4()"
echo ""

echo "[2] productChars 내부 id 생성 (복제 위험)"
grep -rn "productChars.*id.*uid\|id.*uid.*productChar" $TARGET --include="*.ts"
echo ""

echo "[3] distribute() 호출 위치"
grep -rn "distribute(" $TARGET --include="*.ts"
echo ""

echo "[4] functions\[0\].productChars 참조 (부분 참조 버그)"
grep -rn "functions\[0\]\.productChars\|functions\[0\]\?\.productChars" $TARGET --include="*.ts"
echo ""

echo "[5] prisma.\$transaction 미적용 Import route 탐지"
grep -rn "createMany\|create(" $TARGET/app/api --include="*.ts" -l | xargs grep -L "\$transaction" 2>/dev/null
echo ""

echo "=== 탐지 완료 ==="
echo "결과가 있으면 해당 위치를 fmea-bug-fix 스킬의 DIAGNOSE 단계에 따라 수정하세요."
