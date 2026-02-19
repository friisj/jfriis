import { GoogleGenerativeAI } from "@google/generative-ai";

// Lazy init — avoid throwing at import time during build
let _genAI: GoogleGenerativeAI | null = null;
function getGenAI() {
  if (!_genAI) {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error(
        "GOOGLE_GENERATIVE_AI_API_KEY is not set in environment variables"
      );
    }
    _genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  }
  return _genAI;
}

/**
 * Gemini Pro - Use for:
 * - Multi-option wireframe generation (cost optimization)
 * - Bulk generation tasks
 * - Initial exploration and ideation
 */
export const GEMINI_MODEL = "gemini-2.0-flash" as const;

/**
 * Get Gemini model instance
 */
export function getGeminiModel(options?: {
  temperature?: number;
  maxOutputTokens?: number;
}) {
  return getGenAI().getGenerativeModel({
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
  const model = getGenAI().getGenerativeModel({
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
