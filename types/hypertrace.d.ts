// types/hypertrace.d.ts

declare module "hypertrace" {
  export default class Hypertrace {
    enabled: boolean;
    ctx: any;
    className: string;
    props: Object | null;
    parentObject: Object | null;
    objectId: number;

    setParent(parentTracer: Hypertrace | null): void;
    trace(id: string | null, props?: Object): void;
  }

  export function setTraceFunction(fn: (...args: any[]) => void): void;
  export function clearTraceFunction(): void;
  export function createTracer(ctx: any, opts?: Object): Hypertrace;
}
