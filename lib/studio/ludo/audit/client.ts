// @ts-nocheck
/**
 * Gameplay Audit System - Supabase Client
 *
 * Database operations for gameplay audit tables
 */

import { supabase } from '../supabase/client';
import {
  GameplaySession,
  CreateSessionConfig,
  GameplayEvent,
  CreateEventData,
  GameplaySnapshot,
  CreateSnapshotData,
  GameplayAnalysis,
  GameplayIssue,
  CreateIssueData
} from './types';
import { logger } from '../utils/logger';

// =====================================================
// Session Operations
// =====================================================

export class GameplayAuditClient {
  /**
   * Create a new gameplay audit session
   */
  async createSession(config: CreateSessionConfig, userId: string): Promise<GameplaySession | null> {
    try {
      if (!supabase) {
        logger.error('Supabase client not initialized');
        return null;
      }

      const { data, error } = await supabase
        .from('gameplay_sessions')
        .insert({
          user_id: userId,
          mode: config.mode,
          white_ai_preset: config.white_ai_preset,
          white_ai_personality: config.white_ai_personality,
          black_ai_preset: config.black_ai_preset,
          black_ai_personality: config.black_ai_personality,
          match_length: config.match_length,
          iteration_count: config.iteration_count ?? (config.mode === 'observable' ? 1 : null),
          random_seed: config.random_seed,
          notes: config.notes,
          app_version: process.env.NEXT_PUBLIC_APP_VERSION || 'dev'
        })
        .select()
        .single();

      if (error) {
        // Check if table doesn't exist
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          logger.error('Gameplay audit tables do not exist. Please run migration 011 to create audit tables.');
          logger.debug('Run: npx supabase migration up');
        } else {
          logger.error('Failed to create gameplay session', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
        }
        return null;
      }

      logger.info(`Created gameplay session: ${data.id}`);
      return data;
    } catch (err) {
      logger.error('Exception creating gameplay session', err);
      return null;
    }
  }

  /**
   * Get a session by ID
   */
  async getSession(sessionId: string): Promise<GameplaySession | null> {
    try {
      const { data, error } = await supabase
        .from('gameplay_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) {
        logger.error(`Failed to fetch session ${sessionId}`, error);
        return null;
      }

      return data;
    } catch (err) {
      logger.error('Exception fetching session', err);
      return null;
    }
  }

  /**
   * Update session completion status
   */
  async completeSession(sessionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('gameplay_sessions')
        .update({
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) {
        logger.error(`Failed to complete session ${sessionId}`, error);
        return false;
      }

      logger.info(`Completed session: ${sessionId}`);
      return true;
    } catch (err) {
      logger.error('Exception completing session', err);
      return false;
    }
  }

