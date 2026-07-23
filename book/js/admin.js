import { rpc } from './supabase-client.js';
import {
  qs,
  formatWorkshopWhen,
  perthLocalToIso,
  workshopGuestUrl,
  parseCsvNames,
  showMessage,
  copyText,
} from './utils.js';

const msg = document.getElementById('msg');
const seriesList = document.getElementById('series-list');
const detail = document.getElementById('series-detail');
const unauthorized = document.getElementById('unauthorized');
const app = document.getElementById('app');

let adminToken = qs('k') || sessionStorage.getItem('book_admin_token') || '';
let activeSeriesId = null;

if (adminToken) {
  sessionStorage.setItem('book_admin_token', adminToken);
  // Clean key from URL after capture (keeps secret out of shareable history a bit)
  if (qs('k')) {
    const url = new URL(window.location.href);
    url.searchParams.delete('k');
    history.replaceState({}, '', url.pathname + url.search);
  }
}

function errText(e) {
  return e?.message || String(e);
}

async function loadSeries() {
  const rows = await rpc('admin_list_series', { p_admin_token: adminToken });
  seriesList.innerHTML = '';
  if (!rows?.length) {
    seriesList.innerHTML = '<li class="meta">No series yet. Create one below.</li>';
    return;
  }
  for (const s of rows) {
    const li = document.createElement('li');
    const done = Number(s.remaining_count) === 0 && Number(s.roster_count) > 0;
    const pct =
      s.roster_count > 0 ? Math.round((Number(s.yes_count) / Number(s.roster_count)) * 100) : 0;
    li.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:0.75rem;flex-wrap:wrap;align-items:center">
        <strong>${escapeHtml(s.title)}</strong>
        <span class="badge ${done ? 'ok' : 'warn'}">${s.yes_count}/${s.roster_count} confirmed</span>
      </div>
      <div class="progress" aria-hidden="true"><span style="width:${pct}%"></span></div>
      <div class="meta">${s.remaining_count} still need a Yes · created ${formatWorkshopWhen(s.created_at)}</div>
      <button type="button" data-id="${s.id}">Open series</button>
    `;
    li.querySelector('button').addEventListener('click', () => openSeries(s.id));
    seriesList.appendChild(li);
  }
}

async function openSeries(id) {
  activeSeriesId = id;
  const data = await rpc('admin_series_detail', {
    p_admin_token: adminToken,
    p_series_id: id,
  });
  renderDetail(data);
}

function renderDetail(data) {
  const s = data.series;
  const roster = Number(data.roster_count) || 0;
  const yes = Number(data.yes_count) || 0;
  const remaining = data.remaining || [];
  const workshops = data.workshops || [];
  const pct = roster > 0 ? Math.round((yes / roster) * 100) : 0;
  const complete = roster > 0 && remaining.length === 0;

  detail.classList.remove('hidden');
  detail.innerHTML = `
    <h2>${escapeHtml(s.title)}</h2>
    <p class="meta">Progress: <strong>${yes}/${roster}</strong> have said Yes across this series.</p>
    <div class="progress" aria-hidden="true"><span style="width:${pct}%"></span></div>
    ${complete ? '<p class="badge ok" style="margin-top:0.75rem">Series complete — everyone has participated. You can start a new series anytime.</p>' : ''}

    <div class="split" style="margin-top:1.25rem">
      <section>
        <h3>Import roster (CSV)</h3>
        <p class="meta">One name per line, or a single name column. Upserts by exact name.</p>
        <div class="stack">
          <label>CSV file<input type="file" id="csv-file" accept=".csv,text/csv,text/plain" /></label>
          <label>Or paste names<textarea id="csv-text" placeholder="Alex Chen&#10;Sam Rivera&#10;..."></textarea></label>
          <button type="button" id="btn-import">Import names</button>
        </div>
      </section>

      <section>
        <h3>Still need Yes (${remaining.length})</h3>
        <ul class="list" id="remaining-list">
          ${
            remaining.length
              ? remaining.map((p) => `<li>${escapeHtml(p.name)}</li>`).join('')
              : '<li class="meta">Nobody left — series is complete.</li>'
          }
        </ul>
        <button type="button" class="secondary" id="btn-copy-remaining" ${remaining.length ? '' : 'disabled'}>
          Copy remaining names
        </button>
      </section>
    </div>

    <section style="margin-top:1.5rem">
      <h3>Create workshop session</h3>
      <p class="meta">Date &amp; time are Australia/Perth. Guests who have not yet said Yes can RSVP.</p>
      <div class="row">
        <label>Date<input type="date" id="w-date" required /></label>
        <label>Time<input type="time" id="w-time" required /></label>
        <label>Duration (minutes)<input type="number" id="w-duration" min="1" value="60" required /></label>
        <label>Capacity<input type="number" id="w-capacity" min="1" value="12" required /></label>
      </div>
      <div style="margin-top:0.85rem">
        <button type="button" id="btn-create-workshop">Create workshop &amp; get link</button>
      </div>
      <div id="new-link" class="hidden" style="margin-top:0.85rem"></div>
    </section>

    <section style="margin-top:1.5rem">
      <h3>Workshops</h3>
      <ul class="list" id="workshop-list">
        ${
          workshops.length
            ? workshops
                .map((w) => {
                  const url = workshopGuestUrl(w.public_token);
                  return `<li>
                    <strong>${formatWorkshopWhen(w.starts_at)}</strong>
                    <div class="meta">${w.duration_minutes} min · ${w.yes_count}/${w.capacity} Yes · ${w.no_count} No</div>
                    <div class="link-box">
                      <code>${escapeHtml(url)}</code>
                      <button type="button" class="secondary copy-link" data-url="${escapeHtml(url)}">Copy link</button>
                    </div>
                  </li>`;
                })
                .join('')
            : '<li class="meta">No workshops yet.</li>'
        }
      </ul>
    </section>
  `;

  detail.querySelector('#btn-import')?.addEventListener('click', importRoster);
  detail.querySelector('#csv-file')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    detail.querySelector('#csv-text').value = text;
  });
  detail.querySelector('#btn-copy-remaining')?.addEventListener('click', async () => {
    const names = remaining.map((p) => p.name).join('\n');
    await copyText(names);
    showMessage(msg, 'Remaining names copied.', 'ok');
  });
  detail.querySelector('#btn-create-workshop')?.addEventListener('click', createWorkshop);
  detail.querySelectorAll('.copy-link').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await copyText(btn.dataset.url);
      showMessage(msg, 'Workshop link copied.', 'ok');
    });
  });
}

async function importRoster() {
  try {
    const text = detail.querySelector('#csv-text')?.value || '';
    const names = parseCsvNames(text);
    if (!names.length) {
      showMessage(msg, 'No names found to import.', 'error');
      return;
    }
    const result = await rpc('admin_import_roster', {
      p_admin_token: adminToken,
      p_series_id: activeSeriesId,
      p_names: names,
    });
    showMessage(
      msg,
      `Imported ${result.inserted} name(s); ${result.skipped} skipped (blank/duplicate/header).`,
      'ok'
    );
    await openSeries(activeSeriesId);
    await loadSeries();
  } catch (e) {
    showMessage(msg, errText(e), 'error');
  }
}

async function createWorkshop() {
  try {
    const date = detail.querySelector('#w-date').value;
    const time = detail.querySelector('#w-time').value;
    const duration = Number(detail.querySelector('#w-duration').value);
    const capacity = Number(detail.querySelector('#w-capacity').value);
    const startsAt = perthLocalToIso(date, time);
    if (!startsAt) {
      showMessage(msg, 'Date and time are required.', 'error');
      return;
    }
    const row = await rpc('admin_create_workshop', {
      p_admin_token: adminToken,
      p_series_id: activeSeriesId,
      p_starts_at: startsAt,
      p_duration_minutes: duration,
      p_capacity: capacity,
    });
    const url = workshopGuestUrl(row.public_token);
    const box = detail.querySelector('#new-link');
    box.classList.remove('hidden');
    box.innerHTML = `
      <div class="link-box">
        <code>${escapeHtml(url)}</code>
        <button type="button" class="secondary" id="copy-new">Copy link</button>
      </div>
      <p class="meta">Send this link manually (Outlook). Only people who have not yet said Yes will appear in the name list.</p>
    `;
    box.querySelector('#copy-new').addEventListener('click', async () => {
      await copyText(url);
      showMessage(msg, 'Workshop link copied.', 'ok');
    });
    showMessage(msg, 'Workshop created.', 'ok');
    await openSeries(activeSeriesId);
    await loadSeries();
  } catch (e) {
    showMessage(msg, errText(e), 'error');
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

document.getElementById('create-series-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('series-title').value.trim();
  try {
    const row = await rpc('admin_create_series', {
      p_admin_token: adminToken,
      p_title: title,
    });
    document.getElementById('series-title').value = '';
    showMessage(msg, `Series “${row.title}” created.`, 'ok');
    await loadSeries();
    await openSeries(row.id);
  } catch (err) {
    showMessage(msg, errText(err), 'error');
  }
});

async function boot() {
  if (!adminToken) {
    unauthorized.classList.remove('hidden');
    app.classList.add('hidden');
    return;
  }
  try {
    await loadSeries();
    unauthorized.classList.add('hidden');
    app.classList.remove('hidden');
  } catch (e) {
    unauthorized.classList.remove('hidden');
    app.classList.add('hidden');
    showMessage(msg, 'Admin key rejected. Use your secret admin URL.', 'error');
  }
}

boot();
