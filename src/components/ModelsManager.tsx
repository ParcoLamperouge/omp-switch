import {
  AlertCircle,
  Check,
  Edit3,
  FileCode,
  RotateCcw,
  Save,
  Server,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "../lib/i18n";
import { parseModelsYaml } from "../lib/yamlUtils";
import { ModelsVisualizer } from "./ModelsVisualizer";

interface Props {
  modelsYml: string;
  onSave: (newModelsYml: string) => Promise<void>;
}

export function ModelsManager({ modelsYml, onSave }: Props) {
  const { t } = useI18n();
  const [content, setContent] = useState(modelsYml);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setContent(modelsYml);
    setIsEditing(false);
    setError(null);
  }, [modelsYml]);

  const isDirty = content !== modelsYml;

  async function handleSave() {
    setError(null);
    const parsed = parseModelsYaml(content);
    if (parsed.error) {
      setError(`YAML Error: ${parsed.error}`);
      return;
    }

    setSaving(true);
    try {
      await onSave(content);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      setIsEditing(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setContent(modelsYml);
    setIsEditing(false);
    setError(null);
  }

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
        handleCancel();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDirty, saving, isEditing, content]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border pb-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-muted text-brand">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {t("modelsManagerTitle")}
              </h2>
              <span className="rounded-md bg-brand-muted border border-brand-muted-border px-2 py-0.5 text-xs font-bold text-brand-muted-fg">
                {t("modelsLibrarySub")}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t("modelsManagerSub")}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-app-border dark:bg-app-card dark:text-zinc-200 dark:hover:bg-app-card-subtle transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{isDirty ? t("discardChangesBtn") : t("exitEditBtn")}</span>
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !isDirty}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden ${
                  isDirty
                    ? "bg-brand hover:bg-brand-hover active:scale-[0.98] text-brand-fg"
                    : "cursor-not-allowed bg-zinc-400 dark:bg-zinc-700"
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
                    <span>{saving ? t("savingBtn") : t("saveModelsBtn")}</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-1.5 text-xs font-semibold text-brand-fg shadow-xs hover:bg-brand-hover active:scale-[0.98] transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>{t("editModelsBtn")}</span>
            </button>
          )}
        </div>
      </div>


      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden min-h-0">
        {isEditing ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-1 text-brand font-medium">
                <FileCode className="h-3.5 w-3.5" />
                {t("editingModelsBadge")}
              </span>
              <span>{isDirty ? t("hasUnsavedChanges") : t("syncedBadge")}</span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              spellCheck={false}
              placeholder={t("modelsPlaceholder")}
              className="flex-1 w-full resize-none rounded-2xl border border-zinc-300/90 bg-white p-4 font-mono text-sm leading-relaxed text-zinc-900 focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none dark:border-app-border dark:bg-app-card dark:text-zinc-100 shadow-2xs"
            />
          </div>
        ) : (
          <ModelsVisualizer
            modelsYml={modelsYml}
            onEdit={() => setIsEditing(true)}
          />
        )}
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
