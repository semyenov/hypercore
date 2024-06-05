// protomux.d.ts

declare module "protomux" {
  import { Codec, State } from "compact-encoding";
  import { Duplex } from "streamx";

  interface MessageOptions<T = any> {
    encoding?: Codec<T>;
    onmessage?: (msg: T, session: Channel) => void | Promise<void>;
  }

  interface Message<T = any> {
    type: number;
    encoding: Codec<T>;
    onmessage: (msg: T, session: Channel) => void | Promise<void>;
    recv: (state: State, session: Channel) => null | Promise<void>; // state?
    send: (msg: T, session?: Channel) => boolean;
  }

  interface ChannelOptions {
    userData?: Duplex | null;
    protocol: string;
    aliases?: string[];
    id?: Buffer | null;
    unique?: boolean;
    handshake?: Codec;
    messages?: MessageOptions[];
    onopen?: (handshake: any, channel: Channel) => void | Promise<void>;
    onclose?: (isRemote: boolean, channel: Channel) => void | Promise<void>;
    ondestroy?: (channel: Channel) => void | Promise<void>;
    ondrain?: (channel: Channel) => void | Promise<void>;
  }

  interface PairOptions {
    protocol: string;
    id?: Buffer | null;
  }

  interface AllocFunction {
    (size: number): Buffer;
  }

  interface ChannelInfo {
    key: string;
    protocol: string;
    aliases: string[];
    id: Buffer | null;
    pairing: number;
    opened: number;
    incoming: number[];
    outgoing: number[];
  }

  export class Channel {
    userData: Duplex | null;
    protocol: string;
    aliases: string[];
    id: Buffer | null;
    handshake: any;
    messages: Message[];
    opened: boolean;
    closed: boolean;
    destroyed: boolean;
    onopen: (handshake: any, channel: Channel) => void | Promise<void>;
    onclose: (isRemote: boolean, channel: Channel) => void | Promise<void>;
    ondestroy: (channel: Channel) => void | Promise<void>;
    ondrain: (channel: Channel) => void | Promise<void>;

    constructor(
      mux: Protomux,
      info: ChannelInfo,
      userData: Duplex | null,
      protocol: string,
      aliases: string[],
      id: Buffer | null,
      handshake: Codec,
      messages: MessageOptions[],
      onopen: (handshake: any, channel: Channel) => void | Promise<void>,
      onclose: (isRemote: boolean, channel: Channel) => void | Promise<void>,
      ondestroy: (channel: Channel) => void | Promise<void>,
      ondrain: (channel: Channel) => void | Promise<void>
    );

    get drained(): boolean;

    *[Symbol.iterator](): Iterator<Channel>;

    open(handshake?: any): void;
    cork(): void;
    uncork(): void;
    close(): void;
    addMessage<T>(opts: MessageOptions<T>): Message<T>;
  }

  class Protomux<S extends Duplex = Duplex> {
    isProtomux: boolean;
    stream: S;
    corked: number;
    drained: boolean;

    constructor(stream: S, opts?: { alloc?: AllocFunction });

    *[Symbol.iterator](): Iterator<Channel>;

    cork(): void;
    uncork(): void;

    pair(
      opts: PairOptions,
      notify: (id: Buffer | null) => void | Promise<void>
    ): void;
    unpair(opts: PairOptions): void;
    opened(opts: PairOptions): boolean;
    createChannel(opts: ChannelOptions): Channel;
    destroy(err?: Error): void;

    static from(stream: Duplex, opts?: { alloc?: AllocFunction }): Protomux;
    static isProtomux(mux: any): mux is Protomux;
  }

  export = Protomux;
}
