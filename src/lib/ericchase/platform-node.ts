import { default as NODE_FS } from 'node:fs';
import { default as NODE_PATH } from 'node:path';
import { default as NODE_URL } from 'node:url';
import { Core } from './core.js';

export { NODE_FS, NODE_PATH, NODE_URL };

export type WatchCallback = (event: 'rename' | 'change', path: string) => void;

// constants

const PATH__RESOLVE_CACHE = new Map<string, string>();
const PATH__RESOLVED_CWD = path__join(process.cwd());

/**
 * The Core.JSON.ParseRawString(String.raw``)s are to keep bundlers (i.e Bun)
 * from replacing the unicode code points with an alternative representation.
 */
const SHELL__GENERALASCIICODES = shell__createasciicodemap(String.raw`
| BEL | \u0007 | Terminal bell
| BS  | \u0008 | Backspace
| HT  | \u0009 | Horizontal TAB
| LF  | \u000A | Linefeed (newline)
| VT  | \u000B | Vertical TAB
| FF  | \u000C | Formfeed (also: New page NP)
| CR  | \u000D | Carriage return
| ESC | \u001B | Escape character
| DEL | \u007F | Delete character
`);
const SHELL__KEYS_ESC = SHELL__GENERALASCIICODES.ESC;
const SHELL__KEYS_CSI = `${SHELL__KEYS_ESC}[`;
const SHELL__KEYS_DCS = `${SHELL__KEYS_ESC}P`;
const SHELL__KEYS_OSC = `${SHELL__KEYS_ESC}]`;
const SHELL__KEYS = {
  ARROWS: {
    DOWN: Core.JSON.ParseRawString(String.raw`\u001B[B`),
    LEFT: Core.JSON.ParseRawString(String.raw`\u001B[D`),
    RIGHT: Core.JSON.ParseRawString(String.raw`\u001B[C`),
    UP: Core.JSON.ParseRawString(String.raw`\u001B[A`),
  },
  GENERAL: {
    BEL: SHELL__GENERALASCIICODES.BEL,
    BS: SHELL__GENERALASCIICODES.BS,
    CR: SHELL__GENERALASCIICODES.CR,
    CSI: SHELL__KEYS_CSI,
    DCS: SHELL__KEYS_DCS,
    DEL: SHELL__GENERALASCIICODES.DEL,
    ESC: SHELL__KEYS_ESC,
    FF: SHELL__GENERALASCIICODES.FF,
    HT: SHELL__GENERALASCIICODES.HT,
    LF: SHELL__GENERALASCIICODES.LF,
    OSC: SHELL__KEYS_OSC,
    VT: SHELL__GENERALASCIICODES.VT,
  },
  SIGINT: Core.JSON.ParseRawString(String.raw`\u0003`), // Kill the currently running task in terminal.
};

/**
 * Gotchas:
 * If the stdin stream is switched to utf8 mode, it cannot be switched back to byte
 * mode (need to verify again). Instead, leave it in byte mode, and decode the bytes.
 */
const SHELL__STDIN__LISTENERSET = new Set<(bytes: Uint8Array, text: string, removeSelf: () => boolean) => void | Promise<void>>();
const SHELL__STDIN__READERLOCKS = new Set<() => void>();

// variables

let shell__exittrapisset = false;
let shell__stdin__rawmodeenabled = false;
let shell__stdin__readerenabled = false;

// functions

function error__cleanstack(stack = ''): string {
  const lines = Core.String.SplitLines(stack ?? '');
  if (lines[0].trim() === 'Error') {
    lines[0] = 'Fixed Call Stack:';
  }
  return lines.join('\n');
}
async function error__callasync<T>(stack: string | undefined, promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (async_error: any) {
    if (typeof async_error === 'object') {
      const error = new Error(`${async_error.message}\n${error__cleanstack(stack ?? '')}`);
      for (const key in async_error) {
        Object.defineProperty(error, key, { value: async_error[key] });
      }
      throw error;
    }
    throw new Error(`${async_error}\n${error__cleanstack(stack ?? '')}`);
  }
}

function shell__createasciicodemap(table: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [name, code] of Core.Array.Split(Core.String.Split(table.trim(), '|', true), 3)) {
    map[name.trim()] = Core.JSON.ParseRawString(Core.String.SplitMultipleSpaces(code, true)[0]);
  }
  return map;
}
function shell__listeneruncaughtexception(error: Error, origin: NodeJS.UncaughtExceptionOrigin): void {
  shell__cursor__showcursor();
  if (process.listeners('uncaughtException').length === 1) {
    Core.Console.Error('Uncaught exception:', error);
    process.exit();
  }
}
function shell__setupexittrapforcursor(): void {
  shell__exittrapisset = true;
  process.on('exit', shell__cursor__showcursor);
  process.on('SIGINT', shell__cursor__showcursor);
  process.on('uncaughtException', () => shell__listeneruncaughtexception);
}

