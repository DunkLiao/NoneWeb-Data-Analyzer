export type DatabaseType = 'sqlite' | 'oracle';

export interface OracleConfig {
  id?: string;
  name: string; // e.g. "生產庫唯讀", "本地測試環境"
  host: string;
  port: number;
  serviceType: 'service_name' | 'sid';
  serviceName: string;
  username: string;
  password?: string;
  rememberPassword?: boolean;
  useCustomString?: boolean;
  customConnectString?: string;
}

export interface SqliteConfig {
  filePath: string;
}

export interface DbQueryResult {
  columns: string[];
  rows: Record<string, any>[];
  totalRows: number;
  executionTimeMs: number;
  truncated: boolean;
}

export interface QueryHistoryItem {
  id: string;
  dbType: DatabaseType;
  target: string; // e.g. "my_data.db" or "localhost:1521/ORCL"
  sql: string;
  timestamp: number;
  rowCount?: number;
  executionTimeMs?: number;
}
