// types/z32.d.ts

declare module "z32" {
  import { Buffer } from "buffer";

  const ALPHABET: string;
  const MIN: number;
  const MAX: number;

  interface QuintetResult {
    bits: number;
  }

  function quintet(s: string, i: number): QuintetResult;

  function encode(buf: Buffer | string): string;
  function decode(s: string, out?: Buffer): Buffer;

  export default {
    encode,
    decode,
    ALPHABET,
  };
}
