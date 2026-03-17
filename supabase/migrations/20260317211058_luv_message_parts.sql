-- Add parts column to luv_messages for structured message persistence
-- (tool calls, file attachments, reasoning blocks, etc.)
-- The existing content column remains as the plain-text fallback.

alter table luv_messages
  add column if not exists parts jsonb;

comment on column luv_messages.parts is 'Structured message parts (tool calls, files, reasoning). Null means text-only (use content column).';
