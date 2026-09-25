import "server-only";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | undefined;
let schemaReady: Promise<unknown> | undefined;

function connectionString(): string {
  const value = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.NEON_DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is not configured");
  return value;
}

export async function database(): Promise<NeonQueryFunction<false, false>> {
  client ??= neon(connectionString());
  schemaReady ??= client`
    CREATE TABLE IF NOT EXISTS fitness_profiles (
      id text PRIMARY KEY,
      data jsonb NOT NULL,
      revision integer NOT NULL DEFAULT 1,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await schemaReady;
  return client;
}
