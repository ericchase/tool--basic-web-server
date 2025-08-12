import { ServerWebSocket } from 'bun';
import web_console from '../console.html';
import { query } from './db.js';
import { Core_Console_Log } from './lib/ericchase/Core_Console_Log.js';
import { NODE_PATH } from './lib/ericchase/NodePlatform.js';
import { Async_NodePlatform_Directory_ReadDir } from './lib/ericchase/NodePlatform_Directory_ReadDir.js';
import { NodePlatform_PathObject_Relative_Class } from './lib/ericchase/NodePlatform_PathObject_Relative_Class.js';
import { Async_NodePlatform_Path_Is_Directory } from './lib/ericchase/NodePlatform_Path_Is_Directory.js';

const PREFERRED_HOSTNAME = Bun.env.HOSTNAME ?? '127.0.0.1';
const PREFERRED_PORT = Number.parseInt(Bun.env.PORT ?? '8000');
const PREFERRED_PUBLIC_PATH = Bun.env.PUBLIC_PATH ?? 'public';

Bun.env.HOSTNAME = PREFERRED_HOSTNAME;
Bun.env.PORT = `${PREFERRED_PORT}`;
Bun.env.PUBLIC_PATH = PREFERRED_PUBLIC_PATH;

interface WebSocketData {}
function createServer(hostname: string, port: number) {
  const server = Bun.serve({
    development: false,
    hostname,
    port,
    routes: {
      '/': Response.redirect('/public'),
      '/console': web_console,
      '/database/query': {
        async OPTIONS() {
          return new Response(undefined, {
            headers: {
              // "Access-Control-Allow-Credentials": "true",
              'Access-Control-Allow-Headers': 'content-type',
              'Access-Control-Allow-Methods': 'POST',
              'Access-Control-Allow-Origin': '*',
              // "Access-Control-Expose-Headers": "* or [<header-name>[, <header-name>]*]",
              // "Access-Control-Max-Age": "<delta-seconds>",
              // "Vary": "* or <header-name>, <header-name>, ..."
            },
            status: 204, // 204 No Content
          });
        },
        async POST(req) {
          try {
            const { text, values } = await req.json();
            const result = await query(text, values);
            return Response.json(result, {
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
              },
            });
          } catch (error: any) {
            Core_Console_Log(error);
            return Response.json('Internal Server Error', {
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
              },
              status: 500, // 500 Internal Server Error
            });
          }
        },
      },
      '/public': Response.redirect('/public/index.html'),
      '/public/*': async (req) => {
        const res = await async_getPublicResource(req);
        // res.headers.append('Access-Control-Allow-Origin', '*'); // enable CORS handling
        return res;
      },
      '/server/list': async () => {
        return await async_getPublicListing();
      },
      '/server/reload': async (_, server) => {
        server.publish('ws', 'reload');
        return new Response(undefined, { status: 204 });
      },
      '/server/restart': async () => {
        Core_Console_Log('Restarting...');
        setTimeout(async () => {
          process.exit(1);
        }, 100);
        return Response.json('Restarting server.');
      },
      '/server/shutdown': async () => {
        Core_Console_Log('Shutting down...');
        setTimeout(async () => {
          process.exit(2);
        }, 100);
        return Response.json('Shutting down server.');
      },
    },
    fetch(req, server) {
      // websockets upgrade
      if (server.upgrade(req) === true) {
        return undefined;
      }
      return new Response(undefined, { status: 204 });
    },
    websocket: {
      close(ws: ServerWebSocket<WebSocketData>, code: number, reason: string) {
        ws.unsubscribe('ws');
      },
      message(ws: ServerWebSocket<WebSocketData>, message: string | Buffer) {
        // server.publish('chat', 'Hello everyone!');
      },
      open(ws: ServerWebSocket<WebSocketData>) {
        ws.subscribe('ws');
      },
      perMessageDeflate: false,
    },
  });
  return server;
}

