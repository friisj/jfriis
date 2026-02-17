// @ts-nocheck
import { createClient } from "@/lib/studio/chalk/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boardId, snapshot, viewport } = await request.json();

    console.log("Save board request:", {
      boardId,
      userId: user.id,
      snapshotKeys: Object.keys(snapshot || {}),
      viewport,
    });

    if (!boardId || !snapshot) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const updateData: any = { tldraw_snapshot: snapshot };
    if (viewport) {
      updateData.viewport = viewport;
    }

    const { error, data } = await supabase
      .from("boards")
      .update(updateData)
      .eq("id", boardId)
      .select();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to save board", details: error.message },
        { status: 500 }
      );
    }

    console.log("Board saved successfully:", { boardId, updated: data?.length });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Save board error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
