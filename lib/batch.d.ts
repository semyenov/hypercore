import { EventEmitter } from "events";
import { Codec } from "compact-encoding";
import { Buffer } from "b4a";

interface Session {
  id: any;
  key: any;
  discoveryKey: any;
  core: any;
  manifest: any;
  ready(): Promise<void>;
  has(index: number): Promise<boolean>;
  update(opts: any): Promise<void>;
  get(index: number, opts: any): Promise<any>;
  createTreeBatch(): any;
  close(): Promise<void>;
  // other session methods and properties
}

interface BatchInfo {
  length: number;
  byteLength: number;
}

interface FlushOptions {
  length?: number;
  keyPair?: any;
  signature?: any;
  pending?: boolean;
}

interface TruncateOptions {
  fork?: number;
  force?: boolean;
}

interface CreateTreeBatchOptions {
  blocks?: any[];
  clone?: boolean;
}

interface UserDataOptions {
  // define user data options
}

interface SeekResult {
  index: number;
  bytes: number;
}

declare class HypercoreBatch extends EventEmitter {
  session: Session;
  opened: boolean;
  closed: boolean;
  opening: Promise<void> | null;
  closing: Promise<void> | null;
  writable: boolean;
  autoClose: boolean;
  restore: boolean;
  fork: number;

  private _appends: Buffer[];
  private _appendsActual: Buffer[] | null;
  private _checkoutLength: number;
  private _byteLength: number;
  private _sessionLength: number;
  private _sessionByteLength: number;
  private _sessionBatch: any;
  private _cachedBatch: any;
  private _flushing: Promise<void> | null;
  private _clear: boolean;

  constructor(
    session: Session,
    checkoutLength: number,
    autoClose: boolean,
    restore: boolean,
    clear: boolean
  );

  get id(): any;
  get key(): any;
  get discoveryKey(): any;
  get indexedLength(): number;
  get flushedLength(): number;
  get indexedByteLength(): number;
  get length(): number;
  get byteLength(): number;
  get core(): any;
  get manifest(): any;

  ready(): Promise<void>;
  private _open(): Promise<void>;
  has(index: number): Promise<boolean>;
  update(opts: any): Promise<void>;
  treeHash(): any;
  setUserData(key: any, value: any, opts: UserDataOptions): any;
  getUserData(key: any, opts: UserDataOptions): any;
  info(opts: any): Promise<any>;
  seek(bytes: number, opts?: any): Promise<SeekResult>;
  get(index: number, opts?: any): Promise<any>;
  private _waitForFlush(): Promise<void>;
  restoreBatch(length: number, blocks: any): Promise<any>;
  private _catchupBatch(clone: boolean): any;
  createTreeBatch(length: number, opts?: CreateTreeBatchOptions): any;
  truncate(newLength?: number, opts?: TruncateOptions): Promise<void>;
  append(blocks: any[]): Promise<BatchInfo>;
  private _encode(enc: Codec, val: any): Buffer;
  private _encrypt(index: number, buffer: Buffer): Buffer;
  flush(opts?: FlushOptions): Promise<boolean>;
  private _flush(
    length: number,
    keyPair: any,
    signature: any,
    pending: boolean
  ): Promise<boolean>;
  close(): Promise<void>;
  private _close(): Promise<void>;
  private _clearAppends(): void;
}

export = HypercoreBatch;
