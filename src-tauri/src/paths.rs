use parking_lot::RwLock;
use std::path::PathBuf;

static ROOT: RwLock<Option<PathBuf>> = RwLock::new(None);

fn root() -> PathBuf {
    let guard = ROOT.read();
    guard.clone().unwrap_or_else(|| dirs::home_dir().expect("home dir").join(".omp-switch"))
}

pub fn switch_root() -> PathBuf {
    root()
}

pub fn profiles_dir() -> PathBuf {
    root().join("profiles")
}

pub fn backups_dir() -> PathBuf {
    root().join("backups")
}

pub fn state_file() -> PathBuf {
    root().join("state.json")
}

pub fn global_models() -> PathBuf {
    root().join("models.yml")
}

pub fn live_dir() -> PathBuf {
    let guard = ROOT.read();
    match guard.as_ref() {
        Some(r) => r.join("agent"),
        None => dirs::home_dir().expect("home dir").join(".omp/agent"),
    }
}

pub fn live_models() -> PathBuf {
    live_dir().join("models.yml")
}

pub fn live_config() -> PathBuf {
    live_dir().join("config.yml")
}

#[cfg(test)]
pub fn set_test_root(dir: PathBuf) {
    let mut guard = ROOT.write();
    *guard = Some(dir);
}


#[cfg(test)]
pub static TEST_MUTEX: parking_lot::Mutex<()> = parking_lot::Mutex::new(());

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_live_dir_points_to_omp_agent() {
        let _guard = TEST_MUTEX.lock();
        *ROOT.write() = None;
        let expected = dirs::home_dir().unwrap().join(".omp/agent");
        assert_eq!(live_dir(), expected);
    }
}
