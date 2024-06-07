declare module 'test-tmp' {
  interface TmpOptions {
    name?: string;
    order?: number;
  }

  export async function tmp(t?: any, options?: TmpOptions): Promise<string>;
  export = tmp
}