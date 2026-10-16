// Anonymous funnel counts via GoatCounter (no cookies, no personal data): tokenvoices.goatcounter.com.
// Each step is counted at most once per page load, so the dashboard reads as "visitors who reached it".
type GoatCounter = { count: (o: { path: string; title?: string; event?: boolean }) => void };

const sent = new Set<string>();

export function track(step: string, title?: string) {
  if (sent.has(step)) return;
  sent.add(step);
  try {
    (window as unknown as { goatcounter?: GoatCounter }).goatcounter?.count({ path: step, title: title ?? step, event: true });
  } catch {
    // Analytics must never break the page (blocked by an ad blocker, offline, ...).
  }
}
