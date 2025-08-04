import { NODE_PATH } from './NodePlatform.js';

export class Class_NodePlatform_PathObject_Relative_Class {
  dir = '';
  name = '';
  ext = ''; // includes dot

  os_api: typeof NODE_PATH.win32 | typeof NODE_PATH.posix;
  constructor(public os: 'win32' | 'posix') {
    if (os === 'win32') {
      this.os_api = NODE_PATH.win32;
    } else {
      this.os_api = NODE_PATH.posix;
    }
  }

  /**
   * Replaces the path object's segments with the new segments from `pathlike`.
   * @param pathlike New segments to use for this path object.
   */
  overwrite(...pathlike: string[]): this {
    if (pathlike.filter((segment) => segment.length > 0).length > 0) {
      const { root, dir, name, ext } = this.os_api.parse(this.os_api.join(...pathlike.filter((item) => item.length > 0)));
      if (root !== '') {
        throw new Error(`The computed path for "${pathlike}" is not considered a relative path for ${this.os} and may not be used in a ${this.os} relative path object.`);
      }
      this.dir = dir;
      this.name = name;
      this.ext = ext;
    } else {
      this.dir = '';
      this.name = '';
      this.ext = '';
    }
    return this;
  }

  /**
   * Joins the path object into a path string. Custom processing available.
   * @param options
   * @param options.dot Prefix the path with a `.` unless the first segment is already `.` or `..`
   * @param options.slash Suffix the path with a trailing slash
   */
  join(options?: { dot?: boolean; slash?: boolean }): string {
    options ??= {};
    options.dot ??= false;
    options.slash ??= false;
    const segments = this.split();
    if (segments[0] === '.' || segments[0] === '..') {
      options.dot = false;
    }
    if (options.slash === true) {
      return (options.dot === true ? '.' + (this.os === 'win32' ? '\\' : '/') : '') + this.os_api.join(...this.split()) + (this.os === 'win32' ? '\\' : '/');
    }
    return (options.dot === true ? '.' + (this.os === 'win32' ? '\\' : '/') : '') + this.os_api.join(...this.split());
  }

  /**
   * Splits the path object into an array of segments.
   */
  split(): string[] {
    const out: string[] = [...this.dir.split(this.os === 'win32' ? '\\' : '/'), this.name + this.ext].filter((segment) => segment.length > 0);
    if (out.length === 0) {
      return ['.'];
    }
    return out;
  }

  /**
   * Appends new segments to the end of the path.
   * @param pathlike Segments to insert at the end of the path.
   */
  push(...pathlike: string[]): this {
    this.overwrite(...this.split(), ...pathlike);
    return this;
  }

  /**
   * Removes the last `count` segments from the path and returns them as an array of strings.
   * If the path is empty, an empty array is returned.
   * @param count Number of segments to remove from the end of the path.
   */
  pop(count = 1): string[] {
    if (count <= 0) {
      return [];
    }
    const segments = this.split();
    if (count > segments.length) {
      count = segments.length;
    }
    const removed: string[] = [];
    for (let i = 0; i < count; i++) {
      const segment = segments.pop();
      if (segment !== undefined) {
        removed.unshift(segment);
      }
    }
    this.overwrite(...segments);
    return removed;
  }

  /**
   * Prepends new segments to the start of the path.
   * @param pathlike Segments to insert at the start of the path.
   */
  unshift(...pathlike: string[]): this {
    this.overwrite(...pathlike, ...this.split());
    return this;
  }

  /**
   * Removes the first `count` segments from the path and returns them as a new path object.
   * If the path is empty, an empty array is returned.
   * @param count Number of segments to remove from the start of the path.
   */
  shift(count = 1): string[] {
    if (count <= 0) {
      return [];
    }
    const segments = this.split();
    if (count > segments.length) {
      count = segments.length;
    }
    const removed: string[] = [];
    for (let i = 0; i < count; i++) {
      const segment = segments.shift();
      if (segment !== undefined) {
        removed.push(segment);
      }
    }
    this.overwrite(...segments);
    return removed;
  }

  /**
   * Returns a section of the path object as a new path object.
   * For both start and end, a negative index can be used to indicate an offset from the end of the array.
   * For example, -2 refers to the second to last element of the array.
   * @param start
   * The beginning index of the specified portion of the array.
   * If start is undefined, then the slice begins at index 0.
   * @param end
   * The end index of the specified portion of the array.
   * This is exclusive of the element at the index 'end'.
   * If end is undefined, then the slice extends to the end of the array.
   */
  slice(start?: number, end?: number): Class_NodePlatform_PathObject_Relative_Class {
    return new Class_NodePlatform_PathObject_Relative_Class(this.os).overwrite(...this.split().slice(start, end));
  }

  replaceExt(ext: string): Class_NodePlatform_PathObject_Relative_Class {
    if (ext.length > 0) {
      this.ext = ext[0] === '.' ? ext : '.' + ext;
    } else {
      this.ext = '';
    }
    return this;
  }

  toPosix(): Class_NodePlatform_PathObject_Relative_Class {
    if (this.os === 'win32') {
      return NodePlatform_PathObject_Relative_Posix_Class(...this.split());
    } else {
      return this;
    }
  }
  toWin32(): Class_NodePlatform_PathObject_Relative_Class {
    if (this.os === 'win32') {
      return this;
    } else {
      return NodePlatform_PathObject_Relative_Win32_Class(...this.split());
    }
  }
}

export function NodePlatform_PathObject_Relative_Class(...pathlike: string[]): Class_NodePlatform_PathObject_Relative_Class {
  return new Class_NodePlatform_PathObject_Relative_Class(process.platform === 'win32' ? 'win32' : 'posix').overwrite(...pathlike);
}
export function NodePlatform_PathObject_Relative_Posix_Class(...pathlike: string[]): Class_NodePlatform_PathObject_Relative_Class {
  return new Class_NodePlatform_PathObject_Relative_Class('posix').overwrite(...pathlike);
}
export function NodePlatform_PathObject_Relative_Win32_Class(...pathlike: string[]): Class_NodePlatform_PathObject_Relative_Class {
  return new Class_NodePlatform_PathObject_Relative_Class('win32').overwrite(...pathlike);
}
