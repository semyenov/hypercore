declare module "fast-fifo" {
  class FixedFIFO<T> {
    constructor(hwm: number);
    buffer: T[];
    mask: number;
    top: number;
    btm: number;
    next: FixedFIFO<T> | null;
    push(data: T): boolean;
    shift(): T | undefined;
    isEmpty(): boolean;
  }

  export = class FastFIFO<T> {
    constructor(hwm?: number);
    hwm: number;
    length: number;
    head: FixedFIFO<T>;
    tail: FixedFIFO<T>;
    push(val: T): void;
    shift(): T | undefined;
    isEmpty(): boolean;
  };
}
