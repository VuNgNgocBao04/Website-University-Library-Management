param([switch]$Package, [string]$TestFilter)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
if (Test-Path "$root/.local/env.ps1") { . "$root/.local/env.ps1" }
$env:SPRING_PROFILES_ACTIVE='test'
$env:DEBUG='false'
$env:DB_URL='jdbc:mysql://127.0.0.1:3307/library_test?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true'
Set-Location "$root/backend"
$goal = if ($Package) { 'package' } else { 'test' }
$testArgs = @()
if ($TestFilter) { $testArgs += "-Dtest=$TestFilter" }
& "$root/.tools/apache-maven-3.9.11/bin/mvn.cmd" -q "-Dmaven.repo.local=$root/.tools/m2" @testArgs $goal
exit $LASTEXITCODE
