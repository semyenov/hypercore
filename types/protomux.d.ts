// protomux.d.ts

declare module "protomux" {
  import { Duplex } from "streamx";

  interface MessageOptions {
    encoding?: any;
    onmessage?: (msg: any, session: Channel) => void | Promise<void>;
  }

  interface ChannelOptions {
    userData?: any;
    protocol: string;
    aliases?: string[];
    id?: Buffer | null;
    unique?: boolean;
    handshake?: any;
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

  class Channel {
    userData: any;
    protocol: string;
    aliases: string[];
    id: Buffer | null;
    handshake: any;
    messages: any[];
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
      userData: any,
      protocol: string,
      aliases: string[],
      id: Buffer | null,
      handshake: any,
      messages: any[],
      onopen: (handshake: any, channel: Channel) => void | Promise<void>,
      onclose: (isRemote: boolean, channel: Channel) => void | Promise<void>,
      ondestroy: (channel: Channel) => void | Promise<void>,
      ondrain: (channel: Channel) => void | Promise<void>
    );

    get drained(): boolean;

    *[Symbol.iterator](): Iterator<Channel>;

    open(handshake: any): void;
    cork(): void;
    uncork(): void;
    close(): void;
    addMessage(opts: MessageOptions): any;
  }

  export default class Protomux {
    isProtomux: boolean;
    stream: Duplex;
    corked: number;
    drained: boolean;

    constructor(stream: Duplex, opts?: { alloc?: AllocFunction });

    static from(stream: Duplex, opts?: { alloc?: AllocFunction }): Protomux;
    static isProtomux(mux: any): mux is Protomux;

    cork(): void;
    uncork(): void;
    pair(
      opts: PairOptions,
      notify: (id: Buffer | null) => void | Promise<void>
    ): void;
    unpair(opts: PairOptions): void;
    opened(opts: PairOptions): boolean;
    createChannel(opts: ChannelOptions): Channel | null;
    destroy(err?: Error): void;
  }
}
