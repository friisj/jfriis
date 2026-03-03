-- Add choke_group and gate pad type for expressive pad interactions
--
-- choke_group: nullable integer — pads sharing the same group silence each other on trigger
-- gate: new pad_type — sound plays while held, stops on release

-- Add choke_group column (nullable integer, pads in same group silence each other)
ALTER TABLE sampler_pads ADD COLUMN choke_group INTEGER;

-- Expand pad_type to include 'gate' (play while held, stop on release)
ALTER TABLE sampler_pads DROP CONSTRAINT sampler_pads_pad_type_check;
ALTER TABLE sampler_pads ADD CONSTRAINT sampler_pads_pad_type_check
  CHECK (pad_type IN ('trigger', 'gate', 'toggle', 'loop'));
