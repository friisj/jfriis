// @ts-nocheck
/**
 * Audit Session Browser Page
 *
 * Browse, search, and analyze gameplay audit sessions
 */

'use client';

import { useState, useEffect } from 'react';
// TODO: adapt to jfriis auth
// import { useUser } from '@/lib/hooks/useUser';
const useUser = () => ({ user: null as { id: string; email: string } | null, isAuthenticated: false });
import { auditClient } from '@/lib/studio/ludo/audit/client';
import { GameplaySession } from '@/lib/studio/ludo/audit/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SessionReportModal } from '@/components/studio/ludo/UI/SessionReportModal';
import { logger } from '@/lib/studio/ludo/utils/logger';
import Link from 'next/link';

export default function AuditBrowserPage() {
  const { user, isAuthenticated } = useUser();
  const [sessions, setSessions] = useState<GameplaySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'observable' | 'batch'>('all');

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadSessions();
    }
  }, [isAuthenticated, user?.id, filter]);

  const loadSessions = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const options: { mode?: 'observable' | 'batch' } = {};

      if (filter !== 'all') {
        options.mode = filter;
      }

      const data = await auditClient.getUserSessions(user.id, options);
      setSessions(data);
    } catch (error) {
      logger.error('Failed to load audit sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardHeader>
            <CardTitle>🔒 Authentication Required</CardTitle>
            <CardDescription>
              Please log in to view your audit sessions
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">📊 Gameplay Audit Sessions</h1>
            <p className="text-gray-400">
              Browse and analyze your recorded gameplay sessions
            </p>
          </div>
          <Link href="/audit/batch">
            <Button>
              🚀 Launch Batch Run
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          size="sm"
        >
          All Sessions
        </Button>
        <Button
          variant={filter === 'observable' ? 'default' : 'outline'}
          onClick={() => setFilter('observable')}
          size="sm"
        >
          Observable Mode
        </Button>
        <Button
          variant={filter === 'batch' ? 'default' : 'outline'}
          onClick={() => setFilter('batch')}
          size="sm"
        >
          Batch Mode
        </Button>
      </div>

      {/* Sessions List */}
      {loading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-400">Loading sessions...</p>
          </CardContent>
        </Card>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-400">No audit sessions found</p>
            <p className="text-sm text-gray-500 mt-2">
              Start a game with audit logging enabled to create your first session
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <Card key={session.id} className="hover:bg-muted/30 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">
                        {session.mode === 'observable' ? '👁️' : '📝'} Session {session.id.slice(0, 8)}
                      </h3>
                      <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400">
                        {session.mode === 'observable' ? 'Observable' : 'Batch'}
                      </span>
                      {!session.completed_at && (
                        <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">
                          Active
                        </span>
                      )}
                      {session.completed_at && (
                        <span className="text-xs px-2 py-1 rounded bg-gray-500/20 text-gray-400">
                          Completed
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-gray-500">Started</p>
                        <p className="font-medium">{formatDate(session.created_at)}</p>
                      </div>
                      {session.ended_at && (
                        <div>
                          <p className="text-gray-500">Duration</p>
                          <p className="font-medium">
                            {formatDuration(
                              new Date(session.ended_at).getTime() -
                              new Date(session.created_at).getTime()
                            )}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-500">Games</p>
                        <p className="font-medium">{session.total_games}</p>
                      </div>
                      {session.total_games > 0 && (
                        <div>
                          <p className="text-gray-500">Score</p>
                          <p className="font-medium">
                            W:{session.white_wins} / B:{session.black_wins}
                          </p>
                        </div>
                      )}
                    </div>

                    {session.notes && (
                      <p className="text-sm text-gray-400 italic mb-2">
                        &ldquo;{session.notes}&rdquo;
                      </p>
                    )}

                    <div className="flex gap-2 text-xs text-gray-500">
                      {session.white_ai_preset && (
                        <span>White: {session.white_ai_preset}</span>
                      )}
                      {session.black_ai_preset && (
                        <span>Black: {session.black_ai_preset}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => setSelectedSessionId(session.id)}
                      size="sm"
                    >
                      📊 View Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Session Report Modal */}
      {selectedSessionId && (
        <SessionReportModal
          sessionId={selectedSessionId}
          onClose={() => setSelectedSessionId(null)}
        />
      )}
    </div>
  );
}
