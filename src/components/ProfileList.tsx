import {
  AlertTriangle,
  Copy,
  FolderOpen,
  Plus,
  Server,
  Settings,
  Sliders,
  Trash2,
  Check,
} from "lucide-react";
import { useState } from "react";
import type { LiveStatus, ProfileMeta } from "../lib/api";
import { useI18n } from "../lib/i18n";

interface Props {
  profiles: ProfileMeta[];
  selectedId: string | null;
  activeView: "profile" | "models";
  status: LiveStatus;
  onSelectProfile: (id: string) => void;
  onSelectModels: () => void;
  onSwitchProfile: (id: string) => void;
  onCreate: (name: string) => void;
  onDuplicate: (id: string, name: string) => void;
  onImport: (name: string) => void;
  onDelete: (id: string) => void;
  onRevealLive: () => void;
  onOpenSettings: () => void;
}

export function ProfileList({
  profiles,
  selectedId,
  activeView,
  status,
  onSelectProfile,
  onSelectModels,
  onSwitchProfile,
  onCreate,
  onDuplicate,
  onImport,
  onDelete,
  onRevealLive,
  onOpenSettings,
}: Props) {
  const { t } = useI18n();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importName, setImportName] = useState("");
  const [dupId, setDupId] = useState<string | null>(null);
  const [dupName, setDupName] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  function formatActiveLabel(activeId: string | null, effectiveId: string | null, id: string) {
    if (effectiveId === id) return t("activeStatus");
    if (activeId === id) return t("lastSwitchedStatus");
    return null;
  }

  function handleCreate() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setCreating(true);
    onCreate(trimmed);
    setNewName("");
    setCreating(false);
  }

  function handleImport() {
    const trimmed = importName.trim();
    if (!trimmed) return;
    onImport(trimmed);
    setImportName("");
    setImportOpen(false);
  }

  function startDuplicate(id: string, currentName: string) {
    setDupId(id);
    setDupName(`${currentName} (Copy)`);
    setDeleteConfirmId(null);
  }

  function confirmDuplicate() {
    if (!dupId || !dupName.trim()) return;
    onDuplicate(dupId, dupName.trim());
    setDupId(null);
    setDupName("");
  }

  function startDelete(id: string) {
    setDeleteConfirmId(id);
    setDupId(null);
  }

  function confirmDelete(id: string) {
    onDelete(id);
    setDeleteConfirmId(null);
  }

  return (
    <div className="flex h-full flex-col border-r border-app-border bg-app-sidebar">
      {/* Top Section: Independent Models Library */}
      <div className="p-3 border-b border-app-border">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
            {t("globalLibrarySection")}
          </span>
          <button
            onClick={onOpenSettings}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-200/70 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden"
            title={t("settingsBtn")}
            aria-label={t("settingsBtn")}
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>
        <button
          onClick={onSelectModels}
          className={`group flex w-full items-center justify-between rounded-xl p-2.5 text-left text-sm font-medium transition duration-150 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden ${
            activeView === "models"
              ? "bg-brand text-brand-fg shadow-sm"
              : "bg-white text-zinc-800 border border-zinc-200/90 hover:border-zinc-300 hover:bg-zinc-100/70 dark:bg-app-card dark:border-app-border dark:text-zinc-200 dark:hover:bg-app-card-subtle dark:hover:border-zinc-700 shadow-2xs"
          }`}
        >
          <div className="flex items-center gap-2.5 truncate">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                activeView === "models"
                  ? "bg-white/20 text-white"
                  : "bg-brand-muted text-brand"
              }`}
            >
              <Server className="h-4 w-4" />
            </div>
            <div className="truncate">
              <div className="font-semibold text-xs leading-snug">{t("modelsLibrary")}</div>
              <div
                className={`text-[11px] leading-none mt-0.5 ${
                  activeView === "models" ? "opacity-90" : "text-zinc-400 dark:text-zinc-500"
                }`}
              >
                {t("modelsLibrarySub")}
              </div>
            </div>
          </div>
          <span
            className={`rounded-md px-1.5 py-0.5 text-[10px] font-mono font-medium ${
              activeView === "models"
                ? "bg-white/20 text-white"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {t("globalBadge")}
          </span>
        </button>
      </div>

      {/* Profile Configs Section Header */}
      <div className="flex items-center justify-between px-3 pt-3.5 pb-1.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          <Sliders className="h-3.5 w-3.5 text-brand" />
          <span>{t("configProfilesSection")}</span>
        </div>
        <span className="rounded-full bg-zinc-200/70 px-2 py-0.2 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          {profiles.length}
        </span>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {status.liveExists && status.effectiveId === null && (
          <div className="m-1.5 rounded-lg border border-amber-200/80 bg-amber-50/90 p-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
            {t("noMatchingLiveConfig")}
          </div>
        )}

        {profiles.length === 0 ? (
          <div className="px-2 py-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
            {t("noProfiles")}
          </div>
        ) : (
          <ul className="space-y-1">
            {profiles.map((p) => {
              const isEffective = status.effectiveId === p.id;
              const isActive = status.activeId === p.id;
              const isDrift = isActive && status.drift;
              const isSelected = activeView === "profile" && selectedId === p.id;
              const activeLabel = formatActiveLabel(status.activeId, status.effectiveId, p.id);

              return (
                <li
                  key={p.id}
                  className={`rounded-xl border transition duration-150 ${
                    isEffective
                      ? "border-emerald-300/80 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                      : isSelected
                      ? "border-brand-muted-border bg-brand-muted"
                      : "border-transparent hover:border-zinc-200 dark:hover:border-zinc-800/80"
                  }`}
                >
                  <div
                    onClick={() => onSelectProfile(p.id)}
                    className={`group flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                      isSelected && isEffective
                        ? "bg-emerald-100/60 text-emerald-950 dark:bg-emerald-900/30 dark:text-emerald-100"
                        : isSelected && !isEffective
                        ? "bg-brand-muted text-brand-muted-fg font-medium"
                        : "hover:bg-zinc-200/60 dark:hover:bg-zinc-850"
                    }`}
                  >
                    <span className="flex flex-1 items-center gap-2 truncate">
                      {isEffective && (
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                        </span>
                      )}
                      <span className="truncate font-medium text-xs text-zinc-800 dark:text-zinc-200">
                        {p.name}
                      </span>
                      {activeLabel && (
                        <span
                          title={
                            activeLabel === t("lastSwitchedStatus")
                              ? t("lastSwitchedTooltip")
                              : undefined
                          }
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-tight ${
                            isEffective
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300/60 dark:border-emerald-800/60"
                              : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          }`}
                        >
                          {activeLabel}
                        </span>
                      )}
                      {isDrift && (
                        <span
                          title={t("driftTooltip")}
                          className="shrink-0 rounded-full bg-amber-100 border border-amber-300/80 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 dark:bg-amber-950/60 dark:border-amber-800/80 dark:text-amber-200"
                        >
                          {t("driftStatus")}
                        </span>
                      )}
                    </span>

                    {/* Action buttons on Hover */}
                    <span className="flex shrink-0 items-center gap-1 pl-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      {!isEffective && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSwitchProfile(p.id);
                          }}
                          className="rounded-md p-1 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-200 transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-hidden"
                          title={t("applyProfileBtn")}
                          aria-label={t("applyProfileBtn")}
                        >
                          <Check size={13} strokeWidth={2.5} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startDuplicate(p.id, p.name);
                        }}
                        className="rounded-md p-1 text-zinc-500 hover:bg-zinc-200/80 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100 transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden"
                        title={t("copyProfile")}
                        aria-label={t("copyProfile")}
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startDelete(p.id);
                        }}
                        className="rounded-md p-1 text-zinc-500 hover:text-rose-600 hover:bg-zinc-200/80 dark:text-zinc-400 dark:hover:text-rose-400 dark:hover:bg-zinc-800 transition focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-hidden"
                        title={t("deleteProfile")}
                        aria-label={t("deleteProfile")}
                      >
                        <Trash2 size={13} />
                      </button>
                    </span>
                  </div>

                  {/* Inline Delete Confirmation */}
                  {deleteConfirmId === p.id && (
                    <div className="m-1.5 flex items-center justify-between rounded-lg border border-rose-200/80 bg-rose-50/90 p-2 text-xs dark:border-rose-900/50 dark:bg-rose-950/50">
                      <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-medium">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>{t("deleteConfirmTitle")}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDelete(p.id);
                          }}
                          className="rounded-md bg-rose-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-rose-700 transition"
                        >
                          {t("deleteBtn")}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(null);
                          }}
                          className="rounded-md bg-zinc-200 px-1.5 py-0.5 text-[11px] text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 transition"
                        >
                          {t("cancelBtn")}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Inline Duplicate Form */}
                  {dupId === p.id && (
                    <div className="flex gap-1.5 px-2 pb-2 pt-1">
                      <input
                        autoFocus
                        value={dupName}
                        onChange={(e) => setDupName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") confirmDuplicate();
                          if (e.key === "Escape") setDupId(null);
                        }}
                        className="flex-1 rounded-lg border border-zinc-300 px-2 py-1 text-xs focus:border-brand focus:outline-none dark:border-zinc-700 dark:bg-app-card"
                      />
                      <button
                        onClick={confirmDuplicate}
                        disabled={!dupName.trim()}
                        className="rounded-lg bg-brand px-2 py-1 text-xs font-semibold text-brand-fg hover:bg-brand-hover disabled:bg-zinc-400 transition"
                      >
                        {t("confirmBtn")}
                      </button>
                      <button
                        onClick={() => setDupId(null)}
                        className="rounded-lg bg-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 transition"
                      >
                        {t("cancelBtn")}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="space-y-2.5 border-t border-app-border p-3">
        <div className="space-y-1.5">
          <div className="flex gap-1.5">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setNewName("");
              }}
              placeholder={t("newProfilePlaceholder")}
              className="flex-1 rounded-xl border border-zinc-300/90 bg-white px-2.5 py-1.5 text-xs text-zinc-900 focus:border-brand focus:ring-1 focus:ring-brand/20 focus:outline-none dark:border-zinc-700 dark:bg-app-card dark:text-zinc-100"
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="flex items-center gap-1 rounded-xl bg-brand px-3 py-1.5 text-xs font-semibold text-brand-fg shadow-xs hover:bg-brand-hover disabled:bg-zinc-400 dark:disabled:bg-zinc-700 transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t("newProfileBtn")}</span>
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <button
            onClick={() => setImportOpen(!importOpen)}
            disabled={!status.liveExists}
            className={`w-full rounded-xl px-2.5 py-1.5 text-xs font-semibold transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden ${
              status.liveExists
                ? "bg-zinc-800 text-white hover:bg-zinc-900 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                : "cursor-not-allowed bg-zinc-200 text-zinc-400 dark:bg-zinc-850 dark:text-zinc-600"
            }`}
          >
            {importOpen ? t("cancelImportBtn") : t("importLiveBtn")}
          </button>

          {importOpen && (
            <div className="space-y-1.5 pt-1">
              <input
                autoFocus
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleImport();
                  if (e.key === "Escape") setImportOpen(false);
                }}
                placeholder={t("importProfilePlaceholder")}
                className="w-full rounded-xl border border-zinc-300 px-2.5 py-1.5 text-xs dark:border-zinc-700 dark:bg-app-card"
              />
              <button
                onClick={handleImport}
                disabled={!importName.trim()}
                className="w-full rounded-xl bg-brand py-1.5 text-xs font-semibold text-brand-fg hover:bg-brand-hover disabled:bg-zinc-400 transition"
              >
                {t("confirmImportBtn")}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onRevealLive}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-200/90 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-app-border dark:bg-app-card dark:text-zinc-200 dark:hover:bg-app-card-subtle transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden"
          >
            <FolderOpen size={14} />
            <span>{t("openLiveDirBtn")}</span>
          </button>
          <button
            onClick={onOpenSettings}
            className="rounded-xl border border-zinc-200/90 bg-white p-2 text-zinc-700 hover:bg-zinc-100 dark:border-app-border dark:bg-app-card dark:text-zinc-200 dark:hover:bg-app-card-subtle transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-hidden"
            title={t("settingsBtn")}
            aria-label={t("settingsBtn")}
          >
            <Settings size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

