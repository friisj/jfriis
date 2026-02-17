import { NextResponse } from "next/server";
import { sendToGemini } from "@/lib/studio/chalk/ai/gemini";

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const response = await sendToGemini(message);

    return NextResponse.json({
      success: true,
      response: response.text,
      model: "gemini-2.0-flash-exp",
    });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      {
        error: "Failed to communicate with Gemini API",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
