import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  throw new Error(
    "GOOGLE_GENERATIVE_AI_API_KEY is not set in environment variables"
  );
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

/**
 * Gemini Pro - Use for:
 * - Multi-option wireframe generation (cost optimization)
 * - Bulk generation tasks
 * - Initial exploration and ideation
 */
export const GEMINI_MODEL = "gemini-2.0-flash-exp" as const;

/**
 * Get Gemini model instance
 */
export function getGeminiModel(options?: {
  temperature?: number;
  maxOutputTokens?: number;
}) {
  return genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      temperature: options?.temperature ?? 1.0,
      maxOutputTokens: options?.maxOutputTokens ?? 8192,
    },
  });
}

/**
 * Send a message to Gemini
 */
export async function sendToGemini(
  prompt: string,
  options?: {
    temperature?: number;
    maxOutputTokens?: number;
    systemInstruction?: string;
  }
) {
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      temperature: options?.temperature ?? 1.0,
      maxOutputTokens: options?.maxOutputTokens ?? 8192,
    },
    systemInstruction: options?.systemInstruction,
  });

  const result = await model.generateContent(prompt);
  const response = result.response;

  return {
    text: response.text(),
    raw: response,
  };
}
