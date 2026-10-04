$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$toolsDir = Join-Path $root '.tools'
New-Item -ItemType Directory -Force $toolsDir | Out-Null
$archive = Join-Path $toolsDir 'maven.zip'
Invoke-WebRequest 'https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.11/apache-maven-3.9.11-bin.zip' -OutFile $archive
$expected = (Invoke-WebRequest 'https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.11/apache-maven-3.9.11-bin.zip.sha512' -UseBasicParsing).Content.Trim()
if ((Get-FileHash $archive -Algorithm SHA512).Hash.ToLower() -ne $expected.ToLower()) { throw 'Maven checksum mismatch' }
Expand-Archive $archive -DestinationPath $toolsDir -Force
