import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Editor } from "./components/Editor";
import { ModelsManager } from "./components/ModelsManager";
import { ProfileList } from "./components/ProfileList";
import { SettingsModal } from "./components/SettingsModal";
import type { LiveStatus, Profile, ProfileMeta } from "./lib/api";
import {
  checkRunning,
  createProfile,
  deleteProfile,
  duplicateProfile,
  getStatus,
  importLive,
  listProfiles,
  readGlobalModels,
  readProfile,
  revealLiveDir,
  saveGlobalModels,
  switchProfile,
} from "./lib/api";
import { I18nProvider, useI18n } from "./lib/i18n";
import { ThemeProvider } from "./lib/theme";

const PLACEHOLDER_CONFIG = `enabledModels:
  - placeholder/provider-model
modelRoles:
  default: placeholder/provider-model
`;

function MainLayout() {
  const { t } = useI18n();
  const [profiles, setProfiles] = useState<ProfileMeta[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [globalModelsYml, setGlobalModelsYml] = useState<string>("providers:\n");
  const [activeView, setActiveView] = useState<"profile" | "models">("profile");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [status, setStatus] = useState<LiveStatus>({
    activeId: null,
    effectiveId: null,
    drift: false,
    liveExists: false,
  });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{
    type: "info" | "success" | "error";
    text: string;
  } | null>(null);

  const toastTimerRef = useRef<number | null>(null);

  async function loadAll(selectId?: string) {
    try {
      const [profilesList, currentStatus, modelsContent] = await Promise.all([
        listProfiles(),
        getStatus(),
        readGlobalModels(),
      ]);
      setProfiles(profilesList);
      setStatus(currentStatus);
      setGlobalModelsYml(modelsContent);

      let nextId: string | null = selectId ?? null;
      if (!nextId) {
        const stillExists = profilesList.some((p) => p.id === selectedId);
        if (stillExists) {
          nextId = selectedId;
        } else {
          const activeValid = profilesList.some((p) => p.id === currentStatus.activeId);
          nextId = activeValid ? currentStatus.activeId : profilesList[0]?.id ?? null;
        }
      }

      if (nextId) {
        setSelectedId(nextId);
        try {
          const p = await readProfile(nextId);
          setProfile(p);
        } catch {
          setSelectedId(null);
          setProfile(null);
        }
      } else {
        setSelectedId(null);
        setProfile(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setProfile(null);
      return;
    }
    readProfile(selectedId).then(setProfile).catch(() => setProfile(null));
  }, [selectedId]);

  async function handleSwitchProfile(id: string) {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    try {
      const procs = await checkRunning();
      await switchProfile(id);
      await loadAll(id);

      if (procs.length > 0) {
        setToast({
          type: "info",
          text: t("ompRunningNotice"),
        });
      } else {
        setToast({
          type: "success",
          text: t("switchSuccessNotice"),
        });
      }

      toastTimerRef.current = window.setTimeout(() => {
        setToast(null);
      }, 3000);
    } catch (e) {
      setToast({
        type: "error",
        text: `Switch error: ${String(e)}`,
      });
      toastTimerRef.current = window.setTimeout(() => {
        setToast(null);
      }, 3000);
    }
  }

  async function handleCreate(name: string) {
    if (!name.trim()) return;
    try {
      const meta = await createProfile(name.trim(), globalModelsYml, PLACEHOLDER_CONFIG);
      setActiveView("profile");
      await loadAll(meta.id);
    } catch (e) {
      alert(String(e));
    }
  }

  async function handleImport(name: string) {
    if (!name.trim()) return;
    try {
      const meta = await importLive(name.trim());
      setActiveView("profile");
      await loadAll(meta.id);
    } catch (e) {
      alert(String(e));
    }
  }

  async function handleDuplicate(id: string, name: string) {
    if (!name.trim()) return;
    try {
      const meta = await duplicateProfile(id, name.trim());
      setActiveView("profile");
      await loadAll(meta.id);
    } catch (e) {
      alert(String(e));
    }
  }

  async function handleRevealLive() {
    try {
      await revealLiveDir();
    } catch (e) {
      alert(String(e));
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteProfile(id);
      const remaining = profiles.filter((p) => p.id !== id);
      const nextId = selectedId === id ? remaining[0]?.id ?? null : selectedId;
      await loadAll(nextId ?? undefined);
    } catch (e) {
      console.error(e);
      alert(`Delete error: ${String(e)}`);
    }
  }

  async function handleSaveGlobalModels(newModelsYml: string) {
    await saveGlobalModels(newModelsYml);
    setGlobalModelsYml(newModelsYml);
    const currentStatus = await getStatus();
    setStatus(currentStatus);
  }

  function handleSelectProfile(id: string) {
    setSelectedId(id);
    setActiveView("profile");
  }

  function handleSelectModels() {
    setActiveView("models");
  }

  if (loading) {
    return (
      <main className="flex h-screen items-center justify-center">
        <span className="text-zinc-500">{t("loading")}</span>
      </main>
    );
  }

  return (
    <main className="relative flex h-screen overflow-hidden bg-app-bg">
      {/* Floating Global Toast */}
      {toast && (
        <div className="absolute top-4 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-none">
          <div
            className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-bold shadow-lg backdrop-blur-md ${
              toast.type === "info"
                ? "border-amber-300/80 bg-amber-50/95 text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/90 dark:text-amber-200"
                : toast.type === "success"
                ? "border-emerald-300/80 bg-emerald-50/95 text-emerald-900 dark:border-emerald-800/80 dark:bg-emerald-950/90 dark:text-emerald-200"
                : "border-rose-300/80 bg-rose-50/95 text-rose-900 dark:border-rose-800/80 dark:bg-rose-950/90 dark:text-rose-200"
            }`}
          >
            {toast.type === "info" && (
              <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            )}
            {toast.type === "success" && (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            )}
            {toast.type === "error" && (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      <aside className="w-72 shrink-0 bg-app-sidebar">
        <ProfileList
          profiles={profiles}
          selectedId={selectedId}
          activeView={activeView}
          status={status}
          onSelectProfile={handleSelectProfile}
          onSelectModels={handleSelectModels}
          onSwitchProfile={handleSwitchProfile}
          onCreate={handleCreate}
          onImport={handleImport}
          onDuplicate={handleDuplicate}
          onRevealLive={handleRevealLive}
          onDelete={handleDelete}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </aside>

      <section className="flex flex-1 flex-col bg-app-main p-5 overflow-hidden transition-colors duration-200">
        {activeView === "models" ? (
          <ModelsManager
            modelsYml={globalModelsYml}
            onSave={handleSaveGlobalModels}
          />
        ) : profile && status ? (
          <Editor
            profile={profile}
            globalModelsYml={globalModelsYml}
            activeId={status.activeId}
            effectiveId={status.effectiveId}
            onChange={() => loadAll()}
            onOpenModels={() => setActiveView("models")}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3.5 text-center text-zinc-500">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-zinc-200/80 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 shadow-2xs">
              <Info className="h-6 w-6 text-zinc-400 dark:text-zinc-500" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {t("emptyPrompt")}
              </p>
              {!status?.liveExists && (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-sm">
                  {t("noLiveConfigWarning")}
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </main>
  );
}

function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <MainLayout />
      </I18nProvider>
    </ThemeProvider>
  );
}

export default App;
