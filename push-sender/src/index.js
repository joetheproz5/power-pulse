import { buildPushPayload } from "@block65/webcrypto-web-push";

const SOURCE_URL = "https://info.ghawi.me/chart_summary.php";
const SUBSCRIPTION_PREFIX = "subscription:";
const SOURCE_STATE_KEY = "state:source";
const CHECKED_AT_KEY = "state:checked-at";
const encoder = new TextEncoder();

const copy = {
  en: {
    enabledTitle: "Power alerts enabled",
    enabledBody: "You will be alerted when the power source changes.",
    changedTitle: "Power source changed",
    grid: "EDL is now supplying your home.",
    generator: "Your generator is now supplying your home.",
    off: "There is currently no power supply."
  },
  ar: {
    enabledTitle: "تم تفعيل تنبيهات الكهرباء",
    enabledBody: "سيصلك تنبيه عند تغيّر مصدر الكهرباء.",
    changedTitle: "تغيّر مصدر الكهرباء",
    grid: "كهرباء الدولة توفّر الكهرباء الآن.",
    generator: "المولد يوفّر الكهرباء الآن.",
    off: "لا يوجد مصدر كهرباء حالياً."
  }
};

function languageOf(value) {
  return value === "ar" ? "ar" : "en";
}

function headersFor(request) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-PowerPulse-Token",
    "Cache-Control": "no-store"
  };
}

function response(request, value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headersFor(request) }
  });
}

function isAllowedBrowserRequest(request) {
  return request.headers.get("Origin") !== null;
}

function validSubscription(subscription) {
  if (!subscription || typeof subscription !== "object") return false;
  if (typeof subscription.endpoint !== "string" || subscription.endpoint.length > 4096) return false;
  if (!subscription.endpoint.startsWith("https://")) return false;
  const keys = subscription.keys;
  return Boolean(keys && typeof keys.p256dh === "string" && /^[A-Za-z0-9_-]{20,}$/.test(keys.p256dh) && typeof keys.auth === "string" && /^[A-Za-z0-9_-]{8,}$/.test(keys.auth));
}

async function subscriptionId(endpoint) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(endpoint)));
  return Array.from(digest, byte => byte.toString(16).padStart(2, "0")).join("");
}

function sourceMessage(source, language) {
  const text = copy[languageOf(language)];
  return { title: text.changedTitle, body: text[source] || text.off, source };
}

function enabledMessage(language) {
  const text = copy[languageOf(language)];
  return { title: text.enabledTitle, body: text.enabledBody, source: "enabled" };
}

function vapid(env) {
  return {
    subject: env.VAPID_SUBJECT,
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY
  };
}

async function deliver(record, message, env) {
  const payload = await buildPushPayload(
    { data: JSON.stringify(message), options: { ttl: 900, urgency: "high" } },
    record.subscription,
    vapid(env)
  );
  const result = await fetch(record.subscription.endpoint, payload);
  if (result.status === 404 || result.status === 410) return "gone";
  if (!result.ok) throw new Error(`Push service returned ${result.status}`);
  return "sent";
}

async function currentSource() {
  const result = await fetch(SOURCE_URL, {
    headers: { "user-agent": "PowerPulse push sender" },
    cf: { cacheTtl: 0, cacheEverything: false }
  });
  if (!result.ok) throw new Error(`Source returned ${result.status}`);
  const chart = await result.json();
  const latest = chart?.rows?.at(-1)?.c;
  if (!Array.isArray(latest)) throw new Error("Source did not include current power data");
  const edl = Number(latest[1]?.v);
  const generator = Number(latest[2]?.v);
  if (!Number.isFinite(edl) || !Number.isFinite(generator)) throw new Error("Source current power data is invalid");
  return edl > 0 ? "grid" : generator > 0 ? "generator" : "off";
}

