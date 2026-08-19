use std::collections::HashSet;
use sysinfo::{ProcessRefreshKind, ProcessesToUpdate, RefreshKind, System};

pub fn running_omp() -> Vec<String> {
    let mut sys = System::new_with_specifics(
        RefreshKind::nothing().with_processes(ProcessRefreshKind::nothing()),
    );
    sys.refresh_processes(ProcessesToUpdate::All, true);

    let own_pid = std::process::id();
    let mut seen = HashSet::new();
    let mut out = Vec::new();

    for (pid, proc) in sys.processes() {
        if pid.as_u32() == own_pid {
            continue;
        }
        let name = proc.name().to_string_lossy().to_lowercase();
        if name.contains("omp") && !name.contains("omp-switch") {
            let key = format!("{} ({})", proc.name().to_string_lossy(), pid.as_u32());
            if seen.insert(key.clone()) {
                out.push(key);
            }
        }
    }
    out.sort();
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detect_excludes_self() {
        let list = running_omp();
        assert!(!list.iter().any(|s| s.contains("omp-switch")));
    }
}