// Directory

async function directory__async_create(path: string, recursive = true): Promise<boolean> {
  try {
    if (PATH__RESOLVED_CWD !== path__join(path)) {
      await error__callasync(Error().stack, NODE_FS.promises.mkdir(path__join(path), { recursive }));
    }
  } catch (error: any) {
    switch (error.code) {
      case 'EEXIST':
        break;
      default:
        throw error;
    }
  }
  return (await NODE_FS.promises.stat(path__join(path))).isDirectory();
}
async function directory__async_delete(path: string, recursive = false): Promise<boolean> {
  try {
    if (recursive === false) {
      await error__callasync(Error().stack, NODE_FS.promises.rmdir(path__join(path)));
    } else {
      await error__callasync(Error().stack, NODE_FS.promises.rm(path__join(path), { recursive: true, force: true }));
    }
  } catch (error: any) {
    switch (error.code) {
      case 'ENOENT':
      case 'ENOTEMPTY':
        break;
      // @ts-ignore
      // biome-ignore lint/suspicious/noFallthroughSwitchClause: we want the fallthrough
      case 'EFAULT':
        error.message += '\nPossible Causes: Directory not empty, set parameter `recursive` to `true`';
      default:
        throw error;
    }
  }
  return NODE_FS.existsSync(path__join(path)) === false;
}
async function directory__async_readdir(path: string, recursive = true): Promise<NODE_FS.Dirent[]> {
  try {
    return await error__callasync(
      Error().stack,
      NODE_FS.promises.readdir(path__join(path), {
        recursive,
        withFileTypes: true,
      }),
    );
  } catch (error: any) {
    switch (error.code) {
      default:
        throw error;
    }
  }
}

function directory__watch(path: string, callback: WatchCallback, recursive = true): () => void {
  const watcher = NODE_FS.watch(path__join(path), { persistent: true, recursive }, (event, filename) => {
    callback(event, filename ?? '');
  });
  return () => {
    watcher.close();
  };
}

// File

async function file__async_appendbytes(path: string, bytes: Uint8Array): Promise<void> {
  await error__callasync(Error().stack, directory__async_create(path__getparentpath(path)));
  return await error__callasync(Error().stack, NODE_FS.promises.appendFile(path__join(path), bytes));
}
async function file__async_appendtext(path: string, text: string): Promise<void> {
  await error__callasync(Error().stack, directory__async_create(path__getparentpath(path)));
  return await error__callasync(Error().stack, NODE_FS.promises.appendFile(path__join(path), text));
}
async function file__async_readbytes(path: string): Promise<Uint8Array<ArrayBuffer>> {
  return Uint8Array.from(await error__callasync(Error().stack, NODE_FS.promises.readFile(path__join(path), {})));
}
async function file__async_readtext(path: string): Promise<string> {
  return await error__callasync(Error().stack, NODE_FS.promises.readFile(path__join(path), { encoding: 'utf8' }));
}
async function file__async_writebytes(path: string, bytes: Uint8Array): Promise<void> {
  await error__callasync(Error().stack, directory__async_create(path__getparentpath(path)));
  return await error__callasync(Error().stack, NODE_FS.promises.writeFile(path__join(path), bytes));
}
async function file__async_writetext(path: string, text: string): Promise<void> {
  await error__callasync(Error().stack, directory__async_create(path__getparentpath(path)));
  return await error__callasync(Error().stack, NODE_FS.promises.writeFile(path__join(path), text));
}

// Path

async function path__async_getstats(path: string): Promise<NODE_FS.Stats> {
  return await error__callasync(Error().stack, NODE_FS.promises.stat(path__join(path)));
}
async function path__async_isdirectory(path: string): Promise<boolean> {
  return (await path__async_getstats(path)).isDirectory();
}
async function path__async_isfile(path: string): Promise<boolean> {
  return (await path__async_getstats(path)).isFile();
}
async function path__async_issymboliclink(path: string): Promise<boolean> {
  return (await path__async_getstats(path)).isSymbolicLink();
}

