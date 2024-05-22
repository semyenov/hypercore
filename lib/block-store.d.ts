import { Buffer } from "buffer";
import RandomAccessStorage from "random-access-storage";
import MerkleTree from "hypercore/lib/merkle-tree";

export = class BlockStore {
  storage: RandomAccessStorage;
  tree: MerkleTree;

  constructor(storage: RandomAccessStorage, tree: MerkleTree);

  get(i: number, tree?: MerkleTree): Promise<Buffer>;
  put(i: number, data: Buffer, offset: number): Promise<number>;
  putBatch(i: number, batch: Buffer[], offset: number): Promise<void>;
  clear(offset?: number, length?: number): Promise<void>;
  close(): Promise<void>;
};
