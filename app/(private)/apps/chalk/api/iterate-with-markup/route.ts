import { NextResponse } from "next/server";
import { sendToClaudeSonnet } from "@/lib/studio/chalk/ai/anthropic";
import { COMPONENT_SCHEMA } from "@/lib/studio/chalk/wireframe/schema";
import type { Wireframe } from "@/lib/studio/chalk/wireframe/schema";

export async function POST(request: Request) {
  try {
    const { screenshotBase64, currentWireframe } = await request.json();

    if (!screenshotBase64 || !currentWireframe) {
      return NextResponse.json(
        { error: "Screenshot and wireframe are required" },
        { status: 400 }
      );
    }

    console.log("Iterating wireframe with markup...");

    // Send to Claude Sonnet with vision
    const response = await sendToClaudeSonnet(
      [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: screenshotBase64.replace(/^data:image\/png;base64,/, ""),
              },
            },
            {
              type: "text",
              text: `This is a wireframe the user marked up with annotations.

CURRENT WIREFRAME (JSON):
${JSON.stringify(currentWireframe, null, 2)}

COMPONENT SCHEMA:
${JSON.stringify(COMPONENT_SCHEMA, null, 2)}

TASK:
1. Interpret the user's markup (arrows, circles, text annotations, drawings)
2. Generate an improved version addressing their feedback
3. Use ONLY components from the schema
4. Explain what changes you made and why

OUTPUT FORMAT (strict JSON):
{
  "interpretation": "What I understood from the markup",
  "changes": ["Change 1", "Change 2"],
  "wireframe": { "components": [/* updated component tree */] }
}

IMPORTANT: Return ONLY valid JSON. Do not include markdown formatting or explanatory text.`,
            },
          ],
        },
      ],
      {
        maxTokens: 4096,
        temperature: 0.7,
      }
    );

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    // Parse JSON response
    let jsonText = textContent.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```json?\n?/g, "").replace(/```$/g, "");
    }

    const result = JSON.parse(jsonText);

    console.log("Interpretation:", result.interpretation);
    console.log("Changes:", result.changes);

    return NextResponse.json({
      success: true,
      ...result,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    });
  } catch (error) {
    console.error("Markup iteration error:", error);
    return NextResponse.json(
      {
        error: "Failed to iterate with markup",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
