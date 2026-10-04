$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
. "$PSScriptRoot/local-network.ps1"
$local = Join-Path $root '.local'
$data = Join-Path $local 'mysql'
$bin = 'C:\Program Files\MySQL\MySQL Server 8.0\bin'
New-Item -ItemType Directory -Force $local | Out-Null
if (!(Test-Path $data)) {
  & "$bin\mysqld.exe" --no-defaults --initialize-insecure "--datadir=$data" --console
  if ($LASTEXITCODE -ne 0) { throw 'MySQL initialization failed' }
}
$existing = Test-LocalPort 3307
if (!$existing) {
  $arguments = @('--no-defaults', ('--datadir="' + $data + '"'), '--port=3307', '--bind-address=127.0.0.1', '--mysqlx=OFF', '--character-set-server=utf8mb4', '--collation-server=utf8mb4_unicode_ci')
  $process = Start-Process -FilePath "$bin\mysqld.exe" -ArgumentList $arguments -WindowStyle Hidden -PassThru -RedirectStandardOutput "$local\mysql.stdout.log" -RedirectStandardError "$local\mysql.stderr.log"
  $process.Id | Set-Content "$local\mysql.pid"
  for ($attempt=0; $attempt -lt 20 -and !(Test-LocalPort 3307); $attempt++) { Start-Sleep -Seconds 1 }
}
if (!(Test-LocalPort 3307)) { throw 'MySQL did not start; see .local/mysql.stderr.log' }
$actualData = & "$bin\mysql.exe" --no-defaults --host=127.0.0.1 --port=3307 --user=root --batch --skip-column-names --execute='SELECT @@datadir'
if ($LASTEXITCODE -ne 0 -or [IO.Path]::GetFullPath($actualData.Trim()).TrimEnd('\','/') -ne [IO.Path]::GetFullPath($data).TrimEnd('\','/')) {
  throw 'Port 3307 is not the expected project MySQL instance. No database setup performed.'
}
$settings = Join-Path $local 'env.ps1'
if (!(Test-Path $settings)) {
  $dbPassword = [Guid]::NewGuid().ToString('N')
  $demoPassword = 'Demo-' + [Guid]::NewGuid().ToString('N').Substring(0,14)
  @("`$env:DB_PASSWORD='$dbPassword'", "`$env:DEMO_PASSWORD='$demoPassword'", "`$env:SPRING_PROFILES_ACTIVE='local'", "`$env:JAVA_HOME='C:\Program Files\Java\jdk-17'") | Set-Content $settings
  $sql = "CREATE DATABASE IF NOT EXISTS library CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE DATABASE IF NOT EXISTS library_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER IF NOT EXISTS 'library'@'localhost' IDENTIFIED BY '$dbPassword'; GRANT ALL ON library.* TO 'library'@'localhost'; GRANT ALL ON library_test.* TO 'library'@'localhost';"
  & "$bin\mysql.exe" --no-defaults --host=127.0.0.1 --port=3307 --user=root --execute=$sql
  if ($LASTEXITCODE -ne 0) { throw 'Database setup failed' }
}
Write-Output 'Local MySQL ready on 127.0.0.1:3307; local settings: .local/env.ps1'
