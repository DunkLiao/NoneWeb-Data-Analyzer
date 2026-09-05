use rfd::FileDialog;
use rusqlite::{types::ValueRef, Connection, OpenFlags};
use serde::{Deserialize, Serialize};
use std::time::Instant;

#[derive(Debug, Serialize, Deserialize)]
pub struct DbQueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<serde_json::Map<String, serde_json::Value>>,
    pub total_rows: usize,
    pub execution_time_ms: u64,
    pub truncated: bool,
}

pub fn pick_sqlite_file() -> Result<Option<String>, String> {
    let dialog = FileDialog::new()
        .add_filter("SQLite 資料庫 (*.db, *.sqlite, *.sqlite3)", &["db", "sqlite", "sqlite3"])
        .add_filter("所有檔案 (*.*)", &["*"]);

    if let Some(path) = dialog.pick_file() {
        Ok(Some(path.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

pub fn test_sqlite_connection(path: &str) -> Result<String, String> {
    if !std::path::Path::new(path).exists() {
        return Err(format!("找不到檔案: {}", path));
    }

    let conn = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|e| format!("無法開啟 SQLite 資料庫: {}", e))?;

    let version: String = conn
        .query_row("SELECT sqlite_version()", [], |row| row.get(0))
        .map_err(|e| format!("執行測試查詢失敗: {}", e))?;

    Ok(format!("SQLite 連線成功 (版本: {})", version))
}

pub fn list_sqlite_tables(path: &str) -> Result<Vec<String>, String> {
    let conn = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|e| format!("無法開啟 SQLite 資料庫: {}", e))?;

    let mut stmt = conn
        .prepare(
            "SELECT name FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY name;",
        )
        .map_err(|e| format!("查詢資料表清單失敗: {}", e))?;

    let table_iter = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| format!("讀取資料表清單失敗: {}", e))?;

    let mut tables = Vec::new();
    for t in table_iter {
        if let Ok(name) = t {
            tables.push(name);
        }
    }

    Ok(tables)
}

pub fn execute_sqlite_query(
    path: &str,
    sql: &str,
    max_rows: Option<usize>,
) -> Result<DbQueryResult, String> {
    let start_time = Instant::now();

    let conn = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|e| format!("無法開啟 SQLite 資料庫: {}", e))?;

    let mut stmt = conn
        .prepare(sql)
        .map_err(|e| format!("SQL 語法錯誤或無法準備執行: {}", e))?;

    let column_count = stmt.column_count();
    let column_names: Vec<String> = stmt
        .column_names()
        .into_iter()
        .map(|s| s.to_string())
        .collect();

    let row_limit = max_rows.unwrap_or(10_000);
    let mut rows_data = Vec::new();
    let mut truncated = false;

    let mut rows = stmt
        .query([])
        .map_err(|e| format!("查詢執行錯誤: {}", e))?;

    while let Some(row) = rows.next().map_err(|e| format!("讀取記錄錯誤: {}", e))? {
        if rows_data.len() >= row_limit {
            truncated = true;
            break;
        }

        let mut row_map = serde_json::Map::with_capacity(column_count);
        for (i, col_name) in column_names.iter().enumerate() {
            let val_ref = row.get_ref(i).map_err(|e| format!("讀取欄位失敗: {}", e))?;
            let json_val = match val_ref {
                ValueRef::Null => serde_json::Value::Null,
                ValueRef::Integer(n) => serde_json::json!(n),
                ValueRef::Real(f) => {
                    if f.is_nan() || f.is_infinite() {
                        serde_json::Value::Null
                    } else {
                        serde_json::json!(f)
                    }
                }
                ValueRef::Text(t) => {
                    let s = String::from_utf8_lossy(t).to_string();
                    serde_json::json!(s)
                }
                ValueRef::Blob(b) => serde_json::json!(format!("<BLOB {} bytes>", b.len())),
            };
            row_map.insert(col_name.clone(), json_val);
        }
        rows_data.push(row_map);
    }

    let elapsed = start_time.elapsed().as_millis() as u64;

    Ok(DbQueryResult {
        columns: column_names,
        total_rows: rows_data.len(),
        rows: rows_data,
        execution_time_ms: elapsed,
        truncated,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sqlite_flow() {
        let db_path = "../測試資料庫_展示與分析.db";
        let conn = Connection::open(db_path).unwrap();
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS customers (
                customer_id INTEGER PRIMARY KEY,
                name TEXT,
                age REAL,
                gender TEXT,
                annual_income REAL,
                spending_score REAL,
                membership_years REAL,
                churn_risk TEXT
            );
            DELETE FROM customers;
            INSERT INTO customers VALUES (1, '陳大明', 35.0, '男', 72000.0, 68.0, 3.5, 'Low');
            INSERT INTO customers VALUES (2, '林小華', 28.0, '女', 48000.0, 85.0, 1.2, 'Medium');
            INSERT INTO customers VALUES (3, '張志豪', NULL, '男', 95000.0, 32.0, 5.0, 'High');
            INSERT INTO customers VALUES (4, '黃雅婷', 42.0, '女', 61000.0, 54.0, NULL, 'Low');
            INSERT INTO customers VALUES (5, '李建邦', 56.0, '男', NULL, 22.0, 8.2, 'High');
            INSERT INTO customers VALUES (6, '王淑芬', 31.0, '女', 53000.0, 78.0, 2.0, 'Low');
            INSERT INTO customers VALUES (7, '趙家豪', 23.0, '男', 32000.0, 92.0, 0.5, 'Medium');
            INSERT INTO customers VALUES (8, '劉玉蓮', NULL, '女', 88000.0, 45.0, 4.0, NULL);
            INSERT INTO customers VALUES (9, '周承翰', 49.0, '男', 115000.0, 61.0, 6.7, 'Low');
            INSERT INTO customers VALUES (10, '吳靜宜', 38.0, '女', NULL, NULL, 3.0, 'Medium');
            "
        ).unwrap();

        // Test list tables
        let tables = list_sqlite_tables(db_path).unwrap();
        assert!(tables.contains(&"customers".to_string()));

        // Test query
        let res = execute_sqlite_query(db_path, "SELECT * FROM customers", None).unwrap();
        assert_eq!(res.total_rows, 10);
        assert_eq!(res.columns.len(), 8);
        assert!(res.columns.contains(&"annual_income".to_string()));
    }
}
