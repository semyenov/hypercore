import { Codec, State } from "compact-encoding";
import * as m from "hypercore/lib/messages";
import RandomAccessStorage from "random-access-storage";

type OplogOptions<H = m.OplogHeader, E = m.OplogEntry> = {
  pageSize?: number;
  headerEncoding: Codec<H>;
  entryEncoding: Codec<E>;
  readonly?: boolean;
};

interface DecodedEntry<E> {
  header: number;
  partial: boolean;
  byteLength: number;
  message: E;
}

interface OplogResult<H = m.OplogHeader, E = m.OplogEntry> {
  header: H;
  entries: DecodedEntry<E>[];
}

declare class Oplog<H = m.OplogHeader, E = m.OplogEntry> {
  storage: RandomAccessStorage;
  headerEncoding: Codec<H>;
  entryEncoding: Codec<E>;
  readonly: boolean;
  flushed: boolean;
  byteLength: number;
  length: number;

  constructor(storage: RandomAccessStorage, options?: OplogOptions<H, E>);

  open(): Promise<OplogResult>;
  flush(header: H): Promise<void>;
  append(batch: E | E[], atomic?: boolean): Promise<void>;
  close(): Promise<void>;
}

export = Oplog;
