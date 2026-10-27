# Build the Android app: copy web/ (minus the dev playtest helpers and the retired AI paintings) into
# mobile/www, sync it into the Capacitor project and assemble a debug APK. Everything the game needs
# ships inside the APK, so it plays offline; only co-op multiplayer goes online (PeerJS signalling).
param([switch]$NoGradle, [switch]$Release)
# native tools report through exit codes (checked below); Gradle's SDK warnings on stderr must not abort the build
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
$mobile = Join-Path $root 'mobile'
$www = Join-Path $mobile 'www'
$skipDirs = @((Join-Path $root 'web\dev'), (Join-Path $root 'web\assets\tiles'))
$skipFiles = @('e1.png','e2.png','e3.png','e4.png','e5.png','e6.png','e7.png','e8.png','e9.png','e10.png','title.png','end.png')
if (Test-Path $www) { Remove-Item $www -Recurse -Force }
robocopy (Join-Path $root 'web') $www /MIR /XD $skipDirs /XF $skipFiles /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed ($LASTEXITCODE)" }
$size = (Get-ChildItem $www -Recurse -File | Measure-Object Length -Sum)
"www: {0} files, {1:N1} MB" -f $size.Count, ($size.Sum / 1MB)

# the toolchain lives under C:\Users\Public (Gradle and AAPT reject the Korean home path)
$env:JAVA_HOME = 'C:\Users\Public\jdk21'
$env:ANDROID_HOME = 'C:\Users\Public\android-tools\sdk'
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:GRADLE_USER_HOME = 'C:\Users\Public\gradle-home'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
Push-Location $mobile
try {
  npx cap sync android
  if ($LASTEXITCODE) { throw "cap sync failed ($LASTEXITCODE)" }
  if ($NoGradle) { return }
  Push-Location android
  try {
    $task = if ($Release) { 'assembleRelease' } else { 'assembleDebug' }
    .\gradlew.bat $task --console=plain -q
    if ($LASTEXITCODE) { throw "gradle $task failed ($LASTEXITCODE)" }
  } finally { Pop-Location }
  $kind = if ($Release) { 'release' } else { 'debug' }
  Get-ChildItem (Join-Path $mobile "android\app\build\outputs\apk\$kind") -Filter *.apk | ForEach-Object { "apk: {0} ({1:N1} MB)" -f $_.FullName, ($_.Length / 1MB) }
} finally { Pop-Location }
