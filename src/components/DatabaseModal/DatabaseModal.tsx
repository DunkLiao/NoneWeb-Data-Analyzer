import React, { useState, useEffect } from 'react';
import {
  Database,
  Server,
  FileCode,
  Play,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Save,
  Loader2,
  Sparkles,
  X,
  FolderOpen,
  Search,
  History,
  Terminal,
  ChevronDown,
} from 'lucide-react';
import type { DatabaseType, OracleConfig, DbQueryResult, QueryHistoryItem } from '../../types/database';
import {
  DEFAULT_ORACLE_CONFIG,
  getSavedOracleProfiles,
  saveOracleProfile,
  deleteOracleProfile,
  getRecentSqlitePaths,
  saveRecentSqlitePath,
  getQueryHistory,
  addQueryHistory,
} from '../../utils/dbStorage';

import { invoke, isTauri } from '@tauri-apps/api/core';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataLoaded: (result: DbQueryResult, sourceName: string) => void;
}

// Safe invoke wrapper for Tauri
async function tauriInvoke<T>(cmd: string, args?: Record<string, any>): Promise<T> {
  if (isTauri()) {
    return invoke<T>(cmd, args);
  }
  throw new Error('資料庫功能需在 NoneWeb Data Analyzer 桌面客戶端環境中執行。');
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({
  isOpen,
  onClose,
  onDataLoaded,
}) => {
  const [activeTab, setActiveTab] = useState<DatabaseType>('sqlite');

  // SQLite State
  const [sqlitePath, setSqlitePath] = useState<string>('');
  const [recentPaths, setRecentPaths] = useState<string[]>([]);

  // Oracle State
  const [oracleConfig, setOracleConfig] = useState<OracleConfig>(DEFAULT_ORACLE_CONFIG);
  const [profiles, setProfiles] = useState<OracleConfig[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [profileNameInput, setProfileNameInput] = useState<string>('');

  // Shared Query & Table State
  const [sql, setSql] = useState<string>('SELECT * FROM sqlite_master LIMIT 10;');
  const [maxRows, setMaxRows] = useState<number>(10000);
  const [tables, setTables] = useState<string[]>([]);
  const [tableSearch, setTableSearch] = useState<string>('');
  const [isLoadingTables, setIsLoadingTables] = useState<boolean>(false);

  // Status & Execution State
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [execError, setExecError] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<DbQueryResult | null>(null);

  // History
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // Load profiles and history on open
  useEffect(() => {
    if (isOpen) {
      const loadedProfiles = getSavedOracleProfiles();
      setProfiles(loadedProfiles);
      setRecentPaths(getRecentSqlitePaths());
      setHistory(getQueryHistory());
      setTestResult(null);
      setExecError(null);
    }
  }, [isOpen]);

  // Update default SQL when switching tabs
  useEffect(() => {
    setTestResult(null);
    setExecError(null);
    setTables([]);
    if (activeTab === 'sqlite') {
      if (!sql || sql.includes('DUAL') || sql.includes('FETCH FIRST')) {
        setSql('SELECT * FROM sqlite_master LIMIT 10;');
      }
    } else {
      if (!sql || sql.includes('sqlite_master')) {
        setSql('SELECT * FROM user_tables FETCH FIRST 10 ROWS ONLY;');
      }
    }
  }, [activeTab]);

  if (!isOpen) return null;

  // Handle Pick SQLite File
  const handlePickSqliteFile = async () => {
    try {
      const picked = await tauriInvoke<string | null>('cmd_pick_sqlite_file');
      if (picked) {
        setSqlitePath(picked);
        const updated = saveRecentSqlitePath(picked);
        setRecentPaths(updated);
        handleFetchTables('sqlite', picked);
      }
    } catch (err: any) {
      setExecError(`開啟檔案視窗失敗: ${err.message || err}`);
    }
  };

  // Test Connection
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setExecError(null);
    try {
      if (activeTab === 'sqlite') {
        if (!sqlitePath.trim()) {
          throw new Error('請先選擇或輸入 SQLite 資料庫檔案路徑。');
        }
        const msg = await tauriInvoke<string>('cmd_test_sqlite_connection', { path: sqlitePath.trim() });
        setTestResult({ success: true, message: msg });
        handleFetchTables('sqlite', sqlitePath.trim());
      } else {
        const msg = await tauriInvoke<string>('cmd_test_oracle_connection', {
          config: {
            ...oracleConfig,
            is_sid: oracleConfig.serviceType === 'sid',
            use_custom_string: !!oracleConfig.useCustomString,
            custom_connect_string: oracleConfig.customConnectString || null,
          },
        });
        setTestResult({ success: true, message: msg });
        handleFetchTables('oracle');
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || String(err) });
    } finally {
      setIsTesting(false);
    }
  };

  // Fetch Tables
  const handleFetchTables = async (dbType = activeTab, path = sqlitePath) => {
    setIsLoadingTables(true);
    try {
      if (dbType === 'sqlite') {
        if (!path.trim()) return;
        const list = await tauriInvoke<string[]>('cmd_list_sqlite_tables', { path: path.trim() });
        setTables(list);
      } else {
        const list = await tauriInvoke<string[]>('cmd_list_oracle_tables', {
          config: {
            ...oracleConfig,
            is_sid: oracleConfig.serviceType === 'sid',
            use_custom_string: !!oracleConfig.useCustomString,
            custom_connect_string: oracleConfig.customConnectString || null,
          },
        });
        setTables(list);
      }
    } catch (err: any) {
      console.warn('載入資料表清單失敗:', err);
    } finally {
      setIsLoadingTables(false);
    }
  };

  // Click on a table
  const handleSelectTable = (tableName: string) => {
    if (activeTab === 'sqlite') {
      setSql(`SELECT * FROM "${tableName}" LIMIT ${maxRows > 0 ? maxRows : 1000};`);
    } else {
      setSql(`SELECT * FROM "${tableName}" FETCH FIRST ${maxRows > 0 ? maxRows : 1000} ROWS ONLY;`);
    }
  };

  // Execute SQL
  const handleExecuteSql = async () => {
    if (!sql.trim()) {
      setExecError('請先輸入欲執行的 SQL 查詢語法。');
      return;
    }

    setIsExecuting(true);
    setExecError(null);
    try {
      let result: DbQueryResult;
      const target = activeTab === 'sqlite' ? sqlitePath : `${oracleConfig.host}:${oracleConfig.port}/${oracleConfig.serviceName}`;

      if (activeTab === 'sqlite') {
        if (!sqlitePath.trim()) {
          throw new Error('請先指定 SQLite 資料庫檔案路徑。');
        }
        result = await tauriInvoke<DbQueryResult>('cmd_execute_sqlite_query', {
          path: sqlitePath.trim(),
          sql: sql.trim(),
          maxRows: maxRows > 0 ? maxRows : null,
        });
      } else {
        result = await tauriInvoke<DbQueryResult>('cmd_execute_oracle_query', {
          config: {
            ...oracleConfig,
            is_sid: oracleConfig.serviceType === 'sid',
            use_custom_string: !!oracleConfig.useCustomString,
            custom_connect_string: oracleConfig.customConnectString || null,
          },
          sql: sql.trim(),
          maxRows: maxRows > 0 ? maxRows : null,
        });
      }

      setQueryResult(result);

      // Save to query history
      const updatedHistory = addQueryHistory({
        dbType: activeTab,
        target,
        sql: sql.trim(),
        rowCount: result.totalRows,
        executionTimeMs: result.executionTimeMs,
      });
      setHistory(updatedHistory);
    } catch (err: any) {
      setExecError(err.message || String(err));
      setQueryResult(null);
    } finally {
      setIsExecuting(false);
    }
  };

  // Keyboard shortcut Ctrl+Enter / Cmd+Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleExecuteSql();
    }
  };

  // Save Oracle Profile
  const handleSaveProfile = () => {
    const name = (profileNameInput || oracleConfig.name || '我的 Oracle 連線').trim();
    const updated = saveOracleProfile({
      ...oracleConfig,
      name,
    });
    setProfiles(updated);
    setProfileNameInput('');
  };

  // Delete Profile
  const handleDeleteProfile = (id?: string) => {
    if (!id) return;
    if (confirm('確定要刪除此連線設定檔嗎？')) {
      const updated = deleteOracleProfile(id);
      setProfiles(updated);
      setSelectedProfileId('');
    }
  };

  // Select Profile
  const handleSelectProfile = (id: string) => {
    setSelectedProfileId(id);
    const found = profiles.find((p) => p.id === id);
    if (found) {
      setOracleConfig(found);
    }
  };

  // Ingest data into Analyzer
  const handleLoadIntoAnalyzer = () => {
    if (!queryResult || queryResult.rows.length === 0) return;
    const sourceName =
      activeTab === 'sqlite'
        ? `sqlite://${sqlitePath.split(/[/\\]/).pop() || 'database.db'}`
        : `oracle://${oracleConfig.host}:${oracleConfig.port}/${oracleConfig.serviceName}`;

    onDataLoaded(queryResult, sourceName);
    onClose();
  };

  const filteredTables = tables.filter((t) =>
    t.toLowerCase().includes(tableSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                資料庫連線與 SQL 查詢資料源
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  SQLite & Oracle
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                執行 SQL 查詢撈取資料，一鍵轉換為資料源進行缺失值與統計分佈深度診斷
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Database Type Tab Selector */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50/30 dark:bg-slate-900/30 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('sqlite')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'sqlite'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            SQLite 本機資料庫 (.db / .sqlite)
          </button>
          <button
            onClick={() => setActiveTab('oracle')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'oracle'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4" />
            Oracle Database (純 Rust 薄驅動免安裝 Client)
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Connection Config Box */}
          {activeTab === 'sqlite' ? (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  SQLite 資料庫檔案路徑
                </label>
                {recentPaths.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span>最近開啟：</span>
                    <select
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-0.5 text-slate-700 dark:text-slate-300 max-w-[240px] truncate"
                      onChange={(e) => {
                        if (e.target.value) {
                          setSqlitePath(e.target.value);
                          handleFetchTables('sqlite', e.target.value);
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>選擇最近路徑...</option>
                      {recentPaths.map((p) => (
                        <option key={p} value={p}>
                          {p.split(/[/\\]/).pop()} ({p})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={sqlitePath}
                  onChange={(e) => setSqlitePath(e.target.value)}
                  placeholder="例如: C:\data\app.db 或 D:\project\mydb.sqlite"
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <button
                  onClick={handlePickSqliteFile}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 shrink-0 shadow-xs transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  瀏覽選擇檔案
                </button>
                <button
                  onClick={handleTestConnection}
                  disabled={isTesting || !sqlitePath.trim()}
                  className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-50"
                >
                  {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  測試連線
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
              {/* Profile selector bar */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700/60 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">連線設定檔：</span>
                  <select
                    value={selectedProfileId}
                    onChange={(e) => handleSelectProfile(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1 text-slate-700 dark:text-slate-200 text-xs"
                  >
                    <option value="">-- 自訂連線參數 --</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.host}:{p.port})
                      </option>
                    ))}
                  </select>
                  {selectedProfileId && (
                    <button
                      onClick={() => handleDeleteProfile(selectedProfileId)}
                      className="p-1 text-red-500 hover:text-red-700 dark:hover:text-red-400"
                      title="刪除此設定檔"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={profileNameInput}
                    onChange={(e) => setProfileNameInput(e.target.value)}
                    placeholder="設定檔名稱 (如: 測試庫 XE)"
                    className="px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 w-44"
                  />
                  <button
                    onClick={handleSaveProfile}
                    className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 flex items-center gap-1 font-medium transition-colors"
                  >
                    <Save className="w-3 h-3" />
                    儲存設定檔
                  </button>
                </div>
              </div>

              {/* Oracle Connection Inputs */}
              {!oracleConfig.useCustomString ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">主機位置 (Host / IP)</label>
                    <input
                      type="text"
                      value={oracleConfig.host}
                      onChange={(e) => setOracleConfig({ ...oracleConfig, host: e.target.value })}
                      placeholder="localhost 或 192.168.1.100"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">通訊埠 (Port)</label>
                    <input
                      type="number"
                      value={oracleConfig.port}
                      onChange={(e) => setOracleConfig({ ...oracleConfig, port: parseInt(e.target.value) || 1521 })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      服務型態 & 名稱 ({oracleConfig.serviceType === 'service_name' ? 'Service Name' : 'SID'})
                    </label>
                    <div className="flex gap-1">
                      <select
                        value={oracleConfig.serviceType}
                        onChange={(e) => setOracleConfig({ ...oracleConfig, serviceType: e.target.value as any })}
                        className="px-1.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px]"
                      >
                        <option value="service_name">Service</option>
                        <option value="sid">SID</option>
                      </select>
                      <input
                        type="text"
                        value={oracleConfig.serviceName}
                        onChange={(e) => setOracleConfig({ ...oracleConfig, serviceName: e.target.value })}
                        placeholder="ORCL / XE"
                        className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">使用者名稱 (User)</label>
                    <input
                      type="text"
                      value={oracleConfig.username}
                      onChange={(e) => setOracleConfig({ ...oracleConfig, username: e.target.value })}
                      placeholder="system / scott"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">密碼 (Password)</label>
                    <input
                      type="password"
                      value={oracleConfig.password || ''}
                      onChange={(e) => setOracleConfig({ ...oracleConfig, password: e.target.value })}
                      placeholder="輸入密碼"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                    />
                  </div>
                  <div className="flex items-center gap-4 md:col-span-2 pt-4">
                    <label className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={oracleConfig.rememberPassword ?? true}
                        onChange={(e) => setOracleConfig({ ...oracleConfig, rememberPassword: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      記住密碼
                    </label>
                    <button
                      type="button"
                      onClick={() => setOracleConfig({ ...oracleConfig, useCustomString: true })}
                      className="text-blue-600 dark:text-blue-400 hover:underline text-[11px]"
                    >
                      切換自訂連線字串 (Easy Connect / TNS)
                    </button>
                    <button
                      onClick={handleTestConnection}
                      disabled={isTesting || !oracleConfig.host || !oracleConfig.username}
                      className="ml-auto px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                    >
                      {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      測試連線
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium text-slate-500">
                      Easy Connect 連線字串 (例如: localhost:1521/ORCL 或 //dbhost:1521/service_name)
                    </label>
                    <button
                      type="button"
                      onClick={() => setOracleConfig({ ...oracleConfig, useCustomString: false })}
                      className="text-blue-600 dark:text-blue-400 hover:underline text-[11px]"
                    >
                      切換標準參數模式
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={oracleConfig.customConnectString || ''}
                      onChange={(e) => setOracleConfig({ ...oracleConfig, customConnectString: e.target.value })}
                      placeholder="host:1521/service_name"
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                    />
                    <input
                      type="text"
                      value={oracleConfig.username}
                      onChange={(e) => setOracleConfig({ ...oracleConfig, username: e.target.value })}
                      placeholder="帳號"
                      className="w-28 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                    />
                    <input
                      type="password"
                      value={oracleConfig.password || ''}
                      onChange={(e) => setOracleConfig({ ...oracleConfig, password: e.target.value })}
                      placeholder="密碼"
                      className="w-28 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                    />
                    <button
                      onClick={handleTestConnection}
                      disabled={isTesting}
                      className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                    >
                      {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      測試
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Test Status Banner */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in ${
                testResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <span className="flex-1 font-mono break-all">{testResult.message}</span>
            </div>
          )}

          {/* Query & Table Section */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Table Browser Drawer */}
            <div className="lg:col-span-1 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col max-h-72">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-blue-500" />
                  資料表清單 ({tables.length})
                </span>
                <button
                  onClick={() => handleFetchTables()}
                  disabled={isLoadingTables}
                  className="p-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded"
                  title="重新整理清單"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingTables ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {tables.length > 0 && (
                <div className="relative mb-2">
                  <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="過濾表名..."
                    className="w-full pl-7 pr-2 py-1 text-[11px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              )}

              <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar text-xs">
                {tables.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-6">
                    {isLoadingTables ? '讀取資料表中...' : '尚未連線或未發現資料表'}
                  </p>
                ) : filteredTables.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-4">無符合的表格</p>
                ) : (
                  filteredTables.map((t) => (
                    <button
                      key={t}
                      onClick={() => handleSelectTable(t)}
                      className="w-full text-left px-2 py-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-mono text-[11px] truncate transition-colors flex items-center justify-between group"
                      title={`點選自動填入查詢: SELECT * FROM "${t}"`}
                    >
                      <span className="truncate">{t}</span>
                      <ChevronDown className="w-3 h-3 opacity-0 group-hover:opacity-100 -rotate-90 text-blue-500 shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* SQL Editor Area */}
            <div className="lg:col-span-3 space-y-2 flex flex-col">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-blue-500" />
                  <span className="font-bold text-slate-700 dark:text-slate-300">SQL 查詢語法</span>
                  <span className="text-[10px] text-slate-400">(快捷鍵: Ctrl + Enter 執行)</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700"
                  >
                    <History className="w-3 h-3" />
                    歷史記錄 ({history.length})
                  </button>

                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <span>上限：</span>
                    <select
                      value={maxRows}
                      onChange={(e) => setMaxRows(Number(e.target.value))}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-slate-700 dark:text-slate-300"
                    >
                      <option value={1000}>1,000 筆</option>
                      <option value={5000}>5,000 筆</option>
                      <option value={10000}>10,000 筆 (建議)</option>
                      <option value={50000}>50,000 筆</option>
                      <option value={0}>無限制 (注意記憶體)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* History dropdown */}
              {showHistory && history.length > 0 && (
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 max-h-40 overflow-y-auto space-y-1 text-xs">
                  {history.map((h) => (
                    <div
                      key={h.id}
                      onClick={() => {
                        setSql(h.sql);
                        setShowHistory(false);
                      }}
                      className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between font-mono text-[11px] text-slate-600 dark:text-slate-300"
                    >
                      <span className="truncate flex-1">{h.sql}</span>
                      <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                        {h.rowCount ? `${h.rowCount} 筆` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Textarea */}
              <div className="relative">
                <textarea
                  value={sql}
                  onChange={(e) => setSql(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={6}
                  placeholder="輸入 SELECT 查詢語法..."
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 leading-relaxed custom-scrollbar"
                />
              </div>

              {/* Snippet Badges & Execute Button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-slate-400">快速範本:</span>
                  <button
                    onClick={() => setSql(activeTab === 'sqlite' ? 'SELECT * FROM [table] LIMIT 100;' : 'SELECT * FROM [table] FETCH FIRST 100 ROWS ONLY;')}
                    className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono text-[10px]"
                  >
                    SELECT *
                  </button>
                  <button
                    onClick={() => setSql('SELECT COUNT(*) AS total_count FROM [table];')}
                    className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono text-[10px]"
                  >
                    COUNT(*)
                  </button>
                </div>

                <button
                  onClick={handleExecuteSql}
                  disabled={isExecuting || !sql.trim()}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
                  執行查詢 (Execute)
                </button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {execError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-mono break-all whitespace-pre-wrap">{execError}</div>
            </div>
          )}

          {/* Query Result Preview */}
          {queryResult && (
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    查詢成功
                  </div>
                  <span className="text-slate-400">|</span>
                  <div className="flex items-center gap-1 text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    耗時: <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{queryResult.executionTimeMs} ms</span>
                  </div>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-600 dark:text-slate-300">
                    總計: <strong className="font-mono text-blue-600 dark:text-blue-400">{queryResult.totalRows.toLocaleString()}</strong> 筆資料，
                    <strong className="font-mono">{queryResult.columns.length}</strong> 個欄位
                  </span>
                  {queryResult.truncated && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px]">
                      已達查詢上限 ({maxRows.toLocaleString()} 筆)
                    </span>
                  )}
                </div>

                <button
                  onClick={handleLoadIntoAnalyzer}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  載入至分析器 (進行診斷分析)
                </button>
              </div>

              {/* Mini Table Preview */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto max-h-56 custom-scrollbar bg-white dark:bg-slate-950 shadow-xs">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800/90 backdrop-blur-xs border-b border-slate-200 dark:border-slate-700 z-10">
                    <tr>
                      <th className="py-2 px-3 text-[10px] text-slate-400 font-medium w-12 text-center">#</th>
                      {queryResult.columns.map((col) => (
                        <th key={col} className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {queryResult.rows.slice(0, 15).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="py-1.5 px-3 text-[10px] text-slate-400 text-center">{idx + 1}</td>
                        {queryResult.columns.map((col) => {
                          const val = row[col];
                          const isNull = val === null || val === undefined;
                          return (
                            <td
                              key={col}
                              className={`py-1.5 px-3 whitespace-nowrap text-xs ${
                                isNull
                                  ? 'text-rose-400/80 italic font-sans'
                                  : typeof val === 'number'
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {isNull ? '<NULL>' : String(val)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {queryResult.totalRows > 15 && (
                <p className="text-[11px] text-slate-400 text-right">
                  * 僅預覽前 15 筆，點選「載入至分析器」即可在原始資料視窗檢視全量 {queryResult.totalRows.toLocaleString()} 筆並進行完整統計分析
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 text-xs">
          <span className="text-[11px] text-slate-500">
            {activeTab === 'sqlite'
              ? 'SQLite 採用內嵌式輕量引擎，支援各類本機 .db 與 .sqlite 檔案'
              : 'Oracle 採用官方純 Rust Thin 驅動，直連 TCP 通訊埠 (免裝 Instant Client)'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors"
            >
              取消 / 關閉
            </button>
            {queryResult && queryResult.rows.length > 0 && (
              <button
                onClick={handleLoadIntoAnalyzer}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                載入至分析器
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
