import {
  AlertCircle,
  CheckCircle2,
  Code,
  Globe,
  KeyRound,
  Layers,
  Radio,
  Server,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useI18n } from "../lib/i18n";
import { parseModelsYaml } from "../lib/yamlUtils";

interface Props {
  modelsYml: string;
  onEdit: () => void;
}

export function ModelsVisualizer({ modelsYml, onEdit }: Props) {
  const { t } = useI18n();
  const [showRaw, setShowRaw] = useState(false);
  const parsed = useMemo(() => parseModelsYaml(modelsYml), [modelsYml]);

  if (parsed.error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-rose-200/80 bg-rose-50/50 p-6 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
        <AlertCircle className="mb-2 h-10 w-10 text-rose-500" />
        <h3 className="text-base font-semibold text-rose-700 dark:text-rose-400">
          {t("modelsParseError")}
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

  const providers = parsed.providers;
  const totalModels = providers.reduce((acc, p) => acc + p.models.length, 0);

  if (providers.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300/80 p-8 text-center dark:border-zinc-800">
        <Server className="mb-3 h-10 w-10 text-zinc-400 dark:text-zinc-600" />
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {t("noProvidersConfigured")}
        </h3>
        <p className="mt-1 text-xs text-zinc-500">
          {t("noProvidersSub")}
        </p>
        <button
          onClick={onEdit}
          className="mt-4 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-fg shadow-sm hover:bg-brand-hover transition"
        >
          {t("addProviderBtn")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto pr-1">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3.5">
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-app-card p-4 dark:border-app-border dark:bg-app-card shadow-2xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-muted text-brand">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {t("providersCountStat")}
            </div>
            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {providers.length} {t("unitsProviders")}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-app-card p-4 dark:border-app-border dark:bg-app-card shadow-2xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {t("availableModelsStat")}
            </div>
            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {totalModels} {t("unitsModels")}
            </div>
          </div>
        </div>
      </div>

      {/* Provider List */}
      <div className="space-y-4">
        {providers.map((provider) => (
          <div
            key={provider.name}
            className="rounded-2xl border border-zinc-200/80 bg-white p-4.5 shadow-2xs dark:border-app-border dark:bg-app-card"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800/70">
              <div className="flex items-center gap-2.5">
                <span className="rounded-xl bg-brand-muted border border-brand-muted-border px-3 py-1 text-sm font-bold text-brand-muted-fg">
                  {provider.name}
                </span>
                {provider.api && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    <Radio className="h-3 w-3" />
                    {provider.api}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs">
                {provider.hasApiKey ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <KeyRound className="h-3 w-3" />
                    {t("keyConfigured")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    {t("noKey")}
                  </span>
                )}
              </div>
            </div>

            {provider.baseUrl && (
              <div className="mt-2.5 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <Globe className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span className="truncate font-mono">{provider.baseUrl}</span>
              </div>
            )}

            <div className="mt-3.5">
              <div className="mb-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                {t("modelsListTitle")} ({provider.models.length})
              </div>
              {provider.models.length === 0 ? (
                <div className="text-xs text-zinc-400 italic">{t("noModelsInProvider")}</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {provider.models.map((m) => (
                    <div
                      key={m.id}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200/90 bg-zinc-50/60 px-3 py-1.5 font-mono text-xs text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200 shadow-2xs"
                    >
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      <span className="font-semibold">{m.id}</span>
                      {m.name && m.name !== m.id && (
                        <span className="text-[10px] text-zinc-400">({m.name})</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Readonly Raw YAML Collapsible */}
      <div className="mt-auto border-t border-zinc-100 pt-3 dark:border-zinc-800/70">
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition"
        >
          <Code className="h-3.5 w-3.5" />
          <span>{showRaw ? t("hideRawModelsYaml") : t("viewRawModelsYaml")}</span>
        </button>

        {showRaw && (
          <pre className="mt-2 max-h-60 overflow-auto rounded-xl border border-zinc-200/80 bg-zinc-50 p-3.5 font-mono text-xs leading-relaxed text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
            {modelsYml}
          </pre>
        )}
      </div>
    </div>
  );
}
