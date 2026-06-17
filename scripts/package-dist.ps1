Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$project = Resolve-Path (Join-Path $PSScriptRoot "..")
$dist = Join-Path $project "dist"
$packageDir = Join-Path $dist "portfolio-template-standalone"
$zipPath = Join-Path $dist "portfolio-template-standalone.zip"

function Assert-InProject([string] $path) {
  $resolved = Resolve-Path $path -ErrorAction SilentlyContinue

  if ($resolved -and -not $resolved.Path.StartsWith($project.Path)) {
    throw "Resolved path is outside project: $($resolved.Path)"
  }
}

if (-not (Test-Path (Join-Path $project ".next\standalone"))) {
  throw "Missing .next\standalone. Run pnpm build before pnpm package:dist."
}

if (Test-Path $dist) {
  Assert-InProject $dist
  Remove-Item -LiteralPath $dist -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $packageDir | Out-Null

Get-ChildItem -Force -LiteralPath (Join-Path $project ".next\standalone") | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination $packageDir -Recurse -Force
}

$tracedContent = Join-Path $packageDir "content"
if (Test-Path $tracedContent) {
  Remove-Item -LiteralPath $tracedContent -Recurse -Force
}

New-Item -ItemType Directory -Force -Path (Join-Path $packageDir ".next") | Out-Null
Copy-Item -LiteralPath (Join-Path $project ".next\static") -Destination (Join-Path $packageDir ".next\static") -Recurse -Force
Copy-Item -LiteralPath (Join-Path $project "public") -Destination (Join-Path $packageDir "public") -Recurse -Force

$packageContentPath = Join-Path $packageDir "content"
if (Test-Path $packageContentPath) {
  throw "Refusing to package content directory: $packageContentPath"
}

Compress-Archive -Path (Join-Path $packageDir "*") -DestinationPath $zipPath -Force

$zip = Get-Item $zipPath
[pscustomobject]@{
  Package = $packageDir
  Zip = $zipPath
  ZipSizeMB = [math]::Round($zip.Length / 1MB, 2)
  IncludesContent = Test-Path $packageContentPath
} | ConvertTo-Json
