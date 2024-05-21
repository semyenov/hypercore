declare module "./lib/remote-bitfield" {
  import { BigSparseArray } from "big-sparse-array";

  const BITS_PER_PAGE = 32768;
  const BYTES_PER_PAGE = BITS_PER_PAGE / 8;
  const WORDS_PER_PAGE = BYTES_PER_PAGE / 4;
  const BITS_PER_SEGMENT = 2097152;
  const BYTES_PER_SEGMENT = BITS_PER_SEGMENT / 8;
  const PAGES_PER_SEGMENT = BITS_PER_SEGMENT / BITS_PER_PAGE;

  interface Tree {
    skipFirst: (value: boolean, position: number) => number;
    skipLast: (value: boolean, position: number) => number;
  }

  interface Segment {
    add: (page: RemoteBitfieldPage) => void;
    refresh: () => void;
    chunks: any[]; // Replace 'any' with a more specific type if possible
  }

  class RemoteBitfieldPage {
    index: number;
    offset: number;
    bitfield: Uint32Array;
    segment: Segment;

    constructor(index: number, bitfield: Uint32Array, segment: Segment);
    get tree(): Tree;
    get(index: number): boolean;
    set(index: number, value: boolean): void;
    setRange(start: number, length: number, value: boolean): void;
    findFirst(value: boolean, position: number): number;
    findLast(value: boolean, position: number): number;
    insert(start: number, bitfield: Uint32Array): void;
    clear(start: number, bitfield: Uint32Array): void;
  }

  class RemoteBitfieldSegment {
    index: number;
    offset: number;
    tree: Tree;
    pages: Array<RemoteBitfieldPage>;
    pagesLength: number;

    constructor(index: number);
    get chunks(): any[]; // Replace 'any' with a more specific type if possible
    add(page: RemoteBitfieldPage): void;
    refresh(): void;
    findFirst(value: boolean, position: number): number;
    findLast(value: boolean, position: number): number;
  }

  export default class RemoteBitfield {
    static BITS_PER_PAGE = BITS_PER_PAGE;
    private _pages: BigSparseArray;
    private _segments: BigSparseArray;
    private _maxSegments: number;

    constructor();

    getBitfield(index: number): RemoteBitfieldPage | null;
    get(index: number): boolean;
    set(index: number, value: boolean): void;
    setRange(start: number, length: number, value: boolean): void;
    findFirst(value: boolean, position: number): number;
    firstSet(position: number): number;
    firstUnset(position: number): number;
    findLast(value: boolean, position: number): number;
    lastSet(position: number): number;
    lastUnset(position: number): number;
    insert(start: number, bitfield: Uint32Array): boolean;
    clear(start: number, bitfield: Uint32Array): boolean;
  }
}
