mod detect;
mod models;
mod paths;
mod profile;
mod switch;
mod validate;

use profile::{Profile, ProfileMeta};
use switch::LiveStatus;
use validate::ValidationIssue;

#[tauri::command]
async fn list_profiles() -> Result<Vec<ProfileMeta>, String> {
    tauri::async_runtime::spawn_blocking(|| profile::list_profiles().map_err(|e| e.to_string()))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn read_profile(id: String) -> Result<Profile, String> {
    tauri::async_runtime::spawn_blocking(move || {
        profile::read_profile(&id).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn create_profile(
    name: String,
    models_yml: String,
    config_yml: String,
) -> Result<ProfileMeta, String> {
    tauri::async_runtime::spawn_blocking(move || {
        profile::create_profile(&name, &models_yml, &config_yml).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn import_live(name: String) -> Result<ProfileMeta, String> {
    tauri::async_runtime::spawn_blocking(move || {
        switch::import_live(&name).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn duplicate_profile(id: String, name: String) -> Result<ProfileMeta, String> {
    tauri::async_runtime::spawn_blocking(move || {
        profile::duplicate_profile(&id, &name).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn update_profile(
    id: String,
    name: String,
    models_yml: String,
    config_yml: String,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        profile::update_profile(&id, Some(&name), Some(&models_yml), Some(&config_yml))
            .map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn delete_profile(id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        profile::delete_profile(&id).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn switch_profile(id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        switch::switch_profile(&id).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn get_status() -> LiveStatus {
    tauri::async_runtime::spawn_blocking(switch::live_status)
        .await
        .unwrap_or_else(|_| switch::live_status())
}

#[tauri::command]
async fn validate_pair(
    models_yml: String,
    config_yml: String,
    discovered_models: Vec<models::AvailableModel>,
) -> Vec<ValidationIssue> {
    tauri::async_runtime::spawn_blocking(move || {
        validate::validate_pair_with_discovered(&models_yml, &config_yml, &discovered_models)
    })
    .await
    .unwrap_or_default()
}

#[tauri::command]
async fn update_profile_config(id: String, config_yml: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        profile::update_profile_config(&id, &config_yml).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
fn check_running() -> Vec<String> {
    detect::running_omp()
}

#[tauri::command]
async fn read_global_models() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(|| profile::read_global_models().map_err(|e| e.to_string()))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn save_global_models(models_yml: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        profile::save_global_models(&models_yml).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn list_authenticated_models() -> Vec<models::AvailableModel> {
    tauri::async_runtime::spawn_blocking(models::list_authenticated_models)
        .await
        .unwrap_or_default()
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
            list_authenticated_models,
            create_profile,
            update_profile_config,
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
