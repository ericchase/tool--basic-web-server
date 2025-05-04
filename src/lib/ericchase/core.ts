// constants

const ARRAY__UINT8__BYTE_TO_B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const ARRAY__UINT8__B64_TO_BYTE = new Map([...ARRAY__UINT8__BYTE_TO_B64].map((char, byte) => [char, byte]));
const ARRAY__UINT8__EMPTY = Uint8Array.from([]);

const MATH__FACTORIAL__CACHE = [BigInt(1), BigInt(1)];

/* Table of CRCs of all 8-bit messages. */
const UTILITY__CRC32__TABLE = new Uint32Array(256);
const UTILITY__CRC32__MAGIC = new Uint32Array([0xedb88320]);
/* Make the table for a fast CRC. */
for (let i = 0; i < 256; i++) {
  UTILITY__CRC32__TABLE[i] = i;
  for (let k = 0; k < 8; k++) {
    if ((UTILITY__CRC32__TABLE[i] >>> 0) & 1) {
      UTILITY__CRC32__TABLE[i] = UTILITY__CRC32__MAGIC[0] ^ (UTILITY__CRC32__TABLE[i] >>> 1);
    } else {
      UTILITY__CRC32__TABLE[i] >>>= 1;
    }
  }
}

// classes

class ClassArrayUint8Group {
  arrays = new Array<Uint8Array>();
  byteLength = 0;
  add(bytes: Uint8Array): number {
    this.arrays.push(bytes);
    this.byteLength += bytes.byteLength;
    return this.byteLength;
  }
  get(count: number, offset = 0): Uint8Array {
    const out = new Uint8Array(count);
    let i_out = 0;
    if (offset === 0) {
      for (const bytes of this.arrays) {
        for (let i_bytes = 0; i_bytes < bytes.byteLength; i_bytes++) {
          out[i_out] = bytes[i_bytes];
          i_out++;
          if (i_out >= count) {
            return out;
          }
        }
      }
    } else {
      let i_total = 0;
      for (const bytes of this.arrays) {
        for (let i_bytes = 0; i_bytes < bytes.byteLength; i_bytes++) {
          i_total++;
          if (i_total >= offset) {
            out[i_out] = bytes[i_bytes];
            i_out++;
            if (i_out >= count) {
              return out;
            }
          }
        }
      }
    }
    return out;
  }
}
class ClassStreamUint8Reader {
  done = false;
  i = 0;
  length = 0;
  value: Uint8Array = ARRAY__UINT8__EMPTY;
  constructor(public reader: ReadableStreamDefaultReader<Uint8Array>) {}
  async next(this: ClassStreamUint8Reader): Promise<{ changed: boolean }> {
    const { done, value = ARRAY__UINT8__EMPTY } = await this.reader.read();
    if (this.done === done && this.value === value) {
      return { changed: false };
    }
    this.done = done;
    this.i = 0;
    this.length = value.length;
    this.value = value;
    return { changed: true };
  }
  releaseLock(): void {
    this.reader.releaseLock();
  }
}
class ClassUtilityCRC32 {
  $state = new Uint32Array([0xffffffff]);
  update(bytes: Uint8Array): void {
    for (let index = 0; index < bytes.length; index++) {
      this.$state[0] = UTILITY__CRC32__TABLE[(this.$state[0] ^ bytes[index]) & 0xff] ^ (this.$state[0] >>> 8);
    }
  }
  get value(): number {
    return (this.$state[0] ^ (0xffffffff >>> 0)) >>> 0;
  }
}
class ClassUtilityDefer<T> {
  promise: Promise<T>;
  resolve!: (value: T | PromiseLike<T>) => void;
  reject!: (reason?: any) => void;
  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
    if (this.resolve === undefined || this.reject === undefined) {
      throw new Error(`${ClassUtilityDefer.name}'s constructor failed to setup promise functions.`);
    }
  }
}

// functions