  /**
   * Get user's sessions with pagination
   */
  async getUserSessions(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      mode?: 'observable' | 'batch';
    }
  ): Promise<GameplaySession[]> {
    try {
      let query = supabase
        .from('gameplay_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options?.mode) {
        query = query.eq('mode', options.mode);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to fetch user sessions', error);
        return [];
      }

      return data || [];
    } catch (err) {
      logger.error('Exception fetching user sessions', err);
      return [];
    }
  }

  // =====================================================
  // Event Operations
  // =====================================================

  /**
   * Create a new gameplay event
   */
  async createEvent(eventData: CreateEventData): Promise<GameplayEvent | null> {
    try {
      const { data, error } = await supabase
        .from('gameplay_events')
        .insert({
          ...eventData,
          timestamp_ms: Date.now()
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create gameplay event', error);
        return null;
      }

      return data;
    } catch (err) {
      logger.error('Exception creating gameplay event', err);
      return null;
    }
  }

  /**
   * Batch create events for performance
   */
  async createEventsBatch(events: CreateEventData[]): Promise<boolean> {
    try {
      if (!supabase) {
        logger.error('Supabase client not initialized');
        return false;
      }

      if (events.length === 0) {
        return true; // Nothing to insert
      }

      const eventsWithTimestamp = events.map(event => ({
        ...event,
        timestamp_ms: Date.now()
      }));

      const { error } = await supabase
        .from('gameplay_events')
        .insert(eventsWithTimestamp);

      if (error) {
        logger.error('Failed to batch create events', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          eventCount: events.length
        });
        return false;
      }

      return true;
    } catch (err) {
      logger.error('Exception batch creating events', err);
      return false;
    }
  }

  /**
   * Get events for a session
   */
  async getSessionEvents(
    sessionId: string,
    options?: {
      gameNumber?: number;
      eventType?: string;
      limit?: number;
    }
  ): Promise<GameplayEvent[]> {
    try {
      let query = supabase
        .from('gameplay_events')
        .select('*')
        .eq('session_id', sessionId)
        .order('game_number', { ascending: true })
        .order('move_number', { ascending: true });

      if (options?.gameNumber) {
        query = query.eq('game_number', options.gameNumber);
      }

      if (options?.eventType) {
        query = query.eq('event_type', options.eventType);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to fetch session events', error);
        return [];
      }

      return data || [];
    } catch (err) {
      logger.error('Exception fetching session events', err);
      return [];
    }
  }

  /**
   * Get events with anomalies
   */
  async getAnomalousEvents(sessionId: string): Promise<GameplayEvent[]> {
    try {
      const { data, error } = await supabase
        .from('gameplay_events')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_anomaly', true)
        .order('timestamp_ms', { ascending: true });

      if (error) {
        logger.error('Failed to fetch anomalous events', error);
        return [];
      }

      return data || [];
    } catch (err) {
      logger.error('Exception fetching anomalous events', err);
      return [];
    }
  }

  // =====================================================
  // Snapshot Operations
  // =====================================================

  /**
   * Create a board state snapshot
   */
  async createSnapshot(snapshotData: CreateSnapshotData): Promise<GameplaySnapshot | null> {
    try {
      const { data, error } = await supabase
        .from('gameplay_snapshots')
        .insert(snapshotData)
        .select()
        .single();

      if (error) {
        logger.error('Failed to create snapshot', error);
        return null;
      }

      return data;
    } catch (err) {
      logger.error('Exception creating snapshot', err);
      return null;
    }
  }

  /**
   * Get snapshot for a specific move
   */
  async getSnapshot(
    sessionId: string,
    gameNumber: number,
    moveNumber: number,
    snapshotType: 'before_move' | 'after_move'
  ): Promise<GameplaySnapshot | null> {
    try {
      const { data, error } = await supabase
        .from('gameplay_snapshots')
        .select('*')
        .eq('session_id', sessionId)
        .eq('game_number', gameNumber)
        .eq('move_number', moveNumber)
        .eq('snapshot_type', snapshotType)
        .single();

      if (error) {
        logger.error('Failed to fetch snapshot', error);
        return null;
      }

      return data;
    } catch (err) {
      logger.error('Exception fetching snapshot', err);
      return null;
    }
  }

  // =====================================================
  // Analysis Operations
  // =====================================================

  /**
   * Create analysis results for a session
   */
  async createAnalysis(
    sessionId: string,
    stats: Record<string, unknown>,
    options?: {
      patterns_found?: string[];
      performance_score?: number;
      recommendations?: string[];
    }
  ): Promise<GameplayAnalysis | null> {
    try {
      const { data, error } = await supabase
        .from('gameplay_analysis')
        .insert({
          session_id: sessionId,
          stats,
          patterns_found: options?.patterns_found,
          performance_score: options?.performance_score,
          recommendations: options?.recommendations
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create analysis', error);
        return null;
      }

      logger.info(`Created analysis for session: ${sessionId}`);
      return data;
    } catch (err) {
      logger.error('Exception creating analysis', err);
      return null;
    }
  }

  /**
   * Get analysis for a session
   */
  async getSessionAnalysis(sessionId: string): Promise<GameplayAnalysis | null> {
    try {
      const { data, error } = await supabase
        .from('gameplay_analysis')
        .select('*')
        .eq('session_id', sessionId)
        .order('analyzed_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        logger.error('Failed to fetch analysis', error);
        return null;
      }

      return data;
    } catch (err) {
      logger.error('Exception fetching analysis', err);
      return null;
    }
  }

  // =====================================================
  // Issue Operations
  // =====================================================

  /**
   * Create a gameplay issue
   */
  async createIssue(issueData: CreateIssueData): Promise<GameplayIssue | null> {
    try {
      const { data, error } = await supabase
        .from('gameplay_issues')
        .insert(issueData)
        .select()
        .single();

      if (error) {
        logger.error('Failed to create issue', error);
        return null;
      }

      logger.warn(`Created gameplay issue: ${data.id} - ${issueData.severity} - ${issueData.issue_type}`);
      return data;
    } catch (err) {
      logger.error('Exception creating issue', err);
      return null;
    }
  }

  /**
   * Get issues for a session
   */
  async getSessionIssues(
    sessionId: string,
    options?: {
      severity?: string;
      status?: string;
    }
  ): Promise<GameplayIssue[]> {
    try {
      let query = supabase
        .from('gameplay_issues')
        .select('*')
        .eq('session_id', sessionId)
        .order('detected_at', { ascending: false });

      if (options?.severity) {
        query = query.eq('severity', options.severity);
      }

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to fetch issues', error);
        return [];
      }

      return data || [];
    } catch (err) {
      logger.error('Exception fetching issues', err);
      return [];
    }
  }

  /**
   * Update issue status
   */
  async updateIssueStatus(
    issueId: string,
    status: 'open' | 'investigating' | 'resolved' | 'wont_fix',
    resolutionNotes?: string
  ): Promise<boolean> {
    try {
      const updateData: Record<string, unknown> = {
        status
      };

      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }

      if (resolutionNotes) {
        updateData.resolution_notes = resolutionNotes;
      }

      const { error } = await supabase
        .from('gameplay_issues')
        .update(updateData)
        .eq('id', issueId);

      if (error) {
        logger.error('Failed to update issue status', error);
        return false;
      }

      return true;
    } catch (err) {
      logger.error('Exception updating issue status', err);
      return false;
    }
  }
}

// Singleton instance
export const auditClient = new GameplayAuditClient();
