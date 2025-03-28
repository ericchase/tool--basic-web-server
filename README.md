Basic web server for test environment using Bun (https://bun.sh/)

- Please take a look at the project source code for examples:
  - https://github.com/ericchase/tool--basic-web-server

### Features

- Auto-increment when preferred **port** is in use
- File serving from the **public** directory
  - URL path normalization
- Bun provides **MIME** types in responses by default

### Examples Pages

- Basic html page that loads a stylesheet and script.
  - /example-site/index.html
- Basic html page that loads a stylesheet and script as module.
  - /example-site-modules/index.html
- Mock page for handling **CORS** Preflight checks (the HTTP OPTIONS Request)
  - /example-database-access.html

### Installing Bun

- Install the latest version of Bun from their website:
  - [https://bun.sh/](https://bun.sh/)

### Running the Server

- Run `bun run start`, or
- Run `bun run tools/start.ts`.
