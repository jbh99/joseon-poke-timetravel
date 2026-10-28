# Build the Netlify publish folder: web/ minus the dev playtest helpers, plus Netlify headers.
$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root 'dist'
# assets/tiles and the era / title / ending paintings were AI-made; PMD chunk sets and backdrops replaced them
$skipDirs = @('dev', (Join-Path $root 'web\assets\tiles'))
$skipFiles = @('e1.png','e2.png','e3.png','e4.png','e5.png','e6.png','e7.png','e8.png','e9.png','e10.png','title.png','end.png')
# start clean: /MIR keeps destination folders that /XD excludes, so stale copies would otherwise survive
if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
robocopy (Join-Path $root 'web') $dist /MIR /XD $skipDirs /XF $skipFiles /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed ($LASTEXITCODE)" }
# the referrer policy keeps the page's origin on cross-origin requests: Google sign-in (js/cloud.js) checks it
@'
/*
  X-Robots-Tag: noindex, nofollow
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin

/assets/pmd/*
  Cache-Control: public, max-age=86400
/assets/poke/*
  Cache-Control: public, max-age=86400
/assets/bgm/*
  Cache-Control: public, max-age=86400
/assets/cry/*
  Cache-Control: public, max-age=86400
/assets/fonts/*
  Cache-Control: public, max-age=86400
'@ | Set-Content -Encoding ascii (Join-Path $dist '_headers')
"User-agent: *`nDisallow: /" | Set-Content -Encoding ascii (Join-Path $dist 'robots.txt')
$size = (Get-ChildItem $dist -Recurse -File | Measure-Object Length -Sum)
"dist: {0} files, {1:N1} MB" -f $size.Count, ($size.Sum / 1MB)
