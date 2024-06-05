// types/hypercore-crypto.d.ts

declare module "hypercore-crypto" {
  import { Buffer } from "buffer";
  export interface KeyPair {
    publicKey: Buffer;
    secretKey: Buffer;
  }

  export function keyPair(seed?: Buffer): KeyPair;
  export function validateKeyPair(keyPair: KeyPair): boolean;
  export function sign(message: Buffer, secretKey: Buffer): Buffer;
  export function verify(
    message: Buffer,
    signature: Buffer,
    publicKey: Buffer
  ): boolean;
  export function data(data: Buffer | ArrayBufferLike): Buffer;
  export function parent(a: Buffer, b: Buffer): Buffer;
  export function tree(roots: Buffer[], out?: Buffer): Buffer;
  export function hash(data: Buffer | Buffer[], out?: Buffer): Buffer;
  export function randomBytes(n: number): Buffer;
  export function discoveryKey(publicKey: Buffer): Buffer;
  export function free(secureBuf: { secure: boolean }): void;

  interface NamespaceOptions {
    name: string | Buffer;
    count?: number;
  }

  export function namespace(name: string | Buffer, count?: number): Buffer[];
  export function namespace(options: NamespaceOptions): Buffer[];
}
