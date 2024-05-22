declare module "hypercore/lib/audit" {
  export interface Corrections {
    tree: number;
    block: number;
  }

  export async function auditCore(core: Core): Promise<Corrections>;
}
