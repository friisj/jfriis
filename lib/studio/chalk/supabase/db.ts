import { createClient as createServerClient } from "@/lib/studio/chalk/supabase/server";
import { createClient as createBrowserClient } from "@/lib/studio/chalk/supabase/client";

// Types matching our database schema
export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Board {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  tldraw_snapshot: any;
  viewport: any;
  created_at: string;
  updated_at: string;
}

export interface Version {
  id: string;
  board_id: string;
  parent_id: string | null;
  name: string | null;
  fidelity_level: number | null;
  tldraw_snapshot: any;
  screenshot_url: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  board_id: string;
  context_type: string;
  context_id: string | null;
  role: string;
  content: any;
  created_at: string;
}

// Helper functions for server-side operations
export async function getOrCreateUserProject(userId: string): Promise<Project> {
  const supabase = await createServerClient();

  // Check if a project exists (single-user, no owner_id filtering)
  const { data: projects, error: fetchError } = await supabase
    .from("chalk_projects")
    .select("*")
    .limit(1);

  if (fetchError) throw fetchError;

  if (projects && projects.length > 0) {
    return projects[0];
  }

  // Create a new project for the user
  const { data: newProject, error: createError } = await supabase
    .from("chalk_projects")
    .insert({
      name: "My First Project",
      description: "Welcome to Chalk!",
    })
    .select()
    .single();

  if (createError) throw createError;

  return newProject;
}

export async function getOrCreateProjectBoard(
  projectId: string
): Promise<Board> {
  const supabase = await createServerClient();

  // Check if project has a board
  const { data: boards, error: fetchError } = await supabase
    .from("chalk_boards")
    .select("*")
    .eq("project_id", projectId)
    .limit(1);

  if (fetchError) throw fetchError;

  if (boards && boards.length > 0) {
    return boards[0];
  }

  // Create a new board for the project
  const { data: newBoard, error: createError } = await supabase
    .from("chalk_boards")
    .insert({
      project_id: projectId,
      name: "Main Board",
      description: "Your canvas workspace",
      tldraw_snapshot: {},
      viewport: { x: 0, y: 0, zoom: 1 },
    })
    .select()
    .single();

  if (createError) throw createError;

  return newBoard;
}

export async function updateBoardSnapshot(
  boardId: string,
  snapshot: any,
  viewport?: { x: number; y: number; zoom: number }
): Promise<void> {
  const supabase = await createServerClient();

  const updateData: any = { tldraw_snapshot: snapshot };
  if (viewport) {
    updateData.viewport = viewport;
  }

  const { error } = await supabase
    .from("chalk_boards")
    .update(updateData)
    .eq("id", boardId);

  if (error) throw error;
}

export async function createVersion(
  boardId: string,
  userId: string,
  snapshot: any,
  options?: {
    name?: string;
    fidelityLevel?: number;
    screenshotUrl?: string;
    parentId?: string;
  }
): Promise<Version> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("chalk_versions")
    .insert({
      board_id: boardId,
      tldraw_snapshot: snapshot,
      name: options?.name || null,
      fidelity_level: options?.fidelityLevel || 1,
      screenshot_url: options?.screenshotUrl || null,
      parent_id: options?.parentId || null,
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function getBoardVersions(boardId: string): Promise<Version[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("chalk_versions")
    .select("*")
    .eq("board_id", boardId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function createChatMessage(
  boardId: string,
  userId: string,
  role: "user" | "assistant",
  content: any,
  contextType: "board" | "element" = "board",
  contextId?: string
): Promise<ChatMessage> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("chalk_chat_messages")
    .insert({
      board_id: boardId,
      role,
      content,
      context_type: contextType,
      context_id: contextId || null,
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function getBoardChatMessages(
  boardId: string
): Promise<ChatMessage[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("chalk_chat_messages")
    .select("*")
    .eq("board_id", boardId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data || [];
}
