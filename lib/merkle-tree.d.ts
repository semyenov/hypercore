// lib/merkle-tree.d.ts

import { Buffer } from "buffer";
import { FlatTreeIterator } from "flat-tree";
import RandomAccessStorage from "random-access-storage";
import hypercoreCrypto from "hypercore-crypto";
import Xache from "xache";
import * as m from "./messages";

export class NodeQueue {
  constructor(nodes: m.CompactNode[], extra?: m.CompactNode | null);
  i: number;
  nodes: m.CompactNode[];
  extra: m.CompactNode | null;
  length: number;
  shift(index: number): m.CompactNode;
}

class MerkleTree {
  fork: number;
  roots: m.CompactNode[];
  length: number;
  byteLength: number;
  signature: Buffer | null;
  prologue: m.Prologue | null;
  storage: RandomAccessStorage;
  unflushed: Map<number, m.CompactNode>;
  flushing: Map<number, m.CompactNode> | null;
  truncated: boolean;
  truncateTo: number;
  crypto: typeof hypercoreCrypto;
  cache: Xache<number, m.CompactNode>;

  constructor(
    storage: RandomAccessStorage,
    roots: m.CompactNode[],
    fork: number,
    signature: Buffer | null,
    prologue: m.Prologue | null,
  );

  addNode(node: m.CompactNode): void;
  batch(): MerkleTreeBatch;
  restoreBatch(length: number): Promise<MerkleTreeBatch>;
  seek(bytes: number, padding?: number): ByteSeeker;
  hash(): Buffer;
  signable(namespace: Buffer): Buffer;
  getRoots(length: number): Promise<m.CompactNode[]>;
  setPrologue(prologue: m.Prologue): void;
  addNodes(nodes: m.CompactNode[]): void;
  getNeededNodes(
    length: number,
    start: number,
    end: number,
  ): Promise<m.CompactNode[]>;
  upgradeable(length: number): Promise<boolean>;
  blankNode(index: number): m.CompactNode;
  get(index: number, error?: boolean): Promise<m.CompactNode | null>;
  flush(): Promise<void>;
  clear(): Promise<void>;
  close(): Promise<void>;
  truncate(length: number, fork?: number): Promise<MerkleTreeBatch>;
  reorg(proof: m.Data): Promise<ReorgBatch>;
  verifyFullyRemote(proof: m.Data): MerkleTreeBatch;
  verify(proof: m.Data): Promise<MerkleTreeBatch>;
  proof(options: {
    block?: m.RequestBlock;
    hash?: m.RequestHash;
    seek?: m.RequestSeek;
    upgrade?: m.RequestUpgrade;
  }): Promise<m.Data>;
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
      prologue?: m.Prologue;
    },
  ): Promise<MerkleTree>;
}

export class MerkleTreeBatch extends MerkleTree {
  ancestors: number;
  byteLength: number;
  fork: number;
  hashCached: Buffer | null;
  length: number;
  nodes: m.CompactNode[];
  roots: m.CompactNode[];
  signature: Buffer | null;
  tree: MerkleTree;
  treeFork: number;
  treeLength: number;
  upgraded: boolean;

  constructor(tree: MerkleTree);

  checkout(length: number, additionalRoots?: m.CompactNode[]): void;
  prune(length: number): void;
  clone(): MerkleTreeBatch;
  hash(): Buffer;
  signable(manifestHash: Buffer): Buffer;
  signableCompat(noHeader: boolean): Buffer;
  get(index: number, error: boolean): m.CompactNode | null;
  proof(options: {
    block?: m.DataBlock;
    hash?: m.DataHash;
    seek?: m.DataSeek;
    upgrade?: m.DataUpgrade;
  }): m.Data;
  verifyUpgrade(proof: m.Data): boolean;
  append(buf: Buffer): void;
  appendRoot(node: m.CompactNode, ite: FlatTreeIterator): void;
  commitable(): boolean;
  commit(): void;
  seek(bytes: number, padding: number): ByteSeeker;
  byteRange(index: number): Promise<[number, number]>;
  byteOffset(index: number): Promise<number>;
}

export class ReorgBatch extends MerkleTreeBatch {
  diff: m.CompactNode | null;
  want: {
    nodes: number;
    start: number;
    end: number;
  } | null;

  constructor(tree: MerkleTree);

  get finished(): boolean;
  update(proof: m.Data): Promise<boolean>;
}

export class ByteSeeker {
  constructor(
    tree: MerkleTreeBatch | MerkleTree,
    bytes: number,
    padding?: number,
  );
  tree: MerkleTreeBatch | MerkleTree;
  bytes: number;
  padding: number;
  start: number;
  end: number;

  update(): Promise<[number, number] | null>;
}

export = MerkleTree;
