declare module "hypercore/lib/oplog" {
  import { Codec, State } from "compact-encoding";
  import { OplogHeader, OplogEntry } from "hypercore/lib/messages";
  import RandomAccessStorage from "random-access-storage";

  type OplogOptions = {
    pageSize?: number;
    headerEncoding: Codec<OplogHeader>;
    entryEncoding: Codec<OplogEntry>;
    readonly?: boolean;
  };

  type DecodedEntry = {
    header: number;
    partial: boolean;
    byteLength: number;
    message: any;
  };

  type OplogResult = {
    header: number;
    entries: DecodedEntry[];
  };

  export default class Oplog {
    storage: RandomAccessStorage;
    headerEncoding: Codec<OplogHeader>;
    entryEncoding: Codec<OplogEntry>;
    readonly: boolean;
    flushed: boolean;
    byteLength: number;
    length: number;

    constructor(storage: RandomAccessStorage, options?: OplogOptions);

    open(): Promise<OplogResult>;
    flush(header: OplogHeader): Promise<void>;
    append(batch: OplogEntry[], atomic?: boolean): Promise<void>;
    close(): Promise<void>;
  }
}
