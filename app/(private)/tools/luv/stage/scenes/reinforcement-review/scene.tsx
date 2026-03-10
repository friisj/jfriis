'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useLuvChat } from '@/app/(private)/tools/luv/components/luv-chat-context';
import type { SceneProps } from '@/lib/luv/stage/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReviewSession {
  id: string;
  title: string;
  status: 'active' | 'completed' | 'archived';
  image_count: number;
  summary: string | null;
  created_at: string;
}

interface ReviewItem {
  id: string;
  session_id: string;
  storage_path: string;
  sequence: number;
  human_classification: 'me' | 'not_me' | 'skip' | null;
  human_confidence: number | null;
  human_notes: string | null;
  agent_classification: 'me' | 'not_me' | null;
  agent_confidence: number | null;
  agent_reasoning: string | null;
  module_links: string[];
  promoted_to_reference_id: string | null;
}

type View = 'sessions' | 'session-detail';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPublicUrl(storagePath: string) {
  const { data } = supabase.storage
    .from('luv-images')
    .getPublicUrl(storagePath);
  return data.publicUrl;
}

// ---------------------------------------------------------------------------
// Scene Component
// ---------------------------------------------------------------------------

export default function ReinforcementReviewScene({ chassisModules }: SceneProps) {
  const { setPageData } = useLuvChat();
  const [view, setView] = useState<View>('sessions');
  const [sessions, setSessions] = useState<ReviewSession[]>([]);
  const [activeSession, setActiveSession] = useState<ReviewSession | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');

  const loadSessions = useCallback(async () => {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('luv_review_sessions')
      .select('*')
      .order('created_at', { ascending: false });
    setSessions(data ?? []);
    setLoading(false);
  }, []);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  async function createSession() {
    const title = newTitle.trim() || `Review ${new Date().toLocaleDateString()}`;
    const { data } = await (supabase as any)
      .from('luv_review_sessions')
      .insert({ title })
      .select()
      .single();
    if (data) {
      setSessions((prev) => [data, ...prev]);
      setNewTitle('');
      openSession(data);
    }
  }

  async function openSession(session: ReviewSession) {
    setActiveSession(session);
    setView('session-detail');
    setSelectedItem(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('luv_review_items')
      .select('*')
      .eq('session_id', session.id)
      .order('sequence', { ascending: true });
    setItems(data ?? []);
    setPageData({
      reviewSession: {
        id: session.id,
        title: session.title,
        status: session.status,
        imageCount: session.image_count,
      },
    });
  }

  function backToSessions() {
    setView('sessions');
    setActiveSession(null);
    setItems([]);
    setSelectedItem(null);
    setPageData(null);
    loadSessions();
  }

  if (loading && view === 'sessions') {
    return <div className="text-xs text-muted-foreground p-4">Loading sessions...</div>;
  }

  if (view === 'sessions') {
    return (
      <SessionList
        sessions={sessions}
        newTitle={newTitle}
        setNewTitle={setNewTitle}
        onCreate={createSession}
        onOpen={openSession}
      />
    );
  }

  return (
    <SessionDetail
      session={activeSession!}
      items={items}
      setItems={setItems}
      selectedItem={selectedItem}
      setSelectedItem={setSelectedItem}
      chassisModules={chassisModules}
      onBack={backToSessions}
      onSessionUpdate={(s) => setActiveSession(s)}
    />
  );
}

// ---------------------------------------------------------------------------
// Session List
// ---------------------------------------------------------------------------

function SessionList({
  sessions,
  newTitle,
  setNewTitle,
  onCreate,
  onOpen,
}: {
  sessions: ReviewSession[];
  newTitle: string;
  setNewTitle: (v: string) => void;
  onCreate: () => void;
  onOpen: (s: ReviewSession) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Session title (optional)"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onCreate()}
          className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm"
        />
        <Button size="sm" onClick={onCreate}>
          New Session
        </Button>
      </div>

      {sessions.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-6">
          No review sessions yet. Create one to get started.
        </p>
      )}

      <div className="space-y-2">
        {sessions.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onOpen(s)}
            className="w-full text-left rounded-md border p-3 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{s.title}</span>
              <div className="flex items-center gap-2">
                <Badge
                  variant={s.status === 'completed' ? 'default' : 'outline'}
                  className="text-[10px]"
                >
                  {s.status}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {s.image_count} images
                </span>
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {new Date(s.created_at).toLocaleDateString()}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Session Detail
// ---------------------------------------------------------------------------

function SessionDetail({
  session,
  items,
  setItems,
  selectedItem,
  setSelectedItem,
  chassisModules,
  onBack,
  onSessionUpdate,
}: {
  session: ReviewSession;
  items: ReviewItem[];
  setItems: (items: ReviewItem[]) => void;
  selectedItem: ReviewItem | null;
  setSelectedItem: (item: ReviewItem | null) => void;
  chassisModules: SceneProps['chassisModules'];
  onBack: () => void;
  onSessionUpdate: (s: ReviewSession) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            &larr; Sessions
          </button>
          <span className="text-xs text-muted-foreground">/</span>
          <span className="text-sm font-medium">{session.title}</span>
          <Badge
            variant={session.status === 'completed' ? 'default' : 'outline'}
            className="text-[10px]"
          >
            {session.status}
          </Badge>
        </div>
      </div>

      {/* Upload Zone (only for active sessions) */}
      {session.status === 'active' && (
        <UploadZone
          sessionId={session.id}
          currentCount={items.length}
          onUploaded={(newItems) => {
            setItems([...items, ...newItems]);
            onSessionUpdate({ ...session, image_count: items.length + newItems.length });
          }}
        />
      )}

      {/* Review Grid + Detail split */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          <ReviewGrid
            items={items}
            selectedId={selectedItem?.id ?? null}
            onSelect={setSelectedItem}
          />
          {selectedItem && (
            <ItemDetail
              item={selectedItem}
              chassisModules={chassisModules}
              sessionStatus={session.status}
              onUpdate={(updated) => {
                setItems(items.map((i) => (i.id === updated.id ? updated : i)));
                setSelectedItem(updated);
              }}
            />
          )}
        </div>
      )}

      {items.length === 0 && session.status === 'active' && (
        <p className="text-xs text-muted-foreground text-center py-4">
          Upload images to begin the review.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upload Zone
// ---------------------------------------------------------------------------

function UploadZone({
  sessionId,
  currentCount,
  onUploaded,
}: {
  sessionId: string;
  currentCount: number;
  onUploaded: (items: ReviewItem[]) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadStatus, setUploadStatus] = useState('');

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const allFiles = Array.from(fileList);
      // Accept common image types; fall back to extension check if type is empty
      const files = allFiles.filter((f) => {
        const isImage = f.type.startsWith('image/') ||
          /\.(jpe?g|png|webp)$/i.test(f.name);
        return isImage && f.size <= 10 * 1024 * 1024;
      });

      if (files.length === 0) {
        setUploadStatus(
          allFiles.length > 0
            ? `Filtered out ${allFiles.length} file(s) — wrong type or > 10MB`
            : 'No files selected'
        );
        return;
      }

      setUploading(true);
      try {
        for (let i = 0; i < files.length; i++) {
          setUploadStatus(`Uploading ${i + 1} of ${files.length}...`);
          const formData = new FormData();
          formData.append('sessionId', sessionId);
          formData.append('files', files[i]);
          const res = await fetch('/api/luv/review-upload', {
            method: 'POST',
            body: formData,
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.error('Upload failed:', err);
            setUploadStatus(`Failed on file ${i + 1}: ${JSON.stringify(err)}`);
            return;
          }
        }
        setUploadStatus('Loading items...');
        // Reload all items from DB after uploads complete
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: freshItems } = await (supabase as any)
          .from('luv_review_items')
          .select('*')
          .eq('session_id', sessionId)
          .order('sequence', { ascending: true })
          .gte('sequence', currentCount);
        onUploaded(freshItems ?? []);
        setUploadStatus('');
      } catch (err) {
        console.error('Upload failed:', err);
        setUploadStatus(`Error: ${err instanceof Error ? err.message : 'Unknown'}`);
      } finally {
        setUploading(false);
      }
    },
    [sessionId, currentCount, onUploaded]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
      }}
      onClick={() => fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/25 hover:border-muted-foreground/50'
      }`}
    >
      {uploading ? (
        <p className="text-xs text-muted-foreground">{uploadStatus || 'Uploading...'}</p>
      ) : uploadStatus ? (
        <p className="text-xs text-destructive">{uploadStatus}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Drop images here or click to select
        </p>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Review Grid
// ---------------------------------------------------------------------------

function ReviewGrid({
  items,
  selectedId,
  onSelect,
}: {
  items: ReviewItem[];
  selectedId: string | null;
  onSelect: (item: ReviewItem) => void;
}) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
      {items.map((item) => {
        const hasHuman = !!item.human_classification;
        const hasAgent = !!item.agent_classification;
        const isSelected = item.id === selectedId;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className={`relative aspect-square rounded-md overflow-hidden border-2 transition-all ${
              isSelected
                ? 'border-primary ring-1 ring-primary'
                : 'border-transparent hover:border-muted-foreground/30'
            }`}
          >
            <img
              src={getPublicUrl(item.storage_path)}
              alt={`Review item ${item.sequence + 1}`}
              className="w-full h-full object-cover"
            />

            {/* Status indicators */}
            <div className="absolute bottom-0.5 right-0.5 flex gap-0.5">
              {hasHuman && (
                <span
                  className={`w-3 h-3 rounded-full text-[8px] flex items-center justify-center text-white ${
                    item.human_classification === 'me'
                      ? 'bg-green-500'
                      : item.human_classification === 'skip'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}
                  title={`Human: ${item.human_classification}`}
                >
                  J
                </span>
              )}
              {hasAgent && (
                <span
                  className={`w-3 h-3 rounded-full text-[8px] flex items-center justify-center text-white ${
                    item.agent_classification === 'me'
                      ? 'bg-green-500'
                      : 'bg-red-500'
                  }`}
                  title={`Agent: ${item.agent_classification}`}
                >
                  L
                </span>
              )}
            </div>

            {/* Sequence number */}
            <span className="absolute top-0.5 left-0.5 text-[9px] bg-black/60 text-white px-1 rounded">
              {item.sequence + 1}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Item Detail — Human evaluation controls
// ---------------------------------------------------------------------------

function ItemDetail({
  item,
  chassisModules,
  sessionStatus,
  onUpdate,
}: {
  item: ReviewItem;
  chassisModules: SceneProps['chassisModules'];
  sessionStatus: string;
  onUpdate: (item: ReviewItem) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [classification, setClassification] = useState<'me' | 'not_me' | 'skip' | null>(
    item.human_classification
  );
  const [confidence, setConfidence] = useState(item.human_confidence ?? 3);
  const [notes, setNotes] = useState(item.human_notes ?? '');
  const [moduleLinks, setModuleLinks] = useState<string[]>(item.module_links ?? []);

  // Reset form when item changes
  useEffect(() => {
    setClassification(item.human_classification);
    setConfidence(item.human_confidence ?? 3);
    setNotes(item.human_notes ?? '');
    setModuleLinks(item.module_links ?? []);
  }, [item.id, item.human_classification, item.human_confidence, item.human_notes, item.module_links]);

  async function saveEvaluation() {
    setSaving(true);
    const updates: Record<string, unknown> = {
      human_classification: classification,
      human_confidence: confidence,
      human_notes: notes || null,
      module_links: moduleLinks,
    };

    const { data, error } = await (supabase as any)
      .from('luv_review_items')
      .update(updates)
      .eq('id', item.id)
      .select()
      .single();

    if (!error && data) {
      onUpdate(data);
    }
    setSaving(false);
  }

  const toggleModule = (slug: string) => {
    setModuleLinks((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const isReadonly = sessionStatus === 'completed' || sessionStatus === 'archived';

  return (
    <div className="rounded-md border p-3 space-y-3">
      {/* Image preview */}
      <div className="flex gap-3">
        <img
          src={getPublicUrl(item.storage_path)}
          alt={`Review item ${item.sequence + 1}`}
          className="w-32 h-32 object-cover rounded-md"
        />
        <div className="flex-1 space-y-2">
          <div className="text-xs font-medium">
            Image #{item.sequence + 1}
          </div>

          {/* Agent evaluation (read-only, observable) */}
          {item.agent_classification && (
            <div className="rounded bg-muted/50 p-2 space-y-1">
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Luv&apos;s Assessment
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={item.agent_classification === 'me' ? 'default' : 'destructive'}
                  className="text-[10px]"
                >
                  {item.agent_classification}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  confidence: {item.agent_confidence}/5
                </span>
              </div>
              {item.agent_reasoning && (
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {item.agent_reasoning}
                </p>
              )}
            </div>
          )}

          {/* Promoted status */}
          {item.promoted_to_reference_id && (
            <Badge variant="outline" className="text-[10px]">
              Promoted to reference
            </Badge>
          )}
        </div>
      </div>

      {/* Human evaluation controls */}
      <div className="space-y-2">
        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Your Assessment
        </div>

        {/* Classification buttons */}
        <div className="flex gap-1.5">
          {(['me', 'not_me', 'skip'] as const).map((c) => (
            <button
              key={c}
              type="button"
              disabled={isReadonly}
              onClick={() => setClassification(c)}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                classification === c
                  ? c === 'me'
                    ? 'bg-green-500 text-white'
                    : c === 'not_me'
                      ? 'bg-red-500 text-white'
                      : 'bg-yellow-500 text-white'
                  : 'bg-muted hover:bg-muted/80'
              } ${isReadonly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {c === 'me' ? 'Me' : c === 'not_me' ? 'Not Me' : 'Skip'}
            </button>
          ))}
        </div>

        {/* Confidence slider */}
        {classification && classification !== 'skip' && (
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-muted-foreground w-16">
              Confidence
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={confidence}
              disabled={isReadonly}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="flex-1 h-1.5 accent-primary"
            />
            <span className="text-[10px] font-mono w-4 text-center">
              {confidence}
            </span>
          </div>
        )}

        {/* Notes */}
        <textarea
          value={notes}
          disabled={isReadonly}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={2}
          className="w-full rounded-md border bg-background px-2 py-1.5 text-xs resize-none disabled:opacity-60"
        />
      </div>

      {/* Module linker */}
      {classification === 'me' && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Relevant Modules
          </div>
          <div className="flex flex-wrap gap-1">
            {chassisModules.map((mod) => (
              <button
                key={mod.slug}
                type="button"
                disabled={isReadonly}
                onClick={() => toggleModule(mod.slug)}
                className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                  moduleLinks.includes(mod.slug)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                } ${isReadonly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {mod.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Save button */}
      {!isReadonly && (
        <Button
          size="sm"
          onClick={saveEvaluation}
          disabled={saving || !classification}
          className="w-full"
        >
          {saving ? 'Saving...' : 'Save Evaluation'}
        </Button>
      )}
    </div>
  );
}
