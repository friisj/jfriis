'use client'

import { useState } from 'react'

/**
 * Stance Detection Benchmark
 *
 * Tests H3: Can zero-shot LLM stance detection produce usable classifications
 * without task-specific training data?
 *
 * Flow:
 * 1. User defines entities and topics to evaluate
 * 2. User pastes article text
 * 3. System runs stance detection via LLM (zero-shot)
 * 4. User labels the "ground truth" stance
 * 5. System tracks accuracy across evaluations
 */

type Stance = 'FAVOR' | 'AGAINST' | 'NEUTRAL' | 'UNRELATED'

interface StanceResult {
  entity: string
  topic: string
  predictedStance: Stance
  confidence: number
  evidence: string
  humanLabel?: Stance
}

interface EvalSession {
  id: string
  articleText: string
  results: StanceResult[]
  timestamp: string
}

const SAMPLE_TOPICS = [
  'AI regulation',
  'Open source AI',
  'AI safety',
  'Government partnerships',
]

const SAMPLE_ARTICLE = `Sam Altman told Congress that AI regulation is "critical" and called for a new federal agency
to oversee AI development. "We think the benefits of the tools we have deployed so far vastly outweigh the risks,
but ensuring they do requires proactive regulation," Altman said. He specifically endorsed licensing requirements
for AI systems above a certain capability threshold. Critics noted that such regulations could entrench large
players like OpenAI while limiting competition from smaller startups and open source alternatives.`

