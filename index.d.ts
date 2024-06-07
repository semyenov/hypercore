import { EventEmitter } from 'events';
import * as c from 'compact-encoding';
import RandomAccessStorage from 'random-access-storage';
import NoiseSecretStream from '@hyperswarm/secret-stream';
import Hypertrace from 'hypertrace';
import Protomux from 'protomux';
import Xache from 'xache';

import * as m from './lib/messages';
import Replicator from './lib/replicator';
import Download from './lib/download';
import Core from './lib/core';
import Peer from './lib/peer';
import { ReadStream, WriteStream, ByteStream } from './lib/streams';
import Info, { InfoOptions } from './lib/info';
import { BlockEncryptionOptions } from './lib/block-encryption';
import * as hypercoreCrypto from 'hypercore-crypto';
import type HypercoreBatch from './lib/batch';

declare const promises: unique symbol;
declare const inspect: unique symbol;

declare type HypercoreOptionsStorage = ((filename: string) => RandomAccessStorage) | RandomAccessStorage | string | null;

declare interface HypercoreOptions {
  active?: boolean;
  allowFork?: boolean;
  autoClose?: boolean;
  cache?: boolean | Xache;
  compat?: boolean;
  createIfMissing?: boolean;
  crypto?: typeof hypercoreCrypto;
  encodeBatch?: (batch: any[]) => Buffer[];
  encryptionKey?: Buffer | null;
  force?: boolean;
  from?: Hypercore;
  inflightRange?: [number, number];
  isBlockKey?: boolean;
  key?: Buffer | string;
  keyPair?: m.KeyPair;
  legacy?: boolean;
  manifest?: m.Manifest | Buffer;
  notDownloadingLinger?: number;
  onclose?: () => void;
  onopen?: () => void;
  onpeerupdate?(added: boolean, peer: string): void;
  onwait?: (index: number, core: Hypercore) => void;
  onwrite?(index: number, data: Buffer, peer: Peer, cb: () => void): void;
  overwrite?: boolean;
  preload?: () => HypercoreOptions | Promise<HypercoreOptions>;
  rmdir?: boolean;
  secretKey?: Buffer;
  snapshot?: boolean;
  sparse?: boolean;
  storage?: HypercoreOptionsStorage;
  timeout?: number;
  unlocked?: boolean;
  userData?: Record<string, Buffer>
  valueEncoding?: 'json' | 'utf-8' | 'binary';
  wait?: boolean;
  writable?: boolean;
}

export interface HypercoreGetOptions {
  wait?: boolean;
  timeout?: number;
  decrypt?: boolean;
  raw?: boolean;
  valueEncoding?: 'json' | 'utf-8' | 'binary';
}

export interface HypercoreDownloadRange {
  start: number;
  end?: number;
  linear?: boolean;
}

export interface HypercoreSignatureIndex {
  index?: number,
  signature?: Buffer
}

declare interface ReplicationOptions {
  stream?: any;
  session?: boolean;
  keepAlive?: boolean;
  ondiscoverykey?: (key: Buffer) => void;
}

interface ExtensionHandlers {
  encoding?: 'utf-8' | 'binary' | 'json';
  onmessage?: (message: unknown, peer: Peer) => void;
}

interface Extension<T = unknown> {
  name: 'string',
  handlers: ExtensionHandlers,
  encoding: c.Codec<T>;
  session: Hypercore,
  send: (message: T, peer: Peer) => void,
  broadcast: (message: T) => void,
  destroy: () => void
}

declare class Hypercore extends EventEmitter {
  readonly encryption: any;
  readonly extensions: Map<string, any>;
  readonly cache: Xache | null;
  readonly valueEncoding: c.Codec;
  readonly encodeBatch: any;
  readonly activeRequests: any[];
  readonly id: Buffer | null;
  readonly key: Buffer | null;
  readonly keyPair: any;
  readonly readable: boolean;
  readonly writable: boolean;
  readonly opened: boolean;
  readonly closed: boolean;
  readonly snapshotted: boolean;
  readonly sparse: boolean;
  readonly sessions: Hypercore[];
  readonly autoClose: boolean;
  readonly onwait: any;
  readonly wait: boolean;
  readonly timeout: number;
  readonly closing: any;
  readonly opening: any;

