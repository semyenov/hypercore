// udx.d.ts
declare module 'udx-native' {
  import { EventEmitter } from 'events'
  import { Duplex } from 'streamx'
  import { Buffer } from 'buffer'

  export default class UDX {
    constructor()

    static isIPv4(host: string): boolean
    static isIPv6(host: string): boolean
    static isIP(host: string): 0 | 4 | 6

    createSocket(opts?: UDXSocketOptions): UDXSocket
    createStream(id: number, opts?: UDXStreamOptions): UDXStream

    networkInterfaces(): NetworkInterface[]
    watchNetworkInterfaces(onchange?: (interfaces: NetworkInterface[]) => void): NetworkInterfaces

    lookup(host: string, opts?: LookupOptions): Promise<LookupResult>
  }

  export interface UDXSocketOptions {
    ipv6Only?: boolean
  }

  export interface UDXSocketEvents {
    on(event: 'message', listener: (buffer: Buffer, info: { host: string; family: number; port: number }) => void): this
    on(event: 'close', listener: () => void): this
    on(event: 'listening', listener: () => void): this
    on(event: 'idle', listener: () => void): this
    on(event: 'busy', listener: () => void): this
  }

  export class UDXSocket extends EventEmitter implements UDXSocketEvents {
    udx: UDX
    userData: any
    streams: Set<UDXStream>

    constructor(udx: UDX, opts?: UDXSocketOptions)

    get bound(): boolean
    get closing(): boolean
    get idle(): boolean
    get busy(): boolean

    address(): { host: string; family: number; port: number } | null
    bind(port: number, host?: string): void
    close(): Promise<void>

    setTTL(ttl: number): void
    getRecvBufferSize(): number
    setRecvBufferSize(size: number): void
    getSendBufferSize(): number
    setSendBufferSize(size: number): void

    send(buffer: Buffer, port: number, host?: string, ttl?: number): Promise<boolean>
    trySend(buffer: Buffer, port: number, host?: string, ttl?: number): void
  }

  export interface UDXStreamOptions {
    firewall?: FirewallFunction
    framed?: boolean
    seq?: number
    ack?: number
  }

  export type FirewallFunction = (socket: UDXSocket, port: number, host: string) => boolean

  interface UDXStreamEvents {
    on(event: 'connect', listener: () => void): this
    on(event: 'close', listener: (err?: Error) => void): this
    on(event: 'message', listener: (buffer: Buffer) => void): this
    on(event: 'remote-changed', listener: () => void): this
    on(event: 'idle', listener: () => void): this
    on(event: 'busy', listener: () => void): this
  }

  export class UDXStream extends Duplex implements UDXStreamEvents {
    udx: UDX
    socket: UDXSocket | null
    userData: any

    id: number
    remoteId: number
    remoteHost: string
    remoteFamily: number
    remotePort: number

    constructor(udx: UDX, id: number, opts?: UDXStreamOptions)

    get connected(): boolean
    get mtu(): number
    get rtt(): number
    get cwnd(): number
    get inflight(): number
    get localHost(): string | null
    get localFamily(): number
    get localPort(): number

    setInteractive(bool: boolean): void
    connect(socket: UDXSocket, remoteId: number, port: number, host?: string | UDXStreamOptions, opts?: UDXStreamOptions): void
    changeRemote(socket: UDXSocket, remoteId: number, port: number, host: string): Promise<void>
    relayTo(destination: UDXStream): void
    send(buffer: Buffer): Promise<boolean>
    trySend(buffer: Buffer): void
    flush(): Promise<boolean>

    toJSON(): UDXStreamInfo
  }

  export interface UDXStreamInfo {
    id: number
    connected: boolean
    destroying: boolean
    destroyed: boolean
    remoteId: number
    remoteHost: string
    remoteFamily: number
    remotePort: number
    mtu: number
    rtt: number
    cwnd: number
    inflight: number
    socket: UDXSocketInfo | null
  }

  export interface UDXSocketInfo {
    bound: boolean
    closing: boolean
    streams: number
    address: { host: string; family: number; port: number }
    ipv6Only: boolean
    idle: boolean
    busy: boolean
  }

  export interface NetworkInterface {
    name: string
    address: string
    netmask: string
    family: 'IPv4' | 'IPv6'
    mac: string
    internal: boolean
    cidr: string
  }

  export interface NetworkInterfacesEvents {
    on(event: 'change', listener: (interfaces: NetworkInterface[]) => void): this
    on(event: 'close', listener: () => void): this
  }

  export class NetworkInterfaces extends EventEmitter implements NetworkInterfacesEvents {
    interfaces: NetworkInterface[]

    watch(): this
    unwatch(): this
    destroy(): Promise<this>
  }

  export interface LookupOptions {
    family?: number
  }

  export interface LookupResult {
    host: string
    family: number
  }

  export = UDX
}
