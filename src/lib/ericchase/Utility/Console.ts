let newline_count = 0;

export function ConsoleError(...items: any[]) {
  // biome-ignore lint: this let's us search for undesired console[error]s
  console['error'](...items);
  newline_count = 0;
}

export function ConsoleErrorNotEmpty(...items: any[]) {
  for (const item of items) {
    if (Array.isArray(item) && item.length === 0) continue;
    if (ArrayBuffer.isView(item) && item.byteLength === 0) continue;
    if (typeof item === 'string' && item.length === 0) continue;

    // biome-ignore lint: this let's us search for undesired console[log]s
    console['error'](...items);
    newline_count = 0;
    break;
  }
}

export function ConsoleErrorWithDate(...items: any[]) {
  // biome-ignore lint: this let's us search for undesired console[error]s
  console['error'](`[${new Date().toLocaleString()}]`, ...items);
  newline_count = 0;
}

export function ConsoleLog(...items: any[]) {
  // biome-ignore lint: this let's us search for undesired console[log]s
  console['log'](...items);
  newline_count = 0;
}

export function ConsoleLogNotEmpty(...items: any[]) {
  for (const item of items) {
    if (Array.isArray(item) && item.length === 0) continue;
    if (ArrayBuffer.isView(item) && item.byteLength === 0) continue;
    if (typeof item === 'string' && item.length === 0) continue;

    // biome-ignore lint: this let's us search for undesired console[log]s
    console['log'](...items);
    newline_count = 0;
    break;
  }
}

export function ConsoleLogWithDate(...items: any[]) {
  // biome-ignore lint: this let's us search for undesired console[log]s
  console['log'](`[${new Date().toLocaleString()}]`, ...items);
  newline_count = 0;
}

export function ConsoleNewline(ensure_count = 1) {
  for (let i = newline_count; i < ensure_count; i++) {
    // biome-ignore lint: this let's us search for undesired console[log]s
    console['log']();
    newline_count++;
  }
}

export function ConsoleLogToLines(items: Iterable<any>) {
  if (typeof items === 'string') {
    ConsoleLog(items);
  } else {
    for (const item of items) {
      ConsoleLog(item);
    }
  }
}

export function ConsoleErrorToLines(items: Iterable<any>) {
  if (typeof items === 'string') {
    ConsoleError(items);
  } else {
    for (const item of items) {
      ConsoleError(item);
    }
  }
}
