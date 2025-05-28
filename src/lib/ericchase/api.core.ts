import { ARRAY__UINT8__B64_TO_BYTE, ARRAY__UINT8__BYTE_TO_B64, ARRAY__UINT8__EMPTY, ClassArrayUint8Group, ClassStreamUint8Reader, ClassUtilityCRC32, ClassUtilityDefer, MATH__FACTORIAL__CACHE, UTILITY__CRC32__TABLE } from './core.js';

export type Core_Type_JSON_Array = (Core_Type_JSON_Array | Core_Type_JSON_Object | Core_Type_JSON_Primitive)[];
export type Core_Type_JSON_Object = Core_Type_Record_Recursive<string, Core_Type_JSON_Array | Core_Type_JSON_Primitive>;
export type Core_Type_JSON_ParseResult = Core_Type_JSON_Array | Core_Type_JSON_Object | Core_Type_JSON_Primitive;
export type Core_Type_JSON_Primitive = null | boolean | number | string;
export type Core_Type_Record_Empty = Record<string, never>;
export type Core_Type_Record_Recursive<K extends keyof any, T> = { [P in K]: T | Core_Type_Record_Recursive<K, T> };

export function Core_Array_AreEqual(array: ArrayLike<unknown>, other: ArrayLike<unknown>): boolean {
  if (array.length !== other.length) {
    return false;
  }
  for (let i = 0; i < array.length; i++) {
    if (array[i] !== other[i]) {
      return false;
    }
  }
  return true;
}

export function Core_Array_BinarySearch_ExactMatch<T>(array: T[], target: T, isOrdered: (a: T, b: T) => boolean = (a: T, b: T) => a < b): number {
  /** Returns index of item that "equals" target; otherwise, -1. */
  let [begin, end] = Core_Array_GetEndpoints(array);
  let middle = Core_Math_GetMidpoint(begin, end);
  while (begin < end) {
    if (isOrdered(target, array[middle])) {
      end = middle;
    } else {
      begin = middle + 1;
    }
    middle = Core_Math_GetMidpoint(begin, end);
  }
  if (isOrdered(array[middle - 1], target) === false) {
    return middle - 1;
  }
  return -1;
}

export function Core_Array_BinarySearch_InsertionIndex<T>(array: T[], target: T, isOrdered: (a: T, b: T) => boolean = (a: T, b: T) => a < b): number {
  /** Returns index of item that "equals" target; otherwise, index of item "less" than target. */
  let [begin, end] = Core_Array_GetEndpoints(array);
  let middle = Core_Math_GetMidpoint(begin, end);
  while (begin < end) {
    if (isOrdered(target, array[middle])) {
      end = middle;
    } else {
      begin = middle + 1;
    }
    middle = Core_Math_GetMidpoint(begin, end);
  }
  return middle - 1;
}

export function* Core_Array_Gen_BufferToBytes(buffer: ArrayBufferLike): Generator<number> {
  const view = new DataView(buffer);
  for (let i = 0; i < view.byteLength; i++) {
    yield view.getUint8(i) >>> 0;
  }
}

export function* Core_Array_Gen_Chunks<T>(array: T[], count: number): Generator<{ begin: number; end: number; slice: T[] }> {
  if (count > array.length) {
    yield { begin: 0, end: array.length, slice: array.slice() };
  } else if (count > 0) {
    let i = count;
    for (; i < array.length; i += count) {
      yield { begin: i - count, end: i, slice: array.slice(i - count, i) };
    }
    yield { begin: i - count, end: array.length, slice: array.slice(i - count) };
  } else {
    yield { begin: 0, end: 0, slice: [] };
  }
}

export function* Core_Array_Gen_SlidingWindow<T extends unknown[]>(array: T, count: number): Generator<{ begin: number; end: number; slice: T }> {
  if (count > 0) {
    if (count < array.length) {
      let i = count;
      for (; i < array.length; i++) {
        yield { begin: i - count, end: i, slice: array.slice(i - count, i) as T };
      }
      yield { begin: i - count, end: array.length, slice: array.slice(i - count) as T };
    } else {
      yield { begin: 0, end: array.length, slice: array.slice() as T };
    }
  }
}

