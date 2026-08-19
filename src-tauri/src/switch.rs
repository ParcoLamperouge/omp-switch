use crate::paths;
use crate::profile::{self, SwitchError};
use serde::Serialize;
use std::fs;

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LiveStatus {
    pub active_id: Option<String>,
    pub effective_id: Option<String>,
    pub drift: bool,
    pub live_exists: bool,
}

pub fn switch_profile(id: &str) -> Result<(), SwitchError> {
    let profile = profile::read_profile(id)?;
    let global_models = profile::read_global_models().unwrap_or_else(|_| profile.models_yml.clone());
    let backup_dir = create_backup()?;

    // Ensure live directory exists.
    fs::create_dir_all(paths::live_dir())?;

    // Ensure models.yml is written from global models and config from selected profile.
    profile::atomic_write(&paths::live_models(), &global_models)?;
    if let Err(e) = profile::atomic_write(&paths::live_config(), &profile.config_yml) {
        if let Some(ref dir) = backup_dir {
            let config_backup = dir.join("config.yml");
            if config_backup.exists() {
                let _ = fs::copy(&config_backup, paths::live_config());
            }
        }
        return Err(e.into());
    }

    profile::write_state(Some(id))?;
    Ok(())
}

fn create_backup() -> Result<Option<std::path::PathBuf>, SwitchError> {
    let models = paths::live_models();
    let config = paths::live_config();
    let models_exists = models.exists();
    let config_exists = config.exists();
    if !models_exists && !config_exists {
        return Ok(None);
    }

    let now = chrono::Local::now();
    let stamp = now.format("%Y%m%d-%H%M%S").to_string();
    let backup_dir = paths::backups_dir().join(stamp);
    fs::create_dir_all(&backup_dir)?;

    if models_exists {
        fs::copy(&models, backup_dir.join("models.yml"))?;
    }
    if config_exists {
        fs::copy(&config, backup_dir.join("config.yml"))?;
    }
    Ok(Some(backup_dir))
}

pub fn live_status() -> LiveStatus {
    let active_id = profile::active_profile_id().ok().flatten();
    let models_exists = paths::live_models().exists();
    let config_exists = paths::live_config().exists();

    let live_config = fs::read_to_string(paths::live_config()).unwrap_or_default();

    // effective_id = profile whose stored config_yml matches live config.
    let effective_id = if config_exists {
        profile::list_profiles()
            .unwrap_or_default()
            .into_iter()
            .find(|meta| {
                profile::read_profile(&meta.id)
                    .map(|p| p.config_yml == live_config)
                    .unwrap_or(false)
            })
            .map(|meta| meta.id)
    } else {
        None
    };

    // drift = active profile exists but live config does not match it.
    let drift = if let Some(id) = &active_id {
        if let Some(ref effective) = effective_id {
            effective != id
        } else {
            true
        }
    } else {
        false
    };

    LiveStatus {
        active_id,
        effective_id,
        drift,
        live_exists: models_exists && config_exists,
    }
}

pub fn import_live(name: &str) -> Result<profile::ProfileMeta, SwitchError> {
    let models = paths::live_models();
    let config = paths::live_config();
    if !config.exists() {
        return Err(SwitchError::NotFound(
            "~/.omp/agent/config.yml 不存在".to_string(),
        ));
    }
    if models.exists() {
        if let Ok(models_yml) = fs::read_to_string(&models) {
            let _ = profile::save_global_models(&models_yml);
        }
    }
    let models_yml = profile::read_global_models().unwrap_or_default();
    let config_yml = fs::read_to_string(&config)?;
    profile::create_profile(name, &models_yml, &config_yml)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::paths;
    use crate::profile;
    use tempfile::TempDir;

    fn setup() -> (TempDir, parking_lot::MutexGuard<'static, ()>) {
        let guard = paths::TEST_MUTEX.lock();
        let dir = TempDir::new().unwrap();
        paths::set_test_root(dir.path().join("omp-switch"));
        (dir, guard)
    }

    #[test]
    fn switch_updates_live_and_state() {
        let (_tmp, _guard) = setup();
        let meta = profile::create_profile("P1", "m: 1", "c: 1").unwrap();
        switch_profile(&meta.id).unwrap();
        assert_eq!(fs::read_to_string(paths::live_models()).unwrap(), "m: 1");
        assert_eq!(fs::read_to_string(paths::live_config()).unwrap(), "c: 1");
        assert_eq!(profile::active_profile_id().unwrap(), Some(meta.id));
    }

    #[test]
    fn switch_creates_backup() {
        let (_tmp, _guard) = setup();
        fs::create_dir_all(paths::live_dir()).unwrap();
        fs::write(paths::live_models(), "m: old").unwrap();
        fs::write(paths::live_config(), "c: old").unwrap();

        let meta = profile::create_profile("P2", "m: new", "c: new").unwrap();
        switch_profile(&meta.id).unwrap();

        let backups: Vec<_> = fs::read_dir(paths::backups_dir())
            .unwrap()
            .filter_map(|e| e.ok())
            .collect();
        assert_eq!(backups.len(), 1);
        let backup = backups[0].path();
        assert_eq!(fs::read_to_string(backup.join("models.yml")).unwrap(), "m: old");
        assert_eq!(fs::read_to_string(backup.join("config.yml")).unwrap(), "c: old");
    }

    #[test]
    fn live_status_drift() {
        let (_tmp, _guard) = setup();
        let meta = profile::create_profile("P3", "m: 1", "c: 1").unwrap();
        switch_profile(&meta.id).unwrap();
        let s = live_status();
        assert_eq!(s.effective_id, Some(meta.id.clone()));
        assert!(!s.drift);

        fs::write(paths::live_config(), "c: 2").unwrap();
        let s = live_status();
        assert!(s.drift);
        assert_ne!(s.effective_id, Some(meta.id.clone()));
    }

    #[test]
    #[cfg(unix)]
    fn rollback_on_config_failure() {
        use std::os::unix::fs::PermissionsExt;

        let (_tmp, _guard) = setup();
        fs::create_dir_all(paths::live_dir()).unwrap();
        fs::write(paths::live_models(), "m: old").unwrap();
        fs::write(paths::live_config(), "c: old").unwrap();

        let meta = profile::create_profile("P4", "m: new", "c: new").unwrap();

        // Make live directory read-only so atomic_write for config fails.
        let live = paths::live_dir();
        let mut perm = fs::metadata(&live).unwrap().permissions();
        let original_mode = perm.mode();
        perm.set_mode(0o555);
        fs::set_permissions(&live, perm).unwrap();

        let result = switch_profile(&meta.id);

        // Restore permissions before assertions so cleanup works.
        let mut perm = fs::metadata(&live).unwrap().permissions();
        perm.set_mode(original_mode);
        fs::set_permissions(&live, perm).unwrap();

        assert!(result.is_err());
        assert_eq!(fs::read_to_string(paths::live_models()).unwrap(), "m: old");
    }

    #[test]
    fn import_live_requires_live() {
        let (_tmp, _guard) = setup();
        assert!(import_live("FromLive").is_err());
    }
}
