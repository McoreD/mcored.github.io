import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Invitee = { id: string; name: string; email: string };

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Perth",
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function buildEmailHtml(opts: {
  name: string;
  seriesTitle: string;
  workshopTitle: string;
  when: string;
  duration: number;
  rsvpUrl: string;
}) {
  const safeName = opts.name.replace(/[<>&]/g, "");
  const heading = opts.workshopTitle || opts.seriesTitle;
  return `
  <div style="font-family:Segoe UI,Arial,sans-serif;line-height:1.5;color:#14201c">
    <p>Hi ${safeName},</p>
    <p>You are invited to RSVP for <strong>${heading}</strong>.</p>
    <p><strong>Session:</strong> ${opts.when} (Australia/Perth)<br/>
       <strong>Duration:</strong> ${opts.duration} minutes</p>
    <p><a href="${opts.rsvpUrl}" style="display:inline-block;padding:12px 18px;background:#1f6f5b;color:#fff;text-decoration:none;border-radius:999px;font-weight:700">Open RSVP form</a></p>
    <p>Or paste this link into your browser:<br/><a href="${opts.rsvpUrl}">${opts.rsvpUrl}</a></p>
    <p>Please choose your name and select Yes or No.</p>
  </div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    return json(500, {
      error:
        "RESEND_API_KEY is not set on the Edge Function. Add it in Supabase → Project Settings → Edge Functions → Secrets.",
    });
  }

  const from =
    Deno.env.get("RESEND_FROM") ||
    "Workshop Bookings <bookings@mail.delpach.com>";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;

  let body: {
    admin_token?: string;
    workshop_id?: string;
    site_origin?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const adminToken = body.admin_token?.trim();
  const workshopId = body.workshop_id?.trim();
  const siteOrigin = (body.site_origin || "https://delpach.com").replace(
    /\/$/,
    "",
  );
  if (!adminToken || !workshopId) {
    return json(400, { error: "admin_token and workshop_id are required" });
  }

  const supabase = createClient(supabaseUrl, supabaseAnon);
  const { data, error } = await supabase.rpc("admin_list_invitees", {
    p_admin_token: adminToken,
    p_workshop_id: workshopId,
  });
  if (error) {
    return json(401, { error: error.message });
  }

  const invitees = (data?.invitees || []) as Invitee[];
  const missing = Number(data?.missing_email_count || 0);
  const seriesTitle = data?.series?.title || "Workshop";
  const workshop = data?.workshop;
  if (!workshop?.public_token) {
    return json(404, { error: "Workshop not found" });
  }
  const workshopTitle = workshop.title || seriesTitle;

  if (!invitees.length) {
    return json(200, {
      sent: 0,
      failed: 0,
      skipped_no_email: missing,
      message: "No remaining attendees with email addresses.",
    });
  }

  const when = formatWhen(workshop.starts_at);
  const rsvpBase = `${siteOrigin}/book/w/?t=${encodeURIComponent(
    workshop.public_token,
  )}`;

  const emails = invitees.map((person) => ({
    from,
    to: [person.email],
    subject: `RSVP: ${workshopTitle} — ${when}`,
    html: buildEmailHtml({
      name: person.name,
      seriesTitle,
      workshopTitle,
      when,
      duration: workshop.duration_minutes,
      rsvpUrl: rsvpBase,
    }),
  }));

  const chunks: (typeof emails)[] = [];
  for (let i = 0; i < emails.length; i += 100) {
    chunks.push(emails.slice(i, i + 100));
  }

  let sent = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const chunk of chunks) {
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chunk),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      failed += chunk.length;
      failures.push(payload?.message || `Resend error ${res.status}`);
      continue;
    }
    const ids = Array.isArray(payload?.data) ? payload.data : [];
    sent += ids.length || chunk.length;
  }

  return json(200, {
    sent,
    failed,
    skipped_no_email: missing,
    failures: failures.slice(0, 5),
  });
});