export function* Core_Array_Gen_Zip<T extends readonly Iterable<any>[]>(...iterables: T): Generator<{ [K in keyof T]: T[K] extends Iterable<infer U> ? U | undefined : undefined }> {
  let mock_count = 0;
  const mock_iterable: IterableIterator<any> = {
    next() {
      return { value: undefined, done: false };
    },
    [Symbol.iterator]() {
      return this;
    },
  };
  function process_iterators<I extends Iterator<any>[]>(iterators: I): { [K in keyof I]: I[K] extends Iterator<infer U> ? U | undefined : undefined } {
    const values = [] as unknown as { [K in keyof I]: I[K] extends Iterator<infer U> ? U | undefined : undefined };
    for (let index = 0; index < iterators.length; index++) {
      const next = iterators[index].next();
      if ('done' in next && next.done === true) {
        mock_count++;
        iterators[index] = mock_iterable;
        values[index] = undefined;
      } else {
        values[index] = 'value' in next ? next.value : undefined;
      }
    }
    return values;
  }
  const iterators: Iterator<any>[] = [];
  for (const iterable of iterables) {
    try {
      iterators.push(iterable[Symbol.iterator]());
    } catch (error) {
      mock_count++;
      iterators.push(mock_iterable[Symbol.iterator]());
    }
  }
  let values = process_iterators(iterators);
  while (mock_count < iterators.length) {
    yield values as { [K in keyof T]: T[K] extends Iterable<infer U> ? U | undefined : undefined };
    values = process_iterators(iterators);
  }
}

export function Core_Array_GetEndpoints(array: ArrayLike<unknown>): [number, number] {
  if (!Array.isArray(array) || array.length < 1) {
    return [-1, -1];
  }
  return [0, array.length];
}

export function Core_Array_Shuffle<T>(items: T[], in_place = true): T[] {
  const last = items.length - 1;
  for (let i = 0; i < items.length; i++) {
    let random = Math.floor(Math.random() * last);
    [items[last], items[random]] = [items[random], items[last]];
  }
  return items;
}

export function Core_Array_Split<T>(array: T[], count: number): T[][] {
  return [...Core_Array_Gen_Chunks(array, count)].map((chunk) => chunk.slice);
}

export function Core_Array_Uint32_ToHex(uint: number): string[] {
  return Core_Array_Uint8_ToHex(Core_Array_Uint8_FromUint32(uint));
}

export function Core_Array_Uint8_Class_Group(): ClassArrayUint8Group {
  return new ClassArrayUint8Group();
}

export function Core_Array_Uint8_Concat(arrays: readonly Uint8Array[]): Uint8Array {
  let totalLength = 0;
  for (const array of arrays) {
    totalLength += array.length;
  }
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const array of arrays) {
    result.set(array, offset);
    offset += array.length;
  }
  return result;
}

export function Core_Array_Uint8_Copy(bytes: Uint8Array, count: number, offset = 0): Uint8Array {
  return bytes.slice(offset, offset + count);
}

export function Core_Array_Uint8_FromBase64(b64_str: string): Uint8Array {
  if (b64_str.length % 4 === 0) {
    const b64_padding = (b64_str[b64_str.length - 1] === '=' ? 1 : 0) + (b64_str[b64_str.length - 2] === '=' ? 1 : 0);
    const b64_bytes = new Uint8Array(b64_str.length - b64_padding);
    for (let i = 0; i < b64_bytes.byteLength; ++i) {
      b64_bytes[i] = ARRAY__UINT8__B64_TO_BYTE.get(b64_str[i]) ?? 0;
    }
    const u8_out = new Uint8Array((b64_str.length / 4) * 3 - b64_padding);
    let u8_offset = 0;
    let b64_index = 0;
    while (b64_index + 4 <= b64_bytes.length) {
      for (const byte of new Uint8Array([
        ((0b00111111 & b64_bytes[b64_index]) << 2) | ((0b00110000 & b64_bytes[b64_index + 1]) >> 4), //
        /*                                        */ ((0b00001111 & b64_bytes[b64_index + 1]) << 4) | ((0b00111100 & b64_bytes[b64_index + 2]) >> 2),
        /*                                                                                         */ ((0b00000011 & b64_bytes[b64_index + 2]) << 6) | (0b00111111 & b64_bytes[b64_index + 3]),
      ])) {
        u8_out[u8_offset] = byte;
        ++u8_offset;
      }
      b64_index += 4;
    }
    switch (u8_out.length - u8_offset) {
      case 2: {
        for (const byte of new Uint8Array([
          ((0b00111111 & b64_bytes[b64_index]) << 2) | ((0b00110000 & b64_bytes[b64_index + 1]) >> 4), //
          /*                                        */ ((0b00001111 & b64_bytes[b64_index + 1]) << 4) | ((0b00111100 & b64_bytes[b64_index + 2]) >> 2),
        ])) {
          u8_out[u8_offset] = byte;
          ++u8_offset;
        }
        break;
      }
      case 1: {
        for (const byte of new Uint8Array([
          ((0b00111111 & b64_bytes[b64_index]) << 2) | ((0b00110000 & b64_bytes[b64_index + 1]) >> 4), //
        ])) {
          u8_out[u8_offset] = byte;
          ++u8_offset;
        }
        break;
      }
    }
    return u8_out;
  }
  return new Uint8Array(0);
}

