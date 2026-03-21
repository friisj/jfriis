'use client'

import { useState } from 'react'

/**
 * Attribution Tier Classifier
 *
 * Tests H4: Can AI reliably distinguish between direct quotes, paraphrases,
 * reporter characterizations, and inferences from actions?
 *
 * Flow:
 * 1. User pastes article text
 * 2. System extracts all entity-related statements
 * 3. System classifies each statement into attribution tiers
 * 4. User validates/corrects tier assignments
 * 5. System tracks accuracy across evaluations
 */

type AttributionTier = 'direct_quote' | 'paraphrase' | 'characterization' | 'inference'

interface Attribution {
  text: string
  entity: string
  tier: AttributionTier
  confidence: number
  reasoning: string
  humanLabel?: AttributionTier
}

interface EvalSession {
  id: string
  articleText: string
  attributions: Attribution[]
  timestamp: string
}

const TIER_INFO: Record<AttributionTier, { label: string; color: string; description: string; example: string }> = {
  direct_quote: {
    label: 'Direct Quote',
    color: 'text-green-400 bg-green-400/10 border-green-800',
    description: 'Exact words attributed to the entity with quotation marks',
    example: '"We think AI regulation is critical," Altman said.',
  },
  paraphrase: {
    label: 'Paraphrase',
    color: 'text-blue-400 bg-blue-400/10 border-blue-800',
    description: 'Entity\'s words restated by the reporter without quotes',
    example: 'Altman called for a new federal agency to oversee AI.',
  },
  characterization: {
    label: 'Characterization',
    color: 'text-yellow-400 bg-yellow-400/10 border-yellow-800',
    description: 'Reporter\'s interpretation of the entity\'s position',
    example: 'Musk has been increasingly vocal about AI safety concerns.',
  },
  inference: {
    label: 'Inference',
    color: 'text-red-400 bg-red-400/10 border-red-800',
    description: 'Position inferred from actions, investments, or associations',
    example: 'By investing in xAI, Musk signals he wants to build competitive AI systems.',
  },
}

const SAMPLE_ARTICLE = `Sam Altman told a Senate committee that AI regulation is "critical" and urged lawmakers to create
a new federal agency for AI oversight. "We think the benefits of the tools we have deployed so far vastly
outweigh the risks, but ensuring they do requires proactive regulation," Altman testified.

Elon Musk responded on X, calling the proposal "deeply concerning" and suggesting it would benefit
incumbent AI companies at the expense of open competition. Musk has long positioned himself as an AI
safety advocate, though critics note his company xAI has aggressively pursued large-scale AI development
without similar calls for self-regulation.

Industry observers suggest that Altman's testimony reflects OpenAI's broader strategy to establish
regulatory moats. By backing licensing requirements, OpenAI could make it harder for smaller competitors
to enter the market. Meanwhile, Google's Sundar Pichai reportedly expressed support for "thoughtful
regulation" in private meetings with lawmakers, though the company has not made a public statement.`

