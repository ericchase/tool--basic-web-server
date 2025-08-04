import { ServerWebSocket } from 'bun';
import { Core_Console_Log } from './lib/ericchase/Core_Console_Log.js';
import { get } from './router.get.js';
import { options } from './router.options.js';
import { post } from './router.post.js';

const PREFERRED_HOSTNAME = Bun.env.HOSTNAME ?? '127.0.0.1';
const PREFERRED_PORT = Number.parseInt(Bun.env.PORT ?? '8000');
const PREFERRED_PUBLIC_PATH = Bun.env.PUBLIC_PATH ?? 'public';

Bun.env.HOSTNAME = PREFERRED_HOSTNAME;
Bun.env.PORT = `${PREFERRED_PORT}`;
Bun.env.PUBLIC_PATH = PREFERRED_PUBLIC_PATH;

interface WebSocketData {}
function createServer(hostname: string, port: number) {
  const server = Bun.serve<ServerWebSocket<WebSocketData>, undefined>({
    async fetch(req) {
      try {
        const method = req.method;
        const url = new URL(req.url);
        const pathname = decodeURIComponent(url.pathname);

        if (server.upgrade(req)) {
          return;
        }
        if (method === 'GET' && pathname === '/server/reload') {
          server.publish('ws', 'reload');
          return new Response('OK', { status: 204 });
        }
        const response = await callHandler(method, req, url, pathname);
        if (response) {
          return response;
        }
      } catch (error) {
        Core_Console_Log();
        Core_Console_Log(error);
        Core_Console_Log();
      }
      return new Response('404', { status: 404 });
    },
    hostname: hostname,
    port,
    websocket: {
      close(ws: ServerWebSocket<WebSocketData>, code: number, reason: string) {
        ws.unsubscribe('ws');
      },
      message(ws: ServerWebSocket<WebSocketData>, message: string | Buffer) {},
      open(ws: ServerWebSocket<WebSocketData>) {
        ws.subscribe('ws');
      },
      perMessageDeflate: false,
    },
  });
  return server;
}

async function callHandler(method: string, req: Request, url: URL, pathname: string) {
  switch (method.toUpperCase()) {
    case 'GET':
      return await get(req, url, pathname);
    case 'OPTIONS':
      return await options(req, url, pathname);
    case 'POST':
      return await post(req, url, pathname);
  }
}

function getMethodHandler(method: string): ((req: Request, url: URL, pathname: string) => Promise<Response | undefined>) | undefined {
  return {
    GET: get,
    OPTIONS: options,
    POST: post,
  }[method.toUpperCase()];
}

async function tryStartServer(hostname: string, port: number) {
  try {
    const server = createServer(hostname, port);
    Core_Console_Log('Serving at', `http://${server.hostname === '0.0.0.0' ? 'localhost' : server.hostname}:${server.port}/`);
    Core_Console_Log('Console at', `http://${server.hostname === '0.0.0.0' ? 'localhost' : server.hostname}:${server.port}/console`);
    Core_Console_Log();
  } catch (error) {
    let error_code: 'EADDRINUSE' | 'EBADHOST' | undefined = undefined;

    if (error !== null && typeof error === 'object') {
      if ('code' in error && error.code === 'EADDRINUSE') error_code = 'EADDRINUSE';
      if ('message' in error && error.message === 'Failed to start server. Is port 8000 in use?') error_code = 'EADDRINUSE';
    }

    if (error_code === 'EADDRINUSE') {
      if (await testLocalhostServer(port)) {
        error_code = 'EBADHOST';
      } else {
        Core_Console_Log(`%c${error_code}: %cFailed to start server. Is port ${port} in use?`, 'color:red', 'color:gray');
        Core_Console_Log(`Trying port ${port + 1} next.`);
        setTimeout(() => tryStartServer(hostname, port + 1), 0);
        return;
      }
    }

    if (error_code === 'EBADHOST') {
      Core_Console_Log(`%c${error_code}: %cHostname ${hostname} may be invalid.`);
      Core_Console_Log('Please try another hostname or use localhost (127.0.0.1) to serve locally.');
      return;
    }

    Core_Console_Log(error);
  }
}

async function testLocalhostServer(port: number) {
  try {
    const server = Bun.serve({
      fetch() {
        return new Response('This is a local test!');
      },
      port,
    });
    await server.stop();
    return true;
  } catch (error) {
    return false;
  }
}

await tryStartServer(PREFERRED_HOSTNAME, PREFERRED_PORT);
