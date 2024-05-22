// types/quickbit-native.d.ts

declare module "quickbit" {
  export interface QuickbitField {
    byteLength: number;
  }

  export class QuickbitIndex {
    byteLength: number;
    handle: number;
    skipFirst(value: boolean, position?: number): number;
    skipLast(value: boolean, position?: number): number;
  }

  export class DenseIndex extends QuickbitIndex {
    constructor(field: QuickbitField);
    update(bit: number): boolean;
  }

  export class SparseIndex extends QuickbitIndex {
    constructor(chunks: any[], byteLength?: number);
    update(bit: number): boolean;
  }

  namespace quickbit {
    export function get(field: QuickbitField, bit: number): boolean;
    export function set(
      field: QuickbitField,
      bit: number,
      value?: boolean
    ): boolean;
    export function fill(
      field: QuickbitField,
      value: boolean,
      start?: number,
      end?: number
    ): QuickbitField;
    export function clear(field: QuickbitField, ...chunks: any[]): void;
    export function findFirst(
      field: QuickbitField,
      value: boolean,
      position?: number
    ): number;
    export function findLast(
      field: QuickbitField,
      value: boolean,
      position?: number
    ): number;
  }

  export default quickbit;
}
