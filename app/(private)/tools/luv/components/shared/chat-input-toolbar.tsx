'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { UIMessage, FileUIPart } from 'ai';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import {
  IconAdjustments,
  IconArrowUp,
  IconBrain,
  IconDots,
  IconGitBranch,
  IconLoader2,
  IconPhoto,
  IconPhotoPlus,
  IconSparkles,
  IconCopy,
  IconTrash,
  IconX,
  IconUpload,
  IconHeart,
} from '@tabler/icons-react';
import { MODEL_OPTIONS, type ContextPressure } from '../use-luv-chat-session';
import type { LuvCompactSummary } from '@/lib/types/luv';

interface SoulPreset {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_default: boolean;
}

export interface ChatInputToolbarProps {
  // State
  input: string;
  setInput: (v: string) => void;
  pendingFiles: FileUIPart[];
  setPendingFiles: React.Dispatch<React.SetStateAction<FileUIPart[]>>;
  modelKey: string;
  setModelKey: (v: string) => void;
  thinking: boolean;
  setThinking: React.Dispatch<React.SetStateAction<boolean>>;
  isActive: boolean;
  soulLoaded: boolean;
  messages: UIMessage[];
  contextPressure: ContextPressure;
  resumedConversationId: string | null;
  compactSummary: LuvCompactSummary | null;
  // Refs
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  // Actions
  handleSend: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handlePaste: (e: React.ClipboardEvent) => void;
  handleClear: () => void;
  handleCompact: () => void;
  handleBranch: () => void;
  compacting: boolean;
  branching: boolean;
  addFilesFromFileList: (files: File[]) => void;
  // Soul traits
  traitPanelOpen: boolean;
  onToggleTraitPanel: () => void;
  onApplyPreset: (presetId: string) => void;
  activePresetId: string | null;
  // Image picker
  imagePickerOpen?: boolean;
  onToggleImagePicker?: () => void;
  // Heartbeat settings
  onToggleHeartbeatSettings?: () => void;
  // Sizing
  compact?: boolean;
  autoResize?: boolean;
}

