import { ServerWebSocket } from 'bun';
import { ConsoleLog } from './lib/ericchase/Utility/Console.js';
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
        const handler = getMethodHandler(method);
        if (handler) {
          const response = await handler(req, url, pathname);
          if (response) {
            return response;
          }
        }
      } catch (error) {
        ConsoleLog();
        ConsoleLog(error);
        ConsoleLog();
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
    ConsoleLog('Serving at', `http://${server.hostname === '0.0.0.0' ? 'localhost' : server.hostname}:${server.port}/`);
    ConsoleLog('Console at', `http://${server.hostname === '0.0.0.0' ? 'localhost' : server.hostname}:${server.port}/console`);
    ConsoleLog();
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
        ConsoleLog(`%c${error_code}: %cFailed to start server. Is port ${port} in use?`, 'color:red', 'color:gray');
        ConsoleLog(`Trying port ${port + 1} next.`);
        setTimeout(() => tryStartServer(hostname, port + 1), 0);
        return;
      }
    }

    if (error_code === 'EBADHOST') {
      ConsoleLog(`%c${error_code}: %cHostname ${hostname} may be invalid.`);
      ConsoleLog('Please try another hostname or use localhost (127.0.0.1) to serve locally.');
      return;
    }

    ConsoleLog(error);
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