export function Core_Array_Uint8_FromString(from: string): Uint8Array {
  return new TextEncoder().encode(from);
}

export function Core_Array_Uint8_FromUint32(from: number): Uint8Array {
  const u8s = new Uint8Array(4);
  const view = new DataView(u8s.buffer);
  view.setUint32(0, from >>> 0, false);
  return u8s;
}

export function Core_Array_Uint8_Split(bytes: Uint8Array, count: number): Uint8Array[] {
  if (count > bytes.byteLength) {
    return [bytes.slice()];
  }
  if (count > 0) {
    const parts: Uint8Array[] = [];
    for (let i = 0; i < bytes.length; i += count) {
      parts.push(bytes.slice(i, i + count));
    }
    return parts;
  }
  return [bytes.slice()];
}

export function Core_Array_Uint8_Take(bytes: Uint8Array, count: number): [Uint8Array, Uint8Array] {
  if (count > bytes.byteLength) {
    return [bytes.slice(), new Uint8Array()];
  }
  if (count > 0) {
    const chunkA = bytes.slice(0, count);
    const chunkB = bytes.slice(count);
    return [chunkA, chunkB];
  }
  return [new Uint8Array(), bytes.slice()];
}

export function Core_Array_Uint8_TakeEnd(bytes: Uint8Array, count: number): [Uint8Array, Uint8Array] {
  if (count > bytes.byteLength) {
    return [bytes.slice(), new Uint8Array()];
  }
  if (count > 0) {
    const chunkA = bytes.slice(bytes.byteLength - count);
    const chunkB = bytes.slice(0, bytes.byteLength - count);
    return [chunkA, chunkB];
  }
  return [new Uint8Array(), bytes.slice()];
}

export function Core_Array_Uint8_ToASCII(bytes: Uint8Array): string {
  // appending to string has best overall performance for chrome and firefox
  let ascii = '';
  for (const byte of bytes) {
    ascii += String.fromCharCode(byte >>> 0);
  }
  return ascii;
}

export function Core_Array_Uint8_ToBase64(u8_bytes: Uint8Array): string {
  let b64_out = '';
  let u8_index = 0;
  while (u8_index + 3 <= u8_bytes.length) {
    for (const byte of new Uint8Array([
      ((0b11111100 & u8_bytes[u8_index]) >> 2) | 0, //
      ((0b00000011 & u8_bytes[u8_index]) << 4) | ((0b11110000 & u8_bytes[u8_index + 1]) >> 4),
      /*                         */ ((0b00001111 & u8_bytes[u8_index + 1]) << 2) | ((0b11000000 & u8_bytes[u8_index + 2]) >> 6),
      /*                                                            */ (0b00111111 & u8_bytes[u8_index + 2]) | 0,
    ])) {
      b64_out += ARRAY__UINT8__BYTE_TO_B64[byte];
    }
    u8_index += 3;
  }
  switch (u8_bytes.length - u8_index) {
    case 2: {
      for (const byte of new Uint8Array([
        ((0b11111100 & u8_bytes[u8_index]) >> 2) | 0, //
        ((0b00000011 & u8_bytes[u8_index]) << 4) | ((0b11110000 & u8_bytes[u8_index + 1]) >> 4),
        /*                         */ ((0b00001111 & u8_bytes[u8_index + 1]) << 2) | 0,
      ])) {
        b64_out += ARRAY__UINT8__BYTE_TO_B64[byte];
      }
      b64_out += '=';
      break;
    }
    case 1: {
      for (const byte of new Uint8Array([
        ((0b11111100 & u8_bytes[u8_index]) >> 2) | 0, //
        ((0b00000011 & u8_bytes[u8_index]) << 4) | 0,
      ])) {
        b64_out += ARRAY__UINT8__BYTE_TO_B64[byte];
      }
      b64_out += '==';
      break;
    }
  }
  return b64_out;
}

