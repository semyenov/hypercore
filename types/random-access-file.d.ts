// random-access-file.d.ts

declare module "random-access-file" {
  import { Readable, Writable } from "stream";
  import { constants } from "fs";
  import RandomAccessStorage from "random-access-storage";

  interface PoolOptions {
    maxSize: number;
  }

  class Pool {
    constructor(options: PoolOptions);

    maxSize: number;
    active: RandomAccessFile[];
  }

  export = class RandomAccessFile extends RandomAccessStorage {
    constructor(filename: string, opts?: object);
    static createPool(maxSize: number): Pool;

    directory: string | null;
    filename: string;
    fd: number;
    mode: number;
  };
}
