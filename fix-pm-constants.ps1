# PM 모듈 상수명 수정 스크립트
# PFD_COLUMNS -> PM_COLUMNS로 일괄 변경

$targetDir = "src\app\pm\worksheet"
$files = Get-ChildItem -Path $targetDir -Recurse -Include *.tsx,*.ts -File

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    
    # 상수명 변경
    $content = $content -replace 'PFD_COLUMNS', 'PM_COLUMNS'
    $content = $content -replace 'PfdColumnDef', 'PmColumnDef'
    
    [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
    Write-Host "Updated: $($file.FullName)"
}

Write-Host "`nConstant name update completed!"
