CREATE TABLE reminders (
  id TEXT PRIMARY KEY,
  fcmToken TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  scheduledFor TEXT NOT NULL,
  repeat TEXT NOT NULL DEFAULT 'none',
  status TEXT NOT NULL DEFAULT 'pending',
  createdAt TEXT NOT NULL
);

CREATE INDEX idx_reminders_status_scheduled ON reminders(status, scheduledFor);

CREATE TABLE fcm_token_cache (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  access_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);