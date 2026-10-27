import { parse, parseDocument, stringify } from "yaml";

export interface ParsedModelRef {
  raw: string;
  provider: string;
  modelId: string;
  effort?: string;
}

export function parseModelRef(raw: string): ParsedModelRef {
  if (typeof raw !== "string") {
    return { raw: String(raw || ""), provider: "", modelId: String(raw || "") };
  }
  let provider = "";
  let rest = raw;

  if (raw.includes("/")) {
    const slashIdx = raw.indexOf("/");
    provider = raw.slice(0, slashIdx);
    rest = raw.slice(slashIdx + 1);
  }

  let modelId = rest;
  let effort: string | undefined = undefined;

  if (rest.includes(":")) {
    const colonIdx = rest.indexOf(":");
    modelId = rest.slice(0, colonIdx);
    effort = rest.slice(colonIdx + 1);
  }

  return {
    raw,
    provider,
    modelId,
    effort,
  };
}

export interface ParsedConfig {
  modelRoles: Record<string, ParsedModelRef>;
  enabledModels: ParsedModelRef[];
  modelProviderOrder: string[];
  otherEntries: [string, any][];
  error?: string;
}

export interface ProviderModel {
  id: string;
  name?: string;
  displayName?: string;
  contextWindow?: number;
  maxTokens?: number;
  [key: string]: any;
}

export interface ParsedProvider {
  name: string;
  baseUrl?: string;
  api?: string;
  hasApiKey: boolean;
  authenticated?: boolean;
  models: ProviderModel[];
}

export interface ParsedModels {
  providers: ParsedProvider[];
  error?: string;
}

export interface GroupedModelOption {
  provider: string;
  models: Array<{
    fullRef: string;
    modelId: string;
    displayName?: string;
  }>;
}

export const EFFORT_LEVELS = [
  { value: "", label: "默认" },
  { value: "low", label: "low" },
  { value: "medium", label: "med" },
  { value: "high", label: "high" },
  { value: "xhigh", label: "xhigh" },
  { value: "max", label: "max" },
];

export function parseConfigYaml(content: string): ParsedConfig {
  try {
    const data = parse(content);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return {
        modelRoles: {},
        enabledModels: [],
        modelProviderOrder: [],
        otherEntries: [],
      };
    }

    const modelRoles: Record<string, ParsedModelRef> = {};
    if (data.modelRoles && typeof data.modelRoles === "object" && !Array.isArray(data.modelRoles)) {
      for (const [role, val] of Object.entries(data.modelRoles)) {
        if (typeof val === "string") {
          modelRoles[role] = parseModelRef(val);
        }
      }
    }

    const enabledModels: ParsedModelRef[] = [];
    if (Array.isArray(data.enabledModels)) {
      for (const item of data.enabledModels) {
        if (typeof item === "string") {
          enabledModels.push(parseModelRef(item));
        }
      }
    }

    const modelProviderOrder: string[] = [];
    if (Array.isArray(data.modelProviderOrder)) {
      for (const item of data.modelProviderOrder) {
        if (typeof item === "string") {
          modelProviderOrder.push(item);
        }
      }
    }

    const knownKeys = new Set(["modelRoles", "enabledModels", "modelProviderOrder"]);
    const otherEntries = Object.entries(data).filter(([k]) => !knownKeys.has(k));

    return {
      modelRoles,
      enabledModels,
      modelProviderOrder,
      otherEntries,
    };
  } catch (err: any) {
    return {
      modelRoles: {},
      enabledModels: [],
      modelProviderOrder: [],
      otherEntries: [],
      error: err?.message || "YAML 解析失败",
    };
  }
}

export function parseModelsYaml(content: string): ParsedModels {
  try {
    const data = parse(content);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return { providers: [] };
    }

    const providers: ParsedProvider[] = [];
    if (data.providers && typeof data.providers === "object" && !Array.isArray(data.providers)) {
      for (const [name, val] of Object.entries(data.providers)) {
        if (val && typeof val === "object" && !Array.isArray(val)) {
          const providerObj = val as any;
          const models: ProviderModel[] = [];
          if (Array.isArray(providerObj.models)) {
            for (const m of providerObj.models) {
              if (typeof m === "string") {
                models.push({ id: m });
              } else if (m && typeof m === "object" && m.id) {
                models.push(m);
              }
            }
          }
          providers.push({
            name,
            baseUrl: providerObj.baseUrl,
            api: providerObj.api,
            hasApiKey: Boolean(providerObj.apiKey),
            models,
          });
        }
      }
    }

    return { providers };
  } catch (err: any) {
    return {
      providers: [],
      error: err?.message || "YAML 解析失败",
    };
  }
}

