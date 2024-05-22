declare module "hypercore/lib/bitfield" {
  import RandomAccessStorage from "random-access-storage";
  import BigSparseArray from "big-sparse-array";
  import { QuickbitIndex } from "quickbit";

  export class BitfieldPage {
    dirty: boolean;
    index: number;
    offset: number;
    bitfield: Uint32Array | null;
    segment: BitfieldSegment;

    constructor(index: number, segment: BitfieldSegment);
    get tree(): QuickbitIndex;
    get(index: number): boolean;
    set(index: number, val: boolean): void;
    setRange(start: number, length: number, val: boolean): void;
    findFirst(val: boolean, position: number): number;
    findLast(val: boolean, position: number): number;
    count(start: number, length: number, val: boolean): number;
  }

  export class BitfieldSegment {
    index: number;
    offset: number;
    tree: QuickbitIndex;
    pages: Array<BitfieldPage | null>;

    constructor(index: number, bitfield: Uint32Array);
    get bitfield(): Uint32Array;
    add(page: BitfieldPage): void;
    reallocate(length: number): void;
    findFirst(val: boolean, position: number): number;
    findLast(val: boolean, position: number): number;
  }

  export default class Bitfield {
    unflushed: BitfieldPage[];
    storage: RandomAccessStorage;
    resumed: boolean;
    _pages: BigSparseArray<BitfieldPage>;
    _segments: BigSparseArray<BitfieldSegment>;

    constructor(storage: RandomAccessStorage, buffer: Uint8Array | null);
    toBuffer(length: number): Uint8Array;
    getBitfield(index: number): BitfieldPage | null;
    get(index: number): boolean;
    set(index: number, val: boolean): void;
    setRange(start: number, length: number, val: boolean): void;
    findFirst(val: boolean, position: number): number;
    firstSet(position: number): number;
    firstUnset(position: number): number;
    findLast(val: boolean, position: number): number;
    lastSet(position: number): number;
    lastUnset(position: number): number;
    count(start: number, length: number, val: boolean): number;
    countSet(start: number, length: number): number;
    countUnset(start: number, length: number): number;
    want(
      start: number,
      length: number
    ): Generator<{ start: number; bitfield: Uint32Array }, void, unknown>;
    clear(): Promise<void>;
    close(): Promise<void>;
    flush(): Promise<void>;
    static open(
      storage: RandomAccessStorage,
      tree?: QuickbitIndex | null
    ): Promise<Bitfield>;
  }

  function clamp(n: number, min: number, max: number): number;
  function ceilTo(n: number, multiple?: number): number;
}
