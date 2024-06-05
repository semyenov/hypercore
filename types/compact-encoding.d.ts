// types/compact-encoding.d.ts

declare module "compact-encoding" {
  import { Buffer } from "buffer";

  export function state(
    start?: number,
    end?: number,
    buffer?: Buffer | null
  ): State;

  export const raw: Codec;
  export const uint: Codec<number>;
  export const uint8: Codec<number>;
  export const uint16: Codec<number>;
  export const uint24: Codec<number>;
  export const uint32: Codec<number>;
  export const uint40: Codec<number>;
  export const uint48: Codec<number>;
  export const uint56: Codec<number>;
  export const uint64: Codec<number>;
  export const int: Codec<number>;
  export const int8: Codec<number>;
  export const int16: Codec<number>;
  export const int24: Codec<number>;
  export const int32: Codec<number>;
  export const int40: Codec<number>;
  export const int48: Codec<number>;
  export const int56: Codec<number>;
  export const int64: Codec<number>;
  export const biguint64: Codec<number>;
  export const bigint64: Codec<number>;
  export const biguint: Codec<number>;
  export const bigint: Codec<number>;
  export const lexint: Codec<number>;
  export const float32: Codec<number>;
  export const float64: Codec<number>;
  export const buffer: Codec<Buffer | null>;
  export const binary: Codec<string | Buffer | null>;
  export const arraybuffer: Codec<ArrayBuffer>;
  export const uint8array: Codec<Buffer>;
  export const uint16array: Codec<Uint16Array>;
  export const uint32array: Codec<Uint32Array>;
  export const int8array: Codec<Int8Array>;
  export const int16array: Codec<Int16Array>;
  export const int32array: Codec<Int32Array>;
  export const biguint64array: Codec<BigUint64Array>;
  export const bigint64array: Codec<BigInt64Array>;
  export const float32array: Codec<Float32Array>;
  export const float64array: Codec<Float64Array>;
  export const string: StringCodec;
  export const utf8: StringCodec;
  export const ascii: StringCodec;
  export const hex: StringCodec;
  export const base64: StringCodec;
  export const ucs2: StringCodec;
  export const utf16le: StringCodec;
  export const bool: Codec<boolean>;
  export const fixed: (n: number) => Codec<Buffer>;
  export const fixed32: Codec<Buffer>;
  export const fixed64: Codec<Buffer>;
  export const array: <T>(enc: Codec<T>) => Codec<T[]>;
  export const frame: <T>(enc: Codec<T>) => Codec<T>;
  export const json: Codec<string, any>;
  export const ndjson: Codec<string, any>;
  export const none: Codec<null>;
  export const any: Codec<any>;
  export function from(enc: any): Codec<any>;
  export function encode<T>(enc: Codec<T>, m: T): Buffer;
  export function decode<T>(enc: Codec<T>, buffer: Buffer): T;

  export interface State {
    start: number;
    end: number;
    buffer: Buffer | null;
    cache?: any;
  }

  export interface Codec<T = any, O = T> {
    preencode(state: State, value: T): void;
    encode(state: State, value: T): void;
    decode(state: State): O;
  }

  export interface StringCodec extends Codec<string> {
    fixed(n: number): Codec<string>;
  }
}
