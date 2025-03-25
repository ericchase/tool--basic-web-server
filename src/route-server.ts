import { default as node_fs } from 'node:fs';
import { GetRelativePath, NormalizedPath } from './lib/ericchase/Platform/FilePath.js';
import { ConsoleLog } from './lib/ericchase/Utility/Console.js';

export namespace server {
  export async function getConsole(): Promise<Response | undefined> {
    return new Response(Bun.file('./console.html'));
  }
  export async function get(pathname: string): Promise<Response | undefined> {
    switch (pathname) {
      case '/server/restart': {
        ConsoleLog('Restarting...');
        setTimeout(() => process.exit(1), 100);
        return new Response('Restarting server.');
      }
      case '/server/shutdown': {
        ConsoleLog('Shutting down...');
        setTimeout(() => process.exit(2), 100);
        return new Response('Shutting down server.');
      }
      case '/server/list': {
        return getPublicListing();
      }
    }
  }
}

async function getPublicListing(): Promise<Response | undefined> {
  if (Bun.env.PUBLIC_PATH) {
    const public_path = NormalizedPath(Bun.env.PUBLIC_PATH);
    try {
      if ((await node_fs.promises.stat(public_path.raw)).isDirectory() === false) {
        throw undefined;
      }
    } catch (error) {
      throw new Error(`PUBLIC_PATH "${Bun.env.PUBLIC_PATH}" does not exist or is not a directory.`);
    }
    const entries: string[] = [];
    for (const entry of await node_fs.promises.readdir(public_path.raw, {
      encoding: 'utf8',
      recursive: true,
      withFileTypes: true,
    })) {
      if (entry.isFile()) {
        entries.push(GetRelativePath({ path: public_path, isFile: false }, { path: `${entry.parentPath}\\${entry.name}`, isFile: true }).standard);
      }
    }
    return new Response(JSON.stringify(entries.sort()));
  }
}