export function Core_Array_Uint8_ToDecimal(bytes: Uint8Array): string[] {
  // Array[index] has best overall performance for chrome and firefox
  const decimal: string[] = new Array(bytes.byteLength);
  for (let i = 0; i < bytes.byteLength; i += 1) {
    decimal[i] = (bytes[i] >>> 0).toString(10);
  }
  return decimal;
}

export function Core_Array_Uint8_ToHex(bytes: Uint8Array): string[] {
  // Array[index] has best overall performance for chrome and firefox
  const hex: string[] = new Array(bytes.byteLength);
  for (let i = 0; i < bytes.byteLength; i += 1) {
    hex[i] = (bytes[i] >>> 0).toString(16).padStart(2, '0');
  }
  return hex;
}

export function Core_Array_Uint8_ToLines(bytes: Uint8Array): string[] {
  // Array.split() beats Array[index] here for overall performance
  return Core_String_SplitLines(Core_Array_Uint8_ToString(bytes));
}

export function Core_Array_Uint8_ToString(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

export function Core_Assert_BigInt(value: any): value is bigint {
  if (typeof value !== 'bigint') {
    throw new Error(`Assertion Failed: typeof value(${value}) should equal bigint`);
  }
  return true;
}

export function Core_Assert_Boolean(value: any): value is boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`Assertion Failed: typeof value(${value}) should equal boolean`);
  }
  return true;
}

export function Core_Assert_Equal(value1: any, value2: any): true {
  if (value1 !== value2) {
    throw new Error(`Assertion Failed: value1(${value1}) should equal value2(${value2})`);
  }
  return true;
}

export function Core_Assert_Function<T>(value: any): value is T {
  if (typeof value !== 'function') {
    throw new Error(`Assertion Failed: typeof value(${value}) should equal function`);
  }
  return true;
}

export function Core_Assert_NotEqual(value1: any, value2: any): true {
  if (value1 === value2) {
    throw new Error(`Assertion Failed: value1(${value1}) should not equal value2(${value2})`);
  }
  return true;
}

export function Core_Assert_Number(value: any): value is number {
  if (typeof value !== 'number') {
    throw new Error(`Assertion Failed: typeof value(${value}) should equal number`);
  }
  return true;
}

export function Core_Assert_Object(value: any): value is object {
  if (typeof value !== 'object') {
    throw new Error(`Assertion Failed: typeof value(${value}) should equal object`);
  }
  return true;
}

export function Core_Assert_String(value: any): value is string {
  if (typeof value !== 'string') {
    throw new Error(`Assertion Failed: typeof value(${value}) should equal string`);
  }
  return true;
}

export function Core_Assert_Symbol(value: any): value is symbol {
  if (typeof value !== 'symbol') {
    throw new Error(`Assertion Failed: typeof value(${value}) should equal symbol`);
  }
  return true;
}

export function Core_Assert_Undefined(value: any): value is undefined {
  if (typeof value !== 'undefined') {
    throw new Error(`Assertion Failed: typeof value(${value}) should equal undefined`);
  }
  return true;
}

export function Core_Console_Error(...items: any[]): void {
  console['error'](...items);
}

export function Core_Console_ErrorWithDate(...items: any[]): void {
  console['error'](`[${new Date().toLocaleString()}]`, ...items);
}

export function Core_Console_Log(...items: any[]): void {
  console['log'](...items);
}

export function Core_Console_LogWithDate(...items: any[]): void {
  console['log'](`[${new Date().toLocaleString()}]`, ...items);
}

export function Core_JSON_Analyze(obj: unknown): { source: Core_Type_JSON_Array; type: 'array' } | { source: Core_Type_JSON_Object; type: 'object' } | { source: Core_Type_JSON_Primitive; type: 'primitive' } {
  /** @param {any} obj - Any value that is ***NOT*** a JSON string. This function does ***NOT*** call `JSON.parse()`. */
  if (Array.isArray(obj)) {
    for (const item of obj) {
      Core_JSON_Analyze(item);
    }
    return { source: obj as Core_Type_JSON_Array, type: 'array' };
  }
  if (obj === null || typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return { source: obj as Core_Type_JSON_Primitive, type: 'primitive' };
  }
  if (obj === undefined || typeof obj === 'bigint' || typeof obj === 'symbol' || typeof obj === 'undefined' || typeof obj === 'function') {
    throw TypeError('Invalid');
  }
  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      Core_JSON_Analyze((obj as Core_Type_JSON_Object)[key]);
    }
  }
  return { source: obj as Core_Type_JSON_Object, type: 'object' };
}

