CREATE TABLE IF NOT EXISTS fitness_profiles (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  revision integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
