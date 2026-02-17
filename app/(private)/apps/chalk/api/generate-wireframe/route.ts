import { NextResponse } from "next/server";
import { sendToGemini } from "@/lib/studio/chalk/ai/gemini";
import {
  getWireframeGenerationPrompt,
  formatUserPrompt,
} from "@/lib/studio/chalk/wireframe/prompts";
import type { GenerationResponse } from "@/lib/studio/chalk/wireframe/schema";

export async function POST(request: Request) {
  try {
    const { prompt, context } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Get system prompt and format user message
    const systemInstruction = getWireframeGenerationPrompt();
    const userMessage = formatUserPrompt(prompt, context);

    console.log("Generating wireframes for:", userMessage);

    // Send to Gemini
    const response = await sendToGemini(userMessage, {
      systemInstruction,
      temperature: 0.8, // Encourage creativity
      maxOutputTokens: 8192,
    });

    console.log("Raw response:", response.text);

    // Parse JSON response
    let generationResponse: GenerationResponse;
    try {
      // Remove markdown code blocks if present
      let jsonText = response.text.trim();
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/```json?\n?/g, "").replace(/```$/g, "");
      }
      generationResponse = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("Failed to parse JSON:", parseError);
      console.error("Response text:", response.text);
      return NextResponse.json(
        {
          error: "Failed to parse AI response",
          details:
            parseError instanceof Error ? parseError.message : "Unknown error",
          rawResponse: response.text,
        },
        { status: 500 }
      );
    }

    // Validate response has options
    if (!generationResponse.options || generationResponse.options.length === 0) {
      return NextResponse.json(
        {
          error: "AI did not generate any options",
          rawResponse: response.text,
        },
        { status: 500 }
      );
    }

    console.log(
      `Generated ${generationResponse.options.length} wireframe options`
    );

    return NextResponse.json({
      success: true,
      ...generationResponse,
    });
  } catch (error) {
    console.error("Wireframe generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate wireframes",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
