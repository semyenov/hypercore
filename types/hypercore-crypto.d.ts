// hypercore-crypto.d.ts

declare module "hypercore-crypto" {
  export interface KeyPair {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
  }

  export function keyPair(seed?: Uint8Array): KeyPair;
  export function validateKeyPair(keyPair: KeyPair): boolean;
  export function sign(message: Uint8Array, secretKey: Uint8Array): Uint8Array;
  export function verify(
    message: Uint8Array,
    signature: Uint8Array,
    publicKey: Uint8Array
  ): boolean;
  export function data(data: Uint8Array | ArrayBufferLike): Uint8Array;
  export function parent(a: Uint8Array, b: Uint8Array): Uint8Array;
  export function tree(roots: Uint8Array[], out?: Uint8Array): Uint8Array;
  export function hash(
    data: Uint8Array | Uint8Array[],
    out?: Uint8Array
  ): Uint8Array;
  export function randomBytes(n: number): Uint8Array;
  export function discoveryKey(publicKey: Uint8Array): Uint8Array;
  export function free(secureBuf: { secure: boolean }): void;

  interface NamespaceOptions {
    name: string | Uint8Array;
    count?: number;
  }

  export function namespace(options: NamespaceOptions): Uint8Array[];
}
