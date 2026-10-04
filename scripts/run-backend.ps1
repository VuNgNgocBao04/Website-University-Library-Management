param([switch]$Jar)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
if (Test-Path "$root/.local/env.ps1") { . "$root/.local/env.ps1" }
$env:DEBUG='false'
Set-Location "$root/backend"
if ($Jar) {
  $jarFile = "$root/backend/target/university-library-1.0.0.jar"
  if (!(Test-Path $jarFile)) { throw 'Build the JAR first: scripts/test-backend.ps1 -Package' }
  & "$env:JAVA_HOME/bin/java.exe" -jar $jarFile
} else {
  & "$root/.tools/apache-maven-3.9.11/bin/mvn.cmd" -q "-Dmaven.repo.local=$root/.tools/m2" spring-boot:run
}
exit $LASTEXITCODE
