-- Context Packs: bridge chassis modules to generation prompts and evaluation loops
-- A context pack captures a module version's parameters as a generation prompt,
-- defines evaluation criteria, and records corrections from the evaluation.

CREATE TABLE IF NOT EXISTS luv_chassis_context_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES luv_chassis_modules(id) ON DELETE CASCADE,
  version int NOT NULL,
  generation_prompt text NOT NULL DEFAULT '',
  evaluation_criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  corrections jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'superseded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for looking up packs by module
CREATE INDEX IF NOT EXISTS idx_context_packs_module ON luv_chassis_context_packs(module_id);

-- Updated-at trigger (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_context_packs_updated_at'
  ) THEN
    CREATE TRIGGER set_context_packs_updated_at
      BEFORE UPDATE ON luv_chassis_context_packs
      FOR EACH ROW
      EXECUTE FUNCTION moddatetime(updated_at);
  END IF;
END $$;

-- RLS: public read, admin-only write
ALTER TABLE luv_chassis_context_packs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read context packs' AND tablename = 'luv_chassis_context_packs') THEN
    CREATE POLICY "Public read context packs" ON luv_chassis_context_packs FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin insert context packs' AND tablename = 'luv_chassis_context_packs') THEN
    CREATE POLICY "Admin insert context packs" ON luv_chassis_context_packs FOR INSERT WITH CHECK (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin update context packs' AND tablename = 'luv_chassis_context_packs') THEN
    CREATE POLICY "Admin update context packs" ON luv_chassis_context_packs FOR UPDATE USING (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin delete context packs' AND tablename = 'luv_chassis_context_packs') THEN
    CREATE POLICY "Admin delete context packs" ON luv_chassis_context_packs FOR DELETE USING (is_admin());
  END IF;
END $$;
