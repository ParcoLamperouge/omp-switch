import {
  Check,
  Globe,
  Monitor,
  Moon,
  Palette,
  Settings,
  Sun,
  X,
} from "lucide-react";
import { useEffect } from "react";
import { useI18n } from "../lib/i18n";
import type { ColorScheme, ThemeMode } from "../lib/theme";
import { useTheme } from "../lib/theme";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: Props) {
  const { lang, setLang, t } = useI18n();
  const { mode, setMode, colorScheme, setColorScheme } = useTheme();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const colorSchemes: { id: ColorScheme; labelKey: "themeDefault" | "themeOcean" | "themeAmethyst"; color: string; ring: string }[] = [
    {
      id: "default",
      labelKey: "themeDefault",
      color: "bg-blue-600",
      ring: "ring-blue-500",
    },
    {
      id: "ocean",
      labelKey: "themeOcean",
      color: "bg-cyan-600",
      ring: "ring-cyan-500",
    },
    {
      id: "amethyst",
      labelKey: "themeAmethyst",
      color: "bg-purple-600",
      ring: "ring-purple-500",
    },
  ];

  const modes: { id: ThemeMode; labelKey: "themeSystem" | "themeLight" | "themeDark"; icon: typeof Monitor }[] = [
    { id: "system", labelKey: "themeSystem", icon: Monitor },
    { id: "light", labelKey: "themeLight", icon: Sun },
    { id: "dark", labelKey: "themeDark", icon: Moon },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md rounded-3xl border border-app-border bg-app-modal p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-app-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-muted text-brand">
              <Settings className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {t("settingsModalTitle")}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-zinc-400 hover:bg-app-card-subtle hover:text-zinc-700 dark:hover:bg-app-card-subtle dark:hover:text-zinc-200 transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden"
            aria-label={t("closeSettings")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4.5 py-4 max-h-[70vh] overflow-y-auto">
          {/* Appearance Mode (System / Light / Dark) */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-300">
              <Sun className="h-4 w-4 text-brand" />
              <span>{t("appearanceMode")}</span>
            </label>

            <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-app-border bg-app-card-subtle p-1">
              {modes.map((m) => {
                const Icon = m.icon;
                const isSelected = mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden ${
                      isSelected
                        ? "bg-app-modal text-zinc-900 shadow-xs dark:bg-app-card dark:text-zinc-100 font-bold"
                        : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{t(m.labelKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Schemes */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-300">
              <Palette className="h-4 w-4 text-brand" />
              <span>{t("colorSchemeTitle")}</span>
            </label>

            <div className="grid grid-cols-3 gap-2">
              {colorSchemes.map((cs) => {
                const isSelected = colorScheme === cs.id;
                return (
                  <button
                    key={cs.id}
                    type="button"
                    onClick={() => setColorScheme(cs.id)}
                    className={`flex flex-col items-center gap-2 rounded-2xl border p-2.5 text-center transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden ${
                      isSelected
                        ? "border-brand bg-brand-muted ring-1 ring-brand"
                        : "border-app-border bg-app-card hover:border-brand/40 dark:bg-app-card"
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <span className={`h-5 w-5 rounded-full ${cs.color} shadow-xs flex items-center justify-center text-white`}>
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">
                      {t(cs.labelKey)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Language Setting */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-300">
              <Globe className="h-4 w-4 text-brand" />
              <span>{t("languageSetting")}</span>
            </label>

            <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-app-border bg-app-card-subtle p-1">
              <button
                type="button"
                onClick={() => setLang("zh")}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden ${
                  lang === "zh"
                    ? "bg-app-modal text-brand shadow-xs dark:bg-app-card dark:text-brand font-bold"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {lang === "zh" && <Check className="h-3.5 w-3.5" />}
                <span>简体中文</span>
              </button>

              <button
                type="button"
                onClick={() => setLang("en")}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden ${
                  lang === "en"
                    ? "bg-app-modal text-brand shadow-xs dark:bg-app-card dark:text-brand font-bold"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {lang === "en" && <Check className="h-3.5 w-3.5" />}
                <span>English</span>
              </button>
            </div>
          </div>

          {/* About section */}
          <div className="rounded-2xl border border-app-border bg-app-card-subtle p-3.5 flex items-center gap-3">
            <img src="/icon.svg" alt="omp-switch" className="h-10 w-10 rounded-xl shadow-xs shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300">
                <span>{t("appName")}</span>
                <span className="font-mono text-[11px] font-normal text-zinc-400">v0.1.0</span>
              </div>
              <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed truncate">
                OpenCode / OMP Model & Config Switcher.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-app-border">
          <button
            onClick={onClose}
            className="rounded-xl bg-brand px-4.5 py-1.5 text-xs font-bold text-brand-fg shadow-xs hover:bg-brand-hover transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden"
          >
            {t("closeSettings")}
          </button>
        </div>
      </div>
    </div>
  );
}
