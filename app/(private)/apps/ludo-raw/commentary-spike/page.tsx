'use client';

import { useState } from 'react';
import {
  initializeClients,
  testScenario,
  runAllTests,
  playAudio,
  type SpikeContext,
  type SpikeResult
} from '@/lib/studio/ludo/commentary/spike';

export default function CommentarySpikePage() {
  const [geminiKey, setGeminiKey] = useState('');
  const [elevenLabsKey, setElevenLabsKey] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<SpikeResult[]>([]);
  const [currentTest, setCurrentTest] = useState<string>('');

  const handleInitialize = () => {
    if (!geminiKey || !elevenLabsKey) {
      alert('Please enter both API keys');
      return;
    }
    initializeClients(geminiKey, elevenLabsKey);
    setInitialized(true);
  };

  const handleQuickTest = async () => {
    if (!initialized) {
      alert('Please initialize clients first');
      return;
    }

    setTesting(true);
    setCurrentTest('Running quick test...');

    try {
      const scenario: SpikeContext = {
        personality: 'AGGRESSIVE',
        move: '13/7*',
        moment: 'hit',
        advantage: 'strong',
        opponentName: 'Aggressive Alice',
        boardContext: 'Hit opponent checker, sending to bar'
      };

      const result = await testScenario(scenario);
      setResults([result]);

      // Play the audio
      if (result.audio) {
        setCurrentTest('Playing audio...');
        await playAudio(result.audio);
      }

      setCurrentTest('Test complete!');
    } catch (error) {
      console.error('Test failed:', error);
      setCurrentTest(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTesting(false);
    }
  };

  const handleRunAllTests = async () => {
    if (!initialized) {
      alert('Please initialize clients first');
      return;
    }

    setTesting(true);
    setCurrentTest('Running all tests...');
    setResults([]);

    try {
      const allResults = await runAllTests();
      setResults(allResults);

      // Play each audio in sequence
      for (let i = 0; i < allResults.length; i++) {
        const result = allResults[i];
        if (result.audio) {
          setCurrentTest(`Playing audio ${i + 1}/${allResults.length}...`);
          await playAudio(result.audio);
          await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause between
        }
      }

      setCurrentTest(`All tests complete! (${allResults.length} scenarios)`);
    } catch (error) {
      console.error('Tests failed:', error);
      setCurrentTest(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTesting(false);
    }
  };

  const playResultAudio = async (index: number) => {
    const result = results[index];
    if (result.audio) {
      try {
        await playAudio(result.audio);
      } catch (error) {
        console.error('Failed to play audio:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">🎙️ AI Commentary Spike</h1>
        <p className="text-gray-400 mb-8">Testing Gemini 2.0 Flash + ElevenLabs Turbo v2.5</p>

        {/* API Keys */}
        {!initialized && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">1. Enter API Keys</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Gemini API Key</label>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="AIza..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">ElevenLabs API Key</label>
                <input
                  type="password"
                  value={elevenLabsKey}
                  onChange={(e) => setElevenLabsKey(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="sk_..."
                />
              </div>
              <button
                onClick={handleInitialize}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium"
              >
                Initialize Clients
              </button>
            </div>
          </div>
        )}

        {/* Test Controls */}
        {initialized && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">2. Run Tests</h2>
            <div className="flex gap-4">
              <button
                onClick={handleQuickTest}
                disabled={testing}
                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded font-medium"
              >
                Quick Test (1 scenario)
              </button>
              <button
                onClick={handleRunAllTests}
                disabled={testing}
                className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded font-medium"
              >
                Run All Tests (6 scenarios)
              </button>
            </div>
            {currentTest && (
              <div className="mt-4 p-3 bg-gray-700 rounded text-center">
                {currentTest}
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">3. Results</h2>

            {/* Summary */}
            <div className="mb-6 p-4 bg-gray-700 rounded">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-400">
                    {(results.reduce((sum, r) => sum + r.textLatency, 0) / results.length).toFixed(0)}ms
                  </div>
                  <div className="text-sm text-gray-400">Avg Text Latency</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">
                    {(results.reduce((sum, r) => sum + r.voiceLatency, 0) / results.length).toFixed(0)}ms
                  </div>
                  <div className="text-sm text-gray-400">Avg Voice Latency</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-400">
                    {(results.reduce((sum, r) => sum + r.totalLatency, 0) / results.length).toFixed(0)}ms
                  </div>
                  <div className="text-sm text-gray-400">Avg Total Latency</div>
                </div>
              </div>
            </div>

            {/* Individual Results */}
            <div className="space-y-3">
              {results.map((result, index) => (
                <div key={index} className="p-4 bg-gray-700 rounded">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-lg font-medium mb-1">&ldquo;{result.text}&rdquo;</p>
                      <div className="text-sm text-gray-400">
                        Text: {result.textLatency}ms | Voice: {result.voiceLatency}ms | Total: {result.totalLatency}ms
                      </div>
                    </div>
                    <button
                      onClick={() => playResultAudio(index)}
                      className="ml-4 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                    >
                      🔊 Play
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 p-4 bg-gray-800 rounded text-sm text-gray-400">
          <h3 className="font-semibold text-white mb-2">Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Get your Gemini API key from: https://aistudio.google.com/apikey</li>
            <li>Get your ElevenLabs API key from: https://elevenlabs.io/app/settings/api-keys</li>
            <li>Enter both keys above and click Initialize</li>
            <li>Run Quick Test for a single scenario with voice playback</li>
            <li>Run All Tests for 6 scenarios covering different personalities and moments</li>
            <li>Check console for detailed logs</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
