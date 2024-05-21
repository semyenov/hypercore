// core.d.ts
declare module "./lib/core" {
  type Callback<T> = (err?: Error | null, result?: T) => void;

  interface Options {
    overwrite?: boolean;
    force?: boolean;
    createIfMissing?: boolean;
    crypto?: any;
    legacy?: boolean;
    compat?: boolean;
    manifest?: Manifest;
    key?: Uint8Array;
    keyPair?: KeyPair;
    readonly?: boolean;
    sessions?: any[];
    onupdate?: (status: number, bitfield: any, value: any, from: any) => void;
    onconflict?: (proof: Proof) => void;
  }

  interface KeyPair {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
  }

  interface Manifest {
    version: number;
    hash: string;
    allowPatch: boolean;
    quorum: number;
    signers: Signer[];
    prologue: Prologue | null;
  }

  interface Signer {
    signature: string;
    namespace: Uint8Array;
    publicKey: Uint8Array;
  }

  interface Prologue {
    hash: Uint8Array;
    length: number;
  }

  interface Proof {
    fork: number;
    upgrade: {
      length: number;
      nodes: any[];
    };
    manifest: Manifest;
    block?: {
      index: number;
      value: Uint8Array;
    };
  }

  interface Batch {
    length: number;
    treeLength: number;
    fork: number;
    roots: any[];
    byteLength: number;
    nodes: any[];
    ancestors: number;
    signature: Uint8Array | null;
    upgraded: boolean;
    commitable(): boolean;
    append(value: Uint8Array): void;
    truncate(length: number, fork: number): Promise<Batch>;
    verify(proof: Proof): Promise<Batch>;
    verifyFullyRemote(proof: Proof): Batch;
    reorg(proof: Proof): Promise<Batch>;
    commit(): void;
    hash(): Uint8Array;
    byteOffset(index: number): Promise<number>;
  }

  interface Header {
    external: any;
    key: Uint8Array;
    manifest: Manifest | null;
    keyPair: KeyPair | null;
    userData: { key: string; value: Uint8Array }[];
    tree: {
      fork: number;
      length: number;
      rootHash: Uint8Array | null;
      signature: Uint8Array | null;
    };
    hints: {
      reorgs: any[];
      contiguousLength: number;
    };
  }

  interface Storage {
    close(callback: Callback<void>): void;
    unlink(callback: Callback<void>): void;
    write(offset: number, data: Uint8Array, callback: Callback<void>): void;
    read(offset: number, size: number, callback: Callback<Uint8Array>): void;
    stat(callback: Callback<{ size: number }>): void;
    truncate(size: number, callback: Callback<void>): void;
  }

  interface Oplog {
    open(): Promise<{ header: Header; entries: any[] }>;
    append(entries: any[], flush: boolean): Promise<void>;
    flush(header: Header): Promise<void>;
    storage: Storage;
  }

  interface BigHeader {
    load(external: any): Promise<Header>;
    flush(header: Header): Promise<void>;
    close(): Promise<void>;
  }

  interface Mutex {
    lock(): Promise<void>;
    unlock(): Promise<void>;
    destroy(): Promise<void>;
  }

  interface MerkleTree {
    length: number;
    fork: number;
    prologue: Prologue | null;
    roots: any[];
    byteLength: number;
    batch(): Batch;
    verify(proof: Proof): Promise<Batch>;
    verifyFullyRemote(proof: Proof): Batch;
    reorg(proof: Proof): Promise<Batch>;
    truncate(length: number, fork: number): Promise<Batch>;
    setPrologue(prologue: Prologue): void;
    clear(): Promise<void>;
    flush(): Promise<void>;
    addNode(node: any): void;
    getRoots(length: number): Promise<any[]>;
    byteOffset(index: number): Promise<number>;
    storage: Storage;
  }

  interface BlockStore {
    put(index: number, data: Uint8Array, offset: number): Promise<void>;
    putBatch(index: number, batch: Uint8Array[], offset: number): Promise<void>;
    get(index: number): Promise<Uint8Array>;
    clear(offset: number, length: number): Promise<void>;
    flush(): Promise<void>;
    storage: Storage;
  }

  interface Bitfield {
    get(index: number): boolean;
    set(index: number, value: boolean): void;
    setRange(start: number, length: number, value: boolean): void;
    lastSet(index: number): number;
    firstSet(index: number): number;
    toBuffer(length: number): Uint8Array;
    clear(): Promise<void>;
    flush(): Promise<void>;
    storage: Storage;
  }

  interface RemoteBitfield {
    insert(start: number, bitfield: Uint32Array): void;
    set(index: number, value: boolean): void;
    setRange(start: number, length: number, value: boolean): void;
  }

  interface Verifier {
    sign(batch: Batch, keyPair: KeyPair): Uint8Array;
    verify(batch: Batch, signature: Uint8Array): boolean;
    compat: boolean;
  }

  export default class Core {
    tracer: any;
    onupdate: (status: number, bitfield: any, value: any, from: any) => void;
    onconflict: (proof: Proof) => void;
    preupdate: any;
    header: Header;
    compat: boolean;
    crypto: any;
    oplog: Oplog;
    bigHeader: BigHeader;
    tree: MerkleTree;
    blocks: BlockStore;
    bitfield: Bitfield;
    verifier: Verifier | null;
    truncating: number;
    updating: boolean;
    closed: boolean;
    skipBitfield: RemoteBitfield | null;
    active: number;
    sessions: any[];
    constructor(
      header: Header,
      compat: boolean,
      crypto: any,
      oplog: Oplog,
      bigHeader: BigHeader,
      tree: MerkleTree,
      blocks: BlockStore,
      bitfield: Bitfield,
      verifier: Verifier | null,
      sessions: any[],
      legacy: boolean,
      onupdate: (status: number, bitfield: any, value: any, from: any) => void,
      onconflict: (proof: Proof) => void
    );
    static open(
      storage: (filename: string) => Storage,
      opts?: Options
    ): Promise<Core>;
    static resume(
      oplogFile: Storage,
      treeFile: Storage,
      bitfieldFile: Storage,
      dataFile: Storage,
      headerFile: Storage,
      opts: Options
    ): Promise<Core>;
    audit(): Promise<any>;
    setManifest(manifest: Manifest): Promise<void>;
    copyPrologue(
      src: Core,
      options?: { additional?: Uint8Array[] }
    ): Promise<void>;
    flush(): Promise<void>;
    userData(key: string, value: Uint8Array, flush?: boolean): Promise<void>;
    truncate(
      length: number,
      fork: number,
      options?: { signature?: Uint8Array; keyPair?: KeyPair }
    ): Promise<void>;
    clearBatch(): Promise<void>;
    clear(start: number, end: number, cleared: any): Promise<void>;
    purge(): Promise<void>;
    insertBatch(
      batch: Batch,
      values: Uint8Array[],
      options?: {
        signature?: Uint8Array;
        keyPair?: KeyPair;
        pending?: boolean;
        treeLength?: number;
      }
    ): Promise<{ length: number; byteLength: number } | null>;
    append(
      values: Uint8Array[],
      options?: {
        signature?: Uint8Array;
        keyPair?: KeyPair;
        preappend?: (values: Uint8Array[]) => Promise<void>;
      }
    ): Promise<{ length: number; byteLength: number }>;
    checkConflict(proof: Proof, from: any): Promise<boolean>;
    verifyReorg(proof: Proof): Promise<Batch>;
    verify(proof: Proof, from: any): Promise<boolean>;
    reorg(batch: Batch, from: any): Promise<boolean>;
    openSkipBitfield(): RemoteBitfield;
    close(): Promise<void>;
  }
}
