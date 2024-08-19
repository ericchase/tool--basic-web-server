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

  $exitcode = $LASTEXITCODE
  if ($exitcode -eq 0) { 
    # default exit code is 0
    Write-Host "exit code [$exitcode]:default"
    $response = Read-Host "Restart? (y/n)"
    if ($response -ne "y") { break }
  }
  if ($exitcode -eq 1) { 
    # restart
    Write-Host "exit code [$exitcode]:restart"
  }
  if ($exitcode -eq 2) { 
    # shutdown
    Write-Host "exit code [$exitcode]:shutdown"
    break
  }
  Write-Host ""
}

pause