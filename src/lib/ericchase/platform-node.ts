import { Core_Array_Split, Core_Console_Error, Core_JSON_ParseRawString, Core_String_Split, Core_String_SplitLines, Core_String_SplitMultipleSpaces } from './api.core.js';
import { NodePlatform_Path_Resolve, NodePlatform_Shell_Cursor_ShowCursor } from './api.platform-node.js';

const PATH__RESOLVE_CACHE = new Map<string, string>();
const PATH__RESOLVED_CWD = NodePlatform_Path_Resolve(process.cwd());

/**
 * The Core_JSON_ParseRawString(String.raw``)s are to keep bundlers (i.e Bun)
 * from replacing the unicode code points with an alternative representation.
 */
const SHELL__GENERALASCIICODES = internal_shell_create_ascii_code_map(String.raw`
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
    DOWN: Core_JSON_ParseRawString(String.raw`\u001B[B`),
    LEFT: Core_JSON_ParseRawString(String.raw`\u001B[D`),
    RIGHT: Core_JSON_ParseRawString(String.raw`\u001B[C`),
    UP: Core_JSON_ParseRawString(String.raw`\u001B[A`),
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
  SIGINT: Core_JSON_ParseRawString(String.raw`\u0003`), // Kill the currently running task in terminal.
};

/**
 * Gotchas:
 * If the stdin stream is switched to utf8 mode, it cannot be switched back to byte
 * mode (need to verify again). Instead, leave it in byte mode, and decode the bytes.
 */
const SHELL__STDIN__LISTENERSET = new Set<(bytes: Uint8Array, text: string, removeSelf: () => boolean) => void | Promise<void>>();
const SHELL__STDIN__READERLOCKS = new Set<() => void>();

const internal_shell_data = {
  exit_trap_is_set: false,
  stdin_raw_mode_enabled: false,
  stdin_reader_enabled: false,
};

function internal_error_clean_call_stack(stack = ''): string {
  const lines = Core_String_SplitLines(stack ?? '');
  if (lines[0].trim() === 'Error') {
    lines[0] = 'Fixed Call Stack:';
  }
  return lines.join('\n');
}

async function internal_error_call_async<T>(stack: string | undefined, promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (async_error: any) {
    if (typeof async_error === 'object') {
      const error = new Error(`${async_error.message}\n${internal_error_clean_call_stack(stack ?? '')}`);
      for (const key in async_error) {
        Object.defineProperty(error, key, { value: async_error[key] });
      }
      throw error;
    }
    throw new Error(`${async_error}\n${internal_error_clean_call_stack(stack ?? '')}`);
  }
}

function internal_shell_create_ascii_code_map(table: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [name, code] of Core_Array_Split(Core_String_Split(table.trim(), '|', true), 3)) {
    map[name.trim()] = Core_JSON_ParseRawString(Core_String_SplitMultipleSpaces(code, true)[0]);
  }
  return map;
}

function internal_shell_listen_for_uncaught_exception(error: Error, origin: NodeJS.UncaughtExceptionOrigin): void {
  NodePlatform_Shell_Cursor_ShowCursor();
  if (process.listeners('uncaughtException').length === 1) {
    Core_Console_Error('Uncaught exception:', error);
    process.exit();
  }
}

function internal_shell_setup_exit_trap_for_cursor(): void {
  internal_shell_data.exit_trap_is_set = true;
  process.on('exit', NodePlatform_Shell_Cursor_ShowCursor);
  process.on('SIGINT', NodePlatform_Shell_Cursor_ShowCursor);
  process.on('uncaughtException', () => internal_shell_listen_for_uncaught_exception);
}

export {
  //
  internal_error_call_async,
  internal_shell_data,
  internal_shell_setup_exit_trap_for_cursor,
  PATH__RESOLVED_CWD,
  SHELL__KEYS,
  SHELL__KEYS_CSI,
  SHELL__STDIN__LISTENERSET,
  SHELL__STDIN__READERLOCKS,
};
