/**
 * Audit Event Feed Component
 *
 * Displays real-time gameplay events during observable mode
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { GameplayEvent } from '@/lib/studio/ludo/audit/types';
import { auditClient } from '@/lib/studio/ludo/audit/client';
import { useMatchStore } from '@/lib/studio/ludo/game/stores/matchStore';

export function AuditEventFeed() {
  // Match state from matchStore
  const { auditConfig } = useMatchStore();
  const [events, setEvents] = useState<GameplayEvent[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!auditConfig?.enabled || !auditConfig.sessionId) {
      return;
    }

    // Poll for new events every 2 seconds
    const pollInterval = setInterval(async () => {
      const newEvents = await auditClient.getSessionEvents(
        auditConfig.sessionId!,
        { limit: 50 }
      );

      setEvents(newEvents);

      // Auto-scroll to bottom
      if (feedRef.current) {
        feedRef.current.scrollTop = feedRef.current.scrollHeight;
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [auditConfig?.enabled, auditConfig?.sessionId]);

  if (!auditConfig?.enabled || auditConfig.mode !== 'observable') {
    return null;
  }

  const getEventIcon = (eventType: string): string => {
    switch (eventType) {
      case 'opening_roll':
        return '🎲';
      case 'dice_roll':
        return '🎲';
      case 'move':
        return '♟️';
      case 'hit':
        return '💥';
      case 'enter':
        return '↩️';
      case 'bear_off':
        return '🏁';
      case 'game_end':
        return '🏆';
      case 'double_offer':
        return '🎯';
      case 'double_accept':
        return '✅';
      case 'double_decline':
        return '❌';
      case 'rule_violation':
        return '⚠️';
      default:
        return '📝';
    }
  };

  const formatEvent = (event: GameplayEvent): string => {
    switch (event.event_type) {
      case 'opening_roll':
        return `${event.player} rolls ${event.dice_roll?.[0]} (opening)`;
      case 'dice_roll':
        return `${event.player} rolls [${event.dice_roll?.join(', ')}]`;
      case 'move':
        return `${event.player} moves ${event.move_from} → ${event.move_to}${
          event.available_moves_count ? ` (${event.available_moves_count} options)` : ''
        }`;
      case 'hit':
        return `${event.player} hits on point ${event.move_to}`;
      case 'enter':
        return `${event.player} enters from bar to ${event.move_to}`;
      case 'bear_off':
        return `${event.player} bears off from ${event.move_from}`;
      case 'game_end':
        return `${event.player} wins!`;
      case 'rule_violation':
        return `Rule violation: ${event.validation_errors?.join(', ')}`;
      default:
        return `${event.event_type}`;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-black/80 backdrop-blur-sm border border-purple-500/30 rounded-lg shadow-lg overflow-hidden pointer-events-auto z-50">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2 bg-purple-900/30 border-b border-purple-500/30 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-purple-400">📊</span>
          <span className="text-sm font-medium text-white">Event Feed</span>
          <span className="text-xs text-gray-400">({events.length})</span>
        </div>
        <button className="text-gray-400 hover:text-white">
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {/* Event List */}
      {isExpanded && (
        <div
          ref={feedRef}
          className="max-h-96 overflow-y-auto p-3 space-y-1 text-xs"
        >
          {events.length === 0 ? (
            <div className="text-gray-500 text-center py-4">
              No events yet...
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className={`flex items-start gap-2 p-2 rounded ${
                  event.is_anomaly
                    ? 'bg-red-900/20 border border-red-500/30'
                    : 'bg-gray-800/50 hover:bg-gray-700/50'
                }`}
              >
                <span className="text-base">{getEventIcon(event.event_type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white truncate">
                    {formatEvent(event)}
                  </div>
                  {event.ai_preset && (
                    <div className="text-xs text-gray-400">
                      AI: {event.ai_preset}
                      {event.ai_personality && ` (${event.ai_personality})`}
                    </div>
                  )}
                  {event.decision_time_ms && (
                    <div className="text-xs text-gray-500">
                      {event.decision_time_ms}ms
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500 whitespace-nowrap">
                  G{event.game_number}:M{event.move_number}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Footer */}
      {isExpanded && (
        <div className="px-4 py-2 bg-purple-900/20 border-t border-purple-500/30 text-xs text-gray-400">
          Session: {auditConfig.sessionId?.slice(0, 8)}...
        </div>
      )}
    </div>
  );
}