export function Core_JSON_Merge(...sources: unknown[]): Core_Type_JSON_ParseResult {
  if (sources.length === 0) return null;
  if (sources.length === 1) return Core_JSON_Analyze(sources[0]).source;
  const head = Core_JSON_Analyze(sources[0]);
  for (const source of sources.slice(1)) {
    if (Core_JSON_Analyze(source).type !== head.type) {
      throw TypeError('Cannot merge JSON strings of different types. Every JSON string must be all arrays, all objects, or all primitives.');
    }
  }
  if (head.type === 'array') {
    const result: Core_Type_JSON_Array = [];
    for (const source of sources as Core_Type_JSON_Array[]) {
      result.push(...source);
    }
    return result;
  }
  if (head.type === 'object') {
    function mergeinto(result: Core_Type_JSON_Object, source: Core_Type_JSON_Object) {
      for (const key in source) {
        if (Object.hasOwn(result, key) === false) {
          result[key] = {};
        }
        const { type: r_type } = Core_JSON_Analyze(result[key]);
        const { type: s_type } = Core_JSON_Analyze(source[key]);
        if (r_type === 'object' && s_type === 'object') {
          mergeinto(result[key] as Core_Type_JSON_Object, source[key] as Core_Type_JSON_Object);
        } else if (r_type === 'array' && s_type === 'array') {
          result[key] = [...(result[key] as Core_Type_JSON_Array[]), ...(source[key] as Core_Type_JSON_Array[])];
        } else {
          result[key] = source[key];
        }
      }
      return result;
    }
    const result: Core_Type_JSON_Object = {};
    for (const source of sources as Core_Type_JSON_Object[]) {
      mergeinto(result, source);
    }
    return result;
  }
  return Core_JSON_Analyze(sources[sources.length - 1]).source;
}

export function Core_JSON_ParseRawString(str: string): string {
  return JSON.parse(`"${str}"`);
}

export function Core_Map_GetOrDefault<K, V>(map: Map<K, V>, key: K, newValue: () => V): V {
  if (map.has(key)) {
    return map.get(key) as V;
  }
  const value = newValue();
  map.set(key, value);
  return value;
}

export function Core_Math_Factorial(n: number): bigint {
  if (!(n in MATH__FACTORIAL__CACHE)) {
    let fact = MATH__FACTORIAL__CACHE[MATH__FACTORIAL__CACHE.length - 1];
    for (let i = MATH__FACTORIAL__CACHE.length; i < n; i++) {
      fact *= BigInt(i);
      MATH__FACTORIAL__CACHE[i] = fact;
    }
    MATH__FACTORIAL__CACHE[n] = fact * BigInt(n);
  }
  return MATH__FACTORIAL__CACHE[n];
}

export function* Core_Math_Gen_CartesianProduct<A extends readonly unknown[], B extends readonly unknown[]>(array_a: A, array_b: B): Generator<[A[number], B[number]], void, unknown> {
  // The 2-Combination is what I formerly referred to as the SelfCartesianProduct
  // `ChooseRCombinations([1, 2], 2)]);`
  for (let i = 0; i < array_a.length; i++) {
    for (let j = 0; j < array_b.length; j++) {
      yield [array_a[i], array_b[j]];
    }
  }
}

export function* Core_Math_Gen_NCartesianProducts<T extends unknown[][]>(...arrays: T): Generator<{ [K in keyof T]: T[K][number] }> {
  const count = arrays.reduce((product, arr) => product * BigInt(arr.length), 1n);
  const out = arrays.map((arr) => arr[0]) as { [K in keyof T]: T[K][number] };
  const indices: number[] = new Array(arrays.length).fill(0);
  const lengths: number[] = arrays.map((arr) => arr.length);
  for (let c = 0n; c < count; c++) {
    yield out.slice() as { [K in keyof T]: T[K][number] };
    let i = arrays.length - 1;
    for (let j = 0; j < arrays.length; j++, i--) {
      indices[i]++;
      if (indices[i] < lengths[i]) {
        out[i] = arrays[i][indices[i]];
        break;
      }
      indices[i] = 0;
      out[i] = arrays[i][0];
    }
  }
}

