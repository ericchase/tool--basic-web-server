import { Core_Console_Log } from './lib/ericchase/Core_Console_Log.js';
import { NODE_PATH } from './lib/ericchase/NodePlatform.js';
import { Async_NodePlatform_Path_Is_Directory } from './lib/ericchase/NodePlatform_Path_Is_Directory.js';
import { NodePlatform_PathObject_Relative_Class } from './lib/ericchase/NodePlatform_PathObject_Relative_Class.js';
import { server } from './route-server.js';

export function get(req: Request, url: URL, pathname: string): Promise<Response | undefined> {
  Core_Console_Log(`GET      ${pathname}`);

  // server api
  if (url.pathname === '/console') return server.getConsole();
  if (url.pathname.startsWith('/server')) return server.get(pathname);

  // custom routing here
  switch (pathname) {
    case '/': {
      return getPublicResource('index.html');
    }
  }
  return getPublicResource(pathname);
}

// pathname starts with '/'
async function getPublicResource(pathname: string): Promise<Response | undefined> {
  if (Bun.env.PUBLIC_PATH) {
    const public_pathobject = NodePlatform_PathObject_Relative_Class(Bun.env.PUBLIC_PATH);
    const public_path = public_pathobject.join();
    const public_path_resolved = NODE_PATH.resolve(public_path);
    try {
      if ((await Async_NodePlatform_Path_Is_Directory(public_path)) === false) {
        throw undefined;
      }
    } catch (error) {
      throw new Error(`PUBLIC_PATH "${Bun.env.PUBLIC_PATH}" does not exist or is not a directory.`);
    }
    // join handles the '/'
    const resource_path_resolved = NODE_PATH.resolve(NODE_PATH.join(public_path, pathname));
    if (resource_path_resolved.startsWith(public_path_resolved)) {
      const resource_file = Bun.file(resource_path_resolved);
      if (await resource_file.exists()) {
        return new Response(resource_file, {
          // headers: {
          //   'Access-Control-Allow-Origin': '*', // add CORS handling
          // },
        });
      }
    }
  }
}