function path__getbasename(path: string): string {
  return path__slice(path, -1);
}
function path__getextension(path: string): string {
  const basename = path__getbasename(path);
  return basename.indexOf('.') > 0 //
    ? basename.slice(basename.lastIndexOf('.'))
    : '';
}
function path__getname(path: string): string {
  const basename = path__getbasename(path);
  return basename.indexOf('.') > 0 //
    ? basename.slice(0, basename.lastIndexOf('.'))
    : basename;
}
function path__getparentpath(path: string): string {
  return path__slice(path, 0, -1);
}

function path__newbasename(path: string, value: string): string {
  const segments = path__join(path)
    .split(/[\\\/]/)
    .filter(({ length }) => length > 0);
  if (segments.length > 0) {
    segments[segments.length - 1] = value;
  } else {
    segments[0] = value;
  }
  return segments.join(NODE_PATH.sep);
}
function path__newextension(path: string, value: string): string {
  const name = path__getname(path);
  if (value[0] !== '.') {
    return path__newbasename(path, `${name}.${value}`);
  } else {
    return path__newbasename(path, name + value);
  }
}
function path__newname(path: string, value: string): string {
  return path__newbasename(path, value + path__getextension(path));
}

function path__join(...paths: string[]): string {
  return NODE_PATH.join(...paths);
}
function path__joinstandard(...paths: string[]): string {
  return NODE_PATH.join(...paths).replaceAll('\\', '/');
}
function path__resolve(...paths: string[]): string {
  // return Core.Map.GetOrDefault(PATH__RESOLVE_CACHE, path, () => {
  return NODE_PATH.resolve(...paths);
  // });
}
function path__resolvestandard(...paths: string[]): string {
  // return Core.Map.GetOrDefault(PATH__RESOLVE_CACHE, path, () => {
  return NODE_PATH.resolve(...paths).replaceAll('\\', '/');
  // });
}
function path__slice(path: string, begin: number, end?: number): string {
  const segments = path__join(path)
    .split(/[\\\/]/)
    .filter(({ length }) => length > 0);
  return segments.slice(begin, end).join(NODE_PATH.sep);
}
function path__slicestandard(path: string, begin: number, end?: number): string {
  const segments = path__join(path)
    .split(/[\\\/]/)
    .filter(({ length }) => length > 0);
  return segments.slice(begin, end).join('/');
}

// Shell

function shell__cursor__erasecurrentline(): void {
  process.stdout.write(`${SHELL__KEYS_CSI}2K`);
}
function shell__cursor__hidecursor(): void {
  process.stdout.write(`${SHELL__KEYS_CSI}?25l`);
  if (shell__exittrapisset === false) {
    shell__setupexittrapforcursor();
  }
}
function shell__cursor__movecursordown(count = 0, to_start = false): void {
  if (to_start === true) {
    process.stdout.write(`${SHELL__KEYS_CSI}${count}E`);
  } else {
    process.stdout.write(`${SHELL__KEYS_CSI}${count}B`);
  }
}
function shell__cursor__movecursorleft(count = 0): void {
  process.stdout.write(`${SHELL__KEYS_CSI}${count}D`);
}
function shell__cursor__movecursorright(count = 0): void {
  process.stdout.write(`${SHELL__KEYS_CSI}${count}C`);
}
function shell__cursor__movecursorstart(): void {
  process.stdout.write('\r');
}
function shell__cursor__movecursortocolumn(count = 0): void {
  process.stdout.write(`${SHELL__KEYS_CSI}${count}G`);
}
function shell__cursor__movecursorup(count = 0, to_start = false): void {
  if (to_start === true) {
    process.stdout.write(`${SHELL__KEYS_CSI}${count}F`);
  } else {
    process.stdout.write(`${SHELL__KEYS_CSI}${count}A`);
  }
}
function shell__cursor__showcursor(): void {
  process.stdout.write(`${SHELL__KEYS_CSI}?25h`);
}