export default function AttributionTierClassifier() {
  const [articleText, setArticleText] = useState(SAMPLE_ARTICLE)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [attributions, setAttributions] = useState<Attribution[]>([])
  const [sessions, setSessions] = useState<EvalSession[]>([])
  const [showTierGuide, setShowTierGuide] = useState(false)

  const runClassification = async () => {
    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `You are an attribution tier classifier. Analyze the following article and extract every statement that attributes a position, opinion, or action to a named entity. For each, classify the attribution tier.

ATTRIBUTION TIERS:
- direct_quote: Exact words in quotation marks attributed to the entity
- paraphrase: Entity's words restated by the reporter without quotes
- characterization: Reporter's interpretation of the entity's position
- inference: Position inferred from actions, investments, or associations

ARTICLE:
${articleText}

Return ONLY valid JSON:
{
  "attributions": [
    {
      "text": "the exact passage from the article",
      "entity": "entity name",
      "tier": "direct_quote|paraphrase|characterization|inference",
      "confidence": 0.0-1.0,
      "reasoning": "why this tier was assigned"
    }
  ]
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
        setAttributions(parsed.attributions || [])
      }
    } catch (error) {
      console.error('Classification failed:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const labelAttribution = (index: number, tier: AttributionTier) => {
    setAttributions(prev =>
      prev.map((a, i) => i === index ? { ...a, humanLabel: tier } : a)
    )
  }

  const saveSession = () => {
    if (attributions.length === 0) return
    setSessions(prev => [...prev, {
      id: String(prev.length + 1),
      articleText,
      attributions,
      timestamp: new Date().toISOString(),
    }])
    setAttributions([])
  }

  // Stats
  const allLabeled = [...sessions.flatMap(s => s.attributions), ...attributions].filter(a => a.humanLabel)
  const correct = allLabeled.filter(a => a.tier === a.humanLabel).length
  const accuracy = allLabeled.length > 0 ? Math.round((correct / allLabeled.length) * 100) : null

  // Confusion matrix
  const tiers: AttributionTier[] = ['direct_quote', 'paraphrase', 'characterization', 'inference']
  const confusion: Record<string, Record<string, number>> = {}
  tiers.forEach(predicted => {
    confusion[predicted] = {}
    tiers.forEach(actual => {
      confusion[predicted][actual] = allLabeled.filter(
        a => a.tier === predicted && a.humanLabel === actual
      ).length
    })
  })

  return (
    <div className="h-full overflow-auto bg-gray-950 text-gray-100">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Attribution Tier Classifier</h1>
            <p className="text-gray-400 text-sm mt-1">
              H4: Can AI reliably distinguish quote types to produce trustworthy confidence scores?
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowTierGuide(!showTierGuide)}
              className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 px-2 py-1 rounded"
            >
              {showTierGuide ? 'Hide' : 'Show'} Tier Guide
            </button>
            {accuracy !== null && (
              <div className="text-right">
                <div className={`text-3xl font-bold ${accuracy >= 75 ? 'text-green-400' : accuracy >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {accuracy}%
                </div>
                <div className="text-xs text-gray-500">
                  {correct}/{allLabeled.length} correct (target: 75%)
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Tier Guide */}
        {showTierGuide && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {tiers.map(tier => (
              <div key={tier} className={`rounded-lg border p-3 ${TIER_INFO[tier].color}`}>
                <div className="font-medium text-sm">{TIER_INFO[tier].label}</div>
                <div className="text-xs opacity-70 mt-1">{TIER_INFO[tier].description}</div>
                <div className="text-xs italic mt-2 opacity-50">{TIER_INFO[tier].example}</div>
              </div>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Article Text</h2>
          <textarea
            value={articleText}
            onChange={e => setArticleText(e.target.value)}
            rows={8}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-sm font-mono resize-none"
            placeholder="Paste article text..."
          />
          <button
            onClick={runClassification}
            disabled={isAnalyzing || !articleText.trim()}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-lg font-medium"
          >
            {isAnalyzing ? 'Classifying attributions...' : 'Run Attribution Classification'}
          </button>
        </div>

        {/* Results */}
        {attributions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Attributions Found ({attributions.length})
              </h2>
              <button
                onClick={saveSession}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm"
              >
                Save Session
              </button>
            </div>

            <div className="space-y-3">
              {attributions.map((attr, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-medium text-sm">{attr.entity}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded border ${TIER_INFO[attr.tier].color}`}>
                        {TIER_INFO[attr.tier].label}
                      </span>
                      <span className="text-xs text-gray-500">{Math.round(attr.confidence * 100)}%</span>
                    </div>
                  </div>

                  <div className="text-sm text-gray-300 mb-2 bg-gray-800 rounded p-2 font-mono">
                    {attr.text}
                  </div>

                  <div className="text-xs text-gray-500 mb-3">{attr.reasoning}</div>

                  {/* Human labeling */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Your label:</span>
                    {tiers.map(tier => (
                      <button
                        key={tier}
                        onClick={() => labelAttribution(i, tier)}
                        className={`text-xs px-2 py-1 rounded border ${
                          attr.humanLabel === tier
                            ? TIER_INFO[tier].color
                            : 'border-gray-700 text-gray-600 hover:text-gray-400'
                        }`}
                      >
                        {TIER_INFO[tier].label}
                      </button>
                    ))}
                    {attr.humanLabel && (
                      <span className={`text-xs ml-2 ${
                        attr.humanLabel === attr.tier ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {attr.humanLabel === attr.tier ? 'Correct' : `Expected: ${TIER_INFO[attr.humanLabel].label}`}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confusion Matrix */}
        {allLabeled.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Confusion Matrix</h2>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr>
                    <th className="text-left text-gray-500 p-2">Predicted \ Actual</th>
                    {tiers.map(t => (
                      <th key={t} className="text-center text-gray-400 p-2">{TIER_INFO[t].label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tiers.map(predicted => (
                    <tr key={predicted}>
                      <td className="text-gray-400 p-2">{TIER_INFO[predicted].label}</td>
                      {tiers.map(actual => {
                        const count = confusion[predicted][actual]
                        const isCorrect = predicted === actual
                        return (
                          <td key={actual} className={`text-center p-2 ${
                            count > 0
                              ? isCorrect ? 'text-green-400 bg-green-400/5' : 'text-red-400 bg-red-400/5'
                              : 'text-gray-700'
                          }`}>
                            {count}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