  constructor(options: HypercoreOptions);
  constructor(storage: HypercoreOptionsStorage, options?: HypercoreOptions);
  constructor(storage: HypercoreOptionsStorage, key?: Buffer | string | null, options?: HypercoreOptions);

  get discoveryKey(): Buffer | null;
  get manifest(): m.Manifest;
  get length(): number;
  get indexedLength(): number;
  get byteLength(): number;
  get contiguousLength(): number;
  get contiguousByteLength(): number;
  get fork(): number;
  get peers(): Peer[];
  get encryptionKey(): Buffer | null;
  get padding(): number;

  static MAX_SUGGESTED_BLOCK_SIZE: number;

  static key(manifest: m.Manifest | Buffer, opts?: { compat?: boolean, version?: string, namespace?: string }): Buffer;
  static discoveryKey(key: Buffer): Buffer;
  static getProtocolMuxer(stream: NoiseSecretStream): Protomux;
  static createProtocolStream(isInitiator: boolean | NoiseSecretStream, opts?: ReplicationOptions): NoiseSecretStream;
  static defaultStorage(storage: Storage | string, opts?: { unlocked?: boolean; lock?: string; poolSize?: number; rmdir?: boolean; writable?: boolean }): RandomAccessStorage;

  tracer: Hypertrace;
  storage: RandomAccessStorage;
  crypto: typeof hypercoreCrypto;
  core: Core;
  replicator: Replicator;

  snapshot(opts?: HypercoreOptions): Hypercore;
  session(opts?: HypercoreOptions): Hypercore;

  append(blocks: any, opts?: {
    signature?: Buffer;
    keyPair?: m.KeyPair;
    preappend?: (values: Buffer[]) => Promise<void>;
  }): Promise<{ length: number, byteLength: number }>;

  setEncryptionKey(encryptionKey: Buffer, opts?: Partial<BlockEncryptionOptions>): Promise<void>;
  setKeyPair(keyPair: m.KeyPair): void;
  close(err?: Error): Promise<void>;
  replicate(stream: NoiseSecretStream, opts?: ReplicationOptions): NoiseSecretStream;
  replicate(isInitiator: boolean, opts?: ReplicationOptions): NoiseSecretStream;

  ready(): Promise<void>;
  setUserData(key: string, value: Buffer, opts?: { flush?: boolean }): Promise<void>;
  getUserData(key: string): Promise<Buffer | null>;
  createTreeBatch(): any;
  findingPeers(): () => void;
  info(opts?: InfoOptions): Promise<Info>;
  update(opts?: any): Promise<boolean>;
  batch(opts?: { checkout?: number, autoClose?: boolean, session?: boolean, restore?: boolean, clear?: boolean }): HypercoreBatch;
  seek(bytes: number, opts?: any): Promise<any>;
  has(start: number, end?: number): Promise<boolean>;
  get(index: number, opts?: HypercoreGetOptions): Promise<any>;
  clear(start: number, opts?: { diff?: boolean }): Promise<any>;
  clear(start: number, end?: number, opts?: { diff?: boolean }): Promise<any>;
  purge(): Promise<void>;
  createReadStream(opts?: { start?: number; end?: number }): ReadStream;
  createWriteStream(opts?: any): WriteStream;
  createByteStream(opts?: { byteOffset?: number; byteLength?: number }): ByteStream;
  download(range?: { start?: number, end?: number, length?: number, blocks?: number[], ifAvailable?: boolean, linear?: boolean }): Download;
  undownload(range?: { start?: number, end?: number, length?: number, blocks?: number[], ifAvailable?: boolean, linear?: boolean }): void;
  cancel(request: any): void;
  truncate(newLength?: number, opts?: any): Promise<void>;
  treeHash(length?: number): Promise<Buffer>;
  registerExtension(name: string, handlers?: ExtensionHandlers): Extension;

  private _encode(enc: any, val: any): Buffer;
  private _decode(enc: any, block: Buffer): any;
}

export = Hypercore;