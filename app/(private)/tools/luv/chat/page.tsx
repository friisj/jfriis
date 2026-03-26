'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePrivateHeader } from '@/components/layout/private-header-context';
import { useLuvChatSession } from '../components/use-luv-chat-session';
import { SoulTraitPanel } from '../components/soul-trait-panel';
import { ImagePickerPanel } from '../components/image-picker-panel';
import { ChatOverlay } from '../components/shared/chat-overlay';
import type { FileUIPart } from 'ai';
import { MessageBubble } from '../components/shared/message-bubble';
import { ChatInputToolbar } from '../components/shared/chat-input-toolbar';
import { ScrollIndicator } from '../components/shared/scroll-indicator';
import { CompactSeedCard } from '../components/shared/compact-seed-card';
import { EmptyState } from '../components/shared/empty-state';
import { ThinkingIndicator, StepLimitMessage, wasStepLimitHit } from '../components/shared/status-indicators';
import { PresenceIndicator } from '../components/shared/presence-indicator';
import { HeartbeatSettingsPanel } from '../components/heartbeat-settings-panel';
import { useLuvPresence } from '../components/use-luv-presence';
import { getLuvCharacter } from '@/lib/luv';

export default function LuvChatPage() {
  const { setHidden } = usePrivateHeader();

  useEffect(() => {
    setHidden(true);
    return () => setHidden(false);
  }, [setHidden]);

  const session = useLuvChatSession();
  const { signal: presenceSignal } = useLuvPresence();
  const [activePanel, setActivePanel] = useState<'traits' | 'imagePicker' | 'heartbeat' | null>(null);
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
    heartbeat: { title: 'Heartbeat Settings' },
  } as const;

  return (
    <div className="h-lvh flex flex-col bg-background overflow-hidden relative">

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
          {activePanel === 'heartbeat' && (
            <HeartbeatSettingsPanel />
          )}
        </ChatOverlay>
      )}

      {/* Messages */}
      <div
        ref={session.scrollContainerRef}
        className="flex-1 overflow-y-auto min-h-0 relative"
        onDrop={session.handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 space-y-4 min-w-0">
          
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

      {!session.isActive && <PresenceIndicator signal={presenceSignal} />}

      {session.compactSummary && session.messages.length === 0 && (
        <CompactSeedCard summary={session.compactSummary} onBranch={session.handleBranch} branching={session.branching} />
      )}

      {/* Input — centered with max-width wrapper */}
      <div className="max-w-4xl mx-auto w-full min-w-0">
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
          traitPanelOpen={activePanel === 'traits'}
          onToggleTraitPanel={() => setActivePanel((p) => p === 'traits' ? null : 'traits')}
          onApplyPreset={handleApplyPreset}
          activePresetId={activePresetId}
          imagePickerOpen={activePanel === 'imagePicker'}
          onToggleImagePicker={() => setActivePanel((p) => p === 'imagePicker' ? null : 'imagePicker')}
          onToggleHeartbeatSettings={() => setActivePanel((p) => p === 'heartbeat' ? null : 'heartbeat')}
        />
      </div>
    </div>
  );
}
