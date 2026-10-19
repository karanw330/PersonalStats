/**
 * Permanently delete the retired Resume Hub's IndexedDB database on this origin.
 * No other DevPulse data (encrypted milestone overrides, backups, etc.) is touched.
 * Idempotent; each device/browser profile performs this on its next visit.
 */
export type LegacyResumeEraseResult = 'removed' | 'blocked' | 'error' | 'unsupported';

let running: Promise<LegacyResumeEraseResult> | null = null;

export function eraseLegacyResumeStorage(): Promise<LegacyResumeEraseResult> {
  if (running) return running;
  running = new Promise<LegacyResumeEraseResult>(resolve => {
    if (typeof indexedDB === 'undefined') {
      resolve('unsupported');
      return;
    }
    try {
      const request = indexedDB.deleteDatabase('devpulse-resume-v1');
      let settled = false;
      const finish = (result: LegacyResumeEraseResult) => {
        if (!settled) {
          settled = true;
          resolve(result);
        }
      };
      request.onsuccess = () => finish('removed');
      request.onerror = () => finish('error');
      request.onblocked = () => finish('blocked');
    } catch {
      resolve('error');
    }
  }).finally(() => {
    running = null;
  });
  return running;
}
