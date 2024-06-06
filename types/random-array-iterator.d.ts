// types/random-array-iterator.d.ts

declare module "random-array-iterator" {
  export default class RandomArrayIterator<T = any> {
    constructor(values: T[]);
    start: number;
    length: number;

    [Symbol.iterator](): this;

    next(): { done: boolean; value: T };
    dequeue(): void;
    requeue(): void;
    restart(): this;
  }
}