function shell__stdin__addlistener(listener: (bytes: Uint8Array, text: string, removeSelf: () => boolean) => void | Promise<void>): void {
  SHELL__STDIN__LISTENERSET.add(listener);
}
function shell__stdin__lockreader(): () => void {
  const release = () => {
    SHELL__STDIN__READERLOCKS.delete(release);
    shell__stdin__stopreader();
  };
  SHELL__STDIN__READERLOCKS.add(release);
  return release;
}
function shell__stdin__readerhandler(bytes: Uint8Array): void {
  const text = Core.Utility.DecodeBytes(bytes);
  for (const listener of SHELL__STDIN__LISTENERSET) {
    Core.Promise.Orphan(listener(bytes, text, () => SHELL__STDIN__LISTENERSET.delete(listener)));
  }
}
function shell__stdin__startreader(): void {
  if (shell__stdin__readerenabled === true && shell__stdin__rawmodeenabled === true) {
    shell__stdin__stopreader();
  }
  if (shell__stdin__readerenabled === false) {
    process.stdin //
      .addListener('data', shell__stdin__readerhandler)
      .resume();
    shell__stdin__readerenabled = true;
    shell__stdin__rawmodeenabled = false;
  }
}
function shell__stdin__startreaderinrawmode(): void {
  if (shell__stdin__readerenabled === true && shell__stdin__rawmodeenabled === false) {
    shell__stdin__stopreader();
  }
  if (shell__stdin__readerenabled === false) {
    process.stdin //
      .setRawMode(true)
      .addListener('data', shell__stdin__readerhandler)
      .resume();
    shell__stdin__readerenabled = true;
    shell__stdin__rawmodeenabled = true;
  }
}
function shell__stdin__stopreader(): void {
  if (SHELL__STDIN__READERLOCKS.size === 0) {
    if (shell__stdin__readerenabled === true) {
      process.stdin //
        .pause()
        .removeListener('data', shell__stdin__readerhandler)
        .setRawMode(false);
      shell__stdin__readerenabled = true;
      shell__stdin__rawmodeenabled = false;
    }
  }
}

export namespace NodePlatform {
  export namespace Directory {
    export const Async_Create = directory__async_create;
    export const Async_Delete = directory__async_delete;
    export const Async_ReadDir = directory__async_readdir;
    //
    export const Watch = directory__watch;
  }
  export namespace File {
    export const Async_AppendBytes = file__async_appendbytes;
    export const Async_AppendText = file__async_appendtext;
    export const Async_ReadBytes = file__async_readbytes;
    export const Async_ReadText = file__async_readtext;
    export const Async_WriteBytes = file__async_writebytes;
    export const Async_WriteText = file__async_writetext;
  }
  export namespace Path {
    export const Async_GetStats = path__async_getstats;
    export const Async_IsDirectory = path__async_isdirectory;
    export const Async_IsFile = path__async_isfile;
    export const Async_IsSymbolicLink = path__async_issymboliclink;
    //
    /**
     * Gets the rightmost segment of the path.
     */
    export const GetBaseName = path__getbasename;
    /**
     * Gets all characters in the basename that appear right of the final dot,
     * including the dot. If the basename starts with a dot and has no other
     * dots, returns empty string. If the basename has no dots, returns empty
     * string.
     */
    export const GetExtension = path__getextension;
    /**
     * Gets all characters in the basename that appear left of the final dot,
     * excluding the dot. If the basename starts with a dot and has no other
     * dots, returns the entire segment.
     */
    export const GetName = path__getname;
    /**
     * Gets the path excluding the rightmost segment.
     */
    export const GetParentPath = path__getparentpath;
    /**
     * Returns a new path string with the rightmost segment of the path st to
     * value.
     */
    export const NewBaseName = path__newbasename;
    /**
     * Returns a new path string with all characters in the basename that
     * appear right of the final dot set to `value`.
     */
    export const NewExtension = path__newextension;
    /**
     * Returns a new path string with all characters in the basename that
     * appear left of the final dot set to `value`.
     */
    export const NewName = path__newname;
    //
    export const Join = path__join;
    export const JoinStandard = path__joinstandard;
    export const Resolve = path__resolve;
    export const ResolveStandard = path__resolvestandard;
    export const Slice = path__slice;
    export const SliceStandard = path__slicestandard;
  }
  export namespace Shell {
    export namespace Cursor {
      export const EraseCurrentLine = shell__cursor__erasecurrentline;
      export const HideCursor = shell__cursor__hidecursor;
      export const MoveCursorDown = shell__cursor__movecursordown;
      export const MoveCursorLeft = shell__cursor__movecursorleft;
      export const MoveCursorRight = shell__cursor__movecursorright;
      export const MoveCursorStart = shell__cursor__movecursorstart;
      export const MoveCursorToColumn = shell__cursor__movecursortocolumn;
      export const MoveCursorUp = shell__cursor__movecursorup;
      export const ShowCursor = shell__cursor__showcursor;
    }
    export const KEYS = SHELL__KEYS;
    export namespace StdIn {
      export const AddListener = shell__stdin__addlistener;
      export const LockReader = shell__stdin__lockreader;
      export const StartReader = shell__stdin__startreader;
      export const StartReaderInRawMode = shell__stdin__startreaderinrawmode;
      export const StopReader = shell__stdin__stopreader;
    }
  }
}
