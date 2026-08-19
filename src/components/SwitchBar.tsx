import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ValidationIssue } from "../lib/api";
import { checkRunning, switchProfile } from "../lib/api";

interface Props {
  profileId: string;
  issues: ValidationIssue[];
  onSwitched: () => void;
}

export function SwitchBar({ profileId, issues, onSwitched }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "info" | "success";
    text: string;
  } | null>(null);

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const hasErrors = issues.some((i) => i.level === "error");

  async function handleSwitch() {
    setError(null);
    setNotification(null);
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    setBusy(true);
    try {
      const procs = await checkRunning();
      await switchProfile(profileId);
      onSwitched();

      if (procs.length > 0) {
        setNotification({
          type: "info",
          text: "检测到 omp 正在运行，重启后生效",
        });
      } else {
        setNotification({
          type: "success",
          text: "配置切换成功",
        });
      }

      timerRef.current = window.setTimeout(() => {
        setNotification(null);
      }, 3000);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-3">
        <button
          onClick={handleSwitch}
          disabled={busy || hasErrors}
          className={`rounded-lg px-5 py-2 text-sm font-semibold text-white transition shadow-xs ${
            hasErrors
              ? "cursor-not-allowed bg-slate-400 dark:bg-slate-700"
              : "bg-brand hover:bg-brand-hover active:bg-brand-active text-brand-fg"
          }`}
        >
          {busy ? "切换中…" : "切换到此配置"}
        </button>
        {hasErrors && (
          <span className="text-xs text-rose-600 dark:text-rose-400">
            请先修复 YAML 错误后切换
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {notification && (
        <div
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition animate-in fade-in duration-200 ${
            notification.type === "info"
              ? "border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
              : "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
          }`}
        >
          {notification.type === "info" ? (
            <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          )}
          <span>{notification.text}</span>
        </div>
      )}
    </div>
  );
}
