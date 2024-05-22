// types/random-access-storage.d.ts

declare module "random-access-storage" {
  import { Buffer } from "buffer";
  import { EventEmitter } from "events";

  type Callback<T> = (err?: Error | null, result?: T) => void;

  export default class RandomAccessStorage extends EventEmitter {
    readonly opened: boolean;
    readonly suspended: boolean;
    readonly closed: boolean;
    readonly unlinked: boolean;
    readonly writing: boolean;
    readonly readable: boolean;
    readonly writable: boolean;
    readonly deletable: boolean;
    readonly truncatable: boolean;
    readonly statable: boolean;

    constructor(opts?: object);

    read(offset: number, size: number, callback: Callback<Buffer>): void;
    del(offset: number, size: number, callback: Callback<void>): void;
    open(callback: Callback<void>): void;
    suspend(callback: Callback<void>): void;
    close(callback: Callback<void>): void;
    unlink(callback: Callback<void>): void;
    write(offset: number, data: Buffer, callback: Callback<void>): void;
    read(offset: number, size: number, callback: Callback<Buffer>): void;
    stat(callback: Callback<{ size: number }>): void;
    truncate(size: number, callback: Callback<void>): void;

    private run(req: Request, writing: boolean): void;
  }

  export class Request {
    constructor(
      self: RandomAccessStorage,
      type: number,
      offset: number,
      size: number,
      data: Buffer | null,
      cb: Callback<any>
    );
    readonly type: number;
    readonly offset: number;
    readonly size: number;
    readonly data: Buffer | null;
    readonly storage: RandomAccessStorage;
  }

  function queueAndRun(self: RandomAccessStorage, req: Request): void;
  function drainQueue(self: RandomAccessStorage): void;
  function defaultImpl(err: Error): () => void;
  function nextTick(req: Request, err: Error | null, val: any): void;
  function nextTickCallback(cb: (err: Error | null) => void): void;
  function noop(): void;
}
