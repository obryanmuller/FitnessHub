import "server-only";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | undefined;
let schemaReady: Promise<unknown> | undefined;

function connectionString(): string {
  const value = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!value) throw new Error("NEON_DATABASE_URL is not configured");
  return value;
}

export async function database(): Promise<NeonQueryFunction<false, false>> {
  client ??= neon(connectionString());
  schemaReady ??= (async () => {
    await client!`
      CREATE TABLE IF NOT EXISTS fitness_profiles (
        id text PRIMARY KEY,
        data jsonb NOT NULL,
        revision integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await client!`
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
      )
    `;
    await client!`CREATE INDEX IF NOT EXISTS notification_subscriptions_profile_idx ON notification_subscriptions (profile_id)`;
    await client!`
      CREATE TABLE IF NOT EXISTS notification_deliveries (
        subscription_id text NOT NULL REFERENCES notification_subscriptions(id) ON DELETE CASCADE,
        reminder_key text NOT NULL,
        sent_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (subscription_id, reminder_key)
      )
    `;
  })();
  await schemaReady;
  return client;
}
