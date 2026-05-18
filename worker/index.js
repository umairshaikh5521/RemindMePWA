/**
 * Cloudflare Worker — Remind Me FCM scheduler (D1 version)
 *
 * Environment variables / secrets required (set via `wrangler secret put`):
 *   FIREBASE_PROJECT_ID        — e.g. "remindme-f1a8b"
 *   FIREBASE_CLIENT_EMAIL      — from service account JSON
 *   FIREBASE_PRIVATE_KEY       — from service account JSON (the full PEM string)
 *
 * D1 database binding required (wrangler.toml):
 *   [[d1_databases]]
 *   binding = "DB"
 *   database_name = "remind-me-db"
 *   database_id = "<your database id>"
 *
 * Routes handled:
 *   POST /reminders        — save a reminder (body: { id, fcmToken, url, title, scheduledFor, repeat })
 *   GET  /reminders        — list all reminders (for debugging; remove in production if needed)
 *   POST /process          — called by Cron Trigger to fire due reminders
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    try {
      const url = new URL(request.url);

      if (url.pathname === '/reminders' && request.method === 'POST') {
        return await handleSaveReminder(request, env);
      }

      if (url.pathname === '/reminders' && request.method === 'GET') {
        return await handleListReminders(env);
      }

      if (url.pathname === '/process' && request.method === 'POST') {
        return await handleProcess(env);
      }

      return json({ error: 'Not found' }, 404);
    } catch (err) {
      console.error('Worker error:', err);
      return json({ error: 'Internal server error', details: err.message }, 500);
    }
  },

  async scheduled(_event, env) {
    await processDueReminders(env);
  },
};

async function handleSaveReminder(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { id, fcmToken, url: reminderUrl, title, scheduledFor, repeat } = body;
  if (!id || !fcmToken || !reminderUrl || !scheduledFor) {
    return json({ error: 'Missing required fields: id, fcmToken, url, scheduledFor' }, 400);
  }

  await env.DB.prepare(
    'INSERT OR REPLACE INTO reminders (id, fcmToken, url, title, scheduledFor, repeat, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )
    .bind(id, fcmToken, reminderUrl, title || reminderUrl, scheduledFor, repeat || 'none', 'pending', new Date().toISOString())
    .run();

  return json({ ok: true, id }, 201);
}

async function handleListReminders(env) {
  const { results } = await env.DB.prepare('SELECT * FROM reminders').all();
  return json(results);
}

async function handleProcess(env) {
  const count = await processDueReminders(env);
  return json({ ok: true, sent: count });
}

async function processDueReminders(env) {
  const now = new Date().toISOString();
  const { results } = await env.DB.prepare(
    'SELECT * FROM reminders WHERE status = ? AND scheduledFor <= ?'
  )
    .bind('pending', now)
    .all();

  let sent = 0;
  for (const reminder of results) {
    const success = await sendFcmNotification(env, reminder);
    if (success) {
      if (reminder.repeat && reminder.repeat !== 'none') {
        const nextDate = getNextOccurrence(reminder.scheduledFor, reminder.repeat);
        await env.DB.prepare(
          'UPDATE reminders SET scheduledFor = ? WHERE id = ?'
        )
          .bind(nextDate, reminder.id)
          .run();
      } else {
        await env.DB.prepare(
          'UPDATE reminders SET status = ? WHERE id = ?'
        )
          .bind('reminded', reminder.id)
          .run();
      }
      sent++;
    }
  }
  return sent;
}

function getNextOccurrence(scheduledFor, repeat) {
  const date = new Date(scheduledFor);
  switch (repeat) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
  }
  return date.toISOString();
}

async function sendFcmNotification(env, reminder) {
  try {
    const accessToken = await getGoogleAccessToken(env);
    const projectId = env.FIREBASE_PROJECT_ID;

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: reminder.fcmToken,
            data: {
              id: reminder.id,
              url: reminder.url,
              title: reminder.title || 'Reminder',
              body: 'Tap to open your saved link',
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('FCM send failed:', err);
      return false;
    }
    return true;
  } catch (err) {
    console.error('sendFcmNotification error:', err);
    return false;
  }
}

async function getGoogleAccessToken(env) {
  const cached = await env.DB.prepare('SELECT access_token, expires_at FROM fcm_token_cache WHERE id = 1').first();
  if (cached && cached.expires_at > Date.now() / 1000 + 60) {
    return cached.access_token;
  }

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: env.FIREBASE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const jwt = await signJwt(claim, env.FIREBASE_PRIVATE_KEY);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const data = await res.json();
  if (!data.access_token) throw new Error('Failed to get access token: ' + JSON.stringify(data));

  const expiresAt = now + (data.expires_in || 3600);
  await env.DB.prepare(
    'INSERT OR REPLACE INTO fcm_token_cache (id, access_token, expires_at) VALUES (1, ?, ?)'
  )
    .bind(data.access_token, expiresAt)
    .run();

  return data.access_token;
}

async function signJwt(payload, pemKey) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const encode = (obj) => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const signingInput = `${headerB64}.${payloadB64}`;

  const privateKey = await importPrivateKey(pemKey);
  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${signingInput}.${sigB64}`;
}

async function importPrivateKey(pem) {
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\\n/g, '')
    .replace(/\s+/g, '');

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  return crypto.subtle.importKey(
    'pkcs8',
    binaryDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}