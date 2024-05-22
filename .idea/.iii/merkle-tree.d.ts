// Import necessary types from external modules
declare module "hypercore/lib/merkle-tree" {
  import { Buffer } from "buffer";
  import { FlatTreeIterator } from "flat-tree";
  import RandomAccessStorage from "random-access-storage";
  import hypercoreCrypto from "hypercore-crypto";
  import Xache from "xache";
  import {
    CompactNode,
    Prologue,
    Data,
    DataBlock,
    DataHash,
    DataSeek,
    DataUpgrade,
  } from "hypercore/lib/messages";

  export class NodeQueue {
    constructor(nodes: CompactNode[], extra?: CompactNode | null);
    i: number;
    nodes: CompactNode[];
    extra: CompactNode | null;
    length: number;
    shift(index: number): CompactNode;
  }

  export default class MerkleTree {
    fork: number;
    roots: CompactNode[];
    length: number;
    byteLength: number;
    signature: Buffer | null;
    prologue: Prologue | null;
    storage: RandomAccessStorage;
    unflushed: Map<number, CompactNode>;
    flushing: Map<number, CompactNode> | null;
    truncated: boolean;
    truncateTo: number;
    crypto: typeof hypercoreCrypto;
    cache: Xache<number, CompactNode>;

    constructor(
      storage: RandomAccessStorage,
      roots: CompactNode[],
      fork: number,
      signature: Buffer | null,
      prologue: Prologue | null
    );

    addNode(node: CompactNode): void;
    batch(): MerkleTreeBatch;
    restoreBatch(length: number): Promise<MerkleTreeBatch>;
    seek(bytes: number, padding: number): ByteSeeker;
    hash(): Buffer;
    signable(namespace: Buffer): Buffer;
    getRoots(length: number): Promise<CompactNode[]>;
    setPrologue(prologue: Prologue): void;
    addNodes(nodes: CompactNode[]): void;
    getNeededNodes(
      length: number,
      start: number,
      end: number
    ): Promise<CompactNode[]>;
    upgradeable(length: number): Promise<boolean>;
    blankNode(index: number): CompactNode;
    get(index: number, error?: boolean): Promise<CompactNode | null>;
    flush(): Promise<void>;
    clear(): Promise<void>;
    close(): Promise<void>;
    truncate(length: number, fork?: number): Promise<MerkleTreeBatch>;
    reorg(proof: Data): Promise<ReorgBatch>;
    verifyFullyRemote(proof: Data): MerkleTreeBatch;
    verify(proof: Data): Promise<MerkleTreeBatch>;
    proof(options: {
      block?: DataBlock;
      hash?: DataHash;
      seek?: DataSeek;
      upgrade?: DataUpgrade;
    }): Data;
    missingNodes(index: number): Promise<number>;
    nodes(index: number): Promise<number>;
    byteRange(index: number): Promise<[number, number]>;
    byteOffset(index: number): Promise<number>;

    static open(
      storage: RandomAccessStorage,
      opts?: {
        length?: number;
        fork?: number;
        signature?: Buffer;
        prologue?: Prologue;
      }
    ): Promise<MerkleTree>;
  }

  export class MerkleTreeBatch extends MerkleTree {
    ancestors: number;
    byteLength: number;
    fork: number;
    hashCached: Buffer | null;
    length: number;
    nodes: CompactNode[];
    roots: CompactNode[];
    signature: Buffer | null;
    tree: MerkleTree;
    treeFork: number;
    treeLength: number;
    upgraded: boolean;

    constructor(tree: MerkleTree);

    checkout(length: number, additionalRoots?: CompactNode[]): void;
    prune(length: number): void;
    clone(): MerkleTreeBatch;
    hash(): Buffer;
    signable(manifestHash: Buffer): Buffer;
    signableCompat(noHeader: boolean): Buffer;
    get(index: number, error: boolean): CompactNode | null;
    proof(options: {
      block?: DataBlock;
      hash?: DataHash;
      seek?: DataSeek;
      upgrade?: DataUpgrade;
    }): Data;
    verifyUpgrade(proof: Data): boolean;
    append(buf: Buffer): void;
    appendRoot(node: CompactNode, ite: FlatTreeIterator): void;
    commitable(): boolean;
    commit(): void;
    seek(bytes: number, padding: number): ByteSeeker;
    byteRange(index: number): Promise<[number, number]>;
    byteOffset(index: number): Promise<number>;
  }

  export class ReorgBatch extends MerkleTreeBatch {
    diff: CompactNode | null;
    want: {
      nodes: number;
      start: number;
      end: number;
    } | null;

    constructor(tree: MerkleTree);

    get finished(): boolean;
    update(proof: Data): Promise<boolean>;
  }

  export class ByteSeeker {
    constructor(
      tree: MerkleTreeBatch | MerkleTree,
      bytes: number,
      padding?: number
    );
    tree: MerkleTreeBatch | MerkleTree;
    bytes: number;
    padding: number;
    start: number;
    end: number;

    update(): Promise<[number, number] | null>;
  }
}
