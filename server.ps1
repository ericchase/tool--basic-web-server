$executable = (Test-Path -Path .\bun.exe -PathType Leaf) ? ".\bun" : "bun"
& $executable "install"
Write-Host ""

while ($true) {
  & $executable "server.ts"

  if ($LASTEXITCODE -eq 0) { 
    $response = Read-Host "Restart? (y/n)"
    if ($response -ne "y")
    { break }
  }
  if ($LASTEXITCODE -eq 1) { pause }
}