export function* Core_Math_Gen_NChooseRCombinations<T>(choices: T[], r: number, repetitions = false): Generator<T[]> {
  const count = Core_Math_nCr(choices.length, r, repetitions);
  if (repetitions === true) {
    const out: T[] = new Array(r).fill(choices[0]);
    const indices: number[] = new Array(r).fill(0);
    for (let c = typeof count === 'bigint' ? 0n : 0; c < count; c++) {
      yield out.slice();
      let i = r - 1;
      for (let j = 0; j < r; j++, i--) {
        indices[i]++;
        if (indices[i] < choices.length /* - j */) {
          out[i] = choices[indices[i]];
          break;
        }
      }
      for (i++; i < r; i++) {
        indices[i] = indices[i - 1] /* + 1 */;
        out[i] = choices[indices[i]];
      }
    }
  } else {
    const out: T[] = choices.slice(0, r);
    const indices = [...out.keys()];
    for (let c = typeof count === 'bigint' ? 0n : 0; c < count; c++) {
      yield out.slice();
      let i = r - 1;
      for (let j = 0; j < r; j++, i--) {
        indices[i]++;
        if (indices[i] < choices.length - j) {
          out[i] = choices[indices[i]];
          break;
        }
      }
      for (i++; i < r; i++) {
        indices[i] = indices[i - 1] + 1;
        out[i] = choices[indices[i]];
      }
    }
  }
}

export function* Core_Math_Gen_NChooseRPermutations<T>(choices: T[], r: number, repetitions = false): Generator<T[]> {
  const count = Core_Math_nPr(choices.length, r, repetitions);
  if (repetitions === true) {
    const out: T[] = new Array(r).fill(choices[0]);
    const indices: number[] = new Array(r).fill(0);
    for (let c = typeof count === 'bigint' ? 0n : 0; c < count; c++) {
      yield out.slice();
      let i = r - 1;
      for (let j = 0; j < r; j++, i--) {
        indices[i]++;
        if (indices[i] < choices.length) {
          out[i] = choices[indices[i]];
          break;
        }
        indices[i] = 0;
        out[i] = choices[0];
      }
    }
  } else {
    const out: T[] = choices.slice(0, r);
    const indices: number[] = [...out.keys()];
    const imap: number[] = new Array(choices.length).fill(0);
    for (let i = 0; i < r; i++) {
      imap[i] = 1;
    }
    for (let c = typeof count === 'bigint' ? 0n : 0; c < count; c++) {
      yield out.slice();
      let i = r - 1;
      for (let j = 0; j < r; j++, i--) {
        imap[indices[i]] = 0;
        indices[i]++;
        while (imap[indices[i]] === 1) {
          indices[i]++;
        }
        if (indices[i] < choices.length) {
          imap[indices[i]] = 1;
          out[i] = choices[indices[i]];
          break;
        }
      }
      for (; i < r; i++) {
        if (indices[i] < choices.length) {
          continue;
        }
        indices[i] = 0;
        while (imap[indices[i]] === 1) {
          indices[i]++;
        }
        imap[indices[i]] = 1;
        out[i] = choices[indices[i]];
      }
    }
  }
}

export function Core_Math_GetMidpoint(a: number, b: number): number {
  return 0 === (b - a) % 2 ? (a + b) / 2 : (a + b - 1) / 2;
}

export function Core_Math_nCr(n: number, r: number, repetitions = false): bigint {
  if (repetitions === true) {
    return Core_Math_Factorial(n + r - 1) / (Core_Math_Factorial(r) * Core_Math_Factorial(n - 1));
  }
  return Core_Math_Factorial(n) / (Core_Math_Factorial(r) * Core_Math_Factorial(n - r));
}

export function Core_Math_nPr(n: number, r: number, repetitions = false): bigint {
  if (repetitions === true) {
    return BigInt(n) ** BigInt(r);
  }
  return Core_Math_Factorial(n) / Core_Math_Factorial(n - r);
}

