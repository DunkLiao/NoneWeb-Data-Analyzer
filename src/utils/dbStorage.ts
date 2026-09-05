import type { OracleConfig, QueryHistoryItem } from '../types/database';

const ORACLE_PROFILES_KEY = 'noneweb_oracle_profiles';
const SQLITE_RECENT_PATHS_KEY = 'noneweb_sqlite_recent_paths';
const QUERY_HISTORY_KEY = 'noneweb_query_history';

// Default default Oracle profile
export const DEFAULT_ORACLE_CONFIG: OracleConfig = {
  name: '預設連線',
  host: 'localhost',
  port: 1521,
  serviceType: 'service_name',
  serviceName: 'ORCL',
  username: 'system',
  password: '',
  rememberPassword: true,
  useCustomString: false,
  customConnectString: '',
};

export function getSavedOracleProfiles(): OracleConfig[] {
  try {
    const raw = localStorage.getItem(ORACLE_PROFILES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OracleConfig[];
  } catch (err) {
    console.warn('Failed to load Oracle profiles:', err);
    return [];
  }
}

export function saveOracleProfile(profile: OracleConfig): OracleConfig[] {
  try {
    const profiles = getSavedOracleProfiles();
    const id = profile.id || Date.now().toString();
    const toSave: OracleConfig = {
      ...profile,
      id,
      password: profile.rememberPassword ? profile.password : '',
    };

    const existingIndex = profiles.findIndex((p) => p.id === id || p.name === profile.name);
    if (existingIndex >= 0) {
      profiles[existingIndex] = toSave;
    } else {
      profiles.push(toSave);
    }

    localStorage.setItem(ORACLE_PROFILES_KEY, JSON.stringify(profiles));
    return profiles;
  } catch (err) {
    console.warn('Failed to save Oracle profile:', err);
    return [];
  }
}

export function deleteOracleProfile(id: string): OracleConfig[] {
  try {
    const profiles = getSavedOracleProfiles().filter((p) => p.id !== id);
    localStorage.setItem(ORACLE_PROFILES_KEY, JSON.stringify(profiles));
    return profiles;
  } catch (err) {
    console.warn('Failed to delete Oracle profile:', err);
    return [];
  }
}

export function getRecentSqlitePaths(): string[] {
  try {
    const raw = localStorage.getItem(SQLITE_RECENT_PATHS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function saveRecentSqlitePath(path: string): string[] {
  try {
    if (!path.trim()) return getRecentSqlitePaths();
    let paths = getRecentSqlitePaths().filter((p) => p !== path);
    paths.unshift(path);
    if (paths.length > 5) paths = paths.slice(0, 5);
    localStorage.setItem(SQLITE_RECENT_PATHS_KEY, JSON.stringify(paths));
    return paths;
  } catch {
    return [];
  }
}

export function getQueryHistory(): QueryHistoryItem[] {
  try {
    const raw = localStorage.getItem(QUERY_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueryHistoryItem[];
  } catch {
    return [];
  }
}

export function addQueryHistory(item: Omit<QueryHistoryItem, 'id' | 'timestamp'>): QueryHistoryItem[] {
  try {
    let history = getQueryHistory();
    const newItem: QueryHistoryItem = {
      ...item,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };
    // Avoid duplicate continuous queries
    if (history[0]?.sql === item.sql && history[0]?.target === item.target) {
      return history;
    }
    history.unshift(newItem);
    if (history.length > 20) history = history.slice(0, 20);
    localStorage.setItem(QUERY_HISTORY_KEY, JSON.stringify(history));
    return history;
  } catch {
    return [];
  }
}
