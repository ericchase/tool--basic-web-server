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

export {
  //
  ARRAY__UINT8__B64_TO_BYTE,
  ARRAY__UINT8__BYTE_TO_B64,
  ARRAY__UINT8__EMPTY,
  ClassArrayUint8Group,
  ClassStreamUint8Reader,
  ClassUtilityCRC32,
  ClassUtilityDefer,
  MATH__FACTORIAL__CACHE,
  UTILITY__CRC32__TABLE,
};
