-- Auth and Row Level Security (RLS) Migration
-- Sets up authentication and access control

-- Enable Row Level Security on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE specimens ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE backlog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_specimen_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_entry_specimens ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_specimens ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_entry_projects ENABLE ROW LEVEL SECURITY;

-- Create admin role check function
-- For single-user setup, you can use your user ID directly
-- Or create a profiles table with an is_admin flag

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- For single user: check if authenticated
  -- Replace with your actual user ID for production, or use a profiles table
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Projects RLS Policies
-- Public read for published projects
CREATE POLICY "Public can view published projects"
  ON projects FOR SELECT
  USING (published = true);

-- Admin can do everything
CREATE POLICY "Admin can do everything with projects"
  ON projects FOR ALL
  USING (is_admin());

-- Log Entries RLS Policies
CREATE POLICY "Public can view published log entries"
  ON log_entries FOR SELECT
  USING (published = true);

CREATE POLICY "Admin can do everything with log entries"
  ON log_entries FOR ALL
  USING (is_admin());

-- Specimens RLS Policies
CREATE POLICY "Public can view published specimens"
  ON specimens FOR SELECT
  USING (published = true);

CREATE POLICY "Admin can do everything with specimens"
  ON specimens FOR ALL
  USING (is_admin());

-- Gallery Sequences RLS Policies
CREATE POLICY "Public can view published gallery sequences"
  ON gallery_sequences FOR SELECT
  USING (published = true);

CREATE POLICY "Admin can do everything with gallery sequences"
  ON gallery_sequences FOR ALL
  USING (is_admin());

-- Landing Pages RLS Policies
CREATE POLICY "Public can view published landing pages"
  ON landing_pages FOR SELECT
  USING (published = true);

CREATE POLICY "Admin can do everything with landing pages"
  ON landing_pages FOR ALL
  USING (is_admin());

-- Backlog Items RLS Policies
-- Backlog is admin-only
CREATE POLICY "Admin can do everything with backlog items"
  ON backlog_items FOR ALL
  USING (is_admin());

-- Junction Tables RLS Policies
-- Public can read if related items are published

CREATE POLICY "Public can view gallery specimen items"
  ON gallery_specimen_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gallery_sequences
      WHERE id = gallery_specimen_items.gallery_sequence_id
      AND published = true
    )
  );

CREATE POLICY "Admin can do everything with gallery specimen items"
  ON gallery_specimen_items FOR ALL
  USING (is_admin());

CREATE POLICY "Public can view log entry specimens"
  ON log_entry_specimens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM log_entries
      WHERE id = log_entry_specimens.log_entry_id
      AND published = true
    )
  );

CREATE POLICY "Admin can do everything with log entry specimens"
  ON log_entry_specimens FOR ALL
  USING (is_admin());

CREATE POLICY "Public can view project specimens"
  ON project_specimens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_specimens.project_id
      AND published = true
    )
  );

CREATE POLICY "Admin can do everything with project specimens"
  ON project_specimens FOR ALL
  USING (is_admin());

CREATE POLICY "Public can view log entry projects"
  ON log_entry_projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM log_entries
      WHERE id = log_entry_projects.log_entry_id
      AND published = true
    )
  );

CREATE POLICY "Admin can do everything with log entry projects"
  ON log_entry_projects FOR ALL
  USING (is_admin());

-- Optional: Create a profiles table for user metadata
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Profile info
  display_name TEXT,
  avatar_url TEXT,

  -- Admin flag
  is_admin BOOLEAN NOT NULL DEFAULT false,

  -- Metadata
  metadata JSONB
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
CREATE POLICY "Public can view profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admin can do everything with profiles"
  ON profiles FOR ALL
  USING (is_admin());

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

COMMENT ON TABLE profiles IS 'User profiles with admin flags';
COMMENT ON FUNCTION is_admin() IS 'Check if current user is an admin';
