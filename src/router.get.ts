import { Core } from './lib/ericchase/core.js';
import { NodePlatform } from './lib/ericchase/platform-node.js';
import { server } from './route-server.js';

export function get(req: Request, url: URL, pathname: string): Promise<Response | undefined> {
  Core.Console.Log(`GET      ${pathname}`);

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
    const public_path = NodePlatform.Path.Resolve(Bun.env.PUBLIC_PATH);
    try {
      if ((await NodePlatform.Path.Async_IsDirectory(public_path)) === false) {
        throw undefined;
      }
    } catch (error) {
      throw new Error(`PUBLIC_PATH "${Bun.env.PUBLIC_PATH}" does not exist or is not a directory.`);
    }
    // join handles the '/'
    const resource_path = NodePlatform.Path.Resolve(NodePlatform.Path.Join(Bun.env.PUBLIC_PATH, pathname));
    if (resource_path.startsWith(public_path)) {
      const resource_file = Bun.file(resource_path);
      if (await resource_file.exists()) {
        return new Response(resource_file);
      }
    }
  }
}
