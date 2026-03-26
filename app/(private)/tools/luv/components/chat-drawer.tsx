'use client';

import { useState, useCallback } from 'react';
import { useLuvChatSession } from './use-luv-chat-session';
import { SoulTraitPanel } from './soul-trait-panel';
import { ImagePickerPanel } from './image-picker-panel';
import { ChatOverlay } from './shared/chat-overlay';
import type { FileUIPart } from 'ai';
import { MessageBubble } from './shared/message-bubble';
import { ChatInputToolbar } from './shared/chat-input-toolbar';
import { ScrollIndicator } from './shared/scroll-indicator';
import { CompactSeedCard } from './shared/compact-seed-card';
import { EmptyState } from './shared/empty-state';
import { ThinkingIndicator, StepLimitMessage, wasStepLimitHit } from './shared/status-indicators';
import { PresenceIndicator } from './shared/presence-indicator';
import { useLuvPresence } from './use-luv-presence';
import { getLuvCharacter } from '@/lib/luv';

export function ChatDrawer() {
  const session = useLuvChatSession();
  const { signal: presenceSignal } = useLuvPresence();
  const [activePanel, setActivePanel] = useState<'traits' | 'imagePicker' | null>(null);
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
      setActivePanel(null);
    }
  }, []);

  const closePanel = useCallback(() => setActivePanel(null), []);

  const handlePickerAttach = useCallback((files: FileUIPart[]) => {
    session.setPendingFiles((prev) => [...prev, ...files]);
    setActivePanel(null);
  }, [session]);

  const panelConfig = {
    traits: { title: 'Custom Modulation' },
    imagePicker: { title: 'Image Library' },
  } as const;

  return (
    <div className="flex flex-col h-full relative">
      {activePanel && (
        <ChatOverlay title={panelConfig[activePanel].title} onClose={closePanel}>
          {activePanel === 'traits' && (
            <SoulTraitPanel
              onClose={closePanel}
              onTraitsApplied={session.handleTraitsApplied}
            />
          )}
          {activePanel === 'imagePicker' && (
            <ImagePickerPanel
              onAttach={handlePickerAttach}
              onClose={closePanel}
            />
          )}
        </ChatOverlay>
      )}

      {/* Messages */}
      <div
        ref={session.scrollContainerRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0"
        onDrop={session.handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {!session.soulLoaded && (
          <p className="text-xs text-muted-foreground text-center py-4">Loading...</p>
        )}
        {session.soulLoaded && session.messages.length === 0 && (
          <EmptyState compact />
        )}
        {session.messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isLast={msg.id === session.messages[session.messages.length - 1]?.id}
            isActive={session.isActive}
            compact
          />
        ))}
        {session.isActive && session.status === 'submitted' && (
          <ThinkingIndicator compact />
        )}
        {session.status === 'error' && session.error && (
          <div className="rounded-lg px-3 py-2 text-xs bg-destructive/10 text-destructive border border-destructive/20">
            <p className="font-medium">Error</p>
            <p className="mt-0.5 opacity-80">{session.error.message}</p>
          </div>
        )}
        {wasStepLimitHit(session.status, session.messages) && (
          <StepLimitMessage compact />
        )}
        <div ref={session.messagesEndRef} />
      </div>

      <ScrollIndicator scrollContainerRef={session.scrollContainerRef} messagesEndRef={session.messagesEndRef} />

      {!session.isActive && <PresenceIndicator signal={presenceSignal} />}

      {session.compactSummary && session.messages.length === 0 && (
        <CompactSeedCard summary={session.compactSummary} onBranch={session.handleBranch} branching={session.branching} />
      )}

      <ChatInputToolbar
        compact
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
        traitPanelOpen={activePanel === 'traits'}
        onToggleTraitPanel={() => setActivePanel((p) => p === 'traits' ? null : 'traits')}
        onApplyPreset={handleApplyPreset}
        activePresetId={activePresetId}
        imagePickerOpen={activePanel === 'imagePicker'}
        onToggleImagePicker={() => setActivePanel((p) => p === 'imagePicker' ? null : 'imagePicker')}
      />
    </div>
  );
}
