use crate::paths;
use crate::validate::{validate_pair, ValidationIssue};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io;
use std::path::Path;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum SwitchError {
    #[error(transparent)]
    Io(#[from] io::Error),
    #[error("Profile not found: {0}")]

    NotFound(String),
    #[error("Validation failed")]
    Validation(Vec<ValidationIssue>),
    #[error("JSON error: {0}")]
    SerdeJson(#[from] serde_json::Error),
}

impl Serialize for SwitchError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ProfileMeta {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    #[serde(flatten)]
    pub meta: ProfileMeta,
    pub models_yml: String,
    pub config_yml: String,
}

#[derive(Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct State {
    active_profile_id: Option<String>,
}

pub fn slugify(name: &str) -> String {
    let mut out: Vec<char> = Vec::with_capacity(name.len());
    let mut prev_dash = true; // suppress leading dash
    for c in name.to_lowercase().chars() {
        if c.is_ascii_alphanumeric() {
            out.push(c);
            prev_dash = false;
        } else if !prev_dash {
            out.push('-');
            prev_dash = true;
        }
    }
    while out.last() == Some(&'-') {
        out.pop();
    }
    let s: String = out.into_iter().collect();
    if s.is_empty() {
        "profile".to_string()
    } else {
        s
    }
}

pub fn unique_id(name: &str) -> io::Result<String> {
    let base = slugify(name);
    let profiles = paths::profiles_dir();
    if !profiles.join(&base).exists() {
        return Ok(base);
    }
    for n in 2.. {
        let candidate = format!("{}-{}", base, n);
        if !profiles.join(&candidate).exists() {
            return Ok(candidate);
        }
    }
    unreachable!()
}

pub fn list_profiles() -> Result<Vec<ProfileMeta>, SwitchError> {
    let profiles = paths::profiles_dir();
    if !profiles.exists() {
        return Ok(Vec::new());
    }
    let mut out = Vec::new();
    for entry in fs::read_dir(&profiles)? {
        let entry = entry?;
        if !entry.file_type()?.is_dir() {
            continue;
        }
        let meta_path = entry.path().join("meta.json");
        match fs::read_to_string(&meta_path) {
            Ok(s) => match serde_json::from_str::<ProfileMeta>(&s) {
                Ok(m) => out.push(m),
                Err(_) => continue,
            },
            Err(_) => continue,
        }
    }
    out.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(out)
}

pub fn read_global_models() -> Result<String, SwitchError> {
    let global_path = paths::global_models();
    if global_path.exists() {
        return Ok(fs::read_to_string(global_path)?);
    }
    let live_path = paths::live_models();
    if live_path.exists() {
        let content = fs::read_to_string(&live_path)?;
        let _ = save_global_models(&content);
        return Ok(content);
    }
    if let Ok(profiles) = list_profiles() {
        for p in profiles {
            let p_models = paths::profiles_dir().join(&p.id).join("models.yml");
            if p_models.exists() {
                if let Ok(content) = fs::read_to_string(p_models) {
                    let _ = save_global_models(&content);
                    return Ok(content);
                }
            }
        }
    }
    let default_content = "providers:\n".to_string();
    let _ = save_global_models(&default_content);
    Ok(default_content)
}

pub fn save_global_models(models_yml: &str) -> Result<(), SwitchError> {
    let val: serde_yaml::Value = serde_yaml::from_str(models_yml).map_err(|e| {
        SwitchError::Validation(vec![ValidationIssue {
            file: "models.yml".to_string(),
            level: "error".to_string(),
            message: format!("YAML 解析失败: {}", e),
        }])
    })?;
    if !val.is_mapping() && !val.is_null() {
        return Err(SwitchError::Validation(vec![ValidationIssue {
            file: "models.yml".to_string(),
            level: "error".to_string(),
            message: "models.yml 根节点必须是对象".to_string(),
        }]));
    }

    let global_path = paths::global_models();
    if let Some(parent) = global_path.parent() {
        fs::create_dir_all(parent)?;
    }
    atomic_write(&global_path, models_yml)?;

    let live_models = paths::live_models();
    if let Some(parent) = live_models.parent() {
        if parent.exists() {
            let _ = atomic_write(&live_models, models_yml);
        }
    }

    Ok(())
}

pub fn read_profile(id: &str) -> Result<Profile, SwitchError> {
    let dir = paths::profiles_dir().join(id);
    if !dir.exists() {
        return Err(SwitchError::NotFound(id.to_string()));
    }
    let meta: ProfileMeta =
        serde_json::from_str(&fs::read_to_string(dir.join("meta.json"))?)?;
    let models_yml = if dir.join("models.yml").exists() {
        fs::read_to_string(dir.join("models.yml")).unwrap_or_default()
    } else {
        read_global_models().unwrap_or_default()
    };
    let config_yml = fs::read_to_string(dir.join("config.yml")).unwrap_or_default();
    Ok(Profile {
        meta,
        models_yml,
        config_yml,
    })
}

pub fn create_profile(
    name: &str,
    models_yml: &str,
    config_yml: &str,
) -> Result<ProfileMeta, SwitchError> {
    let issues = validate_pair(models_yml, config_yml);
    if issues.iter().any(|i| i.level == "error") {
        return Err(SwitchError::Validation(issues));
    }
    let id = unique_id(name)?;
    let now = now_rfc3339();
    let meta = ProfileMeta {
        id,
        name: name.to_string(),
        created_at: now.clone(),
        updated_at: now,
    };
    write_profile_files(&meta, models_yml, config_yml)?;
    Ok(meta)
}

pub fn update_profile(
    id: &str,
    name: Option<&str>,
    models_yml: Option<&str>,
    config_yml: Option<&str>,
) -> Result<(), SwitchError> {
    let mut profile = read_profile(id)?;
    let models = models_yml.unwrap_or(&profile.models_yml);
    let config = config_yml.unwrap_or(&profile.config_yml);
    let issues = validate_pair(models, config);
    if issues.iter().any(|i| i.level == "error") {
        return Err(SwitchError::Validation(issues));
    }
    if let Some(n) = name {
        profile.meta.name = n.to_string();
    }
    profile.meta.updated_at = now_rfc3339();
    write_profile_files(&profile.meta, models, config)?;
    Ok(())
}

pub fn duplicate_profile(id: &str, name: &str) -> Result<ProfileMeta, SwitchError> {
    let source = read_profile(id)?;
    create_profile(name, &source.models_yml, &source.config_yml)
}

pub fn delete_profile(id: &str) -> Result<(), SwitchError> {
    let dir = paths::profiles_dir().join(id);
    if !dir.exists() {
        return Err(SwitchError::NotFound(id.to_string()));
    }
    fs::remove_dir_all(&dir)?;
    if read_state()?.and_then(|s| serde_json::from_str::<State>(&s).ok())
        .and_then(|s| s.active_profile_id)
        .as_deref()
        == Some(id)
    {
        let _ = write_state(None);
    }
    Ok(())
}

fn write_profile_files(
    meta: &ProfileMeta,
    models_yml: &str,
    config_yml: &str,
) -> Result<(), SwitchError> {
    let dir = paths::profiles_dir().join(&meta.id);
    fs::create_dir_all(&dir)?;
    atomic_write(&dir.join("meta.json"), &serde_json::to_string_pretty(meta)?)?;
    atomic_write(&dir.join("models.yml"), models_yml)?;
    atomic_write(&dir.join("config.yml"), config_yml)?;
    Ok(())
}

pub fn atomic_write(path: &Path, content: &str) -> io::Result<()> {
    let file_name = path
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "tmp".to_string());
    let tmp = path.with_file_name(format!(".{}.omp-switch-tmp", file_name));
    fs::write(&tmp, content)?;
    let f = fs::File::open(&tmp)?;
    f.sync_all()?;
    drop(f);
    fs::rename(&tmp, path)?;
    Ok(())
}

