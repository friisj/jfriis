-- Fix Chalk RLS policies: use is_admin() function instead of direct auth.users query
-- The inline EXISTS query fails because anon role cannot read auth.users

DROP POLICY "chalk_projects_admin" ON chalk_projects;
DROP POLICY "chalk_boards_admin" ON chalk_boards;
DROP POLICY "chalk_versions_admin" ON chalk_versions;
DROP POLICY "chalk_chat_messages_admin" ON chalk_chat_messages;

CREATE POLICY "chalk_projects_admin" ON chalk_projects FOR ALL USING (is_admin());
CREATE POLICY "chalk_boards_admin" ON chalk_boards FOR ALL USING (is_admin());
CREATE POLICY "chalk_versions_admin" ON chalk_versions FOR ALL USING (is_admin());
CREATE POLICY "chalk_chat_messages_admin" ON chalk_chat_messages FOR ALL USING (is_admin());
