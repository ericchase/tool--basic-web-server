import { NODE_FS, NODE_PATH } from './NodePlatform.js';

export async function Async_NodePlatform_Path_Is_SymbolicLink(path: string): Promise<boolean> {
  path = NODE_PATH.normalize(path);
  try {
    return (await NODE_FS.lstat(path)).isSymbolicLink();
  } catch (error) {}
  return false;
}