pub fn read_state() -> Result<Option<String>, SwitchError> {
    match fs::read_to_string(paths::state_file()) {
        Ok(s) => Ok(Some(s)),
        Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.into()),
    }
}

pub fn write_state(active_id: Option<&str>) -> Result<(), SwitchError> {
    let state = State {
        active_profile_id: active_id.map(|s| s.to_string()),
    };
    let dir = paths::switch_root();
    fs::create_dir_all(&dir)?;
    atomic_write(
        &paths::state_file(),
        &serde_json::to_string_pretty(&state)?,
    )?;
    Ok(())
}

pub fn active_profile_id() -> Result<Option<String>, SwitchError> {
    let s = match read_state()? {
        Some(s) => s,
        None => return Ok(None),
    };
    let state: State = serde_json::from_str(&s).unwrap_or_default();
    Ok(state.active_profile_id)
}

fn now_rfc3339() -> String {
    chrono::Local::now().to_rfc3339()
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn setup() -> (TempDir, parking_lot::MutexGuard<'static, ()>) {
        let guard = paths::TEST_MUTEX.lock();
        let dir = TempDir::new().unwrap();
        paths::set_test_root(dir.path().join("omp-switch"));
        (dir, guard)
    }

    #[test]
    fn test_slugify() {
        assert_eq!(slugify("Hello World"), "hello-world");
        assert_eq!(slugify("  My   Profile  "), "my-profile");
        assert_eq!(slugify("---a---b---"), "a-b");
        assert_eq!(slugify("!@#"), "profile");
        assert_eq!(slugify("A1b2"), "a1b2");
    }

    #[test]
    fn test_unique_id() {
        let (_tmp, _guard) = setup();
        let first = create_profile("Test", "a: 1", "b: 2").unwrap();
        assert_eq!(first.id, "test");
        let second = create_profile("Test", "a: 1", "b: 2").unwrap();
        assert_eq!(second.id, "test-2");
        let third = create_profile("Test", "a: 1", "b: 2").unwrap();
        assert_eq!(third.id, "test-3");
    }

    #[test]
    fn test_crud_roundtrip() {
        let (_tmp, _guard) = setup();
        let meta = create_profile("Demo", "models: yes", "config: yes").unwrap();
        let p = read_profile(&meta.id).unwrap();
        assert_eq!(p.meta.name, "Demo");
        assert_eq!(p.models_yml, "models: yes");
        assert_eq!(p.config_yml, "config: yes");

        update_profile(&meta.id, Some("Renamed"), Some("models: no"), Some("config: no")).unwrap();
        let p2 = read_profile(&meta.id).unwrap();
        assert_eq!(p2.meta.name, "Renamed");
        assert_eq!(p2.models_yml, "models: no");

        let list = list_profiles().unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].name, "Renamed");

        delete_profile(&meta.id).unwrap();
        assert!(list_profiles().unwrap().is_empty());
    }

    #[test]
    fn test_list_skips_broken_meta() {
        let (tmp, _guard) = setup();
        let dir = tmp.path().join("omp-switch/profiles/bad");
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join("meta.json"), "not json").unwrap();
        assert!(list_profiles().unwrap().is_empty());
    }

    #[test]
    fn test_delete_active_clears_state() {
        let (_tmp, _guard) = setup();
        let meta = create_profile("Active", "m: 1", "c: 1").unwrap();
        write_state(Some(&meta.id)).unwrap();
        delete_profile(&meta.id).unwrap();
        assert_eq!(active_profile_id().unwrap(), None);
    }

    #[test]
    fn test_atomic_write_content_and_no_tmp() {
        let (tmp, _guard) = setup();
        let path = tmp.path().join("test.txt");
        atomic_write(&path, "hello").unwrap();
        assert_eq!(fs::read_to_string(&path).unwrap(), "hello");
        assert!(!path.with_file_name(".test.txt.omp-switch-tmp").exists());
    }

    #[test]
    fn test_validation_blocks_invalid_yaml() {
        let (_tmp, _guard) = setup();
        let err = create_profile("Bad", "not [ valid", "ok: 1").unwrap_err();
        match err {
            SwitchError::Validation(_) => {}
            _ => panic!("expected validation error, got {:?}", err),
        }
    }

    #[test]
    fn test_duplicate_profile() {
        let (_tmp, _guard) = setup();
        let original = create_profile("Original", "m: 1", "c: 1").unwrap();
        let dup = duplicate_profile(&original.id, "Copy").unwrap();
        assert_eq!(dup.name, "Copy");
        assert_ne!(dup.id, original.id);
        let p = read_profile(&dup.id).unwrap();
        assert_eq!(p.models_yml, "m: 1");
        assert_eq!(p.config_yml, "c: 1");
    }
}