export async function Core_Promise_Async_CountFulfilled(promises: Promise<any>[]): Promise<number> {
  let count = 0;
  for (const { status } of await Promise.allSettled(promises)) {
    if (status === 'fulfilled') {
      count++;
    }
  }
  return count;
}

export async function Core_Promise_Async_CountRejected(promises: Promise<any>[]): Promise<number> {
  let count = 0;
  for (const { status } of await Promise.allSettled(promises)) {
    if (status === 'rejected') {
      count++;
    }
  }
  return count;
}

export function Core_Promise_CallAndOrphan(asyncfn: () => Promise<any> | any): void {
  /** Annotate a function call as purposely un-awaited. */
  Core_Promise_Orphan(asyncfn());
}

export function Core_Promise_Orphan(promise: Promise<any> | any): void {
  // intentionally empty
}

export async function* Core_Stream_AsyncGen_ReadChunks<T>(stream: ReadableStream<T>): AsyncGenerator<T> {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

export async function Core_Stream_Uint8_Async_Compare(stream1: ReadableStream<Uint8Array>, stream2: ReadableStream<Uint8Array>): Promise<boolean> {
  const one = Core_Stream_Uint8_Class_Reader(stream1.getReader());
  const two = Core_Stream_Uint8_Class_Reader(stream2.getReader());
  try {
    while (true) {
      let changed = false;
      if (one.done === false && one.i >= one.length) {
        if ((await one.next()).changed === true) {
          changed = true;
        }
      }
      if (two.done === false && two.i >= two.length) {
        if ((await two.next()).changed === true) {
          changed = true;
        }
      }
      if (one.done && two.done) {
        return true;
      }
      if (one.done !== two.done || changed === false) {
        return false;
      }
      while (one.i < one.length && two.i < two.length) {
        if (one.value[one.i] !== two.value[two.i]) {
          return false;
        }
        one.i++;
        two.i++;
      }
    }
  } finally {
    one.releaseLock();
    two.releaseLock();
  }
}

export async function Core_Stream_Uint8_Async_ReadAll(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  try {
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      chunks.push(value);
    }
    return Core_Array_Uint8_Concat(chunks);
  } finally {
    reader.releaseLock();
  }
}

export async function Core_Stream_Uint8_Async_ReadLines(stream: ReadableStream<Uint8Array<ArrayBufferLike>>, callback: (line: string) => Promise<boolean | void> | (boolean | void)): Promise<void> {
  for await (const lines of Core_Stream_Uint8_AsyncGen_ReadLines(stream)) {
    for (const line of lines) {
      if ((await callback(line)) === false) {
        return;
      }
    }
  }
}

export async function Core_Stream_Uint8_Async_ReadSome(stream: ReadableStream<Uint8Array>, count: number): Promise<Uint8Array> {
  if (count < 1) {
    return ARRAY__UINT8__EMPTY;
  }
  const reader = stream.getReader();
  try {
    const chunks: Uint8Array[] = [];
    let size_read = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      chunks.push(value);
      size_read += value.byteLength;
      if (size_read >= count) {
        break;
      }
    }
    return Core_Array_Uint8_Take(Core_Array_Uint8_Concat(chunks), count)[0];
  } finally {
    reader.releaseLock();
  }
}

export async function* Core_Stream_Uint8_AsyncGen_ReadLines(stream: ReadableStream<Uint8Array<ArrayBufferLike>>): AsyncGenerator<string[]> {
  const textDecoderStream = new TextDecoderStream();
  const textDecoderReader = textDecoderStream.readable.getReader();
  const textDecoderWriter = textDecoderStream.writable.getWriter();
  const readable: ReadableStream<string> = new ReadableStream({
    // async cancel() {
    //   await textDecoderReader.cancel();
    // },
    async pull(controller: ReadableStreamDefaultController<string>) {
      const { done, value } = await textDecoderReader.read();
      if (done !== true) {
        controller.enqueue(value);
      } else {
        controller.close();
      }
    },
  });
  const writable: WritableStream<Uint8Array<ArrayBufferLike>> = new WritableStream({
    // async abort() {
    //   await textDecoderWriter.abort();
    // },
    async close() {
      await textDecoderWriter.close();
    },
    async write(chunk) {
      await textDecoderWriter.write(chunk.slice());
    },
  });
  const reader = stream.pipeThrough({ readable, writable }).getReader();
  try {
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (buffer.length > 0) {
          yield [buffer];
        }
        return;
      }
      const lines = Core_String_SplitLines(buffer + value);
      buffer = lines[lines.length - 1] ?? '';
      yield lines.slice(0, -1);
    }
  } finally {
    reader.releaseLock();
  }
}

