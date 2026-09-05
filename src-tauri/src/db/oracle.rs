use super::sqlite::DbQueryResult;
use oracledb::{Config, Connection};
use serde::{Deserialize, Serialize};
use std::time::Instant;

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct OracleConnectionConfig {
    pub host: String,
    pub port: u16,
    pub service_name: String,
    pub is_sid: bool,
    pub username: String,
    pub password: String,
    pub custom_connect_string: Option<String>,
    pub use_custom_string: bool,
}

fn build_connect_string(config: &OracleConnectionConfig) -> String {
    if config.use_custom_string {
        if let Some(ref s) = config.custom_connect_string {
            let trimmed = s.trim();
            if !trimmed.is_empty() {
                return trimmed.to_string();
            }
        }
    }

    if config.is_sid {
        format!("{}:{}:{}", config.host.trim(), config.port, config.service_name.trim())
    } else {
        format!("{}:{}/{}", config.host.trim(), config.port, config.service_name.trim())
    }
}

fn create_oracle_connection(config: &OracleConnectionConfig) -> Result<Connection, String> {
    let connect_str = build_connect_string(config);
    let cfg = Config::default()
        .set_credentials(config.username.trim(), &config.password)
        .set_connect_string(&connect_str)
        .map_err(|e| format!("Oracle 設定無效 (連線字串: {}): {}", connect_str, e))?;

    oracledb::connect(cfg)
        .map_err(|e| format!("Oracle 連線失敗 ({}): {}", connect_str, e))
}

pub fn test_oracle_connection(config: OracleConnectionConfig) -> Result<String, String> {
    let conn = create_oracle_connection(&config)?;

    let row = conn
        .query_row("SELECT 1 FROM DUAL", &[])
        .map_err(|e| format!("連線成功但測試查詢失敗: {}", e))?;

    let val: Option<i32> = row.get(0).unwrap_or(Some(1));

    Ok(format!(
        "Oracle 連線測試成功！回應狀態正常 (碼: {})",
        val.unwrap_or(1)
    ))
}

pub fn list_oracle_tables(config: OracleConnectionConfig) -> Result<Vec<String>, String> {
    let conn = create_oracle_connection(&config)?;

    let cursor = conn
        .query("SELECT table_name FROM user_tables ORDER BY table_name", &[])
        .map_err(|e| format!("讀取資料表清單失敗: {}", e))?;

    let mut tables = Vec::new();
    for row_res in cursor {
        if let Ok(row) = row_res {
            if let Ok(Some(name)) = row.get::<Option<String>>(0) {
                tables.push(name);
            }
        }
    }

    Ok(tables)
}

pub fn execute_oracle_query(
    config: OracleConnectionConfig,
    sql: &str,
    max_rows: Option<usize>,
) -> Result<DbQueryResult, String> {
    let start_time = Instant::now();
    let conn = create_oracle_connection(&config)?;

    let cursor = conn
        .query(sql, &[])
        .map_err(|e| format!("SQL 語法錯誤或執行失敗: {}", e))?;

    let col_metas = cursor.columns().clone();
    let col_names: Vec<String> = col_metas.iter().map(|m| m.name().to_string()).collect();
    let col_count = col_names.len();

    let row_limit = max_rows.unwrap_or(10_000);
    let mut rows_data = Vec::new();
    let mut truncated = false;

    for row_res in cursor {
        let row = row_res.map_err(|e| format!("讀取查詢記錄失敗: {}", e))?;
        if rows_data.len() >= row_limit {
            truncated = true;
            break;
        }

        let mut row_map = serde_json::Map::with_capacity(col_count);
        for (i, col_meta) in col_metas.iter().enumerate() {
            let col_name = &col_names[i];
            let db_type = col_meta.db_type();
            let type_name = db_type.name();

            let is_number = type_name.contains("NUMBER")
                || type_name.contains("FLOAT")
                || type_name.contains("DOUBLE")
                || type_name.contains("INTEGER");

            let json_val = if is_number {
                if let Ok(Some(f)) = row.get::<Option<f64>>(i) {
                    if f.is_nan() || f.is_infinite() {
                        serde_json::Value::Null
                    } else {
                        serde_json::json!(f)
                    }
                } else if let Ok(Some(s)) = row.get::<Option<String>>(i) {
                    // Try parsing as number
                    if let Ok(num) = s.parse::<f64>() {
                        serde_json::json!(num)
                    } else {
                        serde_json::json!(s)
                    }
                } else {
                    serde_json::Value::Null
                }
            } else if db_type.is_date_type() {
                if let Ok(Some(ts)) = row.get::<Option<oracledb::OracleTimestamp>>(i) {
                    serde_json::json!(format!("{:?}", ts))
                } else if let Ok(Some(s)) = row.get::<Option<String>>(i) {
                    serde_json::json!(s)
                } else {
                    serde_json::Value::Null
                }
            } else if db_type.is_string_type() {
                if let Ok(Some(s)) = row.get::<Option<String>>(i) {
                    serde_json::json!(s)
                } else {
                    serde_json::Value::Null
                }
            } else {
                // Generic fallback: string -> float -> null
                if let Ok(Some(s)) = row.get::<Option<String>>(i) {
                    serde_json::json!(s)
                } else if let Ok(Some(f)) = row.get::<Option<f64>>(i) {
                    serde_json::json!(f)
                } else {
                    serde_json::Value::Null
                }
            };

            row_map.insert(col_name.clone(), json_val);
        }
        rows_data.push(row_map);
    }

    let elapsed = start_time.elapsed().as_millis() as u64;

    Ok(DbQueryResult {
        columns: col_names,
        total_rows: rows_data.len(),
        rows: rows_data,
        execution_time_ms: elapsed,
        truncated,
    })
}
