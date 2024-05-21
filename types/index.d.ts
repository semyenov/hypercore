declare module "hypercore" {
  import { EventEmitter } from "events";
  import { Readable, Writable } from "streamx";
  import { RandomAccessStorage } from "random-access-storage";
  import { KeyPair } from "hypercore-crypto";
  import ProtocolStream from "@hyperswarm/secret-stream";
  import Protomux from "protomux";
  import {
    HypercoreBatch,
    Replicator,
    BlockEncryption,
    Info,
    ReadStream,
    WriteStream,
    ByteStream,
    Download,
  } from "./lib";

  export default class Hypercore extends EventEmitter {
    constructor(
      storage: RandomAccessStorage,
      key?: Buffer | string,
      opts?: HypercoreOptions
    );

    static MAX_SUGGESTED_BLOCK_SIZE: number;
    static key(manifest: Manifest, opts?: ManifestOptions): Buffer;
    static discoveryKey(key: Buffer): Buffer;
    static getProtocolMuxer(stream: ProtocolStream): Protomux;
    static createProtocolStream(
      isInitiator: boolean | ProtocolStream,
      opts?: ProtocolStreamOptions
    ): ProtocolStream;
    static defaultStorage(
      storage: RandomAccessStorage | string,
      opts?: StorageOptions
    ): (name: string) => RandomAccessStorage;

    readonly discoveryKey: Buffer | null;
    readonly manifest: Manifest | null;
    readonly length: number;
    readonly indexedLength: number;
    readonly byteLength: number;
    readonly contiguousLength: number;
    readonly contiguousByteLength: number;
    readonly fork: number;
    readonly peers: Peer[];
    readonly encryptionKey: Buffer | null;
    readonly padding: number;

    snapshot(opts?: SnapshotOptions): Hypercore;
    session(opts?: SessionOptions): Hypercore;
    setEncryptionKey(
      encryptionKey: Buffer | null,
      opts?: EncryptionOptions
    ): Promise<void>;
    setKeyPair(keyPair: KeyPair): void;
    close(err?: Error): Promise<void>;
    replicate(
      isInitiator: boolean | ProtocolStream,
      opts?: ReplicateOptions
    ): ProtocolStream;
    ready(): Promise<void>;
    setUserData(
      key: string,
      value: Buffer,
      opts?: { flush?: boolean }
    ): Promise<void>;
    getUserData(key: string): Promise<Buffer | null>;
    createTreeBatch(): HypercoreBatch;
    findingPeers(): () => void;
    info(opts?: InfoOptions): Promise<Info>;
    update(opts?: UpdateOptions): Promise<boolean>;
    batch(opts?: BatchOptions): HypercoreBatch;
    seek(bytes: number, opts?: SeekOptions): Promise<number | null>;
    has(start: number, end?: number): Promise<boolean>;
    get(index: number, opts?: GetOptions): Promise<Buffer | null>;
    clear(
      start: number,
      end?: number,
      opts?: ClearOptions
    ): Promise<{ blocks: number } | void>;
    purge(): Promise<void>;
    truncate(newLength?: number, opts?: TruncateOptions): Promise<void>;
    append(blocks: Buffer | Buffer[], opts?: AppendOptions): Promise<number>;
    treeHash(length?: number): Promise<Buffer>;
    registerExtension(name: string, handlers?: ExtensionHandlers): Extension;
    createReadStream(opts?: ReadStreamOptions): ReadStream;
    createWriteStream(opts?: WriteStreamOptions): WriteStream;
    createByteStream(opts?: ByteStreamOptions): ByteStream;
    download(range?: DownloadRange): Download;
    undownload(range: DownloadRange): void;
    cancel(request: any): void;

    static defaultSignerManifest(publicKey: Buffer): Manifest;
    static fromManifest(manifest: Manifest, opts?: ManifestOptions): Verifier;
    static createManifest(manifest: any): Manifest;
    static isValidManifest(key: Buffer, manifest: Manifest): boolean;
    static isCompat(key: Buffer, manifest: Manifest): boolean;
    static sign(
      manifest: Manifest,
      batch: any,
      keyPair: KeyPair,
      opts?: any
    ): Buffer;
  }

  interface HypercoreOptions {
    key?: Buffer | string;
    storage?: RandomAccessStorage | string;
    crypto?: any;
    keyPair?: KeyPair;
    writable?: boolean;
    snapshot?: boolean;
    sparse?: boolean;
    autoClose?: boolean;
    onwait?: (index: number, core: Hypercore) => void;
    wait?: boolean;
    timeout?: number;
    cache?: boolean | any;
    _sessions?: Hypercore[];
    preload?: () => Promise<any>;
    _preready?: (core: Hypercore) => Promise<void>;
    createIfMissing?: boolean;
    force?: boolean;
    compat?: boolean;
    legacy?: boolean;
    manifest?: Manifest;
    encryptionKey?: Buffer;
    isBlockKey?: boolean;
    inflightRange?: number;
    allowFork?: boolean;
    notDownloadingLinger?: number;
    from?: Hypercore;
    _opening?: Promise<void>;
  }

  interface Manifest {
    version?: number;
    hash?: string;
    allowPatch?: boolean;
    quorum?: number;
    signers?: Signer[];
    prologue?: Prologue | null;
  }

  interface ManifestOptions {
    compat?: boolean;
    version?: number;
    namespace?: Buffer;
  }

  interface SnapshotOptions {
    snapshot?: boolean;
  }

  interface SessionOptions {
    writable?: boolean;
    cache?: boolean | any;
    timeout?: number;
    sparse?: boolean;
    onwait?: (index: number, core: Hypercore) => void;
    wait?: boolean;
    _sessions?: Hypercore[];
    _opening?: Promise<void>;
    _preready?: (core: Hypercore) => Promise<void>;
    _active?: boolean;
    _openingFrom?: Hypercore;
    preload?: () => Promise<any>;
  }

  interface EncryptionOptions {
    compat?: boolean;
    isBlockKey?: boolean;
  }

  interface ReplicateOptions {
    ondiscoverykey?: (discoveryKey: Buffer, peer: Peer) => void;
    session?: boolean;
    stream?: ProtocolStream;
    keepAlive?: boolean;
  }

  interface StorageOptions {
    unlocked?: boolean;
    lock?: string;
    pool?: any;
    rmdir?: boolean;
    writable?: boolean;
    poolSize?: number;
  }

  interface InfoOptions {
    userData?: boolean;
  }

  interface UpdateOptions {
    force?: boolean;
    activeRequests?: any[];
  }

  interface BatchOptions {
    checkout?: number;
    autoClose?: boolean;
    session?: boolean;
    restore?: boolean;
    clear?: boolean;
  }

  interface SeekOptions {
    wait?: boolean;
    activeRequests?: any[];
    timeout?: number;
    tree?: any;
  }

  interface GetOptions {
    wait?: boolean;
    onwait?: (index: number, core: Hypercore) => void;
    activeRequests?: any[];
    timeout?: number;
    valueEncoding?: any;
    decrypt?: boolean;
    raw?: boolean;
  }

  interface ClearOptions {
    diff?: boolean;
  }

  interface TruncateOptions {
    fork?: number;
    keyPair?: KeyPair;
    signature?: Buffer;
  }

  interface AppendOptions {
    keyPair?: KeyPair;
    signature?: Buffer;
  }

  interface ExtensionHandlers {
    encoding?: any;
    onmessage?: (message: any, peer: Peer) => void;
  }

  interface Extension {
    name: string;
    handlers: ExtensionHandlers;
    encoding: any;
    session: Hypercore;
    send(message: any, peer: Peer): void;
    broadcast(message: any): void;
    destroy(): void;
    _onmessage(state: any, peer: Peer): void;
  }

  interface ReadStreamOptions {
    start?: number;
    end?: number;
    snapshot?: boolean;
    tail?: boolean;
    live?: boolean;
    timeout?: number;
    wait?: boolean;
    userData?: boolean;
  }

  interface WriteStreamOptions {
    valueEncoding?: any;
  }

  interface ByteStreamOptions {
    start?: number;
    end?: number;
    snapshot?: boolean;
    tail?: boolean;
    live?: boolean;
    timeout?: number;
    wait?: boolean;
    userData?: boolean;
  }

  interface DownloadRange {
    start?: number;
    end?: number;
    length?: number;
    live?: boolean;
    userData?: boolean;
  }

  interface Signer {
    signature: string;
    namespace: Buffer;
    publicKey: Buffer;
  }

  interface Prologue {
    hash: Buffer;
    length: number;
  }

  interface Peer {
    remotePublicKey: Buffer;
    remoteLength: number;
    remoteFork: number;
    remoteCanUpgrade: boolean;
    extensions: Map<string, Extension>;
    extension(name: string, message: Buffer): void;
    broadcastRange(start: number, length: number): void;
    setKeepAlive(interval: number): void;
    on(event: string, listener: (...args: any[]) => void): this;
    off(event: string, listener: (...args: any[]) => void): this;
  }

  interface ProtocolStreamOptions {
    stream?: ProtocolStream;
    keepAlive?: boolean;
    ondiscoverykey?: (discoveryKey: Buffer) => void;
  }
}