export function Core_Stream_Uint8_Class_Reader(reader: ReadableStreamDefaultReader<Uint8Array>): ClassStreamUint8Reader {
  return new ClassStreamUint8Reader(reader);
}

export function Core_String_GetLeftMarginSize(text: string): number {
  let i = 0;
  for (; i < text.length; i++) {
    if (text[i] !== ' ') {
      break;
    }
  }
  return i;
}

export function Core_String_LineIsOnlyWhiteSpace(line: string): boolean {
  return /^\s*$/.test(line);
}

export function Core_String_RemoveWhiteSpaceOnlyLines(text: string): string[] {
  const lines = Core_String_SplitLines(text);
  return lines.filter((line) => !Core_String_LineIsOnlyWhiteSpace(line));
}

export function Core_String_RemoveWhiteSpaceOnlyLinesFromTopAndBottom(text: string): string[] {
  const lines = Core_String_SplitLines(text);
  return lines.slice(
    lines.findIndex((line) => Core_String_LineIsOnlyWhiteSpace(line) === false),
    1 + lines.findLastIndex((line) => Core_String_LineIsOnlyWhiteSpace(line) === false),
  );
}

export function Core_String_Split(text: string, delimiter: string | RegExp, remove_empty_items = false): string[] {
  const items = text.split(delimiter);
  return remove_empty_items === false ? items : items.filter((item) => item.length > 0);
}

export function Core_String_SplitLines(text: string, remove_empty_items = false): string[] {
  return Core_String_Split(text, /\r?\n/, remove_empty_items);
}

export function Core_String_SplitMultipleSpaces(text: string, remove_empty_items = false): string[] {
  return Core_String_Split(text, / +/, remove_empty_items);
}

export function Core_String_SplitMultipleWhiteSpace(text: string, remove_empty_items = false): string[] {
  return Core_String_Split(text, /\s+/, remove_empty_items);
}

export function Core_String_ToSnakeCase(text: string): string {
  return text.toLowerCase().replace(/ /g, '-');
}

export function Core_String_TrimLines(lines: string[]): string[] {
  return lines.map((line) => line.trim());
}

export function Core_Utility_Class_Defer<T = void>(): ClassUtilityDefer<T> {
  return new ClassUtilityDefer<T>();
}

export function Core_Utility_Async_Sleep(duration_ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, duration_ms));
}

export function Core_Utility_Class_CRC32(): ClassUtilityCRC32 {
  return new ClassUtilityCRC32();
}

export function Core_Utility_CRC32(bytes: Uint8Array): number {
  const crc = new Uint32Array([0xffffffff]);
  for (let index = 0; index < bytes.length; index++) {
    crc[0] = UTILITY__CRC32__TABLE[(crc[0] ^ bytes[index]) & 0xff] ^ (crc[0] >>> 8);
  }
  return (crc[0] ^ (0xffffffff >>> 0)) >>> 0;
}

export function Core_Utility_Debounce<T extends (...args: any[]) => Promise<any> | any>(fn: T, delay_ms: number): (...args: Parameters<T>) => Promise<void> {
  /** debounced functions return nothing when called; by design */
  let defer = Core_Utility_Class_Defer();
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(async () => {
      try {
        await fn(...args);
        defer.resolve();
      } catch (error) {
        defer.reject(error);
      }
      defer = Core_Utility_Class_Defer();
    }, delay_ms);
    return defer.promise;
  };
}

export function Core_Utility_DecodeBytes(buffer: Uint8Array): string {
  return new TextDecoder().decode(buffer);
}

export function Core_Utility_EncodeText(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function Core_Utility_ImmediateDebounce<T extends (...args: any[]) => Promise<any> | any>(fn: T, delay_ms: number): (...args: Parameters<T>) => Promise<void> {
  /** aka leading edge debounce */
  /** debounced functions return nothing when called; by design */
  let defer = Core_Utility_Class_Defer();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (timeout === undefined) {
      (async () => {
        await fn(...args);
        defer.resolve();
      })().catch((error) => {
        defer.reject(error);
      });
    }
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      timeout = undefined;
      defer = Core_Utility_Class_Defer();
    }, delay_ms);
    return defer.promise;
  };
}
