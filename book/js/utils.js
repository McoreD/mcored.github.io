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

export function parseCsvNames(text) {
  const names = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const first = trimmed.split(/,|\t/)[0].replace(/^"|"$/g, '').trim();
    if (!first) continue;
    if (names.length === 0 && /^name$/i.test(first)) continue;
    names.push(first);
  }
  return names;
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
