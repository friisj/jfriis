import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const systemPrompt = `You are an expert at writing detailed image generation prompts.
Your task is to expand a simple user description into a comprehensive, detailed prompt that will produce high-quality images.

Guidelines:
- Include specific details about composition, lighting, style, and mood
- Use descriptive language that guides the AI model effectively
- Keep the prompt concise but comprehensive (2-4 sentences)
- Focus on visual elements and artistic direction
- Do NOT include technical parameters like resolution, model names, or aspect ratios
- Output ONLY the prompt text, no additional commentary

Example input: "A modern product photo on a white background"
Example output: "A professional product photograph featuring clean composition on a pristine white backdrop with soft studio lighting. The subject is centered with optimal focus, casting subtle shadows that add depth. The lighting creates gentle highlights that emphasize form and texture while maintaining a modern, minimalist aesthetic."`;

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: `User description: ${text}\n\nGenerate detailed prompt:` },
    ]);

    const prompt = result.response.text().trim();

    return NextResponse.json({ prompt });
  } catch (error) {
    console.error('Prompt generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate prompt' },
      { status: 500 }
    );
  }
}
