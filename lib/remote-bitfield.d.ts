import BigSparseArray from "big-sparse-array";
import MerkleTree from "hypercore/lib/merkle-tree";
import { Bitfield } from "./messages";

class RemoteBitfieldPage {
  index: number;
  offset: number;
  bitfield: Uint32Array;
  segment: RemoteBitfieldSegment;

  constructor(
    index: number,
    bitfield: Uint32Array,
    segment: RemoteBitfieldSegment
  );

  get tree(): MerkleTree;
  get(index: number): boolean;
  set(index: number, val: boolean): void;
  setRange(start: number, length: number, val: boolean): void;
  findFirst(val: boolean, position: number): number;
  findLast(val: boolean, position: number): number;
  insert(start: number, bitfield: Uint32Array): void;
  clear(start: number, bitfield: Uint32Array): void;
}

class RemoteBitfieldSegment {
  index: number;
  offset: number;
  tree: MerkleTree;
  pages: Array<RemoteBitfieldPage | undefined>;
  pagesLength: number;

  constructor(index: number);

  get chunks(): Array<any>;
  refresh(): void;
  add(page: RemoteBitfieldPage): void;
  findFirst(val: boolean, position: number): number;
  findLast(val: boolean, position: number): number;
}

export = class RemoteBitfield {
  static BITS_PER_PAGE: number;

  constructor();

  getBitfield(index: number): Bitfield | null;
  get(index: number): boolean;
  set(index: number, val: boolean): void;
  setRange(start: number, length: number, val: boolean): void;
  findFirst(val: boolean, position: number): number;
  firstSet(position: number): number;
  firstUnset(position: number): number;
  findLast(val: boolean, position: number): number;
  lastSet(position: number): number;
  lastUnset(position: number): number;
  insert(start: number, bitfield: Uint32Array): boolean;
  clear(start: number, bitfield: Uint32Array): boolean;
};
