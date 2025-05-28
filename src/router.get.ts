import { Core_Console_Log } from './lib/ericchase/api.core.js';
import { NodePlatform_Path_Async_IsDirectory, NodePlatform_Path_Join, NodePlatform_Path_Resolve } from './lib/ericchase/api.platform-node.js';
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
    const public_path = NodePlatform_Path_Resolve(Bun.env.PUBLIC_PATH);
    try {
      if ((await NodePlatform_Path_Async_IsDirectory(public_path)) === false) {
        throw undefined;
      }
    } catch (error) {
      throw new Error(`PUBLIC_PATH "${Bun.env.PUBLIC_PATH}" does not exist or is not a directory.`);
    }
    // join handles the '/'
    const resource_path = NodePlatform_Path_Resolve(NodePlatform_Path_Join(Bun.env.PUBLIC_PATH, pathname));
    if (resource_path.startsWith(public_path)) {
      const resource_file = Bun.file(resource_path);
      if (await resource_file.exists()) {
        return new Response(resource_file);
      }
    }
  }
}
