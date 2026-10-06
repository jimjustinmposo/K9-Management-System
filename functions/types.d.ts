interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = any>(column?: string): Promise<T | null>;
  all<T = any>(): Promise<{ results: T[]; success: boolean }>;
  run(): Promise<{ success: boolean; meta?: any }>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface PagesFunctionContext<E = any> {
  request: Request;
  env: E;
  params: Record<string, string | string[]>;
  waitUntil(promise: Promise<any>): void;
}

type PagesFunction<E = any> = (
  context: PagesFunctionContext<E>,
) => Response | Promise<Response>;
