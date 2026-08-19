import { CheckCircle2 } from "lucide-react";
import type { ValidationIssue } from "../lib/api";
import { useI18n } from "../lib/i18n";

interface Props {
  issues: ValidationIssue[];
}

export function ValidationPanel({ issues }: Props) {
  const { t } = useI18n();
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");

  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-200/60 bg-emerald-50/70 px-3.5 py-2 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="text-xs font-semibold">{t("configValid")}</span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3">
        {errors.length > 0 && (
          <div className="text-xs font-semibold text-rose-600 dark:text-rose-400">
            {t("errorsFound", { count: errors.length })}
          </div>
        )}
        {warnings.length > 0 && (
          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            {t("warningsFound", { count: warnings.length })}
          </div>
        )}
      </div>
      <ul className="max-h-32 overflow-auto rounded-xl border border-zinc-200 bg-white text-xs dark:border-zinc-800 dark:bg-zinc-900 shadow-2xs">
        {issues.map((issue, idx) => (
          <li
            key={idx}
            className={`border-b border-zinc-100 px-3.5 py-2 last:border-0 dark:border-zinc-800/80 ${
              issue.level === "error"
                ? "text-rose-600 dark:text-rose-400 bg-rose-50/30 dark:bg-rose-950/20"
                : "text-amber-600 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-950/20"
            }`}
          >
            <span className="font-bold">[{issue.file}]</span> {issue.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
