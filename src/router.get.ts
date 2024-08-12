import path from 'node:path';
import { server } from './route-server.js';

export async function get(req: Request): Promise<void | Response> {
  const url = new URL(req.url);
  const pathname = decodeURIComponent(url.pathname);
  console.log(`GET      ${pathname}`);

  // server api
  if (url.pathname === '/') return server.getConsole();
  if (url.pathname.startsWith('/server')) return server.get(pathname);

  // custom routing here
  switch (pathname) {
  }

  return getPublicResource(pathname);
}

async function getPublicResource(pathname: string): Promise<void | Response> {
  if (Bun.env.PUBLIC_PATH) {
    const public_path = path.normalize(Bun.env.PUBLIC_PATH);
    const resource_path = path.join(public_path, path.normalize(pathname));
    if (path.parse(path.relative(public_path, resource_path)).root === '') {
      const resource = Bun.file(resource_path);
      if (await resource.exists()) {
        return new Response(resource);
      }
    }
  }
}
