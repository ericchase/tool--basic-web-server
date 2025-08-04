import { default as NODE_FS_SYNC } from 'node:fs';
import { default as NODE_FS } from 'node:fs/promises';
import { default as NODE_NET } from 'node:net';
import { default as NODE_OS } from 'node:os';
import { default as NODE_PATH } from 'node:path';
import { default as NODE_URL } from 'node:url';
import { default as NODE_UTIL } from 'node:util';

export { NODE_FS, NODE_FS_SYNC, NODE_NET, NODE_OS, NODE_PATH, NODE_URL, NODE_UTIL };

export interface NodePlatform_Result<T> {
  error?: any;
  value?: T;
}
