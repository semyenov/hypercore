// types/big-sparse-array.d.ts

declare module "big-sparse-array" {
  interface TinyArray<T = any> {
    s: number;
    b: Array<T>;
    f: Uint16Array;
    isEmptyish(): boolean;
    get(i: number): T;
    set(i: number, v: T): T;
    grow(): void;
  }

  export default class BigSparseArray<T = any> {
    tiny: TinyArray<T>;
    maxLength: number;
    factor: number;

    constructor();

    set(index: number, val?: T): T;
    get(index: number): T;

    private static factor4096(i: number, n: number): Uint16Array;
  }
}
