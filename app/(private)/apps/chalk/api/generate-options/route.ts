import { NextResponse } from "next/server";
import { sendToGemini, GEMINI_MODEL } from "@/lib/studio/chalk/ai/gemini";
import type { WireframeOption } from "@/lib/studio/chalk/types/chat";

const COMPONENT_SCHEMA = {
  version: "1.0",
  fidelityLevels: {
    1: "sketch - boxes and labels only",
    2: "wireframe - structure, hierarchy, spacing",
    3: "lo-fi - interactions, states",
    4: "mid-fi - colors, typography",
    5: "hi-fi - full design",
  },
  components: [
    {
      id: "container",
      type: "layout",
      fidelity: 1,
      props: {
        label: "string",
        orientation: "'vertical' | 'horizontal'",
        children: "Component[]",
      },
    },
    {
      id: "text",
      type: "content",
      fidelity: 1,
      props: {
        content: "string",
        size: "'small' | 'medium' | 'large'",
        emphasis: "'normal' | 'strong'",
      },
    },
    {
      id: "button",
      type: "interactive",
      fidelity: 1,
      props: {
        label: "string",
        variant: "'primary' | 'secondary' | 'tertiary'",
        size: "'small' | 'medium' | 'large'",
      },
    },
    {
      id: "input",
      type: "interactive",
      fidelity: 1,
      props: {
        label: "string",
        placeholder: "string",
        type: "'text' | 'email' | 'password' | 'number'",
        required: "boolean",
      },
    },
    {
      id: "list",
      type: "layout",
      fidelity: 1,
      props: {
        items: "Component[]",
        orientation: "'vertical' | 'horizontal'",
        spacing: "'tight' | 'normal' | 'loose'",
      },
    },
    {
      id: "image",
      type: "content",
      fidelity: 1,
      props: {
        width: "number",
        height: "number",
        alt: "string",
        placeholder: "boolean - true for lo-fi box with X",
      },
    },
    {
      id: "divider",
      type: "layout",
      fidelity: 1,
      props: {
        orientation: "'horizontal' | 'vertical'",
      },
    },
  ],
};

const SYSTEM_PROMPT = `You are a UX expert helping designers explore low-fidelity wireframe concepts.

COMPONENT SCHEMA:
${JSON.stringify(COMPONENT_SCHEMA, null, 2)}

RULES:
1. Only use components from the schema above
2. Generate 3-4 distinct design options
3. For each option, provide a clear rationale explaining:
   - Why this approach solves the user's needs
   - What UX principles it follows
   - When this pattern works best
4. Keep fidelity at level 1 (boxes and labels only)
5. Focus on structure, flow, and information hierarchy
6. Never add visual styling (colors, fonts, images)
7. Use descriptive labels, not lorem ipsum

OUTPUT FORMAT (strict JSON):
{
  "options": [
    {
      "id": "option-1",
      "title": "Option A: [Descriptive Name]",
      "rationale": "2-3 sentences explaining the approach",
      "principles": ["Principle 1", "Principle 2"],
      "wireframe": {
        "components": [/* component tree */]
      }
    }
  ]
}

When generating options, think about:
- Different user flows (linear vs branching)
- Information density (minimal vs comprehensive)
- Interaction patterns (progressive disclosure vs all-at-once)
- Cognitive load (simple vs feature-rich)`;

export async function POST(request: Request) {
  try {
    const { prompt, context, chatHistory } = await request.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Build context-aware prompt
    let contextInfo = "";
    if (context?.type === "element" && context.elementData) {
      contextInfo = `\n\nCONTEXT: User is focused on a specific element:\n${JSON.stringify(context.elementData, null, 2)}`;
    } else if (context?.type === "canvas") {
      contextInfo = `\n\nCONTEXT: User is working on the canvas level.`;
    }

    // Add chat history if provided
    let historyInfo = "";
    if (chatHistory && chatHistory.length > 0) {
      const recentHistory = chatHistory.slice(-3); // Last 3 messages
      historyInfo = `\n\nRECENT CONVERSATION:\n${recentHistory.map((m: any) => `${m.role}: ${m.content}`).join("\n")}`;
    }

    const fullPrompt = `${prompt}${contextInfo}${historyInfo}

Please generate 3-4 wireframe options for this request. Remember to follow the component schema and keep fidelity at level 1.`;

    const response = await sendToGemini(fullPrompt, {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.9,
      maxOutputTokens: 8192,
    });

    // Parse JSON response
    let parsed;
    try {
      // Try to extract JSON from potential markdown code blocks
      const jsonMatch = response.text.match(/```json\n?([\s\S]*?)\n?```/);
      const jsonText = jsonMatch ? jsonMatch[1] : response.text;
      parsed = JSON.parse(jsonText);
    } catch (e) {
      console.error("Failed to parse Gemini response:", response.text);
      return NextResponse.json(
        { error: "Failed to parse AI response as JSON" },
        { status: 500 }
      );
    }

    if (!parsed.options || !Array.isArray(parsed.options)) {
      return NextResponse.json(
        { error: "Invalid response format from AI" },
        { status: 500 }
      );
    }

    // Validate and ensure each option has an id
    const options: WireframeOption[] = parsed.options.map((opt: any, index: number) => ({
      id: opt.id || `option-${index + 1}`,
      title: opt.title || `Option ${index + 1}`,
      rationale: opt.rationale || "",
      principles: opt.principles || [],
      wireframe: opt.wireframe || { components: [] },
    }));

    return NextResponse.json({
      options,
      usage: {
        model: GEMINI_MODEL,
        // Note: Gemini doesn't provide detailed usage stats like Claude
      },
    });
  } catch (error) {
    console.error("Generate options error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate options",
      },
      { status: 500 }
    );
  }
}
