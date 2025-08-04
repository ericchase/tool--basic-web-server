import { Core_Console_Log } from './lib/ericchase/Core_Console_Log.js';
import { NODE_PATH } from './lib/ericchase/NodePlatform.js';
import { Async_NodePlatform_Directory_ReadDir } from './lib/ericchase/NodePlatform_Directory_ReadDir.js';
import { Async_NodePlatform_Path_Is_Directory } from './lib/ericchase/NodePlatform_Path_Is_Directory.js';
import { NodePlatform_PathObject_Relative_Class } from './lib/ericchase/NodePlatform_PathObject_Relative_Class.js';

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
    const public_pathobject = NodePlatform_PathObject_Relative_Class(Bun.env.PUBLIC_PATH);
    const public_path = public_pathobject.join();
    try {
      if ((await Async_NodePlatform_Path_Is_Directory(public_path)) === false) {
        throw undefined;
      }
    } catch (error) {
      throw new Error(`PUBLIC_PATH "${Bun.env.PUBLIC_PATH}" does not exist or is not a directory.`);
    }
    const entries: string[] = [];
    const { value: dirents } = await Async_NodePlatform_Directory_ReadDir(public_path, true);
    for (const entry of dirents ?? []) {
      if (entry.isFile()) {
        const entry_pathobject = NodePlatform_PathObject_Relative_Class(NODE_PATH.relative(public_path, NODE_PATH.join(entry.parentPath, entry.name)));
        entries.push(entry_pathobject.join());
      }
    }
    return new Response(JSON.stringify(entries.sort()));
  }
}
