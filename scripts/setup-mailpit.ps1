$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
. "$PSScriptRoot/local-network.ps1"
$toolsDir = Join-Path $root '.tools/mailpit'
New-Item -ItemType Directory -Force $toolsDir | Out-Null
if (!(Test-Path "$toolsDir/mailpit.exe")) {
  Invoke-WebRequest 'https://github.com/axllent/mailpit/releases/download/v1.31.2/mailpit-windows-amd64.zip' -OutFile "$toolsDir/mailpit.zip"
  Expand-Archive "$toolsDir/mailpit.zip" -DestinationPath $toolsDir -Force
}
$existing = Test-LocalPort 1025
if (!$existing) {
  Start-Process -FilePath "$toolsDir/mailpit.exe" -ArgumentList '--listen 127.0.0.1:8025 --smtp 127.0.0.1:1025' -WindowStyle Hidden -RedirectStandardOutput "$root/.local/mailpit.stdout.log" -RedirectStandardError "$root/.local/mailpit.stderr.log"
}
for ($attempt=0; $attempt -lt 10 -and !(Test-LocalPort 8025); $attempt++) { Start-Sleep -Seconds 1 }
if (!(Test-LocalPort 8025) -or !(Test-LocalPort 1025)) { throw 'Mailpit did not start; see .local/mailpit.stderr.log' }
Write-Output 'Local email inbox: http://127.0.0.1:8025'
