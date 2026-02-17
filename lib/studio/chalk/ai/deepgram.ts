import { createClient } from "@deepgram/sdk";

if (!process.env.DEEPGRAM_API_KEY) {
  throw new Error("DEEPGRAM_API_KEY is not set in environment variables");
}

export const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

/**
 * Transcribe audio using Deepgram's pre-recorded API
 * @param audioBlob Audio file as Buffer or Blob
 * @param options Transcription options
 * @returns Transcribed text
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  options?: {
    model?: string;
    language?: string;
    smart_format?: boolean;
    punctuate?: boolean;
  }
): Promise<string> {
  try {
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        model: options?.model || "nova-2",
        language: options?.language || "en-US",
        smart_format: options?.smart_format ?? true,
        punctuate: options?.punctuate ?? true,
      }
    );

    if (error) {
      throw error;
    }

    const transcript =
      result.results?.channels[0]?.alternatives[0]?.transcript || "";

    return transcript;
  } catch (error) {
    console.error("Deepgram transcription error:", error);
    throw new Error(
      `Failed to transcribe audio: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