async function async_getPublicListing(): Promise<Response> {
  try {
    if (Bun.env.PUBLIC_PATH === undefined) {
      Core_Console_Log('Environment variable "PUBLIC_PATH" does not exist.');
      return Response.json('Public folder does not exist or is not a directory.', { status: 404 });
    }

    const public_path = NodePlatform_PathObject_Relative_Class(Bun.env.PUBLIC_PATH).join();
    const { error, value: dirents } = await Async_NodePlatform_Directory_ReadDir(public_path, true);

    if (dirents === undefined) {
      throw error;
    }

    const entries: string[] = [];
    for (const entry of dirents) {
      if (entry.isFile() === true) {
        entries.push(NodePlatform_PathObject_Relative_Class('public', NODE_PATH.relative(public_path, NODE_PATH.join(entry.parentPath, entry.name))).join());
      }
    }

    return Response.json(entries.sort());
  } catch (error) {
    Core_Console_Log(error);
    return Response.json('Internal Server Error', { status: 500 });
  }
}

async function async_getPublicResource(req: Request): Promise<Response> {
  try {
    if (Bun.env.PUBLIC_PATH === undefined) {
      Core_Console_Log('Environment variable "PUBLIC_PATH" does not exist.');
      return Response.json('Public folder does not exist or is not a directory.', { status: 404 });
    }

    const req_url = new URL(req.url);
    Core_Console_Log(`${req.method}      ${req_url.pathname}`);
    const public_path = NodePlatform_PathObject_Relative_Class(Bun.env.PUBLIC_PATH).join();
    const request_pathobject = NodePlatform_PathObject_Relative_Class('.', decodeURIComponent(req_url.pathname));

    if (request_pathobject.shift(1).join() !== 'public') {
      Core_Console_Log('Resource path does not start with "public".');
      return Response.json('Invalid resource path.', { status: 404 });
    }

    let resolved_request_path = NODE_PATH.resolve(NODE_PATH.join(public_path, request_pathobject.join()));

    if (resolved_request_path.startsWith(NODE_PATH.resolve(public_path)) !== true) {
      Core_Console_Log('Resource path outside of public folder.');
      return Response.json('Invalid resource path.', { status: 404 });
    }

    if ((await Async_NodePlatform_Path_Is_Directory(resolved_request_path)) === true) {
      req_url.pathname += req_url.pathname.endsWith('/') ? 'index.html' : '/index.html';
      return Response.redirect(req_url);
    }

    const file = Bun.file(resolved_request_path);

    if ((await file.exists()) !== true) {
      Core_Console_Log('Resource does not exist.');
      return Response.json('Invalid resource path.', { status: 404 });
    }

    return new Response(file);
  } catch (error) {
    Core_Console_Log(error);
    return Response.json('Internal Server Error', { status: 500 });
  }
}

async function async_tryStartServer(hostname: string, port: number) {
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
      if (await async_testLocalhostServer(port)) {
        error_code = 'EBADHOST';
      } else {
        Core_Console_Log(`%c${error_code}: %cFailed to start server. Is port ${port} in use?`, 'color:red', 'color:gray');
        Core_Console_Log(`Trying port ${port + 1} next.`);
        setTimeout(() => async_tryStartServer(hostname, port + 1), 0);
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

async function async_testLocalhostServer(port: number) {
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

export async function async_analyzeBody(req: Request | Response) {
  const data: {
    blob?: true;
    form?: true;
    json?: true;
    text?: true;
  } = {};
  try {
    await req.clone().blob();
    data.blob = true;
  } catch (_) {}
  try {
    await req.clone().formData();
    data.form = true;
  } catch (_) {}
  try {
    await req.clone().json();
    data.json = true;
  } catch (_) {}
  try {
    await req.clone().text();
    data.text = true;
  } catch (_) {}
  return data;
}

await async_tryStartServer(PREFERRED_HOSTNAME, PREFERRED_PORT);
