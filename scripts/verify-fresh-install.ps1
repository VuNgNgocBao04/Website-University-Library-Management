$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
. "$root/.local/env.ps1"
. "$PSScriptRoot/local-network.ps1"
$mysql = 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe'
$jar = Join-Path $root 'backend/target/university-library-1.0.0.jar'
if (!(Test-Path $jar)) { throw 'Build the JAR first with scripts/test-backend.ps1 -Package' }
if (Test-LocalPort 18081) { throw 'Port 18081 is already in use; no changes made.' }
function Sql([string]$query) {
  $result = & $mysql --no-defaults --host=127.0.0.1 --port=3307 --user=root --batch --skip-column-names "--execute=$query"
  if ($LASTEXITCODE -ne 0) { throw 'Fresh-install SQL command failed.' }
  return $result
}
$actualData = Sql 'SELECT @@datadir'
if ([IO.Path]::GetFullPath($actualData.Trim()).TrimEnd('\','/') -ne [IO.Path]::GetFullPath((Join-Path $root '.local/mysql')).TrimEnd('\','/')) {
  throw 'MySQL is not the expected local project instance.'
}
$database = 'library_fresh_' + [Guid]::NewGuid().ToString('N')
$logDir = Join-Path $root '.local/fresh-install'
New-Item -ItemType Directory -Force $logDir | Out-Null
$process = $null
$created = $false
$granted = $false
try {
  Sql "CREATE DATABASE $database CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci" | Out-Null
  $created = $true
  Sql "GRANT ALL ON $database.* TO 'library'@'localhost'" | Out-Null
  $granted = $true
  $env:DB_URL = "jdbc:mysql://127.0.0.1:3307/${database}?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true"
  $env:DB_USER = 'library'
  $env:PORT = '18081'
  $env:DEBUG = 'false'
  $env:SPRING_PROFILES_ACTIVE = 'local'
  for ($run = 1; $run -le 2; $run++) {
    $process = Start-Process -FilePath "$env:JAVA_HOME/bin/java.exe" -ArgumentList @('-jar', ('"' + $jar + '"')) -WorkingDirectory "$root/backend" -WindowStyle Hidden -PassThru -RedirectStandardOutput "$logDir/start-$run.log" -RedirectStandardError "$logDir/error-$run.log"
    $ready = $false
    for ($attempt=0; $attempt -lt 60; $attempt++) {
      if ($process.HasExited) { throw "JAR exited early; see $logDir" }
      try {
        $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
        $csrf = Invoke-RestMethod 'http://127.0.0.1:18081/api/auth/csrf' -WebSession $session -TimeoutSec 2
        $headers = @{}; $headers[$csrf.headerName] = $csrf.token
        $body = @{ username='admin'; password=$env:DEMO_PASSWORD } | ConvertTo-Json
        $account = Invoke-RestMethod 'http://127.0.0.1:18081/api/auth/login' -Method Post -Headers $headers -ContentType 'application/json' -Body $body -WebSession $session -TimeoutSec 3
        if ($account.role -eq 'ADMIN') { $ready = $true; break }
      } catch { Start-Sleep -Seconds 1 }
    }
    if (!$ready) { throw "Fresh-install login failed; see $logDir" }
    $counts = Sql "SELECT (SELECT COUNT(*) FROM $database.users), (SELECT COUNT(*) FROM $database.books), (SELECT COUNT(*) FROM $database.book_items), (SELECT COUNT(*) FROM $database.borrow_receipts), (SELECT COUNT(*) FROM $database.borrow_details), (SELECT COUNT(*) FROM $database.flyway_schema_history WHERE success=1)"
    if ($counts.Trim() -ne "4`t6`t24`t1`t2`t1") { throw "Unexpected seed counts: $counts" }
    $catalog = Invoke-RestMethod 'http://127.0.0.1:18081/api/books?size=100' -WebSession $session
    if ($catalog.totalElements -ne 6) { throw 'Fresh catalog API count mismatch' }
    Write-Output "Run ${run}: login, catalog and seed counts passed (4 users, 6 books, 24 copies, 1 receipt, 2 details, 1 migration)."
    Stop-Process -Id $process.Id -Force
    $process.WaitForExit()
    $process = $null
  }
} finally {
  if ($process -and !$process.HasExited) { Stop-Process -Id $process.Id -Force; $process.WaitForExit() }
  if ($granted) { Sql "REVOKE ALL PRIVILEGES ON $database.* FROM 'library'@'localhost'" | Out-Null }
  if ($created) { Sql "DROP DATABASE $database" | Out-Null }
}
Write-Output 'Fresh installation and restart passed; temporary database removed.'
