import { ServerWebSocket } from 'bun';
import { query } from './db.js';
import { Core_Console_Error } from './lib/ericchase/Core_Console_Error.js';
import { Core_Console_Log } from './lib/ericchase/Core_Console_Log.js';
import { NODE_PATH } from './lib/ericchase/NodePlatform.js';
import { Async_NodePlatform_Directory_ReadDir } from './lib/ericchase/NodePlatform_Directory_ReadDir.js';
import { NodePlatform_PathObject_Relative_Class } from './lib/ericchase/NodePlatform_PathObject_Relative_Class.js';
import { Async_NodePlatform_Path_Is_Directory } from './lib/ericchase/NodePlatform_Path_Is_Directory.js';

const HOMEPAGE: string = '/index.html';
const ENABLE_CORS_ALL_ORIGINS: boolean = false; // warning: will allow any website to access your out/public files

interface WebSocketData {}

class SERVER {
  static CreateServer(hostname: string, port: number): Bun.Server {
    const server = Bun.serve({
      hostname,
      port,
      routes: {
        '/': Response.redirect(HOMEPAGE),
        '/console': {
          // the console needs to be on server root path
          GET(req) {
            return HOOK_RES.Async_CatchInternalServerError(() => {
              return new Response(Bun.file('./console.html'));
            });
          },
        },
        '/api/database/query': {
          OPTIONS(req) {
            return HOOK_RES.Async_CatchInternalServerError(() => {
              const res = RES.OK();
              // res.headers.append('Access-Control-Allow-Credentials', 'true');
              res.headers.append('Access-Control-Allow-Headers', 'content-type');
              res.headers.append('Access-Control-Allow-Methods', 'POST');
              if (ENABLE_CORS_ALL_ORIGINS === true) {
                res.headers.append('Access-Control-Allow-Origin', '*');
              }
              // res.headers.append('Access-Control-Expose-Headers', '* or [<header-name>[, <header-name>]*]');
              // res.headers.append('Access-Control-Max-Age', '<delta-seconds>');
              // res.headers.append('Vary', '* or <header-name>, <header-name>, ...');
              return res;
            });
          },
          POST(req) {
            return HOOK_RES.Async_CatchInternalServerError(async () => {
              const { text, values } = await req.json();
              const res = RES.OK_JSON(await query(text, values));
              if (ENABLE_CORS_ALL_ORIGINS === true) {
                res.headers.append('Access-Control-Allow-Origin', '*');
              }
              return res;
            });
          },
        },
        '/api/server/list': {
          POST(req) {
            return HOOK_RES.Async_CatchInternalServerError(() => {
              return SERVER.Async_GetResourceListing();
            });
          },
        },
        '/api/server/restart': {
          POST(req) {
            return HOOK_RES.Async_CatchInternalServerError(() => {
              Core_Console_Log('Restarting...');
              setTimeout(() => {
                process.exit(1);
              }, 100);
              return RES.OK_JSON('Restarting server.');
            });
          },
        },
        '/api/server/shutdown': {
          POST(req) {
            return HOOK_RES.Async_CatchInternalServerError(() => {
              Core_Console_Log('Shutting down...');
              setTimeout(() => {
                process.exit(2);
              }, 100);
              return RES.OK_JSON('Shutting down server.');
            });
          },
        },
        '/api/websockets/reload': {
          POST(req, server) {
            return HOOK_RES.Async_CatchInternalServerError(() => {
              server.publish('ws', 'reload');
              return RES.OK();
            });
          },
        },
        '/*': (req, server) => {
          // websockets upgrade
          if (server.upgrade(req) === true) {
            console.log(req.method);
            return undefined;
          }
          return HOOK_RES.Async_CatchInternalServerError(async () => {
            const res = await SERVER.Async_GetResource(req);
            if (ENABLE_CORS_ALL_ORIGINS === true) {
              res.headers.append('Access-Control-Allow-Origin', '*');
            }
            return res;
          });
        },
      },
      fetch() {
        return HOOK_RES.Async_CatchInternalServerError(() => RES.NoContent());
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

  static async Async_GetResource(req: Request): Promise<Response> {
    if (Bun.env.PUBLIC_PATH === undefined) {
      Core_Console_Log('Environment variable "PUBLIC_PATH" does not exist.');
      return RES.NotFound();
    }

    const req_url = new URL(req.url);
    Core_Console_Log(`${req.method}      ${req_url.pathname}`);

    const resource_dir_path = NODE_PATH.join(Bun.env.PUBLIC_PATH);
    const request_pathobject = NodePlatform_PathObject_Relative_Class('.', decodeURIComponent(req_url.pathname));
    const resolved_request_path = NODE_PATH.resolve(NODE_PATH.join(resource_dir_path, request_pathobject.join()));

    if (resolved_request_path.startsWith(NODE_PATH.resolve(resource_dir_path)) !== true) {
      Core_Console_Log('Requested path outside of resource folder.');
      return RES.NotFound();
    }

    if ((await Async_NodePlatform_Path_Is_Directory(resolved_request_path)) === true) {
      return Response.redirect(`${req_url.pathname}${req_url.pathname.endsWith('/') ? '' : '/'}index.html`);
    }

    const file = Bun.file(resolved_request_path);

    if ((await file.exists()) !== true) {
      Core_Console_Log('Requested path does not exist.');
      return RES.NotFound();
    }

    return new Response(file);
  }
  static async Async_GetResourceListing(): Promise<Response> {
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
        entries.push(NodePlatform_PathObject_Relative_Class(NODE_PATH.relative(public_path, NODE_PATH.join(entry.parentPath, entry.name))).join());
      }
    }
    return Response.json(entries.sort());
  }
  static async Async_StartServer(hostname: string, port: number) {
    try {
      const server = SERVER.CreateServer(hostname, port);
      Core_Console_Log('Serving at', `http://${server.hostname}:${server.port}/`);
      Core_Console_Log('Console at', `http://${server.hostname}:${server.port}/console`);
      Core_Console_Log();
    } catch (error) {
      let code: 'EADDRINUSE' | 'EBADHOST' | undefined = undefined;
      if (error !== null && typeof error === 'object') {
        if ('code' in error && error.code === 'EADDRINUSE') code = 'EADDRINUSE';
        if ('message' in error && error.message === `Failed to start server. Is port ${port} in use?`) code = 'EADDRINUSE';
      }
      if (code === 'EADDRINUSE') {
        if (await SERVER.Async_TestLocalServer(port)) {
          code = 'EBADHOST';
        } else {
          Core_Console_Log(`%c${code}: %cFailed to start server. Is port ${port} in use?`, 'color:red', 'color:gray');
          Core_Console_Log(`Trying port ${port + 1} next.`);
          setTimeout(() => SERVER.Async_StartServer(hostname, port + 1), 0);
          return;
        }
      }
      if (code === 'EBADHOST') {
        Core_Console_Log(`%c${code}: %cHostname ${hostname} may be invalid.`);
        Core_Console_Log('Please try another hostname or use 127.0.0.1 to serve locally.');
        return;
      }
      Core_Console_Log(error);
    }
  }
  static async Async_TestLocalServer(port: number) {
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

  static PREFERRED_HOSTNAME: string = Bun.env.HOSTNAME ?? '127.0.0.1';
  static PREFERRED_PORT: number = Number.parseInt(Bun.env.PORT ?? '8000');
  static PREFERRED_PUBLIC_PATH: string = Bun.env.PUBLIC_PATH ?? 'public';
  static {
    Bun.env.HOSTNAME = SERVER.PREFERRED_HOSTNAME;
    Bun.env.PORT = SERVER.PREFERRED_PORT.toString(10);
    Bun.env.PUBLIC_PATH = SERVER.PREFERRED_PUBLIC_PATH;
  }
}

class HOOK_RES {
  static async Async_CatchInternalServerError(response_cb: () => Response | Promise<Response>): Promise<Response> {
    try {
      return HOOK_RES.SetCacheNoStore(await response_cb());
    } catch (error) {
      Core_Console_Error('Internal Server Error');
      Core_Console_Error(error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
  static SetCacheNoStore(res: Response): Response {
    res.headers.append('Cache-Control', 'no-store');
    res.headers.append('Expires', '0');
    res.headers.append('Pragma', 'no-cache');
    return res;
  }
}
class RES {
  static NoContent() {
    return new Response('No Content', { status: 204 });
  }
  static NotFound() {
    return new Response('Not Found', { status: 404 });
  }
  static OK() {
    return new Response('OK', { status: 200 });
  }
  static OK_JSON(data: any) {
    return Response.json(data, { status: 200 });
  }
  static Unauthorized() {
    return new Response('Unauthorized', { status: 401 });
  }
}

process.on('SIGTERM', () => {
  process.exit(2); // 2 for shutdown
});

await SERVER.Async_StartServer(SERVER.PREFERRED_HOSTNAME, SERVER.PREFERRED_PORT);
