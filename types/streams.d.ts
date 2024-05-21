declare module "./lib/streams" {
  import Hypercore from "hypercore";
  import { Writable, Readable } from "streamx";

  export class ReadStream extends Readable {
    core: Hypercore;
    start: number;
    end: number;
    snapshot: boolean;
    live: boolean;

    constructor(
      core: Hypercore,
      opts?: {
        start?: number;
        end?: number;
        snapshot?: boolean;
        live?: boolean;
      }
    );
  }

  export class WriteStream extends Writable {
    core: Hypercore;
    constructor(core: Hypercore);
  }

  export class ByteStream extends Readable {
    constructor(
      core: Hypercore,
      opts?: { byteOffset?: number; byteLength?: number; prefetch?: number }
    );
  }
}
