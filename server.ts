// deno run --allow-env=PORT --allow-net --allow-read server.ts
// docs: https://deno.land/std/http
import * as Server from 'https://deno.land/std/http/server.ts';
import * as Path from 'https://deno.land/std@0.139.0/path/mod.ts';


// Set the port to listen on
const preferredPort = Number.parseInt(Deno.env.get('PORT') || '8000');


// Set files to directly serve
const absolutePaths: { [key: string]: string } = {
  '/': './console.html',
};



function serve(port: number) {
  return Server.serve(function (req: Request) {
    const requestUrl = new URL(req.url);
    const resourcePath = decodeURI(requestUrl.pathname);

    console.log(`  ${resourcePath}  `);

    switch (resourcePath) {
      case '/api/restart': console.log('Restarting...\n\n');
        return exit(2, 'Restarting server.');
      case '/api/shutdown': console.log('Shutting down...\n\n');
        return exit(0, 'Shutting down server.');
      case '/api/list':
        return listing();
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
    const { body, init } = resourcePath in absolutePaths
      ? getResource(absolutePaths[resourcePath])
      : getResource(resourcePath, 'public');
    return new Response(body, init);
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

  return {
    'body': Deno.readFileSync(filePath),
    'init': {
      headers: {
        'Content-Type': getContentType(filePath),
      }
    }
  };
}

function getContentType(filePath: string) {
  const ext = Path.extname(filePath);
  switch (ext) {
    case '.html': return 'text/html';
    case '.css': return 'text/css';
    case '.js': return 'text/javascript';
    case '.png': return 'image/png';
    case '.jpg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    case '.svg': return 'image/svg+xml';
    case '.ico': return 'image/x-icon';
    default: return 'text/plain';
  }
}

async function listing() {
  const entries: string[] = [];
  await listDir('', entries);
  return new Response(JSON.stringify(entries));
}

async function listDir(path: string, entries: string[]) {
  for await (const dirEntry of Deno.readDir(`./public${path}`)) {
    if (dirEntry.isDirectory) {
      await listDir(`${path}/${dirEntry.name}`, entries);
    } else if (dirEntry.isFile) {
      entries.push(`${path}/${dirEntry.name}`);
    }
  }
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
