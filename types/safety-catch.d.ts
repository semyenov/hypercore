// safety-catch.d.ts
declare module "safety-catch" {
  export function safetyCatch(err: Error | null): void;
  export function isActuallyUncaught(err: Error | null): boolean;
  export function throwErrorNT(err: Error | null): void;

  export = safetyCatch;
}
