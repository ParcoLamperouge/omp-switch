import {
  Check,
  CheckCircle2,
  Edit3,
  ExternalLink,
  RotateCcw,
  Save,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { DiscoveredModel, Profile, ValidationIssue } from "../lib/api";
import { updateProfile, updateProfileConfig, validatePair } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { ConfigVisualizer } from "./ConfigVisualizer";
import { ValidationPanel } from "./ValidationPanel";

interface Props {
  profile: Profile;
  globalModelsYml: string;
  discoveredModels: DiscoveredModel[];
  activeId: string | null;
  effectiveId: string | null;
  onChange: () => void;
  onOpenModels?: () => void;
  onApply?: () => void | Promise<void>;
}

export function Editor({
  profile,
  globalModelsYml,
  discoveredModels,
  activeId,
  effectiveId,
  onChange,
  onOpenModels,
  onApply,
}: Props) {
  const { t } = useI18n();
  const [name, setName] = useState(profile.name);
  const [configYml, setConfigYml] = useState(profile.configYml);
  const [savedConfigYml, setSavedConfigYml] = useState(profile.configYml);
  const [isEditing, setIsEditing] = useState(false);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    setName(profile.name);
    setConfigYml(profile.configYml);
    setSavedConfigYml(profile.configYml);
    setIsEditing(false);
    setSaveError(null);
  }, [profile]);

  useEffect(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      validatePair(globalModelsYml, configYml, discoveredModels).then(setIssues);
    }, 500);
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [globalModelsYml, configYml, discoveredModels]);

  async function handleSave() {
    setSaveError(null);
    setSaving(true);
    try {
      await updateProfile(profile.id, name, globalModelsYml, configYml);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      setIsEditing(false);
      onChange();
    } catch (e) {
      setSaveError(String(e));
    } finally {
      setSaving(false);
    }
  }

  function handleCancelEdit() {
    setName(profile.name);
    setConfigYml(savedConfigYml);
    setIsEditing(false);
    setSaveError(null);
  }

  async function handleVisualSave() {
    setSaveError(null);
    setSaving(true);
    try {
      await updateProfileConfig(profile.id, configYml);
      setSavedConfigYml(configYml);
      setSaveSuccess(true);
      window.setTimeout(() => setSaveSuccess(false), 2000);
      await onApply?.();
    } catch (e) {
      setSaveError(String(e));
    } finally {
      setSaving(false);
    }
  }

  function handleVisualConfigChange(newConfigYml: string) {
    setConfigYml(newConfigYml);
    setSaveError(null);
  }

  const isDirty = name !== profile.name || configYml !== savedConfigYml;
  const isEffective = effectiveId === profile.id;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (isDirty && !saving) {
          handleSave();
        }
      }
      if (e.key === "Escape" && isEditing) {
        e.preventDefault();
        handleCancelEdit();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDirty, saving, isEditing, name, configYml]);

  return (
    <div className="flex h-full flex-col gap-3.5 overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border pb-3.5">
        <div className="flex flex-1 items-center gap-2.5 min-w-[240px]">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              if (name !== profile.name) {
                handleSave();
              }
            }}
            placeholder={t("profileNamePlaceholder")}
            className="flex-1 rounded-xl border border-app-border bg-app-card px-3.5 py-1.5 text-base font-bold text-zinc-900 focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none dark:text-zinc-100 transition"
          />

          {isEffective ? (
            <span className="flex items-center gap-1.5 shrink-0 rounded-full border border-emerald-300/80 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:border-emerald-800/80 dark:bg-emerald-950/40 dark:text-emerald-200 shadow-2xs">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{t("activeStatus")}</span>
            </span>
          ) : activeId === profile.id ? (
            <span
              title={t("lastSwitchedTooltip")}
              className="shrink-0 rounded-full bg-zinc-200/80 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {t("lastSwitchedStatus")}
            </span>
          ) : null}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {onOpenModels && !isEditing && (
            <button
              onClick={onOpenModels}
              className="flex items-center gap-1.5 rounded-xl border border-app-border bg-app-card px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-brand/40 hover:bg-app-card-subtle dark:text-zinc-200 transition shadow-2xs focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden"
              title={t("modelsManagerTitle")}
            >
              <span>{t("viewModelsLibraryBtn")}</span>
              <ExternalLink className="h-3 w-3 opacity-70" />
            </button>
          )}

          {isEditing ? (
            <>
              <button
                onClick={handleCancelEdit}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-xl border border-app-border bg-app-card px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-app-card-subtle dark:text-zinc-200 transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{isDirty ? t("discardChangesBtn") : t("exitEditBtn")}</span>
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !isDirty}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-semibold shadow-sm transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden ${
                  isDirty
                    ? "bg-brand hover:bg-brand-hover active:scale-[0.98] text-brand-fg"
                    : "cursor-not-allowed bg-zinc-400 dark:bg-zinc-700 text-white"
                }`}
              >
                {saveSuccess ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>{t("savedBtn")}</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>{saving ? t("savingBtn") : t("saveConfigBtn")}</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="rounded-xl border border-app-border bg-app-card p-2 text-zinc-700 hover:bg-app-card-subtle hover:border-brand/40 dark:text-zinc-200 transition shadow-2xs focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden"
              title={t("editConfigBtn")}
              aria-label={t("editConfigBtn")}
            >
              <Edit3 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden min-h-0">
        {isEditing ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            <textarea
              value={configYml}
              onChange={(e) => setConfigYml(e.target.value)}
              spellCheck={false}
              placeholder={t("configPlaceholder")}
              className="flex-1 w-full resize-none rounded-2xl border border-app-border bg-app-card p-4 font-mono text-sm leading-relaxed text-zinc-900 focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none dark:text-zinc-100 shadow-2xs"
            />
            <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
              <span className="font-mono">config.yml</span>
              <span>{isDirty ? t("hasUnsavedChanges") : t("syncedBadge")}</span>
            </div>
          </div>
        ) : (
          <ConfigVisualizer
            configYml={configYml}
            modelsYml={globalModelsYml}
            discoveredModels={discoveredModels}
            onUpdateConfigYml={handleVisualConfigChange}
            onSaveChanges={handleVisualSave}
            onDiscardChanges={handleCancelEdit}
            hasUnsavedChanges={isDirty}
            saving={saving}
            onEdit={() => setIsEditing(true)}
          />
        )}
      </div>

      {/* Save Error Alert */}
      {saveError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
          {saveError}
        </div>
      )}

      {/* Validation Panel */}
      <ValidationPanel issues={issues} />
    </div>
  );
}
