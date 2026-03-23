'use client';

import { useState } from 'react';
import { useLuvChatSession } from './use-luv-chat-session';
import { SoulTraitPanel } from './soul-trait-panel';
import { MessageBubble } from './shared/message-bubble';
import { ChatInputToolbar } from './shared/chat-input-toolbar';
import { ScrollIndicator } from './shared/scroll-indicator';
import { CompactSeedCard } from './shared/compact-seed-card';
import { EmptyState } from './shared/empty-state';
import { ThinkingIndicator, StepLimitMessage, wasStepLimitHit } from './shared/status-indicators';

export function ChatDrawer() {
  const session = useLuvChatSession();
  const [traitPanelOpen, setTraitPanelOpen] = useState(false);

  return (
    <div className="flex flex-col h-full relative">
      {traitPanelOpen && (
        <SoulTraitPanel
          onClose={() => setTraitPanelOpen(false)}
          onTraitsApplied={session.handleTraitsApplied}
        />
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
        traitPanelOpen={traitPanelOpen}
        onToggleTraitPanel={() => setTraitPanelOpen((o) => !o)}
      />
    </div>
  );
}
