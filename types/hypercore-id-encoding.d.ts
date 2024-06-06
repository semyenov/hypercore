// types/hypercore-id-encoding.d.ts

declare module "hypercore-id-encoding" {
  export function encode(key: any): string;
  export function decode(id: Buffer | string): Buffer;
  export function normalize(any: any): Buffer;
  export function isValid(any: any): boolean;
}
