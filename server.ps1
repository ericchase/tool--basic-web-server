$local_executable = (Test-Path -Path .\deno.exe -PathType Leaf)

while ($true) {
  if ($local_executable) {
    .\deno run --allow-env=PORT --allow-net --allow-read server.ts
  }
  else {
    deno run --allow-env=PORT --allow-net --allow-read server.ts
  }

  if ($LASTEXITCODE -eq 0) { 
    $response = Read-Host "Restart? (y/n)"
    if ($response -ne "y")
    { break }
  }
  if ($LASTEXITCODE -eq 1) { pause }
}
