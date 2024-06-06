// types/random-access-memory.d.ts

declare module 'random-access-memory' {
  import { Buffer } from 'buffer';
  import RandomAccessStorage from 'random-access-storage';
  import { ReadableStream } from 'stream';

  interface Options {
    length?: number;
    pageSize?: number;
    buffer?: Buffer;
  }

  class RAM extends RandomAccessStorage {
    readonly length: number;
    readonly pageSize: number;
    readonly buffers: Buffer[];

    constructor(opts?: Options);

    toBuffer(): Buffer;
    clone(): RAM;
  }

  export = RAM
}