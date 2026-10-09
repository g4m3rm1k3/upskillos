declare module "sql.js" {
  export default function initSqlJs(options?: { locateFile?: (file: string) => string; wasmBinary?: Uint8Array }): Promise<any>;
}
