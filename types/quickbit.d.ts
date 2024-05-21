// quickbit-native.d.ts

declare module "quickbit" {
  export interface Field {
    byteLength: number;
  }

  export interface Index {
    byteLength: number;
    handle: number;
    skipFirst(value: boolean, position?: number): number;
    skipLast(value: boolean, position?: number): number;
  }

  export class DenseIndex extends Index {
    constructor(field: Field);
    update(bit: number): boolean;
  }

  export class SparseIndex extends Index {
    constructor(chunks: any[], byteLength?: number);
    update(bit: number): boolean;
  }

  export function get(field: Field, bit: number): boolean;
  export function set(field: Field, bit: number, value?: boolean): boolean;
  export function fill(
    field: Field,
    value: boolean,
    start?: number,
    end?: number
  ): Field;
  export function clear(field: Field, ...chunks: any[]): void;
  export function findFirst(
    field: Field,
    value: boolean,
    position?: number
  ): number;
  export function findLast(
    field: Field,
    value: boolean,
    position?: number
  ): number;
}
