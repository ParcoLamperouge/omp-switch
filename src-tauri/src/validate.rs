use serde::Serialize;
use serde_yaml::Value;
use std::collections::HashSet;

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ValidationIssue {
    pub file: String,
    pub level: String,
    pub message: String,
}

pub fn validate_pair(models_yml: &str, config_yml: &str) -> Vec<ValidationIssue> {
    let mut issues = Vec::new();

    let models: Option<Value> = match serde_yaml::from_str(models_yml) {
        Ok(v) => Some(v),
        Err(e) => {
            issues.push(ValidationIssue {
                file: "models.yml".to_string(),
                level: "error".to_string(),
                message: format!("解析失败: {}", e),
            });
            None
        }
    };

    let config: Option<Value> = match serde_yaml::from_str(config_yml) {
        Ok(v) => Some(v),
        Err(e) => {
            issues.push(ValidationIssue {
                file: "config.yml".to_string(),
                level: "error".to_string(),
                message: format!("解析失败: {}", e),
            });
            None
        }
    };

    if let Some(m) = &models {
        if !m.is_mapping() {
            issues.push(ValidationIssue {
                file: "models.yml".to_string(),
                level: "error".to_string(),
                message: "models.yml 根节点必须是对象".to_string(),
            });
        }
    }

    if let Some(c) = &config {
        if !c.is_mapping() {
            issues.push(ValidationIssue {
                file: "config.yml".to_string(),
                level: "error".to_string(),
                message: "config.yml 根节点必须是对象".to_string(),
            });
        }
    }

    // If either file failed to parse or isn't a mapping, skip cross-reference checks
    // because we can't safely reason about structure.
    let models = match &models {
        Some(Value::Mapping(m)) => m,
        _ => return issues,
    };
    let config = match &config {
        Some(Value::Mapping(c)) => c,
        _ => return issues,
    };

    // Build provider -> model ids map.
    let mut provider_models: std::collections::HashMap<String, HashSet<String>> =
        std::collections::HashMap::new();
    let mut provider_names: HashSet<String> = HashSet::new();

    if let Some(Value::Mapping(providers)) = models.get("providers") {
        for (k, v) in providers {
            let provider_name = match k.as_str() {
                Some(s) => s.to_string(),
                None => continue,
            };
            provider_names.insert(provider_name.clone());
            let mut ids = HashSet::new();
            if let Some(Value::Sequence(models_list)) = v.get("models") {
                for m in models_list {
                    if let Some(mmap) = m.as_mapping() {
                        if let Some(Value::String(id)) = mmap.get("id") {
                            ids.insert(id.clone());
                        }
                    }
                }
            }
            provider_models.insert(provider_name, ids);
        }
    }

    // Helper to validate a provider/model reference.
    let mut check_ref = |raw: &str, ctx: &str| {
        let provider = raw.split('/').next().unwrap_or(raw);
        let provider = provider.split(':').next().unwrap_or(provider);
        if !provider_names.contains(provider) {
            issues.push(ValidationIssue {
                file: "config.yml".to_string(),
                level: "warning".to_string(),
                message: format!("{} 引用了 models.yml 中不存在的 provider '{}'", ctx, provider),
            });
            return;
        }
        // Extract model id, stripping effort suffix after ':'.
        let after_slash = raw.splitn(2, '/').nth(1).unwrap_or("");
        let model_id = after_slash.split(':').next().unwrap_or("");
        if model_id.is_empty() {
            return;
        }
        if let Some(ids) = provider_models.get(provider) {
            if !ids.contains(model_id) {
                issues.push(ValidationIssue {
                    file: "config.yml".to_string(),
                    level: "warning".to_string(),
                    message: format!(
                        "{} 引用了 provider '{}' 中不存在的 model '{}'",
                        ctx, provider, model_id
                    ),
                });
            }
        }
    };

    // enabledModels
    if let Some(Value::Sequence(list)) = config.get("enabledModels") {
        for item in list {
            if let Some(s) = item.as_str() {
                check_ref(s, "enabledModels");
            }
        }
    }

    // modelRoles values
    if let Some(Value::Mapping(roles)) = config.get("modelRoles") {
        for (_role, value) in roles {
            if let Some(s) = value.as_str() {
                check_ref(s, "modelRoles");
            }
        }
    }

    // modelProviderOrder
    if let Some(Value::Sequence(list)) = config.get("modelProviderOrder") {
        for item in list {
            if let Some(s) = item.as_str() {
                if !provider_names.contains(s) {
                    issues.push(ValidationIssue {
                        file: "config.yml".to_string(),
                        level: "warning".to_string(),
                        message: format!(
                            "modelProviderOrder 引用了 models.yml 中不存在的 provider '{}'",
                            s
                        ),
                    });
                }
            }
        }
    }

    issues
}

#[cfg(test)]
mod tests {
    use super::*;

    const MODELS: &str = r#"
providers:
  metarouter:
    baseUrl: https://example.com
    api: openai-responses
    apiKey: KEY
    models:
      - id: kimi-k3
      - id: kimi-k2.7-code-highspeed
      - id: glm-5.2
"#;

    const CONFIG: &str = r#"
modelRoles:
  default: metarouter/kimi-k3:xhigh
  fast: metarouter/kimi-k2.7-code-highspeed:high
enabledModels:
  - metarouter/kimi-k3
  - metarouter/glm-5.2
modelProviderOrder:
  - metarouter
"#;

    #[test]
    fn valid_pair() {
        let issues = validate_pair(MODELS, CONFIG);
        assert!(issues.is_empty(), "{:?}", issues);
    }

    #[test]
    fn parse_error_includes_line() {
        let bad_models = "providers:\n  - [unclosed";
        let issues = validate_pair(bad_models, "a: 1");
        assert!(issues.iter().any(|i| i.file == "models.yml" && i.level == "error"));
        assert!(issues.iter().any(|i| i.message.contains("line")));
    }

    #[test]
    fn dangling_provider() {
        let config = "modelRoles:\n  default: unknown/kimi-k3\nenabledModels:\n  - unknown/x\nmodelProviderOrder:\n  - unknown\n";
        let issues = validate_pair(MODELS, config);
        assert_eq!(issues.iter().filter(|i| i.message.contains("不存在的 provider")).count(), 3);
    }

    #[test]
    fn dangling_model() {
        let config = "modelRoles:\n  default: metarouter/not-exist\nenabledModels:\n  - metarouter/not-exist\n";
        let issues = validate_pair(MODELS, config);
        assert_eq!(issues.iter().filter(|i| i.message.contains("不存在的 model")).count(), 2);
    }

    #[test]
    fn effort_suffix_ignored() {
        let config = "modelRoles:\n  default: metarouter/kimi-k3:xhigh\nenabledModels:\n  - metarouter/kimi-k3:high\n";
        let issues = validate_pair(MODELS, config);
        assert!(issues.iter().all(|i| i.level != "error"));
        assert!(issues.is_empty(), "{:?}", issues);
    }

    #[test]
    fn non_mapping_root_error() {
        let issues = validate_pair("- a", "- b");
        assert!(issues.iter().any(|i| i.file == "models.yml" && i.message.contains("根节点必须是对象")));
        assert!(issues.iter().any(|i| i.file == "config.yml" && i.message.contains("根节点必须是对象")));
    }
}
