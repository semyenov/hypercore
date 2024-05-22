declare module "hypercore/lib/block-encryption" {
  import { Buffer } from "buffer";

  interface BlockEncryptionOptions {
    isBlockKey?: boolean;
    compat?: boolean;
  }

  export default class BlockEncryption {
    key: Buffer;
    blockKey: Buffer;
    blindingKey: Buffer;
    padding: number;
    compat: boolean;
    isBlockKey: boolean;

    constructor(
      encryptionKey: Buffer,
      hypercoreKey: Buffer,
      options?: BlockEncryptionOptions
    );

    encrypt(index: number, block: Buffer, fork: number): void;
    decrypt(index: number, block: Buffer): void;
  }
}
