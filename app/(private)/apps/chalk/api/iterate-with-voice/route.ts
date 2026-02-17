import { NextResponse } from "next/server";
import { sendToClaudeSonnet } from "@/lib/studio/chalk/ai/anthropic";
import { COMPONENT_SCHEMA } from "@/lib/studio/chalk/wireframe/schema";
import type { Wireframe } from "@/lib/studio/chalk/wireframe/schema";

interface VoiceAnnotation {
  id: string;
  type: "rectangle" | "freehand" | "text";
  text?: string;
  transcription?: string;
  timestamp?: number;
}

export async function POST(request: Request) {
  try {
    const { screenshotBase64, currentWireframe, annotations } =
      await request.json();

    if (!screenshotBase64 || !currentWireframe || !annotations) {
      return NextResponse.json(
        {
          error: "Screenshot, wireframe, and annotations are required",
        },
        { status: 400 }
      );
    }

    console.log("Iterating wireframe with voice annotations...");
    console.log(
      `Received ${annotations.length} annotations:`,
      annotations.map((a: VoiceAnnotation) => `${a.id}: ${a.transcription}`)
    );

    // Format annotations for context (no spatial data - LLM can see positions in screenshot)
    const annotationContext = annotations
      .map((a: VoiceAnnotation) => {
        return `${a.id} (${a.type}): "${a.transcription}"`;
      })
      .join("\n");

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
              text: `This is a wireframe with voice annotations. The user drew annotations (rectangles and/or freehand drawings) and recorded verbal feedback for each.

CURRENT WIREFRAME (JSON):
${JSON.stringify(currentWireframe, null, 2)}

VOICE ANNOTATIONS (with transcribed feedback):
${annotationContext}

COMPONENT SCHEMA:
${JSON.stringify(COMPONENT_SCHEMA, null, 2)}

TASK:
1. Look at the screenshot to see where each annotation is positioned or drawn
2. Read the transcribed voice feedback for each annotation ID
3. Generate an improved version addressing all the feedback
4. Use ONLY components from the schema
5. Explain what changes you made and why

OUTPUT FORMAT (strict JSON):
{
  "interpretation": "Summary of what I understood from all voice annotations",
  "changes": ["Change 1", "Change 2", "Change 3"],
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
    console.error("Voice iteration error:", error);
    return NextResponse.json(
      {
        error: "Failed to iterate with voice annotations",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
