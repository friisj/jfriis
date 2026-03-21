-- Add turn_count column to track user turns in conversations.
-- Survives compaction and server-side windowing; used for process state resolution.
ALTER TABLE luv_conversations
  ADD COLUMN turn_count integer NOT NULL DEFAULT 0;