function* array__gen_buffertobytes(buffer: ArrayBufferLike): Generator<number> {
  const view = new DataView(buffer);
  for (let i = 0; i < view.byteLength; i++) {
    yield view.getUint8(i) >>> 0;
  }
}
function* array__gen_chunks<T>(array: T[], count: number): Generator<{ begin: number; end: number; slice: T[] }> {
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
function* array__gen_slidingwindow<T extends unknown[]>(array: T, count: number): Generator<{ begin: number; end: number; slice: T }> {
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
function* array__gen_zip<T extends readonly Iterable<any>[]>(...iterables: T): Generator<{ [K in keyof T]: T[K] extends Iterable<infer U> ? U | undefined : undefined }> {
  let mock_count = 0;
  const mock_iterable: IterableIterator<any> = {
    next() {
      return { value: undefined, done: true };
    },
    [Symbol.iterator]() {
      return this;
    },
  };
  function process_iterators<I extends Iterator<any>[]>(iterators: I): { [K in keyof I]: I[K] extends Iterator<infer U> ? U | undefined : undefined } {
    const values = [] as unknown as { [K in keyof I]: I[K] extends Iterator<infer U> ? U | undefined : undefined };
    for (let index = 0; index < iterators.length; index++) {
      const next = iterators[index].next();
      if ('done' in next && next.done) {
        mock_count++;
        iterators[index] = mock_iterable;
      }
      values[index] = 'value' in next ? next.value : undefined;
    }
    return values;
  }
  const iterators: Iterator<any>[] = iterables.map((iterable) => {
    if (iterable != null && typeof (iterable as any)[Symbol.iterator] === 'function') {
      const iterator = iterable[Symbol.iterator]();
      if (iterator && 'next' in iterator) {
        return iterator;
      }
    }
    mock_count++;
    return mock_iterable;
  });
  let values = process_iterators(iterators);
  while (mock_count < iterators.length) {
    yield values as { [K in keyof T]: T[K] extends Iterable<infer U> ? U | undefined : undefined };
    values = process_iterators(iterators);
  }
}

function array__areequal(array: ArrayLike<unknown>, other: ArrayLike<unknown>): boolean {
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
function array__getendpoints(array: ArrayLike<unknown>): [number, number] {
  if (!Array.isArray(array) || array.length < 1) {
    return [-1, -1];
  }
  return [0, array.length];
}
function array__shuffle<T>(items: T[], in_place = true): T[] {
  const last = items.length - 1;
  for (let i = 0; i < items.length; i++) {
    let random = Math.floor(Math.random() * last);
    [items[last], items[random]] = [items[random], items[last]];
  }
  return items;
}
function array__split<T>(array: T[], count: number): T[][] {
  return [...array__gen_chunks(array, count)].map((chunk) => chunk.slice);
}

/** Returns index of item that "equals" target; otherwise, -1. */
function array__binarysearch__exactmatch<T>(array: T[], target: T, isOrdered: (a: T, b: T) => boolean = (a: T, b: T) => a < b): number {
  let [begin, end] = Core.Array.GetEndpoints(array);
  let middle = Core.Math.GetMidpoint(begin, end);
  while (begin < end) {
    if (isOrdered(target, array[middle])) {
      end = middle;
    } else {
      begin = middle + 1;
    }
    middle = Core.Math.GetMidpoint(begin, end);
  }
  if (isOrdered(array[middle - 1], target) === false) {
    return middle - 1;
  }
  return -1;
}
/** Returns index of item that "equals" target; otherwise, index of item "less" than target. */
function array__binarysearch__insertionorder<T>(array: T[], target: T, isOrdered: (a: T, b: T) => boolean = (a: T, b: T) => a < b): number {
  let [begin, end] = Core.Array.GetEndpoints(array);
  let middle = Core.Math.GetMidpoint(begin, end);
  while (begin < end) {
    if (isOrdered(target, array[middle])) {
      end = middle;
    } else {
      begin = middle + 1;
    }
    middle = Core.Math.GetMidpoint(begin, end);
  }
  return middle - 1;
}

function array__uint8__class_group(): ClassArrayUint8Group {
  return new ClassArrayUint8Group();
}

function array__uint8__concat(arrays: readonly Uint8Array[]): Uint8Array {
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
function array__uint8__copy(bytes: Uint8Array, count: number, offset = 0): Uint8Array {
  return bytes.slice(offset, offset + count);
}
function array__uint8__frombase64(b64_str: string): Uint8Array {
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
function array__uint8__fromstring(from: string): Uint8Array {
  return new TextEncoder().encode(from);
}
function array__uint8__fromuint32(from: number): Uint8Array {
  const u8s = new Uint8Array(4);
  const view = new DataView(u8s.buffer);
  view.setUint32(0, from >>> 0, false);
  return u8s;
}
function array__uint8__split(bytes: Uint8Array, count: number): Uint8Array[] {
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
function array__uint8__take(bytes: Uint8Array, count: number): [Uint8Array, Uint8Array] {
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
function array__uint8__takeend(bytes: Uint8Array, count: number): [Uint8Array, Uint8Array] {
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
function array__uint8__toascii(bytes: Uint8Array): string {
  // appending to string has best overall performance for chrome and firefox
  let ascii = '';
  for (const byte of bytes) {
    ascii += String.fromCharCode(byte >>> 0);
  }
  return ascii;
}
function array__uint8__tobase64(u8_bytes: Uint8Array): string {
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
function array__uint8__todecimal(bytes: Uint8Array): string[] {
  // Array[index] has best overall performance for chrome and firefox
  const decimal: string[] = new Array(bytes.byteLength);
  for (let i = 0; i < bytes.byteLength; i += 1) {
    decimal[i] = (bytes[i] >>> 0).toString(10);
  }
  return decimal;
}
function array__uint8__tohex(bytes: Uint8Array): string[] {
  // Array[index] has best overall performance for chrome and firefox
  const hex: string[] = new Array(bytes.byteLength);
  for (let i = 0; i < bytes.byteLength; i += 1) {
    hex[i] = (bytes[i] >>> 0).toString(16).padStart(2, '0');
  }
  return hex;
}
function array__uint8__tolines(bytes: Uint8Array): string[] {
  // Array.split() beats Array[index] here for overall performance
  return string__splitlines(array__uint8__tostring(bytes));
}
function array__uint8__tostring(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function array__uint32__tohex(uint: number): string[] {
  return array__uint8__tohex(array__uint8__fromuint32(uint));
}

function assert__equal(value1: any, value2: any): void {
  if (value1 !== value2) {
    throw new Error(`Assertion Failed: value1(${value1}) should equal value2(${value2})`);
  }
}
function assert__notequal(value1: any, value2: any): void {
  if (value1 === value2) {
    throw new Error(`Assertion Failed: value1(${value1}) should not equal value2(${value2})`);
  }
}
function assert__bigint(value: any): value is bigint {
  if (typeof value !== 'bigint') {
    throw new Error(`Assertion Failed: typeof value(${value}) should equal bigint`);
  }
  return true;
}
function assert__boolean(value: any): value is boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`Assertion Failed: typeof value(${value}) should equal boolean`);
  }
  return true;
}
function assert__function<T>(value: any): value is T {
  if (typeof value !== 'function') {
    throw new Error(`Assertion Failed: typeof value(${value}) should equal function`);
  }
  return true;
}
function assert__number(value: any): value is number {
  if (typeof value !== 'number') {
    throw new Error(`Assertion Failed: typeof value(${value}) should equal number`);
  }
  return true;
}
function assert__object(value: any): value is object {
  if (typeof value !== 'object') {
    throw new Error(`Assertion Failed: typeof value(${value}) should equal object`);
  }
  return true;
}
function assert__string(value: any): value is string {
  if (typeof value !== 'string') {
    throw new Error(`Assertion Failed: typeof value(${value}) should equal string`);
  }
  return true;
}
function assert__symbol(value: any): value is symbol {
  if (typeof value !== 'symbol') {
    throw new Error(`Assertion Failed: typeof value(${value}) should equal symbol`);
  }
  return true;
}
function assert__undefined(value: any): value is undefined {
  if (typeof value !== 'undefined') {
    throw new Error(`Assertion Failed: typeof value(${value}) should equal undefined`);
  }
  return true;
}

function console__error(...items: any[]): void {
  console['error'](...items);
}
function console__errorwithdate(...items: any[]): void {
  console['error'](`[${new Date().toLocaleString()}]`, ...items);
}
function console__log(...items: any[]): void {
  console['log'](...items);
}
function console__logwithdate(...items: any[]): void {
  console['log'](`[${new Date().toLocaleString()}]`, ...items);
}

/** @param {any} obj - Any value that is ***NOT*** a JSON string. This function does ***NOT*** call `JSON.parse()`. */
function json__analyze(obj: unknown): { source: Type.JSON.Array; type: 'array' } | { source: Type.JSON.Object; type: 'object' } | { source: Type.JSON.Primitive; type: 'primitive' } {
  if (Array.isArray(obj)) {
    for (const item of obj) {
      json__analyze(item);
    }
    return { source: obj as Type.JSON.Array, type: 'array' };
  }
  if (obj === null || typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return { source: obj as Type.JSON.Primitive, type: 'primitive' };
  }
  if (obj === undefined || typeof obj === 'bigint' || typeof obj === 'symbol' || typeof obj === 'undefined' || typeof obj === 'function') {
    throw TypeError('Invalid');
  }
  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      json__analyze((obj as Type.JSON.Object)[key]);
    }
  }
  return { source: obj as Type.JSON.Object, type: 'object' };
}
function json__merge(...sources: unknown[]): Type.JSON.ParseResult {
  if (sources.length === 0) return null;
  if (sources.length === 1) return json__analyze(sources[0]).source;
  const head = json__analyze(sources[0]);
  for (const source of sources.slice(1)) {
    if (json__analyze(source).type !== head.type) {
      throw TypeError('Cannot merge JSON strings of different types. Every JSON string must be all arrays, all objects, or all primitives.');
    }
  }
  if (head.type === 'array') {
    const result: Type.JSON.Array = [];
    for (const source of sources as Type.JSON.Array[]) {
      result.push(...source);
    }
    return result;
  }
  if (head.type === 'object') {
    function mergeinto(result: Type.JSON.Object, source: Type.JSON.Object) {
      for (const key in source) {
        if (Object.hasOwn(result, key) === false) {
          result[key] = {};
        }
        const { type: r_type } = json__analyze(result[key]);
        const { type: s_type } = json__analyze(source[key]);
        if (r_type === 'object' && s_type === 'object') {
          mergeinto(result[key] as Type.JSON.Object, source[key] as Type.JSON.Object);
        } else if (r_type === 'array' && s_type === 'array') {
          result[key] = [...(result[key] as Type.JSON.Array[]), ...(source[key] as Type.JSON.Array[])];
        } else {
          result[key] = source[key];
        }
      }
      return result;
    }
    const result: Type.JSON.Object = {};
    for (const source of sources as Type.JSON.Object[]) {
      mergeinto(result, source);
    }
    return result;
  }
  return json__analyze(sources[sources.length - 1]).source;
}
function json__parserawstring(str: string): string {
  return JSON.parse(`"${str}"`);
}

function map__guard<K, V>(map: Map<K, V>, key: K, value: V | undefined): value is V {
  return map.has(key);
}
function map__getordefault<K, V>(map: Map<K, V>, key: K, newValue: () => V): V {
  let value = map.get(key);
  if (!map__guard<K, V>(map, key, value)) {
    value = newValue();
    map.set(key, value);
  }
  return value;
}

// The 2-Combination is what I formerly referred as the SelfCartesianProduct
// nChooseRCombinations([1, 2], 2)]);
function* math__gen_cartesianproduct<A extends readonly unknown[], B extends readonly unknown[]>(array_a: A, array_b: B): Generator<[A[number], B[number]], void, unknown> {
  for (let i = 0; i < array_a.length; i++) {
    for (let j = 0; j < array_b.length; j++) {
      yield [array_a[i], array_b[j]];
    }
  }
}
function* math__gen_ncartesianproducts<T extends unknown[][]>(...arrays: T): Generator<{ [K in keyof T]: T[K][number] }> {
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
function* math__gen_nchoosercombinations<T>(choices: T[], r: number, repetitions = false): Generator<T[]> {
  const count = math__ncr(choices.length, r, repetitions);
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
function* math__gen_nchooserpermutations<T>(choices: T[], r: number, repetitions = false): Generator<T[]> {
  const count = math__npr(choices.length, r, repetitions);
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

function math__ncr(n: number, r: number, repetitions = false): bigint {
  if (repetitions === true) {
    return math__factorial(n + r - 1) / (math__factorial(r) * math__factorial(n - 1));
  }
  return math__factorial(n) / (math__factorial(r) * math__factorial(n - r));
}
function math__npr(n: number, r: number, repetitions = false): bigint {
  if (repetitions === true) {
    return BigInt(n) ** BigInt(r);
  }
  return math__factorial(n) / math__factorial(n - r);
}
function math__factorial(n: number): bigint {
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
function math__getmidpoint(a: number, b: number): number {
  return 0 === (b - a) % 2 ? (a + b) / 2 : (a + b - 1) / 2;
}

async function promise__async_countfulfilled(promises: Promise<any>[]): Promise<number> {
  let count = 0;
  for (const { status } of await Promise.allSettled(promises)) {
    if (status === 'fulfilled') {
      count++;
    }
  }
  return count;
}
async function promise__async_countrejected(promises: Promise<any>[]): Promise<number> {
  let count = 0;
  for (const { status } of await Promise.allSettled(promises)) {
    if (status === 'rejected') {
      count++;
    }
  }
  return count;
}

/** Annotate a function call as purposely un-awaited. */
function promise__callandorphan(asyncfn: () => Promise<any> | any): void {
  promise__orphan(asyncfn());
}
function promise__orphan(promise: Promise<any> | any): void {}

async function* stream__asyncgen_readchunks<T>(stream: ReadableStream<T>): AsyncGenerator<T> {
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
async function* stream__asyncgen_readlines(stream: ReadableStream<Uint8Array>): AsyncGenerator<string[]> {
  const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
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
      const lines = string__splitlines(buffer + value);
      buffer = lines[lines.length - 1] ?? '';
      yield lines.slice(0, -1);
    }
  } finally {
    reader.releaseLock();
  }
}

async function stream__uint8__async_compare(stream1: ReadableStream<Uint8Array>, stream2: ReadableStream<Uint8Array>): Promise<boolean> {
  const one = stream__uint8__class_reader(stream1.getReader());
  const two = stream__uint8__class_reader(stream2.getReader());
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
async function stream__uint8__async_readall(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
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
    return array__uint8__concat(chunks);
  } finally {
    reader.releaseLock();
  }
}
async function stream__uint8__async_readlines(stream: ReadableStream<Uint8Array>, callback: (line: string) => Promise<boolean | void> | (boolean | void)): Promise<void> {
  for await (const lines of stream__asyncgen_readlines(stream)) {
    for (const line of lines) {
      if ((await callback(line)) === false) {
        return;
      }
    }
  }
}
async function stream__uint8__async_readsome(stream: ReadableStream<Uint8Array>, count: number): Promise<Uint8Array> {
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
    return array__uint8__take(array__uint8__concat(chunks), count)[0];
  } finally {
    reader.releaseLock();
  }
}

function stream__uint8__class_reader(reader: ReadableStreamDefaultReader<Uint8Array>): ClassStreamUint8Reader {
  return new ClassStreamUint8Reader(reader);
}

function string__getleftmarginsize(text: string): number {
  let i = 0;
  for (; i < text.length; i++) {
    if (text[i] !== ' ') {
      break;
    }
  }
  return i;
}
function string__lineisonlywhitespace(line: string): boolean {
  return /^\s*$/.test(line);
}
function string__removewhitespaceonlylines(text: string): string[] {
  const lines = string__splitlines(text);
  return lines.filter((line) => !string__lineisonlywhitespace(line));
}
function string__removewhitespaceonlylinesfromtopandbottom(text: string): string[] {
  const lines = string__splitlines(text);
  return lines.slice(
    lines.findIndex((line) => string__lineisonlywhitespace(line) === false),
    1 + lines.findLastIndex((line) => string__lineisonlywhitespace(line) === false),
  );
}
function string__split(text: string, delimiter: string | RegExp, remove_empty_items = false): string[] {
  const items = text.split(delimiter);
  return remove_empty_items === false ? items : items.filter((item) => item.length > 0);
}
function string__splitlines(text: string, remove_empty_items = false): string[] {
  return string__split(text, /\r?\n/, remove_empty_items);
}
function string__splitmultiplespaces(text: string, remove_empty_items = false): string[] {
  return string__split(text, / +/, remove_empty_items);
}
function string__splitmultiplewhitespace(text: string, remove_empty_items = false): string[] {
  return string__split(text, /\s+/, remove_empty_items);
}
function string__tosnakecase(text: string): string {
  return text.toLowerCase().replace(/ /g, '-');
}
function string__trimlines(lines: string[]): string[] {
  return lines.map((line) => line.trim());
}

// Async

function utility__async_sleep(duration_ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, duration_ms));
}

// Codec

function utility__decodebytes(buffer: Uint8Array): string {
  return new TextDecoder().decode(buffer);
}
function utility__encodetext(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

// CRC32

function utility__class_crc32(): ClassUtilityCRC32 {
  return new ClassUtilityCRC32();
}
function utility__crc32(bytes: Uint8Array): number {
  const crc = new Uint32Array([0xffffffff]);
  for (let index = 0; index < bytes.length; index++) {
    crc[0] = UTILITY__CRC32__TABLE[(crc[0] ^ bytes[index]) & 0xff] ^ (crc[0] >>> 8);
  }
  return (crc[0] ^ (0xffffffff >>> 0)) >>> 0;
}

// Debounce

/** debounced functions return nothing when called; by design */
function utility__debounce<T extends (...args: any[]) => Promise<any> | any>(fn: T, delay_ms: number): (...args: Parameters<T>) => Promise<void> {
  let defer = utility__class_defer();
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
      defer = utility__class_defer();
    }, delay_ms);
    return defer.promise;
  };
}
/** aka leading edge debounce */
/** debounced functions return nothing when called; by design */
function utility__immediatedebounce<T extends (...args: any[]) => Promise<any> | any>(fn: T, delay_ms: number): (...args: Parameters<T>) => Promise<void> {
  let defer = utility__class_defer();
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
      defer = utility__class_defer();
    }, delay_ms);
    return defer.promise;
  };
}

