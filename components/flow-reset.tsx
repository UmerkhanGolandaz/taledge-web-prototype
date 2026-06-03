"use client";

import { useEffect, useState } from "react";

/**
 * Clears the candidate's locally cached interview transcripts and generated
 * reports (DNLA, Fit Score) so that landing on the dossier always restarts the
 * assessment from a clean slate.
 */
export function FlowReset({ studentId }: { studentId: string }) {
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    try {
      const keys = [
        `taledge:interview:${studentId}:technical`,
        `taledge:interview:${studentId}:behavioural`,
        `taledge:dnla:${studentId}`,
        `taledge:fit-score:${studentId}`,
      ];
      let removed = 0;
      for (const k of keys) {
        if (localStorage.getItem(k) !== null) {
          localStorage.removeItem(k);
          removed += 1;
        }
      }
      if (removed > 0) setCleared(true);
    } catch {
      /* localStorage unavailable · non-fatal */
    }
  }, [studentId]);

  if (!cleared) return null;

  return (
    <div className="mb-6 flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-3 text-xs text-ink-600">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-ink-900" />
      Assessment state reset. Start fresh from Step 02.
    </div>
  );
}
