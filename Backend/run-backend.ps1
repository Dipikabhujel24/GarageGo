param(
    [switch]$NoBuild
)

$ErrorActionPreference = 'Stop'

$projectPath = Join-Path $PSScriptRoot 'Backend.csproj'

Write-Host 'Stopping stale Backend processes...'
Get-Process -Name Backend -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host 'Freeing port 5000 listeners (if any)...'
$portPids = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique

foreach ($pid in $portPids) {
    if ($null -ne $pid) {
        try {
            Stop-Process -Id $pid -Force -ErrorAction Stop
        }
        catch {
            # Ignore already-exited or inaccessible processes.
        }
    }
}

if ($NoBuild) {
    Write-Host 'Starting Backend with --no-build...'
    dotnet run --project $projectPath --no-build
}
else {
    Write-Host 'Starting Backend...'
    dotnet run --project $projectPath
}