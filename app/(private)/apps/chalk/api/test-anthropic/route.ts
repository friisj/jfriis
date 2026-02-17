import { NextResponse } from "next/server";
import { sendToClaudeSonnet } from "@/lib/studio/chalk/ai/anthropic";

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const response = await sendToClaudeSonnet([
      {
        role: "user",
        content: message,
      },
    ]);

    const textContent = response.content.find((c) => c.type === "text");

    return NextResponse.json({
      success: true,
      response: textContent?.type === "text" ? textContent.text : "",
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    });
  } catch (error) {
    console.error("Anthropic API error:", error);
    return NextResponse.json(
      {
        error: "Failed to communicate with Anthropic API",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
