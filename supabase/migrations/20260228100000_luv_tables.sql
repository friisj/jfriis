-- Luv: Parametric Character Engine
-- Tables for managing an anthropomorphic AI character's soul (personality/behavior),
-- chassis (physical parameters), chat sandbox, prompt templates, media generation,
-- and LoRA training set management.

-- Character singleton table
-- Stores the core character definition with soul and chassis data
CREATE TABLE luv_character (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  soul_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  chassis_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INT NOT NULL DEFAULT 1,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Aesthetic presets
-- Named style variations for visual generation
CREATE TABLE luv_aesthetic_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT luv_aesthetic_presets_name_not_empty CHECK (char_length(trim(name)) > 0)
);

-- Prompt templates
-- Structured prompt fragments for generation
CREATE TABLE luv_prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'chassis', 'aesthetic', 'context', 'style'
  template TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT luv_prompt_templates_name_not_empty CHECK (char_length(trim(name)) > 0),
  CONSTRAINT luv_prompt_templates_category_valid CHECK (category IN ('chassis', 'aesthetic', 'context', 'style')),
  CONSTRAINT luv_prompt_templates_template_not_empty CHECK (char_length(trim(template)) > 0)
);

-- Reference images
-- Canonical reference images for visual consistency
CREATE TABLE luv_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- 'canonical', 'variation', 'training'
  storage_path TEXT NOT NULL,
  description TEXT,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT luv_references_type_valid CHECK (type IN ('canonical', 'variation', 'training')),
  CONSTRAINT luv_references_storage_path_not_empty CHECK (char_length(trim(storage_path)) > 0)
);

-- Generated media
-- Images and other media produced by generation pipeline
CREATE TABLE luv_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt TEXT NOT NULL,
  model TEXT NOT NULL,
  storage_path TEXT,
  preset_id UUID REFERENCES luv_aesthetic_presets(id) ON DELETE SET NULL,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  rating INT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT luv_generations_prompt_not_empty CHECK (char_length(trim(prompt)) > 0),
  CONSTRAINT luv_generations_model_not_empty CHECK (char_length(trim(model)) > 0),
  CONSTRAINT luv_generations_rating_range CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))
);

-- Training sets
-- Collections for LoRA training
CREATE TABLE luv_training_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'ready', 'exported'
  target_model TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT luv_training_sets_name_not_empty CHECK (char_length(trim(name)) > 0),
  CONSTRAINT luv_training_sets_status_valid CHECK (status IN ('draft', 'ready', 'exported'))
);

-- Training set items
-- Individual items within a training set, referencing either a reference or generation
CREATE TABLE luv_training_set_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_set_id UUID NOT NULL REFERENCES luv_training_sets(id) ON DELETE CASCADE,
  reference_id UUID REFERENCES luv_references(id) ON DELETE SET NULL,
  generation_id UUID REFERENCES luv_generations(id) ON DELETE SET NULL,
  caption TEXT,
  tags TEXT[] DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Exactly one of reference_id or generation_id must be non-null
  CONSTRAINT luv_training_set_items_source_check CHECK (
    (reference_id IS NOT NULL AND generation_id IS NULL) OR
    (reference_id IS NULL AND generation_id IS NOT NULL)
  )
);

-- Chat conversations
-- Sandbox sessions for testing soul configuration
CREATE TABLE luv_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  soul_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  model TEXT NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT luv_conversations_model_not_empty CHECK (char_length(trim(model)) > 0)
);

-- Chat messages
-- Individual messages within conversations
CREATE TABLE luv_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES luv_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT luv_messages_role_valid CHECK (role IN ('user', 'assistant', 'system')),
  CONSTRAINT luv_messages_content_not_empty CHECK (char_length(trim(content)) > 0)
);

