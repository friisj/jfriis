-- Add photographer type and distilled prompt to photographer configs
ALTER TABLE cog_photographer_configs
  ADD COLUMN IF NOT EXISTS type TEXT
    CHECK (type IN ('portrait','fashion','editorial','street','landscape','fine_art','commercial')),
  ADD COLUMN IF NOT EXISTS distilled_prompt TEXT;

-- Benchmark rounds: one per distillation attempt
CREATE TABLE IF NOT EXISTS cog_benchmark_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_type TEXT NOT NULL CHECK (config_type IN ('photographer','director','production')),
  config_id UUID NOT NULL,
  round_number INT NOT NULL,
  distilled_prompt TEXT NOT NULL,
  feedback TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','approved','superseded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_benchmark_rounds_config
  ON cog_benchmark_rounds (config_type, config_id);

-- Benchmark images: 3 per round
CREATE TABLE IF NOT EXISTS cog_benchmark_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES cog_benchmark_rounds(id) ON DELETE CASCADE,
  image_index INT NOT NULL CHECK (image_index >= 0 AND image_index <= 2),
  storage_path TEXT NOT NULL,
  rating TEXT CHECK (rating IN ('approved','rejected')),
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_benchmark_images_round
  ON cog_benchmark_images (round_id);

-- RLS: admin-only for both tables
ALTER TABLE cog_benchmark_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE cog_benchmark_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on benchmark rounds"
  ON cog_benchmark_rounds FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Admin full access on benchmark images"
  ON cog_benchmark_images FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );
