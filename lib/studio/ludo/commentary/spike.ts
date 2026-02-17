/**
 * SPIKE: LLM-Enhanced AI Commentary with Voice
 *
 * Testing Gemini 2.0 Flash + ElevenLabs Turbo v2.5
 * Goal: Validate text quality, voice quality, and latency
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
// ElevenLabs SDK imports node:child_process/events/stream which breaks webpack client builds
// Lazy import to avoid build-time bundling of Node.js modules
type ElevenLabsClientType = import('@elevenlabs/elevenlabs-js').ElevenLabsClient;

// ============== TYPES ==============

export interface SpikeContext {
  personality: 'AGGRESSIVE' | 'DEFENSIVE' | 'TACTICAL' | 'BALANCED';
  move: string;
  moment: 'opening' | 'hit' | 'double' | 'prime' | 'win' | 'loss' | 'critical';
  advantage: 'strong' | 'even' | 'behind';
  opponentName: string;
  boardContext?: string;
}

export interface SpikeResult {
  text: string;
  audio?: Blob;
  textLatency: number;
  voiceLatency: number;
  totalLatency: number;
}

// ============== API CLIENTS ==============

let geminiClient: GoogleGenerativeAI | null = null;
let elevenLabsClient: ElevenLabsClientType | null = null;

export async function initializeClients(geminiApiKey: string, elevenLabsApiKey: string) {
  geminiClient = new GoogleGenerativeAI(geminiApiKey);
  const { ElevenLabsClient } = await import('@elevenlabs/elevenlabs-js');
  elevenLabsClient = new ElevenLabsClient({ apiKey: elevenLabsApiKey });
}

// ============== PERSONALITY PROMPTS ==============

const PERSONALITY_PROFILES = {
  AGGRESSIVE: {
    name: 'Alice',
    traits: 'Bold, taunting, risk-taking, confident',
    tone: 'Direct, challenging, occasional bravado',
    examples: [
      "Got you! To the bar you go.",
      "Feeling nervous? You should be.",
      "Let's see if you can handle this prime.",
      "That's how it's done. Another one?"
    ]
  },
  DEFENSIVE: {
    name: 'Dan',
    traits: 'Cautious, analytical, safety-focused, humble',
    tone: 'Measured, thoughtful, respectful',
    examples: [
      "Not flashy, but it's solid backgammon.",
      "Sorry about that. Building my position here.",
      "The position warrants a double. Numbers don't lie.",
      "Good game. Your opening was interesting."
    ]
  },
  TACTICAL: {
    name: 'Tara',
    traits: 'Strategic, data-driven, educational, precise',
    tone: 'Professional, analytical, insightful',
    examples: [
      "Classic Edley slot. Statistically sound.",
      "That's the problem with leaving 6 shots.",
      "Four-point prime with anchor. Textbook holding game.",
      "The key moment was move 8. Your alternative was slightly better."
    ]
  },
  BALANCED: {
    name: 'Barry',
    traits: 'Friendly, fair, balanced, good sport',
    tone: 'Conversational, neutral, pleasant',
    examples: [
      "Solid opening. Establishing the bar point.",
      "Opportunity presents itself. Making the obvious play.",
      "Building blockade. This should slow you down nicely.",
      "Well played. That middle game was interesting."
    ]
  }
};

// ============== GEMINI COMMENTARY GENERATION ==============

export async function generateCommentary(context: SpikeContext): Promise<string> {
  if (!geminiClient) {
    throw new Error('Gemini client not initialized. Call initializeClients() first.');
  }

  console.log('[GEMINI] Starting text generation...');

  const profile = PERSONALITY_PROFILES[context.personality];

  const prompt = `You are ${context.opponentName} (${profile.name}), an ${context.personality} backgammon AI opponent.

PERSONALITY TRAITS:
- ${profile.traits}
- Tone: ${profile.tone}

VOICE EXAMPLES (stay consistent with this style):
${profile.examples.map(ex => `- "${ex}"`).join('\n')}

CRITICAL RULES:
1. Stay in character - be ${context.personality.toLowerCase()}, not polite/neutral
2. Keep it brief: 1-2 short sentences maximum
3. Sound natural and conversational (will be spoken aloud)
4. Reference the specific moment, but don't over-explain
5. Match the advantage level (${context.advantage})

CURRENT SITUATION:
- Moment: ${context.moment}
- Move made: ${context.move}
- Position: ${context.advantage} advantage
${context.boardContext ? `- Context: ${context.boardContext}` : ''}

Generate in-character commentary NOW (brief, spoken, ${context.personality.toLowerCase()} tone):`;

  const model = geminiClient.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    console.log('[GEMINI] ✅ Text generated successfully');

    // Remove quotes if wrapped
    return text.replace(/^["']|["']$/g, '');
  } catch (error) {
    console.error('[GEMINI] ❌ API Error:', error);
    throw new Error(`Gemini API failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============== ELEVENLABS VOICE SYNTHESIS ==============

// Voice IDs for each personality (using standard ElevenLabs voices)
const VOICE_IDS = {
  AGGRESSIVE: 'EXAVITQu4vr4xnSDxMaL', // Sarah - confident female
  DEFENSIVE: 'pNInz6obpgDQGcFmaJgB', // Adam - calm male
  TACTICAL: 'MF3mGyEYCl7XYWbV9V6O', // Elli - professional female
  BALANCED: 'TxGEqnHWrfWFTfGW9XjX', // Josh - friendly male
};

export async function synthesizeVoice(
  text: string,
  personality: SpikeContext['personality']
): Promise<Blob> {
  if (!elevenLabsClient) {
    throw new Error('ElevenLabs client not initialized. Call initializeClients() first.');
  }

  console.log('[ELEVENLABS] Starting voice synthesis...');

  const voiceId = VOICE_IDS[personality];

  try {
    // Use the text-to-speech API
    const audio = await elevenLabsClient.textToSpeech.convert(voiceId, {
      text,
      modelId: 'eleven_turbo_v2_5',
      voiceSettings: {
        stability: personality === 'AGGRESSIVE' ? 0.4 : personality === 'DEFENSIVE' ? 0.7 : 0.5,
        similarityBoost: 0.75,
        style: personality === 'AGGRESSIVE' ? 0.6 : 0.4,
      }
    });

    // Convert stream to blob
    const chunks: BlobPart[] = [];
    const reader = audio.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value as BlobPart);
      }
    } finally {
      reader.releaseLock();
    }

    const blob = new Blob(chunks, { type: 'audio/mpeg' });
    console.log('[ELEVENLABS] ✅ Voice synthesized successfully');
    return blob;
  } catch (error) {
    console.error('[ELEVENLABS] ❌ API Error:', error);
    throw new Error(`ElevenLabs API failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============== TEST HARNESS ==============

export async function testScenario(scenario: SpikeContext): Promise<SpikeResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${scenario.moment} - ${scenario.personality}`);
  console.log(`Move: ${scenario.move}`);
  console.log(`${'='.repeat(60)}\n`);

  const startTime = Date.now();

  // Generate text
  console.log('⏳ Generating commentary with Gemini...');
  const textStart = Date.now();
  const text = await generateCommentary(scenario);
  const textLatency = Date.now() - textStart;
  console.log(`✅ Text generated (${textLatency}ms):`);
  console.log(`   "${text}"\n`);

  // Synthesize voice
  console.log('⏳ Synthesizing voice with ElevenLabs...');
  const voiceStart = Date.now();
  const audio = await synthesizeVoice(text, scenario.personality);
  const voiceLatency = Date.now() - voiceStart;
  console.log(`✅ Voice generated (${voiceLatency}ms)`);
  console.log(`   Audio size: ${(audio.size / 1024).toFixed(2)} KB\n`);

  const totalLatency = Date.now() - startTime;
  console.log(`⏱️  Total latency: ${totalLatency}ms\n`);

  return {
    text,
    audio,
    textLatency,
    voiceLatency,
    totalLatency
  };
}

// ============== HELPER: PLAY AUDIO IN BROWSER ==============

export function playAudio(audioBlob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      resolve();
    };

    audio.onerror = (error) => {
      URL.revokeObjectURL(audioUrl);
      reject(error);
    };

    audio.play().catch(reject);
  });
}

// ============== BATCH TESTING ==============

export async function runAllTests() {
  const scenarios: SpikeContext[] = [
    {
      personality: 'AGGRESSIVE',
      move: '8/5 6/5',
      moment: 'opening',
      advantage: 'even',
      opponentName: 'Aggressive Alice',
      boardContext: 'Opening roll 3-1, slotting the 5-point'
    },
    {
      personality: 'AGGRESSIVE',
      move: '13/7*',
      moment: 'hit',
      advantage: 'strong',
      opponentName: 'Aggressive Alice',
      boardContext: 'Hit opponent checker, sending to bar'
    },
    {
      personality: 'AGGRESSIVE',
      move: 'Double to 2',
      moment: 'double',
      advantage: 'strong',
      opponentName: 'Aggressive Alice',
      boardContext: 'Offering doubling cube with strong position'
    },
    {
      personality: 'AGGRESSIVE',
      move: 'Victory',
      moment: 'win',
      advantage: 'strong',
      opponentName: 'Aggressive Alice',
      boardContext: 'Won the game'
    },
    {
      personality: 'DEFENSIVE',
      move: '24/23 13/11',
      moment: 'opening',
      advantage: 'even',
      opponentName: 'Defensive Dan',
      boardContext: 'Opening roll 2-1, cautious split'
    },
    {
      personality: 'TACTICAL',
      move: '8/4 6/4',
      moment: 'prime',
      advantage: 'strong',
      opponentName: 'Tactical Tara',
      boardContext: 'Building 4-point prime'
    },
  ];

  const results: SpikeResult[] = [];

  for (const scenario of scenarios) {
    try {
      const result = await testScenario(scenario);
      results.push(result);

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ Test failed:`, error);
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(60)}\n`);

  const avgTextLatency = results.reduce((sum, r) => sum + r.textLatency, 0) / results.length;
  const avgVoiceLatency = results.reduce((sum, r) => sum + r.voiceLatency, 0) / results.length;
  const avgTotalLatency = results.reduce((sum, r) => sum + r.totalLatency, 0) / results.length;

  console.log(`Tests completed: ${results.length}/${scenarios.length}`);
  console.log(`Average text latency: ${avgTextLatency.toFixed(0)}ms`);
  console.log(`Average voice latency: ${avgVoiceLatency.toFixed(0)}ms`);
  console.log(`Average total latency: ${avgTotalLatency.toFixed(0)}ms`);
  console.log('');

  return results;
}
