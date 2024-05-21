declare module "./lib/batch" {
  import { EventEmitter } from "events";
  import { KeyPair } from "hypercore";
  import {
    Session,
    TreeBatch,
    Block,
    Info,
    SeekResult,
    UserData,
  } from "./session-types"; // You may need to create or import these types accordingly

  export default class HypercoreBatch extends EventEmitter {
    session: Session;
    opened: boolean;
    closed: boolean;
    opening: Promise<void> | null;
    closing: Promise<void> | null;
    writable: boolean;
    autoClose: boolean;
    restore: boolean;
    fork: number;

    appends: Buffer[];
    appendsActual: Buffer[] | null;
    checkoutLength: number;
    byteLength: number;
    sessionLength: number;
    sessionByteLength: number;
    sessionBatch: TreeBatch | null;
    cachedBatch: TreeBatch | null;
    flushing: Promise<boolean> | null;
    clear: boolean;

    constructor(
      session: Session,
      checkoutLength: number,
      autoClose: boolean,
      restore: boolean,
      clear: boolean
    );

    get id(): string;
    get key(): Buffer;
    get discoveryKey(): Buffer;
    get indexedLength(): number;
    get flushedLength(): number;
    get indexedByteLength(): number;
    get length(): number;
    get byteLength(): number;
    get core(): any;
    get manifest(): any;

    ready(): Promise<void>;
    open(): Promise<void>;
    has(index: number): Promise<boolean>;
    update(opts: any): Promise<void>;
    treeHash(): Buffer;
    setUserData(key: string, value: any, opts?: any): Promise<void>;
    getUserData(key: string, opts?: any): Promise<UserData>;
    info(opts?: any): Promise<Info>;
    seek(bytes: number, opts?: any): Promise<SeekResult>;
    get(index: number, opts?: any): Promise<any>;
    waitForFlush(): Promise<void>;
    restoreBatch(length: number, blocks: Buffer[]): Promise<TreeBatch>;
    catchupBatch(clone: boolean): TreeBatch;
    createTreeBatch(length: number, opts?: any): TreeBatch | null;
    truncate(newLength: number, opts?: any): Promise<void>;
    append(
      blocks: Buffer | Buffer[]
    ): Promise<{ length: number; byteLength: number }>;
    encode(enc: any, val: any): Buffer;
    encrypt(index: number, buffer: Buffer): Buffer;
    flush(opts?: any): Promise<boolean>;
    flushInternal(
      length: number,
      keyPair: KeyPair,
      signature: Buffer | null,
      pending: boolean
    ): Promise<boolean>;
    close(): Promise<void>;
    closeInternal(): Promise<void>;
    clearAppends(): void;
  }
}
