if (Test-Path -Path .\bun.exe -PathType Leaf) {
  $executable = ".\bun" 
}
else {
  $executable = "bun"
}
 
& $executable "install"
Write-Host ""

while ($true) {
  & $executable "server.ts"

  if ($LASTEXITCODE -eq 0) { 
    Write-Host "code -"
    $response = Read-Host "Restart? (y/n)"
    if ($response -ne "y") { break }
  }
  elseif ($LASTEXITCODE -eq 1) { pause }
  else { break }
}

pause