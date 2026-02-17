import { NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/studio/chalk/ai/deepgram";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: "Audio file is required" },
        { status: 400 }
      );
    }

    console.log(
      `Transcribing audio: ${audioFile.name}, size: ${audioFile.size} bytes, type: ${audioFile.type}`
    );

    // Convert File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Transcribe using Deepgram
    const transcript = await transcribeAudio(buffer, {
      model: "nova-2",
      language: "en-US",
      smart_format: true,
      punctuate: true,
    });

    console.log("Transcription result:", transcript);

    return NextResponse.json({
      success: true,
      transcript: transcript || "No speech detected",
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      {
        error: "Failed to transcribe audio",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
