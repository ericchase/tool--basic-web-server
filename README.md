# deno--basic-web-server

[unlicensed] Basic web server for test environment using Deno

Features

- Auto-increment when preferred **port** is in use
- Automatic file serving from **public** directory
  - URL path normalization and filtering
- Sets up **MIME** types for html, css, js, png, jpg, gif, svg, ico file extensions
  - Add your own as well!
- Example for handling **CORS** Preflight checks (the HTTP OPTIONS Request)

Deno

- Grab the proper executable for your device here:
  - [https://github.com/denoland/deno/releases](https://github.com/denoland/deno/releases)

Batch Script

- Runs the Powershell Script

Powershell Script

- Easy startup
- Pause on errors
- Auto restart on exit code 1
- Quit on exit code 0
- Look for Deno executable in root folder and path

**Notes**

- Batch and Powershell scripts only run on Windows devices
