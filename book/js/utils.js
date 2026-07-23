const TZ = () => window.BOOK_CONFIG?.timezone || 'Australia/Perth';

export function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

export function formatWorkshopWhen(iso) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: TZ(),
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

/** Local Perth wall time → timestamptz ISO with +08:00 */
export function perthLocalToIso(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  return `${dateStr}T${timeStr}:00+08:00`;
}

export function workshopGuestUrl(publicToken) {
  const base = `${window.location.origin}/book/w/`;
  return `${base}?t=${encodeURIComponent(publicToken)}`;
}

export function parseCsvRoster(text) {
  const rows = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/,|\t/).map((p) => p.replace(/^"|"$/g, '').trim());
    const name = parts[0] || '';
    const email = (parts[1] || '').toLowerCase();
    if (!name) continue;
    if (rows.length === 0 && /^name$/i.test(name)) continue;
    rows.push({ name, email: email && email !== 'email' ? email : '' });
  }
  return rows;
}

/** @deprecated use parseCsvRoster */
export function parseCsvNames(text) {
  return parseCsvRoster(text).map((r) => r.name);
}

export function showMessage(el, text, type = 'info') {
  if (!el) return;
  el.hidden = !text;
  el.textContent = text || '';
  el.dataset.type = type;
}

export async function copyText(text) {
  await navigator.clipboard.writeText(text);
}
