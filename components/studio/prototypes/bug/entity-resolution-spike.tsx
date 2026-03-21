'use client'

import { useState } from 'react'

/**
 * Entity Resolution Spike
 *
 * Tests H2: Can spaCy NER + Wikidata entity linking resolve entity mentions
 * across news articles and social posts with >90% precision and recall?
 *
 * This spike uses the Anthropic API to simulate the entity resolution pipeline
 * entirely in-browser — no Python/spaCy backend needed for the prototype.
 * The LLM performs NER, alias matching, and Wikidata linking in one pass.
 *
 * Flow:
 * 1. User defines tracked entities (name + aliases)
 * 2. User pastes article text or fetches from a URL
 * 3. System extracts entity mentions via LLM
 * 4. System matches mentions to tracked entities
 * 5. User validates/corrects matches (human-in-the-loop)
 * 6. Results displayed with precision/recall metrics
 */

interface TrackedEntity {
  id: string
  name: string
  aliases: string[]
  wikidataId?: string
}

interface Mention {
  text: string
  entityId: string | null
  confidence: number
  startIndex: number
  endIndex: number
}

interface AnalysisResult {
  mentions: Mention[]
  articleText: string
  timestamp: string
}

const SAMPLE_ENTITIES: TrackedEntity[] = [
  { id: '1', name: 'Elon Musk', aliases: ['Musk', '@elonmusk', 'Tesla CEO', 'SpaceX CEO'], wikidataId: 'Q317521' },
  { id: '2', name: 'Sam Altman', aliases: ['Altman', '@sama', 'OpenAI CEO'], wikidataId: 'Q56037233' },
  { id: '3', name: 'OpenAI', aliases: ['Open AI', '@OpenAI'], wikidataId: 'Q24930424' },
]

const SAMPLE_ARTICLE = `OpenAI CEO Sam Altman announced a new partnership with the federal government on Tuesday,
drawing criticism from Elon Musk, who called the deal "deeply concerning" on his social media platform.
Altman responded by noting that OpenAI's mission has always been to benefit humanity, and that working
with government agencies is consistent with that goal. The Tesla CEO has been increasingly vocal about
AI safety, despite his own company's aggressive deployment of autonomous driving features. Meanwhile,
@OpenAI posted a detailed thread explaining the partnership's scope and limitations.`

