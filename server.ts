// deno run --allow-env=PORT --allow-net --allow-read server.ts
// docs: https://deno.land/std/http
import * as Server from 'https://deno.land/std/http/server.ts';
import * as Path from 'https://deno.land/std@0.139.0/path/mod.ts';


// Set the port to listen on
const preferredPort = Number.parseInt(Deno.env.get('PORT') || '8000');


// Set files to directly serve
const absolutePaths: { [key: string]: string } = {
  '/': './console.html',
  '/console.css': './console.css',
  '/console.js': './console.js',
};



function serve(port: number) {
  return Server.serve(function (req: Request) {
    const requestUrl = new URL(req.url);
    const resourcePath = requestUrl.pathname;

    console.log(`  ${resourcePath}  `);

    switch (resourcePath) {
      case '/api/restart': console.log('Restarting...\n\n');
        return exit(2, 'Restarting server.');
      case '/api/shutdown': console.log('Shuttin down...\n\n');
        return exit(0, 'Shutting down server.');
      default:
        return processPath(resourcePath);
    }
  }, { port })
}

function exit(code: number, message: string) {
  setTimeout(() => Deno.exit(code), 100);
  return new Response(message);
}

function processPath(resourcePath: string) {
  try {
    if (resourcePath in absolutePaths)
      return new Response(getResource(absolutePaths[resourcePath]));
    return new Response(getResource(resourcePath, 'public'));
  } catch (_) { }
  return new Response('File not found', { status: 404 });
}

function getResource(resourcePath: string, root: string = '') {
  const filteredPath = Path
    .normalize(resourcePath)
    .split(Path.sep)
    .filter((s: string) => s !== '.' && s !== '..');

  const filePath = Path
    .join(root, ...filteredPath);

  return Deno.readFileSync(filePath);
}



async function tryServe(port: number) {
  serve(port).catch((err: any) => {
    if (err instanceof Deno.errors.AddrInUse) tryNextPort(port);
    else throw err;
  });
}

function tryNextPort(port: number) {
  console.log(`Port ${port} is already in use.\n`);
  setTimeout(() => tryServe(port + 1), 100);
}

tryServe(preferredPort);
