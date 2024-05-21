declare module "./lib/oplog" {
  import { Buffer } from "buffer";
  import { cenc } from "./cenc"; // Adjust the import path as necessary
  import RandomAccessStorage from "random-access-storage";

  interface OplogState {
    start: number;
    end: number;
    buffer: Buffer;
  }

  interface EncodingOptions {
    pageSize?: number;
    headerEncoding?: typeof cenc.raw;
    entryEncoding?: typeof cenc.raw;
    readonly?: boolean;
  }

  interface Entry {
    header: number;
    partial: boolean;
    byteLength: number;
    message: string;
  }

  interface AppendBatch {
    header: string | null;
    entries: Entry[];
  }

  class Oplog {
    private storage: RandomAccessStorage; // Assuming Storage is a generic storage interface
    private headerEncoding: typeof cenc.raw;
    private entryEncoding: typeof cenc.raw;
    private readonly: boolean;
    private flushed: boolean;
    private byteLength: number;
    private length: number;

    private _headers: [number, number];
    private _pageSize: number;
    private _entryOffset: number;

    constructor(storage: RandomAccessStorage, options?: EncodingOptions);

    async open(): Promise<AppendBatch>;
    flush(header: string): Promise<void>;
    append(batch: string | string[], atomic: boolean): Promise<void>;
    close(): Promise<void>;
  }
}
