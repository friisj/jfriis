import { NextResponse } from "next/server";
import { sendToClaudeSonnet } from "@/lib/studio/chalk/ai/anthropic";
import type { WireframeComponent } from "@/lib/studio/chalk/wireframe/schema";

export async function POST(request: Request) {
  try {
    const { screenshotBase64, currentComponent } = await request.json();

    if (!screenshotBase64 || !currentComponent) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert UX designer helping iterate on wireframe components based on visual markup annotations.

The user will provide:
1. A screenshot of a wireframe component with hand-drawn markup annotations (arrows, circles, text, etc.)
2. The current component structure in JSON format

Your task:
1. Interpret the visual markup annotations to understand what changes the user wants
2. Update the component structure to reflect those changes
3. Explain your interpretation and the specific changes made

Component types available:
- layout: container, orientation (vertical/horizontal), can have children
- content: text, size (small/medium/large), emphasis (normal/strong)
- interactive: button (variant: primary/secondary, size), input (type, label, placeholder, required)

Rules:
- Maintain fidelity level 1 (lo-fi wireframe style)
- Only modify properties that are indicated by the markup
- Don't add components unless clearly indicated
- Don't change the fundamental structure unless markup shows reorganization
- Be conservative - make minimal changes that match the intent`;

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
              text: `Current component structure:\n\n${JSON.stringify(currentComponent, null, 2)}\n\nPlease interpret the markup annotations and return an updated component structure. Respond with JSON in this format:
{
  "interpretation": "Brief explanation of what the markup indicates",
  "changes": ["List of specific changes made"],
  "component": { ... updated component structure ... }
}`,
            },
          ],
        },
      ],
      {
        systemPrompt,
        maxTokens: 4096,
        temperature: 0.3,
      }
    );

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    // Parse Claude's response
    let parsedResponse;
    try {
      // Try to extract JSON from potential markdown code blocks
      const jsonMatch = textContent.text.match(/```json\n?([\s\S]*?)\n?```/);
      const jsonText = jsonMatch ? jsonMatch[1] : textContent.text;
      parsedResponse = JSON.parse(jsonText);
    } catch (e) {
      console.error("Failed to parse Claude response:", textContent.text);
      throw new Error("Failed to parse AI response as JSON");
    }

    return NextResponse.json({
      component: parsedResponse.component,
      interpretation: parsedResponse.interpretation || "",
      changes: parsedResponse.changes || [],
      usage: response.usage,
    });
  } catch (error) {
    console.error("Component iteration error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to iterate component",
      },
      { status: 500 }
    );
  }
}
