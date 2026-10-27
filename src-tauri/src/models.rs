use rusqlite::{Connection, OpenFlags};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::env;
use std::ffi::OsString;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AvailableModel {
    pub provider: String,
    pub model_id: String,
    pub display_name: Option<String>,
}

#[derive(Deserialize)]
struct OmpModelsResponse {
    models: Vec<OmpModel>,
}

#[derive(Deserialize)]
#[serde(untagged)]
enum OmpModelsOutput {
    Response(OmpModelsResponse),
    List(Vec<OmpModel>),
}

#[derive(Deserialize)]
struct OmpModel {
    provider: String,
    id: String,
    #[serde(default)]
    selector: Option<String>,
    #[serde(default)]
    name: Option<String>,
}

/// Returns CLI-discovered models only for providers with active local
/// credentials. The models database/catalog is never used as a source.
pub fn list_authenticated_models() -> Vec<AvailableModel> {
    let auth_db = omp_agent_dir().join("agent.db");
    let providers = match active_provider_ids(&auth_db) {
        Ok(providers) => providers,
        Err(_) => return Vec::new(),
    };

    let mut result = Vec::new();
    let mut seen = HashSet::new();
    for provider in providers {
        let Some(output) = run_omp(["models", &provider, "--json"]) else {
            continue;
        };
        for model in parse_models_json(&output, &provider) {
            let key = format!("{}/{}", model.provider, model.model_id);
            if seen.insert(key) {
                result.push(model);
            }
        }
    }
    result
}

fn omp_agent_dir() -> PathBuf {
    agent_dir_from_env(env::var_os("PI_CODING_AGENT_DIR"))
}

fn agent_dir_from_env(value: Option<OsString>) -> PathBuf {
    match value.filter(|value| !value.is_empty()) {
        Some(value) => PathBuf::from(value),
        None => dirs::home_dir()
            .expect("home dir")
            .join(".omp")
            .join("agent"),
    }
}

fn active_provider_ids(path: &Path) -> rusqlite::Result<Vec<String>> {
    let connection = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY)?;
    connection.busy_timeout(std::time::Duration::from_millis(500))?;
    let mut statement = connection.prepare(
        "SELECT DISTINCT provider FROM auth_credentials \
         WHERE disabled_cause IS NULL ORDER BY provider",
    )?;
    let rows = statement.query_map([], |row| row.get::<_, String>(0))?;
    rows.collect()
}

fn run_omp<const N: usize>(args: [&str; N]) -> Option<Vec<u8>> {
    let binary = find_omp_binary()?;
    let output = Command::new(binary).args(args).output().ok()?;
    output.status.success().then_some(output.stdout)
}

fn find_omp_binary() -> Option<PathBuf> {
    find_omp_binary_in_path(env::var_os("PATH"))
}

fn find_omp_binary_in_path(path: Option<OsString>) -> Option<PathBuf> {
    if let Some(path) = path {
        for directory in env::split_paths(&path) {
            let candidate = directory.join("omp");
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }

    let mut candidates = vec![
        PathBuf::from("/opt/homebrew/bin/omp"),
        PathBuf::from("/usr/local/bin/omp"),
        PathBuf::from("/usr/bin/omp"),
    ];
    if let Some(home) = dirs::home_dir() {
        candidates.push(home.join(".local/bin/omp"));
        candidates.push(home.join(".npm-global/bin/omp"));
    }
    candidates.into_iter().find(|path| path.is_file())
}

fn parse_models_json(output: &[u8], expected_provider: &str) -> Vec<AvailableModel> {
    let parsed = match serde_json::from_slice::<OmpModelsOutput>(output) {
        Ok(OmpModelsOutput::Response(response)) => response.models,
        Ok(OmpModelsOutput::List(models)) => models,
        Err(_) => return Vec::new(),
    };

    parsed
        .into_iter()
        .filter_map(|model| {
            if model.provider != expected_provider
                || model.provider.trim().is_empty()
                || model.id.trim().is_empty()
            {
                return None;
            }
            if let Some(selector) = model.selector.as_deref() {
                if selector != format!("{}/{}", model.provider, model.id) {
                    return None;
                }
            }
            Some(AvailableModel {
                provider: model.provider,
                model_id: model.id,
                display_name: model.name,
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn active_provider_query_excludes_disabled_credentials() {
        let temp = tempfile::tempdir().unwrap();
        let connection = Connection::open(temp.path().join("agent.db")).unwrap();
        connection
            .execute_batch(
                "CREATE TABLE auth_credentials (
                    provider TEXT NOT NULL,
                    disabled_cause TEXT
                );
                INSERT INTO auth_credentials VALUES ('openai-codex', NULL);
                INSERT INTO auth_credentials VALUES ('anthropic', 'logout');",
            )
            .unwrap();
        assert_eq!(
            active_provider_ids(&temp.path().join("agent.db")).unwrap(),
            vec!["openai-codex"]
        );
    }

    #[test]
    fn parses_scoped_models_and_rejects_catalog_leaks() {
        let output = br#"{"models":[
            {"provider":"openai-codex","id":"gpt-5.4","selector":"openai-codex/gpt-5.4","name":"GPT-5.4"},
            {"provider":"metarouter","id":"glm-5.2","selector":"metarouter/glm-5.2"}
        ]}"#;
        let models = parse_models_json(output, "openai-codex");
        assert_eq!(models.len(), 1);
        assert_eq!(models[0].model_id, "gpt-5.4");
    }

    #[test]
    fn resolves_agent_directory_from_pi_environment() {
        assert_eq!(
            agent_dir_from_env(Some(OsString::from("/tmp/custom-agent"))),
            PathBuf::from("/tmp/custom-agent")
        );
    }

    #[test]
    fn resolves_omp_from_path_without_shell_profile() {
        let temp = tempfile::tempdir().unwrap();
        let binary = temp.path().join("omp");
        std::fs::write(&binary, b"placeholder").unwrap();
        let path = env::join_paths([temp.path()]).unwrap();
        assert_eq!(find_omp_binary_in_path(Some(path)), Some(binary));
    }
}