export default function StanceDetectionBenchmark() {
  const [articleText, setArticleText] = useState(SAMPLE_ARTICLE)
  const [entityName, setEntityName] = useState('Sam Altman')
  const [topic, setTopic] = useState('AI regulation')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [sessions, setSessions] = useState<EvalSession[]>([])
  const [currentResults, setCurrentResults] = useState<StanceResult[]>([])

  const runStanceDetection = async () => {
    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `You are a stance detection system. Analyze the following article and determine the stance of the specified entity toward the specified topic.

ENTITY: ${entityName}
TOPIC: ${topic}

ARTICLE:
${articleText}

Classify the stance as one of: FAVOR, AGAINST, NEUTRAL, UNRELATED

Return ONLY valid JSON:
{
  "entity": "${entityName}",
  "topic": "${topic}",
  "stance": "FAVOR|AGAINST|NEUTRAL|UNRELATED",
  "confidence": 0.0-1.0,
  "evidence": "Direct quote or passage supporting this classification",
  "attribution_type": "direct_quote|paraphrase|characterization|inference",
  "reasoning": "Brief explanation of why this stance was assigned"
}`
          }],
          model: 'claude-sonnet-4-20250514',
        }),
      })

      const data = await response.json()
      if (data.error) throw new Error(data.error)
      const content = data.content

      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        const result: StanceResult = {
          entity: parsed.entity || entityName,
          topic: parsed.topic || topic,
          predictedStance: parsed.stance as Stance,
          confidence: parsed.confidence || 0,
          evidence: parsed.evidence || '',
        }
        setCurrentResults(prev => [...prev, result])
      }
    } catch (error) {
      console.error('Stance detection failed:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const labelResult = (index: number, label: Stance) => {
    setCurrentResults(prev =>
      prev.map((r, i) => i === index ? { ...r, humanLabel: label } : r)
    )
  }

  const saveSession = () => {
    if (currentResults.length === 0) return
    const session: EvalSession = {
      id: String(sessions.length + 1),
      articleText,
      results: currentResults,
      timestamp: new Date().toISOString(),
    }
    setSessions(prev => [...prev, session])
    setCurrentResults([])
  }

  // Calculate accuracy across all sessions
  const allLabeledResults = [...sessions.flatMap(s => s.results), ...currentResults]
    .filter(r => r.humanLabel)
  const correctCount = allLabeledResults.filter(r => r.predictedStance === r.humanLabel).length
  const accuracy = allLabeledResults.length > 0
    ? Math.round((correctCount / allLabeledResults.length) * 100)
    : null

  const stanceColor: Record<Stance, string> = {
    FAVOR: 'text-green-400 bg-green-400/10 border-green-800',
    AGAINST: 'text-red-400 bg-red-400/10 border-red-800',
    NEUTRAL: 'text-gray-400 bg-gray-400/10 border-gray-700',
    UNRELATED: 'text-gray-600 bg-gray-600/10 border-gray-800',
  }

  return (
    <div className="h-full overflow-auto bg-gray-950 text-gray-100">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Stance Detection Benchmark</h1>
            <p className="text-gray-400 text-sm mt-1">
              H3: Can zero-shot LLM prompting produce usable stance classifications?
            </p>
          </div>
          {accuracy !== null && (
            <div className="text-right">
              <div className={`text-3xl font-bold ${accuracy >= 80 ? 'text-green-400' : accuracy >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                {accuracy}%
              </div>
              <div className="text-xs text-gray-500">
                {correctCount}/{allLabeledResults.length} correct (target: 80%)
              </div>
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold">Article Input</h2>
            <textarea
              value={articleText}
              onChange={e => setArticleText(e.target.value)}
              rows={8}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-sm font-mono resize-none"
              placeholder="Paste article text..."
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Entity</label>
                <input
                  type="text"
                  value={entityName}
                  onChange={e => setEntityName(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Topic</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    className="flex-1 bg-gray-900 border border-gray-800 rounded px-3 py-1.5 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_TOPICS.map(t => (
                <button
                  key={t}
                  onClick={() => setTopic(t)}
                  className={`text-xs px-2 py-1 rounded border ${
                    topic === t
                      ? 'border-blue-600 text-blue-400 bg-blue-400/10'
                      : 'border-gray-700 text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <button
              onClick={runStanceDetection}
              disabled={isAnalyzing || !articleText.trim() || !entityName.trim() || !topic.trim()}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-lg font-medium"
            >
              {isAnalyzing ? 'Detecting stance...' : 'Run Stance Detection'}
            </button>
          </div>

          {/* Quick Stats */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Evaluation Stats</h2>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Sessions</span>
                <span>{sessions.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total evaluations</span>
                <span>{allLabeledResults.length + currentResults.filter(r => !r.humanLabel).length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Human-labeled</span>
                <span>{allLabeledResults.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Correct predictions</span>
                <span className="text-green-400">{correctCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Current Results */}
        {currentResults.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Current Results</h2>
              <button
                onClick={saveSession}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm"
              >
                Save Session
              </button>
            </div>

            <div className="space-y-3">
              {currentResults.map((result, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="font-medium">{result.entity}</span>
                      <span className="text-gray-500 mx-2">on</span>
                      <span className="text-blue-400">{result.topic}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm px-2 py-0.5 rounded border ${stanceColor[result.predictedStance]}`}>
                        {result.predictedStance}
                      </span>
                      <span className="text-xs text-gray-500">
                        {Math.round(result.confidence * 100)}%
                      </span>
                    </div>
                  </div>

                  <div className="text-sm text-gray-400 mb-3 italic">
                    &quot;{result.evidence}&quot;
                  </div>

                  {/* Human labeling */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Your label:</span>
                    {(['FAVOR', 'AGAINST', 'NEUTRAL', 'UNRELATED'] as Stance[]).map(stance => (
                      <button
                        key={stance}
                        onClick={() => labelResult(i, stance)}
                        className={`text-xs px-2 py-1 rounded border ${
                          result.humanLabel === stance
                            ? stanceColor[stance]
                            : 'border-gray-700 text-gray-600 hover:text-gray-400'
                        }`}
                      >
                        {stance}
                      </button>
                    ))}
                    {result.humanLabel && (
                      <span className={`text-xs ml-2 ${
                        result.humanLabel === result.predictedStance
                          ? 'text-green-400'
                          : 'text-red-400'
                      }`}>
                        {result.humanLabel === result.predictedStance ? 'Correct' : 'Incorrect'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
