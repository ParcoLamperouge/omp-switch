mod detect;
mod paths;
mod profile;
mod switch;
mod validate;

use profile::{Profile, ProfileMeta};
use switch::LiveStatus;
use validate::ValidationIssue;

#[tauri::command]
fn list_profiles() -> Result<Vec<ProfileMeta>, String> {
    profile::list_profiles().map_err(|e| e.to_string())
}

#[tauri::command]
fn read_profile(id: String) -> Result<Profile, String> {
    profile::read_profile(&id).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_profile(
    name: String,
    models_yml: String,
    config_yml: String,
) -> Result<ProfileMeta, String> {
    profile::create_profile(&name, &models_yml, &config_yml).map_err(|e| e.to_string())
}

#[tauri::command]
fn import_live(name: String) -> Result<ProfileMeta, String> {
    switch::import_live(&name).map_err(|e| e.to_string())
}

#[tauri::command]
fn duplicate_profile(id: String, name: String) -> Result<ProfileMeta, String> {
    profile::duplicate_profile(&id, &name).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_profile(
    id: String,
    name: String,
    models_yml: String,
    config_yml: String,
) -> Result<(), String> {
    profile::update_profile(&id, Some(&name), Some(&models_yml), Some(&config_yml))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_profile(id: String) -> Result<(), String> {
    profile::delete_profile(&id).map_err(|e| e.to_string())
}

#[tauri::command]
fn switch_profile(id: String) -> Result<(), String> {
    switch::switch_profile(&id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_status() -> LiveStatus {
    switch::live_status()
}

#[tauri::command]
fn validate_pair(models_yml: String, config_yml: String) -> Vec<ValidationIssue> {
    validate::validate_pair(&models_yml, &config_yml)
}

#[tauri::command]
fn check_running() -> Vec<String> {
    detect::running_omp()
}

#[tauri::command]
fn read_global_models() -> Result<String, String> {
    profile::read_global_models().map_err(|e| e.to_string())
}

#[tauri::command]
fn save_global_models(models_yml: String) -> Result<(), String> {
    profile::save_global_models(&models_yml).map_err(|e| e.to_string())
}

#[tauri::command]
fn reveal_live_dir() -> Result<(), String> {
    let dir = crate::paths::live_dir();
    if !dir.exists() {
        return Err("~/.omp/agent 目录不存在".to_string());
    }
    tauri_plugin_opener::open_path(&dir, None::<&str>).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_profiles,
            read_profile,
            read_global_models,
            save_global_models,
            create_profile,
            import_live,
            duplicate_profile,
            update_profile,
            delete_profile,
            switch_profile,
            get_status,
            validate_pair,
            check_running,
            reveal_live_dir,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
