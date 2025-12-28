'use client'

import { useState } from 'react'
import { testDatabaseConnection, testTableAccess, seedSampleData, verifyChannels } from '@/lib/db-test'

export default function DatabaseTestPage() {
  const [connectionResult, setConnectionResult] = useState<any>(null)
  const [tableResults, setTableResults] = useState<any>(null)
  const [seedResult, setSeedResult] = useState<any>(null)
  const [channelsResult, setChannelsResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runConnectionTest = async () => {
    setLoading(true)
    const result = await testDatabaseConnection()
    setConnectionResult(result)
    setLoading(false)
  }

  const runTableTest = async () => {
    setLoading(true)
    const results = await testTableAccess()
    setTableResults(results)
    setLoading(false)
  }

  const runSeedData = async () => {
    setLoading(true)
    const result = await seedSampleData()
    setSeedResult(result)
    setLoading(false)
  }

  const runChannelsTest = async () => {
    setLoading(true)
    const result = await verifyChannels()
    setChannelsResult(result)
    setLoading(false)
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Database Test Page</h1>
        <p className="text-muted-foreground mb-8">
          Verify database setup and test CRUD operations
        </p>

        <div className="space-y-6">
          {/* Connection Test */}
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Connection Test</h2>
            <button
              onClick={runConnectionTest}
              disabled={loading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              Test Connection
            </button>
            {connectionResult && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(connectionResult, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Table Access Test */}
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Table Access Test</h2>
            <button
              onClick={runTableTest}
              disabled={loading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              Test All Tables
            </button>
            {tableResults && (
              <div className="mt-4 space-y-2">
                {tableResults.map((result: any) => (
                  <div
                    key={result.table}
                    className={`p-3 rounded-lg ${
                      result.success ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono">{result.table}</span>
                      <span>{result.success ? '✅' : '❌'}</span>
                    </div>
                    {result.error && (
                      <div className="text-sm text-red-500 mt-1">{result.error}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Channels Test */}
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Verify Channels</h2>
            <button
              onClick={runChannelsTest}
              disabled={loading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              Check Channels
            </button>
            {channelsResult && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(channelsResult, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Seed Data Test */}
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Seed Sample Data</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Creates sample project, log entry, and specimen (requires admin access)
            </p>
            <button
              onClick={runSeedData}
              disabled={loading}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              Create Sample Data
            </button>
            {seedResult && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(seedResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
