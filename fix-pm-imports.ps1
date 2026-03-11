# PM 모듈 import 경로 수정 스크립트
# pfdConstants -> pmConstants로 일괄 변경

$targetDir = "src\app\pm\worksheet"
$files = Get-ChildItem -Path $targetDir -Recurse -Include *.tsx,*.ts -File

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    
    # import 경로 수정
    $content = $content -replace "from '\.\./pfdConstants'", "from '../pmConstants'"
    $content = $content -replace "from '\./pfdConstants'", "from './pmConstants'"
    $content = $content -replace '@file pfdConstants\.ts', '@file pmConstants.ts'
    
    [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
    Write-Host "Updated: $($file.FullName)"
}

Write-Host "`nImport path update completed!"
