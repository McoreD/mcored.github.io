import { rpc } from './supabase-client.js';
import { qs, formatWorkshopWhen, showMessage } from './utils.js';

const token = qs('t');
const msg = document.getElementById('msg');
const form = document.getElementById('rsvp-form');
const meta = document.getElementById('workshop-meta');
const nameSelect = document.getElementById('person');
const yesRadio = document.getElementById('attend-yes');
const submitBtn = document.getElementById('submit-rsvp');

let state = null;

function errText(e) {
  return e?.message || String(e);
}

async function load() {
  if (!token) {
    meta.innerHTML = '<p class="meta">Missing workshop link token.</p>';
    form.classList.add('hidden');
    return;
  }
  try {
    state = await rpc('guest_get_workshop', { p_public_token: token });
    const w = state.workshop;
    const s = state.series;
    const people = state.eligible_people || [];

    meta.innerHTML = `
      <p class="badge">${escapeHtml(s.title)}</p>
      <h1 class="brand" style="font-size:clamp(1.6rem,3.5vw,2.2rem);margin-top:0.6rem">Workshop RSVP</h1>
      <p class="lede">${formatWorkshopWhen(w.starts_at)} · ${w.duration_minutes} minutes</p>
      <p class="meta" style="margin-top:0.5rem">
        ${
          w.is_full
            ? '<span class="badge warn">This session is full</span>'
            : `<span class="badge">${w.seats_remaining} seat${w.seats_remaining === 1 ? '' : 's'} left</span>`
        }
        · capacity ${w.capacity}
      </p>
    `;

    nameSelect.innerHTML =
      '<option value=\"\">Select your name</option>' +
      people.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');

    if (!people.length) {
      form.classList.add('hidden');
      showMessage(msg, 'No eligible names left for this workshop (everyone may already be confirmed).', 'info');
      return;
    }

    if (w.is_full) {
      yesRadio.disabled = true;
      document.querySelector('label[for="attend-yes"]')?.classList.add('hidden');
      document.getElementById('attend-no').checked = true;
    }

    form.classList.remove('hidden');
  } catch (e) {
    meta.innerHTML = '<p class="meta">Workshop not found.</p>';
    form.classList.add('hidden');
    showMessage(msg, errText(e), 'error');
  }
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const personId = nameSelect.value;
  const attending = document.querySelector('input[name="attending"]:checked')?.value === 'yes';
  if (!personId) {
    showMessage(msg, 'Please choose your name.', 'error');
    return;
  }
  submitBtn.disabled = true;
  try {
    const result = await rpc('guest_submit_rsvp', {
      p_public_token: token,
      p_person_id: personId,
      p_attending: attending,
    });
    showMessage(
      msg,
      attending
        ? `Thanks ${result.person_name} — you’re marked as attending. ${result.seats_remaining} seats left.`
        : `Thanks ${result.person_name} — you’re marked as not attending.`,
      'ok'
    );
    await load();
  } catch (err) {
    showMessage(msg, errText(err), 'error');
  } finally {
    submitBtn.disabled = false;
  }
});

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

load();
