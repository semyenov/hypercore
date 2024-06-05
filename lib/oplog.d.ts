import { Codec, State } from "compact-encoding";
import * as m from "hypercore/lib/messages";
import RandomAccessStorage from "random-access-storage";

type OplogOptions = {
  pageSize?: number;
  headerEncoding: Codec<m.OplogHeader>;
  entryEncoding: Codec<m.OplogEntry>;
  readonly?: boolean;
};

interface DecodedEntry {
  header: number;
  partial: boolean;
  byteLength: number;
  message: any;
}

interface OplogResult {
  header: number;
  entries: DecodedEntry[];
}

declare class Oplog {
  storage: RandomAccessStorage;
  headerEncoding: Codec<m.OplogHeader>;
  entryEncoding: Codec<m.OplogEntry>;
  readonly: boolean;
  flushed: boolean;
  byteLength: number;
  length: number;

  constructor(storage: RandomAccessStorage, options?: OplogOptions);

  open(): Promise<OplogResult>;
  flush(header: m.OplogHeader): Promise<void>;
  append(batch: m.OplogEntry[], atomic?: boolean): Promise<void>;
  close(): Promise<void>;
}

export = Oplog;
