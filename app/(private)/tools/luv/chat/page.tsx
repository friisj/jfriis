'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePrivateHeader } from '@/components/layout/private-header-context';
import { useLuvChatSession } from '../components/use-luv-chat-session';
import { SoulTraitPanel } from '../components/soul-trait-panel';
import { ChatOverlay } from '../components/shared/chat-overlay';
import { MessageBubble } from '../components/shared/message-bubble';
import { ChatInputToolbar } from '../components/shared/chat-input-toolbar';
import { ScrollIndicator } from '../components/shared/scroll-indicator';
import { CompactSeedCard } from '../components/shared/compact-seed-card';
import { EmptyState } from '../components/shared/empty-state';
import { ThinkingIndicator, StepLimitMessage, wasStepLimitHit } from '../components/shared/status-indicators';
import { getLuvCharacter } from '@/lib/luv';

export default function LuvChatPage() {
  const { setHidden } = usePrivateHeader();

  useEffect(() => {
    setHidden(true);
    return () => setHidden(false);
  }, [setHidden]);

  const session = useLuvChatSession();
  const [traitPanelOpen, setTraitPanelOpen] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  const handleApplyPreset = useCallback(async (presetId: string) => {
    const char = await getLuvCharacter();
    if (!char) return;
    const res = await fetch('/api/luv/soul/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterId: char.id, presetId }),
    });
    if (res.ok) {
      setActivePresetId(presetId);
      setTraitPanelOpen(false);
    }
  }, []);

  return (
    <div className="h-dvh flex flex-col bg-background overflow-hidden relative">
      {traitPanelOpen && (
        <ChatOverlay title="Custom Modulation" onClose={() => setTraitPanelOpen(false)}>
          <SoulTraitPanel
            onClose={() => setTraitPanelOpen(false)}
            onTraitsApplied={session.handleTraitsApplied}
          />
        </ChatOverlay>
      )}

      {/* Messages */}
      <div
        ref={session.scrollContainerRef}
        className="flex-1 overflow-y-auto min-h-0"
        onDrop={session.handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 space-y-4 min-w-0">
          {!session.soulLoaded && (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          )}
          {session.soulLoaded && session.messages.length === 0 && (
            <EmptyState />
          )}
          {session.messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isLast={msg.id === session.messages[session.messages.length - 1]?.id}
              isActive={session.isActive}
            />
          ))}
          {session.isActive && session.status === 'submitted' && (
            <ThinkingIndicator />
          )}
          {session.status === 'error' && session.error && (
            <div className="rounded-lg px-4 py-3 text-sm bg-destructive/10 text-destructive border border-destructive/20">
              <p className="font-medium">Error</p>
              <p className="mt-1 opacity-80">{session.error.message}</p>
            </div>
          )}
          {wasStepLimitHit(session.status, session.messages) && (
            <StepLimitMessage />
          )}
          <div ref={session.messagesEndRef} />
        </div>
      </div>

      <ScrollIndicator scrollContainerRef={session.scrollContainerRef} messagesEndRef={session.messagesEndRef} />

      {session.compactSummary && session.messages.length === 0 && (
        <CompactSeedCard summary={session.compactSummary} onBranch={session.handleBranch} branching={session.branching} />
      )}

      {/* Input — centered with max-width wrapper */}
      <div className="max-w-3xl mx-auto w-full min-w-0">
        <ChatInputToolbar
          autoResize
          input={session.input}
          setInput={session.setInput}
          pendingFiles={session.pendingFiles}
          setPendingFiles={session.setPendingFiles}
          modelKey={session.modelKey}
          setModelKey={session.setModelKey}
          thinking={session.thinking}
          setThinking={session.setThinking}
          isActive={session.isActive}
          soulLoaded={session.soulLoaded}
          messages={session.messages}
          contextPressure={session.contextPressure}
          resumedConversationId={session.resumedConversationId}
          compactSummary={session.compactSummary}
          textareaRef={session.textareaRef}
          fileInputRef={session.fileInputRef}
          handleSend={session.handleSend}
          handleKeyDown={session.handleKeyDown}
          handlePaste={session.handlePaste}
          handleClear={session.handleClear}
          handleCompact={session.handleCompact}
          handleBranch={session.handleBranch}
          compacting={session.compacting}
          branching={session.branching}
          addFilesFromFileList={session.addFilesFromFileList}
          traitPanelOpen={traitPanelOpen}
          onToggleTraitPanel={() => setTraitPanelOpen((o) => !o)}
          onApplyPreset={handleApplyPreset}
          activePresetId={activePresetId}
        />
      </div>
    </div>
  );
}
