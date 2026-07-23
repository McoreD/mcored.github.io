import { rpc } from './supabase-client.js';
import { qs, formatWorkshopWhen, showMessage } from './utils.js';

const token = qs('t');
const msg = document.getElementById('msg');
const form = document.getElementById('rsvp-form');
const meta = document.getElementById('workshop-meta');
const nameSelect = document.getElementById('person');
const btnYes = document.getElementById('btn-yes');
const btnNo = document.getElementById('btn-no');

let state = null;
let submitting = false;

function errText(e) {
  return e?.message || String(e);
}

function setBusy(busy) {
  submitting = busy;
  btnYes.disabled = busy || (state?.workshop?.is_full ?? false);
  btnNo.disabled = busy;
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

    const workshopTitle = w.title || s.title || 'Workshop RSVP';
    meta.innerHTML = `
      <p class="badge">${escapeHtml(s.title)}</p>
      <h1 class="brand" style="font-size:clamp(1.6rem,3.5vw,2.2rem);margin-top:0.6rem">${escapeHtml(workshopTitle)}</h1>
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
      '<option value="">Select your name</option>' +
      people.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');

    if (!people.length) {
      form.classList.add('hidden');
      showMessage(msg, 'No eligible names left for this workshop (everyone may already be confirmed).', 'info');
      return;
    }

    btnYes.disabled = !!w.is_full;
    btnNo.disabled = false;

    if (w.is_full) {
      showMessage(
        msg,
        'This session is full — you can’t mark Yes. Choose No, or ask the organiser for another session link.',
        'info'
      );
    } else if (msg.dataset.type === 'info' && msg.textContent.includes('session is full')) {
      showMessage(msg, '', 'info');
    }

    form.classList.remove('hidden');
  } catch (e) {
    meta.innerHTML = '<p class="meta">Workshop not found.</p>';
    form.classList.add('hidden');
    showMessage(msg, errText(e), 'error');
  }
}

async function submitRsvp(attending) {
  if (submitting) return;
  const personId = nameSelect.value;
  if (!personId) {
    showMessage(msg, 'Please choose your name first.', 'error');
    nameSelect.focus();
    return;
  }
  if (attending && state?.workshop?.is_full) {
    showMessage(msg, 'This session is full — Yes is unavailable.', 'error');
    return;
  }

  setBusy(true);
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
    setBusy(false);
  }
}

btnYes?.addEventListener('click', () => submitRsvp(true));
btnNo?.addEventListener('click', () => submitRsvp(false));

form?.addEventListener('submit', (e) => e.preventDefault());

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

load();
