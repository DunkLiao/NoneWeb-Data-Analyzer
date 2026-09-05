use base64::Engine;
use rfd::FileDialog;
use std::fs;
use std::path::Path;
use tauri::Manager;

mod db;
use db::oracle::{execute_oracle_query, list_oracle_tables, test_oracle_connection, OracleConnectionConfig};
use db::sqlite::{execute_sqlite_query, list_sqlite_tables, pick_sqlite_file, test_sqlite_connection, DbQueryResult};

#[tauri::command]
fn save_file_dialog(suggested_name: String, content: String, is_base64: bool) -> Result<Option<String>, String> {
  let mut dialog = FileDialog::new().set_file_name(&suggested_name);

  if let Some(ext) = Path::new(&suggested_name).extension().and_then(|s| s.to_str()) {
    let filter_name = match ext.to_lowercase().as_str() {
      "html" => "HTML 網頁檔案 (*.html)",
      "csv" => "CSV 逗號分隔檔案 (*.csv)",
      "xlsx" => "Excel 工作表 (*.xlsx)",
      _ => "檔案",
    };
    dialog = dialog.add_filter(filter_name, &[ext]);
  }

  if let Some(path) = dialog.save_file() {
    let path_buf = path.to_path_buf();
    if is_base64 {
      let bytes = base64::engine::general_purpose::STANDARD
        .decode(content)
        .map_err(|e| format!("Base64 解碼失敗: {}", e))?;
      fs::write(&path_buf, bytes).map_err(|e| format!("寫入檔案失敗: {}", e))?;
    } else {
      fs::write(&path_buf, content.as_bytes()).map_err(|e| format!("寫入檔案失敗: {}", e))?;
    }
    Ok(Some(path_buf.to_string_lossy().to_string()))
  } else {
    Ok(None)
  }
}

// SQLite Commands
#[tauri::command]
fn cmd_pick_sqlite_file() -> Result<Option<String>, String> {
  pick_sqlite_file()
}

#[tauri::command]
fn cmd_test_sqlite_connection(path: String) -> Result<String, String> {
  test_sqlite_connection(&path)
}

#[tauri::command]
fn cmd_list_sqlite_tables(path: String) -> Result<Vec<String>, String> {
  list_sqlite_tables(&path)
}

#[tauri::command]
fn cmd_execute_sqlite_query(path: String, sql: String, max_rows: Option<usize>) -> Result<DbQueryResult, String> {
  execute_sqlite_query(&path, &sql, max_rows)
}

// Oracle Commands
#[tauri::command]
fn cmd_test_oracle_connection(config: OracleConnectionConfig) -> Result<String, String> {
  test_oracle_connection(config)
}

#[tauri::command]
fn cmd_list_oracle_tables(config: OracleConnectionConfig) -> Result<Vec<String>, String> {
  list_oracle_tables(config)
}

#[tauri::command]
fn cmd_execute_oracle_query(config: OracleConnectionConfig, sql: String, max_rows: Option<usize>) -> Result<DbQueryResult, String> {
  execute_oracle_query(config, &sql, max_rows)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      save_file_dialog,
      cmd_pick_sqlite_file,
      cmd_test_sqlite_connection,
      cmd_list_sqlite_tables,
      cmd_execute_sqlite_query,
      cmd_test_oracle_connection,
      cmd_list_oracle_tables,
      cmd_execute_oracle_query,
    ])
    .setup(|app| {
      if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
