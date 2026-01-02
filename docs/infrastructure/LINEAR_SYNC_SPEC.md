# Linear Integration Specification

## Status: Draft
## Version: 1.0
## Date: 2026-01-01

---

## 1. Executive Summary

This specification defines bidirectional sync between Linear and the studio project management system, enabling:

1. **Studio Projects ↔ Linear Projects** - Two-way sync of project metadata
2. **Issues from Claude Code** - Create/update Linear issues via MCP during development
3. **Webhook-driven updates** - Real-time sync when Linear changes occur

### 1.1 Goals

- Track issues in Linear while maintaining Studio Projects as source of truth for PRD/strategy
- Enable Claude Code to create issues directly linked to Studio Projects
- See Linear issue counts/status in admin UI without leaving the app
- Optionally sync hypotheses/experiments as Linear issues

### 1.2 Non-Goals (v1)

- Full Jira-style project management in our app (Linear handles this)
- Syncing all Linear data (only projects and selected issues)
- Real-time collaborative editing of issues

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         Claude Code                               │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Linear MCP Server (https://mcp.linear.app/sse)             │ │
│  │  - create_issue, update_issue, search_issues                │ │
│  │  - list_projects, create_project_update                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ MCP calls reference
                              │ studio_project.linear_project_id
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Next.js Application                          │
│                                                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │ Admin UI    │    │ API Routes  │    │ Server Actions      │  │
│  │             │    │             │    │                     │  │
│  │ - Project   │    │ /api/       │    │ - syncToLinear()    │  │
│  │   detail    │    │  webhooks/  │    │ - linkLinearProject │  │
│  │ - Linear    │    │  linear     │    │ - unlinkLinear      │  │
│  │   status    │    │             │    │                     │  │
│  └─────────────┘    └──────┬──────┘    └──────────┬──────────┘  │
│                            │                       │             │
└────────────────────────────┼───────────────────────┼─────────────┘
                             │                       │
                             ▼                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                         Supabase                                  │
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ studio_projects │  │ linear_sync_log │  │ linear_issues   │  │
│  │                 │  │                 │  │ (cache)         │  │
│  │ +linear_project │  │ - event_type    │  │                 │  │
│  │ _id             │  │ - payload       │  │ - issue_id      │  │
│  │ +linear_team_id │  │ - processed_at  │  │ - project_id    │  │
│  │ +linear_sync_   │  │ - error         │  │ - title         │  │
│  │  enabled        │  │                 │  │ - state         │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                             ▲
                             │ Webhooks (HTTPS POST)
                             │
┌──────────────────────────────────────────────────────────────────┐
│                          Linear                                   │
│                                                                   │
│  Projects → Webhook on create/update/delete                      │
│  Issues   → Webhook on create/update (filtered by project)       │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema

### 3.1 Studio Projects Extension

```sql
-- Migration: 20260102000000_add_linear_fields_to_studio_projects.sql

ALTER TABLE studio_projects
  ADD COLUMN linear_project_id TEXT,
  ADD COLUMN linear_team_id TEXT,
  ADD COLUMN linear_sync_enabled BOOLEAN DEFAULT false,
  ADD COLUMN linear_synced_at TIMESTAMPTZ,
  ADD COLUMN linear_issue_count INTEGER DEFAULT 0,
  ADD COLUMN linear_project_url TEXT;

-- Index for lookups
CREATE INDEX idx_studio_projects_linear ON studio_projects (linear_project_id)
  WHERE linear_project_id IS NOT NULL;

COMMENT ON COLUMN studio_projects.linear_project_id IS 'Linear project UUID';
COMMENT ON COLUMN studio_projects.linear_team_id IS 'Linear team UUID for API calls';
COMMENT ON COLUMN studio_projects.linear_sync_enabled IS 'Whether to sync issues bidirectionally';
```

### 3.2 Linear Issues Cache (Optional)

For displaying issue summaries without API calls:

```sql
-- Migration: 20260102000001_create_linear_issues_cache.sql

CREATE TABLE linear_issues_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Linear identifiers
  linear_issue_id TEXT NOT NULL UNIQUE,
  linear_project_id TEXT NOT NULL,

  -- Cached data
  identifier TEXT NOT NULL,        -- e.g., "PROJ-123"
  title TEXT NOT NULL,
  description TEXT,
  state TEXT NOT NULL,             -- 'backlog', 'todo', 'in_progress', 'done', 'canceled'
  priority INTEGER,                -- 0-4
  assignee_name TEXT,
  labels TEXT[],

  -- Link to our entities
  studio_project_id UUID REFERENCES studio_projects(id) ON DELETE SET NULL,
  hypothesis_id UUID REFERENCES studio_hypotheses(id) ON DELETE SET NULL,
  experiment_id UUID REFERENCES studio_experiments(id) ON DELETE SET NULL,

  -- Metadata
  linear_created_at TIMESTAMPTZ,
  linear_updated_at TIMESTAMPTZ,
  cached_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_linear_issues_project ON linear_issues_cache (linear_project_id);
CREATE INDEX idx_linear_issues_studio ON linear_issues_cache (studio_project_id);
CREATE INDEX idx_linear_issues_state ON linear_issues_cache (state);
```

### 3.3 Sync Event Log

```sql
-- Migration: 20260102000002_create_linear_sync_log.sql

CREATE TABLE linear_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event details
  event_type TEXT NOT NULL,        -- 'project.create', 'issue.update', etc.
  direction TEXT NOT NULL,         -- 'inbound' (webhook) or 'outbound' (our push)

  -- References
  linear_id TEXT,
  studio_project_id UUID REFERENCES studio_projects(id) ON DELETE SET NULL,

  -- Payload
  payload JSONB NOT NULL,

  -- Status
  status TEXT DEFAULT 'pending',   -- 'pending', 'processed', 'failed'
  error_message TEXT,
  processed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_linear_sync_log_status ON linear_sync_log (status, created_at);
CREATE INDEX idx_linear_sync_log_project ON linear_sync_log (studio_project_id);
```

---

## 4. Linear API Integration

### 4.1 Environment Variables

```env
# .env.local
LINEAR_API_KEY=lin_api_xxxxx           # Personal API key or OAuth token
LINEAR_WEBHOOK_SECRET=whsec_xxxxx      # For verifying webhook signatures
LINEAR_TEAM_ID=xxxxx                   # Default team for new projects
LINEAR_ORGANIZATION_ID=xxxxx           # Organization slug
```

### 4.2 Linear Client

```typescript
// lib/linear/client.ts

import { LinearClient } from '@linear/sdk';

let linearClient: LinearClient | null = null;

export function getLinearClient(): LinearClient {
  if (!linearClient) {
    const apiKey = process.env.LINEAR_API_KEY;
    if (!apiKey) {
      throw new Error('LINEAR_API_KEY not configured');
    }
    linearClient = new LinearClient({ apiKey });
  }
  return linearClient;
}

// Type-safe wrapper for common operations
export const linear = {
  async getProject(projectId: string) {
    const client = getLinearClient();
    return client.project(projectId);
  },

  async listProjects(teamId?: string) {
    const client = getLinearClient();
    const filter = teamId ? { team: { id: { eq: teamId } } } : undefined;
    return client.projects({ filter });
  },

  async createProject(input: {
    name: string;
    description?: string;
    teamIds: string[];
    state?: string;
  }) {
    const client = getLinearClient();
    return client.createProject(input);
  },

  async updateProject(projectId: string, input: {
    name?: string;
    description?: string;
    state?: string;
  }) {
    const client = getLinearClient();
    return client.updateProject(projectId, input);
  },

  async getProjectIssues(projectId: string) {
    const client = getLinearClient();
    const project = await client.project(projectId);
    return project.issues();
  },

  async createIssue(input: {
    teamId: string;
    projectId?: string;
    title: string;
    description?: string;
    priority?: number;
    labelIds?: string[];
  }) {
    const client = getLinearClient();
    return client.createIssue(input);
  },
};
```

### 4.3 Sync Functions

```typescript
// lib/linear/sync.ts

import { createClient } from '@/lib/supabase-server';
import { linear } from './client';

interface SyncResult {
  success: boolean;
  linearProjectId?: string;
  error?: string;
}

/**
 * Links a Studio Project to an existing Linear project
 */
export async function linkLinearProject(
  studioProjectId: string,
  linearProjectId: string
): Promise<SyncResult> {
  const supabase = await createClient();

  try {
    // Fetch Linear project to validate and get metadata
    const linearProject = await linear.getProject(linearProjectId);
    if (!linearProject) {
      return { success: false, error: 'Linear project not found' };
    }

    // Get team ID from project
    const teams = await linearProject.teams();
    const teamId = teams.nodes[0]?.id;

    // Update studio project
    const { error } = await supabase
      .from('studio_projects')
      .update({
        linear_project_id: linearProjectId,
        linear_team_id: teamId,
        linear_sync_enabled: true,
        linear_synced_at: new Date().toISOString(),
        linear_project_url: linearProject.url,
      })
      .eq('id', studioProjectId);

    if (error) throw error;

    // Sync current issues to cache
    await syncProjectIssues(studioProjectId, linearProjectId);

    return { success: true, linearProjectId };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Creates a new Linear project from a Studio Project
 */
export async function createLinearProjectFromStudio(
  studioProjectId: string
): Promise<SyncResult> {
  const supabase = await createClient();

  try {
    // Get studio project
    const { data: project, error: fetchError } = await supabase
      .from('studio_projects')
      .select('*')
      .eq('id', studioProjectId)
      .single();

    if (fetchError || !project) {
      return { success: false, error: 'Studio project not found' };
    }

    if (project.linear_project_id) {
      return { success: false, error: 'Already linked to Linear' };
    }

    // Create Linear project
    const teamId = process.env.LINEAR_TEAM_ID;
    if (!teamId) {
      return { success: false, error: 'LINEAR_TEAM_ID not configured' };
    }

    const linearProject = await linear.createProject({
      name: project.name,
      description: project.description || undefined,
      teamIds: [teamId],
      state: mapStatusToLinearState(project.status),
    });

    const created = await linearProject.project;
    if (!created) {
      return { success: false, error: 'Failed to create Linear project' };
    }

    // Update studio project with Linear reference
    const { error: updateError } = await supabase
      .from('studio_projects')
      .update({
        linear_project_id: created.id,
        linear_team_id: teamId,
        linear_sync_enabled: true,
        linear_synced_at: new Date().toISOString(),
        linear_project_url: created.url,
      })
      .eq('id', studioProjectId);

    if (updateError) throw updateError;

    return { success: true, linearProjectId: created.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Syncs issues from Linear to local cache
 */
export async function syncProjectIssues(
  studioProjectId: string,
  linearProjectId: string
): Promise<void> {
  const supabase = await createClient();
  const issues = await linear.getProjectIssues(linearProjectId);

  for (const issue of issues.nodes) {
    const assignee = await issue.assignee;
    const labels = await issue.labels();
    const state = await issue.state;

    await supabase.from('linear_issues_cache').upsert({
      linear_issue_id: issue.id,
      linear_project_id: linearProjectId,
      studio_project_id: studioProjectId,
      identifier: issue.identifier,
      title: issue.title,
      description: issue.description,
      state: state?.type || 'backlog',
      priority: issue.priority,
      assignee_name: assignee?.name,
      labels: labels.nodes.map(l => l.name),
      linear_created_at: issue.createdAt,
      linear_updated_at: issue.updatedAt,
      cached_at: new Date().toISOString(),
    }, {
      onConflict: 'linear_issue_id',
    });
  }

  // Update issue count
  await supabase
    .from('studio_projects')
    .update({
      linear_issue_count: issues.nodes.length,
      linear_synced_at: new Date().toISOString(),
    })
    .eq('id', studioProjectId);
}

/**
 * Maps our status to Linear project state
 */
function mapStatusToLinearState(status: string): string {
  const mapping: Record<string, string> = {
    ideation: 'planned',
    planning: 'planned',
    in_progress: 'started',
    validation: 'started',
    launched: 'completed',
    paused: 'paused',
    archived: 'canceled',
  };
  return mapping[status] || 'planned';
}
```

---

## 5. Webhook Handler

### 5.1 API Route

```typescript
// app/api/webhooks/linear/route.ts

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase-server';
import { syncProjectIssues } from '@/lib/linear/sync';

const WEBHOOK_SECRET = process.env.LINEAR_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  // Verify webhook signature
  const signature = req.headers.get('linear-signature');
  const body = await req.text();

  if (!verifyWebhookSignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(body);
  const supabase = await createClient();

  // Log the event
  await supabase.from('linear_sync_log').insert({
    event_type: `${payload.type}.${payload.action}`,
    direction: 'inbound',
    linear_id: payload.data?.id,
    payload,
    status: 'pending',
  });

  try {
    await processWebhookEvent(payload);

    // Mark as processed
    await supabase
      .from('linear_sync_log')
      .update({ status: 'processed', processed_at: new Date().toISOString() })
      .eq('linear_id', payload.data?.id)
      .eq('status', 'pending');

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    await supabase
      .from('linear_sync_log')
      .update({ status: 'failed', error_message: message })
      .eq('linear_id', payload.data?.id)
      .eq('status', 'pending');

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function verifyWebhookSignature(body: string, signature: string | null): boolean {
  if (!WEBHOOK_SECRET || !signature) return false;

  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

async function processWebhookEvent(payload: LinearWebhookPayload) {
  const { type, action, data } = payload;

  switch (type) {
    case 'Issue':
      await handleIssueEvent(action, data);
      break;
    case 'Project':
      await handleProjectEvent(action, data);
      break;
    case 'Comment':
      // Future: sync comments
      break;
  }
}

async function handleIssueEvent(action: string, data: LinearIssueData) {
  const supabase = await createClient();

  // Find linked studio project
  const { data: project } = await supabase
    .from('studio_projects')
    .select('id')
    .eq('linear_project_id', data.projectId)
    .single();

  if (!project) return; // Not a synced project

  if (action === 'remove') {
    await supabase
      .from('linear_issues_cache')
      .delete()
      .eq('linear_issue_id', data.id);
  } else {
    // create or update
    await supabase.from('linear_issues_cache').upsert({
      linear_issue_id: data.id,
      linear_project_id: data.projectId,
      studio_project_id: project.id,
      identifier: data.identifier,
      title: data.title,
      description: data.description,
      state: data.state?.type || 'backlog',
      priority: data.priority,
      assignee_name: data.assignee?.name,
      labels: data.labels?.map((l: { name: string }) => l.name) || [],
      linear_created_at: data.createdAt,
      linear_updated_at: data.updatedAt,
      cached_at: new Date().toISOString(),
    }, {
      onConflict: 'linear_issue_id',
    });
  }

  // Update issue count
  const { count } = await supabase
    .from('linear_issues_cache')
    .select('*', { count: 'exact', head: true })
    .eq('studio_project_id', project.id);

  await supabase
    .from('studio_projects')
    .update({ linear_issue_count: count || 0 })
    .eq('id', project.id);
}

async function handleProjectEvent(action: string, data: LinearProjectData) {
  const supabase = await createClient();

  if (action === 'update') {
    // Update linked studio project metadata (optional)
    await supabase
      .from('studio_projects')
      .update({
        linear_synced_at: new Date().toISOString(),
        linear_project_url: data.url,
      })
      .eq('linear_project_id', data.id);
  }
}

// Types
interface LinearWebhookPayload {
  type: 'Issue' | 'Project' | 'Comment';
  action: 'create' | 'update' | 'remove';
  data: Record<string, unknown>;
}

interface LinearIssueData {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  projectId: string;
  priority: number;
  state?: { type: string };
  assignee?: { name: string };
  labels?: { name: string }[];
  createdAt: string;
  updatedAt: string;
}

interface LinearProjectData {
  id: string;
  name: string;
  url: string;
}
```

---

## 6. Admin UI Components

### 6.1 Linear Project Linker

```typescript
// components/admin/linear-project-linker.tsx

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { linkLinearProject, createLinearProjectFromStudio } from '@/lib/linear/sync';

interface LinearProjectLinkerProps {
  studioProjectId: string;
  currentLinearProjectId?: string | null;
  onLinked?: (linearProjectId: string) => void;
}

export function LinearProjectLinker({
  studioProjectId,
  currentLinearProjectId,
  onLinked,
}: LinearProjectLinkerProps) {
  const [linearProjects, setLinearProjects] = useState<LinearProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch available Linear projects
    fetch('/api/linear/projects')
      .then(res => res.json())
      .then(data => setLinearProjects(data.projects || []))
      .catch(() => setError('Failed to load Linear projects'));
  }, []);

  const handleLink = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    setError(null);

    const result = await linkLinearProject(studioProjectId, selectedProjectId);

    setLoading(false);
    if (result.success) {
      onLinked?.(result.linearProjectId!);
    } else {
      setError(result.error || 'Failed to link');
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    setError(null);

    const result = await createLinearProjectFromStudio(studioProjectId);

    setLoading(false);
    if (result.success) {
      onLinked?.(result.linearProjectId!);
    } else {
      setError(result.error || 'Failed to create');
    }
  };

  if (currentLinearProjectId) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Linked to Linear</span>
        <a
          href={`https://linear.app/project/${currentLinearProjectId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          View in Linear
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select Linear project..." />
          </SelectTrigger>
          <SelectContent>
            {linearProjects.map(project => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleLink} disabled={!selectedProjectId || loading}>
          Link
        </Button>
      </div>

      <div className="text-sm text-muted-foreground">or</div>

      <Button variant="outline" onClick={handleCreate} disabled={loading}>
        Create New Linear Project
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

interface LinearProject {
  id: string;
  name: string;
}
```

### 6.2 Linear Issues Summary

```typescript
// components/admin/linear-issues-summary.tsx

'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { createBrowserClient } from '@/lib/supabase-browser';

interface LinearIssuesSummaryProps {
  studioProjectId: string;
  linearProjectUrl?: string | null;
}

interface IssueSummary {
  total: number;
  byState: Record<string, number>;
}

export function LinearIssuesSummary({
  studioProjectId,
  linearProjectUrl,
}: LinearIssuesSummaryProps) {
  const [summary, setSummary] = useState<IssueSummary | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();

    supabase
      .from('linear_issues_cache')
      .select('state')
      .eq('studio_project_id', studioProjectId)
      .then(({ data }) => {
        if (!data) return;

        const byState = data.reduce((acc, issue) => {
          acc[issue.state] = (acc[issue.state] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        setSummary({
          total: data.length,
          byState,
        });
      });
  }, [studioProjectId]);

  if (!summary) return null;

  const stateColors: Record<string, string> = {
    backlog: 'bg-gray-100 text-gray-800',
    todo: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    done: 'bg-green-100 text-green-800',
    canceled: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Linear Issues</span>
        {linearProjectUrl && (
          <a
            href={linearProjectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            Open in Linear
          </a>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        {Object.entries(summary.byState).map(([state, count]) => (
          <Badge
            key={state}
            variant="outline"
            className={stateColors[state] || 'bg-gray-100'}
          >
            {state}: {count}
          </Badge>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        {summary.total} total issues
      </p>
    </div>
  );
}
```

---

## 7. Claude Code Integration

### 7.1 MCP Configuration

Add to Claude Code config:

```bash
claude mcp add --transport sse linear-server https://mcp.linear.app/sse
```

### 7.2 Workflow: Creating Issues from Specs

When working on a spec, Claude Code can create Linear issues:

```
User: "Create Linear issues for the relationship simplification spec phases"

Claude: [Uses Linear MCP]
- Creates issue "Create universal evidence table migration" in project X
- Creates issue "Create entity_links table migration" in project X
- Creates issue "Build EntityLinkField component" in project X
- etc.
```

### 7.3 Issue Linking Convention

When creating issues via MCP, include a reference to the Studio Project:

```
Title: [PROJ-NAME] Create evidence table migration
Description:
Part of Studio Project: {studio_project_id}
Spec: docs/infrastructure/RELATIONSHIP_SIMPLIFICATION_SPEC.md

## Tasks
- [ ] Create migration file
- [ ] Add indexes
- [ ] Add RLS policies
```

---

## 8. Implementation Phases

### Phase 1: Foundation (Day 1)
- [ ] Add Linear columns to `studio_projects`
- [ ] Create `linear_issues_cache` table
- [ ] Create `linear_sync_log` table
- [ ] Set up environment variables
- [ ] Install `@linear/sdk`

### Phase 2: API Integration (Day 2)
- [ ] Create `lib/linear/client.ts`
- [ ] Create `lib/linear/sync.ts`
- [ ] Build `/api/linear/projects` endpoint
- [ ] Build link/create functions

### Phase 3: Webhook Handler (Day 3)
- [ ] Create `/api/webhooks/linear` route
- [ ] Implement signature verification
- [ ] Handle Issue events
- [ ] Handle Project events
- [ ] Set up webhook in Linear dashboard

### Phase 4: Admin UI (Day 4)
- [ ] Create `LinearProjectLinker` component
- [ ] Create `LinearIssuesSummary` component
- [ ] Add to studio project detail page
- [ ] Add to studio project form sidebar

### Phase 5: Testing & Polish (Day 5)
- [ ] Test webhook delivery
- [ ] Test issue sync
- [ ] Add error handling
- [ ] Add sync status indicators

---

## 9. Security Considerations

### 9.1 API Key Storage
- Store `LINEAR_API_KEY` in environment variables only
- Never expose in client-side code
- Use server actions for all Linear API calls

### 9.2 Webhook Verification
- Always verify `linear-signature` header
- Use timing-safe comparison
- Log failed verification attempts

### 9.3 Rate Limits
- Linear API: 1,500 requests/hour per user
- Implement caching to reduce API calls
- Use webhooks for real-time updates instead of polling

---

## 10. Future Enhancements

### 10.1 Hypothesis → Issue Sync
Map `studio_hypotheses` to Linear issues with custom labels:

```typescript
await linear.createIssue({
  teamId,
  projectId: studioProject.linear_project_id,
  title: `[Hypothesis] ${hypothesis.statement}`,
  labelIds: ['hypothesis-label-id'],
});
```

### 10.2 Experiment → Issue Sync
Track experiments as issues with status mapping:

| Experiment Status | Linear State |
|-------------------|--------------|
| planned | backlog |
| in_progress | in_progress |
| completed | done |
| failed | canceled |

### 10.3 Bidirectional Status Sync
When Linear project state changes, update `studio_projects.status`:

```typescript
// In webhook handler
if (type === 'Project' && action === 'update') {
  const studioStatus = mapLinearStateToStatus(data.state);
  await supabase
    .from('studio_projects')
    .update({ status: studioStatus })
    .eq('linear_project_id', data.id);
}
```

---

## 11. Appendix: Linear SDK Types

```typescript
// lib/types/linear.ts

export interface LinearProject {
  id: string;
  name: string;
  description?: string;
  url: string;
  state: string;
  teams: { nodes: LinearTeam[] };
}

export interface LinearTeam {
  id: string;
  name: string;
  key: string;
}

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  priority: number;
  state: LinearWorkflowState;
  assignee?: LinearUser;
  labels: { nodes: LinearLabel[] };
  project?: LinearProject;
  createdAt: string;
  updatedAt: string;
}

export interface LinearWorkflowState {
  id: string;
  name: string;
  type: 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled';
}

export interface LinearUser {
  id: string;
  name: string;
  email: string;
}

export interface LinearLabel {
  id: string;
  name: string;
  color: string;
}
```
