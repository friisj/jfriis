-- Add compaction and branching support to luv_conversations
--
-- compact_summary: JSON string produced by agent-driven compaction, containing
--   goals, decisions, important_context, open_threads, and carry_forward_summary.
--   NULL until a compaction has been run on this conversation.
--
-- parent_conversation_id: set on branched conversations, linking back to the
--   source conversation that was compacted and then branched from.
--
-- is_compacted: true once a compaction has been run. Does not prevent further
--   messages — the conversation can continue after compaction.

ALTER TABLE luv_conversations
  ADD COLUMN compact_summary        text,
  ADD COLUMN parent_conversation_id uuid REFERENCES luv_conversations(id) ON DELETE SET NULL,
  ADD COLUMN is_compacted           boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN luv_conversations.compact_summary IS
  'Agent-produced compaction: JSON with goals, decisions, important_context, open_threads, carry_forward_summary';

COMMENT ON COLUMN luv_conversations.parent_conversation_id IS
  'For branched conversations: the source conversation this was branched from';

COMMENT ON COLUMN luv_conversations.is_compacted IS
  'True once agent compaction has been run on this conversation';
