import { redirect } from "next/navigation";
import { createClient } from "@/lib/studio/chalk/supabase/server";
import {
  getOrCreateUserProject,
  getOrCreateProjectBoard,
} from "@/lib/studio/chalk/supabase/db";
import { MainCanvas } from "@/components/studio/chalk/canvas/MainCanvas";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get or create the user's project and board
  const project = await getOrCreateUserProject(user.id);
  const board = await getOrCreateProjectBoard(project.id);

  return (
    <div className="h-screen w-screen flex flex-col">
      {/* Header */}
      <header className="h-14 border-b bg-white flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Chalk</h1>
          <div className="text-sm text-gray-600">
            {project.name} / {board.name}
          </div>
        </div>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Sign Out
          </button>
        </form>
      </header>

      {/* Canvas with Chat */}
      <MainCanvas
        boardId={board.id}
        userId={user.id}
        initialSnapshot={board.tldraw_snapshot}
        initialViewport={board.viewport}
      />
    </div>
  );
}