// Defer

function utility__class_defer<T = void>(): ClassUtilityDefer<T> {
  return new ClassUtilityDefer<T>();
}

export namespace Core {
  export namespace Array {
    export namespace BinarySearch {
      export const ExactMatch = array__binarysearch__exactmatch;
      export const InsertionIndex = array__binarysearch__insertionorder;
    }
    export namespace Uint8 {
      export const Class_Group = array__uint8__class_group;
      //
      export const Concat = array__uint8__concat;
      export const Copy = array__uint8__copy;
      export const FromBase64 = array__uint8__frombase64;
      export const FromString = array__uint8__fromstring;
      export const FromUint32 = array__uint8__fromuint32;
      export const Split = array__uint8__split;
      export const Take = array__uint8__take;
      export const TakeEnd = array__uint8__takeend;
      export const ToASCII = array__uint8__toascii;
      export const ToBase64 = array__uint8__tobase64;
      export const ToDecimal = array__uint8__todecimal;
      export const ToHex = array__uint8__tohex;
      export const ToLines = array__uint8__tolines;
      export const ToString = array__uint8__tostring;
    }
    export namespace Uint32 {
      export const ToHex = array__uint32__tohex;
    }
    //
    export const Gen_BufferToBytes = array__gen_buffertobytes;
    export const Gen_Chunks = array__gen_chunks;
    export const Gen_SlidingWindow = array__gen_slidingwindow;
    export const Gen_Zip = array__gen_zip;
    export const AreEqual = array__areequal;
    export const GetEndpoints = array__getendpoints;
    export const Shuffle = array__shuffle;
    export const Split = array__split;
  }
  export namespace Assert {
    export const Equal = assert__equal;
    export const NotEqual = assert__notequal;
    //
    export const BigInt = assert__bigint;
    export const Boolean = assert__boolean;
    export const Function = assert__function;
    export const Number = assert__number;
    export const Object = assert__object;
    export const String = assert__string;
    export const Symbol = assert__symbol;
    export const Undefined = assert__undefined;
  }
  export namespace Console {
    export const Error = console__error;
    export const ErrorWithDate = console__errorwithdate;
    //
    export const Log = console__log;
    export const LogWithDate = console__logwithdate;
  }
  export namespace JSON {
    export const Analyze = json__analyze;
    export const Merge = json__merge;
    export const ParseRawString = json__parserawstring;
  }
  export namespace Map {
    export const Guard = map__guard;
    export const GetOrDefault = map__getordefault;
  }
  export namespace Math {
    export const Gen_CartesianProduct = math__gen_cartesianproduct;
    export const Gen_NCartesianProducts = math__gen_ncartesianproducts;
    export const Gen_NChooseRCombinations = math__gen_nchoosercombinations;
    export const Gen_NChooseRPermutations = math__gen_nchooserpermutations;
    export const nCr = math__ncr;
    export const nPr = math__npr;
    export const Factorial = math__factorial;
    export const GetMidpoint = math__getmidpoint;
  }
  export namespace Promise {
    export const Async_CountFulfilled = promise__async_countfulfilled;
    export const Async_CountRejected = promise__async_countrejected;
    //
    export const CallAndOrphan = promise__callandorphan;
    export const Orphan = promise__orphan;
  }
  export namespace Stream {
    export namespace Uint8 {
      export const Async_Compare = stream__uint8__async_compare;
      export const Async_ReadAll = stream__uint8__async_readall;
      export const Async_ReadLines = stream__uint8__async_readlines;
      export const Async_ReadSome = stream__uint8__async_readsome;
      //
      export const Class_Reader = stream__uint8__class_reader;
    }
    export const AsyncGen_ReadChunks = stream__asyncgen_readchunks;
    export const AsyncGen_ReadLines = stream__asyncgen_readlines;
  }
  export namespace String {
    export const GetLeftMarginSize = string__getleftmarginsize;
    export const LineIsOnlyWhiteSpace = string__lineisonlywhitespace;
    export const RemoveWhiteSpaceOnlyLines = string__removewhitespaceonlylines;
    export const RemoveWhiteSpaceOnlyLinesFromTopAndBottom = string__removewhitespaceonlylinesfromtopandbottom;
    export const Split = string__split;
    export const SplitLines = string__splitlines;
    export const SplitMultipleSpaces = string__splitmultiplespaces;
    export const SplitMultipleWhiteSpace = string__splitmultiplewhitespace;
    export const ToSnakeCase = string__tosnakecase;
    export const TrimLines = string__trimlines;
  }
  export namespace Utility {
    export const Async_Sleep = utility__async_sleep;
    //
    export const Class_CRC32 = utility__class_crc32;
    export const Class_Defer = utility__class_defer;
    export type Class_Defer<T> = ClassUtilityDefer<T>;
    //
    export const CRC32 = utility__crc32;
    export const DecodeBytes = utility__decodebytes;
    export const EncodeText = utility__encodetext;
    export const Debounce = utility__debounce;
    export const ImmediateDebounce = utility__immediatedebounce;
  }
}

export namespace Type {
  export namespace JSON {
    export type Array = (Array | Object | Primitive)[];
    export type Object = Type.RecursiveRecord<string, Array | Primitive>;
    export type Primitive = null | boolean | number | string;
    export type ParseResult = Array | Object | Primitive;
  }
  export type EmptyRecord = Record<string, never>;
  export type RecursiveRecord<K extends keyof any, T> = {
    [P in K]: T | RecursiveRecord<K, T>;
  };
}
