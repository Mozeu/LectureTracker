import { useState, useEffect, useCallback } from 'react';

/**
 * useStorageQuota — RNF7
 * Monitors IndexedDB / navigator.storage usage and quota.
 * Refreshes on mount and whenever `refresh()` is called.
 *
 * Returns:
 *   usage       — bytes used (null while loading)
 *   quota       — bytes available (null while loading)
 *   percentage  — 0–100 (null while loading)
 *   isWarning   — true when usage > 70%
 *   isCritical  — true when usage > 90%
 *   usageLabel  — human-readable used size ("12.4 MB")
 *   quotaLabel  — human-readable total size ("500 MB")
 *   supported   — whether the Storage API is available
 *   refresh     — () => void  call to re-read quota
 */
export function useStorageQuota() {
  const supported = typeof navigator !== 'undefined' && !!navigator.storage?.estimate;

  const [state, setState] = useState({
    usage:      null,
    quota:      null,
    percentage: null,
    isWarning:  false,
    isCritical: false,
    usageLabel: null,
    quotaLabel: null,
  });

  const refresh = useCallback(async () => {
    if (!supported) return;
    try {
      const { usage, quota } = await navigator.storage.estimate();
      const pct = quota > 0 ? Math.round((usage / quota) * 100) : 0;
      setState({
        usage,
        quota,
        percentage: pct,
        isWarning:  pct > 70,
        isCritical: pct > 90,
        usageLabel: formatBytes(usage),
        quotaLabel: formatBytes(quota),
      });
    } catch {
      // Storage API unavailable in this context — ignore
    }
  }, [supported]);

  useEffect(() => { refresh(); }, [refresh]);

  return { ...state, supported, refresh };
}

/* ── Helpers ── */

function formatBytes(bytes) {
  if (bytes == null) return '—';
  if (bytes < 1024)           return `${bytes} B`;
  if (bytes < 1024 ** 2)      return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3)      return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}
