CREATE TABLE IF NOT EXISTS fitness_profiles (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  revision integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_subscriptions (
  id text PRIMARY KEY,
  profile_id text NOT NULL REFERENCES fitness_profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  timezone text NOT NULL,
  settings jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notification_subscriptions_profile_idx ON notification_subscriptions (profile_id);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  subscription_id text NOT NULL REFERENCES notification_subscriptions(id) ON DELETE CASCADE,
  reminder_key text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (subscription_id, reminder_key)
);
