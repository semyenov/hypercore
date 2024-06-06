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

declare const promises: unique symbol;
declare const inspect: unique symbol;


declare interface HypercoreOptions {
  createIfMissing?: boolean;
  overwrite?: boolean;
  valueEncoding?: 'json' | 'utf-8' | 'binary';
  sparse?: boolean;
  secretKey?: Buffer;
  storeSecretKey?: boolean;
  storageCacheSize?: number;
  onwrite?(index: number, data: Buffer, peer: string, cb: () => void): void;
}

export interface HypercoreGetOptions {
  wait?: boolean;
  timeout?: number;
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

declare class Hypercore extends EventEmitter {
  constructor(storage: ((filename: string) => RandomAccessStorage) | string, key?: Buffer | string, options?: HypercoreOptions);

  static MAX_SUGGESTED_BLOCK_SIZE: number;
  static key(manifest: m.Manifest, options?: { compat?: boolean, version?: string, namespace?: string }): Buffer;
  static discoveryKey(key: Buffer): Buffer;
  static getProtocolMuxer(stream: NoiseSecretStream): Protomux;
  static createProtocolStream(isInitiator: boolean, opts?: any): NoiseSecretStream;
  static defaultStorage(storage: any, opts?: any): RandomAccessStorage;

  tracer: Hypertrace;
  storage: RandomAccessStorage;
  crypto: typeof hypercoreCrypto;
  core: Core;
  replicator: Replicator;
  encryption: any;
  extensions: Map<string, any>;
  cache: Xache | null;
  valueEncoding: c.Codec;
  encodeBatch: any;
  activeRequests: any[];
  id: string | null;
  key: Buffer | null;
  keyPair: any;
  readable: boolean;
  writable: boolean;
  opened: boolean;
  closed: boolean;
  snapshotted: boolean;
  sparse: boolean;
  sessions: Hypercore[];
  autoClose: boolean;
  onwait: any;
  wait: boolean;
  timeout: number;
  closing: any;
  opening: any;

  snapshot(opts?: HypercoreOptions): Hypercore;
  session(opts?: HypercoreOptions): Hypercore;
  setEncryptionKey(encryptionKey: Buffer, opts: any): Promise<void>;
  setKeyPair(keyPair: any): void;
  close(err?: any): Promise<void>;
  replicate(stream: NoiseSecretStream, opts?: any): any;
  replicate(isInitiator: boolean, opts?: any): any;

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

  ready(): Promise<void>;
  setUserData(key: string, value: any, opts?: { flush?: boolean }): Promise<void>;
  getUserData(key: string): Promise<any>;
  createTreeBatch(): any;
  findingPeers(): () => void;
  info(opts?: any): Promise<any>;
  update(opts?: any): Promise<boolean>;
  batch(opts?: { checkout?: number, autoClose?: boolean, session?: boolean, restore?: boolean, clear?: boolean }): any;
  seek(bytes: number, opts?: any): Promise<any>;
  has(start: number, end?: number): Promise<boolean>;
  get(index: number, opts?: HypercoreGetOptions): Promise<any>;
  clear(start: number, end?: number, opts?: any): Promise<any>;
  purge(): Promise<void>;
  createReadStream(opts: any): ReadStream;
  createWriteStream(opts: any): WriteStream;
  createByteStream(opts: any): ByteStream;
  download(range: m.Range): Download;
  undownload(range: m.Range): void;
  cancel(request: any): void;
  truncate(newLength?: number, opts?: any): Promise<void>;
  append(blocks: any, opts?: any): Promise<{ length: number, byteLength: number }>;
  treeHash(length?: number): Promise<Buffer>;
  registerExtension(name: string, handlers?: any): any;

  private _encode(enc: any, val: any): Buffer;
  private _decode(enc: any, block: Buffer): any;
}

export = Hypercore;