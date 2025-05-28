import { Core_Console_Log } from './lib/ericchase/api.core.js';
import { NODE_FS, NODE_PATH, NodePlatform_Path_Async_IsDirectory, NodePlatform_Path_JoinStandard, NodePlatform_Path_Resolve } from './lib/ericchase/api.platform-node.js';

export namespace server {
  export function getConsole(): Promise<Response | undefined> {
    return Promise.resolve(new Response(Bun.file('./console.html')));
  }
  export function get(pathname: string): Promise<Response | undefined> {
    switch (pathname) {
      case '/server/restart': {
        Core_Console_Log('Restarting...');
        setTimeout(() => process.exit(1), 100);
        return Promise.resolve(new Response('Restarting server.'));
      }
      case '/server/shutdown': {
        Core_Console_Log('Shutting down...');
        setTimeout(() => process.exit(2), 100);
        return Promise.resolve(new Response('Shutting down server.'));
      }
      case '/server/list': {
        return getPublicListing();
      }
    }
    return Promise.resolve(undefined);
  }
}

async function getPublicListing(): Promise<Response | undefined> {
  if (Bun.env.PUBLIC_PATH) {
    const public_path = NodePlatform_Path_Resolve(Bun.env.PUBLIC_PATH);
    try {
      if ((await NodePlatform_Path_Async_IsDirectory(public_path)) === false) {
        throw undefined;
      }
    } catch (error) {
      throw new Error(`PUBLIC_PATH "${Bun.env.PUBLIC_PATH}" does not exist or is not a directory.`);
    }
    const entries: string[] = [];
    for (const entry of await NODE_FS.promises.readdir(public_path, {
      encoding: 'utf8',
      recursive: true,
      withFileTypes: true,
    })) {
      if (entry.isFile()) {
        entries.push(NodePlatform_Path_JoinStandard(NODE_PATH.relative(public_path, `${entry.parentPath}\\${entry.name}`)));
      }
    }
    return new Response(JSON.stringify(entries.sort()));
  }
}
