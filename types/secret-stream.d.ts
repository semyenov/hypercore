// types/secret-stream.d.ts

declare module "@hyperswarm/secret-stream" {
  import { Buffer } from "buffer";
  import { Duplex } from "streamx";
  import { KeyPair } from "hypercore-crypto";

  export interface HandshakeResult {
    data: Buffer | null;
    remotePublicKey: Buffer | null;
    hash: Buffer | null;
    tx: Buffer | null;
    rx: Buffer | null;
  }

  export interface StreamOptions {
    publicKey?: Buffer;
    remotePublicKey?: Buffer;
    keepAlive?: number;
    autoStart?: boolean;
    handshake?: HandshakeResult;
    keyPair?: KeyPair | Promise<KeyPair>;
    pattern?: string;
    data?: Buffer;
    ended?: boolean;
  }

  export class Handshake {
    constructor(
      isInitiator: boolean,
      keyPair: KeyPair,
      remotePublicKey: Buffer | null,
      pattern: string
    );

    static keyPair(seed?: Buffer): KeyPair;

    recv(data: Buffer): HandshakeResult | null;
    send(): HandshakeResult | null;
    destroy(): void;
    destroyed: boolean;
  }

  export class ReversePassThrough extends Duplex {
    constructor(stream: Duplex);

    _write(data: Buffer, cb: (error: Error | null) => void): void;
    _final(cb: (error: Error | null) => void): void;
    _read(cb: (error: Error | null) => void): void;
  }

  export class Bridge extends Duplex {
    constructor(noiseStream: Duplex);

    flush(): Promise<boolean>;

    readonly publicKey: Buffer;
    readonly remotePublicKey: Buffer;
    readonly handshakeHash: Buffer;
    readonly reverse: ReversePassThrough;
  }

  export default class NoiseSecretStream extends Duplex {
    constructor(isInitiator: boolean, rawStream: Duplex, opts?: StreamOptions);

    static keyPair(seed?: Buffer): KeyPair;
    static id(handshakeHash: Buffer, isInitiator: boolean, id?: Buffer): Buffer;

    setTimeout(ms: number): void;
    setKeepAlive(ms: number): void;
    start(rawStream: Duplex, opts?: StreamOptions): void;
    flush(): Promise<boolean>;

    alloc(len: number): Buffer;

    readonly publicKey: Buffer | null;
    readonly remotePublicKey: Buffer | null;
    readonly handshakeHash: Buffer | null;
    readonly connected: boolean;
    readonly isInitiator: boolean;
    readonly keepAlive: number;
    readonly timeout: number;
    readonly userData: any;
  }

  export function writeUint24le(n: number, buf: Buffer): void;
  export function streamId(
    handshakeHash: Buffer,
    isInitiator: boolean,
    out?: Buffer
  ): Buffer;
}
