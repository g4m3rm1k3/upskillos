param([switch]$OfflineAudit)

$ErrorActionPreference = 'Stop'
$auditArguments = @()
if ($OfflineAudit) { $auditArguments = @('--property:NuGetAudit=false') }

$lessons = @(Get-ChildItem "$PSScriptRoot/.." -Filter '*.md' | Sort-Object Name)
foreach ($number in 1..10) {
    $stage = $number.ToString('00')
    $lesson = Get-Content -LiteralPath $lessons[$number + 1].FullName -Raw
    foreach ($source in Get-ChildItem "$PSScriptRoot/checkpoints/$stage" -File) {
        $text = (Get-Content -LiteralPath $source.FullName -Raw).Trim()
        if (!$lesson.Contains($text)) { throw "Lesson source differs from checkpoint $stage / $($source.Name)" }
    }
    Write-Output "SOURCE PASS: checkpoint $stage matches its lesson"
    dotnet build "$PSScriptRoot/Tetris.csproj" --property:Stage=$stage --property:Platform=x64 --verbosity:quiet @auditArguments
    if ($LASTEXITCODE -ne 0) { throw "Build failed for checkpoint $stage" }
    Write-Output "BUILD PASS: checkpoint $stage"
}

dotnet run --project "$PSScriptRoot/checks/Checks.csproj" --verbosity:quiet @auditArguments
if ($LASTEXITCODE -ne 0) { throw 'Game rules checks failed' }