-- Indexes
CREATE INDEX idx_luv_aesthetic_presets_name ON luv_aesthetic_presets(name);
CREATE INDEX idx_luv_prompt_templates_category ON luv_prompt_templates(category);
CREATE INDEX idx_luv_references_type ON luv_references(type);
CREATE INDEX idx_luv_references_tags ON luv_references USING gin(tags);
CREATE INDEX idx_luv_generations_preset_id ON luv_generations(preset_id);
CREATE INDEX idx_luv_generations_created_at ON luv_generations(created_at DESC);
CREATE INDEX idx_luv_training_set_items_training_set_id ON luv_training_set_items(training_set_id);
CREATE INDEX idx_luv_training_set_items_reference_id ON luv_training_set_items(reference_id);
CREATE INDEX idx_luv_training_set_items_generation_id ON luv_training_set_items(generation_id);
CREATE INDEX idx_luv_training_set_items_tags ON luv_training_set_items USING gin(tags);
CREATE INDEX idx_luv_conversations_created_at ON luv_conversations(created_at DESC);
CREATE INDEX idx_luv_messages_conversation_id ON luv_messages(conversation_id);
CREATE INDEX idx_luv_messages_created_at ON luv_messages(created_at);

-- Updated_at trigger (reuse existing function)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_luv_character_updated_at
  BEFORE UPDATE ON luv_character
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_luv_aesthetic_presets_updated_at
  BEFORE UPDATE ON luv_aesthetic_presets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_luv_prompt_templates_updated_at
  BEFORE UPDATE ON luv_prompt_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_luv_references_updated_at
  BEFORE UPDATE ON luv_references
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_luv_generations_updated_at
  BEFORE UPDATE ON luv_generations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_luv_training_sets_updated_at
  BEFORE UPDATE ON luv_training_sets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_luv_training_set_items_updated_at
  BEFORE UPDATE ON luv_training_set_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_luv_conversations_updated_at
  BEFORE UPDATE ON luv_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE luv_character ENABLE ROW LEVEL SECURITY;
ALTER TABLE luv_aesthetic_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE luv_prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE luv_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE luv_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE luv_training_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE luv_training_set_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE luv_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE luv_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin-only)
CREATE POLICY "Admin full access to luv character"
  ON luv_character FOR ALL USING (is_admin());

CREATE POLICY "Admin full access to luv aesthetic presets"
  ON luv_aesthetic_presets FOR ALL USING (is_admin());

CREATE POLICY "Admin full access to luv prompt templates"
  ON luv_prompt_templates FOR ALL USING (is_admin());

CREATE POLICY "Admin full access to luv references"
  ON luv_references FOR ALL USING (is_admin());

CREATE POLICY "Admin full access to luv generations"
  ON luv_generations FOR ALL USING (is_admin());

CREATE POLICY "Admin full access to luv training sets"
  ON luv_training_sets FOR ALL USING (is_admin());

CREATE POLICY "Admin full access to luv training set items"
  ON luv_training_set_items FOR ALL USING (is_admin());

CREATE POLICY "Admin full access to luv conversations"
  ON luv_conversations FOR ALL USING (is_admin());

CREATE POLICY "Admin full access to luv messages"
  ON luv_messages FOR ALL USING (is_admin());

-- Comments
COMMENT ON TABLE luv_character IS 'Singleton character definition with soul (personality/behavior) and chassis (physical parameters) data';
COMMENT ON TABLE luv_aesthetic_presets IS 'Named aesthetic style variations for visual generation';
COMMENT ON TABLE luv_prompt_templates IS 'Structured prompt fragments categorized by type (chassis, aesthetic, context, style)';
COMMENT ON TABLE luv_references IS 'Canonical reference images for visual consistency (canonical, variation, training)';
COMMENT ON TABLE luv_generations IS 'Generated media with prompt, model, and rating metadata';
COMMENT ON TABLE luv_training_sets IS 'LoRA training set collections with status tracking and model config';
COMMENT ON TABLE luv_training_set_items IS 'Items in training sets — each references exactly one reference or generation';
COMMENT ON TABLE luv_conversations IS 'Chat sandbox sessions with soul snapshot and model selection';
COMMENT ON TABLE luv_messages IS 'Individual messages within chat conversations';
COMMENT ON COLUMN luv_character.soul_data IS 'JSONB: personality traits, voice characteristics, rules, skills, background, system_prompt_override';
COMMENT ON COLUMN luv_character.chassis_data IS 'JSONB: face, body, coloring, age_appearance, distinguishing_features';
COMMENT ON COLUMN luv_training_set_items.reference_id IS 'FK to luv_references — exactly one of reference_id or generation_id must be set';
COMMENT ON COLUMN luv_training_set_items.generation_id IS 'FK to luv_generations — exactly one of reference_id or generation_id must be set';