export interface DiscoveredModel {
  provider: string;
  modelId: string;
  displayName?: string;
}

/** Merge OMP's locally authenticated models into the models library view. */
export function mergeDiscoveredProviders(
  providers: ParsedProvider[],
  discoveredModels: DiscoveredModel[] = []
): ParsedProvider[] {
  const merged = providers.map((provider) => ({ ...provider, models: [...provider.models] }));
  const byProvider = new Map(merged.map((provider) => [provider.name, provider]));

  for (const model of discoveredModels) {
    if (!model.provider || !model.modelId) continue;

    let provider = byProvider.get(model.provider);
    if (!provider) {
      provider = {
        name: model.provider,
        hasApiKey: false,
        authenticated: true,
        models: [],
      };
      merged.push(provider);
      byProvider.set(provider.name, provider);
    } else {
      provider.authenticated = true;
    }

    if (!provider.models.some((item) => item.id === model.modelId)) {
      provider.models.push({ id: model.modelId, name: model.displayName });
    }
  }

  return merged;
}

export function getGroupedModelOptions(
  modelsYml: string,
  discoveredModels: DiscoveredModel[] = []
): GroupedModelOption[] {
  const parsed = parseModelsYaml(modelsYml);
  const groups = parsed.providers.map((p) => ({
    provider: p.name,
    models: p.models.map((m) => ({
      fullRef: `${p.name}/${m.id}`,
      modelId: m.id,
      displayName: m.displayName || m.name || m.id,
    })),
  }));
  const groupByProvider = new Map(groups.map((group) => [group.provider, group]));

  for (const model of discoveredModels) {
    if (!model.provider || !model.modelId) continue;
    let group = groupByProvider.get(model.provider);
    if (!group) {
      group = { provider: model.provider, models: [] };
      groups.push(group);
      groupByProvider.set(model.provider, group);
    }
    const fullRef = `${model.provider}/${model.modelId}`;
    if (!group.models.some((item) => item.fullRef === fullRef)) {
      group.models.push({
        fullRef,
        modelId: model.modelId,
        displayName: model.displayName || model.modelId,
      });
    }
  }

  return groups;
}

export function updateRoleInConfigYaml(
  configYml: string,
  role: string,
  fullModelStr: string
): string {
  try {
    const doc = parseDocument(configYml);
    if (!doc.contents || typeof doc.contents !== "object") {
      doc.set("modelRoles", { [role]: fullModelStr });
      return doc.toString();
    }
    doc.setIn(["modelRoles", role], fullModelStr);
    return doc.toString();
  } catch {
    const data = parse(configYml) || {};
    if (!data.modelRoles || typeof data.modelRoles !== "object") {
      data.modelRoles = {};
    }
    data.modelRoles[role] = fullModelStr;
    return stringify(data);
  }
}

export function deleteRoleInConfigYaml(configYml: string, role: string): string {
  try {
    const doc = parseDocument(configYml);
    doc.deleteIn(["modelRoles", role]);
    return doc.toString();
  } catch {
    const data = parse(configYml) || {};
    if (data.modelRoles && typeof data.modelRoles === "object") {
      delete data.modelRoles[role];
    }
    return stringify(data);
  }
}
export function updateEnabledModelsInConfigYaml(configYml: string, enabledModels: string[]): string {
  try {
    const doc = parseDocument(configYml);
    if (!doc.contents || typeof doc.contents !== "object") {
      doc.set("enabledModels", enabledModels);
      return doc.toString();
    }
    doc.set("enabledModels", enabledModels);
    return doc.toString();
  } catch {
    const data = parse(configYml) || {};
    data.enabledModels = enabledModels;
    return stringify(data);
  }
}
