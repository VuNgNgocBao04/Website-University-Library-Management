$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
if (Test-Path "$root/.local/env.ps1") { . "$root/.local/env.ps1" }
Set-Location "$root/frontend"
npm.cmd run test:e2e
exit $LASTEXITCODE
