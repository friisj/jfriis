import { NextResponse } from "next/server";
import { sendToClaudeSonnet } from "@/lib/studio/chalk/ai/anthropic";
import type { WireframeComponent } from "@/lib/studio/chalk/wireframe/schema";

export async function POST(request: Request) {
  try {
    const { screenshotBase64, currentComponent, annotations } =
      await request.json();

    if (!screenshotBase64 || !currentComponent || !annotations) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (annotations.length === 0) {
      return NextResponse.json(
        { error: "At least one annotation is required" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert UX designer helping iterate on wireframe components based on voice annotations with visual context.

The user will provide:
1. A screenshot of a wireframe component with numbered rectangles (C1, C2, C3) marking specific areas
2. Voice transcriptions associated with each rectangle
3. The current component structure in JSON format

Your task:
1. Understand what each voice annotation is referring to by looking at the rectangle's position
2. Interpret what changes the user wants based on their spoken feedback
3. Update the component structure to reflect those changes
4. Explain your interpretation and the specific changes made

Component types available:
- layout: container, orientation (vertical/horizontal), can have children
- content: text, size (small/medium/large), emphasis (normal/strong)
- interactive: button (variant: primary/secondary, size), input (type, label, placeholder, required)

Rules:
- Maintain fidelity level 1 (lo-fi wireframe style)
- Only modify properties that are indicated by the voice feedback
- Don't add components unless clearly requested
- Don't change the fundamental structure unless explicitly asked
- Be conservative - make minimal changes that match the intent`;

    // Format annotations for Claude
    const annotationText = annotations
      .map(
        (a: any) =>
          `${a.id}: "${a.transcription}" (positioned at x:${Math.round(a.bounds.x)}, y:${Math.round(a.bounds.y)})`
      )
      .join("\n");

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
              text: `Current component structure:\n\n${JSON.stringify(currentComponent, null, 2)}\n\nVoice annotations:\n${annotationText}\n\nPlease interpret the voice annotations (considering the visual context of where each rectangle is positioned) and return an updated component structure. Respond with JSON in this format:
{
  "interpretation": "Brief explanation of what the annotations indicate",
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
