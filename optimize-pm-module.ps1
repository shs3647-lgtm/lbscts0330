# PM 모듈 파일명 및 import 경로 업데이트 스크립트

$targetDir = "src\app\pm\worksheet"

# page.tsx 파일의 import 경로 수정
$pageFile = Join-Path $targetDir "page.tsx"
if (Test-Path $pageFile) {
    $content = Get-Content $pageFile -Raw -Encoding UTF8
    
    # import 경로 수정
    $content = $content -replace './pfdConstants', './pmConstants'
    $content = $content -replace './pfdIdUtils', './pmIdUtils'
    $content = $content -replace 'PFD_COLUMNS', 'PM_COLUMNS'
    $content = $content -replace 'PfdState', 'PmState'
    $content = $content -replace 'PfdItem', 'PmItem'
    $content = $content -replace 'pfdNo', 'pmNo'
    $content = $content -replace 'PfdNo', 'PmNo'
    
    [System.IO.File]::WriteAllText($pageFile, $content, [System.Text.Encoding]::UTF8)
    Write-Host "Updated: $pageFile"
}

# types.ts 파일 수정
$typesFile = Join-Path $targetDir "types.ts"
if (Test-Path $typesFile) {
    $content = Get-Content $typesFile -Raw -Encoding UTF8
    
    $content = $content -replace 'PfdState', 'PmState'
    $content = $content -replace 'PfdItem', 'PmItem'
    $content = $content -replace 'pfdNo', 'pmNo'
    
    [System.IO.File]::WriteAllText($typesFile, $content, [System.Text.Encoding]::UTF8)
    Write-Host "Updated: $typesFile"
}

# pmConstants.ts 파일 수정
$constantsFile = Join-Path $targetDir "pmConstants.ts"
if (Test-Path $constantsFile) {
    $content = Get-Content $constantsFile -Raw -Encoding UTF8
    
    $content = $content -replace 'PFD_COLUMNS', 'PM_COLUMNS'
    $content = $content -replace 'PfdItem', 'PmItem'
    
    [System.IO.File]::WriteAllText($constantsFile, $content, [System.Text.Encoding]::UTF8)
    Write-Host "Updated: $constantsFile"
}

# pmIdUtils.ts 파일 수정
$idUtilsFile = Join-Path $targetDir "pmIdUtils.ts"
if (Test-Path $idUtilsFile) {
    $content = Get-Content $idUtilsFile -Raw -Encoding UTF8
    
    $content = $content -replace 'pfdNo', 'pmNo'
    $content = $content -replace 'PfdNo', 'PmNo'
    
    [System.IO.File]::WriteAllText($idUtilsFile, $content, [System.Text.Encoding]::UTF8)
    Write-Host "Updated: $idUtilsFile"
}

# utils/index.ts 파일 수정
$utilsFile = Join-Path $targetDir "utils\index.ts"
if (Test-Path $utilsFile) {
    $content = Get-Content $utilsFile -Raw -Encoding UTF8
    
    $content = $content -replace 'PfdItem', 'PmItem'
    
    [System.IO.File]::WriteAllText($utilsFile, $content, [System.Text.Encoding]::UTF8)
    Write-Host "Updated: $utilsFile"
}

Write-Host "`nPM module optimization completed!"