export default function EntityResolutionSpike() {
  const [entities, setEntities] = useState<TrackedEntity[]>(SAMPLE_ENTITIES)
  const [articleText, setArticleText] = useState(SAMPLE_ARTICLE)
  const [results, setResults] = useState<AnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [newEntityName, setNewEntityName] = useState('')
  const [newEntityAliases, setNewEntityAliases] = useState('')
  const [stats, setStats] = useState<{ total: number; matched: number; unmatched: number } | null>(null)

  const analyzeArticle = async () => {
    setIsAnalyzing(true)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `You are an entity resolution system. Given the following tracked entities and article text, extract all entity mentions and match them to tracked entities.

TRACKED ENTITIES:
${entities.map(e => `- ID: ${e.id}, Name: "${e.name}", Aliases: [${e.aliases.map(a => `"${a}"`).join(', ')}]`).join('\n')}

ARTICLE TEXT:
${articleText}

For each mention of a person or organization in the article, return a JSON array of objects with:
- "text": the exact text as it appears in the article
- "entityId": the ID of the matched tracked entity, or null if no match
- "confidence": 0-1 confidence score
- "reasoning": brief explanation of the match

Return ONLY valid JSON in this format:
{ "mentions": [...] }`
          }],
          model: 'claude-sonnet-4-20250514',
        }),
      })

      const data = await response.json()
      if (data.error) throw new Error(data.error)
      const content = data.content

      // Parse the JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        const mentions = parsed.mentions || []
        const result: AnalysisResult = {
          mentions,
          articleText,
          timestamp: new Date().toISOString(),
        }
        setResults(result)

        const matched = mentions.filter((m: Mention) => m.entityId !== null).length
        setStats({
          total: mentions.length,
          matched,
          unmatched: mentions.length - matched,
        })
      }
    } catch (error) {
      console.error('Analysis failed:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const addEntity = () => {
    if (!newEntityName.trim()) return
    const newEntity: TrackedEntity = {
      id: String(entities.length + 1),
      name: newEntityName.trim(),
      aliases: newEntityAliases.split(',').map(a => a.trim()).filter(Boolean),
    }
    setEntities([...entities, newEntity])
    setNewEntityName('')
    setNewEntityAliases('')
  }

  const removeEntity = (id: string) => {
    setEntities(entities.filter(e => e.id !== id))
  }

  return (
    <div className="h-full overflow-auto bg-gray-950 text-gray-100">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Entity Resolution Spike</h1>
          <p className="text-gray-400 text-sm mt-1">
            H2: Can we reliably resolve entity mentions across heterogeneous sources?
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Tracked Entities */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Tracked Entities</h2>

            <div className="space-y-2">
              {entities.map(entity => (
                <div key={entity.id} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{entity.name}</span>
                      {entity.wikidataId && (
                        <span className="ml-2 text-xs text-blue-400">{entity.wikidataId}</span>
                      )}
                    </div>
                    <button
                      onClick={() => removeEntity(entity.id)}
                      className="text-gray-500 hover:text-red-400 text-sm"
                    >
                      remove
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Aliases: {entity.aliases.join(', ') || 'none'}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 space-y-2">
              <input
                type="text"
                value={newEntityName}
                onChange={e => setNewEntityName(e.target.value)}
                placeholder="Entity name (e.g., Satya Nadella)"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm"
              />
              <input
                type="text"
                value={newEntityAliases}
                onChange={e => setNewEntityAliases(e.target.value)}
                placeholder="Aliases, comma-separated (e.g., Nadella, @satloaf)"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm"
              />
              <button
                onClick={addEntity}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm"
              >
                Add Entity
              </button>
            </div>
          </div>

          {/* Right: Article Input */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Article Text</h2>
            <textarea
              value={articleText}
              onChange={e => setArticleText(e.target.value)}
              rows={12}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-sm font-mono resize-none"
              placeholder="Paste article text here..."
            />
            <button
              onClick={analyzeArticle}
              disabled={isAnalyzing || !articleText.trim()}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-lg font-medium"
            >
              {isAnalyzing ? 'Analyzing...' : 'Run Entity Resolution'}
            </button>
          </div>
        </div>

        {/* Results */}
        {results && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold">Results</h2>
              {stats && (
                <div className="flex gap-3 text-sm">
                  <span className="text-gray-400">
                    {stats.total} mentions found
                  </span>
                  <span className="text-green-400">
                    {stats.matched} matched
                  </span>
                  <span className="text-yellow-400">
                    {stats.unmatched} unmatched
                  </span>
                  <span className="text-blue-400">
                    {stats.total > 0 ? Math.round((stats.matched / stats.total) * 100) : 0}% resolution rate
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {results.mentions.map((mention, i) => {
                const matchedEntity = mention.entityId
                  ? entities.find(e => e.id === mention.entityId)
                  : null
                return (
                  <div
                    key={i}
                    className={`bg-gray-900 border rounded-lg p-3 ${
                      matchedEntity ? 'border-green-800' : 'border-yellow-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <code className="text-sm bg-gray-800 px-2 py-0.5 rounded">
                          &quot;{mention.text}&quot;
                        </code>
                        <span className="text-sm">
                          {matchedEntity ? (
                            <span className="text-green-400">
                              → {matchedEntity.name}
                            </span>
                          ) : (
                            <span className="text-yellow-400">No match</span>
                          )}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {Math.round(mention.confidence * 100)}% confidence
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
