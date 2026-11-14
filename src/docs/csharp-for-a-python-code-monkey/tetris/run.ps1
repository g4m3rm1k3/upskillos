param(
    [ValidateSet('01','02','03','04','05','06','07','08','09','10')]
    [string]$Stage = '10'
)

$ErrorActionPreference = 'Stop'
dotnet run --project "$PSScriptRoot/Tetris.csproj" --property:Stage=$Stage --property:Platform=x64 --no-launch-profile
if ($LASTEXITCODE -ne 0) { throw "Stage $Stage failed with exit code $LASTEXITCODE" }