async function subscriptions(env) {
  const entries = [];
  let cursor;
  do {
    const page = await env.PUSH_STATE.list({ prefix: SUBSCRIPTION_PREFIX, cursor, limit: 1000 });
    entries.push(...page.keys);
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return entries;
}

async function checkAndSend(env) {
  const source = await currentSource();
  const previous = await env.PUSH_STATE.get(SOURCE_STATE_KEY);
  if (!previous) {
    await Promise.all([
      env.PUSH_STATE.put(SOURCE_STATE_KEY, source),
      env.PUSH_STATE.put(CHECKED_AT_KEY, new Date().toISOString())
    ]);
    return { changed: false, source, sent: 0, removed: 0 };
  }
  if (previous === source) return { changed: false, source, sent: 0, removed: 0 };
  await Promise.all([
    env.PUSH_STATE.put(SOURCE_STATE_KEY, source),
    env.PUSH_STATE.put(CHECKED_AT_KEY, new Date().toISOString())
  ]);

  const keys = await subscriptions(env);
  let sent = 0;
  let removed = 0;
  for (let start = 0; start < keys.length; start += 6) {
    const batch = keys.slice(start, start + 6);
    const results = await Promise.allSettled(batch.map(async ({ name }) => {
      const saved = await env.PUSH_STATE.get(name, "json");
      if (!saved?.subscription) return;
      const outcome = await deliver(saved, sourceMessage(source, saved.language), env);
      if (outcome === "gone") {
        await env.PUSH_STATE.delete(name);
        removed += 1;
      } else {
        sent += 1;
      }
    }));
    // A bad or temporarily unavailable push service must not prevent other devices from receiving this event.
    results.filter(result => result.status === "rejected").forEach(() => {});
  }
  return { changed: true, source, sent, removed };
}

async function subscribe(request, env) {
  if (!isAllowedBrowserRequest(request)) {
    console.warn("Push subscription rejected for an unapproved origin.");
    return response(request, { ok: false, error: "Origin is not allowed." }, 403);
  }
  let body;
  try { body = await request.json(); } catch { return response(request, { ok: false, error: "Invalid JSON." }, 400); }
  if (!validSubscription(body.subscription)) return response(request, { ok: false, error: "Invalid push subscription." }, 400);
  const language = languageOf(body.language);
  const id = await subscriptionId(body.subscription.endpoint);
  const key = `${SUBSCRIPTION_PREFIX}${id}`;
  const record = { subscription: body.subscription, language, updatedAt: new Date().toISOString() };
  await env.PUSH_STATE.put(key, JSON.stringify(record));
  console.log("Push subscription stored.");

  let testSent = false;
  if (body.announce === true) {
    try {
      testSent = await deliver(record, enabledMessage(language), env) === "sent";
    } catch {
      // The subscription remains stored; the next source change will retry delivery.
    }
  }
  return response(request, { ok: true, testSent });
}

async function unsubscribe(request, env) {
  if (!isAllowedBrowserRequest(request)) return response(request, { ok: false, error: "Origin is not allowed." }, 403);
  let body;
  try { body = await request.json(); } catch { return response(request, { ok: false, error: "Invalid JSON." }, 400); }
  if (typeof body.endpoint !== "string" || !body.endpoint.startsWith("https://")) return response(request, { ok: false, error: "Invalid endpoint." }, 400);
  await env.PUSH_STATE.delete(`${SUBSCRIPTION_PREFIX}${await subscriptionId(body.endpoint)}`);
  return response(request, { ok: true });
}

function authorized(request, env) {
  return Boolean(env.PUSH_CHECK_TOKEN) && request.headers.get("X-PowerPulse-Token") === env.PUSH_CHECK_TOKEN;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: headersFor(request) });
    if (request.method === "GET" && url.pathname === "/v1/config") return response(request, { vapidPublicKey: env.VAPID_PUBLIC_KEY });
    if (request.method === "POST" && url.pathname === "/v1/subscriptions") return subscribe(request, env);
    if (request.method === "DELETE" && url.pathname === "/v1/subscriptions") return unsubscribe(request, env);
    if (request.method === "GET" && url.pathname === "/health") {
      const [source, checkedAt] = await Promise.all([env.PUSH_STATE.get(SOURCE_STATE_KEY), env.PUSH_STATE.get(CHECKED_AT_KEY)]);
      return response(request, { ok: true, source: source || null, lastCheckedAt: checkedAt || null });
    }
    if (request.method === "POST" && url.pathname === "/admin/check") {
      if (!authorized(request, env)) return response(request, { ok: false }, 401);
      return response(request, { ok: true, ...(await checkAndSend(env)) });
    }
    return response(request, { ok: false, error: "Not found." }, 404);
  },

  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(checkAndSend(env));
  }
};
