import {
  AlertCircle,
  ArrowRight,
  Bot,
  Brain,
  CheckCircle2,
  Code,
  Layers,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useI18n } from "../lib/i18n";
import {
  deleteRoleInConfigYaml,
  EFFORT_LEVELS,
  getGroupedModelOptions,
  parseConfigYaml,
  updateRoleInConfigYaml,
} from "../lib/yamlUtils";

interface Props {
  configYml: string;
  modelsYml: string;
  onUpdateConfigYml?: (newConfigYml: string) => void;
  onEdit: () => void;
}

export function ConfigVisualizer({
  configYml,
  modelsYml,
  onUpdateConfigYml,
  onEdit,
}: Props) {
  const { t } = useI18n();
  const [showRaw, setShowRaw] = useState(false);
  const [addingRole, setAddingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleModel, setNewRoleModel] = useState("");
  const [newRoleEffort, setNewRoleEffort] = useState("");

  const parsed = useMemo(() => parseConfigYaml(configYml), [configYml]);
  const groupedModelOptions = useMemo(
    () => getGroupedModelOptions(modelsYml),
    [modelsYml]
  );

  const allAvailableRefs = useMemo(() => {
    const refs = new Set<string>();
    for (const group of groupedModelOptions) {
      for (const m of group.models) {
        refs.add(m.fullRef);
      }
    }
    return refs;
  }, [groupedModelOptions]);

  const firstModelRef = useMemo(() => {
    return groupedModelOptions[0]?.models[0]?.fullRef || "";
  }, [groupedModelOptions]);

  if (parsed.error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-rose-200/80 bg-rose-50/50 p-6 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
        <AlertCircle className="mb-2 h-10 w-10 text-rose-500" />
        <h3 className="text-base font-semibold text-rose-700 dark:text-rose-400">
          {t("configParseError")}
        </h3>
        <p className="mt-1 max-w-md font-mono text-xs text-rose-600 dark:text-rose-300">
          {parsed.error}
        </p>
        <button
          onClick={onEdit}
          className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 transition"
        >
          {t("fixNowBtn")}
        </button>
      </div>
    );
  }

  const roleEntries = Object.entries(parsed.modelRoles);
  const totalEnabled = parsed.enabledModels.length;
  const totalRoles = roleEntries.length;

  function handleModelChange(role: string, newBaseModel: string, currentEffort?: string) {
    if (!onUpdateConfigYml) return;
    const fullStr = currentEffort ? `${newBaseModel}:${currentEffort}` : newBaseModel;
    const newYml = updateRoleInConfigYaml(configYml, role, fullStr);
    onUpdateConfigYml(newYml);
  }

  function handleEffortChange(role: string, currentBaseModel: string, newEffort: string) {
    if (!onUpdateConfigYml) return;
    const fullStr = newEffort ? `${currentBaseModel}:${newEffort}` : currentBaseModel;
    const newYml = updateRoleInConfigYaml(configYml, role, fullStr);
    onUpdateConfigYml(newYml);
  }

  function handleDeleteRole(role: string) {
    if (!onUpdateConfigYml) return;
    const newYml = deleteRoleInConfigYaml(configYml, role);
    onUpdateConfigYml(newYml);
  }

  function handleAddRoleSubmit() {
    if (!onUpdateConfigYml) return;
    const trimmed = newRoleName.trim();
    if (!trimmed) return;
    const modelToUse = newRoleModel || firstModelRef;
    const fullStr = newRoleEffort ? `${modelToUse}:${newRoleEffort}` : modelToUse;
    const newYml = updateRoleInConfigYaml(configYml, trimmed, fullStr);
    onUpdateConfigYml(newYml);
    setNewRoleName("");
    setNewRoleModel("");
    setNewRoleEffort("");
    setAddingRole(false);
  }

  const isEmpty = totalRoles === 0 && totalEnabled === 0 && parsed.modelProviderOrder.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300/80 p-8 text-center dark:border-zinc-800">
        <Bot className="mb-3 h-10 w-10 text-zinc-400 dark:text-zinc-600" />
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {t("noModelsConfigured")}
        </h3>
        <p className="mt-1 text-xs text-zinc-500">
          {t("noModelsConfiguredSub")}
        </p>
        <button
          onClick={onEdit}
          className="mt-4 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-fg shadow-sm hover:bg-brand-hover transition"
        >
          {t("startConfigBtn")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
      {/* Model Roles Section */}
      <div className="rounded-2xl border border-zinc-200/80 bg-app-card p-4.5 shadow-2xs dark:border-app-border dark:bg-app-card">
        <div className="mb-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand" />
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              {t("modelRolesTitle")}
            </h3>
          </div>
          {onUpdateConfigYml && (
            <button
              onClick={() => setAddingRole(!addingRole)}
              className="flex items-center gap-1 rounded-xl bg-brand-muted border border-brand-muted-border px-3 py-1 text-xs font-bold text-brand-muted-fg hover:bg-brand/15 transition shadow-2xs"
            >
              <Plus className="h-3 w-3" />
              <span>{t("addRoleBtn")}</span>
            </button>
          )}
        </div>

        {/* Add Role Inline Form */}
        {addingRole && (
          <div className="mb-4 rounded-xl border border-brand-muted-border bg-brand-muted p-3.5">
            <div className="mb-2.5 text-xs font-bold text-brand-muted-fg">
              {t("addRoleTitle")}
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <input
                autoFocus
                placeholder={t("roleNamePlaceholder")}
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddRoleSubmit();
                  if (e.key === "Escape") setAddingRole(false);
                }}
                className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-brand focus:outline-none dark:border-zinc-700 dark:bg-app-card-subtle dark:text-zinc-100"
              />
              <select
                value={newRoleModel || firstModelRef}
                onChange={(e) => setNewRoleModel(e.target.value)}
                className="rounded-xl border border-zinc-300 bg-white px-3 py-2 font-mono text-xs text-zinc-900 focus:border-brand focus:outline-none dark:border-zinc-700 dark:bg-app-card-subtle dark:text-zinc-100"
              >
                {groupedModelOptions.map((group) => (
                  <optgroup key={group.provider} label={`${group.provider}`}>
                    {group.models.map((m) => (
                      <option key={m.fullRef} value={m.fullRef}>
                        {m.fullRef}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <div className="flex items-center rounded-xl border border-zinc-300 bg-white p-1 dark:border-zinc-700 dark:bg-app-card-subtle overflow-x-auto">
                {EFFORT_LEVELS.map((eff) => {
                  const isSelected = (newRoleEffort || "") === eff.value;
                  return (
                    <button
                      key={eff.value}
                      type="button"
                      onClick={() => setNewRoleEffort(eff.value)}
                      className={`flex-1 min-w-[36px] rounded-lg px-1.5 py-1 text-center text-[11px] font-medium transition ${
                        isSelected
                          ? "bg-zinc-900 text-white font-semibold shadow-xs dark:bg-zinc-100 dark:text-zinc-900"
                          : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {eff.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                onClick={() => setAddingRole(false)}
                className="rounded-lg px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800 transition"
              >
                {t("cancelBtn")}
              </button>
              <button
                onClick={handleAddRoleSubmit}
                disabled={!newRoleName.trim()}
                className="rounded-lg bg-brand px-3.5 py-1 text-xs font-semibold text-brand-fg hover:bg-brand-hover disabled:bg-zinc-400 transition"
              >
                {t("confirmBtn")}
              </button>
            </div>
          </div>
        )}

        {/* Roles List with Large Model Select and Segmented Effort Buttons */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {roleEntries.map(([role, ref]) => {
            const baseModelRef = ref.provider ? `${ref.provider}/${ref.modelId}` : ref.modelId;
            const isKnownModel = allAvailableRefs.has(baseModelRef);
            const currentEffort = ref.effort || "";

            return (
              <div
                key={role}
                className="flex flex-col justify-between rounded-2xl border border-app-border bg-app-card p-4 transition duration-150 hover:border-brand/40 shadow-2xs"
              >
                {/* Role Header */}
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-app-border">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-bold ${
                        role === "default"
                          ? "bg-brand-muted text-brand-muted-fg border border-brand-muted-border"
                          : role === "fast"
                          ? "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200/70 dark:border-sky-800/60"
                          : "bg-app-card-subtle text-zinc-700 dark:text-zinc-300 border border-app-border"
                      }`}
                    >
                      {role}
                    </span>
                    {role === "default" && (
                      <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                        ({t("defaultPrimaryModel")})
                      </span>
                    )}
                  </div>

                  {onUpdateConfigYml && role !== "default" && (
                    <button
                      onClick={() => handleDeleteRole(role)}
                      className="rounded-lg p-1 text-zinc-500 hover:text-rose-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-rose-400 dark:hover:bg-zinc-800 transition focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-hidden"
                      title={t("deleteProfile")}
                      aria-label={t("deleteProfile")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Controls Area */}
                <div className="space-y-3 pt-3">
                  {/* Large Model Selector */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      {t("selectModelLabel")}
                    </label>
                    <div className="relative">
                      <select
                        value={baseModelRef}
                        onChange={(e) => handleModelChange(role, e.target.value, ref.effort)}
                        className="w-full appearance-none rounded-xl border border-app-border bg-app-card py-2.5 pl-3.5 pr-8 font-mono text-sm font-semibold text-zinc-900 shadow-2xs transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:bg-app-card-subtle dark:text-zinc-100"
                      >
                        {!isKnownModel && (
                          <option value={baseModelRef}>
                            {baseModelRef} ({t("customCurrentOption")})
                          </option>
                        )}
                        {groupedModelOptions.map((group) => (
                          <optgroup key={group.provider} label={`${group.provider}`}>
                            {group.models.map((m) => (
                              <option key={m.fullRef} value={m.fullRef}>
                                {m.fullRef} {m.displayName && m.displayName !== m.modelId ? `(${m.displayName})` : ""}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-zinc-400 dark:text-zinc-500">
                        <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Segmented Effort Buttons */}
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      <Brain className="h-3.5 w-3.5 text-brand" />
                      <span>{t("thinkingEffortLabel")}</span>
                    </label>
                    <div className="grid grid-cols-6 rounded-xl border border-app-border bg-app-card-subtle p-0.5">
                      {EFFORT_LEVELS.map((eff) => {
                        const isSelected = currentEffort === eff.value;
                        return (
                          <button
                            key={eff.value}
                            type="button"
                            onClick={() => handleEffortChange(role, baseModelRef, eff.value)}
                            className={`rounded-lg py-1.5 text-center text-xs font-medium transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden ${
                              isSelected
                                ? "bg-brand text-brand-fg font-semibold shadow-xs"
                                : "text-zinc-600 hover:text-zinc-900 hover:bg-app-card dark:text-zinc-400 dark:hover:text-zinc-100"
                            }`}
                          >
                            {eff.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Enabled Models Section */}
      {totalEnabled > 0 && (
        <div className="rounded-2xl border border-app-border bg-app-card p-4 shadow-2xs">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                {t("enabledModelsTitle")}
              </h3>
            </div>
            <span className="rounded-full bg-app-card-subtle border border-app-border px-2 py-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {t("totalCount", { count: totalEnabled })}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {parsed.enabledModels.map((ref, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-1.5 rounded-xl border border-app-border bg-app-card-subtle px-2.5 py-1.5 font-mono text-xs text-zinc-800 shadow-2xs dark:text-zinc-200"
              >
                {ref.provider && (
                  <span className="rounded-md bg-app-card border border-app-border px-1.5 py-0.5 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                    {ref.provider}
                  </span>
                )}
                <span className="font-medium">{ref.modelId}</span>
                {ref.effort && (
                  <span className="text-[10px] font-bold text-brand">
                    :{ref.effort}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Provider Priority Order Section */}
      {parsed.modelProviderOrder.length > 0 && (
        <div className="rounded-2xl border border-app-border bg-app-card p-4 shadow-2xs">
          <div className="mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              {t("providerOrderTitle")}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {parsed.modelProviderOrder.map((provider, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-xl border border-brand-muted-border bg-brand-muted px-3 py-1 text-xs font-bold text-brand-muted-fg">
                  <span className="text-[10px] opacity-75">#{idx + 1}</span>
                  {provider}
                </span>
                {idx < parsed.modelProviderOrder.length - 1 && (
                  <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other Config Entries if any */}
      {parsed.otherEntries.length > 0 && (
        <div className="rounded-2xl border border-app-border bg-app-card p-4 shadow-2xs">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            {t("otherConfigTitle")}
          </h3>
          <div className="space-y-1.5">
            {parsed.otherEntries.map(([key, val]) => (
              <div
                key={key}
                className="flex items-start justify-between rounded-xl bg-app-card-subtle border border-app-border px-3 py-1.5 text-xs"
              >
                <span className="font-mono font-medium text-zinc-600 dark:text-zinc-400">
                  {key}
                </span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200 max-w-xs truncate">
                  {typeof val === "object" ? JSON.stringify(val) : String(val)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Readonly Raw YAML Collapsible */}
      <div className="mt-auto border-t border-app-border pt-3">
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition"
        >
          <Code className="h-3.5 w-3.5" />
          <span>{showRaw ? t("hideRawYaml") : t("viewRawYaml")}</span>
        </button>

        {showRaw && (
          <pre className="mt-2 max-h-60 overflow-auto rounded-xl border border-app-border bg-app-card p-3.5 font-mono text-xs leading-relaxed text-zinc-800 dark:text-zinc-300">
            {configYml}
          </pre>
        )}
      </div>
    </div>
  );
}
