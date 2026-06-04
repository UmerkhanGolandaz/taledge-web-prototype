"use client";

import { useState } from "react";

/**
 * Explicitly clears the candidate's locally cached assessment state. This must
 * never run automatically because Fit Score depends on captured transcripts.
 */
export function FlowReset({ studentId }: { studentId: string }) {
  const [cleared, setCleared] = useState(false);

  function clearState() {
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
  }

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3 text-xs text-ink-600">
      <span>
        {cleared
          ? "Assessment state reset. Start fresh from Step 02."
          : "Need to restart this assessment? Clear local interview and report state."}
      </span>
      <button
        type="button"
        onClick={clearState}
        className="rounded-lg border border-ink-200 px-3 py-1.5 font-semibold text-ink-900 hover:bg-ink-50"
      >
        Start fresh
      </button>
    </div>
  );
}
