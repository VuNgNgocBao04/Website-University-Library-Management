$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$fontDir = Join-Path $root 'backend/src/main/resources/fonts'
New-Item -ItemType Directory -Force $fontDir | Out-Null
Invoke-WebRequest 'https://raw.githubusercontent.com/notofonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf' -OutFile (Join-Path $fontDir 'NotoSans-Regular.ttf')
Invoke-WebRequest 'https://raw.githubusercontent.com/notofonts/noto-fonts/main/LICENSE' -OutFile (Join-Path $fontDir 'LICENSE.txt')