export function ChatInputToolbar({
  input,
  setInput,
  pendingFiles,
  setPendingFiles,
  modelKey,
  setModelKey,
  thinking,
  setThinking,
  isActive,
  soulLoaded,
  messages,
  contextPressure,
  resumedConversationId,
  compactSummary,
  textareaRef,
  fileInputRef,
  handleSend,
  handleKeyDown,
  handlePaste,
  handleClear,
  handleCompact,
  handleBranch,
  compacting,
  branching,
  addFilesFromFileList,
  traitPanelOpen,
  onToggleTraitPanel,
  onApplyPreset,
  activePresetId,
  imagePickerOpen,
  onToggleImagePicker,
  onToggleHeartbeatSettings,
  compact = false,
  autoResize = false,
}: ChatInputToolbarProps) {
  const isClaudeModel = modelKey.startsWith('claude-');
  const iconSize = compact ? 16 : 20;
  const [presets, setPresets] = useState<SoulPreset[]>([]);

  // Fetch presets once
  useEffect(() => {
    fetch('/api/luv/soul/presets')
      .then((r) => r.json())
      .then((d) => setPresets(d.presets ?? []))
      .catch(() => {});
  }, []);

  // Auto-resize textarea (fullscreen only)
  const autoResizeFn = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      if (autoResize) autoResizeFn(e.target);
    },
    [setInput, autoResize, autoResizeFn],
  );

  // Reset textarea height when input clears (autoResize only)
  useEffect(() => {
    if (autoResize && !input && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [autoResize, input, textareaRef]);

  return (
    <div className={cn('shrink-0', compact ? 'space-y-1.5' : 'pb-[env(safe-area-inset-bottom)]')}>
      <ContextPressureBar pressure={contextPressure} />

      {/* Pending image thumbnails */}
      {pendingFiles.length > 0 && (
        <div className={cn('flex flex-wrap', compact ? 'gap-1.5' : 'gap-2 px-3 sm:px-4 pt-3')}>
          {pendingFiles.map((f, i) => (
            <div key={i} className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.url}
                alt={f.filename ?? 'Attached image'}
                className={compact ? 'h-12 w-12 object-cover rounded border' : 'h-14 w-14 sm:h-16 sm:w-16 object-cover rounded border'}
              />
              <button
                type="button"
                onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                className={cn(
                  'absolute bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity',
                  compact ? '-top-1 -right-1 p-0.5' : '-top-1.5 -right-1.5 p-0.5',
                )}
              >
                <IconX size={compact ? 10 : 12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col min-w-0">
        {compact ? (
          <div className="flex">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Message Luv..."
              rows={2}
              className="resize-none text-xs border rounded-none px-8 sm:px-8 py-6 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent shadow-none"
              disabled={isActive || !soulLoaded}
            />
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Message Luv..."
            rows={1}
            className="w-full min-w-0 resize-none text-base sm:text-sm border-none rounded-none px-6 sm:px-8 py-6 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isActive || !soulLoaded}
          />
        )}

        <div className={cn('flex justify-between items-start pl-3 md:pl-4 pr-4', compact ? 'pb-4' : 'pb-4')}>
          <div className="flex">
            <button
              className="flex items-center justify-center size-12 text-muted-foreground"
              onClick={() => fileInputRef.current?.click()}
              disabled={isActive || !soulLoaded}
              title="Upload image"
            >
              <IconUpload size={iconSize} stroke={1.5} />
            </button>

            {onToggleImagePicker && (
              <button
                className={cn(
                  'flex items-center justify-center size-12 text-muted-foreground',
                  imagePickerOpen && 'text-foreground',
                )}
                onClick={onToggleImagePicker}
                disabled={isActive || !soulLoaded}
                title="Image library"
              >
                <IconPhotoPlus size={iconSize} stroke={1.5} />
              </button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center justify-center size-12 text-muted-foreground"
                  aria-label="Options"
                  title="Options"
                >
                  <IconDots size={iconSize} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-48">
                <DropdownMenuRadioGroup value={modelKey} onValueChange={setModelKey}>
                  {MODEL_OPTIONS.map((opt) => (
                    <DropdownMenuRadioItem key={opt.key} value={opt.key} className="text-xs">
                      {opt.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                {isClaudeModel && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-xs"
                      onClick={() => setThinking((t) => !t)}
                    >
                      <IconBrain size={iconSize} stroke={1.5} />
                      Thinking {thinking ? 'on' : 'off'}  
                    </DropdownMenuItem>
                  </>
                )}
                {messages.length >= 6 && resumedConversationId && (
                  <>
                    <DropdownMenuSeparator />
                    {!compactSummary && (
                      <DropdownMenuItem
                        className="text-xs"
                        onClick={handleCompact}
                        disabled={isActive || compacting}
                      >
                        {compacting ? (
                          <IconLoader2 size={14} className="mr-2 animate-spin" />
                        ) : (
                          <IconSparkles size={14} className="mr-2" />
                        )}
                        {compacting ? 'Analysing\u2026' : 'Compact conversation'}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-xs"
                      onClick={handleBranch}
                      disabled={isActive || branching}
                    >
                      {branching ? (
                        <IconLoader2 size={14} className="mr-2 animate-spin" />
                      ) : (
                        <IconGitBranch size={14} className="mr-2" />
                      )}
                      {branching ? 'Branching\u2026' : 'Branch conversation'}
                    </DropdownMenuItem>
                  </>
                )}
                {messages.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-xs"
                      onClick={handleClear}
                      disabled={isActive}
                    >
                      <IconTrash size={14} className="mr-2" />
                      New conversation
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="text-xs">
                    <IconAdjustments size={14} className="mr-2" />
                    Traits
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-44">
                    {presets.map((p) => (
                      <DropdownMenuItem
                        key={p.id}
                        className="text-xs"
                        onClick={() => onApplyPreset(p.id)}
                      >
                        {p.name}
                        {activePresetId === p.id && (
                          <span className="ml-auto text-[10px] text-muted-foreground">active</span>
                        )}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-xs" onClick={onToggleTraitPanel}>
                      Custom
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                {onToggleHeartbeatSettings && (
                  <DropdownMenuItem
                    className="text-xs"
                    onClick={onToggleHeartbeatSettings}
                  >
                    <IconHeart size={14} className="mr-2" />
                    Heartbeat
                  </DropdownMenuItem>
                )}
                {resumedConversationId && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-xs"
                      onClick={() => navigator.clipboard.writeText(resumedConversationId)}
                    >
                      <IconCopy size={14} className="mr-2" />
                      Copy trace ID
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFilesFromFileList(Array.from(e.target.files));
                e.target.value = '';
              }}
            />
          </div>
          <div className="p-1">
            <button
              onClick={handleSend}
              disabled={isActive || (!input.trim() && pendingFiles.length === 0) || !soulLoaded}
              className="flex items-center justify-center size-10 bg-amber-400 hover:bg-amber-500 active:bg-amber-500 rounded-full  cursor-pointer"
            >
              <IconArrowUp size={iconSize} stroke={1.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const PRESSURE_COLORS: Record<string, string> = {
  medium: 'bg-amber-400',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

function ContextPressureBar({ pressure }: { pressure: ContextPressure }) {
  if (pressure.level === 'low') return null;

  const pct = Math.round(pressure.ratio * 100);
  const label =
    pressure.level === 'critical'
      ? `~${pct}% context used \u00b7 consider compacting`
      : pressure.level === 'high'
        ? `~${pct}% context used`
        : null;

  return (
    <div className="relative h-0.5 w-full overflow-hidden" title={`~${pct}% context used`}>
      <div
        className={`h-full transition-all duration-500 ${PRESSURE_COLORS[pressure.level] ?? 'bg-muted'}`}
        style={{ width: `${pct}%` }}
      />
      {label && (
        <span className="absolute right-2 -top-4 text-[9px] text-muted-foreground">
          {label}
        </span>
      )}
    </div>
  );
}
