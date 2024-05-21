// random-access-storage.d.ts

declare module "random-access-storage" {
  import { EventEmitter } from "events";

  export default class RandomAccessStorage extends EventEmitter {
    constructor(opts?: object);
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

    read(
      offset: number,
      size: number,
      cb: (err: Error | null, buf: Buffer) => void
    ): void;
    write(offset: number, data: Buffer, cb: (err: Error | null) => void): void;
    del(offset: number, size: number, cb: (err: Error | null) => void): void;
    truncate(offset: number, cb: (err: Error | null) => void): void;
    stat(cb: (err: Error | null, stats: any) => void): void;
    open(cb: (err: Error | null) => void): void;
    suspend(cb: (err: Error | null) => void): void;
    close(cb: (err: Error | null) => void): void;
    unlink(cb: (err: Error | null) => void): void;

    private run(req: Request, writing: boolean): void;
  }

  export class Request {
    constructor(
      self: RandomAccessStorage,
      type: number,
      offset: number,
      size: number,
      data: Buffer | null,
      cb: (err: Error | null, val: any) => void
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
