declare module "./lib/streams" {
  import Core from "hypercore/lib/core";
  import { Writable, Readable } from "streamx";

  export class ReadStream extends Readable {
    core: Core;
    start: number;
    end: number;
    snapshot: boolean;
    live: boolean;

    constructor(
      core: Core,
      opts?: {
        start?: number;
        end?: number;
        snapshot?: boolean;
        live?: boolean;
      }
    );
  }

  export class WriteStream extends Writable {
    core: Core;
    constructor(core: Core);
  }

  export class ByteStream extends Readable {
    constructor(
      core: Core,
      opts?: { byteOffset?: number; byteLength?: number; prefetch?: number }
    );
  }
}
